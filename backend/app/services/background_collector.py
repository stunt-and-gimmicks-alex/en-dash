import asyncio
import logging
from .surreal_service import surreal_service
from .docker_unified import unified_stack_service

logger = logging.getLogger(__name__)

class BackgroundCollector:
    def __init__(self):
        self.running = False
        self.task = None
        
    async def start(self):
        """Start background collection"""
        if self.running:
            return
            
        self.running = True
        self.task = asyncio.create_task(self._collection_loop())
        logger.info("🔄 Started background Docker → SurrealDB collection")
        
    async def stop(self):
        """Stop background collection"""
        self.running = False
        if self.task:
            self.task.cancel()
            
    async def _collection_loop(self):
        """Collect Docker data only if SurrealDB is enabled"""
        from ..core.config import settings  # Import locally
        
        while self.running:
            try:
                # Check if SurrealDB is enabled
                if not settings.USE_SURREALDB:
                    logger.debug("SurrealDB disabled, skipping collection")
                    await asyncio.sleep(30)  # Wait longer when disabled
                    continue
                    
                # Get unified stacks using existing service (slow once)
                stacks = await unified_stack_service.get_all_unified_stacks()
                
                # Store in SurrealDB for fast retrieval
                await surreal_service.store_unified_stacks(stacks)
                
                # Wait 15 seconds before next collection
                await asyncio.sleep(15)
                
            except Exception as e:
                logger.error(f"❌ Background collection error: {e}")
                await asyncio.sleep(5)  # Shorter wait on error

# Global instance
background_collector = BackgroundCollector()