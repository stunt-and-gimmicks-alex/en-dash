# backend/app/models/system_models.py - Pydantic models for system resources

from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class NetworkInterface(BaseModel):
    """Network interface information"""
    name: str
    ip_addresses: List[str]
    is_up: bool
    speed: int
    mtu: int

class DiskUsage(BaseModel):
    """Disk usage information"""
    device: str
    mountpoint: str
    fstype: str
    total: int
    used: int
    free: int
    percent: float

class SystemStats(BaseModel):
    """Comprehensive system statistics"""
    cpu: Dict[str, Any]
    memory: Dict[str, Any]  # Changed from int to Any to handle floats
    swap: Dict[str, Any]    # Changed from int to Any to handle floats
    disk: List[DiskUsage]
    network: Dict[str, Any]
    uptime: int
    boot_time: str
    timestamp: str

class SystemInfo(BaseModel):
    """Basic system information"""
    hostname: str
    system: str
    release: str
    version: str
    machine: str
    processor: str
    python_version: str
    cpu_count: int
    memory_total: int
    disk_total: int

class Process(BaseModel):
    """Process information"""
    pid: int
    name: str
    cpu_percent: float
    memory_percent: float
    memory_mb: float
    status: str
    username: str
    command: str
    created: str

class Service(BaseModel):
    """Systemd service information"""
    name: str
    load_state: str
    active_state: str
    sub_state: str
    description: str

class FileSystemItem(BaseModel):
    """File system item (file or directory)"""
    name: str
    path: str
    type: str  # file, directory, symlink, other
    size: int
    modified: str
    permissions: str
    owner_uid: int
    group_gid: int

class ServiceAction(BaseModel):
    """Service action request"""
    action: str  # start, stop, restart, enable, disable
    
class ProcessAction(BaseModel):
    """Process action request"""
    signal: int = 15  # SIGTERM by default