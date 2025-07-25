# backend/app/core/config.py - Fixed CORS configuration
"""Application configuration settings"""

from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "En-Dash"
    
    # CORS Settings - FIXED for development
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",        # Local development
        "http://192.168.1.69:5173",     # Server frontend
        "http://YOUR_DESKTOP_IP:5173",  # Your work desktop
        "http://127.0.0.1:5173",        # IPv4 localhost
        # ... other origins
    ]
    
    # For development, allow all origins (remove in production!)
    ALLOW_ALL_ORIGINS: bool = True
    
    # Docker Settings
    DOCKER_SOCKET: str = "unix://var/run/docker.sock"
    DOCKER_HOST: str = "unix://var/run/docker.sock"
    STACKS_DIRECTORY: str = "/opt/stacks"
    
    # Security (generate proper secrets in production)
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        case_sensitive = True

settings = Settings()