# backend/app/services/config_aggregator.py
# Compatible with existing UnifiedStack structure

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass 
class AggregatedNetworkConfig:
    name: str = "Not set"
    level: str = "stack"  # stack, service, container
    source: str = "unknown"
    details: Dict[str, Any] = field(default_factory=dict)
    attached_services: List[str] = field(default_factory=list)
    conflicts: bool = False

@dataclass
class AggregatedPortConfig:
    host: str = "Not set"
    container: str = "Not set" 
    protocol: str = "tcp"
    level: str = "service"  # service, container
    source: str = "unknown"
    conflicts: bool = False
    description: str = "No description available"
    details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AggregatedVolumeConfig:
    name: str = "Not set"
    host_path: str = "Not set"
    container_path: str = "Not set"
    mode: str = "rw"
    type: str = "named"  # named, bind, tmpfs
    level: str = "service"  # stack, service, container
    source: str = "unknown"
    shared_by: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AggregatedEnvironmentConfig:
    key: str = "Not set"
    value: str = "Not set"
    level: str = "service"  # service, container
    source: str = "unknown"
    is_secret: bool = False
    category: str = "custom"  # database, auth, config, system, custom
    description: str = "No description available"

@dataclass
class AggregatedLabelConfig:
    key: str = "Not set"
    value: str = "Not set"
    level: str = "stack"  # stack, service, container
    source: str = "unknown"
    category: str = "custom"  # system, custom, compose, extension

@dataclass
class AggregatedConfigs:
    networks: List[AggregatedNetworkConfig] = field(default_factory=list)
    ports: List[AggregatedPortConfig] = field(default_factory=list) 
    volumes: List[AggregatedVolumeConfig] = field(default_factory=list)
    environment: List[AggregatedEnvironmentConfig] = field(default_factory=list)
    labels: List[AggregatedLabelConfig] = field(default_factory=list)

