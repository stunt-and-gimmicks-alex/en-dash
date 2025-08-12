# backend/app/routers/picows_websocket.py
"""
Safe WebSocket router that doesn't interfere with SurrealDB connections
FIXED: No overrides, just direct broadcasting to FastAPI clients
"""

import asyncio
import logging
import json
import uuid
from typing import Dict, Set
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from ..services.data_broadcaster import data_broadcaster

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple client management for FastAPI WebSockets (separate from ws_manager)
class FastAPIWebSocketClient:
    """Simple FastAPI WebSocket client"""
    
    def __init__(self, websocket: WebSocket, client_id: str, remote_addr: str):
        self.websocket = websocket
        self.client_id = client_id
        self.remote_addr = remote_addr
        self.connected_at = datetime.now()
        
    async def send_json(self, message: dict):
        """Send JSON message"""
        try:
            await self.websocket.send_json(message)
            return True
        except Exception as e:
            logger.debug(f"Failed to send to client {self.client_id}: {e}")
            return False

# Store FastAPI clients separately (don't interfere with ws_manager)
fastapi_clients: Dict[str, FastAPIWebSocketClient] = {}
live_data_task: asyncio.Task = None

@router.get("/ws/status")
async def websocket_status():
    """Get websocket service status"""
    broadcaster_stats = data_broadcaster.get_stats()
    return {
        "websocket_backend": "fastapi_safe",
        "fastapi_clients": len(fastapi_clients),
        "broadcaster_running": broadcaster_stats.get("running", False),
        "live_queries": broadcaster_stats.get("live_queries", []),
        "surrealdb_connected": broadcaster_stats.get("surrealdb_connected", False)
    }

@router.websocket("/ws/unified")
async def websocket_unified(websocket: WebSocket):
    """
    Safe WebSocket endpoint that doesn't interfere with SurrealDB
    """
    
    await websocket.accept()
    client_ip = websocket.client.host if websocket.client else "unknown"
    client_id = str(uuid.uuid4())
    
    # Create and register client
    client = FastAPIWebSocketClient(websocket, client_id, client_ip)
    fastapi_clients[client_id] = client
    
    logger.info(f"🔗 FastAPI WebSocket client {client_id} connected from {client_ip}")
    
    # Start live data broadcasting if this is the first client
    await _ensure_live_data_task()
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "client_id": client_id,
            "timestamp": datetime.now().isoformat(),
            "backend": "fastapi_safe"
        })
        
        # Send immediate data
        await _send_immediate_data(client)
        
        # Handle incoming messages
        while True:
            try:
                # Non-blocking receive with timeout
                message = await asyncio.wait_for(websocket.receive_json(), timeout=1.0)
                await _handle_client_message(client, message)
                
            except asyncio.TimeoutError:
                # Timeout is normal - prevents blocking
                continue
                
            except WebSocketDisconnect:
                break
                
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
    finally:
        # Cleanup
        if client_id in fastapi_clients:
            del fastapi_clients[client_id]
        logger.info(f"🔌 FastAPI WebSocket client {client_id} disconnected")
        
        # Stop live data task if no clients
        if not fastapi_clients:
            await _stop_live_data_task()

async def _send_immediate_data(client: FastAPIWebSocketClient):
    """Send immediate data when client connects"""
    try:
        # Send system stats
        from ..services.surreal_service import surreal_service
        recent_stats = await surreal_service.get_system_stats(hours_back=1)
        if recent_stats:
            await client.send_json({
                "type": "system_stats",
                "data": recent_stats[0],
                "trigger": "immediate",
                "timestamp": datetime.now().isoformat()
            })
        
        # Send Docker stacks
        from ..services.docker_unified import unified_stack_service
        stacks = await unified_stack_service.get_all_unified_stacks()
        await client.send_json({
            "type": "unified_stacks",
            "data": {
                "available": True,
                "stacks": stacks,
                "total_stacks": len(stacks)
            },
            "trigger": "immediate",
            "timestamp": datetime.now().isoformat()
        })
        
        logger.debug(f"📤 Sent immediate data to client {client.client_id}")
        
    except Exception as e:
        logger.error(f"Error sending immediate data to {client.client_id}: {e}")

