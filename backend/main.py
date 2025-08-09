"""
En-Dash Home Server Management API

A FastAPI-based backend for comprehensive home server management.
Provides endpoints for Docker management, system monitoring, and more.
"""

import os
import uvicorn
import logging
import signal
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Import your existing working routers
from app.routers import docker, system, auth
from app.routers import docker_unified
from app.services.background_collector import background_collector
from app.services.surreal_service import surreal_service

# Simplified configuration
class Settings:
    """Simplified settings class to get server running"""
    PROJECT_NAME = "En-Dash"
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8001"))
    
    # CORS origins as list
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

# Setup basic logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="En-Dash API",
    description="Home Server Management Platform API",
    version="1.0.0",
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

# Include your existing working routers (CLEANED UP - NO LEGACY WEBSOCKET)
app.include_router(docker.router, prefix="/api/docker", tags=["docker"])
app.include_router(docker_unified.router, prefix="/api/docker", tags=["docker-unified"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Basic health endpoint
@app.get("/api/health")
async def health_check():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "service": "en-dash-api",
        "version": "1.0.0",
        "debug": settings.DEBUG
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "en-dash-api",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/api/health",
            "docker": "/api/docker",
            "system": "/api/system",
            "docs": "/api/docs" if settings.DEBUG else None,
        }
    }

# Static file serving
static_dir = Path("static")
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Start background services"""
    try:
        await background_collector.start()
        logger.info("🚀 En-Dash API started with background SurrealDB collection")
    except Exception as e:
        logger.error(f"❌ Failed to start background services: {e}")

@app.on_event("shutdown") 
async def shutdown_event():
    """Stop background services gracefully"""
    logger.info("🛑 Shutting down En-Dash API...")
    
    try:
        # Stop background collector first
        await background_collector.stop()
        
        # Disconnect from SurrealDB
        await surreal_service.disconnect()
        
        logger.info("✅ En-Dash API stopped gracefully")
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
    logger.info("🚀 Starting En-Dash API server...")
    try:
        uvicorn.run(
            "main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level="debug" if settings.DEBUG else "info",
        )
    except KeyboardInterrupt:
        logger.info("🛑 Keyboard interrupt received")
    except Exception as e:
        logger.error(f"❌ Server error: {e}")
    finally:
        logger.info("✅ Server shutdown complete")