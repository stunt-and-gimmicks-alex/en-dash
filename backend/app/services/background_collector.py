# Enhanced backend/app/services/background_collector.py
# Comprehensive hardware monitoring with temperature sensors, fan speeds, and per-container Docker stats

import asyncio
import logging
import time
import psutil
import json
import subprocess
import re
from pathlib import Path
from datetime import timedelta
from typing import Dict, List, Any, Optional
from .surreal_service import surreal_service
from .docker_unified import unified_stack_service

logger = logging.getLogger(__name__)

class EnhancedBackgroundCollector:
    def __init__(self):
        self.running = False
        self.docker_task = None
        self.stats_task = None
        self.docker_check_count = 0
        self.docker_changes_detected = 0
        
        # Cache for sensor paths and Docker client
        self._sensor_cache = None
        self._docker_client = None
        
    async def start(self):
        """Start background collection with separate tasks"""
        if self.running:
            return
            
        self.running = True
        # Initialize Docker client
        try:
            import docker
            self._docker_client = docker.from_env()
        except Exception as e:
            logger.warning(f"Docker client not available for stats: {e}")
            
        # Start both collection loops
        self.docker_task = asyncio.create_task(self._docker_collection_loop())
        self.stats_task = asyncio.create_task(self._stats_collection_loop())
        logger.info("🔄 Started enhanced background collection with hardware monitoring")
        
    async def stop(self):
        """Stop background collection"""
        self.running = False
        if self.docker_task:
            self.docker_task.cancel()
        if self.stats_task:
            self.stats_task.cancel()
        
        # Log summary stats
        if self.docker_check_count > 0:
            change_rate = (self.docker_changes_detected / self.docker_check_count) * 100
            logger.info(f"📊 Docker collection summary: {self.docker_changes_detected}/{self.docker_check_count} checks had changes ({change_rate:.1f}%)")

    async def _docker_collection_loop(self):
        """Collect Docker data every 30 seconds - but only write if changed"""
        from ..core.config import settings
        
        while self.running:
            try:
                if not settings.USE_SURREALDB:
                    await asyncio.sleep(30)
                    continue
                
                self.docker_check_count += 1
                
                # Collect current Docker state
                logger.debug(f"🔍 Docker collection check #{self.docker_check_count}")
                stacks = await unified_stack_service.get_all_unified_stacks()
                
                # Store in database - but only if changed
                changes_made = await surreal_service.store_unified_stacks(stacks)
                
                if changes_made:
                    self.docker_changes_detected += 1
                    logger.info(f"🔄 Docker state changed - wrote {len(stacks)} stacks to database")
                    
                    # Log which stacks are running for visibility
                    running_stacks = [s['name'] for s in stacks if s.get('status') == 'running']
                    if running_stacks:
                        logger.info(f"   📦 Running stacks: {', '.join(running_stacks)}")
                else:
                    logger.debug(f"✅ Docker state unchanged - skipped database write")
                
                # Wait 30 seconds before next check
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"❌ Docker collection error: {e}")
                await asyncio.sleep(5)

    async def _stats_collection_loop(self):
        """Collect enhanced system stats every 1 second"""
        from ..core.config import settings
        
        while self.running:
            try:
                if not settings.USE_SURREALDB:
                    await asyncio.sleep(1)
                    continue
                    
                # Collect comprehensive system stats
                await self._collect_enhanced_system_stats()
                
                # Wait 1 second before next collection
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Enhanced stats collection error: {e}")
                await asyncio.sleep(1)

    async def _collect_enhanced_system_stats(self):
        """Collect comprehensive system statistics with hardware monitoring"""
        try:
            stats_data = {
                "timestamp": time.time(),
                "collected_at": time.time(),
            }
            
            # === BASIC SYSTEM STATS ===
            basic_stats = await self._collect_basic_stats()
            stats_data.update(basic_stats)
            
            # === ENHANCED CPU MONITORING ===
            cpu_stats = await self._collect_enhanced_cpu_stats()
            stats_data["cpu_enhanced"] = cpu_stats
            
            # === ENHANCED MEMORY MONITORING ===
            memory_stats = await self._collect_enhanced_memory_stats()
            stats_data["memory_enhanced"] = memory_stats
            
            # === SSD TEMPERATURE MONITORING ===
            ssd_stats = await self._collect_ssd_temperature_stats()
            stats_data["ssd_temps"] = ssd_stats
            
            # === FAN SPEED MONITORING ===
            fan_stats = await self._collect_fan_stats()
            stats_data["fans"] = fan_stats
            
            # === PER-CONTAINER DOCKER STATS ===
            docker_stats = await self._collect_docker_container_stats()
            stats_data["docker_containers"] = docker_stats
            
            # Store in SurrealDB
            await surreal_service.store_system_stats(stats_data)
            
        except Exception as e:
            logger.error(f"Error collecting enhanced system stats: {e}")

    async def _collect_basic_stats(self) -> Dict[str, Any]:
        """Collect basic system stats (existing functionality)"""
        # CPU stats (overall)
        cpu_percent = psutil.cpu_percent(interval=None)  # Non-blocking
        
        # Memory stats
        memory = psutil.virtual_memory()
        
        # Disk stats
        disk = psutil.disk_usage('/')
        
        # Network stats
        network = psutil.net_io_counters()
        
        # Process count
        process_count = len(psutil.pids())
        
        # Load average
        try:
            load_avg = psutil.getloadavg()
        except AttributeError:
            load_avg = [0, 0, 0]  # Windows fallback
        
        return {
            "cpu": {
                "percent": cpu_percent,
                "load_avg_1m": load_avg[0],
                "load_avg_5m": load_avg[1],
                "load_avg_15m": load_avg[2],
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "percent": memory.percent,
                "free": memory.free,
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100,
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv,
            },
            "processes": {
                "count": process_count,
            },
            # Keep legacy fields for compatibility
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used_gb": round(memory.used / (1024**3), 2),
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "disk_percent": round((disk.used / disk.total) * 100, 2),
            "disk_used_gb": round(disk.used / (1024**3), 2),
            "disk_total_gb": round(disk.total / (1024**3), 2),
            "network_bytes_sent": network.bytes_sent,
            "network_bytes_recv": network.bytes_recv,
            "network_packets_sent": network.packets_sent,
            "network_packets_recv": network.packets_recv,
        }

    async def _collect_enhanced_cpu_stats(self) -> Dict[str, Any]:
        """Collect detailed CPU stats including per-core frequencies and temperatures"""
        try:
            cpu_stats = {
                "per_core_usage": [],
                "per_core_freq": [],
                "tctl_temp": None,
                "core_count": psutil.cpu_count(logical=False),
                "thread_count": psutil.cpu_count(logical=True),
            }
            
            # Per-core CPU usage
            per_cpu_percent = psutil.cpu_percent(interval=None, percpu=True)
            cpu_stats["per_core_usage"] = per_cpu_percent
            
            # Per-core frequencies
            try:
                cpu_freq_per_core = psutil.cpu_freq(percpu=True)
                if cpu_freq_per_core:
                    cpu_stats["per_core_freq"] = [
                        {
                            "current": freq.current,
                            "min": freq.min,
                            "max": freq.max
                        } for freq in cpu_freq_per_core
                    ]
            except Exception as e:
                logger.debug(f"Per-core frequency not available: {e}")
            
            # CPU temperature (Tctl for AMD)
            temps = await self._get_cpu_temperatures()
            if temps:
                cpu_stats.update(temps)
            
            return cpu_stats
            
        except Exception as e:
            logger.error(f"Error collecting enhanced CPU stats: {e}")
            return {}

    async def _collect_enhanced_memory_stats(self) -> Dict[str, Any]:
        """Collect detailed memory stats including temperature monitoring"""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            memory_stats = {
                "physical": {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "free": memory.free,
                    "percent": memory.percent,
                    "active": getattr(memory, 'active', 0),
                    "inactive": getattr(memory, 'inactive', 0),
                    "buffers": getattr(memory, 'buffers', 0),
                    "cached": getattr(memory, 'cached', 0),
                    "shared": getattr(memory, 'shared', 0),
                },
                "swap": {
                    "total": swap.total,
                    "used": swap.used,
                    "free": swap.free,
                    "percent": swap.percent,
                },
                "temperatures": {}
            }
            
            # Memory temperature monitoring (SPD5118 sensors)
            mem_temps = await self._get_memory_temperatures()
            if mem_temps:
                memory_stats["temperatures"] = mem_temps
            
            return memory_stats
            
        except Exception as e:
            logger.error(f"Error collecting enhanced memory stats: {e}")
            return {}

    async def _collect_ssd_temperature_stats(self) -> Dict[str, Any]:
        """Collect SSD temperatures using nvme and smartctl"""
        try:
            ssd_temps = {}
            
            # Method 1: Try nvme command for NVMe drives
            try:
                result = subprocess.run(
                    ['nvme', 'list'], 
                    capture_output=True, 
                    text=True, 
                    timeout=5
                )
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if '/dev/nvme' in line:
                            device = line.split()[0]
                            try:
                                temp_result = subprocess.run(
                                    ['nvme', 'smart-log', device],
                                    capture_output=True,
                                    text=True,
                                    timeout=5
                                )
                                if temp_result.returncode == 0:
                                    # Parse temperature from nvme smart-log output
                                    for temp_line in temp_result.stdout.split('\n'):
                                        if 'temperature' in temp_line.lower():
                                            # Extract temperature value (usually in format "temperature : 45 Celsius")
                                            temp_match = re.search(r'(\d+)', temp_line)
                                            if temp_match:
                                                device_name = device.split('/')[-1]  # nvme0n1 -> nvme0n1
                                                ssd_temps[device_name] = {
                                                    "composite_temp": float(temp_match.group(1)),
                                                    "device": device,
                                                    "method": "nvme"
                                                }
                                                break
                            except Exception as e:
                                logger.debug(f"Failed to get temperature for {device}: {e}")
            except FileNotFoundError:
                logger.debug("nvme command not found, trying alternative methods")
            
            # Method 2: Try hwmon sensors for NVME temperatures
            hwmon_temps = await self._get_hwmon_nvme_temperatures()
            ssd_temps.update(hwmon_temps)
            
            # Method 3: Try smartctl as fallback
            if not ssd_temps:
                smart_temps = await self._get_smartctl_temperatures()
                ssd_temps.update(smart_temps)
            
            return ssd_temps
            
        except Exception as e:
            logger.error(f"Error collecting SSD temperatures: {e}")
            return {}

    async def _collect_fan_stats(self) -> Dict[str, Any]:
        """Collect fan speeds from hwmon sensors"""
        try:
            fan_stats = {}
            
            # Look for fan sensors in /sys/class/hwmon
            hwmon_path = Path("/sys/class/hwmon")
            if hwmon_path.exists():
                for hwmon_dir in hwmon_path.iterdir():
                    if hwmon_dir.is_dir():
                        # Check for fan inputs
                        for fan_file in hwmon_dir.glob("fan*_input"):
                            try:
                                fan_speed = int(fan_file.read_text().strip())
                                fan_name = fan_file.name.replace('_input', '')
                                
                                # Try to get fan label if available
                                label_file = hwmon_dir / fan_file.name.replace('_input', '_label')
                                if label_file.exists():
                                    fan_label = label_file.read_text().strip()
                                else:
                                    fan_label = f"{hwmon_dir.name}_{fan_name}"
                                
                                fan_stats[fan_label] = {
                                    "speed_rpm": fan_speed,
                                    "sensor_path": str(fan_file),
                                    "hwmon": hwmon_dir.name
                                }
                            except Exception as e:
                                logger.debug(f"Failed to read fan sensor {fan_file}: {e}")
            
            return fan_stats
            
        except Exception as e:
            logger.error(f"Error collecting fan stats: {e}")
            return {}

    async def _collect_docker_container_stats(self) -> Dict[str, Any]:
        """Collect per-container resource usage stats"""
        try:
            if not self._docker_client:
                return {}
            
            container_stats = {}
            
            # Get all running containers
            containers = self._docker_client.containers.list()
            
            for container in containers:
                try:
                    # Get container stats (1 second sample)
                    stats = container.stats(stream=False)
                    
                    # Calculate CPU percentage
                    cpu_stats = self._calculate_cpu_percent(stats)
                    
                    # Calculate memory usage
                    memory_stats = self._calculate_memory_usage(stats)
                    
                    # Get network stats
                    network_stats = self._get_container_network_stats(stats)
                    
                    # Get storage stats
                    storage_stats = self._get_container_storage_stats(stats)
                    
                    container_stats[container.name] = {
                        "id": container.id[:12],
                        "image": container.image.tags[0] if container.image.tags else container.image.id[:12],
                        "status": container.status,
                        "cpu": cpu_stats,
                        "memory": memory_stats,
                        "network": network_stats,
                        "storage": storage_stats,
                        "compose_project": container.labels.get('com.docker.compose.project'),
                        "compose_service": container.labels.get('com.docker.compose.service'),
                    }
                    
                except Exception as e:
                    logger.debug(f"Failed to get stats for container {container.name}: {e}")
                    # Still record basic info even if stats fail
                    container_stats[container.name] = {
                        "id": container.id[:12],
                        "image": container.image.tags[0] if container.image.tags else container.image.id[:12],
                        "status": container.status,
                        "cpu": {"percent": 0},
                        "memory": {"usage_mb": 0, "percent": 0},
                        "network": {"rx_bytes": 0, "tx_bytes": 0},
                        "storage": {"read_mb": 0, "write_mb": 0},
                        "error": str(e)
                    }
            
            return container_stats
            
        except Exception as e:
            logger.error(f"Error collecting Docker container stats: {e}")
            return {}

    # === HELPER METHODS ===
    
    async def _get_cpu_temperatures(self) -> Dict[str, Any]:
        """Get CPU temperatures from various sources"""
        temps = {}
        
        # Try hwmon sensors first
        hwmon_path = Path("/sys/class/hwmon")
        if hwmon_path.exists():
            for hwmon_dir in hwmon_path.iterdir():
                if hwmon_dir.is_dir():
                    name_file = hwmon_dir / "name"
                    if name_file.exists():
                        sensor_name = name_file.read_text().strip()
                        
                        # Look for CPU temperature sensors
                        if any(cpu_id in sensor_name.lower() for cpu_id in ['k10temp', 'coretemp', 'cpu', 'tctl']):
                            for temp_file in hwmon_dir.glob("temp*_input"):
                                try:
                                    temp_raw = int(temp_file.read_text().strip())
                                    temp_celsius = temp_raw / 1000.0
                                    
                                    # Get temperature label if available
                                    label_file = hwmon_dir / temp_file.name.replace('_input', '_label')
                                    if label_file.exists():
                                        temp_label = label_file.read_text().strip()
                                    else:
                                        temp_label = f"{sensor_name}_{temp_file.name}"
                                    
                                    temps[temp_label] = temp_celsius
                                    
                                    # Special handling for AMD Tctl
                                    if 'tctl' in temp_label.lower():
                                        temps['tctl_temp'] = temp_celsius
                                        
                                except Exception as e:
                                    logger.debug(f"Failed to read temperature sensor {temp_file}: {e}")
        
        return {"temperatures": temps} if temps else {}

    async def _get_memory_temperatures(self) -> Dict[str, Any]:
        """Get memory temperatures from SPD5118 sensors"""
        temps = {}
        
        hwmon_path = Path("/sys/class/hwmon")
        if hwmon_path.exists():
            for hwmon_dir in hwmon_path.iterdir():
                if hwmon_dir.is_dir():
                    name_file = hwmon_dir / "name"
                    if name_file.exists():
                        sensor_name = name_file.read_text().strip()
                        
                        # Look for SPD5118 memory temperature sensors
                        if 'spd5118' in sensor_name.lower():
                            for temp_file in hwmon_dir.glob("temp*_input"):
                                try:
                                    temp_raw = int(temp_file.read_text().strip())
                                    temp_celsius = temp_raw / 1000.0
                                    
                                    # Build meaningful name for memory stick
                                    temp_id = temp_file.name.replace('_input', '')
                                    stick_name = f"dimm_{hwmon_dir.name}_{temp_id}"
                                    
                                    temps[stick_name] = temp_celsius
                                    
                                except Exception as e:
                                    logger.debug(f"Failed to read memory temperature {temp_file}: {e}")
        
        return temps

    async def _get_hwmon_nvme_temperatures(self) -> Dict[str, Any]:
        """Get NVMe temperatures from hwmon"""
        temps = {}
        
        hwmon_path = Path("/sys/class/hwmon")
        if hwmon_path.exists():
            for hwmon_dir in hwmon_path.iterdir():
                if hwmon_dir.is_dir():
                    name_file = hwmon_dir / "name"
                    if name_file.exists():
                        sensor_name = name_file.read_text().strip()
                        
                        # Look for NVMe sensors
                        if 'nvme' in sensor_name.lower():
                            for temp_file in hwmon_dir.glob("temp*_input"):
                                try:
                                    temp_raw = int(temp_file.read_text().strip())
                                    temp_celsius = temp_raw / 1000.0
                                    
                                    # Get composite temperature (usually temp1)
                                    if 'temp1' in temp_file.name:
                                        temps[sensor_name] = {
                                            "composite_temp": temp_celsius,
                                            "device": sensor_name,
                                            "method": "hwmon"
                                        }
                                        
                                except Exception as e:
                                    logger.debug(f"Failed to read NVMe temperature {temp_file}: {e}")
        
        return temps

    async def _get_smartctl_temperatures(self) -> Dict[str, Any]:
        """Fallback: Get SSD temperatures using smartctl"""
        temps = {}
        
        try:
            # Find NVMe and SATA drives
            for device_path in [Path("/dev").glob("nvme*n1"), Path("/dev").glob("sd[a-z]")]:
                for device in device_path:
                    try:
                        result = subprocess.run(
                            ['smartctl', '-A', str(device)],
                            capture_output=True,
                            text=True,
                            timeout=10
                        )
                        
                        if result.returncode == 0:
                            # Parse smartctl output for temperature
                            for line in result.stdout.split('\n'):
                                if 'temperature' in line.lower() or 'temp' in line.lower():
                                    temp_match = re.search(r'(\d+)', line)
                                    if temp_match:
                                        device_name = device.name
                                        temps[device_name] = {
                                            "composite_temp": float(temp_match.group(1)),
                                            "device": str(device),
                                            "method": "smartctl"
                                        }
                                        break
                                        
                    except Exception as e:
                        logger.debug(f"Failed to get smartctl temperature for {device}: {e}")
                        
        except Exception as e:
            logger.debug(f"smartctl not available: {e}")
        
        return temps

    def _calculate_cpu_percent(self, stats: Dict) -> Dict[str, float]:
        """Calculate CPU percentage from Docker stats"""
        try:
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            
            if system_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * \
                             len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100
            else:
                cpu_percent = 0.0
                
            return {"percent": round(cpu_percent, 2)}
            
        except (KeyError, ZeroDivisionError):
            return {"percent": 0.0}

    def _calculate_memory_usage(self, stats: Dict) -> Dict[str, Any]:
        """Calculate memory usage from Docker stats"""
        try:
            memory_usage = stats['memory_stats'].get('usage', 0)
            memory_limit = stats['memory_stats'].get('limit', 0)
            
            if memory_limit > 0:
                memory_percent = (memory_usage / memory_limit) * 100
            else:
                memory_percent = 0.0
                
            return {
                "usage_bytes": memory_usage,
                "usage_mb": round(memory_usage / (1024*1024), 2),
                "limit_bytes": memory_limit,
                "limit_mb": round(memory_limit / (1024*1024), 2),
                "percent": round(memory_percent, 2)
            }
            
        except KeyError:
            return {"usage_mb": 0, "percent": 0}

    def _get_container_network_stats(self, stats: Dict) -> Dict[str, Any]:
        """Get network stats from Docker container"""
        try:
            networks = stats.get('networks', {})
            total_rx = sum(net.get('rx_bytes', 0) for net in networks.values())
            total_tx = sum(net.get('tx_bytes', 0) for net in networks.values())
            
            return {
                "rx_bytes": total_rx,
                "tx_bytes": total_tx,
                "rx_mb": round(total_rx / (1024*1024), 2),
                "tx_mb": round(total_tx / (1024*1024), 2)
            }
            
        except KeyError:
            return {"rx_bytes": 0, "tx_bytes": 0, "rx_mb": 0, "tx_mb": 0}

    def _get_container_storage_stats(self, stats: Dict) -> Dict[str, Any]:
        """Get storage I/O stats from Docker container"""
        try:
            blkio_stats = stats.get('blkio_stats', {})
            
            # Read bytes
            read_bytes = 0
            for stat in blkio_stats.get('io_service_bytes_recursive', []):
                if stat.get('op') == 'Read':
                    read_bytes += stat.get('value', 0)
            
            # Write bytes  
            write_bytes = 0
            for stat in blkio_stats.get('io_service_bytes_recursive', []):
                if stat.get('op') == 'Write':
                    write_bytes += stat.get('value', 0)
            
            return {
                "read_bytes": read_bytes,
                "write_bytes": write_bytes,
                "read_mb": round(read_bytes / (1024*1024), 2),
                "write_mb": round(write_bytes / (1024*1024), 2)
            }
            
        except KeyError:
            return {"read_bytes": 0, "write_bytes": 0, "read_mb": 0, "write_mb": 0}

# Global instance
background_collector = EnhancedBackgroundCollector()