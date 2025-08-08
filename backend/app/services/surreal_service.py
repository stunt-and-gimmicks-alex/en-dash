from surrealdb import Surreal
from datetime import datetime
import asyncio
import logging
import json
from ..core.config import settings

logger = logging.getLogger(__name__)

class SurrealDBService:
    def __init__(self):
        self.db = None
        self.connected = False
        
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
                        return stacks_data
                        
            # Fallback: try direct list format
            elif isinstance(result, list):
                logger.info(f"⚡ Fast path: Retrieved {len(result)} stacks from SurrealDB (direct list)")
                return result
            
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

# Global instance
surreal_service = SurrealDBService()