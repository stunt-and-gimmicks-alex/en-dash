# backend/app/services/surreal_service.py
"""
SurrealDB Service - Updated for SurrealDB 2.x compatibility
Based on official SurrealDB Python SDK documentation for v2.0.0 to v2.3.6
"""

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
    """
    SurrealDB Service for v2.x with proper connection management and live queries
    Compatible with SurrealDB v2.0.0 to v2.3.6
    """
    
    def __init__(self):
        self.db: Optional[AsyncSurreal] = None
        self.connected: bool = False
        self.live_queries: Dict[str, Dict] = {}
        self._connection_lock = asyncio.Lock()
        self._shutdown_requested: bool = False
        self._last_stacks_hash: Optional[str] = None

    # =============================================================================
    # CONNECTION MANAGEMENT (SurrealDB 2.x Compatible)
    # =============================================================================

    async def connect(self):
        """Connect to SurrealDB using v2.x connection pattern"""
        async with self._connection_lock:
            if self.connected and self.db:
                return
                
            try:
                # Create AsyncSurreal instance - v2.x pattern
                self.db = AsyncSurreal(settings.SURREALDB_URL)
                
                # Connect to database
                await self.db.connect()
                
                # Authenticate using v2.x signin pattern
                await self.db.signin({
                    "username": settings.SURREALDB_USER, 
                    "password": settings.SURREALDB_PASS
                })
                
                # Use namespace and database
                await self.db.use(settings.SURREALDB_NS, settings.SURREALDB_DB)
                
                self.connected = True
                logger.info(f"✅ Connected to SurrealDB v2.x at {settings.SURREALDB_URL}")
                
            except Exception as e:
                logger.error(f"❌ Failed to connect to SurrealDB v2.x: {e}")
                self.connected = False
                self.db = None
                raise

    async def disconnect(self):
        """Disconnect from SurrealDB"""
        async with self._connection_lock:
            self._shutdown_requested = True
            
            # Kill all live queries before disconnecting
            for live_id in list(self.live_queries.keys()):
                await self.kill_live_query(live_id)
            
            if self.db:
                try:
                    await self.db.close()
                    logger.info("✅ SurrealDB connection closed")
                except Exception as e:
                    logger.error(f"Error closing SurrealDB connection: {e}")
                finally:
                    self.db = None
                    self.connected = False

    # =============================================================================
    # LIVE QUERIES (SurrealDB 2.x Pattern)
    # =============================================================================

    async def create_live_query(self, table_name: str, callback: Callable) -> str:
        """Create a live query for a table - ENHANCED DEBUG"""
        if not self.connected and not await self.connect():
            raise Exception(f"Cannot create live query: SurrealDB not connected")
        
        try:
            
            # Use the live() method - SurrealDB 2.x pattern
            live_query_id = await self.db.live(table_name)
            
            # Subscribe to the live query using subscribe_live()
            subscription = await self.db.subscribe_live(live_query_id)
            
            # Store live query info
            self.live_queries[live_query_id] = {
                "table": table_name,
                "callback": callback,
                "subscription": subscription,
                "task": None
            }
            
            # Start listening task
            listen_task = asyncio.create_task(
                self._listen_to_live_query(live_query_id, subscription, callback)
            )
            self.live_queries[live_query_id]["task"] = listen_task          
            logger.info(f"📡 Created live query for '{table_name}': {live_query_id}")
            return live_query_id
                
        except Exception as e:
            logger.error(f"❌ Failed to create live query for {table_name}: {e}")
            print(f"🐛 LIVE QUERY SETUP: Error creating live query: {e}")
            raise

    async def _listen_to_live_query(self, live_id: str, subscription: Any, callback: Callable):
        """Listen to live query updates in a background task - ENHANCED DEBUG"""
        try:
            
            async for update in subscription:
                
                if self._shutdown_requested:
                    break
                    
                try:
                    # Call the callback with the update data
                    await callback(update)
                except Exception as e:
                    logger.error(f"Error in live query callback for {live_id}: {e}")
                    
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"Error listening to live query {live_id}: {e}")
        finally:
            logger.debug(f"Live query listener {live_id} stopped")

    async def kill_live_query(self, live_id: str):
        """Kill a live query and cleanup resources"""
        try:
            query_info = self.live_queries.get(live_id)
            if query_info:
                # Cancel the listening task
                if query_info["task"] and not query_info["task"].done():
                    query_info["task"].cancel()
                
                # Remove from tracking
                del self.live_queries[live_id]
            
            # Kill the live query on SurrealDB
            if self.db and not self._shutdown_requested:
                await self.db.kill(live_id)
            
            logger.info(f"🛑 Killed live query: {live_id}")
            
        except Exception as e:
            logger.debug(f"❌ Failed to kill live query {live_id}: {e}")

    # =============================================================================
    # UNIFIED STACKS STORAGE
    # =============================================================================

    async def store_unified_stacks(self, stacks: List[Dict]) -> bool:
        """Store unified stacks data with change detection"""
        if self._shutdown_requested:
            return False
            
        if not self.connected and not await self.connect():
            logger.error("❌ Cannot store unified stacks - SurrealDB not connected")
            return False

        try:
            # Calculate hash of current stacks for change detection
            stacks_json = json.dumps(stacks, sort_keys=True)
            current_hash = hashlib.md5(stacks_json.encode()).hexdigest()
            
            # Only write if data has changed
            if current_hash == self._last_stacks_hash:
                return False  # No changes
            
            # Clear existing data and insert new
            await self.db.query("DELETE FROM unified_stack")
            
            for stack in stacks:
                await self.db.create("unified_stack", stack)
            
            self._last_stacks_hash = current_hash
            return True  # Changes were made
            
        except asyncio.CancelledError:
            logger.info("📦 Unified stacks storage cancelled during shutdown")
            return False
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"❌ Failed to store unified stacks: {e}")
            return False

    async def get_unified_stacks(self) -> List[Dict]:
        """Get unified stacks from SurrealDB"""
        if self._shutdown_requested:
            return []
            
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
        """Store system statistics using optimized time-series pattern - FIXED"""
        
        if self._shutdown_requested:
            return
            
        if not self.connected and not await self.connect():
            logger.error("❌ Cannot store system stats - SurrealDB not connected")
            return
            
        try:
            # PHASE 1: Keep current storage method but add timestamp to ensure uniqueness
            # Phase 2 will implement proper complex record IDs later
            
            stats_with_timestamp = {
                **stats_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "collected_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Use auto-generated ID to avoid conflicts - let SurrealDB handle uniqueness
            result = await self.db.create("system_stats", stats_with_timestamp)
            
            logger.debug("📊 Stored system stats with auto-generated ID")
            
        except asyncio.CancelledError:
            logger.info("📡 System stats storage cancelled during shutdown")
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"❌ Failed to store system stats: {e}")

    async def get_system_stats_latest(self) -> Dict:
        """Get ONLY the most recent system stats - ultra-fast single record lookup"""
        if self._shutdown_requested:
            return {}
            
        if not self.connected and not await self.connect():
            return {}
            
        try:
            # OPTIMIZATION 2: Get only the most recent record (not 10 records!)
            # This eliminates the expensive ORDER BY on large datasets
            query = "SELECT * FROM system_stats ORDER BY timestamp DESC LIMIT 1"
            result = await self.db.query(query)
            
            if isinstance(result, list) and result and len(result) > 0:
                serialized = serialize_surrealdb_objects(result)
                return serialized[0] if serialized else {}
            
            return {}
            
        except asyncio.CancelledError:
            logger.info("📡 System stats query cancelled during shutdown")
            return {}
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"❌ Failed to get latest system stats: {e}")
            return {}

    async def get_system_stats_range(self, minutes_back: int = 5) -> List[Dict]:
        """Get system stats for a specific time range using optimized range query"""
        if self._shutdown_requested:
            return []
            
        if not self.connected and not await self.connect():
            return []
            
        try:
            # OPTIMIZATION 3: Use time range queries on record IDs (when we switch to complex IDs)
            # For now, limit the query scope heavily
            start_time = datetime.now(timezone.utc) - timedelta(minutes=minutes_back)
            
            query = f"""
            SELECT * FROM system_stats 
            WHERE timestamp >= '{start_time.isoformat()}'
            ORDER BY timestamp DESC 
            LIMIT 20
            """
            
            result = await self.db.query(query)
            
            if isinstance(result, list) and result:
                return serialize_surrealdb_objects(result)
            return []
            
        except asyncio.CancelledError:
            logger.info("📡 System stats range query cancelled during shutdown")
            return []
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"❌ Failed to get system stats range: {e}")
            return []

    # DEPRECATED - replace the old inefficient method
    async def get_system_stats(self, hours_back: int = 24) -> List[Dict]:
        """DEPRECATED: Use get_system_stats_latest() for single record or get_system_stats_range() for ranges"""
        logger.warning("⚠️ get_system_stats() is deprecated - use get_system_stats_latest() instead")
        
        # For backwards compatibility, just return the latest record
        latest = await self.get_system_stats_latest()
        return [latest] if latest else []

    async def create_filtered_live_query(
        self, 
        table_name: str, 
        callback: Callable,
        significance_filter: List[str] = None
    ) -> str:
        """
        Create a live query with client-side filtering for user-significant changes
        
        Args:
            table_name: Table name (e.g., "system_stats" or "unified_stack")
            callback: Function to call on significant changes only
            significance_filter: List of keywords that indicate significant changes
            
        Returns:
            live_query_id: UUID string for the live query
        """
        if not self.connected and not await self.connect():
            raise Exception("Cannot create filtered live query: SurrealDB not connected")
        
        # Default significance filter for Docker containers
        if significance_filter is None:
            significance_filter = [
                'status', 'state', 'health', 'image', 'restart',
                'error', 'warning', 'ports', 'networks', 'volumes',
                'created', 'removed', 'exited', 'died'
            ]
        
        # Create wrapper callback that filters changes
        async def filtered_callback(update_data):
            if self._is_significant_change(update_data, significance_filter):
                logger.info(f"📡 Significant change detected, calling callback")
                await callback(update_data)
            else:
                logger.debug(f"📡 Insignificant change ignored")
        
        # Create the live query with filtered callback
        return await self.create_live_query(table_name, filtered_callback)

    def _is_significant_change(self, update_data: Any, significance_filter: List[str]) -> bool:
        """Check if a change contains user-significant indicators"""
        if not update_data:
            return False
        
        update_str = str(update_data).lower()
        
        # Check if any significant indicator is present
        for indicator in significance_filter:
            if indicator in update_str:
                return True
        
        return False

    # =============================================================================
    # ENHANCED STATS METHODS
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

    # =============================================================================
    # USER EVENT TABLE BIFURCATION
    # =============================================================================

    async def store_user_event(self, event_type: str, stack_name: str, container_name: str = None, details: Dict = None) -> bool:
        """Store a user-significant event in the events table"""
        if not self.connected and not await self.connect():
            return False
        
        try:
            event_data = {
                "event_type": event_type,  # "stack_status_change", "container_added", etc.
                "stack_name": stack_name,
                "container_name": container_name,
                "details": details or {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "processed": False
            }
            
            await self.db.create("user_events", event_data)
            return True
            
        except Exception as e:
            logger.error(f"Error storing user event: {e}")
            return False

# Global instance
surreal_service = SurrealDBService()