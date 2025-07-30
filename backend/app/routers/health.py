"""
Health check and system status endpoints
"""

import asyncio
import psutil
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint
    Returns overall system health status
    """
    try:
        # Basic system info
        boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
        
        health_data = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "en-dash-api",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "uptime_seconds": (datetime.now(timezone.utc) - boot_time).total_seconds(),
        }
        
        return health_data
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


@router.get("/health/detailed")
async def detailed_health_check():
    """
    Detailed health check with system metrics and service status
    """
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
        
        # Check Docker connectivity
        docker_status = await _check_docker_status()
        
        # Build detailed response
        health_data = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "en-dash-api",
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "system": {
                "uptime_seconds": (datetime.now(timezone.utc) - boot_time).total_seconds(),
                "cpu_percent": cpu_percent,
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent,
                    "used": memory.used
                },
                "disk": {
                    "total": disk.total,
                    "free": disk.free,
                    "used": disk.used,
                    "percent": (disk.used / disk.total) * 100
                }
            },
            "services": {
                "docker": docker_status
            },
            "configuration": {
                "debug": settings.DEBUG,
                "metrics_enabled": settings.METRICS_ENABLED,
                "log_level": settings.LOG_LEVEL
            }
        }
        
        # Determine overall status
        if not docker_status["available"]:
            health_data["status"] = "degraded"
            health_data["warnings"] = ["Docker daemon not available"]
        
        return health_data
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


@router.get("/health/ready")
async def readiness_check():
    """
    Kubernetes-style readiness probe
    Returns 200 if service is ready to accept traffic
    """
    try:
        # Check critical dependencies
        docker_status = await _check_docker_status()
        
        if not docker_status["available"]:
            raise HTTPException(
                status_code=503,
                detail={
                    "ready": False,
                    "reason": "Docker daemon not available",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
        return {
            "ready": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {
                "docker": "ok"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "ready": False,
                "reason": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )


@router.get("/health/live")
async def liveness_check():
    """
    Kubernetes-style liveness probe
    Returns 200 if service is alive (simpler than readiness)
    """
    return {
        "alive": True,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


async def _check_docker_status() -> Dict[str, Any]:
    """Check Docker daemon connectivity"""
    try:
        # Import here to avoid circular imports
        from app.services.docker_service import docker_service
        
        # Try to ping Docker daemon with timeout
        is_healthy = await asyncio.wait_for(
            docker_service.health_check(),
            timeout=5.0
        )
        
        if is_healthy:
            return {
                "available": True,
                "status": "connected",
                "socket": settings.DOCKER_SOCKET
            }
        else:
            return {
                "available": False,
                "status": "connection_failed",
                "socket": settings.DOCKER_SOCKET
            }
            
    except asyncio.TimeoutError:
        return {
            "available": False,
            "status": "timeout",
            "socket": settings.DOCKER_SOCKET
        }
    except ImportError:
        return {
            "available": False,
            "status": "service_not_implemented",
            "socket": settings.DOCKER_SOCKET
        }
    except Exception as e:
        return {
            "available": False,
            "status": "error",
            "error": str(e),
            "socket": settings.DOCKER_SOCKET
        }