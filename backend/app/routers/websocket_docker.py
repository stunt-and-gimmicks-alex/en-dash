"""
WebSocket endpoints for real-time Docker monitoring and management
"""

import asyncio
import json
import logging
from typing import Dict, Any, Set, List
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
import docker

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Docker client
try:
    docker_client = docker.from_env()
except Exception as e:
    logger.warning(f"Could not connect to Docker daemon: {e}")
    docker_client = None

class DockerConnectionManager:
    """Manages WebSocket connections for Docker monitoring"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.stats_task: asyncio.Task = None
        self.update_interval = 2.0  # seconds (Docker stats are more expensive)
        
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Docker WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Start stats broadcasting if this is the first connection
        if len(self.active_connections) == 1:
            self.stats_task = asyncio.create_task(self._broadcast_docker_stats())
    
    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.active_connections.discard(websocket)
        logger.info(f"Docker WebSocket disconnected. Total connections: {len(self.active_connections)}")
        
        # Stop stats broadcasting if no connections remain
        if len(self.active_connections) == 0 and self.stats_task:
            self.stats_task.cancel()
            self.stats_task = None
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending Docker message: {e}")
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
                logger.error(f"Error broadcasting Docker message: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.active_connections.discard(conn)
    
    async def _broadcast_docker_stats(self):
        """Continuously broadcast Docker stats"""
        logger.info("Started Docker stats broadcasting")
        
        try:
            while self.active_connections:
                try:
                    # Get container stats
                    containers = await self._get_container_stats()
                    await self.broadcast({
                        "type": "docker_containers",
                        "data": containers,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    
                    # Get Docker system info
                    if len(self.active_connections) > 0:  # Check if still connected
                        docker_info = await self._get_docker_info()
                        await self.broadcast({
                            "type": "docker_info",
                            "data": docker_info,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                    
                    await asyncio.sleep(self.update_interval)
                    
                except Exception as e:
                    logger.error(f"Error in Docker stats broadcasting: {e}")
                    await asyncio.sleep(5)  # Wait longer on error
                    
        except asyncio.CancelledError:
            logger.info("Docker stats broadcasting stopped")
            raise
    
    async def _get_container_stats(self) -> List[Dict[str, Any]]:
        """Get current container statistics"""
        if not docker_client:
            return []
        
        containers = []
        try:
            for container in docker_client.containers.list(all=True):
                # Get basic container info
                container_data = {
                    "id": container.id,
                    "short_id": container.short_id,
                    "name": container.name,
                    "status": container.status,
                    "state": container.attrs['State']['Status'],
                    "image": container.image.tags[0] if container.image.tags else container.image.id,
                    "created": container.attrs['Created'],
                    "labels": container.labels or {},
                    "compose_project": container.labels.get('com.docker.compose.project'),
                    "compose_service": container.labels.get('com.docker.compose.service'),
                }
                
                # Get real-time stats for running containers
                if container.status == 'running':
                    try:
                        stats = container.stats(stream=False)
                        
                        # Calculate CPU percentage
                        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                                   stats['precpu_stats']['cpu_usage']['total_usage']
                        system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                                      stats['precpu_stats']['system_cpu_usage']
                        
                        cpu_percent = 0.0
                        if system_delta > 0:
                            cpu_percent = (cpu_delta / system_delta) * \
                                         len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100
                        
                        # Memory stats
                        memory_usage = stats['memory_stats'].get('usage', 0)
                        memory_limit = stats['memory_stats'].get('limit', 0)
                        memory_percent = (memory_usage / memory_limit * 100) if memory_limit > 0 else 0
                        
                        # Network I/O
                        network_rx = 0
                        network_tx = 0
                        if 'networks' in stats:
                            for interface in stats['networks'].values():
                                network_rx += interface.get('rx_bytes', 0)
                                network_tx += interface.get('tx_bytes', 0)
                        
                        # Block I/O
                        block_read = 0
                        block_write = 0
                        if 'blkio_stats' in stats and 'io_service_bytes_recursive' in stats['blkio_stats']:
                            for item in stats['blkio_stats']['io_service_bytes_recursive']:
                                if item['op'] == 'Read':
                                    block_read += item['value']
                                elif item['op'] == 'Write':
                                    block_write += item['value']
                        
                        container_data['stats'] = {
                            "cpu_percent": round(cpu_percent, 2),
                            "memory": {
                                "usage": memory_usage,
                                "limit": memory_limit,
                                "percent": round(memory_percent, 2)
                            },
                            "network": {
                                "rx_bytes": network_rx,
                                "tx_bytes": network_tx
                            },
                            "block_io": {
                                "read_bytes": block_read,
                                "write_bytes": block_write
                            }
                        }
                    except Exception as e:
                        logger.debug(f"Could not get stats for container {container.name}: {e}")
                        container_data['stats'] = None
                else:
                    container_data['stats'] = None
                
                containers.append(container_data)
                
        except Exception as e:
            logger.error(f"Error getting container stats: {e}")
        
        return containers
    
    async def _get_docker_info(self) -> Dict[str, Any]:
        """Get Docker system information"""
        if not docker_client:
            return {"available": False, "error": "Docker daemon not available"}
        
        try:
            info = docker_client.info()
            version = docker_client.version()
            
            return {
                "available": True,
                "version": version.get('Version', 'unknown'),
                "api_version": version.get('ApiVersion', 'unknown'),
                "containers": {
                    "running": info.get('ContainersRunning', 0),
                    "paused": info.get('ContainersPaused', 0),
                    "stopped": info.get('ContainersStopped', 0),
                    "total": info.get('Containers', 0)
                },
                "images": info.get('Images', 0),
                "server_version": info.get('ServerVersion', 'unknown'),
                "storage_driver": info.get('Driver', 'unknown'),
                "docker_root_dir": info.get('DockerRootDir', 'unknown'),
                "operating_system": info.get('OperatingSystem', 'unknown'),
                "ncpu": info.get('NCPU', 0),
                "mem_total": info.get('MemTotal', 0)
            }
        except Exception as e:
            logger.error(f"Error getting Docker info: {e}")
            return {"available": False, "error": str(e)}

# Connection manager instance
docker_manager = DockerConnectionManager()

@router.websocket("/ws/docker/stats")
async def websocket_docker_stats(websocket: WebSocket):
    """
    WebSocket endpoint for real-time Docker container statistics
    
    Sends Docker container stats every 2 seconds while connected.
    Message format:
    {
        "type": "docker_containers" | "docker_info",
        "data": { ... stats ... },
        "timestamp": "2024-01-01T00:00:00Z"
    }
    """
    await docker_manager.connect(websocket)
    
    try:
        while True:
            try:
                # Handle client messages
                message = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                
                try:
                    data = json.loads(message)
                    await _handle_docker_client_message(data, websocket)
                except json.JSONDecodeError:
                    await docker_manager.send_personal_message({
                        "type": "error",
                        "message": "Invalid JSON format"
                    }, websocket)
                    
            except asyncio.TimeoutError:
                continue
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from Docker stats WebSocket")
    except Exception as e:
        logger.error(f"Error in Docker stats WebSocket: {e}")
    finally:
        await docker_manager.disconnect(websocket)

async def _handle_docker_client_message(data: dict, websocket: WebSocket):
    """Handle messages from Docker WebSocket clients"""
    message_type = data.get("type")
    
    if message_type == "set_update_interval":
        interval = data.get("interval", 2.0)
        if 1.0 <= interval <= 60.0:  # Docker stats are more expensive, minimum 1s
            docker_manager.update_interval = interval
            await docker_manager.send_personal_message({
                "type": "config_updated",
                "message": f"Docker update interval set to {interval}s"
            }, websocket)
        else:
            await docker_manager.send_personal_message({
                "type": "error", 
                "message": "Docker update interval must be between 1 and 60 seconds"
            }, websocket)
    
    elif message_type == "container_action":
        # Handle container start/stop/restart actions
        container_id = data.get("container_id")
        action = data.get("action")  # start, stop, restart
        
        if not container_id or not action:
            await docker_manager.send_personal_message({
                "type": "error",
                "message": "container_id and action are required"
            }, websocket)
            return
        
        try:
            result = await _perform_container_action(container_id, action)
            await docker_manager.send_personal_message({
                "type": "container_action_result",
                "data": result
            }, websocket)
        except Exception as e:
            await docker_manager.send_personal_message({
                "type": "error",
                "message": f"Container action failed: {str(e)}"
            }, websocket)
    
    else:
        await docker_manager.send_personal_message({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }, websocket)

async def _perform_container_action(container_id: str, action: str) -> Dict[str, Any]:
    """Perform container actions (start/stop/restart)"""
    if not docker_client:
        raise Exception("Docker daemon not available")
    
    try:
        container = docker_client.containers.get(container_id)
        
        if action == "start":
            container.start()
        elif action == "stop":
            container.stop(timeout=10)
        elif action == "restart":
            container.restart(timeout=10)
        else:
            raise Exception(f"Unknown action: {action}")
        
        return {
            "success": True,
            "message": f"Container {container.name} {action}ed successfully",
            "container_id": container_id,
            "action": action
        }
        
    except docker.errors.NotFound:
        raise Exception("Container not found")
    except Exception as e:
        raise Exception(f"Action failed: {str(e)}")