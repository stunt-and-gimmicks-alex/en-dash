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
        """Store unified stacks data in SurrealDB"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            return
            
        try:
            # Clear existing data first
            await self.db.delete("unified_stack")
            
            # Store new data
            for stack in stacks_data:
                stack_with_timestamp = {
                    **stack,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await self.db.create("unified_stack", stack_with_timestamp)
            
            
        except Exception as e:
            logger.error(f"❌ Failed to store unified stacks in SurrealDB: {e}")

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