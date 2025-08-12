# backend/main.py
"""
En-Dash Home Server Management API - With Native Picows WebSocket Server

A FastAPI-based backend with high-performance picows websockets for real-time data streaming.
The FastAPI server runs on port 8001, picows WebSocket server runs on port 8002.
"""

import os
import uvicorn
import logging
import signal
import asyncio
import sys
from contextlib import asynccontextmanager

# Try to use uvloop for better performance
try:
    import uvloop
    uvloop.install()
    logging.info("🚀 uvloop installed for better async performance")
except ImportError:
    logging.info("⚠️ uvloop not available, using default asyncio event loop")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Import existing working routers
from app.routers import docker, system, auth
from app.routers import docker_unified

# Import NEW picows websocket router (REST endpoints only)
from app.routers import picows_websocket

# Import services
from app.services.background_collector import background_collector
from app.services.surreal_service import surreal_service

# Import NEW picows services
from app.services.websocket_manager import ws_manager
from app.services.data_broadcaster import data_broadcaster

print("🔍 DEBUG: Main.py loaded, about to define Settings...")

# Configuration
class Settings:
    """Settings for the En-Dash API server"""
    PROJECT_NAME = "En-Dash"
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    
    # FastAPI server settings
    FASTAPI_HOST = os.getenv("FASTAPI_HOST", "0.0.0.0")
    FASTAPI_PORT = int(os.getenv("FASTAPI_PORT", "8001"))
    
    # Picows WebSocket server settings
    WEBSOCKET_HOST = os.getenv("WEBSOCKET_HOST", "0.0.0.0")
    WEBSOCKET_PORT = int(os.getenv("WEBSOCKET_PORT", "8002"))
    
    # CORS origins
    CORS_ORIGINS = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://192.168.1.69:5173",  # Your actual frontend URL
        "http://192.168.1.69:3000",  # Alternative port
    ]
    
    # Docker settings
    DOCKER_SOCKET = "unix:///var/run/docker.sock"
    STACKS_DIRECTORY = "/opt/stacks"
    
    # Security
    SECRET_KEY = "en-dash-dev-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

settings = Settings()

# Setup logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    
    # STARTUP
    logger.info("🚀 Starting En-Dash API v2.0.0 with native picows websockets...")
    
    try:
        # 1. Connect to SurrealDB FIRST
        logger.info("🔗 Connecting to SurrealDB...")
        try:
            await surreal_service.connect()
            logger.info("✅ SurrealDB connected successfully")
        except Exception as e:
            logger.error(f"❌ SurrealDB connection failed: {e}")
            logger.warning("⚠️ Continuing without SurrealDB - some features may be limited")
        
        # 2. Start background data collection
        await background_collector.start()
        logger.info("✅ Background data collection started")
        
        # 3. Configure and start picows WebSocket server
        ws_manager.host = settings.WEBSOCKET_HOST
        ws_manager.port = settings.WEBSOCKET_PORT
        
        await ws_manager.start()
        logger.info(f"✅ Picows WebSocket server started on {settings.WEBSOCKET_HOST}:{settings.WEBSOCKET_PORT}")
        
        # 4. Start data broadcaster (connects to websocket manager)
        await data_broadcaster.start()
        logger.info("✅ Data broadcaster started")
        
        # 5. Check picows availability
        try:
            import picows
            logger.info("✅ picows is available for high-performance websockets")
        except ImportError:
            logger.error("❌ picows not available - install with: pip install picows")
        
        logger.info("🎉 En-Dash API started successfully!")
        logger.info(f"📡 FastAPI server: http://{settings.FASTAPI_HOST}:{settings.FASTAPI_PORT}")
        logger.info(f"🔌 WebSocket server: ws://{settings.WEBSOCKET_HOST}:{settings.WEBSOCKET_PORT}/")
        
        # Application is ready
        yield
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    
    finally:
        # SHUTDOWN
        logger.info("🛑 Shutting down En-Dash API...")
        
        # Stop services in reverse order
        try:
            await data_broadcaster.stop()
            logger.info("✅ Data broadcaster stopped")
        except Exception as e:
            logger.error(f"Error stopping data broadcaster: {e}")
        
        try:
            await ws_manager.stop()
            logger.info("✅ Picows WebSocket server stopped")
        except Exception as e:
            logger.error(f"Error stopping WebSocket server: {e}")
        
        try:
            await background_collector.stop()
            logger.info("✅ Background collector stopped")
        except Exception as e:
            logger.error(f"Error stopping background collector: {e}")
        
        try:
            await surreal_service.disconnect()
            logger.info("✅ SurrealDB disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting SurrealDB: {e}")
        
        logger.info("🏁 En-Dash API shutdown complete")

print("🔍 DEBUG: Lifespan function defined")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="En-Dash Home Server Management API with Picows WebSockets",
    version="2.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan
)

