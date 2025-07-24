# backend/app/models/docker_models.py - Pydantic models for Docker resources

from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class Container(BaseModel):
    """Docker container model"""
    id: str
    short_id: str
    name: str
    status: str
    state: str
    image: str
    image_id: str
    created: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    ports: List[str] = []
    labels: Dict[str, str] = {}
    environment: List[str] = []
    mounts: List[Dict[str, Any]] = []
    networks: List[str] = []
    compose_project: Optional[str] = None
    compose_service: Optional[str] = None
    restart_policy: str = "no"

class Image(BaseModel):
    """Docker image model"""
    id: str
    short_id: str
    tags: List[str]
    size: int
    created: str
    labels: Dict[str, str] = {}

class Network(BaseModel):
    """Docker network model"""
    id: str
    short_id: str
    name: str
    driver: str
    scope: str
    created: str
    labels: Dict[str, str] = {}

class Volume(BaseModel):
    """Docker volume model"""
    name: str
    driver: str
    mountpoint: str
    created: str
    labels: Dict[str, str] = {}

class Stack(BaseModel):
    """Docker Compose stack model"""
    name: str
    path: str
    compose_file: str
    status: str  # running, stopped, partial
    services: List[str] = []
    containers: List[Container] = []
    last_modified: Optional[str] = None

# Request/Response models
class StackCreate(BaseModel):
    """Create new stack request"""
    name: str
    compose_content: str

class StackAction(BaseModel):
    """Stack action request"""
    action: str  # start, stop, restart, pull, down
    timeout: Optional[int] = 30

class ContainerAction(BaseModel):
    """Container action request"""
    action: str  # start, stop, restart, pause, unpause
    timeout: Optional[int] = 10

class DockerStats(BaseModel):
    """Docker system statistics"""
    containers: Dict[str, int]
    images: Dict[str, Any]
    networks: Dict[str, int]
    volumes: Dict[str, int]
    system: Dict[str, Any]