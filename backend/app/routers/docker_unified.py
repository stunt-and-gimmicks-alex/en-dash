"""
Enhanced Docker router with WebSocket-based unified stack processing

This provides real-time, fully processed stack objects with all constituent parts
pre-processed and normalized for direct frontend consumption.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Set
from datetime import datetime, timezone
from pathlib import Path
import yaml

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import docker

from ..services.docker_unified import unified_stack_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Docker client
try:
    docker_client = docker.from_env()
except Exception as e:
    logger.warning(f"Could not connect to Docker daemon: {e}")
    docker_client = None

class UnifiedStackConnectionManager:
    """Manages WebSocket connections for unified stack data streaming"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.unified_task: asyncio.Task = None
        self.update_interval = 3.0  # seconds - unified processing is more expensive
        
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Unified stacks WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Start unified stack broadcasting if this is the first connection
        if len(self.active_connections) == 1:
            self.unified_task = asyncio.create_task(self._broadcast_unified_stacks())
    
    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.active_connections.discard(websocket)
        logger.info(f"Unified stacks WebSocket disconnected. Total connections: {len(self.active_connections)}")
        
        # Stop broadcasting if no connections remain
        if len(self.active_connections) == 0 and self.unified_task:
            self.unified_task.cancel()
            self.unified_task = None
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending unified stacks message: {e}")
            await self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connections"""
        if not self.active_connections:
            return
            
        disconnected = set()
        for connection in self.active_connections.copy():
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting unified stacks message: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.active_connections.discard(conn)
    
    async def _broadcast_unified_stacks(self):
        """Continuously broadcast unified stack data"""
        logger.info("Started unified stacks broadcasting")
        
        try:
            while self.active_connections:
                try:
                    # Get all unified stacks with complete processing
                    unified_stacks = await self._get_unified_stacks()
                    
                    # Broadcast complete unified stack data
                    await self.broadcast({
                        "type": "unified_stacks",
                        "data": unified_stacks,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "connection_count": len(self.active_connections)
                    })
                    
                    # Wait for next update
                    await asyncio.sleep(self.update_interval)
                    
                except Exception as e:
                    logger.error(f"Error in unified stacks broadcast: {e}")
                    # Send error message to clients
                    await self.broadcast({
                        "type": "error",
                        "message": "Error updating stack data",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    await asyncio.sleep(5)  # Wait longer on error
                    
        except asyncio.CancelledError:
            logger.info("Unified stacks broadcasting cancelled")
        except Exception as e:
            logger.error(f"Fatal error in unified stacks broadcasting: {e}")
    
    async def _get_unified_stacks(self):
        """
        Get all unified stacks using comprehensive discovery
        
        This replaces the old directory-only scanning with the new comprehensive
        discovery that includes:
        1. Stacks from /opt/stacks directory
        2. External compose projects  
        3. Orphaned containers → _ORPHAN_{name} pseudo-stacks
        """
        if not docker_client:
            return {
                "available": False,
                "error": "Docker daemon not available",
                "stacks": []
            }
        
        try:
            logger.info("Starting comprehensive stack discovery via WebSocket...")
            
            # Use the new comprehensive discovery method
            unified_stacks = await unified_stack_service.get_all_unified_stacks()
            
            logger.info(f"Comprehensive discovery complete: {len(unified_stacks)} stacks found")
            
            return {
                "available": True,
                "stacks": unified_stacks,
                "total_stacks": len(unified_stacks),
                "processing_time": datetime.now(timezone.utc).isoformat(),
                "discovery_method": "comprehensive"  # For debugging
            }
            
        except Exception as e:
            logger.error(f"Error in comprehensive unified stacks discovery: {e}")
            return {
                "available": False,
                "error": str(e),
                "stacks": [],
                "discovery_method": "comprehensive_failed"
            }

# Connection manager instance
unified_manager = UnifiedStackConnectionManager()

# =============================================================================
# WEBSOCKET ENDPOINTS
# =============================================================================

@router.websocket("/ws/unified-stacks")
async def websocket_unified_stacks(websocket: WebSocket):
    """
    WebSocket endpoint for real-time unified stack data
    
    Streams comprehensive, pre-processed stack objects including:
    - All services with container details  
    - Unified networks (compose + services + containers + docker)
    - Unified volumes (compose + services + containers + docker)
    - Container summaries with live stats
    - Health information
    - Environment and configuration details
    
    Data is normalized and ready for direct frontend consumption.
    """
    await unified_manager.connect(websocket)
    
    try:
        while True:
            # Listen for client messages (configuration, etc.)
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle client configuration messages
                if message.get("type") == "set_update_interval":
                    interval = max(1.0, min(10.0, float(message.get("interval", 3.0))))
                    unified_manager.update_interval = interval
                    logger.info(f"Updated unified stacks interval to {interval}s")
                    
                    await unified_manager.send_personal_message({
                        "type": "config_updated",
                        "message": f"Update interval set to {interval} seconds"
                    }, websocket)
                
                elif message.get("type") == "ping":
                    await unified_manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }, websocket)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.warning("Received invalid JSON from client")
            except Exception as e:
                logger.error(f"Error handling client message: {e}")
                
    except WebSocketDisconnect:
        pass
    finally:
        await unified_manager.disconnect(websocket)

# =============================================================================
# FALLBACK REST ENDPOINTS (for debugging/testing)
# =============================================================================

@router.get("/unified-stacks/health")
async def unified_stacks_health():
    """Health check for unified stacks processing"""
    try:
        # Test if unified stack service is working
        stacks_dir = unified_stack_service.stacks_directory
        
        return {
            "status": "healthy",
            "docker_available": docker_client is not None,
            "stacks_directory": str(stacks_dir),
            "stacks_directory_exists": stacks_dir.exists(),
            "active_websocket_connections": len(unified_manager.active_connections),
            "update_interval": unified_manager.update_interval
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "docker_available": docker_client is not None,
            "active_websocket_connections": len(unified_manager.active_connections)
        }

@router.get("/unified-stacks/debug")
async def unified_stacks_debug():
    """Debug endpoint to test comprehensive unified stack processing"""
    try:
        logger.info("Debug endpoint: testing comprehensive discovery...")
        
        # Use comprehensive discovery for debugging
        unified_stacks = await unified_stack_service.get_all_unified_stacks()
        
        return {
            "debug": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "discovery_method": "comprehensive",
            "total_stacks": len(unified_stacks),
            "stack_names": [stack["name"] for stack in unified_stacks],
            "data": unified_stacks
        }
        
    except Exception as e:
        logger.error(f"Debug endpoint failed: {e}")
        return {
            "debug": True,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "discovery_method": "comprehensive_failed"
        }