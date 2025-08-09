# backend/app/services/surreal_service.py
# Clean, well-organized SurrealDB service with proper error handling

import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Callable, Dict, List, Optional

from surrealdb import AsyncSurreal
from surrealdb.data import RecordID, Table

from ..core.config import settings

logger = logging.getLogger(__name__)

def serialize_surrealdb_objects(obj: Any) -> Any:
    """Recursively convert SurrealDB objects to JSON-serializable types"""
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
    """Clean SurrealDB service with proper connection management and live queries"""
    
    def __init__(self):
        self.db: Optional[AsyncSurreal] = None
        self.connected: bool = False
        self.live_queries: Dict[str, Dict] = {}
        self._connection_lock = asyncio.Lock()
        self._shutdown_requested: bool = False
        self._last_stacks_hash: Optional[str] = None

    # =============================================================================
    # CONNECTION MANAGEMENT
    # =============================================================================

    async def connect(self) -> bool:
        """Connect to SurrealDB with proper error handling"""
        async with self._connection_lock:
            if self.connected and self.db:
                return True
                
            try:
                logger.info(f"🔌 Connecting to SurrealDB at {settings.SURREALDB_URL}")
                self.db = AsyncSurreal(settings.SURREALDB_URL)
                
                # Use namespace and database
                await self.db.use(settings.SURREALDB_NS, settings.SURREALDB_DB)
                
                self.connected = True
                self._shutdown_requested = False
                logger.info("✅ Connected to SurrealDB successfully")
                return True
                
            except Exception as e:
                logger.error(f"❌ Failed to connect to SurrealDB: {e}")
                self.connected = False
                self.db = None
                return False

    async def disconnect(self):
        """Disconnect from SurrealDB with proper cleanup"""
        logger.info("🛑 Disconnecting from SurrealDB...")
        self._shutdown_requested = True
        
        # Kill all live queries first
        for live_id in list(self.live_queries.keys()):
            try:
                await self.kill_live_query(live_id)
            except Exception as e:
                logger.debug(f"Error killing live query {live_id}: {e}")
        
        # Close connection
        if self.db:
            try:
                await self.db.close()
            except Exception as e:
                logger.error(f"Error closing SurrealDB connection: {e}")
        
        self.connected = False
        self.db = None
        logger.info("✅ Disconnected from SurrealDB")

    # =============================================================================
    # UNIFIED STACKS STORAGE (with change detection)
    # =============================================================================

    async def store_unified_stacks(self, stacks_data: List[Dict[str, Any]]) -> bool:
        """Store unified stacks with change detection to prevent unnecessary writes"""
        if self._shutdown_requested:
            return False
            
        if not self.connected and not await self.connect():
            return False
            
        try:
            # Calculate hash for change detection
            current_hash = self._calculate_stacks_hash(stacks_data)
            
            if self._last_stacks_hash == current_hash:
                logger.debug("🔄 Stack data unchanged, skipping database write")
                return False
            
            logger.info(f"📝 Stack data changed, updating database (hash: {current_hash[:8]}...)")
            
            # Get existing stacks
            existing_stacks = await self._get_existing_stacks()
            existing_by_name = {stack.get('name'): stack for stack in existing_stacks}
            
            current_names = {stack['name'] for stack in stacks_data}
            existing_names = set(existing_by_name.keys())
            
            changes_made = False
            
            # Update or create stacks
            for stack in stacks_data:
                stack_name = stack['name']
                stack_with_timestamp = {
                    **stack,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if stack_name in existing_by_name:
                    if self._stack_needs_update(existing_by_name[stack_name], stack):
                        await self._update_stack(stack_name, stack_with_timestamp)
                        changes_made = True
                else:
                    await self._create_stack(stack_with_timestamp)
                    changes_made = True
            
            # Delete removed stacks
            for stack_name in (existing_names - current_names):
                await self._delete_stack(stack_name)
                changes_made = True
            
            if changes_made:
                self._last_stacks_hash = current_hash
                logger.info(f"✅ Stack storage complete - {len(stacks_data)} stacks")
            
            return changes_made
            
        except Exception as e:
            logger.error(f"❌ Failed to store unified stacks: {e}")
            return False

    def _calculate_stacks_hash(self, stacks_data: List[Dict[str, Any]]) -> str:
        """Calculate hash of essential stack data for change detection"""
        sorted_stacks = sorted(stacks_data, key=lambda x: x.get('name', ''))
        
        stack_essence = []
        for stack in sorted_stacks:
            essence = {
                'name': stack.get('name'),
                'status': stack.get('status'),
                'containers': stack.get('containers', {}),
                'services': self._normalize_services(stack.get('services', {})),
                'stats': stack.get('stats', {}),
            }
            stack_essence.append(essence)
        
        return hashlib.sha256(
            json.dumps(stack_essence, sort_keys=True, default=str).encode()
        ).hexdigest()

    def _normalize_services(self, services: Any) -> Dict:
        """Normalize services data for consistent hashing"""
        if not isinstance(services, dict):
            return {}
        
        return {
            name: {
                'status': svc.get('status') if isinstance(svc, dict) else str(svc),
                'container_id': svc.get('container_id') if isinstance(svc, dict) else None
            }
            for name, svc in services.items()
        }

    async def _get_existing_stacks(self) -> List[Dict]:
        """Get existing stacks from database"""
        try:
            result = await self.db.select("unified_stack")
            return result or []
        except Exception as e:
            logger.warning(f"Could not get existing stacks: {e}")
            return []

    def _stack_needs_update(self, existing: Dict, new: Dict) -> bool:
        """Check if stack needs updating"""
        return (
            existing.get('status') != new.get('status') or
            existing.get('containers') != new.get('containers') or
            existing.get('services') != new.get('services') or
            existing.get('stats') != new.get('stats')
        )

    async def _update_stack(self, stack_name: str, stack_data: Dict):
        """Update existing stack"""
        try:
            await self.db.update(f"unified_stack:{stack_name}", stack_data)
            logger.debug(f"  ✏️ Updated stack: {stack_name}")
        except Exception as e:
            logger.error(f"Failed to update stack {stack_name}: {e}")
            # Fallback to create
            await self._create_stack(stack_data)

    async def _create_stack(self, stack_data: Dict):
        """Create new stack"""
        try:
            await self.db.create("unified_stack", stack_data)
            logger.info(f"  ➕ Created stack: {stack_data.get('name')}")
        except Exception as e:
            logger.error(f"Failed to create stack {stack_data.get('name')}: {e}")

    async def _delete_stack(self, stack_name: str):
        """Delete stack"""
        try:
            await self.db.delete(f"unified_stack:{stack_name}")
            logger.info(f"  🗑️ Deleted stack: {stack_name}")
        except Exception as e:
            logger.error(f"Failed to delete stack {stack_name}: {e}")

    async def get_unified_stacks(self) -> List[Dict]:
        """Get all unified stacks from database"""
        if not self.connected and not await self.connect():
            return []
            
        try:
            result = await self.db.select("unified_stack")
            return serialize_surrealdb_objects(result) if result else []
        except Exception as e:
            logger.error(f"❌ Failed to get unified stacks: {e}")
            return []

    # =============================================================================
    # SYSTEM STATS STORAGE
    # =============================================================================

    async def store_system_stats(self, stats_data: Dict):
        """Store system statistics"""
        if self._shutdown_requested:
            return
            
        if not self.connected and not await self.connect():
            logger.error("❌ Cannot store system stats - SurrealDB not connected")
            return
            
        try:
            stats_with_timestamp = {
                **stats_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "collected_at": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.create("system_stats", stats_with_timestamp)
            
        except asyncio.CancelledError:
            logger.info("📡 System stats storage cancelled during shutdown")
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"❌ Failed to store system stats: {e}")

    async def get_system_stats(self, hours_back: int = 24) -> List[Dict]:
        """Get recent system statistics"""
        if self._shutdown_requested:
            return []
            
        if not self.connected and not await self.connect():
            return []
            
        try:
            query = "SELECT * FROM system_stats ORDER BY timestamp DESC LIMIT 10"
            result = await self.db.query(query)
            
            if isinstance(result, list) and result:
                return serialize_surrealdb_objects(result)
            return []
            
        except asyncio.CancelledError:
            logger.info("📡 System stats query cancelled during shutdown")
            return []
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"❌ Failed to get system stats: {e}")
            return []

    # =============================================================================
    # LIVE QUERIES
    # =============================================================================

    async def create_live_query(self, query_or_table: str, callback: Callable) -> str:
        """Create a live query that triggers callback on data changes"""
        if not self.connected and not await self.connect():
            raise Exception("Cannot create live query: SurrealDB not connected")
            
        try:
            # Extract table name from LIVE query if needed
            if query_or_table.startswith("LIVE SELECT"):
                parts = query_or_table.split()
                if len(parts) >= 4 and parts[3].lower() == "from":
                    table_name = parts[4]
                else:
                    raise Exception(f"Cannot parse table name from query: {query_or_table}")
            else:
                table_name = query_or_table
            
            # Create live query
            live_query_uuid = await self.db.live(table_name, diff=False)
            subscription = await self.db.subscribe_live(live_query_uuid)
            
            # Store live query info
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
            
            logger.info(f"📡 Created live query for '{table_name}': {live_query_uuid}")
            return live_query_uuid
                
        except Exception as e:
            logger.error(f"❌ Failed to create live query: {e}")
            raise

    async def _listen_to_live_query(self, live_id: str, subscription, callback: Callable):
        """Listen for live query updates"""
        try:
            while live_id in self.live_queries and not self._shutdown_requested:
                try:
                    # Handle async generator
                    if hasattr(subscription, '__aiter__'):
                        try:
                            notification = await anext(subscription)
                            if notification:
                                asyncio.create_task(self._safe_callback(callback, notification))
                        except StopAsyncIteration:
                            break
                        except Exception:
                            await asyncio.sleep(1)
                    else:
                        await asyncio.sleep(0.1)
                        
                except Exception as e:
                    logger.error(f"❌ Error in live query listener {live_id}: {e}")
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"❌ Fatal error in live query listener {live_id}: {e}")
        finally:
            if live_id in self.live_queries:
                del self.live_queries[live_id]

    async def _safe_callback(self, callback: Callable, data: Any):
        """Safely execute callback with error handling"""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(data)
            else:
                callback(data)
        except Exception as e:
            logger.error(f"❌ Error in live query callback: {e}")

    async def kill_live_query(self, live_id: str):
        """Stop a live query"""
        try:
            if live_id in self.live_queries:
                # Cancel listening task
                task = self.live_queries[live_id].get("task")
                if task and not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                
                # Remove from tracking
                del self.live_queries[live_id]
            
            # Kill the live query on SurrealDB
            if self.db and not self._shutdown_requested:
                await self.db.kill(live_id)
            
            logger.info(f"🛑 Killed live query: {live_id}")
            
        except Exception as e:
            logger.debug(f"❌ Failed to kill live query {live_id}: {e}")

    # =============================================================================
    # ENHANCED STATS METHODS (for future hardware monitoring)
    # =============================================================================

    async def get_enhanced_system_stats(self, hours_back: int = 24) -> List[Dict]:
        """Get enhanced system statistics (placeholder for hardware monitoring)"""
        return await self.get_system_stats(hours_back)

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get current dashboard summary"""
        try:
            recent_stats = await self.get_system_stats(hours_back=1)
            
            if not recent_stats:
                return {"error": "No recent stats available"}
            
            latest_stat = recent_stats[0]
            
            return {
                'timestamp': latest_stat.get('timestamp'),
                'collected_at': latest_stat.get('collected_at'),
                'basic_stats': {
                    'cpu_percent': latest_stat.get('cpu_percent', 0),
                    'memory_percent': latest_stat.get('memory_percent', 0),
                    'disk_percent': latest_stat.get('disk_percent', 0),
                },
                'network_stats': {
                    'bytes_sent': latest_stat.get('network_bytes_sent', 0),
                    'bytes_recv': latest_stat.get('network_bytes_recv', 0),
                },
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get dashboard summary: {e}")
            return {"error": str(e)}

# Global instance
surreal_service = SurrealDBService()