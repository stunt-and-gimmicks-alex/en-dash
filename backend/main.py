"""
En-Dash Home Server Management API

A FastAPI-based backend for comprehensive home server management.
Provides endpoints for Docker management, system monitoring, and more.
"""

import os
import uvicorn
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Import your existing working routers
from app.routers import docker, system, auth
# Import new WebSocket routers
from app.routers import websocket_system, websocket_docker

# Simplified configuration - just fix the immediate issue
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

# CORS Middleware - fixed and simplified
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

# Include your existing working routers
app.include_router(docker.router, prefix="/api/docker", tags=["docker"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Include new WebSocket routers
app.include_router(websocket_system.router, prefix="/api", tags=["websocket-system"])
app.include_router(websocket_docker.router, prefix="/api", tags=["websocket-docker"])

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

# Development server entry point
if __name__ == "__main__":
    logger.info("🚀 Starting En-Dash API server...")
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )