from surrealdb import Surreal
from datetime import datetime, timezone, timedelta
import time
import asyncio
import logging
from ..core.config import settings
import json
from surrealdb.data import RecordID, Table
from typing import Any, Callable, Dict, List

logger = logging.getLogger(__name__)

def serialize_surrealdb_objects(obj: Any) -> Any:
    """
    Recursively convert SurrealDB objects to JSON-serializable types
    """
    if isinstance(obj, RecordID):
        # Convert RecordID to string representation
        return str(obj)
    
    elif isinstance(obj, Table):
        # Convert Table to string representation  
        return str(obj)
    
    elif isinstance(obj, dict):
        # Recursively process dictionary values
        return {key: serialize_surrealdb_objects(value) for key, value in obj.items()}
    
    elif isinstance(obj, list):
        # Recursively process list items
        return [serialize_surrealdb_objects(item) for item in obj]
    
    elif isinstance(obj, tuple):
        # Convert tuples to lists and recursively process
        return [serialize_surrealdb_objects(item) for item in obj]
    
    elif isinstance(obj, datetime):
        # Convert datetime to ISO string
        return obj.isoformat()
    
    else:
        # Return as-is for basic types (str, int, float, bool, None)
        return obj

class SurrealDBService:
    def __init__(self):
        self.db = None
        self.connected = False
        self.live_queries: Dict[str, str] = {}  # Track active live queries
        
    async def connect(self):
        try:
            # Correct API for surrealdb.py v1.0.6
            self.db = Surreal(settings.SURREALDB_URL)
            
            # Set namespace and database (synchronous methods)
            self.db.use(settings.SURREALDB_NS, settings.SURREALDB_DB)
            logger.info(f"✅ Using namespace: {settings.SURREALDB_NS}, database: {settings.SURREALDB_DB}")
            
            self.connected = True
            logger.info(f"✅ Connected to SurrealDB at {settings.SURREALDB_URL}")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to SurrealDB: {e}")
            self.connected = False
            
    async def store_unified_stacks(self, stacks_data):
        """Store pre-computed unified stack data"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            return
            
        try:
            # Clear old data
            self.db.query("DELETE unified_stack")
            
            # Store each stack with complete data
            for stack in stacks_data:
                self.db.create("unified_stack", stack)
                
            logger.info(f"📊 Stored {len(stacks_data)} unified stacks in SurrealDB")
            
        except Exception as e:
            logger.error(f"❌ Failed to store stacks in SurrealDB: {e}")
            
    async def get_unified_stacks(self):
        """Get pre-computed unified stacks - PROPERLY extracts from SurrealDB format"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            logger.warning("❌ SurrealDB not connected, returning empty list")
            return []
            
        try:
            # Use query method instead of select to get consistent format
            result = self.db.query("SELECT * FROM unified_stack")
            
            logger.info(f"🔍 SurrealDB raw result type: {type(result)}")
            
            # Extract the actual stack data from SurrealDB's nested response
            if isinstance(result, dict) and "result" in result:
                # Handle the nested structure: {"result": [{"result": null}, {"result": [...stacks...]}]}
                nested_results = result["result"]
                if isinstance(nested_results, list) and len(nested_results) > 1:
                    # The actual data is typically in the second result object
                    stacks_data = nested_results[1].get("result", [])
                    if isinstance(stacks_data, list):
                        logger.info(f"⚡ Fast path: Retrieved {len(stacks_data)} stacks from SurrealDB")
                        # SERIALIZE SURREALDB OBJECTS BEFORE RETURNING
                        return serialize_surrealdb_objects(stacks_data)
                        
            # Fallback: try direct list format
            elif isinstance(result, list):
                logger.info(f"⚡ Fast path: Retrieved {len(result)} stacks from SurrealDB (direct list)")
                # SERIALIZE SURREALDB OBJECTS BEFORE RETURNING
                return serialize_surrealdb_objects(result)
            
            # If we get here, unexpected format
            logger.warning(f"🔍 Unexpected SurrealDB result format: {type(result)}")
            logger.warning(f"🔍 Result preview: {str(result)[:200]}...")
            return []
            
        except Exception as e:
            logger.error(f"❌ Failed to get stacks from SurrealDB: {e}")
            return []
            
    async def query_unified_stacks_raw(self):
        """Debug method to see raw SurrealDB response"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            return None
            
        try:
            result = self.db.query("SELECT * FROM unified_stack")
            logger.info(f"🔍 Raw SurrealDB query result type: {type(result)}")
            logger.info(f"🔍 Raw SurrealDB query result: {str(result)[:1000]}")
            return result
        except Exception as e:
            logger.error(f"❌ Failed raw query: {e}")
            return None
    async def store_system_stats(self, stats_data: dict):
        """Store system statistics with timestamp"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            return
            
        try:
            # Add timestamp to the stats
            stats_with_timestamp = {
                **stats_data,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "collected_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Store the stats record
            self.db.create("system_stats", stats_with_timestamp)
            
            logger.debug(f"📈 Stored system stats in SurrealDB")
            
        except Exception as e:
            logger.error(f"❌ Failed to store system stats in SurrealDB: {e}")

    async def store_system_stats(self, stats_data: dict):
      """Store system statistics with timestamp"""
      if not self.connected:
          await self.connect()
          
      if not self.connected:
          return
          
      try:
          # Add timestamp to the stats
          stats_with_timestamp = {
              **stats_data,
              "timestamp": datetime.now(timezone.utc).isoformat(),
              "collected_at": datetime.now(timezone.utc).isoformat()
          }
          
          # Store the stats record
          self.db.create("system_stats", stats_with_timestamp)
          
          logger.debug(f"📈 Stored system stats in SurrealDB")
          
      except Exception as e:
          logger.error(f"❌ Failed to store system stats in SurrealDB: {e}")

    async def get_system_stats(self, hours_back: int = 24):
        """Get system statistics from the last N hours"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            return []
            
        try:
            # Calculate time threshold
            time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours_back)
            
            result = self.db.query(f"SELECT * FROM system_stats WHERE timestamp > '{time_threshold.isoformat()}' ORDER BY timestamp DESC")
            
            # Handle SurrealDB response format
            if isinstance(result, list) and len(result) > 0:
                stats_data = result[0].get("result", [])
                if isinstance(stats_data, list):
                    return serialize_surrealdb_objects(stats_data)
                    
            return []
            
        except Exception as e:
            logger.error(f"❌ Failed to get system stats from SurrealDB: {e}")
            return []
    async def create_live_query(self, query: str, callback: Callable[[Any], None]) -> str:
        """Create a live query that triggers callback on data changes"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            raise Exception("Cannot create live query: SurrealDB not connected")
            
        try:
            # Create live query
            result = self.db.live(query)
            
            if isinstance(result, dict) and "result" in result:
                live_id = result["result"]
                self.live_queries[live_id] = query
                
                # Start listening for changes
                asyncio.create_task(self._listen_live_query(live_id, callback))
                
                logger.info(f"📡 Created live query: {live_id}")
                return live_id
            else:
                raise Exception(f"Failed to create live query: {result}")
                
        except Exception as e:
            logger.error(f"❌ Failed to create live query: {e}")
            raise
    
    async def _listen_live_query(self, live_id: str, callback: Callable[[Any], None]):
        """Listen for live query updates"""
        try:
            while live_id in self.live_queries:
                # Check for live query updates
                updates = self.db.live_notifications(live_id)
                
                if updates:
                    for update in updates:
                        # Process the update and call callback
                        processed_data = serialize_surrealdb_objects(update)
                        callback(processed_data)
                
                # Small delay to prevent busy waiting
                await asyncio.sleep(0.1)
                
        except Exception as e:
            logger.error(f"❌ Live query listener error: {e}")
        finally:
            # Clean up
            if live_id in self.live_queries:
                del self.live_queries[live_id]
    
    async def kill_live_query(self, live_id: str):
        """Stop a live query"""
        try:
            self.db.kill(live_id)
            if live_id in self.live_queries:
                del self.live_queries[live_id]
            logger.info(f"🛑 Killed live query: {live_id}")
        except Exception as e:
            logger.error(f"❌ Failed to kill live query: {e}")
            
# Global instance
surreal_service = SurrealDBService()