"""
WebSocket endpoints for real-time system monitoring
"""

import asyncio
import json
import logging
from typing import Dict, Any, Set
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import psutil

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    """Manages WebSocket connections for system stats"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.stats_task: asyncio.Task = None
        self.update_interval = 1.0  # seconds
        
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Start stats broadcasting if this is the first connection
        if len(self.active_connections) == 1:
            self.stats_task = asyncio.create_task(self._broadcast_stats())
    
    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
        
        # Stop stats broadcasting if no connections remain
        if len(self.active_connections) == 0 and self.stats_task:
            self.stats_task.cancel()
            self.stats_task = None
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
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
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.active_connections.discard(conn)
    
    async def _broadcast_stats(self):
        """Continuously broadcast system stats"""
        logger.info("Started system stats broadcasting")
        
        try:
            while self.active_connections:
                try:
                    stats = await self._get_system_stats()
                    await self.broadcast({
                        "type": "system_stats",
                        "data": stats,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                    await asyncio.sleep(self.update_interval)
                except Exception as e:
                    logger.error(f"Error in stats broadcasting: {e}")
                    await asyncio.sleep(5)  # Wait longer on error
                    
        except asyncio.CancelledError:
            logger.info("System stats broadcasting stopped")
            raise
    
    async def _get_system_stats(self) -> Dict[str, Any]:
        """Get current system statistics"""
        # CPU stats
        cpu_percent = psutil.cpu_percent(interval=None, percpu=True)
        cpu_freq = psutil.cpu_freq()
        load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
        
        # Memory stats
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk I/O
        disk_io = psutil.disk_io_counters()
        
        # Network I/O  
        network_io = psutil.net_io_counters()
        
        # Process count
        process_count = len(psutil.pids())
        
        return {
            "cpu": {
                "percent_per_core": cpu_percent,
                "percent_total": sum(cpu_percent) / len(cpu_percent),
                "frequency": {
                    "current": cpu_freq.current if cpu_freq else 0,
                    "min": cpu_freq.min if cpu_freq else 0,
                    "max": cpu_freq.max if cpu_freq else 0,
                },
                "load_average": {
                    "1min": load_avg[0],
                    "5min": load_avg[1], 
                    "15min": load_avg[2]
                },
                "count": psutil.cpu_count()
            },
            "memory": {
                "total": memory.total,
                "used": memory.used,
                "available": memory.available,
                "percent": memory.percent,
                "cached": getattr(memory, 'cached', 0),
                "buffers": getattr(memory, 'buffers', 0)
            },
            "swap": {
                "total": swap.total,
                "used": swap.used,
                "free": swap.free,
                "percent": swap.percent
            },
            "disk_io": {
                "read_bytes": disk_io.read_bytes if disk_io else 0,
                "write_bytes": disk_io.write_bytes if disk_io else 0,
                "read_count": disk_io.read_count if disk_io else 0,
                "write_count": disk_io.write_count if disk_io else 0
            },
            "network_io": {
                "bytes_sent": network_io.bytes_sent,
                "bytes_recv": network_io.bytes_recv,
                "packets_sent": network_io.packets_sent,
                "packets_recv": network_io.packets_recv
            },
            "processes": {
                "total": process_count
            }
        }

# Connection manager instance
system_manager = ConnectionManager()

@router.websocket("/ws/system/stats")
async def websocket_system_stats(websocket: WebSocket):
    """
    WebSocket endpoint for real-time system statistics
    
    Sends system stats every second while connected.
    Message format:
    {
        "type": "system_stats",
        "data": { ... stats ... },
        "timestamp": "2024-01-01T00:00:00Z"
    }
    """
    await system_manager.connect(websocket)
    
    try:
        while True:
            # Keep connection alive and handle client messages
            try:
                # Wait for client message (like config changes)
                message = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                
                try:
                    data = json.loads(message)
                    await _handle_client_message(data, websocket)
                except json.JSONDecodeError:
                    await system_manager.send_personal_message({
                        "type": "error",
                        "message": "Invalid JSON format"
                    }, websocket)
                    
            except asyncio.TimeoutError:
                # No message received, continue loop
                continue
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from system stats WebSocket")
    except Exception as e:
        logger.error(f"Error in system stats WebSocket: {e}")
    finally:
        await system_manager.disconnect(websocket)

async def _handle_client_message(data: dict, websocket: WebSocket):
    """Handle messages from WebSocket clients"""
    message_type = data.get("type")
    
    if message_type == "set_update_interval":
        # Allow clients to change update frequency
        interval = data.get("interval", 1.0)
        if 0.1 <= interval <= 60.0:  # Limit between 100ms and 60s
            system_manager.update_interval = interval
            await system_manager.send_personal_message({
                "type": "config_updated",
                "message": f"Update interval set to {interval}s"
            }, websocket)
        else:
            await system_manager.send_personal_message({
                "type": "error", 
                "message": "Update interval must be between 0.1 and 60 seconds"
            }, websocket)
    
    elif message_type == "get_current_stats":
        # Send immediate stats update
        stats = await system_manager._get_system_stats()
        await system_manager.send_personal_message({
            "type": "system_stats",
            "data": stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, websocket)
    
    else:
        await system_manager.send_personal_message({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }, websocket)