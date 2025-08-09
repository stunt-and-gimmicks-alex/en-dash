"""
Enhanced Docker router with WebSocket-based unified stack processing

This provides real-time, fully processed stack objects with all constituent parts
pre-processed and normalized for direct frontend consumption.
"""

import asyncio
import json
import logging
import subprocess
from typing import Dict, Any, Set
from datetime import datetime, timezone
from pathlib import Path
import yaml
import websocket

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
import docker

from ..services.docker_unified import unified_stack_service
from ..services.surreal_service import surreal_service
from ..services.background_collector import background_collector
from ..core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize Docker client
try:
    docker_client = docker.from_env()
except Exception as e:
    logger.warning(f"Could not connect to Docker daemon: {e}")
    docker_client = None

@router.post("/stacks/{stack_name}/start")
async def start_stack(stack_name: str, background_tasks: BackgroundTasks):
    """Start a Docker Compose stack"""
    return await _execute_stack_command(stack_name, "up -d", "started")

@router.post("/stacks/{stack_name}/stop")
async def stop_stack(stack_name: str, background_tasks: BackgroundTasks):
    """Stop a Docker Compose stack"""
    return await _execute_stack_command(stack_name, "down", "stopped")

@router.post("/stacks/{stack_name}/restart")
async def restart_stack(stack_name: str, background_tasks: BackgroundTasks):
    """Restart a Docker Compose stack"""
    return await _execute_stack_command(stack_name, "restart", "restarted")

@router.post("/stacks/{stack_name}/pull")
async def pull_stack(stack_name: str, background_tasks: BackgroundTasks):
    """Pull latest images for a Docker Compose stack"""
    return await _execute_stack_command(stack_name, "pull", "pulled")

async def _execute_stack_command(stack_name: str, command: str, action: str) -> Dict[str, Any]:
    """Execute a docker compose command on a stack"""
    stacks_dir = Path(settings.STACKS_DIRECTORY)
    stack_path = stacks_dir / stack_name
    
    if not stack_path.exists():
        raise HTTPException(status_code=404, detail=f"Stack '{stack_name}' not found")
    
    # Find compose file
    compose_files = ['docker-compose.yml', 'compose.yaml', 'docker-compose.yaml', 'compose.yml']
    compose_file = None
    for filename in compose_files:
        if (stack_path / filename).exists():
            compose_file = filename
            break
    
    if not compose_file:
        raise HTTPException(status_code=400, detail=f"No compose file found in stack '{stack_name}'")
    
    try:
        result = subprocess.run(
            ["docker", "compose", "-f", compose_file] + command.split(),
            cwd=stack_path,
            capture_output=True,
            text=True,
            check=True,
            timeout=300  # 5 minutes
        )
        
        logger.info(f"Stack {stack_name} {action} successfully")
        
        return {
            "message": f"Stack {stack_name} {action} successfully",
            "stack_name": stack_name,
            "action": action,
            "output": result.stdout,
            "success": True
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail=f"Stack {action} operation timed out")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to {action} stack {stack_name}: {e.stderr}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to {action} stack: {e.stderr}"
        )
    except Exception as e:
        logger.error(f"Unexpected error {action} stack {stack_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") 

# Fix for backend/app/routers/docker_unified.py
# Replace the UnifiedStackConnectionManager class with this corrected version

