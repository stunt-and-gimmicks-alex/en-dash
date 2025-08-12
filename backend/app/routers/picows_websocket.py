# backend/app/routers/picows_websocket.py
"""
Picows WebSocket Router - Native picows integration with FastAPI
This router provides REST endpoints for WebSocket management and status
The actual WebSocket server runs on a separate port using native picows
"""

import asyncio
import logging
import json
from typing import Dict, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..services.data_broadcaster import data_broadcaster
from ..services.websocket_manager import ws_manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/ws/status")
async def websocket_status():
    """Get websocket service status - FIXED fastapi_clients error"""
    try:
        # Import here to avoid circular imports
        from ..services.websocket_manager import ws_manager
        
        # Get stats safely
        try:
            ws_stats = ws_manager.get_stats()
        except Exception as e:
            ws_stats = {
                "available": False,
                "running": False,
                "total_connections": 0,
                "error": str(e)
            }
        
        # Get broadcaster stats safely  
        try:
            broadcaster_stats = data_broadcaster.get_stats()
        except Exception as e:
            broadcaster_stats = {
                "running": False,
                "error": str(e)
            }
        
        # Count FastAPI clients safely (they're defined as module-level variable above)
        try:
            fastapi_client_count = len(fastapi_clients) if 'fastapi_clients' in globals() else 0
        except:
            fastapi_client_count = 0
        
        return {
            "status": "healthy" if ws_stats.get("running", False) else "stopped",
            "websocket_backend": "picows",
            "picows_available": ws_stats.get("available", False),
            "picows_running": ws_stats.get("running", False),
            "picows_connections": ws_stats.get("total_connections", 0),
            "picows_endpoint": ws_stats.get("server_info", {}).get("endpoint", "N/A"),
            "fastapi_fallback_clients": fastapi_client_count,
            "broadcaster_running": broadcaster_stats.get("running", False),
            "live_queries": broadcaster_stats.get("live_queries", []),
            "surrealdb_connected": broadcaster_stats.get("surrealdb_connected", False),
            "total_connections": ws_stats.get("total_connections", 0) + fastapi_client_count,
            "recommendation": "picows" if ws_stats.get("available", False) and ws_stats.get("running", False) else "fix_needed"
        }
    except Exception as e:
        logger.error(f"Error in websocket_status: {e}")
        return {
            "error": f"Status check failed: {str(e)}",
            "websocket_backend": "picows",
            "picows_available": False,
            "picows_running": False
        }

