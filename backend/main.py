# backend/main.py - Fixed CORS configuration
"""
En-Dash Home Server Management API

A FastAPI-based backend for comprehensive home server management.
Provides endpoints for Docker management, system monitoring, and more.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.routers import docker, system, auth
from app.core.config import settings

# Create FastAPI application
app = FastAPI(
    title="En-Dash API",
    description="Home Server Management Platform API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware for frontend communication - FIXED
if settings.ALLOW_ALL_ORIGINS:
    # Development mode - allow all origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in development
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Production mode - use specific origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API routers
app.include_router(docker.router, prefix="/api/docker", tags=["docker"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Serve static files
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception:
    # Directory doesn't exist yet, that's okay
    pass

@app.get("/api/health")
async def health_check():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "service": "en-dash-api", 
        "version": "1.0.0",
        "cors_enabled": True,
        "allowed_origins": settings.ALLOWED_ORIGINS if not settings.ALLOW_ALL_ORIGINS else ["*"]
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "En-Dash Home Server Management API",
        "docs": "/api/docs",
        "health": "/api/health",
        "cors_status": "enabled"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )