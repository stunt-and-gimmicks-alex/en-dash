from surrealdb import Surreal, AsyncSurreal
from datetime import datetime, timezone, timedelta
import asyncio
import logging
from ..core.config import settings
import json
from surrealdb.data import RecordID, Table
from typing import Any, Callable, Dict, List, Optional
import queue
import threading

logger = logging.getLogger(__name__)

def serialize_surrealdb_objects(obj: Any) -> Any:
    """
    Recursively convert SurrealDB objects to JSON-serializable types
    """
    if isinstance(obj, RecordID):
        return str(obj)
    elif isinstance(obj, Table):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: serialize_surrealdb_objects(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_surrealdb_objects(item) for item in obj]
    elif isinstance(obj, tuple):
        return [serialize_surrealdb_objects(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

class SurrealDBService:
    def __init__(self):
        self.db = None
        self.connected = False
        self.live_queries: Dict[str, Dict] = {}  # Track active live queries with callbacks
        self._connection_lock = asyncio.Lock()  # ADD THIS LINE - Prevent concurrent connections
        self._last_stacks_hash = None  # Track last state
        
    async def connect(self):
        # Use async lock to prevent concurrent connection attempts
        async with self._connection_lock:
            # If already connected while waiting for lock, return
            if self.connected and self.db:
                return
                
            try:
                # Create async connection
                self.db = AsyncSurreal(settings.SURREALDB_URL)
                
#               # Authenticate
#                await self.db.signin({
#                    "user": settings.SURREALDB_USER, 
#                    "pass": settings.SURREALDB_PASS
#                })
                
                # Use namespace and database
                await self.db.use(settings.SURREALDB_NS, settings.SURREALDB_DB)
                
                self.connected = True
                logger.info(f"✅ Connected to SurrealDB at {settings.SURREALDB_URL}")
                
            except Exception as e:
                logger.error(f"❌ Failed to connect to SurrealDB: {e}")
                self.connected = False
                self.db = None  # Reset db on failure

    async def store_unified_stacks(self, stacks_data: List[Dict[str, Any]]):
        """Store unified stacks data in SurrealDB - ONLY if changed"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            return False  # Return False to indicate no storage
            
        try:
            # Calculate hash of current stack data for change detection
            # Sort by name to ensure consistent hashing
            sorted_stacks = sorted(stacks_data, key=lambda x: x.get('name', ''))
            
            # Create hash from essential stack data (excluding timestamps)
            stack_essence = []
            for stack in sorted_stacks:
                essence = {
                    'name': stack.get('name'),
                    'status': stack.get('status'),
                    'containers': stack.get('containers', {}),
                    'services': {name: {
                        'status': svc.get('status'),
                        'container_id': svc.get('container_id')
                    } for name, svc in stack.get('services', {}).items()},
                    'stats': stack.get('stats', {}),
                }
                stack_essence.append(essence)
            
            # Calculate hash
            current_hash = hashlib.sha256(
                json.dumps(stack_essence, sort_keys=True, default=str).encode()
            ).hexdigest()
            
            # Check if data has actually changed
            if self._last_stacks_hash == current_hash:
                logger.debug("🔄 Stack data unchanged, skipping database write")
                return False  # No changes detected
            
            logger.info(f"📝 Stack data changed, updating database (hash: {current_hash[:8]}...)")
            
            # Get existing stacks from database
            existing_stacks = await self.db.select("unified_stack")
            existing_by_name = {stack.get('name'): stack for stack in (existing_stacks or [])}
            
            current_stack_names = {stack['name'] for stack in stacks_data}
            existing_stack_names = set(existing_by_name.keys())
            
            # Track actual changes made
            changes_made = False
            
            # 1. Update or create stacks that exist in current data
            for stack in stacks_data:
                stack_name = stack['name']
                stack_with_timestamp = {
                    **stack,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if stack_name in existing_by_name:
                    # Update existing stack - but only if it actually changed
                    existing_stack = existing_by_name[stack_name]
                    
                    # Compare essential fields to see if update is needed
                    needs_update = (
                        existing_stack.get('status') != stack.get('status') or
                        existing_stack.get('containers') != stack.get('containers') or
                        existing_stack.get('services') != stack.get('services') or
                        existing_stack.get('stats') != stack.get('stats')
                    )
                    
                    if needs_update:
                        await self.db.update(f"unified_stack:{stack_name}", stack_with_timestamp)
                        logger.debug(f"  ✏️ Updated stack: {stack_name}")
                        changes_made = True
                    else:
                        logger.debug(f"  ⏭️ Stack unchanged: {stack_name}")
                else:
                    # Create new stack
                    await self.db.create(f"unified_stack:{stack_name}", stack_with_timestamp)
                    logger.info(f"  ➕ Created new stack: {stack_name}")
                    changes_made = True
            
            # 2. Delete stacks that no longer exist
            stacks_to_delete = existing_stack_names - current_stack_names
            for stack_name in stacks_to_delete:
                await self.db.delete(f"unified_stack:{stack_name}")
                logger.info(f"  🗑️ Deleted removed stack: {stack_name}")
                changes_made = True
            
            # Update hash only if we made changes
            if changes_made:
                self._last_stacks_hash = current_hash
                logger.info(f"✅ Stack storage complete - {len(stacks_data)} stacks, changes made")
                return True
            else:
                logger.debug("✅ Stack storage complete - no changes needed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to store unified stacks in SurrealDB: {e}")
            return False

    async def store_unified_stacks_with_detailed_logging(self, stacks_data: List[Dict[str, Any]]):
        """Enhanced version with detailed change logging for debugging"""
        result = await self.store_unified_stacks(stacks_data)
        
        if result:
            # Log summary of what changed
            stack_names = [s['name'] for s in stacks_data]
            running_stacks = [s['name'] for s in stacks_data if s.get('status') == 'running']
            logger.info(f"📊 Stack summary: {len(running_stacks)}/{len(stack_names)} running: {running_stacks}")
        
        return result

    async def get_unified_stacks(self):
        """Get all unified stacks from SurrealDB"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            return []
            
        try:
            result = await self.db.select("unified_stack")
            return serialize_surrealdb_objects(result) if result else []
        except Exception as e:
            logger.error(f"❌ Failed to get unified stacks from SurrealDB: {e}")
            return []

    async def store_system_stats(self, stats_data: dict):
        """Store system statistics with timestamp"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            logger.error("❌ Cannot store system stats - SurrealDB not connected")
            return
            
        try:
            # Add timestamp to the stats
            stats_with_timestamp = {
                **stats_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "collected_at": datetime.now(timezone.utc).isoformat()
            }
            
            
            # Store the stats record
            result = await self.db.create("system_stats", stats_with_timestamp)
            
            
        except Exception as e:
            logger.error(f"❌ Failed to store system stats in SurrealDB: {e}")
            import traceback
            traceback.print_exc()

    async def get_system_stats(self, hours_back: int = 24):
        """Get system statistics from the last N hours"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            logger.error("❌ Cannot get system stats - SurrealDB not connected")
            return []
            
        try:
            # Calculate time threshold - use simpler format
            time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours_back)
            
            # Use corrected query format
            query = f"SELECT * FROM system_stats ORDER BY timestamp DESC LIMIT 10"
            
            result = await self.db.query(query)
            
            # Handle SurrealDB response format - FIXED
            if isinstance(result, list) and len(result) > 0:
                # The result is already a list of stats records, not wrapped!
                stats_data = result
                
                if isinstance(stats_data, list) and len(stats_data) > 0:
                    return serialize_surrealdb_objects(stats_data)
                    
            return []
            
        except Exception as e:
            logger.error(f"❌ Failed to get system stats from SurrealDB: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def get_enhanced_system_stats(self, hours_back: int = 24) -> List[Dict[str, Any]]:
        """Get enhanced system statistics including hardware monitoring data"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            logger.error("❌ Cannot get enhanced system stats - SurrealDB not connected")
            return []
            
        try:
            # Calculate time threshold
            time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours_back)
            
            # Get recent enhanced stats
            query = f"SELECT * FROM system_stats ORDER BY timestamp DESC LIMIT 1000"
            
            result = await self.db.query(query)
            
            if isinstance(result, list) and len(result) > 0:
                stats_data = result
                
                if isinstance(stats_data, list) and len(stats_data) > 0:
                    return serialize_surrealdb_objects(stats_data)
                    
            return []
            
        except Exception as e:
            logger.error(f"❌ Failed to get enhanced system stats from SurrealDB: {e}")
            return []

    async def get_cpu_core_history(self, hours_back: int = 6) -> List[Dict[str, Any]]:
        """Get per-core CPU usage history for dashboard charts"""
        try:
            stats = await self.get_enhanced_system_stats(hours_back)
            
            core_history = []
            for stat in stats:
                if 'cpu_enhanced' in stat and 'per_core_usage' in stat['cpu_enhanced']:
                    core_data = {
                        'timestamp': stat.get('timestamp'),
                        'collected_at': stat.get('collected_at'),
                        'cores': stat['cpu_enhanced']['per_core_usage']
                    }
                    core_history.append(core_data)
            
            return core_history
            
        except Exception as e:
            logger.error(f"❌ Failed to get CPU core history: {e}")
            return []

    async def get_temperature_history(self, hours_back: int = 6) -> Dict[str, List[Dict[str, Any]]]:
        """Get temperature history for all sensors (CPU, Memory, SSD)"""
        try:
            stats = await self.get_enhanced_system_stats(hours_back)
            
            temp_history = {
                'cpu_temps': [],
                'memory_temps': [],
                'ssd_temps': []
            }
            
            for stat in stats:
                timestamp = stat.get('timestamp')
                collected_at = stat.get('collected_at')
                
                # CPU temperatures
                if 'cpu_enhanced' in stat and 'temperatures' in stat['cpu_enhanced']:
                    cpu_temp_data = {
                        'timestamp': timestamp,
                        'collected_at': collected_at,
                        'temperatures': stat['cpu_enhanced']['temperatures']
                    }
                    temp_history['cpu_temps'].append(cpu_temp_data)
                
                # Memory temperatures
                if 'memory_enhanced' in stat and 'temperatures' in stat['memory_enhanced']:
                    mem_temp_data = {
                        'timestamp': timestamp,
                        'collected_at': collected_at,
                        'temperatures': stat['memory_enhanced']['temperatures']
                    }
                    temp_history['memory_temps'].append(mem_temp_data)
                
                # SSD temperatures
                if 'ssd_temps' in stat:
                    ssd_temp_data = {
                        'timestamp': timestamp,
                        'collected_at': collected_at,
                        'temperatures': stat['ssd_temps']
                    }
                    temp_history['ssd_temps'].append(ssd_temp_data)
            
            return temp_history
            
        except Exception as e:
            logger.error(f"❌ Failed to get temperature history: {e}")
            return {'cpu_temps': [], 'memory_temps': [], 'ssd_temps': []}

    async def get_fan_speed_history(self, hours_back: int = 6) -> List[Dict[str, Any]]:
        """Get fan speed history for dashboard charts"""
        try:
            stats = await self.get_enhanced_system_stats(hours_back)
            
            fan_history = []
            for stat in stats:
                if 'fans' in stat:
                    fan_data = {
                        'timestamp': stat.get('timestamp'),
                        'collected_at': stat.get('collected_at'),
                        'fans': stat['fans']
                    }
                    fan_history.append(fan_data)
            
            return fan_history
            
        except Exception as e:
            logger.error(f"❌ Failed to get fan speed history: {e}")
            return []

    async def get_docker_container_history(self, hours_back: int = 6, container_name: str = None) -> List[Dict[str, Any]]:
        """Get Docker container resource usage history"""
        try:
            stats = await self.get_enhanced_system_stats(hours_back)
            
            container_history = []
            for stat in stats:
                if 'docker_containers' in stat:
                    if container_name:
                        # Get specific container
                        if container_name in stat['docker_containers']:
                            container_data = {
                                'timestamp': stat.get('timestamp'),
                                'collected_at': stat.get('collected_at'),
                                'container': stat['docker_containers'][container_name]
                            }
                            container_history.append(container_data)
                    else:
                        # Get all containers
                        container_data = {
                            'timestamp': stat.get('timestamp'),
                            'collected_at': stat.get('collected_at'),
                            'containers': stat['docker_containers']
                        }
                        container_history.append(container_data)
            
            return container_history
            
        except Exception as e:
            logger.error(f"❌ Failed to get Docker container history: {e}")
            return []

    async def get_available_sensors(self) -> Dict[str, List[str]]:
        """Get list of available sensors for dashboard configuration"""
        try:
            # Get recent stats to see what sensors are available
            recent_stats = await self.get_enhanced_system_stats(hours_back=1)
            
            if not recent_stats:
                return {
                    'cpu_temps': [],
                    'memory_temps': [],
                    'ssd_temps': [],
                    'fans': [],
                    'docker_containers': []
                }
            
            # Use the most recent stat to get available sensors
            latest_stat = recent_stats[0]
            
            sensors = {
                'cpu_temps': [],
                'memory_temps': [],
                'ssd_temps': [],
                'fans': [],
                'docker_containers': []
            }
            
            # CPU temperature sensors
            if 'cpu_enhanced' in latest_stat and 'temperatures' in latest_stat['cpu_enhanced']:
                sensors['cpu_temps'] = list(latest_stat['cpu_enhanced']['temperatures'].keys())
            
            # Memory temperature sensors
            if 'memory_enhanced' in latest_stat and 'temperatures' in latest_stat['memory_enhanced']:
                sensors['memory_temps'] = list(latest_stat['memory_enhanced']['temperatures'].keys())
            
            # SSD temperature sensors
            if 'ssd_temps' in latest_stat:
                sensors['ssd_temps'] = list(latest_stat['ssd_temps'].keys())
            
            # Fan sensors
            if 'fans' in latest_stat:
                sensors['fans'] = list(latest_stat['fans'].keys())
            
            # Docker containers
            if 'docker_containers' in latest_stat:
                sensors['docker_containers'] = list(latest_stat['docker_containers'].keys())
            
            return sensors
            
        except Exception as e:
            logger.error(f"❌ Failed to get available sensors: {e}")
            return {
                'cpu_temps': [],
                'memory_temps': [],
                'ssd_temps': [],
                'fans': [],
                'docker_containers': []
            }

    async def get_metric_history(self, metric_path: str, hours_back: int = 6) -> List[Dict[str, Any]]:
        """
        Get history for a specific metric using dot notation path
        
        Examples:
        - "cpu_enhanced.temperatures.tctl_temp" for CPU temperature
        - "memory_enhanced.temperatures.dimm_hwmon3_temp1" for memory temp
        - "ssd_temps.nvme0n1.composite_temp" for SSD temperature
        - "fans.cpu_fan.speed_rpm" for fan speed
        - "docker_containers.nginx.cpu.percent" for container CPU usage
        """
        try:
            stats = await self.get_enhanced_system_stats(hours_back)
            
            metric_history = []
            for stat in stats:
                try:
                    # Navigate the nested dictionary using dot notation
                    value = stat
                    for key in metric_path.split('.'):
                        value = value[key]
                    
                    metric_data = {
                        'timestamp': stat.get('timestamp'),
                        'collected_at': stat.get('collected_at'),
                        'value': value,
                        'metric': metric_path
                    }
                    metric_history.append(metric_data)
                    
                except (KeyError, TypeError):
                    # Metric not available in this stat entry, skip
                    continue
            
            return metric_history
            
        except Exception as e:
            logger.error(f"❌ Failed to get metric history for {metric_path}: {e}")
            return []

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get current dashboard summary with latest values from all sensors"""
        try:
            recent_stats = await self.get_enhanced_system_stats(hours_back=1)
            
            if not recent_stats:
                return {"error": "No recent stats available"}
            
            latest_stat = recent_stats[0]
            
            summary = {
                'timestamp': latest_stat.get('timestamp'),
                'collected_at': latest_stat.get('collected_at'),
                'basic_stats': {
                    'cpu_percent': latest_stat.get('cpu_percent', 0),
                    'memory_percent': latest_stat.get('memory_percent', 0),
                    'disk_percent': latest_stat.get('disk_percent', 0),
                },
                'temperatures': {},
                'fans': {},
                'docker_summary': {}
            }
            
            # Collect all temperatures
            if 'cpu_enhanced' in latest_stat and 'temperatures' in latest_stat['cpu_enhanced']:
                summary['temperatures'].update(latest_stat['cpu_enhanced']['temperatures'])
            
            if 'memory_enhanced' in latest_stat and 'temperatures' in latest_stat['memory_enhanced']:
                summary['temperatures'].update(latest_stat['memory_enhanced']['temperatures'])
            
            if 'ssd_temps' in latest_stat:
                for ssd_name, ssd_data in latest_stat['ssd_temps'].items():
                    if isinstance(ssd_data, dict) and 'composite_temp' in ssd_data:
                        summary['temperatures'][f"{ssd_name}_composite"] = ssd_data['composite_temp']
            
            # Collect fan speeds
            if 'fans' in latest_stat:
                for fan_name, fan_data in latest_stat['fans'].items():
                    if isinstance(fan_data, dict) and 'speed_rpm' in fan_data:
                        summary['fans'][fan_name] = fan_data['speed_rpm']
            
            # Docker container summary
            if 'docker_containers' in latest_stat:
                containers = latest_stat['docker_containers']
                summary['docker_summary'] = {
                    'total_containers': len(containers),
                    'total_cpu_percent': sum(
                        c.get('cpu', {}).get('percent', 0) for c in containers.values()
                    ),
                    'total_memory_mb': sum(
                        c.get('memory', {}).get('usage_mb', 0) for c in containers.values()
                    ),
                    'containers': {
                        name: {
                            'cpu_percent': data.get('cpu', {}).get('percent', 0),
                            'memory_mb': data.get('memory', {}).get('usage_mb', 0),
                            'status': data.get('status', 'unknown')
                        }
                        for name, data in containers.items()
                    }
                }
            
            return summary
            
        except Exception as e:
            logger.error(f"❌ Failed to get dashboard summary: {e}")
            return {"error": str(e)}

    async def create_live_query(self, table_name: str, callback: Callable[[Any, Any], None]) -> str:
        """Create a live query that triggers callback on data changes"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            raise Exception("Cannot create live query: SurrealDB not connected")
            
        try:
            # Extract table name from LIVE query if needed
            if table_name.startswith("LIVE SELECT"):
                # Parse "LIVE SELECT * FROM table_name" -> "table_name"
                parts = table_name.split()
                if len(parts) >= 4 and parts[3].lower() == "from":
                    table_name = parts[4]
                else:
                    raise Exception(f"Cannot parse table name from query: {table_name}")
            
            # Create live query using current API: db.live(table, diff=False)
            live_query_uuid = await self.db.live(table_name, diff=False)
            
            # Get the subscription queue
            subscription = await self.db.subscribe_live(live_query_uuid)
            
            # Store the live query info
            self.live_queries[live_query_uuid] = {
                "table": table_name,
                "callback": callback,
                "subscription": subscription,
                "task": None
            }
            
            # Start listening task
            listen_task = asyncio.create_task(
                self._listen_to_live_query(live_query_uuid, subscription, callback)
            )
            self.live_queries[live_query_uuid]["task"] = listen_task
            
            logger.info(f"📡 Created live query for table '{table_name}': {live_query_uuid}")
            return live_query_uuid
                
        except Exception as e:
            logger.error(f"❌ Failed to create live query: {e}")
            raise

    async def _listen_to_live_query(self, live_id: str, subscription, callback: Callable[[Any, Any], None]):
        """Listen for live query updates using subscription queue"""
        try:
            
            while live_id in self.live_queries:
                try:
                    # Handle async generator properly
                    if hasattr(subscription, '__aiter__'):  # It's an async generator
                        try:
                            # Get next notification from async generator
                            notification = await anext(subscription)
                            
                            if notification:
                                # Call the callback - use single parameter signature like docker unified
                                asyncio.create_task(self._safe_callback(callback, notification, None))
                                
                        except StopAsyncIteration:
                            break
                        except Exception as e:
                            await asyncio.sleep(1)
                            
                    elif hasattr(subscription, 'get'):  # It's a queue
                        try:
                            notification = subscription.get(timeout=1.0)
                            
                            if notification:
                                action = getattr(notification, 'action', 'update')
                                result = getattr(notification, 'result', notification)
                                asyncio.create_task(self._safe_callback(callback, action, result))
                                
                        except queue.Empty:
                            pass
                    else:
                        await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"❌ Error in live query listener {live_id}: {e}")
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"❌ Fatal error in live query listener {live_id}: {e}")
        finally:
            # Clean up
            if live_id in self.live_queries:
                del self.live_queries[live_id]

    async def _safe_callback(self, callback: Callable, param1: Any, param2: Any):
        """Safely execute callback with error handling"""
        try:
            if asyncio.iscoroutinefunction(callback):
                if param2 is None:  # Single parameter callback (like docker unified)
                    await callback(param1)
                else:  # Two parameter callback (legacy)
                    await callback(param1, param2)
            else:
                if param2 is None:
                    callback(param1)
                else:
                    callback(param1, param2)
        except Exception as e:
            logger.error(f"❌ Error in live query callback: {e}")

    async def kill_live_query(self, live_id: str):
        """Stop a live query"""
        try:
            # Cancel the listening task
            if live_id in self.live_queries:
                task = self.live_queries[live_id].get("task")
                if task:
                    task.cancel()
                
                # Remove from tracking
                del self.live_queries[live_id]
            
            # Kill the live query on SurrealDB
            await self.db.kill(live_id)
            
            logger.info(f"🛑 Killed live query: {live_id}")
        except Exception as e:
            logger.error(f"❌ Failed to kill live query: {e}")

    async def disconnect(self):
        """Disconnect from SurrealDB"""
        if self.db:
            try:
                # Kill all active live queries
                for live_id in list(self.live_queries.keys()):
                    await self.kill_live_query(live_id)
                
                # Close connection
                await self.db.close()
                
                self.connected = False
                logger.info("📡 Disconnected from SurrealDB")
            except Exception as e:
                logger.error(f"❌ Error disconnecting from SurrealDB: {e}")

# Global instance
surreal_service = SurrealDBService()