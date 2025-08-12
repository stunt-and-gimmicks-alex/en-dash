# backend/app/routers/system.py
"""
System monitoring router - DECOUPLED from WebSocket management.
WebSocket functionality moved to picows_websocket.py and data_broadcaster.py
This router now focuses ONLY on REST endpoints for system information.
"""

import asyncio
import logging
import subprocess
from datetime import datetime, timedelta
from typing import List, Dict, Any

import psutil
from fastapi import APIRouter, HTTPException, Query

from ..services.surreal_service import surreal_service

router = APIRouter()
logger = logging.getLogger(__name__)

# =============================================================================
# SYSTEM INFORMATION ENDPOINTS (REST ONLY)
# =============================================================================

@router.get("/info")
async def get_system_info():
    """Get basic system information"""
    try:
        # Get system information
        uname = psutil.uname()
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        
        return {
            "hostname": uname.node,
            "system": uname.system,
            "release": uname.release,
            "version": uname.version,
            "machine": uname.machine,
            "processor": uname.processor,
            "boot_time": boot_time.isoformat(),
            "python_version": f"{psutil.version_info.major}.{psutil.version_info.minor}.{psutil.version_info.micro}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving system info: {str(e)}")

@router.get("/stats")
async def get_current_stats():
    """Get current system statistics (single snapshot)"""
    try:
        # CPU stats  
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory stats
        memory = psutil.virtual_memory()
        
        # Disk stats
        disk = psutil.disk_usage('/')
        
        # Network stats
        network = psutil.net_io_counters()
        
        # Process count
        process_count = len(psutil.pids())
        
        # Load average
        try:
            load_avg = psutil.getloadavg()
        except AttributeError:
            load_avg = [0, 0, 0]  # Windows fallback
        
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "load_avg_1m": load_avg[0],
                "load_avg_5m": load_avg[1], 
                "load_avg_15m": load_avg[2],
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "percent": memory.percent,
                "free": memory.free,
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100,
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv,
            },
            "processes": {
                "count": process_count,
            },
            "note": "For real-time stats, use WebSocket endpoint /api/docker/ws/unified"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving system stats: {str(e)}")

@router.get("/stats/history")
async def get_historical_stats(hours_back: int = Query(24, ge=1, le=168)):
    """Get historical system statistics from SurrealDB"""
    try:
        stats = await surreal_service.get_system_stats(hours_back=hours_back)
        
        return {
            "success": True,
            "hours_back": hours_back,
            "total_records": len(stats),
            "data": stats,
            "note": "Real-time stats available via WebSocket at /api/docker/ws/unified"
        }
    except Exception as e:
        logger.error(f"Error retrieving historical stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving historical stats: {str(e)}")

