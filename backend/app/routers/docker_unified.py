"""
Enhanced Docker router with unified stack processing

This replaces the need for frontend transformations and provides
fully processed stack objects with all constituent parts.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import logging
import asyncio
import subprocess

from ..services.stack_service import unified_stack_service

router = APIRouter()
logger = logging.getLogger(__name__)

# =============================================================================
# UNIFIED STACK ENDPOINTS
# =============================================================================

@router.get("/stacks/unified")
async def get_unified_stacks() -> List[Dict[str, Any]]:
    """
    Get all stacks with complete unified processing
    
    Returns fully processed stack objects with:
    - All services with container details
    - Unified networks (compose + services + containers + docker)
    - Unified volumes (compose + services + containers + docker) 
    - Container summaries with live stats
    - Health information
    - Environment and configuration details
    """
    try:
        # Get list of stack directories
        stacks_dir = unified_stack_service.stacks_directory
        if not stacks_dir.exists():
            return []
        
        unified_stacks = []
        
        for stack_path in stacks_dir.iterdir():
            if stack_path.is_dir() and not stack_path.name.startswith('.'):
                try:
                    unified_stack = await unified_stack_service.get_unified_stack(stack_path.name)
                    unified_stacks.append(unified_stack)
                except Exception as e:
                    logger.error(f"Error processing stack {stack_path.name}: {e}")
                    # Add error stack for debugging
                    unified_stacks.append({
                        "name": stack_path.name,
                        "status": "error",
                        "error": str(e),
                        "services": {},
                        "networks": {"all": []},
                        "volumes": {"all": []},
                        "containers": {"total": 0, "containers": []},
                        "stats": {"containers": {"total": 0, "running": 0, "stopped": 0}}
                    })
        
        return unified_stacks
        
    except Exception as e:
        logger.error(f"Error getting unified stacks: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving unified stacks: {str(e)}")