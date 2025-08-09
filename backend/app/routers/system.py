# backend/app/routers/system.py - System monitoring endpoints

import asyncio
import os
import json
import logging
import subprocess
import psutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Set

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect  # <-- Add WebSocket and WebSocketDisconnect
from pydantic import BaseModel

# Your existing imports for models
from ..models.system_models import (
    SystemStats, 
    SystemInfo, 
    Process, 
    Service, 
    FileSystemItem, 
    DiskUsage,
    ServiceAction,
    ProcessAction,
    NetworkInterface
)

# Add import for surreal_service if you're using livequeries
from ..services.surreal_service import surreal_service

router = APIRouter()
logger = logging.getLogger(__name__)

# =============================================================================
# SYSTEM STATISTICS
# =============================================================================

@router.get("/stats", response_model=SystemStats)
async def get_system_stats():
    """Get comprehensive system statistics"""
    try:
        # CPU information
        cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
        cpu_freq = psutil.cpu_freq()
        cpu_count = psutil.cpu_count()
        load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
        
        # Memory information - more accurate calculation
        memory = psutil.virtual_memory()
        
        # Calculate "actual" memory usage (excluding buffers/cache on Linux)
        # This should match what tools like htop and OCCT show more closely
        if hasattr(memory, 'available'):
            # On Linux, use available memory for more accurate calculation
            actual_used = memory.total - memory.available
            actual_percent = (actual_used / memory.total) * 100
        else:
            # Fallback for other systems
            actual_used = memory.used
            actual_percent = memory.percent

        # Swap information - THIS WAS MISSING!
        swap = psutil.swap_memory()
        
        # Disk information
        disk_usage = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_usage.append(DiskUsage(
                    device=partition.device,
                    mountpoint=partition.mountpoint,
                    fstype=partition.fstype,
                    total=usage.total,
                    used=usage.used,
                    free=usage.free,
                    percent=usage.percent
                ))
            except PermissionError:
                continue
        
        # Network information
        network_io = psutil.net_io_counters()
        network_interfaces = []
        for interface, addresses in psutil.net_if_addrs().items():
            stats = psutil.net_if_stats().get(interface)
            if stats:
                ip_addresses = [addr.address for addr in addresses if addr.family == 2]  # AF_INET
                network_interfaces.append(NetworkInterface(
                    name=interface,
                    ip_addresses=ip_addresses,
                    is_up=stats.isup,
                    speed=stats.speed,
                    mtu=stats.mtu
                ))
        
        # System uptime
        boot_time = psutil.boot_time()
        uptime_seconds = datetime.now().timestamp() - boot_time
        
        return SystemStats(
            cpu={
                "percent": round(sum(cpu_percent) / len(cpu_percent), 2),
                "per_cpu": [round(p, 2) for p in cpu_percent],
                "count": cpu_count,
                "frequency": cpu_freq.current if cpu_freq else 0,
                "load_average": load_avg
            },
            memory={
                "total": memory.total,
                "available": memory.available if hasattr(memory, 'available') else memory.free,
                "used": actual_used,  # Use calculated actual usage
                "free": memory.free,
                "percent": round(actual_percent, 2),  # Use calculated percentage
                "cached": getattr(memory, 'cached', 0),
                "buffers": getattr(memory, 'buffers', 0),
                # Add raw values for debugging
                "raw_used": memory.used,
                "raw_percent": memory.percent
            },
            swap={
                "total": swap.total,
                "used": swap.used,
                "free": swap.free,
                "percent": swap.percent
            },
            disk=disk_usage,
            network={
                "bytes_sent": network_io.bytes_sent,
                "bytes_recv": network_io.bytes_recv,
                "packets_sent": network_io.packets_sent,
                "packets_recv": network_io.packets_recv,
                "interfaces": network_interfaces
            },
            uptime=int(uptime_seconds),
            boot_time=datetime.fromtimestamp(boot_time).isoformat(),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving system stats: {str(e)}")

@router.get("/info", response_model=SystemInfo)
async def get_system_info():
    """Get basic system information"""
    try:
        uname = platform.uname()
        return SystemInfo(
            hostname=uname.node,
            system=uname.system,
            release=uname.release,
            version=uname.version,
            machine=uname.machine,
            processor=uname.processor,
            python_version=platform.python_version(),
            cpu_count=psutil.cpu_count(),
            memory_total=psutil.virtual_memory().total,
            disk_total=sum(psutil.disk_usage(p.mountpoint).total 
                          for p in psutil.disk_partitions() 
                          if not p.mountpoint.startswith('/sys') and not p.mountpoint.startswith('/proc'))
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving system info: {str(e)}")

# =============================================================================
# PROCESS MANAGEMENT
# =============================================================================

@router.get("/processes", response_model=List[Process])
async def get_processes(limit: int = 50, sort_by: str = "cpu_percent"):
    """Get running processes sorted by resource usage"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 
                                       'status', 'create_time', 'username', 'cmdline']):
            try:
                pinfo = proc.info
                # Calculate memory usage in MB
                memory_mb = 0
                try:
                    memory_info = proc.memory_info()
                    memory_mb = memory_info.rss / 1024 / 1024
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                
                processes.append(Process(
                    pid=pinfo['pid'],
                    name=pinfo['name'],
                    cpu_percent=pinfo['cpu_percent'] or 0,
                    memory_percent=pinfo['memory_percent'] or 0,
                    memory_mb=round(memory_mb, 2),
                    status=pinfo['status'],
                    username=pinfo.get('username', 'unknown'),
                    command=' '.join(pinfo['cmdline'][:3]) if pinfo['cmdline'] else pinfo['name'],
                    created=datetime.fromtimestamp(pinfo['create_time']).isoformat()
                ))
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        # Sort processes
        if sort_by == "cpu_percent":
            processes.sort(key=lambda x: x.cpu_percent, reverse=True)
        elif sort_by == "memory_percent":
            processes.sort(key=lambda x: x.memory_percent, reverse=True)
        elif sort_by == "name":
            processes.sort(key=lambda x: x.name.lower())
        
        return processes[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving processes: {str(e)}")

@router.post("/processes/{pid}/kill")
async def kill_process(pid: int, signal: int = 15):
    """Kill a process by PID (default: SIGTERM)"""
    try:
        process = psutil.Process(pid)
        process_name = process.name()
        
        if signal == 9:  # SIGKILL
            process.kill()
        else:  # SIGTERM or other
            process.terminate()
        
        return {"message": f"Process {process_name} (PID: {pid}) terminated with signal {signal}"}
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail=f"Process with PID {pid} not found")
    except psutil.AccessDenied:
        raise HTTPException(status_code=403, detail=f"Access denied: cannot kill process {pid}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error killing process: {str(e)}")

# =============================================================================
# SERVICE MANAGEMENT (systemd)
# =============================================================================

@router.get("/services", response_model=List[Service])
async def get_services(status_filter: Optional[str] = None, limit: int = 100):
    """Get systemd services"""
    try:
        # Get service list from systemctl
        result = subprocess.run(
            ["systemctl", "list-units", "--type=service", "--no-pager", "--plain", "--no-legend"],
            capture_output=True,
            text=True,
            check=True
        )
        
        services = []
        for line in result.stdout.strip().split('\n'):
            if not line.strip():
                continue
            
            parts = line.split()
            if len(parts) >= 4:
                service_name = parts[0]
                load_state = parts[1]
                active_state = parts[2]
                sub_state = parts[3]
                description = ' '.join(parts[4:]) if len(parts) > 4 else ""
                
                # Filter by status if requested
                if status_filter and active_state != status_filter:
                    continue
                
                services.append(Service(
                    name=service_name,
                    load_state=load_state,
                    active_state=active_state,
                    sub_state=sub_state,
                    description=description
                ))
        
        return services[:limit]
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving services: {e.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving services: {str(e)}")

@router.post("/services/{service_name}/start")
async def start_service(service_name: str):
    """Start a systemd service"""
    return await _service_action(service_name, "start")

@router.post("/services/{service_name}/stop")
async def stop_service(service_name: str):
    """Stop a systemd service"""
    return await _service_action(service_name, "stop")

@router.post("/services/{service_name}/restart")
async def restart_service(service_name: str):
    """Restart a systemd service"""
    return await _service_action(service_name, "restart")

@router.post("/services/{service_name}/enable")
async def enable_service(service_name: str):
    """Enable a systemd service"""
    return await _service_action(service_name, "enable")

@router.post("/services/{service_name}/disable")
async def disable_service(service_name: str):
    """Disable a systemd service"""
    return await _service_action(service_name, "disable")

async def _service_action(service_name: str, action: str) -> Dict[str, str]:
    """Execute a systemctl action on a service"""
    try:
        # Validate service name to prevent injection
        if not service_name.replace('-', '').replace('.', '').replace('@', '').isalnum():
            raise HTTPException(status_code=400, detail="Invalid service name")
        
        result = subprocess.run(
            ["sudo", "systemctl", action, service_name],
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )
        
        return {
            "message": f"Service {service_name} {action}ed successfully",
            "output": result.stdout,
            "service": service_name,
            "action": action
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to {action} service {service_name}: {e.stderr}"
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=408, 
            detail=f"Service {action} operation timed out"
        )

# =============================================================================
# FILE SYSTEM OPERATIONS
# =============================================================================

@router.get("/filesystem/browse")
async def browse_filesystem(path: str = "/", show_hidden: bool = False) -> List[FileSystemItem]:
    """Browse filesystem directories and files"""
    try:
        target_path = Path(path).resolve()
        
        # Security check - prevent access to sensitive directories
        restricted_paths = ['/proc', '/sys', '/dev', '/run']
        if any(str(target_path).startswith(restricted) for restricted in restricted_paths):
            raise HTTPException(status_code=403, detail="Access to this directory is restricted")
        
        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Directory not found")
        
        if not target_path.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        items = []
        try:
            for item in target_path.iterdir():
                # Skip hidden files unless requested
                if not show_hidden and item.name.startswith('.'):
                    continue
                
                try:
                    stat_info = item.stat()
                    
                    # Determine file type
                    if item.is_dir():
                        file_type = "directory"
                    elif item.is_file():
                        file_type = "file"
                    elif item.is_symlink():
                        file_type = "symlink"
                    else:
                        file_type = "other"
                    
                    # Get file size (0 for directories)
                    size = stat_info.st_size if item.is_file() else 0
                    
                    items.append(FileSystemItem(
                        name=item.name,
                        path=str(item),
                        type=file_type,
                        size=size,
                        modified=datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                        permissions=oct(stat_info.st_mode)[-3:],
                        owner_uid=stat_info.st_uid,
                        group_gid=stat_info.st_gid
                    ))
                except (PermissionError, OSError):
                    # Skip files we can't access
                    continue
            
            # Sort: directories first, then files, both alphabetically
            items.sort(key=lambda x: (x.type != 'directory', x.name.lower()))
            return items
            
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error browsing filesystem: {str(e)}")

@router.get("/filesystem/disk-usage")
async def get_disk_usage() -> List[DiskUsage]:
    """Get disk usage for all mounted filesystems"""
    try:
        disk_usage = []
        for partition in psutil.disk_partitions():
            # Skip virtual filesystems
            if partition.fstype in ['tmpfs', 'devtmpfs', 'squashfs', 'proc', 'sysfs']:
                continue
            
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_usage.append(DiskUsage(
                    device=partition.device,
                    mountpoint=partition.mountpoint,
                    fstype=partition.fstype,
                    total=usage.total,
                    used=usage.used,
                    free=usage.free,
                    percent=usage.percent
                ))
            except PermissionError:
                continue
        
        return disk_usage
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving disk usage: {str(e)}")

# =============================================================================
# SYSTEM UTILITIES
# =============================================================================

@router.get("/uptime")
async def get_uptime():
    """Get system uptime information"""
    try:
        boot_time = psutil.boot_time()
        uptime_seconds = datetime.now().timestamp() - boot_time
        
        # Calculate days, hours, minutes
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        
        return {
            "uptime_seconds": int(uptime_seconds),
            "uptime_formatted": f"{days}d {hours}h {minutes}m",
            "boot_time": datetime.fromtimestamp(boot_time).isoformat(),
            "current_time": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving uptime: {str(e)}")

@router.get("/logs/{service_name}")
async def get_service_logs(service_name: str, lines: int = 100):
    """Get logs for a systemd service"""
    try:
        # Validate service name
        if not service_name.replace('-', '').replace('.', '').replace('@', '').isalnum():
            raise HTTPException(status_code=400, detail="Invalid service name")
        
        result = subprocess.run(
            ["journalctl", "-u", service_name, "-n", str(lines), "--no-pager"],
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )
        
        return {
            "service": service_name,
            "logs": result.stdout.split('\n'),
            "lines_requested": lines
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {e.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")

# =============================================================================
# LIVEQUERIES SYSTEM STATS
# =============================================================================

class SystemStatsConnectionManager:
    """Manages WebSocket connections for live system stats with robust fallback"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.live_query_id: Optional[str] = None
        self.polling_task: Optional[asyncio.Task] = None
        self.update_interval: float = 30.0  # 30 seconds for polling fallback
        
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection and setup live system stats query"""
        logger.info("🔌 System stats WebSocket connection starting...")
        await websocket.accept()
        logger.info("🔗 System stats WebSocket accepted")
        
        self.active_connections.add(websocket)
        logger.info(f"✅ System stats connections: {len(self.active_connections)}")
        
        # Send immediate current stats
        try:
            recent_stats = await surreal_service.get_system_stats(hours_back=1)
            if recent_stats:
                latest_stat = recent_stats[0]  # Most recent
                await self.send_personal_message({
                    "type": "system_stats",
                    "data": latest_stat,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "immediate": True
                }, websocket)
                logger.info("✅ Immediate system stats sent")
        except Exception as e:
            logger.error(f"❌ Failed to send immediate system stats: {e}")
        
        # Start monitoring if first connection - PUT THE LOGGING CODE HERE
        if not self.live_query_id and not self.polling_task:
            logger.info("🎯 Starting monitoring...")
            try:
                await self._start_monitoring()
                logger.info("✅ Monitoring started successfully")
            except Exception as e:
                logger.error(f"❌ Failed to start monitoring: {e}")
                import traceback
                traceback.print_exc()
    
    async def disconnect(self, websocket: WebSocket):
        """Remove connection and cleanup monitoring if needed"""
        self.active_connections.discard(websocket)
        logger.info(f"System stats WebSocket disconnected. Remaining: {len(self.active_connections)}")
        
        # Stop monitoring if no connections
        if len(self.active_connections) == 0:
            await self._stop_monitoring()
    
    async def _start_monitoring(self):
        """Start either live query or polling fallback"""
        logger.info("🚀 _start_monitoring called")
        try:
            logger.info("🚀 Attempting to start live query...")
            await self._start_live_stats_query()
        except Exception as e:
            logger.error(f"⚠️ Live query failed: {e}")
            logger.info("🔄 Falling back to polling...")
            await self._start_polling()
    
    async def _start_live_stats_query(self):
        """Start live query for system_stats changes"""
        # Use the table name directly (new API expects table name, not full LIVE query)
        self.live_query_id = await surreal_service.create_live_query(
            "system_stats",  # Just the table name
            self._handle_live_update
        )
        logger.info(f"📡 System stats live query started: {self.live_query_id}")
    
    async def _start_polling(self):
        """Start polling fallback"""
        logger.info("🔄 Starting polling fallback for system stats...")
        self.polling_task = asyncio.create_task(self._polling_loop())
    
    async def _polling_loop(self):
        """Polling loop that checks for new stats"""
        last_timestamp = None
        
        while self.active_connections:
            try:
                # Get recent stats
                recent_stats = await surreal_service.get_system_stats(hours_back=1)
                
                if recent_stats:
                    latest_stat = recent_stats[0]
                    current_timestamp = latest_stat.get('timestamp')
                    
                    # Only broadcast if we have new data
                    if current_timestamp != last_timestamp:
                        await self.broadcast({
                            "type": "system_stats",
                            "data": latest_stat,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "trigger": "polling",
                            "connection_count": len(self.active_connections)
                        })
                        
                        last_timestamp = current_timestamp
                        logger.info("📊 System stats polling update sent")
                
                # Wait before next check
                await asyncio.sleep(self.update_interval)
                
            except asyncio.CancelledError:
                logger.info("System stats polling cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Error in system stats polling: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    async def _stop_monitoring(self):
        """Stop either live query or polling"""
        # Stop live query if active
        if self.live_query_id:
            try:
                await surreal_service.kill_live_query(self.live_query_id)
                self.live_query_id = None
                logger.info("🛑 System stats live query stopped")
            except Exception as e:
                logger.error(f"❌ Failed to stop live query: {e}")
        
        # Stop polling if active
        if self.polling_task:
            self.polling_task.cancel()
            self.polling_task = None
            logger.info("🛑 System stats polling stopped")
    
    async def _handle_live_update(self, update_data: Any):
        """Handle live query updates from SurrealDB - Fixed signature to match working docker unified"""
        try:
            logger.info(f"📊 Live update received: {update_data}")
            
            # Get the latest stat record (result might contain the update, but get fresh data to be sure)
            recent_stats = await surreal_service.get_system_stats(hours_back=1)
            if recent_stats:
                latest_stat = recent_stats[0]
                
                # Broadcast to all connected clients
                await self.broadcast({
                    "type": "system_stats",
                    "data": latest_stat,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "trigger": "live_query",
                    "update_data": str(update_data),  # Include the live query data for debugging
                    "connection_count": len(self.active_connections)
                })
                
                logger.info("✅ System stats live update broadcasted")
        
        except Exception as e:
            logger.error(f"❌ Error handling live update: {e}")
        
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending system stats message: {e}")
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
                logger.error(f"Error broadcasting system stats: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.active_connections.discard(conn)


system_stats_manager = SystemStatsConnectionManager()

@router.websocket("/stats/live")
async def websocket_system_stats_live(websocket: WebSocket):
    """WebSocket endpoint for live system stats updates"""
    logger.info("🔌 New system stats WebSocket connection attempt")
    
    # Accept the connection using the manager
    await system_stats_manager.connect(websocket)
    
    async def handle_messages():
        """Handle incoming messages in separate task"""
        try:
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle client configuration messages
                if message.get("type") == "set_update_interval":
                    interval = max(10.0, min(60.0, float(message.get("interval", 30.0))))
                    system_stats_manager.update_interval = interval
                    logger.info(f"Updated system stats interval to {interval}s")
                    
                    await system_stats_manager.send_personal_message({
                        "type": "config_updated",
                        "message": f"Update interval set to {interval} seconds"
                    }, websocket)
                
                elif message.get("type") == "ping":
                    await system_stats_manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }, websocket)
                    
        except WebSocketDisconnect:
            pass
        except json.JSONDecodeError:
            logger.warning("Received invalid JSON from system stats client")
        except Exception as e:
            logger.error(f"Error handling system stats client message: {e}")

# Additional endpoints for backend/app/routers/system.py
# Add these endpoints to your existing system router

from typing import Optional

# =============================================================================
# ENHANCED HARDWARE MONITORING ENDPOINTS
# =============================================================================

@router.get("/hardware/dashboard")
async def get_hardware_dashboard():
    """Get comprehensive hardware monitoring dashboard data"""
    try:
        summary = await surreal_service.get_dashboard_summary()
        return {
            "success": True,
            "data": summary,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving hardware dashboard: {str(e)}")

@router.get("/hardware/sensors")
async def get_available_sensors():
    """Get list of available hardware sensors for dashboard configuration"""
    try:
        sensors = await surreal_service.get_available_sensors()
        return {
            "success": True,
            "sensors": sensors,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving sensors: {str(e)}")

@router.get("/hardware/cpu/cores")
async def get_cpu_core_history(hours: int = 6):
    """Get per-core CPU usage history for the specified number of hours"""
    try:
        if hours > 72:  # Limit to 3 days max
            hours = 72
        
        core_history = await surreal_service.get_cpu_core_history(hours)
        return {
            "success": True,
            "hours_requested": hours,
            "data_points": len(core_history),
            "data": core_history,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving CPU core history: {str(e)}")

@router.get("/hardware/temperatures")
async def get_temperature_history(hours: int = 6):
    """Get temperature history for all sensors (CPU, Memory, SSD)"""
    try:
        if hours > 72:  # Limit to 3 days max
            hours = 72
        
        temp_history = await surreal_service.get_temperature_history(hours)
        return {
            "success": True,
            "hours_requested": hours,
            "data": temp_history,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving temperature history: {str(e)}")

@router.get("/hardware/fans")
async def get_fan_speed_history(hours: int = 6):
    """Get fan speed history for the specified number of hours"""
    try:
        if hours > 72:  # Limit to 3 days max
            hours = 72
        
        fan_history = await surreal_service.get_fan_speed_history(hours)
        return {
            "success": True,
            "hours_requested": hours,
            "data_points": len(fan_history),
            "data": fan_history,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving fan speed history: {str(e)}")

@router.get("/hardware/docker/containers")
async def get_docker_container_history(hours: int = 6, container: Optional[str] = None):
    """Get Docker container resource usage history"""
    try:
        if hours > 72:  # Limit to 3 days max
            hours = 72
        
        container_history = await surreal_service.get_docker_container_history(hours, container)
        return {
            "success": True,
            "hours_requested": hours,
            "container_filter": container,
            "data_points": len(container_history),
            "data": container_history,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving Docker container history: {str(e)}")

@router.get("/hardware/metric/{metric_path:path}")
async def get_metric_history(metric_path: str, hours: int = 6):
    """
    Get history for a specific metric using dot notation path
    
    Examples:
    - /hardware/metric/cpu_enhanced.temperatures.tctl_temp
    - /hardware/metric/memory_enhanced.temperatures.dimm_hwmon3_temp1
    - /hardware/metric/ssd_temps.nvme0n1.composite_temp
    - /hardware/metric/fans.cpu_fan.speed_rpm
    - /hardware/metric/docker_containers.nginx.cpu.percent
    """
    try:
        if hours > 72:  # Limit to 3 days max
            hours = 72
        
        metric_history = await surreal_service.get_metric_history(metric_path, hours)
        return {
            "success": True,
            "metric_path": metric_path,
            "hours_requested": hours,
            "data_points": len(metric_history),
            "data": metric_history,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving metric {metric_path}: {str(e)}")

@router.get("/hardware/cpu/frequencies")
async def get_cpu_frequency_history(hours: int = 6):
    """Get per-core CPU frequency history"""
    try:
        if hours > 72:
            hours = 72
        
        stats = await surreal_service.get_enhanced_system_stats(hours)
        
        freq_history = []
        for stat in stats:
            if 'cpu_enhanced' in stat and 'per_core_freq' in stat['cpu_enhanced']:
                freq_data = {
                    'timestamp': stat.get('timestamp'),
                    'collected_at': stat.get('collected_at'),
                    'frequencies': stat['cpu_enhanced']['per_core_freq']
                }
                freq_history.append(freq_data)
        
        return {
            "success": True,
            "hours_requested": hours,
            "data_points": len(freq_history),
            "data": freq_history,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving CPU frequency history: {str(e)}")

@router.get("/hardware/memory/enhanced")
async def get_enhanced_memory_stats(hours: int = 6):
    """Get enhanced memory statistics including physical/swap breakdown and temperatures"""
    try:
        if hours > 72:
            hours = 72
        
        stats = await surreal_service.get_enhanced_system_stats(hours)
        
        memory_history = []
        for stat in stats:
            if 'memory_enhanced' in stat:
                memory_data = {
                    'timestamp': stat.get('timestamp'),
                    'collected_at': stat.get('collected_at'),
                    'memory': stat['memory_enhanced']
                }
                memory_history.append(memory_data)
        
        return {
            "success": True,
            "hours_requested": hours,
            "data_points": len(memory_history),
            "data": memory_history,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving enhanced memory stats: {str(e)}")

@router.get("/hardware/docker/summary")
async def get_docker_resource_summary():
    """Get current Docker container resource usage summary"""
    try:
        # Get most recent stats
        recent_stats = await surreal_service.get_enhanced_system_stats(hours_back=1)
        
        if not recent_stats:
            return {
                "success": False,
                "error": "No recent Docker stats available"
            }
        
        latest_stat = recent_stats[0]
        
        if 'docker_containers' not in latest_stat:
            return {
                "success": True,
                "containers": {},
                "summary": {
                    "total_containers": 0,
                    "total_cpu_percent": 0,
                    "total_memory_mb": 0
                }
            }
        
        containers = latest_stat['docker_containers']
        
        # Calculate summary stats
        total_cpu = sum(c.get('cpu', {}).get('percent', 0) for c in containers.values())
        total_memory = sum(c.get('memory', {}).get('usage_mb', 0) for c in containers.values())
        
        # Group by compose project
        by_project = {}
        for container_name, container_data in containers.items():
            project = container_data.get('compose_project', '_standalone')
            if project not in by_project:
                by_project[project] = {
                    'containers': [],
                    'total_cpu': 0,
                    'total_memory': 0
                }
            
            by_project[project]['containers'].append({
                'name': container_name,
                'cpu_percent': container_data.get('cpu', {}).get('percent', 0),
                'memory_mb': container_data.get('memory', {}).get('usage_mb', 0),
                'status': container_data.get('status', 'unknown')
            })
            by_project[project]['total_cpu'] += container_data.get('cpu', {}).get('percent', 0)
            by_project[project]['total_memory'] += container_data.get('memory', {}).get('usage_mb', 0)
        
        return {
            "success": True,
            "containers": containers,
            "by_project": by_project,
            "summary": {
                "total_containers": len(containers),
                "total_cpu_percent": round(total_cpu, 2),
                "total_memory_mb": round(total_memory, 2),
                "total_memory_gb": round(total_memory / 1024, 2)
            },
            "timestamp": latest_stat.get('timestamp')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving Docker resource summary: {str(e)}")

# =============================================================================
# ENHANCED HISTORICAL DATA ENDPOINTS
# =============================================================================

@router.get("/stats/enhanced")
async def get_enhanced_system_stats_endpoint(hours: int = 24):
    """Get enhanced system statistics with all hardware monitoring data"""
    try:
        if hours > 168:  # Limit to 1 week max
            hours = 168
        
        stats = await surreal_service.get_enhanced_system_stats(hours)
        return {
            "success": True,
            "hours_requested": hours,
            "data_points": len(stats),
            "data": stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving enhanced system stats: {str(e)}")

@router.get("/stats/chart-data/{metric_type}")
async def get_chart_data_for_metric(metric_type: str, hours: int = 6):
    """
    Get chart-ready data for dashboard widgets
    
    Supported metric types:
    - cpu_percent, memory_percent, disk_percent (basic)
    - cpu_temp, memory_temp, ssd_temp (temperatures)
    - fan_speed (fan speeds)
    - docker_cpu, docker_memory (Docker container totals)
    """
    try:
        if hours > 72:
            hours = 72
        
        stats = await surreal_service.get_enhanced_system_stats(hours)
        
        chart_data = []
        
        for stat in stats:
            timestamp = stat.get('timestamp', time.time())
            collected_at = stat.get('collected_at')
            
            value = None
            
            # Basic metrics
            if metric_type == 'cpu_percent':
                value = stat.get('cpu_percent', 0)
            elif metric_type == 'memory_percent':
                value = stat.get('memory_percent', 0)
            elif metric_type == 'disk_percent':
                value = stat.get('disk_percent', 0)
            
            # Temperature metrics (use average or first available)
            elif metric_type == 'cpu_temp':
                if 'cpu_enhanced' in stat and 'temperatures' in stat['cpu_enhanced']:
                    temps = stat['cpu_enhanced']['temperatures']
                    if 'tctl_temp' in temps:
                        value = temps['tctl_temp']
                    elif temps:
                        value = list(temps.values())[0]  # First available
            
            elif metric_type == 'memory_temp':
                if 'memory_enhanced' in stat and 'temperatures' in stat['memory_enhanced']:
                    temps = stat['memory_enhanced']['temperatures']
                    if temps:
                        value = sum(temps.values()) / len(temps)  # Average
            
            elif metric_type == 'ssd_temp':
                if 'ssd_temps' in stat:
                    ssd_temps = []
                    for ssd_data in stat['ssd_temps'].values():
                        if isinstance(ssd_data, dict) and 'composite_temp' in ssd_data:
                            ssd_temps.append(ssd_data['composite_temp'])
                    if ssd_temps:
                        value = sum(ssd_temps) / len(ssd_temps)  # Average
            
            elif metric_type == 'fan_speed':
                if 'fans' in stat:
                    fan_speeds = []
                    for fan_data in stat['fans'].values():
                        if isinstance(fan_data, dict) and 'speed_rpm' in fan_data:
                            fan_speeds.append(fan_data['speed_rpm'])
                    if fan_speeds:
                        value = sum(fan_speeds) / len(fan_speeds)  # Average RPM
            
            # Docker metrics
            elif metric_type == 'docker_cpu':
                if 'docker_containers' in stat:
                    total_cpu = sum(
                        c.get('cpu', {}).get('percent', 0) 
                        for c in stat['docker_containers'].values()
                    )
                    value = total_cpu
            
            elif metric_type == 'docker_memory':
                if 'docker_containers' in stat:
                    total_memory = sum(
                        c.get('memory', {}).get('usage_mb', 0) 
                        for c in stat['docker_containers'].values()
                    )
                    value = total_memory
            
            if value is not None:
                chart_data.append({
                    'timestamp': timestamp,
                    'collected_at': collected_at,
                    'value': round(value, 2),
                    'time': datetime.fromtimestamp(timestamp).isoformat() if timestamp else collected_at
                })
        
        return {
            "success": True,
            "metric_type": metric_type,
            "hours_requested": hours,
            "data_points": len(chart_data),
            "data": chart_data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chart data for {metric_type}: {str(e)}")

@router.get("/stats/debug")
async def debug_system_stats():
    """Debug endpoint to check SurrealDB system stats"""
    try:
        # Get recent stats from SurrealDB
        recent_stats = await surreal_service.get_system_stats(hours_back=1)
        
        return {
            "surrealdb_connected": surreal_service.connected,
            "stats_count": len(recent_stats) if recent_stats else 0,
            "latest_stats": recent_stats[:3] if recent_stats else [],  # First 3 records
            "surrealdb_url": "ws://localhost:18000/rpc"
        }
    except Exception as e:
        return {
            "error": str(e),
            "surrealdb_connected": False,
            "stats_count": 0
        }
    
    # Start message handling task
    message_task = asyncio.create_task(handle_messages())
    
    try:
        # Wait for disconnect
        await message_task
    except WebSocketDisconnect:
        pass
    finally:
        message_task.cancel()
        await system_stats_manager.disconnect(websocket)
