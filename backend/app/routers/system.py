# backend/app/routers/system.py - System monitoring endpoints

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import psutil
import subprocess
import os
import platform
import shutil
from datetime import datetime, timezone
from pathlib import Path

from ..models.system_models import (
    SystemStats, Process, Service, DiskUsage, NetworkInterface,
    SystemInfo, FileSystemItem
)
from ..services.surreal_service import surreal_service

router = APIRouter()

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
# HISTORICAL SYSTEM STATISTICS (from SurrealDB)
# =============================================================================

@router.get("/stats/historical")
async def get_historical_system_stats(hours: int = 24):
    """Get historical system statistics from SurrealDB"""
    try:
        stats = await surreal_service.get_system_stats(hours_back=hours)
        return {
            "timeframe_hours": hours,
            "data_points": len(stats),
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error retrieving historical stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/chart-data")
async def get_chart_data(metric: str = "cpu_percent", hours: int = 6):
    """Get formatted data for charts"""
    try:
        stats = await surreal_service.get_system_stats(hours_back=hours)
        
        # Format data for charts (timestamp + value pairs)
        chart_data = []
        for stat in reversed(stats):  # Reverse to get chronological order
            if metric in stat:
                chart_data.append({
                    "timestamp": stat.get("timestamp"),
                    "value": stat.get(metric),
                    "time": stat.get("timestamp")  # For recharts compatibility
                })
        
        return {
            "metric": metric,
            "timeframe_hours": hours,
            "data": chart_data
        }
    except Exception as e:
        logger.error(f"Error retrieving chart data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/metrics")
async def get_available_metrics():
    """Get list of available metrics for charting"""
    try:
        # Get a recent stat to see what metrics are available
        recent_stats = await surreal_service.get_system_stats(hours_back=1)
        
        if recent_stats:
            # Extract metric names (exclude metadata fields)
            sample_stat = recent_stats[0]
            metrics = [
                key for key in sample_stat.keys() 
                if key not in ['timestamp', 'collected_at', 'id'] 
                and isinstance(sample_stat[key], (int, float))
            ]
            return {"metrics": metrics}
        else:
            return {"metrics": []}
            
    except Exception as e:
        logger.error(f"Error getting available metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))