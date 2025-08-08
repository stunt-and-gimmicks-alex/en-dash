# backend/app/routers/docker.py - Docker management endpoints

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
import docker
import subprocess
import os
from pathlib import Path
import yaml
import json
from datetime import datetime

from ..core.config import settings
from ..models.docker_models import (
    Container, Image, Network, Volume, Stack, 
    StackCreate, StackAction, ContainerAction
)

router = APIRouter()

# Initialize Docker client
try:
    docker_client = docker.from_env()
except Exception as e:
    print(f"Warning: Could not connect to Docker daemon: {e}")
    docker_client = None

@router.get("/health")
async def docker_health():
    """Check Docker daemon connectivity"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        docker_client.ping()
        info = docker_client.info()
        return {
            "status": "healthy",
            "version": docker_client.version(),
            "containers_running": info.get("ContainersRunning", 0),
            "containers_total": info.get("Containers", 0),
            "images": info.get("Images", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Docker daemon error: {str(e)}")

# =============================================================================
# CONTAINER MANAGEMENT
# =============================================================================

@router.get("/containers", response_model=List[Container])
async def get_containers(all: bool = True):
    """Get all Docker containers with detailed information"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        return await _get_all_containers_with_details()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving containers: {str(e)}")

@router.post("/containers/{container_id}/start")
async def start_container(container_id: str):
    """Start a specific container"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        container = docker_client.containers.get(container_id)
        container.start()
        return {"message": f"Container {container.name} started successfully"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting container: {str(e)}")

@router.post("/containers/{container_id}/stop")
async def stop_container(container_id: str, timeout: int = 10):
    """Stop a specific container"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        container = docker_client.containers.get(container_id)
        container.stop(timeout=timeout)
        return {"message": f"Container {container.name} stopped successfully"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping container: {str(e)}")

@router.post("/containers/{container_id}/restart")
async def restart_container(container_id: str, timeout: int = 10):
    """Restart a specific container"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        container = docker_client.containers.get(container_id)
        container.restart(timeout=timeout)
        return {"message": f"Container {container.name} restarted successfully"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error restarting container: {str(e)}")

@router.get("/containers/{container_id}/logs")
async def get_container_logs(container_id: str, tail: int = 100, follow: bool = False):
    """Get container logs"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        container = docker_client.containers.get(container_id)
        logs = container.logs(tail=tail, timestamps=True).decode('utf-8')
        return {"logs": logs.split('\n')}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")

async def _get_all_containers_with_details():
    """Internal function to get all containers with full details (ports, etc.)"""
    if not docker_client:
        return []
    
    containers = []
    for container in docker_client.containers.list(all=True):
        # Extract ports from Docker API
        ports = []
        if 'Ports' in container.attrs:
            for port_info in container.attrs['Ports']:
                if 'PublicPort' in port_info and 'PrivatePort' in port_info:
                    ports.append(f"{port_info['PublicPort']}:{port_info['PrivatePort']}")
                elif 'PrivatePort' in port_info:
                    ports.append(str(port_info['PrivatePort']))

        # Fallback to NetworkSettings.Ports
        if not ports and 'NetworkSettings' in container.attrs:
            network_ports = container.attrs['NetworkSettings']['Ports']
            for internal_port, external_bindings in network_ports.items():
                if external_bindings:
                    for binding in external_bindings:
                        ports.append(f"{binding['HostPort']}:{internal_port.split('/')[0]}")
                else:
                    ports.append(internal_port.split('/')[0])
        
        # Get network information
        networks = {}
        if container.attrs.get('NetworkSettings', {}).get('Networks'):
            networks = container.attrs['NetworkSettings']['Networks']
        
        # Get mounts
        mounts = []
        if 'Mounts' in container.attrs:
            mounts = [
                {
                    "source": mount.get('Source', ''),
                    "destination": mount.get('Destination', ''),
                    "type": mount.get('Type', ''),
                    "mode": mount.get('Mode', '')
                }
                for mount in container.attrs['Mounts']
            ]
        
        containers.append(Container(
            id=container.id,
            short_id=container.short_id,
            name=container.name,
            status=container.status,
            state=container.attrs['State']['Status'],
            image=container.image.tags[0] if container.image.tags else container.image.id,
            image_id=container.image.id,
            created=container.attrs['Created'],
            started_at=container.attrs['State'].get('StartedAt'),
            finished_at=container.attrs['State'].get('FinishedAt'),
            ports=ports,
            labels=container.labels or {},
            environment=container.attrs['Config'].get('Env', []),
            mounts=mounts,
            networks=list(networks.keys()),
            compose_project=container.labels.get('com.docker.compose.project'),
            compose_service=container.labels.get('com.docker.compose.service'),
            restart_policy=container.attrs['HostConfig'].get('RestartPolicy', {}).get('Name', 'no')
        ))
    
    return containers
# =============================================================================
# DOCKER COMPOSE STACK MANAGEMENT
# =============================================================================

@router.get("/stacks", response_model=List[Stack])
async def get_stacks():
    """Get all Docker Compose stacks from /opt/stacks AND external compose projects"""
    stacks_dir = Path(settings.STACKS_DIRECTORY)
    stacks = []
    
    if not stacks_dir.exists(): 
        stacks_dir.mkdir(parents=True, exist_ok=True) 
    
    try:
        # Get all containers with full details ONCE
        all_containers = await _get_all_containers_with_details()
        
        # Convert to dict for easy lookup by project
        containers_by_project = {}
        orphan_containers = []
        
        for container in all_containers:
            if container.compose_project:
                if container.compose_project not in containers_by_project:
                    containers_by_project[container.compose_project] = []
                containers_by_project[container.compose_project].append(container)
            else:
                orphan_containers.append(container)
        
        # Process stacks from /opt/stacks directory
        processed_projects = set()
        
        for stack_path in stacks_dir.iterdir():
            if not stack_path.is_dir():
                continue
                
            # Find compose file
            compose_files = ['docker-compose.yml', 'compose.yaml', 'docker-compose.yaml', 'compose.yml']
            compose_file = None
            compose_path = None
            for filename in compose_files:
                potential_path = stack_path / filename
                if potential_path.exists():
                    compose_file = filename
                    compose_path = potential_path
                    break
            
            if not compose_file or not compose_path:
                continue
            
            project_name = stack_path.name
            processed_projects.add(project_name)
            
            # Get containers for this stack (already with ports!)
            stack_containers = containers_by_project.get(project_name, [])
            running_containers = [c for c in stack_containers if c.status == 'running']
            
            # Determine stack status
            if len(stack_containers) == 0:
                status = "stopped"
            elif len(running_containers) == len(stack_containers):
                status = "running"
            elif len(running_containers) > 0:
                status = "partial"
            else:
                status = "stopped"
            
            # Read compose file content
            services = []
            compose_content = None
            try:
                with open(compose_path, 'r') as f:
                    compose_content = f.read()
                    compose_data = yaml.safe_load(compose_content)
                    if compose_data and 'services' in compose_data:
                        services = list(compose_data['services'].keys())
            except Exception as e:
                print(f"Error reading compose file {compose_path}: {e}")
            
            stacks.append(Stack(
                name=project_name,
                path=str(stack_path),
                compose_file=compose_file,
                compose_content=compose_content,
                status=status,
                services=services,
                containers=stack_containers,  # Already fully populated!
                last_modified=datetime.fromtimestamp(stack_path.stat().st_mtime).isoformat()
            ))
        
        # Process external compose projects
        for project_name, project_containers in containers_by_project.items():
            if project_name in processed_projects:
                continue  # Already processed from /opt/stacks
            
            running_containers = [c for c in project_containers if c.status == 'running']
            
            # Determine status
            if len(running_containers) == len(project_containers):
                status = "running"
            elif len(running_containers) > 0:
                status = "partial"
            else:
                status = "stopped"
            
            # Try to read external compose file
            compose_content = None
            compose_file_path = ""
            working_dir = ""
            
            if project_containers:
                labels = project_containers[0].labels
                compose_file_path = labels.get('com.docker.compose.project.config_files', '')
                working_dir = labels.get('com.docker.compose.project.working_dir', '')
                
                if compose_file_path and Path(compose_file_path).exists():
                    try:
                        with open(compose_file_path, 'r') as f:
                            compose_content = f.read()
                    except Exception as e:
                        print(f"Error reading external compose file {compose_file_path}: {e}")
            
            services = list(set(c.compose_service for c in project_containers if c.compose_service))
            
            stacks.append(Stack(
                name=f"[External] {project_name}",
                path=working_dir or "external",
                compose_file=compose_file_path.split('/')[-1] if compose_file_path else "external",
                compose_content=compose_content,
                status=status,
                services=services,
                containers=project_containers,  # Already fully populated!
                last_modified=project_containers[0].created if project_containers else datetime.now().isoformat()
            ))
        
        # Process orphan containers
        for container in orphan_containers:
            orphan_stack = Stack(
                name=f"_Orphan.{container.name}",
                path="",
                compose_file="",
                status="running" if container.status == "running" else "stopped",
                services=[container.name],
                containers=[container],  # Already fully populated!
                last_modified=container.created
            )
            stacks.append(orphan_stack)
        
        return sorted(stacks, key=lambda x: (not x.name.startswith('_Orphan'), x.name))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stacks: {str(e)}")

@router.post("/stacks/{stack_name}/start")
async def start_stack(stack_name: str, background_tasks: BackgroundTasks):
    """Start a Docker Compose stack"""
    return await _execute_stack_command(stack_name, "up -d", "started")

@router.post("/stacks/{stack_name}/stop")
async def stop_stack(stack_name: str, background_tasks: BackgroundTasks):
    """Stop a Docker Compose stack"""
    print(f"🛑 STOP STACK CALLED: stack_name='{stack_name}'")
    print(f"🛑 Type: {type(stack_name)}")
    print(f"🛑 Repr: {repr(stack_name)}")
    return await _execute_stack_command(stack_name, "down", "stopped")

@router.post("/stacks/{stack_name}/restart")
async def restart_stack(stack_name: str, background_tasks: BackgroundTasks):
    """Restart a Docker Compose stack"""
    return await _execute_stack_command(stack_name, "restart", "restarted")

@router.post("/stacks/{stack_name}/pull")
async def pull_stack(stack_name: str, background_tasks: BackgroundTasks):
    """Pull latest images for a Docker Compose stack"""
    return await _execute_stack_command(stack_name, "pull", "pulled")



async def _execute_stack_command(stack_name: str, command: str, action: str) -> Dict[str, Any]:
    """Execute a docker compose command on a stack"""
    stacks_dir = Path(settings.STACKS_DIRECTORY)
    stack_path = stacks_dir / stack_name
    
    if not stack_path.exists():
        raise HTTPException(status_code=404, detail=f"Stack '{stack_name}' not found")
    
    # Find compose file
    compose_files = ['docker-compose.yml', 'compose.yaml', 'docker-compose.yaml', 'compose.yml']
    compose_file = None
    for filename in compose_files:
        if (stack_path / filename).exists():
            compose_file = filename
            break
    
    if not compose_file:
        raise HTTPException(status_code=400, detail=f"No compose file found in stack '{stack_name}'")
    
    try:
        result = subprocess.run(
            ["docker", "compose", "-f", compose_file] + command.split(),
            cwd=stack_path,
            capture_output=True,
            text=True,
            check=True,
            timeout=300  # 5 minute timeout
        )
        
        return {
            "message": f"Stack '{stack_name}' {action} successfully",
            "output": result.stdout,
            "stack_name": stack_name,
            "command": command
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to {action.rstrip('ed')} stack '{stack_name}': {e.stderr}"
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=408, 
            detail=f"Command timed out for stack '{stack_name}'"
        )

# =============================================================================
# IMAGES, NETWORKS, VOLUMES
# =============================================================================

@router.get("/images", response_model=List[Image])
async def get_images():
    """Get all Docker images"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        images = []
        for image in docker_client.images.list():
            images.append(Image(
                id=image.id,
                short_id=image.short_id,
                tags=image.tags,
                size=image.attrs['Size'],
                created=image.attrs['Created'],
                labels=image.attrs.get('Config', {}).get('Labels') or {}
            ))
        return images
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving images: {str(e)}")

@router.get("/networks", response_model=List[Network])
async def get_networks():
    """Get all Docker networks"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        networks = []
        for network in docker_client.networks.list():
            networks.append(Network(
                id=network.id,
                short_id=network.short_id,
                name=network.name,
                driver=network.attrs.get('Driver', ''),
                scope=network.attrs.get('Scope', ''),
                created=network.attrs.get('Created', ''),
                labels=network.attrs.get('Labels') or {}
            ))
        return networks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving networks: {str(e)}")

@router.get("/volumes", response_model=List[Volume])
async def get_volumes():
    """Get all Docker volumes"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        volumes = []
        for volume in docker_client.volumes.list():
            volumes.append(Volume(
                name=volume.name,
                driver=volume.attrs.get('Driver', ''),
                mountpoint=volume.attrs.get('Mountpoint', ''),
                created=volume.attrs.get('CreatedAt', ''),
                labels=volume.attrs.get('Labels') or {}
            ))
        return volumes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving volumes: {str(e)}")

# =============================================================================
# SYSTEM STATS
# =============================================================================

# Replace the existing /stats endpoint with this enhanced version:

@router.get("/stats")
async def get_docker_stats():
    """Get comprehensive Docker system statistics including stack counts"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker daemon not available")
    
    try:
        # Get basic Docker info
        info = docker_client.info()
        containers = docker_client.containers.list(all=True)
        images = docker_client.images.list()
        networks = docker_client.networks.list()
        volumes = docker_client.volumes.list()
        
        # Container statistics
        running_containers = len([c for c in containers if c.status == 'running'])
        stopped_containers = len([c for c in containers if c.status == 'exited'])
        paused_containers = len([c for c in containers if c.status == 'paused'])
        
        # Stack statistics - reuse the logic from get_stacks()
        stacks_stats = await _get_stack_statistics()
        
        return {
            "stacks": stacks_stats,
            "containers": {
                "total": len(containers),
                "running": running_containers,
                "stopped": stopped_containers,
                "paused": paused_containers,
            },
            "images": {
                "total": len(images),
                "size": sum(img.attrs.get('Size', 0) for img in images)
            },
            "networks": {
                "total": len(networks)
            },
            "volumes": {
                "total": len(volumes)
            },
            "system": {
                "docker_version": info.get('ServerVersion', ''),
                "api_version": info.get('ApiVersion', ''),
                "kernel_version": info.get('KernelVersion', ''),
                "operating_system": info.get('OperatingSystem', ''),
                "architecture": info.get('Architecture', ''),
                "cpus": info.get('NCPU', 0),
                "memory": info.get('MemTotal', 0)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving Docker stats: {str(e)}")

async def _get_stack_statistics():
    """Get stack counts by status INCLUDING external compose projects and orphans"""
    stacks_dir = Path(settings.STACKS_DIRECTORY)
    
    try:
        running_count = 0
        stopped_count = 0
        partial_count = 0
        total_count = 0
        
        if not docker_client:
            return {"total": 0, "running": 0, "stopped": 0, "partial": 0}
        
        all_containers = docker_client.containers.list(all=True)
        
        # Get all unique compose projects
        compose_projects = set()
        for container in all_containers:
            project = container.labels.get('com.docker.compose.project')
            if project:
                compose_projects.add(project)
        
        # Count compose projects (both /opt/stacks and external)
        for project_name in compose_projects:
            total_count += 1
            project_containers = [c for c in all_containers 
                               if c.labels.get('com.docker.compose.project') == project_name]
            running_containers = [c for c in project_containers if c.status == 'running']
            
            if len(running_containers) == len(project_containers):
                running_count += 1
            elif len(running_containers) > 0:
                partial_count += 1
            else:
                stopped_count += 1
        
        # Count orphan containers
        stack_managed_containers = set()
        for container in all_containers:
            if container.labels.get('com.docker.compose.project'):
                stack_managed_containers.add(container.id)
        
        for container in all_containers:
            if container.id not in stack_managed_containers:
                total_count += 1
                if container.status == 'running':
                    running_count += 1
                else:
                    stopped_count += 1
        
        return {
            "total": total_count,
            "running": running_count,
            "stopped": stopped_count,
            "partial": partial_count
        }
        
    except Exception as e:
        return {"total": 0, "running": 0, "stopped": 0, "partial": 0}

@router.get("/debug/containers")
async def debug_containers():
    """Debug endpoint to see all containers and their labels"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker not available")
    
    try:
        all_containers = docker_client.containers.list(all=True)
        container_info = []
        
        for container in all_containers:
            container_info.append({
                "name": container.name,
                "id": container.short_id,
                "status": container.status,
                "image": container.image.tags[0] if container.image.tags else container.image.id,
                "labels": container.labels or {},
                "compose_project": container.labels.get('com.docker.compose.project'),
                "compose_service": container.labels.get('com.docker.compose.service'),
                "is_orphan": not bool(container.labels.get('com.docker.compose.project'))
            })
        
        return {
            "total_containers": len(container_info),
            "containers": container_info,
            "orphans": [c for c in container_info if c["is_orphan"]],
            "compose_managed": [c for c in container_info if not c["is_orphan"]]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error debugging containers: {str(e)}")

