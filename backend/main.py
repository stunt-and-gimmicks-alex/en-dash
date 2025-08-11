# backend/main.py
"""
En-Dash Home Server Management API - Updated with Picows WebSocket Support

A FastAPI-based backend with high-performance websockets for real-time data streaming.
"""

import os
import uvicorn
import logging
import signal
import asyncio
import sys

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

# Import NEW picows websocket router
from app.routers import picows_websocket

# Import services
from app.services.background_collector import background_collector
from app.services.surreal_service import surreal_service

# Import NEW services
from app.services.websocket_manager import ws_manager
from app.services.data_broadcaster import data_broadcaster

# Simplified configuration
class Settings:
    """Settings for the En-Dash API server"""
    PROJECT_NAME = "En-Dash"
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8001"))
    
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
    
    # NEW: WebSocket settings
    WEBSOCKET_BACKEND = os.getenv("WEBSOCKET_BACKEND", "picows")  # "picows" or "fastapi"
    WEBSOCKET_COMPRESSION = os.getenv("WEBSOCKET_COMPRESSION", "false").lower() == "true"
    USE_BINARY_FRAMES = os.getenv("USE_BINARY_FRAMES", "true").lower() == "true"

settings = Settings()

# Setup logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="En-Dash API",
    description="Home Server Management Platform API with High-Performance WebSockets",
    version="2.0.0",  # Updated version with picows support
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "path": str(request.url.path)
        }
    )

# Include existing routers
app.include_router(docker.router, prefix="/api/docker", tags=["docker"])
app.include_router(docker_unified.router, prefix="/api/docker", tags=["docker-unified"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Include NEW picows websocket router
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
            "websocket_backend": settings.WEBSOCKET_BACKEND,
            "active_connections": websocket_stats.get("total_connections", 0),
            "data_broadcasters": broadcaster_stats.get("running", False),
            "features": {
                "picows_available": True,  # Will be checked during startup
                "uvloop_installed": "uvloop" in sys.modules,
                "binary_frames": settings.USE_BINARY_FRAMES,
                "compression_disabled": not settings.WEBSOCKET_COMPRESSION
            }
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "en-dash-api",
            "version": "2.0.0",
            "error": str(e)
        }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "en-dash-api",
        "version": "2.0.0",
        "status": "operational",
        "websocket_backend": settings.WEBSOCKET_BACKEND,
        "endpoints": {
            "health": "/api/health",
            "docker": "/api/docker",
            "system": "/api/system",
            "websockets": "/api/docker/ws/unified",
            "websocket_status": "/api/docker/ws/status",
            "docs": "/api/docs" if settings.DEBUG else None,
        }
    }

# Static file serving
static_dir = Path("static")
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Enhanced startup event
@app.on_event("startup")
async def startup_event():
    """Start all services including new websocket services"""
    try:
        logger.info("🚀 Starting En-Dash API v2.0.0 with enhanced websockets...")
        
        # Start background data collection (keeps existing functionality)
        await background_collector.start()
        logger.info("✅ Background data collection started")
        
        # Start NEW websocket manager
        await ws_manager.start()
        logger.info("✅ WebSocket manager started")
        
        # Start NEW data broadcaster (replaces old websocket broadcasting)
        await data_broadcaster.start()
        logger.info("✅ Data broadcaster started")
        
        # Check picows availability
        try:
            import picows
            logger.info("✅ picows is available for high-performance websockets")
        except ImportError:
            logger.warning("⚠️ picows not available - using FastAPI websocket fallback")
        
        logger.info("🎉 En-Dash API started successfully with separated websocket architecture")
        
    except Exception as e:
        logger.error(f"❌ Failed to start services: {e}")
        raise

# Enhanced shutdown event  
@app.on_event("shutdown")
async def shutdown_event():
    """Stop all services gracefully"""
    logger.info("🛑 Shutting down En-Dash API v2.0.0...")
    
    try:
        # Stop NEW services first
        await data_broadcaster.stop()
        logger.info("✅ Data broadcaster stopped")
        
        await ws_manager.stop()
        logger.info("✅ WebSocket manager stopped")
        
        # Stop existing services
        await background_collector.stop()
        logger.info("✅ Background collector stopped")
        
        # Disconnect from SurrealDB
        await surreal_service.disconnect()
        logger.info("✅ SurrealDB disconnected")
        
        logger.info("🎉 En-Dash API stopped gracefully")
        
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

# Signal handlers for graceful shutdown
def handle_sigint(signum, frame):
    """Handle SIGINT (Ctrl+C) gracefully"""
    logger.info("🛑 SIGINT received, initiating graceful shutdown...")
    # Let FastAPI handle the shutdown

def handle_sigterm(signum, frame):
    """Handle SIGTERM gracefully"""
    logger.info("🛑 SIGTERM received, initiating graceful shutdown...")
    # Let FastAPI handle the shutdown

# Register signal handlers
signal.signal(signal.SIGINT, handle_sigint)
signal.signal(signal.SIGTERM, handle_sigterm)

# Development server entry point
if __name__ == "__main__":
    logger.info("🚀 Starting En-Dash API server v2.0.0...")
    try:
        # Use uvloop if available for better performance
        loop_policy = None
        try:
            import uvloop
            loop_policy = uvloop.EventLoopPolicy()
            logger.info("🔄 Using uvloop for enhanced async performance")
        except ImportError:
            logger.info("🔄 Using default asyncio event loop")
        
        uvicorn.run(
            "main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level="debug" if settings.DEBUG else "info",
            loop="uvloop" if "uvloop" in sys.modules else "asyncio",
            ws_ping_interval=20,  # Websocket ping interval
            ws_ping_timeout=10,   # Websocket ping timeout
        )
    except KeyboardInterrupt:
        logger.info("🛑 Keyboard interrupt received")
    except Exception as e:
        logger.error(f"❌ Server error: {e}")
    finally:
        logger.info("✅ Server shutdown complete")