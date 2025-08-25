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

    # PHASE 4: COMPLEX RECORD ID BACKEND IMPLEMENTATION

    async def store_system_stats(self, stats_data: Dict):
        """Store system statistics using complex record ID time-series pattern"""
        
        if self._shutdown_requested:
            return
            
        if not self.connected and not await self.connect():
            logger.error("❌ Cannot store system stats - SurrealDB not connected")
            return
            
        try:
            # PHASE 4: Use current timestamp as record ID for O(1) access
            current_time = datetime.now(timezone.utc)
            
            # PHASE 4: Store FULL comprehensive data (not just minimal payload)
            comprehensive_record = {
                # Core metrics (matching SystemStatsData interface)
                "cpu_percent": float(stats_data.get("cpu_percent", 0.0)),
                "memory_percent": float(stats_data.get("memory_percent", 0.0)), 
                "disk_percent": float(stats_data.get("disk_percent", 0.0)),
                "memory_used_gb": float(stats_data.get("memory_used_gb", 0.0)),
                "memory_total_gb": float(stats_data.get("memory_total_gb", 0.0)),
                "disk_used_gb": float(stats_data.get("disk_used_gb", 0.0)),
                "disk_total_gb": float(stats_data.get("disk_total_gb", 0.0)),
                "network_bytes_sent": int(stats_data.get("network_bytes_sent", 0)),
                "network_bytes_recv": int(stats_data.get("network_bytes_recv", 0)),
                "network_packets_sent": int(stats_data.get("network_packets_sent", 0)),
                "network_packets_recv": int(stats_data.get("network_packets_recv", 0)),
                
                # Legacy detailed objects (for comprehensive historical data)
                "cpu": stats_data.get("cpu", {}),
                "memory": stats_data.get("memory", {}),
                "disk": stats_data.get("disk", {}),
                "network": stats_data.get("network", {}),
                "processes": stats_data.get("processes", {}),
                
                # Container resources - ensure it's an object, not None
                "container_resources": stats_data.get("container_resources", {})
            }
            
            # COMPLEX RECORD ID: Use epoch timestamp for uniqueness and simplicity
            # Format: system_stats:[1692912253123] (milliseconds since epoch)
            timestamp_ms = int(current_time.timestamp() * 1000)
            record_id = f"system_stats:[{timestamp_ms}]"
            
            result = await self.db.create(record_id, comprehensive_record)
            
            logger.debug(f"📊 Stored system stats with time-series ID: {timestamp_ms}")
            
        except asyncio.CancelledError:
            logger.info("📡 System stats storage cancelled during shutdown")
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"❌ Failed to store system stats with complex ID: {e}")

    async def get_system_stats_latest_timeseries(self) -> Dict:
        """Get latest system stats using correct SurrealDB Python SDK syntax"""
        
        if self._shutdown_requested:
            return {}
            
        if not self.connected and not await self.connect():
            return {}
            
        try:
            # CORRECT: Simple query to get the most recent record
            query = "SELECT * FROM system_stats ORDER BY id DESC LIMIT 1"
            
            result = await self.db.query(query)
            print(f"🔍 DEBUG: Raw query result: {result}")
            print(f"🔍 DEBUG: Result type: {type(result)}")
            if result:
                print(f"🔍 DEBUG: First element: {result[0] if len(result) > 0 else 'NO FIRST ELEMENT'}")
                if len(result) > 0 and result[0]:
                    print(f"🔍 DEBUG: First result type: {type(result[0])}")
            
            # Handle SurrealDB Python SDK response format
            if result and len(result) > 0 and result[0] and len(result[0]) > 0:
                latest_record = result[0][0]  # First query, first result
                
                # Extract timestamp from record ID: system_stats:[timestamp_ms]
                if 'id' in latest_record:
                    try:
                        # Your record format shows system_stats:⟨[1756077573786]⟩
                        # The ⟨⟩ are just display characters, actual storage is [timestamp]
                        id_str = str(latest_record['id'])
                        
                        # Extract timestamp from various possible formats
                        if '[' in id_str and ']' in id_str:
                            # Find the number between [ and ]
                            start_idx = id_str.find('[') + 1
                            end_idx = id_str.find(']')
                            timestamp_ms = int(id_str[start_idx:end_idx])
                            
                            timestamp_dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
                            
                            # Add timestamp fields for frontend compatibility
                            latest_record['timestamp'] = timestamp_dt.isoformat()
                            latest_record['collected_at'] = latest_record['timestamp']
                            
                            logger.debug(f"📊 Retrieved latest stats: {timestamp_dt}, CPU: {latest_record.get('cpu_percent')}%")
                            return latest_record
                            
                    except (ValueError, TypeError) as e:
                        logger.error(f"Failed to parse timestamp from ID {latest_record.get('id')}: {e}")
                        # Still return the record with current timestamp as fallback
                        current_time = datetime.now(timezone.utc).isoformat()
                        latest_record['timestamp'] = current_time
                        latest_record['collected_at'] = current_time
                        return latest_record
            
            logger.warning("📊 No system stats records found in database")
            return {}
            
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"❌ Failed to get latest stats: {e}")
            return {}

    async def get_system_stats_range_timeseries(self, minutes_back: int = 60) -> List[Dict]:
        """Get system stats range using correct SurrealDB Python SDK syntax"""
        
        if self._shutdown_requested:
            return []
            
        if not self.connected and not await self.connect():
            return []
            
        try:
            # Calculate time range for filtering
            now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            start_ms = now_ms - (minutes_back * 60 * 1000)
            
            # APPROACH 1: Try range query if your IDs are consistently formatted
            try:
                query = f"SELECT * FROM system_stats:[{start_ms}]..=[{now_ms}] ORDER BY id DESC"
                result = await self.db.query(query)
                
                if result and len(result) > 0 and result[0]:
                    records = result[0]  # First query result
                    if records:
                        logger.debug(f"📊 Range query successful: {len(records)} records")
                        return self._add_timestamps_to_records(records)
            except Exception as range_error:
                logger.debug(f"Range query failed, trying fallback: {range_error}")
            
            # APPROACH 2: Fallback - get recent records and filter by timestamp
            query = f"SELECT * FROM system_stats ORDER BY id DESC LIMIT {min(minutes_back * 3, 1000)}"
            result = await self.db.query(query)
            
            if result and len(result) > 0 and result[0]:
                records = result[0]  # First query result
                
                # Filter records within time range
                filtered_records = []
                for record in records:
                    if 'id' in record:
                        try:
                            id_str = str(record['id'])
                            if '[' in id_str and ']' in id_str:
                                start_idx = id_str.find('[') + 1
                                end_idx = id_str.find(']')
                                timestamp_ms = int(id_str[start_idx:end_idx])
                                
                                # Check if record is within time range
                                if timestamp_ms >= start_ms:
                                    timestamp_dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
                                    record['timestamp'] = timestamp_dt.isoformat()
                                    record['collected_at'] = record['timestamp']
                                    filtered_records.append(record)
                                    
                        except (ValueError, TypeError):
                            continue
                
                logger.debug(f"📊 Filtered {len(filtered_records)} records from last {minutes_back} minutes")
                return filtered_records
                
            logger.warning(f"📊 No system stats records found")
            return []
            
        except Exception as e:
            logger.error(f"❌ Failed to get time-series range: {e}")
            return []

    def _add_timestamps_to_records(self, records: List[Dict]) -> List[Dict]:
        """Helper method to add timestamp fields to records"""
        processed_records = []
        
        for record in records:
            if 'id' in record:
                try:
                    id_str = str(record['id'])
                    if '[' in id_str and ']' in id_str:
                        start_idx = id_str.find('[') + 1
                        end_idx = id_str.find(']')
                        timestamp_ms = int(id_str[start_idx:end_idx])
                        
                        timestamp_dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
                        record['timestamp'] = timestamp_dt.isoformat()
                        record['collected_at'] = record['timestamp']
                        processed_records.append(record)
                        
                except (ValueError, TypeError):
                    # Add fallback timestamp for records we can't parse
                    current_time = datetime.now(timezone.utc).isoformat()
                    record['timestamp'] = current_time
                    record['collected_at'] = current_time
                    processed_records.append(record)
        
        return processed_records

    # UPDATE: Replace the old get_system_stats method
    async def get_system_stats(self, hours_back: int = 24) -> List[Dict]:
        """PHASE 4: Use time-series optimized method"""
        logger.debug("Using time-series optimized query")
        
        # For backwards compatibility, return latest record
        latest = await self.get_system_stats_latest_timeseries()
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