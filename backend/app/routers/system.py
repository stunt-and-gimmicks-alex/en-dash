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
from typing import List, Dict, Any, Optional
from enum import Enum

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
# NEW HISTORICAL DATA ENDPOINTS FOR DASHBOARDING
# =============================================================================

class StatField(str, Enum):
    CPU_PERCENT = "cpu_percent"
    MEMORY_PERCENT = "memory_percent"
    MEMORY_USED_GB = "memory_used_gb"
    MEMORY_TOTAL_GB = "memory_total_gb"
    DISK_PERCENT = "disk_percent"
    DISK_USED_GB = "disk_used_gb"
    DISK_TOTAL_GB = "disk_total_gb"
    NETWORK_BYTES_SENT = "network_bytes_sent"
    NETWORK_BYTES_RECV = "network_bytes_recv"
    NETWORK_PACKETS_SENT = "network_packets_sent"
    NETWORK_PACKETS_RECV = "network_packets_recv"
    ALL = "all"

@router.get("/stats/range")
async def get_stats_range(
    minutes_back: int = Query(60, ge=1, le=1440, description="Minutes of history (1-1440)"),
    fields: List[StatField] = Query([StatField.ALL], description="Specific fields to return"),
    limit: int = Query(1000, ge=1, le=10000, description="Maximum records to return")
):
    """
    Get system stats for a specific time range with field filtering
    PHASE 3: Works with time-series complex record IDs
    """
    try:
        # Use the new time-series method
        stats = await surreal_service.get_system_stats_range_timeseries(minutes_back=minutes_back)
        
        if not stats:
            return {
                "success": True,
                "minutes_back": minutes_back,
                "total_records": 0,
                "fields_requested": fields,
                "data": []
            }
        
        # Apply field filtering
        filtered_stats = []
        for stat in stats[:limit]:  # Apply limit
            if StatField.ALL in fields:
                # Return all fields
                filtered_stats.append(stat)
            else:
                # Return only requested fields + timestamp
                filtered_stat = {"timestamp": stat.get("timestamp"), "collected_at": stat.get("collected_at")}
                for field in fields:
                    if field.value in stat:
                        filtered_stat[field.value] = stat[field.value]
                filtered_stats.append(filtered_stat)
        
        return {
            "success": True,
            "minutes_back": minutes_back,
            "total_records": len(filtered_stats),
            "fields_requested": [f.value for f in fields],
            "data": filtered_stats,
            "note": "Data retrieved from time-series optimized storage"
        }
    
    except Exception as e:
        logger.error(f"Error retrieving stats range: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving stats range: {str(e)}")

@router.get("/stats/latest")
async def get_latest_stats(
    fields: List[StatField] = Query([StatField.ALL], description="Specific fields to return")
):
    """
    Get the most recent system stats with field filtering
    PHASE 3: Uses O(1) time-series lookup
    """
    try:
        # Use the new time-series method for instant lookup
        latest_stat = await surreal_service.get_system_stats_latest_timeseries()
        
        if not latest_stat:
            return {
                "success": True,
                "data": None,
                "note": "No recent stats available"
            }
        
        # Apply field filtering
        if StatField.ALL in fields:
            filtered_stat = latest_stat
        else:
            filtered_stat = {"timestamp": latest_stat.get("timestamp"), "collected_at": latest_stat.get("collected_at")}
            for field in fields:
                if field.value in latest_stat:
                    filtered_stat[field.value] = latest_stat[field.value]
        
        return {
            "success": True,
            "fields_requested": [f.value for f in fields],
            "data": filtered_stat,
            "note": "Retrieved from time-series O(1) lookup"
        }
    
    except Exception as e:
        logger.error(f"Error retrieving latest stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving latest stats: {str(e)}")

@router.get("/stats/summary")
async def get_stats_summary(
    minutes_back: int = Query(60, ge=1, le=1440),
    fields: List[StatField] = Query([StatField.CPU_PERCENT, StatField.MEMORY_PERCENT, StatField.DISK_PERCENT])
):
    """
    Get statistical summary (min, max, avg) for specified fields over time range
    PHASE 3: Perfect for dashboard cards and alerts
    """
    try:
        # Get raw data using time-series method
        stats = await surreal_service.get_system_stats_range_timeseries(minutes_back=minutes_back)
        
        if not stats:
            return {"success": True, "data": {}, "note": "No data available for summary"}
        
        # Calculate summaries for each requested field
        summaries = {}
        for field in fields:
            if field == StatField.ALL:
                continue  # Skip 'all' for summary calculations
            
            field_values = [stat.get(field.value) for stat in stats if stat.get(field.value) is not None]
            
            if field_values:
                summaries[field.value] = {
                    "min": min(field_values),
                    "max": max(field_values),
                    "avg": sum(field_values) / len(field_values),
                    "count": len(field_values),
                    "latest": field_values[0] if field_values else None  # First record is latest
                }
            else:
                summaries[field.value] = {
                    "min": None, "max": None, "avg": None, "count": 0, "latest": None
                }
        
        return {
            "success": True,
            "minutes_back": minutes_back,
            "total_records": len(stats),
            "data": summaries,
            "note": "Statistical summary from time-series data"
        }
    
    except Exception as e:
        logger.error(f"Error calculating stats summary: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculating summary: {str(e)}")

# UPDATE: Replace old /stats/history endpoint to use new time-series method
@router.get("/stats/history")
async def get_historical_stats(
    hours_back: int = Query(24, ge=1, le=168, description="Hours of history (1-168)"),
    fields: List[StatField] = Query([StatField.ALL], description="Specific fields to return"),
    limit: int = Query(1000, ge=1, le=10000, description="Maximum records to return")
):
    """
    UPDATED: Get historical system statistics using time-series optimization
    PHASE 3: Backwards compatible but now uses complex record IDs
    """
    try:
        # Convert hours to minutes for the time-series method
        minutes_back = hours_back * 60
        
        # Use new time-series method instead of old get_system_stats
        stats = await surreal_service.get_system_stats_range_timeseries(minutes_back=minutes_back)
        
        if not stats:
            return {
                "success": True,
                "hours_back": hours_back,
                "total_records": 0,
                "data": [],
                "note": "No historical data available"
            }
        
        # Apply field filtering and limit
        filtered_stats = []
        for stat in stats[:limit]:
            if StatField.ALL in fields:
                filtered_stats.append(stat)
            else:
                filtered_stat = {"timestamp": stat.get("timestamp"), "collected_at": stat.get("collected_at")}
                for field in fields:
                    if field.value in stat:
                        filtered_stat[field.value] = stat[field.value]
                filtered_stats.append(filtered_stat)
        
        return {
            "success": True,
            "hours_back": hours_back,
            "total_records": len(filtered_stats),
            "data": filtered_stats,
            "note": "Retrieved using time-series optimization - O(1) performance"
        }
    except Exception as e:
        logger.error(f"Error retrieving historical stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving historical stats: {str(e)}")