async def _handle_client_message(client: FastAPIWebSocketClient, message: dict):
    """Handle incoming client messages"""
    try:
        msg_type = message.get("type")
        
        if msg_type == "ping":
            await client.send_json({
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            })
            
        elif msg_type == "set_update_interval":
            interval = message.get("interval", 5.0)
            await client.send_json({
                "type": "config_updated",
                "message": f"Update interval preference noted: {interval}s"
            })
            
        elif msg_type == "force_refresh":
            await _send_immediate_data(client)
            
    except Exception as e:
        logger.error(f"Error handling message from {client.client_id}: {e}")

async def _ensure_live_data_task():
    """Start live data broadcasting task if not running"""
    global live_data_task
    
    if live_data_task is None or live_data_task.done():
        live_data_task = asyncio.create_task(_live_data_loop())
        logger.info("🚀 Started live data broadcasting task")

async def _stop_live_data_task():
    """Stop live data broadcasting task"""
    global live_data_task
    
    if live_data_task and not live_data_task.done():
        live_data_task.cancel()
        try:
            await live_data_task
        except asyncio.CancelledError:
            pass
        logger.info("🛑 Stopped live data broadcasting task")

async def _live_data_loop():
    """Background task to send live data updates"""
    try:
        while fastapi_clients:
            try:
                # Get fresh data every 5 seconds
                await asyncio.sleep(5.0)
                
                if not fastapi_clients:
                    break
                
                # Get system stats
                from ..services.surreal_service import surreal_service
                recent_stats = await surreal_service.get_system_stats(hours_back=1)
                
                # Get Docker stacks
                from ..services.docker_unified import unified_stack_service
                stacks = await unified_stack_service.get_all_unified_stacks()
                
                # Broadcast to all clients
                if recent_stats:
                    await _broadcast_to_fastapi_clients({
                        "type": "system_stats",
                        "data": recent_stats[0],
                        "trigger": "live_update",
                        "timestamp": datetime.now().isoformat()
                    })
                
                await _broadcast_to_fastapi_clients({
                    "type": "unified_stacks", 
                    "data": {
                        "available": True,
                        "stacks": stacks,
                        "total_stacks": len(stacks)
                    },
                    "trigger": "live_update",
                    "timestamp": datetime.now().isoformat()
                })
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in live data loop: {e}")
                await asyncio.sleep(5)  # Wait before retrying
                
    except asyncio.CancelledError:
        pass
    finally:
        logger.info("📡 Live data loop stopped")

async def _broadcast_to_fastapi_clients(message: dict):
    """Broadcast message to all FastAPI WebSocket clients"""
    if not fastapi_clients:
        return
    
    # Add connection count
    message["connection_count"] = len(fastapi_clients)
    
    # Send to all clients
    tasks = []
    for client in list(fastapi_clients.values()):
        tasks.append(client.send_json(message))
    
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        successful = sum(1 for r in results if r is True)
        logger.debug(f"📡 Broadcast sent to {successful}/{len(tasks)} FastAPI clients")

# Legacy compatibility
@router.get("/ws/unified-stacks")
async def redirect_to_unified():
    """Redirect old endpoint to new unified endpoint"""
    return {
        "message": "This endpoint has been replaced by /ws/unified",
        "redirect_to": "/api/docker/ws/unified",
        "note": "Please update your frontend to use the new endpoint"
    }

# Health check
@router.get("/ws/health")
async def websocket_health():
    """WebSocket health check"""
    try:
        broadcaster_stats = data_broadcaster.get_stats()
        
        return {
            "status": "healthy",
            "backend": "fastapi_safe",
            "total_connections": len(fastapi_clients),
            "live_data_task_running": live_data_task is not None and not live_data_task.done(),
            "data_sources": {
                "broadcaster_running": broadcaster_stats.get("running", False),
                "live_queries": broadcaster_stats.get("live_queries", []),
                "surrealdb_connected": broadcaster_stats.get("surrealdb_connected", False)
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# Force refresh endpoint
@router.post("/ws/force-refresh")
async def force_websocket_refresh():
    """Force immediate data refresh to all WebSocket clients"""
    try:
        # Send fresh data to all connected clients
        for client in list(fastapi_clients.values()):
            await _send_immediate_data(client)
        
        return {
            "success": True,
            "message": "Fresh data sent to all clients",
            "timestamp": datetime.now().isoformat(),
            "connected_clients": len(fastapi_clients)
        }
    except Exception as e:
        logger.error(f"Error forcing refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Error forcing refresh: {str(e)}")