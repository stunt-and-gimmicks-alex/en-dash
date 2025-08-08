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
            
            # Store each stack
            for stack in stacks_data:
                self.db.create("unified_stack", {
                    "name": stack.get("name", "unknown"),
                    "status": stack.get("status", "unknown"), 
                    "containers": stack.get("containers", {}),
                    "services": stack.get("services", []),
                    "last_updated": datetime.utcnow().isoformat()
                })
                
            logger.info(f"📊 Stored {len(stacks_data)} unified stacks in SurrealDB")
            
        except Exception as e:
            logger.error(f"❌ Failed to store stacks in SurrealDB: {e}")
            
    async def get_unified_stacks(self):
        """Get pre-computed unified stacks"""
        if not self.connected:
            await self.connect()
            
        if not self.connected:
            return []
            
        try:
            result = self.db.select("unified_stack")
            logger.info(f"⚡ Retrieved unified stacks from SurrealDB")
            return result if result else []
        except Exception as e:
            logger.error(f"❌ Failed to get stacks from SurrealDB: {e}")
            return []

# Global instance
surreal_service = SurrealDBService()