print("🔍 DEBUG: FastAPI app created with lifespan")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(docker.router, prefix="/api/docker", tags=["docker"])
app.include_router(docker_unified.router, prefix="/api/docker", tags=["docker-unified"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Include picows websocket management router (REST endpoints only)
app.include_router(picows_websocket.router, prefix="/api/docker", tags=["websockets"])

# Enhanced health endpoint
@app.get("/api/health")
async def health_check():
    """Enhanced API health check endpoint"""
    try:
        websocket_stats = ws_manager.get_stats()
        broadcaster_stats = data_broadcaster.get_stats()
        
        return {
            "status": "healthy",
            "service": "en-dash-api",
            "version": "2.0.0",
            "debug": settings.DEBUG,
            "servers": {
                "fastapi": {
                    "host": settings.FASTAPI_HOST,
                    "port": settings.FASTAPI_PORT,
                    "url": f"http://{settings.FASTAPI_HOST}:{settings.FASTAPI_PORT}"
                },
                "websocket": {
                    "backend": "picows",
                    "host": settings.WEBSOCKET_HOST,
                    "port": settings.WEBSOCKET_PORT,
                    "url": f"ws://{settings.WEBSOCKET_HOST}:{settings.WEBSOCKET_PORT}/",
                    "running": websocket_stats.get("running", False),
                    "available": websocket_stats.get("available", False)
                }
            },
            "connections": {
                "active_websockets": websocket_stats.get("total_connections", 0),
                "active_clients": websocket_stats.get("active_clients", 0),
                "topics": websocket_stats.get("topics", {})
            },
            "data_broadcasting": {
                "running": broadcaster_stats.get("running", False),
                "live_queries": broadcaster_stats.get("live_queries", []),
                "polling_fallbacks": broadcaster_stats.get("polling_fallbacks", []),
                "surrealdb_connected": broadcaster_stats.get("surrealdb_connected", False)
            },
            "features": {
                "picows_available": websocket_stats.get("available", False),
                "uvloop_installed": "uvloop" in sys.modules,
                "binary_frames": True,
                "orjson_serialization": True,
                "auto_ping": True
            },
            "timestamp": "2025-08-11T00:00:00Z"  # Will be updated at runtime
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "en-dash-api",
            "version": "2.0.0",
            "error": str(e),
            "timestamp": "2025-08-11T00:00:00Z"
        }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    websocket_stats = ws_manager.get_stats()
    
    return {
        "service": "en-dash-api",
        "version": "2.0.0",
        "status": "operational",
        "servers": {
            "api": f"http://{settings.FASTAPI_HOST}:{settings.FASTAPI_PORT}",
            "websocket": f"ws://{settings.WEBSOCKET_HOST}:{settings.WEBSOCKET_PORT}/"
        },
        "endpoints": {
            "health": "/api/health",
            "docker": "/api/docker",
            "system": "/api/system",
            "auth": "/api/auth",
            "websocket_status": "/api/docker/ws/status",
            "websocket_info": "/api/docker/ws/info"
        },
        "websocket": {
            "backend": "picows",
            "available": websocket_stats.get("available", False),
            "running": websocket_stats.get("running", False),
            "connected_clients": websocket_stats.get("total_connections", 0)
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        }
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An error occurred",
            "timestamp": "2025-08-11T00:00:00Z"
        }
    )

# DEBUG ENDPOINTS!

@app.post("/debug/force-startup")
async def force_startup():
    """Manually trigger startup sequence for debugging"""
    results = []
    
    try:
        logger.info("🔍 Manual startup triggered...")
        results.append("startup_triggered")
        
        logger.info("🔍 Step 1: Connecting to SurrealDB...")
        await surreal_service.connect()
        results.append("surreal_connected")
        logger.info("✅ SurrealDB connected")
        
        logger.info("🔍 Step 2: Starting background collector...")
        await background_collector.start()
        results.append("background_collector_started")
        logger.info("✅ Background collector started")
        
        logger.info("🔍 Step 3: Starting WebSocket manager...")
        ws_manager.host = settings.WEBSOCKET_HOST
        ws_manager.port = settings.WEBSOCKET_PORT
        await ws_manager.start()
        results.append("websocket_manager_started")
        logger.info("✅ WebSocket manager started")
        
        logger.info("🔍 Step 4: Starting data broadcaster...")
        await data_broadcaster.start()
        results.append("data_broadcaster_started")
        logger.info("✅ Data broadcaster started")
        
        return {"status": "completed", "steps": results}
        
    except Exception as e:
        logger.error(f"❌ Error in manual startup: {e}", exc_info=True)
        return {"error": str(e), "completed_steps": results}

@app.get("/debug/broadcaster-debug")
async def broadcaster_debug():
    """Debug the data broadcaster live queries"""
    try:
        # Force a system stats update to see if it goes through
        await data_broadcaster.force_update_system_stats()
        
        # Get detailed broadcaster stats
        stats = data_broadcaster.get_stats()
        
        # Also check what's in the cache
        cached = await data_broadcaster.get_cached_data()
        
        return {
            "broadcaster_stats": stats,
            "cached_data": cached,
            "manual_update_triggered": True
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/debug/write-system-stats")
async def write_system_stats():
    """Write system stats to SurrealDB to trigger live query"""
    try:
        import psutil
        from datetime import datetime
        
        # Get fresh system stats
        stats_data = {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "source": "manual_write"
        }
        
        # Write to SurrealDB to trigger live query
        result = await surreal_service.db.create("system_stats", stats_data)
        
        return {
            "written_to_db": stats_data,
            "db_result": result,
            "note": "This should trigger the live query"
        }
    except Exception as e:
        return {"error": str(e)}

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    # The lifespan context manager will handle the actual cleanup

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Run the server
if __name__ == "__main__":
    try:
        logger.info("🔥 Starting En-Dash API server...")
        uvicorn.run(
            "main:app",
            host=settings.FASTAPI_HOST,
            port=settings.FASTAPI_PORT,
            reload=settings.DEBUG,
            access_log=settings.DEBUG,
            log_level="debug" if settings.DEBUG else "info",
            # Performance optimizations
            loop="uvloop",
            workers=1,  # Single worker for WebSocket state consistency
            timeout_keep_alive=30,
            timeout_graceful_shutdown=30
        )
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        sys.exit(1)