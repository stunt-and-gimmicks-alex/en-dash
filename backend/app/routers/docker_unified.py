# backend/app/routers/docker_unified.py
"""
Docker router with SEPARATED websocket and data concerns.
WebSocket handling moved to picows_websocket.py
This router now focuses ONLY on REST endpoints and data processing.
"""

import asyncio
import json
import logging
import subprocess
from typing import Dict, Any
from datetime import datetime, timezone
from pathlib import Path
import yaml

from fastapi import APIRouter, HTTPException, BackgroundTasks
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

# =============================================================================
# STACK MANAGEMENT ENDPOINTS (REST ONLY - NO WEBSOCKETS)
# =============================================================================

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

async def _execute_stack_command(stack_name: str, command: str, action: str):
    """Execute Docker Compose command for a stack"""
    try:
        stacks_dir = Path(settings.STACKS_DIRECTORY)
        stack_path = stacks_dir / stack_name
        
        if not stack_path.exists():
            raise HTTPException(
                status_code=404, 
                detail=f"Stack '{stack_name}' not found in {stacks_dir}"
            )
        
        compose_file = stack_path / "docker-compose.yml"
        if not compose_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"docker-compose.yml not found for stack '{stack_name}'"
            )
        
        # Execute docker-compose command
        cmd = f"docker-compose -f {compose_file} {command}"
        logger.info(f"Executing: {cmd}")
        
        result = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=stack_path
        )
        
        stdout, stderr = await asyncio.wait_for(result.communicate(), timeout=120)
        
        if result.returncode == 0:
            logger.info(f"✅ Stack {stack_name} {action} successfully")
            
            # Force immediate data update through data broadcaster
            from ..services.data_broadcaster import data_broadcaster
            await data_broadcaster.force_update_docker_stacks()
            
            return {
                "success": True,
                "message": f"Stack {stack_name} {action} successfully",
                "stack_name": stack_name,
                "action": action,
                "output": stdout.decode() if stdout else None
            }
        else:
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"❌ Failed to {action} stack {stack_name}: {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to {action} stack: {error_msg}"
            )
            
    except asyncio.TimeoutError:
        logger.error(f"❌ Timeout while trying to {action} stack {stack_name}")
        raise HTTPException(
            status_code=408, 
            detail=f"Stack {action} operation timed out"
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to {action} stack {stack_name}: {e.stderr}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to {action} stack: {e.stderr}"
        )
    except Exception as e:
        logger.error(f"Unexpected error {action} stack {stack_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

# =============================================================================
# DATA ENDPOINTS (REST ONLY - NO WEBSOCKETS)
# =============================================================================

@router.get("/unified-stacks")
async def get_unified_stacks():
    """Get unified stacks data via REST (fallback/testing endpoint)"""
    try:
        logger.info("REST: Getting unified stacks data...")
        
        # Try SurrealDB first for speed
        stacks_from_db = await surreal_service.get_unified_stacks()
        
        if stacks_from_db:
            return {
                "success": True,
                "data": {
                    "available": True,
                    "stacks": stacks_from_db,
                    "total_stacks": len(stacks_from_db),
                    "source": "surrealdb"
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            # Fallback to comprehensive discovery
            unified_stacks = await unified_stack_service.get_all_unified_stacks()
            return {
                "success": True,
                "data": {
                    "available": True,
                    "stacks": unified_stacks,
                    "total_stacks": len(unified_stacks),
                    "source": "comprehensive"
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
    except Exception as e:
        logger.error(f"❌ Error getting unified stacks via REST: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "available": False,
                "stacks": [],
                "source": "error"
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@router.get("/unified-stacks/health")
async def unified_stacks_health():
    """Health check for unified stacks processing"""
    try:
        # Test if unified stack service is working
        stacks_dir = unified_stack_service.stacks_directory
        
        # Test data broadcaster status
        from ..services.data_broadcaster import data_broadcaster
        broadcaster_stats = data_broadcaster.get_stats()
        
        return {
            "status": "healthy",
            "docker_available": docker_client is not None,
            "stacks_directory": str(stacks_dir),
            "stacks_directory_exists": stacks_dir.exists(),
            "data_broadcaster_running": broadcaster_stats.get("running", False),
            "live_queries_active": broadcaster_stats.get("live_queries", []),
            "note": "WebSocket connections moved to /ws/unified endpoint"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "docker_available": docker_client is not None,
            "note": "WebSocket connections moved to /ws/unified endpoint"
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
            "data": unified_stacks,
            "note": "Real-time data available via /ws/unified WebSocket endpoint"
        }
        
    except Exception as e:
        logger.error(f"Debug endpoint failed: {e}")
        return {
            "debug": True,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "discovery_method": "comprehensive_failed"
        }

# =============================================================================
# LEGACY WEBSOCKET REDIRECT (COMPATIBILITY)
# =============================================================================

@router.get("/ws/unified-stacks")
async def redirect_legacy_websocket():
    """Redirect old websocket endpoint to new implementation"""
    return {
        "message": "WebSocket endpoint has been moved and improved",
        "old_endpoint": "/api/docker/ws/unified",
        "new_endpoint": "/api/docker/ws/unified",
        "improvements": [
            "High-performance picows implementation",
            "Binary frames with orjson",
            "Better connection management",
            "Separated data and networking layers"
        ],
        "migration_note": "Update your frontend to use the new endpoint for better performance"
    }

# =============================================================================
# REMOVED: UnifiedStackConnectionManager
# WebSocket functionality moved to:
# - app/services/websocket_manager.py (connection management)
# - app/services/data_broadcaster.py (data broadcasting)  
# - app/routers/picows_websocket.py (websocket endpoints)
# =============================================================================

# REMOVED: All WebSocket-related classes and endpoints
# This router now focuses ONLY on:
# 1. REST endpoints for stack management
# 2. Data processing and retrieval
# 3. Health/debug endpoints