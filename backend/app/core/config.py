"""Application configuration settings"""

from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "En-Dash"
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080",  # Alternative dev port
        "http://localhost:8001",  # Our backend for self-requests
    ]
    
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