class ConfigAggregatorService:
    """
    Aggregates configurations from your existing UnifiedStack structure.
    Works with your current UnifiedNetworks, ActualPort[], etc.
    """
    
    def __init__(self):
        self.secret_patterns = [
            'password', 'secret', 'key', 'token', 'auth', 'credential',
            'passwd', 'pwd', 'api_key', 'apikey', 'private'
        ]
    
    def aggregate_stack_configs(self, stack_data: Dict[str, Any]) -> AggregatedConfigs:
        """
        Aggregate configurations from your existing UnifiedStack structure.
        Returns safe defaults if any step fails.
        """
        try:
            aggregated = AggregatedConfigs()
            stack_name = self._safe_get(stack_data, 'name', 'unknown-stack')
            
            # Process networks from your existing UnifiedNetworks structure
            self._process_unified_networks(aggregated, stack_data, stack_name)
            
            # Process ports from existing ActualPort[] arrays
            self._process_actual_ports(aggregated, stack_data)
            
            # Process volumes from your existing UnifiedVolumes structure  
            self._process_unified_volumes(aggregated, stack_data, stack_name)
            
            # Process environment variables from services
            self._process_service_environment(aggregated, stack_data)
            
            # Process labels from services and containers
            self._process_labels(aggregated, stack_data, stack_name)
            
            # Post-process for conflicts and sharing
            self._detect_conflicts_and_sharing(aggregated)
            
            return aggregated
            
        except Exception as e:
            logger.error(f"Error aggregating stack configs: {e}")
            return AggregatedConfigs()  # Safe empty config
    
    def aggregate_service_configs(self, service_data: Dict[str, Any]) -> AggregatedConfigs:
        """
        Aggregate configurations for a single service from your structure.
        """
        try:
            aggregated = AggregatedConfigs()
            service_name = self._safe_get(service_data, 'name', 'unknown-service')
            
            # Process service-specific data
            self._process_service_networks(aggregated, service_data, service_name)
            self._process_service_ports(aggregated, service_data, service_name) 
            self._process_service_volumes(aggregated, service_data, service_name)
            self._process_service_environment_single(aggregated, service_data, service_name)
            self._process_service_labels(aggregated, service_data, service_name)
            
            return aggregated
            
        except Exception as e:
            logger.error(f"Error aggregating service configs: {e}")
            return AggregatedConfigs()
    
    def _process_unified_networks(self, aggregated: AggregatedConfigs, stack_data: Dict[str, Any], stack_name: str):
        """Process networks from your existing UnifiedNetworks structure"""
        try:
            networks = self._safe_get(stack_data, 'networks', {})
            
            # Process from networks.all (your UnifiedNetworkItem[])
            all_networks = self._safe_get(networks, 'all', [])
            if isinstance(all_networks, list):
                for network_item in all_networks:
                    if not isinstance(network_item, dict):
                        continue
                        
                    network_name = self._safe_get(network_item, 'network', 'unknown')
                    sources = self._safe_get(network_item, 'sources', [])
                    
                    aggregated.networks.append(AggregatedNetworkConfig(
                        name=str(network_name),
                        level="stack",
                        source=stack_name,
                        details=network_item,
                        attached_services=self._extract_attached_services(network_item)
                    ))
            
            # Also process from services level
            services = self._safe_get(stack_data, 'services', {})
            if isinstance(services, dict):
                for service_name, service_data in services.items():
                    actual_networks = self._safe_get(service_data, 'actual_networks', [])
                    if isinstance(actual_networks, list):
                        for network in actual_networks:
                            aggregated.networks.append(AggregatedNetworkConfig(
                                name=str(network),
                                level="service", 
                                source=str(service_name),
                                attached_services=[str(service_name)]
                            ))
        
        except Exception as e:
            logger.warning(f"Error processing unified networks: {e}")
    
    def _process_actual_ports(self, aggregated: AggregatedConfigs, stack_data: Dict[str, Any]):
        """Process ports from your existing ActualPort[] arrays"""
        try:
            services = self._safe_get(stack_data, 'services', {})
            if isinstance(services, dict):
                for service_name, service_data in services.items():
                    actual_ports = self._safe_get(service_data, 'actual_ports', [])
                    if isinstance(actual_ports, list):
                        for port in actual_ports:
                            if not isinstance(port, dict):
                                continue
                                
                            aggregated.ports.append(AggregatedPortConfig(
                                host=str(self._safe_get(port, 'host_port', 'Not set')),
                                container=str(self._safe_get(port, 'container_port', 'Not set')),
                                protocol=str(self._safe_get(port, 'protocol', 'tcp')),
                                level="service",
                                source=str(service_name),
                                details=port
                            ))
        
        except Exception as e:
            logger.warning(f"Error processing actual ports: {e}")
    
    def _process_unified_volumes(self, aggregated: AggregatedConfigs, stack_data: Dict[str, Any], stack_name: str):
        """Process volumes from your existing UnifiedVolumes structure"""
        try:
            volumes = self._safe_get(stack_data, 'volumes', {})
            
            # Process from volumes.all (your UnifiedVolumeItem[])
            all_volumes = self._safe_get(volumes, 'all', [])
            if isinstance(all_volumes, list):
                for volume_item in all_volumes:
                    if not isinstance(volume_item, dict):
                        continue
                        
                    volume_name = self._safe_get(volume_item, 'volume', 'unknown')
                    
                    aggregated.volumes.append(AggregatedVolumeConfig(
                        name=str(volume_name),
                        level="stack",
                        source=stack_name,
                        details=volume_item,
                        shared_by=self._extract_volume_users(volume_item)
                    ))
            
            # Also process from services level
            services = self._safe_get(stack_data, 'services', {})
            if isinstance(services, dict):
                for service_name, service_data in services.items():
                    actual_volumes = self._safe_get(service_data, 'actual_volumes', [])
                    if isinstance(actual_volumes, list):
                        for volume in actual_volumes:
                            if not isinstance(volume, dict):
                                continue
                                
                            aggregated.volumes.append(AggregatedVolumeConfig(
                                name=str(self._safe_get(volume, 'volume', 'Not set')),
                                container_path=str(self._safe_get(volume, 'destination', 'Not set')),
                                mode=str(self._safe_get(volume, 'mode', 'rw')),
                                level="service",
                                source=str(service_name),
                                details=volume
                            ))
        
        except Exception as e:
            logger.warning(f"Error processing unified volumes: {e}")
    
    def _process_service_environment(self, aggregated: AggregatedConfigs, stack_data: Dict[str, Any]):
        """Process environment variables from services"""
        try:
            services = self._safe_get(stack_data, 'services', {})
            if isinstance(services, dict):
                for service_name, service_data in services.items():
                    environment = self._safe_get(service_data, 'environment', {})
                    if isinstance(environment, dict):
                        for key, value in environment.items():
                            aggregated.environment.append(AggregatedEnvironmentConfig(
                                key=str(key),
                                value=str(value) if value is not None else "Not set",
                                level="service",
                                source=str(service_name),
                                is_secret=self._is_secret_var(str(key)),
                                category=self._categorize_env_var(str(key))
                            ))
        
        except Exception as e:
            logger.warning(f"Error processing service environment: {e}")
    
    def _process_labels(self, aggregated: AggregatedConfigs, stack_data: Dict[str, Any], stack_name: str):
        """Process labels from services and containers"""
        try:
            # Service labels
            services = self._safe_get(stack_data, 'services', {})
            if isinstance(services, dict):
                for service_name, service_data in services.items():
                    labels = self._safe_get(service_data, 'labels', {})
                    if isinstance(labels, dict):
                        for key, value in labels.items():
                            aggregated.labels.append(AggregatedLabelConfig(
                                key=str(key),
                                value=str(value) if value is not None else "Not set",
                                level="service",
                                source=str(service_name),
                                category=self._categorize_label(str(key))
                            ))
            
            # Container labels
            containers = self._safe_get(stack_data, 'containers', {})
            container_list = self._safe_get(containers, 'containers', [])
            if isinstance(container_list, list):
                for container in container_list:
                    if not isinstance(container, dict):
                        continue
                        
                    container_name = self._safe_get(container, 'name', 'unknown')
                    labels = self._safe_get(container, 'labels', {})
                    if isinstance(labels, dict):
                        for key, value in labels.items():
                            aggregated.labels.append(AggregatedLabelConfig(
                                key=str(key),
                                value=str(value) if value is not None else "Not set",
                                level="container",
                                source=str(container_name),
                                category=self._categorize_label(str(key))
                            ))
        
        except Exception as e:
            logger.warning(f"Error processing labels: {e}")
    
    def _detect_conflicts_and_sharing(self, aggregated: AggregatedConfigs):
        """Detect port conflicts and volume sharing"""
        try:
            # Port conflicts
            host_ports = {}
            for port in aggregated.ports:
                if port.host == "Not set":
                    continue
                    
                port_key = f"{port.host}:{port.protocol}"
                if port_key in host_ports:
                    port.conflicts = True
                    host_ports[port_key].conflicts = True
                else:
                    host_ports[port_key] = port
            
            # Volume sharing
            volume_usage = {}
            for volume in aggregated.volumes:
                volume_key = f"{volume.type}:{volume.name}"
                if volume_key not in volume_usage:
                    volume_usage[volume_key] = []
                volume_usage[volume_key].append(volume)
            
            for volumes in volume_usage.values():
                if len(volumes) > 1:
                    shared_by = [v.source for v in volumes]
                    for volume in volumes:
                        volume.shared_by = shared_by
        
        except Exception as e:
            logger.warning(f"Error detecting conflicts and sharing: {e}")
    
    # Helper methods
    def _extract_attached_services(self, network_item: Dict[str, Any]) -> List[str]:
        """Extract services attached to a network"""
        try:
            details = self._safe_get(network_item, 'details', {})
            containers = self._safe_get(details, 'containers', {})
            container_list = self._safe_get(containers, 'containers', [])
            
            services = set()
            if isinstance(container_list, list):
                for container in container_list:
                    service = self._safe_get(container, 'service')
                    if service:
                        services.add(str(service))
            
            return list(services)
        except:
            return []
    
    def _extract_volume_users(self, volume_item: Dict[str, Any]) -> List[str]:
        """Extract services using a volume"""
        try:
            details = self._safe_get(volume_item, 'details', {})
            containers = self._safe_get(details, 'containers', {})
            container_list = self._safe_get(containers, 'containers', [])
            
            services = set()
            if isinstance(container_list, list):
                for container in container_list:
                    service = self._safe_get(container, 'service')
                    if service:
                        services.add(str(service))
            
            return list(services)
        except:
            return []
    
    def _is_secret_var(self, key: str) -> bool:
        """Check if environment variable might contain secrets"""
        try:
            key_lower = str(key).lower()
            return any(pattern in key_lower for pattern in self.secret_patterns)
        except:
            return False
    
    def _categorize_env_var(self, key: str) -> str:
        """Categorize environment variables"""
        try:
            key_lower = str(key).lower()
            if any(pattern in key_lower for pattern in ['db', 'database', 'sql', 'mongo', 'redis']):
                return "database"
            elif any(pattern in key_lower for pattern in ['auth', 'token', 'jwt', 'oauth']):
                return "auth"
            elif any(pattern in key_lower for pattern in ['config', 'conf', 'cfg']):
                return "config"
            elif key_lower.startswith(('docker_', 'compose_')):
                return "system"
            else:
                return "custom"
        except:
            return "custom"
    
    def _categorize_label(self, key: str) -> str:
        """Categorize labels"""
        try:
            key_lower = str(key).lower()
            if key_lower.startswith(('com.docker.', 'org.opencontainers.')):
                return "system"
            elif key_lower.startswith('x-'):
                return "extension"
            elif key_lower.startswith(('traefik.', 'nginx.')):
                return "compose"
            else:
                return "custom"
        except:
            return "custom"
    
    def _safe_get(self, data: Any, key: str, default: Any = None) -> Any:
        """Safely get value from dict-like object"""
        try:
            if isinstance(data, dict):
                return data.get(key, default)
            return default
        except:
            return default
    
    # ... (additional helper methods for service-specific processing)
    def _process_service_networks(self, aggregated: AggregatedConfigs, service_data: Dict[str, Any], service_name: str):
        """Process networks for a single service"""
        # Implementation similar to above but service-specific
        pass
    
    def _process_service_ports(self, aggregated: AggregatedConfigs, service_data: Dict[str, Any], service_name: str):
        """Process ports for a single service"""
        # Implementation similar to above but service-specific  
        pass
    
    def _process_service_volumes(self, aggregated: AggregatedConfigs, service_data: Dict[str, Any], service_name: str):
        """Process volumes for a single service"""
        # Implementation similar to above but service-specific
        pass
    
    def _process_service_environment_single(self, aggregated: AggregatedConfigs, service_data: Dict[str, Any], service_name: str):
        """Process environment for a single service"""
        # Implementation similar to above but service-specific
        pass
    
    def _process_service_labels(self, aggregated: AggregatedConfigs, service_data: Dict[str, Any], service_name: str):
        """Process labels for a single service"""
        # Implementation similar to above but service-specific
        pass

# Create singleton instance
config_aggregator = ConfigAggregatorService()