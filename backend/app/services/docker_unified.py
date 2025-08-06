"""
Unified Stack Processing Service

This service creates comprehensive, pre-processed stack objects that include
all constituent parts (services, containers, networks, volumes) with proper
hierarchical relationships and rollup data.
"""
from ..services.config_aggregator import config_aggregator

import yaml
import json
import logging
from typing import Dict, List, Any, Optional, Union
from pathlib import Path
from datetime import datetime

import docker
from docker.models.networks import Network as DockerNetwork
from docker.models.volumes import Volume as DockerVolume

logger = logging.getLogger(__name__)

class UnifiedStackService:
    """Service for creating unified, pre-processed stack objects"""
    
    def __init__(self, docker_client=None, stacks_directory="/opt/stacks"):
        self.docker_client = docker_client or docker.from_env()
        self.stacks_directory = Path(stacks_directory)
        # NEW: Initialize config aggregator
        self.config_aggregator = config_aggregator
    
    async def get_unified_stack(self, stack_name: str) -> Dict[str, Any]:
        """
        Get a fully unified stack object with all constituent parts processed
        """
        try:
            # ... your existing code that builds the unified_stack dict ...
            
            # Build unified stack object (your existing code)
            unified_stack = {
                "name": stack_name,
                "path": str(stack_path),
                "compose_file": str(compose_file),
                "compose_content": compose_content,
                "last_modified": datetime.fromtimestamp(compose_file.stat().st_mtime).isoformat(),
                "status": self._calculate_stack_status(containers),
                
                # Your existing unified data
                "services": self._build_unified_services(
                    compose_content.get('services', {}),
                    containers
                ),
                "networks": self._build_unified_networks(
                    compose_content.get('networks', {}),
                    containers,
                    docker_networks
                ),
                "volumes": self._build_unified_volumes(
                    compose_content.get('volumes', {}),
                    containers,
                    docker_volumes
                ),
                "containers": self._build_container_summary(containers),
                "stats": self._build_stack_stats(containers, docker_networks, docker_volumes),
                "environment": self._extract_environment_info(compose_content, stack_path),
                "health": self._build_health_summary(containers)
            }
            
            # NEW: Add aggregated configurations
            try:
                aggregated_configs = self.config_aggregator.aggregate_stack_configs(unified_stack)
                unified_stack["aggregated_configs"] = self._convert_aggregated_configs_to_dict(aggregated_configs)
            except Exception as e:
                logger.error(f"Failed to aggregate configs for stack {stack_name}: {e}")
                # Safe fallback - empty but valid structure
                unified_stack["aggregated_configs"] = {
                    "networks": [],
                    "ports": [],
                    "volumes": [],
                    "environment": [],
                    "labels": [],
                }
            
            # NEW: Also add aggregated configs to each service
            for service_name, service_data in unified_stack.get("services", {}).items():
                try:
                    service_aggregated = self.config_aggregator.aggregate_service_configs(service_data)
                    service_data["aggregated_configs"] = self._convert_aggregated_configs_to_dict(service_aggregated)
                except Exception as e:
                    logger.error(f"Failed to aggregate configs for service {service_name}: {e}")
                    # Safe fallback
                    service_data["aggregated_configs"] = {
                        "networks": [],
                        "ports": [],
                        "volumes": [],
                        "environment": [],
                        "labels": [],
                    }
            
            return unified_stack
            
        except Exception as e:
            logger.error(f"Error building unified stack {stack_name}: {e}")
            raise
    
    def _convert_aggregated_configs_to_dict(self, aggregated_configs) -> Dict[str, Any]:
        """Convert dataclass objects to dicts for JSON serialization"""
        try:
            return {
                "networks": [self._network_config_to_dict(n) for n in aggregated_configs.networks],
                "ports": [self._port_config_to_dict(p) for p in aggregated_configs.ports],
                "volumes": [self._volume_config_to_dict(v) for v in aggregated_configs.volumes],
                "environment": [self._env_config_to_dict(e) for e in aggregated_configs.environment],
                "labels": [self._label_config_to_dict(l) for l in aggregated_configs.labels],
            }
        except Exception as e:
            logger.warning(f"Error converting aggregated configs: {e}")
            # Return safe empty structure
            return {
                "networks": [],
                "ports": [],
                "volumes": [],
                "environment": [],
                "labels": [],
            }
    
    def _network_config_to_dict(self, network) -> Dict[str, Any]:
        """Convert AggregatedNetworkConfig to dict with safe fallbacks"""
        try:
            return {
                "name": getattr(network, 'name', 'Not set'),
                "level": getattr(network, 'level', 'stack'),
                "source": getattr(network, 'source', 'unknown'),
                "details": getattr(network, 'details', {}),
                "attached_services": getattr(network, 'attached_services', []),
                "conflicts": getattr(network, 'conflicts', False),
            }
        except Exception as e:
            logger.warning(f"Error converting network config: {e}")
            return {
                "name": "Not set",
                "level": "stack",
                "source": "unknown", 
                "details": {},
                "attached_services": [],
                "conflicts": False,
            }
    
    def _port_config_to_dict(self, port) -> Dict[str, Any]:
        """Convert AggregatedPortConfig to dict with safe fallbacks"""
        try:
            return {
                "host": getattr(port, 'host', 'Not set'),
                "container": getattr(port, 'container', 'Not set'),
                "protocol": getattr(port, 'protocol', 'tcp'),
                "level": getattr(port, 'level', 'service'),
                "source": getattr(port, 'source', 'unknown'),
                "conflicts": getattr(port, 'conflicts', False),
                "description": getattr(port, 'description', 'No description available'),
                "details": getattr(port, 'details', {}),
            }
        except Exception as e:
            logger.warning(f"Error converting port config: {e}")
            return {
                "host": "Not set",
                "container": "Not set",
                "protocol": "tcp",
                "level": "service",
                "source": "unknown",
                "conflicts": False,
                "description": "No description available",
                "details": {},
            }
    
    def _volume_config_to_dict(self, volume) -> Dict[str, Any]:
        """Convert AggregatedVolumeConfig to dict with safe fallbacks"""
        try:
            return {
                "name": getattr(volume, 'name', 'Not set'),
                "host_path": getattr(volume, 'host_path', 'Not set'),
                "container_path": getattr(volume, 'container_path', 'Not set'),
                "mode": getattr(volume, 'mode', 'rw'),
                "type": getattr(volume, 'type', 'named'),
                "level": getattr(volume, 'level', 'service'),
                "source": getattr(volume, 'source', 'unknown'),
                "shared_by": getattr(volume, 'shared_by', []),
                "details": getattr(volume, 'details', {}),
            }
        except Exception as e:
            logger.warning(f"Error converting volume config: {e}")
            return {
                "name": "Not set",
                "host_path": "Not set", 
                "container_path": "Not set",
                "mode": "rw",
                "type": "named",
                "level": "service",
                "source": "unknown",
                "shared_by": [],
                "details": {},
            }
    
    def _env_config_to_dict(self, env) -> Dict[str, Any]:
        """Convert AggregatedEnvironmentConfig to dict with safe fallbacks"""
        try:
            return {
                "key": getattr(env, 'key', 'Not set'),
                "value": getattr(env, 'value', 'Not set'),
                "level": getattr(env, 'level', 'service'),
                "source": getattr(env, 'source', 'unknown'),
                "is_secret": getattr(env, 'is_secret', False),
                "category": getattr(env, 'category', 'custom'),
                "description": getattr(env, 'description', 'No description available'),
            }
        except Exception as e:
            logger.warning(f"Error converting env config: {e}")
            return {
                "key": "Not set",
                "value": "Not set",
                "level": "service",
                "source": "unknown",
                "is_secret": False,
                "category": "custom",
                "description": "No description available",
            }
    
    def _label_config_to_dict(self, label) -> Dict[str, Any]:
        """Convert AggregatedLabelConfig to dict with safe fallbacks"""
        try:
            return {
                "key": getattr(label, 'key', 'Not set'),
                "value": getattr(label, 'value', 'Not set'),
                "level": getattr(label, 'level', 'stack'),
                "source": getattr(label, 'source', 'unknown'),
                "category": getattr(label, 'category', 'custom'),
            }
        except Exception as e:
            logger.warning(f"Error converting label config: {e}")
            return {
                "key": "Not set",
                "value": "Not set",
                "level": "stack",
                "source": "unknown",
                "category": "custom",
            }
    
    async def get_all_unified_stacks(self) -> List[Dict[str, Any]]:
        """
        Get all unified stacks using comprehensive discovery:
        1. Stacks from /opt/stacks directory
        2. External compose projects (containers with compose labels but not in /opt/stacks)
        3. Orphaned containers (→ _ORPHAN_{container_name} pseudo-stacks)
        """
        try:
            logger.info("Starting comprehensive stack discovery...")
            
            # Step 1: Get ALL containers with full details ONCE
            all_containers = await self._get_all_containers_with_details()
            logger.info(f"Found {len(all_containers)} total containers")
            
            # Step 2: Group containers by project
            containers_by_project = {}
            orphan_containers = []
            
            for container in all_containers:
                compose_project = container.get("compose", {}).get("project")
                if compose_project:
                    if compose_project not in containers_by_project:
                        containers_by_project[compose_project] = []
                    containers_by_project[compose_project].append(container)
                else:
                    orphan_containers.append(container)
            
            logger.info(f"Found {len(containers_by_project)} compose projects, {len(orphan_containers)} orphan containers")
            
            unified_stacks = []
            processed_projects = set()
            
            # Step 3: Process stacks from /opt/stacks directory
            if self.stacks_directory.exists():
                for stack_path in self.stacks_directory.iterdir():
                    if not stack_path.is_dir():
                        continue
                    
                    # Find compose file
                    compose_file = self._find_compose_file(stack_path)
                    if not compose_file:
                        continue
                    
                    project_name = stack_path.name
                    processed_projects.add(project_name)
                    
                    # Get containers for this stack
                    stack_containers = containers_by_project.get(project_name, [])
                    
                    # Build unified stack using existing logic
                    try:
                        unified_stack = await self._build_unified_stack_from_path(
                            project_name, stack_path, compose_file, stack_containers
                        )
                        unified_stacks.append(unified_stack)
                        logger.debug(f"Processed /opt/stacks stack: {project_name}")
                    except Exception as e:
                        logger.error(f"Error processing stack {project_name}: {e}")
            
            # Step 4: Process external compose projects
            for project_name, project_containers in containers_by_project.items():
                if project_name in processed_projects:
                    continue  # Already processed from /opt/stacks
                
                try:
                    unified_stack = await self._build_unified_stack_from_external_project(
                        project_name, project_containers
                    )
                    unified_stacks.append(unified_stack)
                    logger.debug(f"Processed external project: {project_name}")
                except Exception as e:
                    logger.error(f"Error processing external project {project_name}: {e}")
            
            # Step 5: Process orphan containers → _ORPHAN_{name} pseudo-stacks
            for container in orphan_containers:
                try:
                    orphan_stack = await self._build_orphan_pseudo_stack(container)
                    unified_stacks.append(orphan_stack)
                    logger.debug(f"Processed orphan container: {container['name']}")
                except Exception as e:
                    logger.error(f"Error processing orphan container {container['name']}: {e}")
            
            # Sort stacks: non-orphans first, then alphabetically
            unified_stacks.sort(key=lambda x: (x['name'].startswith('_ORPHAN_'), x['name']))
            
            logger.info(f"Discovery complete: {len(unified_stacks)} total stacks")
            return unified_stacks
            
        except Exception as e:
            logger.error(f"Error in comprehensive stack discovery: {e}")
            return []

    async def _get_all_containers_with_details(self) -> List[Dict[str, Any]]:
        """Get all containers with full unified details"""
        try:
            containers = []
            for container in self.docker_client.containers.list(all=True):
                container_data = self._build_detailed_container(container, include_stats=False)  # Add this parameter
                containers.append(container_data)
            return containers
        except Exception as e:
            logger.error(f"Error getting all containers: {e}")
            return []

    def _find_compose_file(self, stack_path: Path) -> Optional[Path]:
        """Find compose file in stack directory"""
        compose_files = [
            'docker-compose.yml', 
            'compose.yaml', 
            'docker-compose.yaml', 
            'compose.yml'
        ]
        
        for filename in compose_files:
            compose_path = stack_path / filename
            if compose_path.exists():
                return compose_path
        return None

    async def _build_unified_stack_from_path(
        self, 
        project_name: str, 
        stack_path: Path, 
        compose_file: Path, 
        containers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build unified stack from /opt/stacks directory (reuses existing logic)"""
        
        # Parse compose file
        with open(compose_file, 'r') as f:
            compose_content = yaml.safe_load(f)
        
        # Get Docker networks and volumes for this stack
        docker_networks = self._get_stack_networks(project_name)
        docker_volumes = self._get_stack_volumes(project_name)
        
        # Build unified stack object using existing methods
        unified_stack = {
            "name": project_name,
            "path": str(stack_path),
            "compose_file": str(compose_file),
            "compose_content": compose_content,
            "last_modified": datetime.fromtimestamp(compose_file.stat().st_mtime).isoformat(),
            "status": self._calculate_stack_status(containers),
            
            # Use all existing unified methods
            "services": self._build_unified_services(
                compose_content.get('services', {}),
                containers
            ),
            "networks": self._build_unified_networks(
                compose_content.get('networks', {}),
                containers,
                docker_networks
            ),
            "volumes": self._build_unified_volumes(
                compose_content.get('volumes', {}),
                containers,
                docker_volumes
            ),
            "containers": self._build_container_summary(containers),
            "stats": self._build_stack_stats(containers, docker_networks, docker_volumes),
            "environment": self._extract_environment_info(compose_content, stack_path),
            "health": self._build_health_summary(containers)
        }
        
        return unified_stack

    async def _build_unified_stack_from_external_project(
        self, 
        project_name: str, 
        containers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Build unified stack from external compose project"""
        
        # Try to find and read external compose file
        compose_content = None
        compose_file_path = ""
        working_dir = ""
        
        if containers:
            # Get compose file info from container labels
            first_container = containers[0]
            labels = first_container.get("labels", {})
            compose_file_path = labels.get('com.docker.compose.project.config_files', '')
            working_dir = labels.get('com.docker.compose.project.working_dir', '')
            
            if compose_file_path and Path(compose_file_path).exists():
                try:
                    with open(compose_file_path, 'r') as f:
                        compose_content = yaml.safe_load(f)
                except Exception as e:
                    logger.warning(f"Could not read external compose file {compose_file_path}: {e}")
        
        # Get Docker networks and volumes for this stack
        docker_networks = self._get_stack_networks(project_name)
        docker_volumes = self._get_stack_volumes(project_name)
        
        # Extract services from containers if no compose file available
        if not compose_content:
            compose_content = self._infer_compose_from_containers(containers)
        
        # Build unified stack object
        unified_stack = {
            "name": f"[External] {project_name}",
            "path": working_dir or "external",
            "compose_file": compose_file_path.split('/')[-1] if compose_file_path else "external",
            "compose_content": compose_content,
            "last_modified": containers[0].get("created") if containers else datetime.now().isoformat(),
            "status": self._calculate_stack_status(containers),
            
            # Use existing unified methods
            "services": self._build_unified_services(
                compose_content.get('services', {}),
                containers
            ),
            "networks": self._build_unified_networks(
                compose_content.get('networks', {}),
                containers,
                docker_networks
            ),
            "volumes": self._build_unified_volumes(
                compose_content.get('volumes', {}),
                containers,
                docker_volumes
            ),
            "containers": self._build_container_summary(containers),
            "stats": self._build_stack_stats(containers, docker_networks, docker_volumes),
            "environment": self._extract_external_environment_info(containers),
            "health": self._build_health_summary(containers)
        }
        
        return unified_stack

    async def _build_orphan_pseudo_stack(self, container: Dict[str, Any]) -> Dict[str, Any]:
        """Build pseudo-stack for orphaned container"""
        
        # Create minimal compose content for the orphan
        compose_content = {
            "version": "3.8",
            "services": {
                container["name"]: {
                    "image": container["image"],
                    "container_name": container["name"],
                    "restart": container.get("restart_policy", "no"),
                    # Add ports if any
                    "ports": self._extract_ports_for_compose(container),
                    # Add volumes if any  
                    "volumes": self._extract_volumes_for_compose(container),
                    # Add environment if any
                    "environment": container.get("environment", [])
                }
            }
        }
        
        # Remove empty sections
        service_config = compose_content["services"][container["name"]]
        for key in ["ports", "volumes", "environment"]:
            if not service_config[key]:
                del service_config[key]
        
        # Build unified stack for this single container
        unified_stack = {
            "name": f"_ORPHAN_{container['name']}",
            "path": "",
            "compose_file": "pseudo",
            "compose_content": compose_content,
            "last_modified": container.get("created", datetime.now().isoformat()),
            "status": "running" if container["status"] == "running" else "stopped",
            
            # Use existing unified methods with single container
            "services": self._build_unified_services(
                compose_content.get('services', {}),
                [container]
            ),
            "networks": self._build_unified_networks(
                {},  # No compose-defined networks for orphans
                [container],
                []   # No stack-specific Docker networks
            ),
            "volumes": self._build_unified_volumes(
                {},  # No compose-defined volumes for orphans  
                [container],
                []   # No stack-specific Docker volumes
            ),
            "containers": self._build_container_summary([container]),
            "stats": self._build_stack_stats([container], [], []),
            "environment": {"compose_version": "3.8", "env_files": [], "secrets": [], "configs": []},
            "health": self._build_health_summary([container])
        }
        
        return unified_stack

    def _infer_compose_from_containers(self, containers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Infer compose structure from containers when compose file unavailable"""
        services = {}
        
        for container in containers:
            service_name = container.get("compose", {}).get("service") or container["name"]
            services[service_name] = {
                "image": container["image"],
                "container_name": container["name"],
                "restart": container.get("restart_policy", "no"),
                "ports": self._extract_ports_for_compose(container),
                "volumes": self._extract_volumes_for_compose(container),
                "environment": container.get("environment", [])
            }
            
            # Clean up empty sections
            for key in ["ports", "volumes", "environment"]:
                if not services[service_name][key]:
                    del services[service_name][key]
        
        return {
            "version": "3.8",
            "services": services
        }

    def _extract_ports_for_compose(self, container: Dict[str, Any]) -> List[str]:
        """Extract ports in compose format from container"""
        ports = []
        for container_port, bindings in container.get("ports", {}).items():
            for binding in bindings:
                if binding["host_port"]:
                    ports.append(f"{binding['host_port']}:{container_port}")
        return ports

    def _extract_volumes_for_compose(self, container: Dict[str, Any]) -> List[str]:
        """Extract volumes in compose format from container"""
        volumes = []
        for mount in container.get("mounts", []):
            if mount["source"] and mount["destination"]:
                mode = f":{mount['mode']}" if mount.get("mode") and mount["mode"] != "rw" else ""
                volumes.append(f"{mount['source']}:{mount['destination']}{mode}")
        return volumes

    def _extract_external_environment_info(self, containers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract environment info for external projects"""
        return {
            "compose_version": "3.8",  # Default for external
            "env_files": [],  # Can't detect external env files
            "secrets": [],
            "configs": []
        }

    def _get_stack_containers(self, stack_name: str) -> List[Any]:
        """Get all containers belonging to this stack"""
        try:
            containers = []
            for container in self.docker_client.containers.list(all=True):
                project = container.labels.get('com.docker.compose.project')
                if project == stack_name:
                    # Get detailed container info including stats if running
                    container_data = self._build_detailed_container(container)
                    containers.append(container_data)
            return containers
        except Exception as e:
            logger.error(f"Error getting containers for stack {stack_name}: {e}")
            return []
    
    def _build_detailed_container(self, container, include_stats=True) -> Dict[str, Any]:
        """Build detailed container object with all relevant information"""
        try:
            # Basic container info
            container_data = {
                "id": container.id,
                "short_id": container.short_id,
                "name": container.name,
                "status": container.status,
                "state": container.attrs['State']['Status'],
                "image": container.image.tags[0] if container.image.tags else container.image.id,
                "image_id": container.image.id,
                "created": container.attrs['Created'],
                "started_at": container.attrs['State'].get('StartedAt'),
                "finished_at": container.attrs['State'].get('FinishedAt'),
                "labels": container.labels or {},
                "environment": container.attrs['Config'].get('Env', []),
                "restart_policy": container.attrs['HostConfig'].get('RestartPolicy', {}).get('Name', 'no'),
                
                # Compose-specific info
                "compose": {
                    "project": container.labels.get('com.docker.compose.project'),
                    "service": container.labels.get('com.docker.compose.service'),
                    "container_number": container.labels.get('com.docker.compose.container-number'),
                    "config_hash": container.labels.get('com.docker.compose.config-hash'),
                    "version": container.labels.get('com.docker.compose.version')
                },
                
                # Network information
                "networks": self._extract_container_networks(container),
                
                # Volume/mount information  
                "mounts": self._extract_container_mounts(container),
                
                # Port information
                "ports": self._extract_container_ports(container),
                
                # Resource information
                "resources": self._extract_container_resources(container),
                
                # Health information
                "health": self._extract_container_health(container)
            }
            
            # Add real-time stats if container is running
            if container.status == 'running' and include_stats:  # Add include_stats check here
                try:
                    stats = container.stats(stream=False)
                    container_data["live_stats"] = self._process_container_stats(stats)
                except Exception as e:
                    logger.debug(f"Could not get stats for {container.name}: {e}")
                    container_data["live_stats"] = None
            else:
                container_data["live_stats"] = None
            
            return container_data
            
        except Exception as e:
            logger.error(f"Error building detailed container info: {e}")
            return {"error": str(e)}
    
    def _build_unified_networks(self, compose_networks: Dict, containers: List, docker_networks: List) -> Dict[str, Any]:
        """Build unified network information with rollup data"""
        networks = {
            "compose": {},      # Networks defined in compose file
            "services": {},     # Networks used by services (from containers)
            "containers": {},   # Networks from actual containers
            "docker": {},       # Actual Docker networks
            "all": []          # Unified list of all networks
        }
        
        # Process compose-defined networks
        for network_name, network_config in compose_networks.items():
            networks["compose"][network_name] = {
                "name": network_name,
                "config": network_config or {},
                "driver": network_config.get('driver', 'bridge') if network_config else 'bridge',
                "external": network_config.get('external', False) if network_config else False,
                "source": "compose"
            }
        
        # Process networks from containers
        container_networks = {}
        service_networks = {}
        
        for container in containers:
            for net_name, net_info in container.get("networks", {}).items():
                # Container-level networks
                if net_name not in container_networks:
                    container_networks[net_name] = {
                        "name": net_name,
                        "containers": [],
                        "source": "container"
                    }
                container_networks[net_name]["containers"].append({
                    "container_id": container["id"],
                    "container_name": container["name"],
                    "service": container.get("compose", {}).get("service"),
                    "ip_address": net_info.get("ip_address"),
                    "mac_address": net_info.get("mac_address")
                })
                
                # Service-level rollup
                service_name = container.get("compose", {}).get("service")
                if service_name:
                    if net_name not in service_networks:
                        service_networks[net_name] = {
                            "name": net_name,
                            "services": set(),
                            "source": "service"
                        }
                    service_networks[net_name]["services"].add(service_name)
        
        # Convert sets to lists for JSON serialization
        for net_info in service_networks.values():
            net_info["services"] = list(net_info["services"])
        
        networks["containers"] = container_networks
        networks["services"] = service_networks
        
        # Process actual Docker networks
        for docker_net in docker_networks:
            networks["docker"][docker_net.name] = {
                "name": docker_net.name,
                "id": docker_net.id,
                "driver": docker_net.attrs.get('Driver', 'unknown'),
                "scope": docker_net.attrs.get('Scope', 'unknown'),
                "created": docker_net.attrs.get('Created', ''),
                "labels": docker_net.attrs.get('Labels') or {},
                "config": docker_net.attrs.get('IPAM', {}),
                "containers_connected": len(docker_net.attrs.get('Containers', {})),
                "source": "docker"
            }
        
        # Build unified "all" list
        all_network_names = set()
        all_network_names.update(networks["compose"].keys())
        all_network_names.update(networks["containers"].keys())
        all_network_names.update(networks["docker"].keys())
        
        for net_name in all_network_names:
            unified_network = {
                "network": net_name,
                "sources": [],
                "details": {},
                "status": "active" if net_name in networks["docker"] else "defined"
            }
            
            # Merge details from all sources
            if net_name in networks["compose"]:
                unified_network["sources"].append("compose")
                unified_network["details"]["compose"] = networks["compose"][net_name]
            
            if net_name in networks["containers"]:
                unified_network["sources"].append("containers")
                unified_network["details"]["containers"] = networks["containers"][net_name]
            
            if net_name in networks["docker"]:
                unified_network["sources"].append("docker")
                unified_network["details"]["docker"] = networks["docker"][net_name]
            
            networks["all"].append(unified_network)
        
        return networks
    
    def _build_unified_volumes(self, compose_volumes: Dict, containers: List, docker_volumes: List) -> Dict[str, Any]:
        """Build unified volume information with rollup data"""
        volumes = {
            "compose": {},      # Volumes defined in compose file
            "services": {},     # Volumes used by services
            "containers": {},   # Volumes from actual containers
            "docker": {},       # Actual Docker volumes
            "all": []          # Unified list of all volumes
        }
        
        # Process compose-defined volumes
        for volume_name, volume_config in compose_volumes.items():
            volumes["compose"][volume_name] = {
                "name": volume_name,
                "config": volume_config or {},
                "driver": volume_config.get('driver', 'local') if volume_config else 'local',
                "external": volume_config.get('external', False) if volume_config else False,
                "source": "compose"
            }
        
        # Process volumes from containers
        container_volumes = {}
        service_volumes = {}
        
        for container in containers:
            for mount in container.get("mounts", []):
                if mount["type"] == "volume":
                    vol_name = mount["name"]
                    
                    # Container-level volumes
                    if vol_name not in container_volumes:
                        container_volumes[vol_name] = {
                            "name": vol_name,
                            "containers": [],
                            "source": "container"
                        }
                    container_volumes[vol_name]["containers"].append({
                        "container_id": container["id"],
                        "container_name": container["name"],
                        "service": container.get("compose", {}).get("service"),
                        "destination": mount["destination"],
                        "mode": mount.get("mode", "rw")
                    })
                    
                    # Service-level rollup
                    service_name = container.get("compose", {}).get("service")
                    if service_name:
                        if vol_name not in service_volumes:
                            service_volumes[vol_name] = {
                                "name": vol_name,
                                "services": set(),
                                "source": "service"
                            }
                        service_volumes[vol_name]["services"].add(service_name)
        
        # Convert sets to lists
        for vol_info in service_volumes.values():
            vol_info["services"] = list(vol_info["services"])
        
        volumes["containers"] = container_volumes
        volumes["services"] = service_volumes
        
        # Process actual Docker volumes
        for docker_vol in docker_volumes:
            volumes["docker"][docker_vol.name] = {
                "name": docker_vol.name,
                "id": docker_vol.id,
                "driver": docker_vol.attrs.get('Driver', 'local'),
                "mountpoint": docker_vol.attrs.get('Mountpoint', ''),
                "created": docker_vol.attrs.get('CreatedAt', ''),
                "labels": docker_vol.attrs.get('Labels') or {},
                "options": docker_vol.attrs.get('Options') or {},
                "scope": docker_vol.attrs.get('Scope', 'local'),
                "source": "docker"
            }
        
        # Build unified "all" list
        all_volume_names = set()
        all_volume_names.update(volumes["compose"].keys())
        all_volume_names.update(volumes["containers"].keys())
        all_volume_names.update(volumes["docker"].keys())
        
        for vol_name in all_volume_names:
            unified_volume = {
                "volume": vol_name,
                "sources": [],
                "details": {},
                "status": "active" if vol_name in volumes["docker"] else "defined"
            }
            
            # Merge details from all sources
            if vol_name in volumes["compose"]:
                unified_volume["sources"].append("compose")
                unified_volume["details"]["compose"] = volumes["compose"][vol_name]
            
            if vol_name in volumes["containers"]:
                unified_volume["sources"].append("containers")
                unified_volume["details"]["containers"] = volumes["containers"][vol_name]
            
            if vol_name in volumes["docker"]:
                unified_volume["sources"].append("docker")
                unified_volume["details"]["docker"] = volumes["docker"][vol_name]
            
            volumes["all"].append(unified_volume)
        
        return volumes
    
    def _build_unified_services(self, compose_services: Dict, containers: List) -> Dict[str, Any]:
        """Build unified service information with container details"""
        services = {}
        
        for service_name, service_config in compose_services.items():
            # Find containers for this service
            service_containers = [
                c for c in containers 
                if c.get("compose", {}).get("service") == service_name
            ]
            
            # Build service object
            services[service_name] = {
                "name": service_name,
                "config": service_config,
                "image": service_config.get("image", ""),
                "build": service_config.get("build"),
                "environment": service_config.get("environment", {}),
                "ports": service_config.get("ports", []),
                "volumes": service_config.get("volumes", []),
                "networks": service_config.get("networks", {}),
                "depends_on": service_config.get("depends_on", []),
                "restart": service_config.get("restart", "no"),
                "command": service_config.get("command"),
                "labels": service_config.get("labels", {}),
                
                # Container information
                "containers": service_containers,
                "container_count": len(service_containers),
                "running_containers": len([c for c in service_containers if c["status"] == "running"]),
                
                # Service status based on containers
                "status": self._calculate_service_status(service_containers),
                
                # Rollup information
                "actual_ports": self._get_service_actual_ports(service_containers),
                "actual_networks": self._get_service_actual_networks(service_containers),
                "actual_volumes": self._get_service_actual_volumes(service_containers),
                
                # Health summary
                "health_summary": self._get_service_health_summary(service_containers)
            }
        
        return services
    
    def _calculate_stack_status(self, containers: List) -> str:
        """Calculate overall stack status based on containers"""
        if not containers:
            return "empty"
        
        running = sum(1 for c in containers if c["status"] == "running")
        total = len(containers)
        
        if running == 0:
            return "stopped"
        elif running == total:
            return "running"
        else:
            return "partial"
    
    def _calculate_service_status(self, containers: List) -> str:
        """Calculate service status based on its containers"""
        if not containers:
            return "no_containers"
        
        running = sum(1 for c in containers if c["status"] == "running")
        total = len(containers)
        
        if running == 0:
            return "stopped"
        elif running == total:
            return "running"
        else:
            return "partial"
    
    # Helper methods for extracting container details
    def _extract_container_networks(self, container) -> Dict[str, Any]:
        """Extract network information from container"""
        networks = {}
        for network_name, network_info in container.attrs['NetworkSettings']['Networks'].items():
            networks[network_name] = {
                "network_id": network_info.get('NetworkID'),
                "ip_address": network_info.get('IPAddress'),
                "mac_address": network_info.get('MacAddress'),
                "gateway": network_info.get('Gateway')
            }
        return networks
    
    def _extract_container_mounts(self, container) -> List[Dict[str, Any]]:
        """Extract mount/volume information from container"""
        mounts = []
        for mount in container.attrs['Mounts']:
            mounts.append({
                "type": mount.get('Type'),
                "name": mount.get('Name'),
                "source": mount.get('Source'),
                "destination": mount.get('Destination'),
                "mode": mount.get('Mode'),
                "rw": mount.get('RW', True)
            })
        return mounts
    
    def _extract_container_ports(self, container) -> Dict[str, Any]:
        """Extract port information from container"""
        ports = {}
        port_bindings = container.attrs['NetworkSettings']['Ports'] or {}
        
        for container_port, host_bindings in port_bindings.items():
            if host_bindings:
                ports[container_port] = [
                    {
                        "host_ip": binding.get('HostIp', '0.0.0.0'),
                        "host_port": binding.get('HostPort')
                    }
                    for binding in host_bindings
                ]
            else:
                ports[container_port] = []
        
        return ports
    
    def _extract_container_resources(self, container) -> Dict[str, Any]:
        """Extract resource constraints from container"""
        host_config = container.attrs['HostConfig']
        return {
            "memory": host_config.get('Memory', 0),
            "memory_swap": host_config.get('MemorySwap', 0),
            "cpu_shares": host_config.get('CpuShares', 0),
            "cpu_quota": host_config.get('CpuQuota', 0),
            "cpu_period": host_config.get('CpuPeriod', 0),
            "cpuset_cpus": host_config.get('CpusetCpus', ''),
        }
    
    def _extract_container_health(self, container) -> Dict[str, Any]:
        """Extract health information from container"""
        health = container.attrs['State'].get('Health', {})
        return {
            "status": health.get('Status'),
            "failing_streak": health.get('FailingStreak', 0),
            "log": health.get('Log', [])[-5:] if health.get('Log') else []  # Last 5 entries
        }
    
    def _get_stack_networks(self, stack_name: str) -> List:
        """Get Docker networks for this stack"""
        try:
            networks = []
            for network in self.docker_client.networks.list():
                labels = network.attrs.get('Labels') or {}
                if labels.get('com.docker.compose.project') == stack_name:
                    networks.append(network)
            return networks
        except Exception as e:
            logger.error(f"Error getting networks for stack {stack_name}: {e}")
            return []
    
    def _get_stack_volumes(self, stack_name: str) -> List:
        """Get Docker volumes for this stack"""
        try:
            volumes = []
            for volume in self.docker_client.volumes.list():
                labels = volume.attrs.get('Labels') or {}
                if labels.get('com.docker.compose.project') == stack_name:
                    volumes.append(volume)
            return volumes
        except Exception as e:
            logger.error(f"Error getting volumes for stack {stack_name}: {e}")
            return []
    
    def _build_container_summary(self, containers: List) -> Dict[str, Any]:
        """Build container summary with rollup stats"""
        return {
            "total": len(containers),
            "running": len([c for c in containers if c["status"] == "running"]),
            "stopped": len([c for c in containers if c["status"] == "exited"]),
            "paused": len([c for c in containers if c["status"] == "paused"]),
            "containers": containers
        }
    
    def _build_stack_stats(self, containers: List, networks: List, volumes: List) -> Dict[str, Any]:
        """Build stack-level statistics"""
        return {
            "containers": {
                "total": len(containers),
                "running": len([c for c in containers if c["status"] == "running"]),
                "stopped": len([c for c in containers if c["status"] != "running"])
            },
            "networks": {
                "total": len(networks),
                "external": len([n for n in networks if n.attrs.get('Labels', {}).get('external') == 'true'])
            },
            "volumes": {
                "total": len(volumes),
                "external": len([v for v in volumes if v.attrs.get('Labels', {}).get('external') == 'true'])
            }
        }
    
    def _extract_environment_info(self, compose_content: Dict, stack_path: Path) -> Dict[str, Any]:
        """Extract environment and configuration information"""
        env_info = {
            "compose_version": compose_content.get('version', '3'),
            "env_files": [],
            "secrets": list(compose_content.get('secrets', {}).keys()),
            "configs": list(compose_content.get('configs', {}).keys())
        }
        
        # Look for .env files
        for env_file in ['.env', '.env.local', '.env.production']:
            env_path = stack_path / env_file
            if env_path.exists():
                env_info["env_files"].append(env_file)
        
        return env_info
    
    def _build_health_summary(self, containers: List) -> Dict[str, Any]:
        """Build health summary for the stack"""
        total_containers = len(containers)
        healthy_containers = 0
        unhealthy_containers = 0
        no_health_check = 0
        
        for container in containers:
            health_status = container.get("health", {}).get("status")
            if health_status == "healthy":
                healthy_containers += 1
            elif health_status == "unhealthy":
                unhealthy_containers += 1
            else:
                no_health_check += 1
        
        return {
            "total_containers": total_containers,
            "healthy": healthy_containers,
            "unhealthy": unhealthy_containers,
            "no_health_check": no_health_check,
            "overall_health": "healthy" if unhealthy_containers == 0 and healthy_containers > 0 else "degraded" if unhealthy_containers > 0 else "unknown"
        }
    
    def _process_container_stats(self, stats: Dict) -> Dict[str, Any]:
        """Process raw container stats into useful metrics"""
        # This is the same stats processing from the WebSocket implementation
        cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                   stats['precpu_stats']['cpu_usage']['total_usage']
        system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                      stats['precpu_stats']['system_cpu_usage']
        
        cpu_percent = 0.0
        if system_delta > 0:
            cpu_percent = (cpu_delta / system_delta) * \
                         len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100
        
        memory_usage = stats['memory_stats'].get('usage', 0)
        memory_limit = stats['memory_stats'].get('limit', 0)
        memory_percent = (memory_usage / memory_limit * 100) if memory_limit > 0 else 0
        
        return {
            "cpu_percent": round(cpu_percent, 2),
            "memory": {
                "usage": memory_usage,
                "limit": memory_limit,
                "percent": round(memory_percent, 2)
            }
        }
    
    def _get_service_actual_ports(self, containers: List) -> List[Dict[str, Any]]:
        """Get actual ports from service containers"""
        ports = []
        for container in containers:
            for container_port, bindings in container.get("ports", {}).items():
                for binding in bindings:
                    ports.append({
                        "container": container["name"],
                        "container_port": container_port,
                        "host_port": binding["host_port"],
                        "host_ip": binding["host_ip"]
                    })
        return ports
    
    def _get_service_actual_networks(self, containers: List) -> List[str]:
        """Get actual networks from service containers"""
        networks = set()
        for container in containers:
            networks.update(container.get("networks", {}).keys())
        return list(networks)
    
    def _get_service_actual_volumes(self, containers: List) -> List[Dict[str, Any]]:
        """Get actual volumes from service containers"""
        volumes = []
        for container in containers:
            for mount in container.get("mounts", []):
                if mount["type"] == "volume":
                    volumes.append({
                        "container": container["name"],
                        "volume": mount["name"],
                        "destination": mount["destination"],
                        "mode": mount["mode"]
                    })
        return volumes
    
    def _get_service_health_summary(self, containers: List) -> Dict[str, Any]:
        """Get health summary for a service"""
        if not containers:
            return {"status": "no_containers"}
        
        healthy = sum(1 for c in containers if c.get("health", {}).get("status") == "healthy")
        unhealthy = sum(1 for c in containers if c.get("health", {}).get("status") == "unhealthy")
        total = len(containers)
        
        if unhealthy > 0:
            return {"status": "unhealthy", "healthy": healthy, "unhealthy": unhealthy, "total": total}
        elif healthy > 0:
            return {"status": "healthy", "healthy": healthy, "unhealthy": unhealthy, "total": total}
        else:
            return {"status": "unknown", "healthy": healthy, "unhealthy": unhealthy, "total": total}


# Global service instance
unified_stack_service = UnifiedStackService()