class UnifiedStackConnectionManager:
    """Manages WebSocket connections with SurrealDB live queries for BOTH stacks and system stats"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.live_query_id: Optional[str] = None
        self.system_stats_live_query_id: Optional[str] = None
        self.unified_task: Optional[asyncio.Task] = None  # Only for polling fallback
        self.update_interval: float = 3.0
        self.live_queries_active: bool = False  # Track if live queries are working
        
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection and setup live queries for both stacks and stats"""
        logger.info("🔌 About to accept WebSocket connection...")
        await websocket.accept()
        logger.info("🔗 WebSocket accepted successfully")
        
        self.active_connections.add(websocket)
        logger.info(f"✅ Added to connections. Total: {len(self.active_connections)}")
        
        # Send immediate current data ONCE (both stacks and stats)
        try:
            logger.info("📤 Sending immediate data to new connection...")
            
            # Send stacks
            unified_stacks_data = await self._get_unified_stacks_data()
            await self.send_personal_message({
                "type": "unified_stacks",
                "data": unified_stacks_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "immediate": True,  # Mark as immediate data
                "trigger": "initial_load"
            }, websocket)
            logger.info("✅ Immediate stacks data sent")
            
            # Send system stats
            recent_stats = await surreal_service.get_system_stats(hours_back=1)
            if recent_stats:
                latest_stat = recent_stats[0]
                await self.send_personal_message({
                    "type": "system_stats",
                    "data": latest_stat,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "immediate": True,  # Mark as immediate data
                    "trigger": "initial_load"
                }, websocket)
                logger.info("✅ Immediate system stats sent")
                
        except Exception as e:
            logger.error(f"❌ Failed to send immediate data: {e}")
        
        # Start live queries if first connection AND not already started
        if len(self.active_connections) == 1 and not self.live_queries_active:
            await self._start_live_queries()
    
    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection and cleanup live queries if needed"""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
        
        # Stop live queries if no connections remain
        if len(self.active_connections) == 0:
            await self._stop_live_queries()
            await self._stop_polling_fallback()

    async def _start_live_queries(self):
        """Start both live queries and handle failures gracefully"""
        try:
            logger.info("🚀 Starting SurrealDB live queries...")
            
            # Try to start stack live query
            try:
                self.live_query_id = await surreal_service.create_live_query(
                    "LIVE SELECT * FROM unified_stack",
                    self._handle_stack_live_update
                )
                logger.info(f"📡 Stack live query started: {self.live_query_id}")
            except Exception as e:
                logger.error(f"❌ Failed to start stack live query: {e}")
                self.live_query_id = None
            
            # Try to start system stats live query
            try:
                self.system_stats_live_query_id = await surreal_service.create_live_query(
                    "system_stats",
                    self._handle_system_stats_live_update
                )
                logger.info(f"📡 System stats live query started: {self.system_stats_live_query_id}")
            except Exception as e:
                logger.error(f"❌ Failed to start system stats live query: {e}")
                self.system_stats_live_query_id = None
            
            # Check if at least one live query succeeded
            if self.live_query_id or self.system_stats_live_query_id:
                self.live_queries_active = True
                logger.info("✅ Live queries active")
            else:
                logger.warning("❌ All live queries failed, starting polling fallback")
                await self._start_polling_fallback()
                
        except Exception as e:
            logger.error(f"❌ Failed to start live queries: {e}")
            await self._start_polling_fallback()

    async def _stop_live_queries(self):
        """Stop all live queries"""
        self.live_queries_active = False
        
        # Stop stack live query
        if self.live_query_id:
            try:
                await surreal_service.kill_live_query(self.live_query_id)
                self.live_query_id = None
                logger.info("🛑 Stack live query stopped")
            except Exception as e:
                logger.error(f"❌ Failed to stop stack live query: {e}")
        
        # Stop system stats live query
        if self.system_stats_live_query_id:
            try:
                await surreal_service.kill_live_query(self.system_stats_live_query_id)
                self.system_stats_live_query_id = None
                logger.info("🛑 System stats live query stopped")
            except Exception as e:
                logger.error(f"❌ Failed to stop system stats live query: {e}")

    async def _handle_stack_live_update(self, update_data: Any):
        """Handle live query updates from SurrealDB for stacks - ONLY triggered by actual changes"""
        try:
            logger.info("📡 Received STACK live update from SurrealDB")
            
            # Get fresh data (the live query tells us something changed)
            unified_stacks_data = await self._get_unified_stacks_data()
            
            # Broadcast to all connected clients
            await self.broadcast({
                "type": "unified_stacks",
                "data": unified_stacks_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "connection_count": len(self.active_connections),
                "trigger": "live_query"  # This was triggered by actual data change
            })
            
            logger.info("✅ Stack live update broadcasted to clients")
            
        except Exception as e:
            logger.error(f"❌ Error handling stack live update: {e}")

    async def _handle_system_stats_live_update(self, update_data: Any):
        """Handle live query updates from SurrealDB for system stats - ONLY triggered by actual changes"""
        try:
            logger.info("📊 Received SYSTEM STATS live update from SurrealDB")
            
            # Get fresh system stats data
            recent_stats = await surreal_service.get_system_stats(hours_back=1)
            if recent_stats:
                latest_stat = recent_stats[0]
                
                # Broadcast to all connected clients
                await self.broadcast({
                    "type": "system_stats",
                    "data": latest_stat,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "connection_count": len(self.active_connections),
                    "trigger": "live_query"  # This was triggered by actual data change
                })
                
                logger.info("✅ System stats live update broadcasted to clients")
            
        except Exception as e:
            logger.error(f"❌ Error handling system stats live update: {e}")
    
    async def _start_polling_fallback(self):
        """ONLY start polling if live queries failed completely"""
        if self.live_queries_active:
            logger.info("🚫 Live queries are active, skipping polling fallback")
            return
            
        logger.warning("📡 Starting polling fallback (live queries failed)...")
        self.unified_task = asyncio.create_task(self._polling_loop())
    
    async def _stop_polling_fallback(self):
        """Stop polling fallback if running"""
        if self.unified_task:
            self.unified_task.cancel()
            self.unified_task = None
            logger.info("🛑 Polling fallback stopped")
    
    async def _polling_loop(self):
        """Polling loop - ONLY used when live queries fail"""
        logger.info("🔄 Polling fallback loop started")
        
        while self.active_connections:
            try:
                # Get current data
                unified_stacks_data = await self._get_unified_stacks_data()
                recent_stats = await surreal_service.get_system_stats(hours_back=1)
                
                # Broadcast stacks
                await self.broadcast({
                    "type": "unified_stacks",
                    "data": unified_stacks_data,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "connection_count": len(self.active_connections),
                    "trigger": "polling_fallback"  # Clear this is fallback
                })
                
                # Broadcast system stats
                if recent_stats:
                    latest_stat = recent_stats[0]
                    await self.broadcast({
                        "type": "system_stats",
                        "data": latest_stat,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "connection_count": len(self.active_connections),
                        "trigger": "polling_fallback"  # Clear this is fallback
                    })
                
                # Wait before next poll
                await asyncio.sleep(self.update_interval)
                
            except asyncio.CancelledError:
                logger.info("Polling fallback cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in polling fallback: {e}")
                await asyncio.sleep(5)  # Wait before retrying

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
    
    async def _get_unified_stacks_data(self) -> Dict[str, Any]:
        """Get unified stacks data (same method as before)"""
        try:
            # Try SurrealDB fast path first
            stacks_from_db = await surreal_service.get_unified_stacks()
            
            if stacks_from_db:
                return {
                    "available": True,
                    "stacks": stacks_from_db,
                    "total_stacks": len(stacks_from_db),
                    "processing_time": datetime.now(timezone.utc).isoformat(),
                    "source": "surrealdb"
                }
            else:
                # Fallback to comprehensive discovery
                unified_stacks = await unified_stack_service.get_all_unified_stacks()
                return {
                    "available": True,
                    "stacks": unified_stacks,
                    "total_stacks": len(unified_stacks),
                    "processing_time": datetime.now(timezone.utc).isoformat(),
                    "source": "comprehensive"
                }
                
        except Exception as e:
            logger.error(f"❌ Error getting unified stacks data: {e}")
            return {
                "available": False,
                "error": str(e),
                "stacks": [],
                "source": "error"
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
    
    BETTER VERSION: Uses separate task for message handling
    """
    await unified_manager.connect(websocket)
    
    async def handle_messages():
        """Handle incoming messages in separate task"""
        try:
            while True:
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
            pass
        except json.JSONDecodeError:
            logger.warning("Received invalid JSON from client")
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
    
    # Start message handling task
    message_task = asyncio.create_task(handle_messages())
    
    try:
        # Wait for disconnect
        await message_task
    except WebSocketDisconnect:
        pass
    finally:
        message_task.cancel()
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