@router.get("/processes")
async def get_processes(limit: int = Query(50, ge=1, le=500)):
    """Get list of running processes"""
    try:
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Sort by CPU usage
        processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
        
        return {
            "total_processes": len(processes),
            "top_processes": processes[:limit],
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving processes: {str(e)}")

@router.get("/memory")
async def get_memory_info():
    """Get detailed memory information"""
    try:
        virtual = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        return {
            "virtual_memory": {
                "total": virtual.total,
                "available": virtual.available,
                "used": virtual.used,
                "free": virtual.free,
                "percent": virtual.percent,
                "active": getattr(virtual, 'active', None),
                "inactive": getattr(virtual, 'inactive', None),
                "buffers": getattr(virtual, 'buffers', None),
                "cached": getattr(virtual, 'cached', None),
                "shared": getattr(virtual, 'shared', None),
            },
            "swap_memory": {
                "total": swap.total,
                "used": swap.used,
                "free": swap.free,
                "percent": swap.percent,
                "sin": swap.sin,
                "sout": swap.sout,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving memory info: {str(e)}")

@router.get("/disk")
async def get_disk_info():
    """Get disk usage information"""
    try:
        partitions = psutil.disk_partitions()
        disk_info = []
        
        for partition in partitions:
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_info.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": (usage.used / usage.total) * 100 if usage.total > 0 else 0
                })
            except PermissionError:
                continue
        
        return {"disk_partitions": disk_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving disk usage: {str(e)}")

@router.get("/network")
async def get_network_info():
    """Get network interface information"""
    try:
        # Network IO counters
        net_io = psutil.net_io_counters(pernic=True)
        
        # Network interface addresses
        net_if_addrs = psutil.net_if_addrs()
        
        # Network interface stats
        net_if_stats = psutil.net_if_stats()
        
        interfaces = {}
        for interface_name in net_if_addrs:
            interfaces[interface_name] = {
                "addresses": [
                    {
                        "family": addr.family.name if hasattr(addr.family, 'name') else str(addr.family),
                        "address": addr.address,
                        "netmask": addr.netmask,
                        "broadcast": addr.broadcast,
                    }
                    for addr in net_if_addrs[interface_name]
                ],
                "stats": {
                    "isup": net_if_stats[interface_name].isup if interface_name in net_if_stats else None,
                    "duplex": net_if_stats[interface_name].duplex.name if interface_name in net_if_stats and hasattr(net_if_stats[interface_name].duplex, 'name') else None,
                    "speed": net_if_stats[interface_name].speed if interface_name in net_if_stats else None,
                    "mtu": net_if_stats[interface_name].mtu if interface_name in net_if_stats else None,
                },
                "io_counters": {
                    "bytes_sent": net_io[interface_name].bytes_sent if interface_name in net_io else 0,
                    "bytes_recv": net_io[interface_name].bytes_recv if interface_name in net_io else 0,
                    "packets_sent": net_io[interface_name].packets_sent if interface_name in net_io else 0,
                    "packets_recv": net_io[interface_name].packets_recv if interface_name in net_io else 0,
                    "errin": net_io[interface_name].errin if interface_name in net_io else 0,
                    "errout": net_io[interface_name].errout if interface_name in net_io else 0,
                    "dropin": net_io[interface_name].dropin if interface_name in net_io else 0,
                    "dropout": net_io[interface_name].dropout if interface_name in net_io else 0,
                }
            }
        
        return {"network_interfaces": interfaces}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving network info: {str(e)}")

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
# FORCE DATA UPDATES (Integration with Data Broadcaster)
# =============================================================================

@router.post("/stats/force-update")
async def force_stats_update():
    """Force immediate system stats collection and broadcast"""
    try:
        from ..services.data_broadcaster import data_broadcaster
        await data_broadcaster.force_update_system_stats()
        
        return {
            "success": True,
            "message": "System stats update forced",
            "timestamp": datetime.now().isoformat(),
            "note": "Updated data will be broadcast to WebSocket clients"
        }
    except Exception as e:
        logger.error(f"Error forcing stats update: {e}")
        raise HTTPException(status_code=500, detail=f"Error forcing update: {str(e)}")

@router.get("/stats/broadcaster-status")
async def get_broadcaster_status():
    """Get status of the data broadcaster service"""
    try:
        from ..services.data_broadcaster import data_broadcaster
        stats = data_broadcaster.get_stats()
        
        return {
            "broadcaster_running": stats.get("running", False),
            "live_queries": stats.get("live_queries", []),
            "polling_fallbacks": stats.get("polling_fallbacks", []),
            "intervals": stats.get("intervals", {}),
            "note": "Real-time data available via WebSocket at /api/docker/ws/unified"
        }
    except Exception as e:
        logger.error(f"Error getting broadcaster status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")

# =============================================================================
# REMOVED: SystemStatsConnectionManager
# WebSocket functionality moved to:
# - app/services/websocket_manager.py (connection management)
# - app/services/data_broadcaster.py (data broadcasting)
# - app/routers/picows_websocket.py (websocket endpoints)
# =============================================================================

# REMOVED: All WebSocket-related classes and endpoints
# This router now focuses ONLY on:
# 1. REST endpoints for system information
# 2. Historical data retrieval
# 3. Integration with data broadcaster for forced updates