@router.get("/ws/info")
async def websocket_info():
    """Get WebSocket connection information for clients"""
    try:
        ws_stats = ws_manager.get_stats()
        
        if not ws_stats["available"]:
            return {
                "error": "Picows not available",
                "message": "Install picows with: pip install picows",
                "fallback": "Use /api/docker/ws/unified for FastAPI fallback"
            }
        
        return {
            "websocket_url": ws_stats["server_info"]["endpoint"],
            "protocol": "ws",
            "features": [
                "binary_frames",
                "orjson_serialization", 
                "high_performance",
                "auto_ping",
                "topic_subscriptions"
            ],
            "message_types": [
                "ping",
                "subscribe", 
                "unsubscribe",
                "set_update_interval"
            ],
            "available_topics": [
                "unified_stacks",
                "system_stats", 
                "heartbeat"
            ],
            "example_usage": {
                "connect": f"ws://{ws_stats['server_info']['host']}:{ws_stats['server_info']['port']}/",
                "subscribe": {
                    "type": "subscribe",
                    "topic": "unified_stacks"
                },
                "ping": {
                    "type": "ping"
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket info: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting info: {str(e)}")

@router.post("/ws/broadcast")
async def broadcast_message(
    message: dict,
    topic: str = None,
    background_tasks: BackgroundTasks = None
):
    """Broadcast a message to WebSocket clients (admin endpoint)"""
    try:
        # Add metadata
        enhanced_message = {
            **message,
            "broadcast_time": datetime.now(timezone.utc).isoformat(),
            "source": "api_broadcast"
        }
        
        await ws_manager.broadcast(enhanced_message, topic=topic)
        
        ws_stats = ws_manager.get_stats()
        
        return {
            "success": True,
            "message": "Broadcast sent",
            "sent_to": ws_stats["total_connections"],
            "topic": topic,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error broadcasting message: {e}")
        raise HTTPException(status_code=500, detail=f"Error broadcasting: {str(e)}")

@router.post("/ws/send/{client_id}")
async def send_to_client(client_id: str, message: dict):
    """Send message to a specific client (admin endpoint)"""
    try:
        success = await ws_manager.send_to_client(client_id, message)
        
        if success:
            return {
                "success": True,
                "message": f"Message sent to client {client_id}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"Client {client_id} not found or disconnected"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending to client {client_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

@router.get("/ws/clients")
async def list_clients():
    """List connected WebSocket clients (admin endpoint)"""
    try:
        clients_info = []
        
        for client_id, client in ws_manager.clients.items():
            clients_info.append({
                "client_id": client_id,
                "remote_addr": client.remote_addr,
                "connected_at": client.connected_at.isoformat(),
                "active": client.active,
                "subscriptions": list(client.subscriptions),
                "last_ping": client.last_ping.isoformat() if client.last_ping else None
            })
        
        return {
            "total_clients": len(clients_info),
            "clients": clients_info,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error listing clients: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing clients: {str(e)}")

@router.post("/ws/force-update/{data_type}")
async def force_data_update(
    data_type: str,
    background_tasks: BackgroundTasks
):
    """Force immediate data update and broadcast"""
    try:
        if data_type == "docker_stacks":
            background_tasks.add_task(data_broadcaster.force_update_docker_stacks)
        elif data_type == "system_stats":
            background_tasks.add_task(data_broadcaster.force_update_system_stats)
        elif data_type == "all":
            background_tasks.add_task(data_broadcaster.force_update_docker_stacks)
            background_tasks.add_task(data_broadcaster.force_update_system_stats)
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid data type: {data_type}. Use: docker_stacks, system_stats, or all"
            )
        
        return {
            "success": True,
            "message": f"Force update initiated for {data_type}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Updates will be broadcast to connected WebSocket clients"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error forcing update for {data_type}: {e}")
        raise HTTPException(status_code=500, detail=f"Error forcing update: {str(e)}")

@router.post("/ws/update-interval")
async def update_broadcast_interval(
    data_type: str,
    interval: float
):
    """Update broadcasting interval for specific data type"""
    try:
        if interval <= 0:
            raise HTTPException(status_code=400, detail="Interval must be positive")
        
        if interval < 1.0:
            logger.warning(f"Very short interval requested: {interval}s")
        
        await data_broadcaster.update_interval(data_type, interval)
        
        return {
            "success": True,
            "message": f"Updated {data_type} interval to {interval}s",
            "data_type": data_type,
            "new_interval": interval,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error updating interval: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating interval: {str(e)}")

@router.get("/ws/cache")
async def get_cached_data(data_type: str = None):
    """Get cached data for immediate responses"""
    try:
        cached_data = await data_broadcaster.get_cached_data(data_type)
        
        return {
            "success": True,
            "cached_data": cached_data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting cached data: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting cache: {str(e)}")

@router.get("/ws/health")
async def websocket_health():
    """Health check endpoint for WebSocket services"""
    try:
        ws_stats = ws_manager.get_stats()
        broadcaster_stats = data_broadcaster.get_stats()
        
        # Determine overall health
        health_status = "healthy"
        issues = []
        
        if not ws_stats["available"]:
            health_status = "degraded"
            issues.append("picows_not_available")
        
        if not ws_stats["running"]:
            health_status = "unhealthy"
            issues.append("websocket_server_not_running")
        
        if not broadcaster_stats["running"]:
            health_status = "degraded"
            issues.append("data_broadcaster_not_running")
        
        return {
            "status": health_status,
            "issues": issues,
            "services": {
                "websocket_server": ws_stats["running"],
                "data_broadcaster": broadcaster_stats["running"],
                "picows_available": ws_stats["available"],
                "surrealdb_connected": broadcaster_stats["surrealdb_connected"]
            },
            "metrics": {
                "connected_clients": ws_stats["total_connections"],
                "active_topics": len(ws_stats["topics"]),
                "live_queries": len(broadcaster_stats["live_queries"]),
                "polling_fallbacks": len(broadcaster_stats["polling_fallbacks"])
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Legacy compatibility endpoint
@router.websocket("/ws/unified")
async def websocket_unified_redirect():
    """
    Legacy WebSocket endpoint that redirects to picows
    This should not be used - clients should connect directly to picows server
    """
    logger.warning("Client attempting to connect to legacy FastAPI WebSocket endpoint")
    
    # Note: This will actually fail because FastAPI websockets can't redirect
    # We include this for documentation purposes
    # Clients should connect directly to the picows server endpoint
    
    raise HTTPException(
        status_code=426, 
        detail={
            "error": "WebSocket endpoint moved",
            "message": "This endpoint is deprecated. Use native picows server.",
            "new_endpoint": f"ws://{ws_manager.host}:{ws_manager.port}/",
            "upgrade_required": True
        }
    )