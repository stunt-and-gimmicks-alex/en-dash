# backend/app/routers/picows_websocket.py
"""
New WebSocket router using picows for high-performance connections.
Replaces the existing FastAPI websocket implementation.
"""

import asyncio
import logging
from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response

try:
    import picows
except ImportError:
    picows = None
    
from ..services.websocket_manager import ws_manager
from ..services.data_broadcaster import data_broadcaster

router = APIRouter()
logger = logging.getLogger(__name__)

# Check if picows is available
if not picows:
    logger.error("❌ picows is not installed. Please install with: pip install picows")
    # Fallback to FastAPI websockets for development
    from fastapi import WebSocket, WebSocketDisconnect
    USE_PICOWS = False
else:
    USE_PICOWS = True

@router.get("/ws/status")
async def websocket_status():
    """Get websocket service status"""
    return {
        "websocket_backend": "picows" if USE_PICOWS else "fastapi_fallback",
        "picows_available": picows is not None,
        "manager_stats": ws_manager.get_stats(),
        "broadcaster_stats": data_broadcaster.get_stats()
    }

if USE_PICOWS:
    # Picows implementation
    @router.api_route("/ws/unified", methods=["GET"])
    async def websocket_unified_picows(request: Request):
        """
        Picows WebSocket endpoint for unified data (system stats + docker stacks)
        This replaces the old /ws/unified-stacks endpoint
        """
        try:
            # Get client IP
            client_ip = request.client.host if request.client else "unknown"
            
            # Upgrade to websocket using picows
            ws = await picows.upgrade(
                request.scope,
                headers={"Sec-WebSocket-Protocol": "endash-v1"},
                compression=None  # Disable compression for performance
            )
            
            # Auto-subscribe to both data topics
            await ws_manager.handle_connection(ws, client_ip)
            
        except Exception as e:
            logger.error(f"Error in picows websocket endpoint: {e}")
            raise HTTPException(status_code=500, detail="WebSocket upgrade failed")

else:
    # FastAPI fallback implementation (for development)
    from fastapi import WebSocket, WebSocketDisconnect
    
    @router.websocket("/ws/unified")
    async def websocket_unified_fallback(websocket: WebSocket):
        """
        FastAPI WebSocket fallback when picows is not available
        """
        logger.warning("⚠️ Using FastAPI websocket fallback - install picows for better performance")
        
        await websocket.accept()
        client_id = f"fallback_{id(websocket)}"
        
        try:
            # Subscribe to topics manually for fallback
            async def send_data():
                while True:
                    try:
                        # Get recent system stats
                        from ..services.surreal_service import surreal_service
                        recent_stats = await surreal_service.get_system_stats(hours_back=1)
                        if recent_stats:
                            await websocket.send_json({
                                "type": "system_stats",
                                "data": recent_stats[0],
                                "trigger": "fallback_polling"
                            })
                        
                        # Get Docker stacks
                        from ..services.docker_unified import unified_stack_service
                        stacks = await unified_stack_service.get_all_unified_stacks()
                        await websocket.send_json({
                            "type": "unified_stacks", 
                            "data": {
                                "available": True,
                                "stacks": stacks,
                                "total_stacks": len(stacks)
                            },
                            "trigger": "fallback_polling"
                        })
                        
                        await asyncio.sleep(5)  # 5 second intervals
                        
                    except Exception as e:
                        logger.error(f"Error in fallback data sending: {e}")
                        break
            
            # Handle incoming messages
            async def handle_messages():
                while True:
                    try:
                        # Use timeout to prevent blocking
                        message = await asyncio.wait_for(
                            websocket.receive_json(), 
                            timeout=1.0
                        )
                        
                        # Handle basic message types
                        if message.get("type") == "ping":
                            await websocket.send_json({
                                "type": "pong",
                                "timestamp": "fallback"
                            })
                            
                    except asyncio.TimeoutError:
                        continue
                    except WebSocketDisconnect:
                        break
                    except Exception as e:
                        logger.error(f"Error handling fallback message: {e}")
                        break
            
            # Run both tasks concurrently
            await asyncio.gather(
                send_data(),
                handle_messages(),
                return_exceptions=True
            )
            
        except WebSocketDisconnect:
            logger.info(f"Fallback client {client_id} disconnected")
        except Exception as e:
            logger.error(f"Error in fallback websocket: {e}")

# Health check specifically for websockets
@router.get("/ws/health")
async def websocket_health():
    """Websocket health check"""
    try:
        stats = ws_manager.get_stats()
        broadcaster_stats = data_broadcaster.get_stats()
        
        return {
            "status": "healthy",
            "backend": "picows" if USE_PICOWS else "fastapi_fallback",
            "connections": stats["total_connections"],
            "topics": stats.get("topics", {}),
            "data_sources": {
                "live_queries": broadcaster_stats.get("live_queries", []),
                "polling_fallbacks": broadcaster_stats.get("polling_fallbacks", [])
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "backend": "picows" if USE_PICOWS else "fastapi_fallback"
        }

# Legacy compatibility endpoints (redirect to new unified endpoint)
@router.get("/ws/unified-stacks")
async def redirect_to_unified():
    """Redirect old endpoint to new unified endpoint"""
    return {
        "message": "This endpoint has been replaced by /ws/unified",
        "redirect_to": "/api/docker/ws/unified",
        "note": "Please update your frontend to use the new endpoint"
    }

# Custom message handlers for the websocket manager
async def handle_legacy_set_update_interval(client, message):
    """Handle legacy set_update_interval messages"""
    interval = message.get("interval", 5.0)
    # For now, just acknowledge - actual intervals are controlled by broadcaster
    await client.send({
        "type": "config_updated",
        "message": f"Update interval preference noted: {interval}s (controlled by server)"
    })

async def handle_subscribe_all(client, message):
    """Auto-subscribe client to all available topics"""
    topics = ["system_stats", "unified_stacks"]
    
    for topic in topics:
        client.subscriptions.add(topic)
        if topic not in ws_manager.topic_subscribers:
            ws_manager.topic_subscribers[topic] = set()
        ws_manager.topic_subscribers[topic].add(client.client_id)
    
    await client.send({
        "type": "subscribed",
        "topics": topics,
        "message": "Auto-subscribed to all data feeds"
    })

# Register custom handlers
ws_manager.register_handler("set_update_interval", handle_legacy_set_update_interval)
ws_manager.register_handler("subscribe_all", handle_subscribe_all)