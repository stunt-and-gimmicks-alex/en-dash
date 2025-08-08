"""
Application configuration settings with proper environment support
"""

import os
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # SurrealDB Settings - UPDATED FOR WEBSOCKET  
    SURREALDB_URL: str = Field(default="ws://localhost:18000/rpc")  # CHANGED: ws:// instead of http://
    SURREALDB_USER: str = Field(default="endash_admin")
    SURREALDB_PASS: str = Field(default="Zi/QNOQanuLM5VX4PFX/bRWovkzKS203")
    SURREALDB_NS: str = Field(default="endash")
    SURREALDB_DB: str = Field(default="homelab")
    USE_SURREALDB: bool = Field(default=True)

    # Application Settings
    PROJECT_NAME: str = "En-Dash"
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    
    # Server Settings
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8001)
    
    # Security Settings
    SECRET_KEY: str = Field(default="en-dash-dev-key-change-in-production")
    ALLOWED_HOSTS: str = Field(default="localhost,127.0.0.1,0.0.0.0")
    
    # CORS Settings - Store as string, parse in property
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    )
    
    # Docker Settings
    DOCKER_SOCKET: str = Field(default="unix:///var/run/docker.sock")
    DOCKER_API_VERSION: str = Field(default="auto")
    STACKS_DIRECTORY: str = Field(default="/opt/stacks")
    
    # Database Settings (for future use)
    DATABASE_URL: str = Field(default="sqlite:///./data/en-dash.db")
    
    # Monitoring Settings
    METRICS_ENABLED: bool = Field(default=True)
    METRICS_RETENTION_HOURS: int = Field(default=24)
    
    # Logging Settings
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="text")  # json or text
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of: {allowed}")
        return v
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"Log level must be one of: {allowed}")
        return v.upper()
    
    # Properties to parse string fields into lists
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        if not self.CORS_ORIGINS:
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    @property
    def allowed_hosts_list(self) -> List[str]:
        """Parse ALLOWED_HOSTS string into list"""
        if not self.ALLOWED_HOSTS:
            return []
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",") if host.strip()]
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


# Create global settings instance
settings = Settings()