import asyncio
import logging
import time
import psutil
from datetime import timedelta
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
        """Collect Docker data AND system stats with optimized intervals"""
        from ..core.config import settings
        
        docker_interval = 30   # Docker data every 30 seconds (less frequent since we have live queries)
        stats_interval = 30    # System stats every 30 seconds
        last_stats_time = 0
        
        while self.running:
            try:
                current_time = time.time()
                
                if not settings.USE_SURREALDB:
                    logger.debug("SurrealDB disabled, skipping collection")
                    await asyncio.sleep(30)
                    continue
                    
                # Collect Docker data (less frequent now that we have live queries)
                stacks = await unified_stack_service.get_all_unified_stacks()
                await surreal_service.store_unified_stacks(stacks)
                logger.info("📊 Updated unified stacks in SurrealDB (triggers live query)")
                
                # Collect system stats (every 30 seconds)
                if current_time - last_stats_time >= stats_interval:
                    await self._collect_system_stats()
                    last_stats_time = current_time
                
                # Wait before next Docker collection (can be longer now)
                await asyncio.sleep(docker_interval)
                
            except Exception as e:
                logger.error(f"❌ Background collection error: {e}")
                await asyncio.sleep(5)

    async def _collect_system_stats(self):
        """Collect comprehensive system statistics"""
        try:
            # CPU stats
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk_root = psutil.disk_usage('/')
            
            # Build stats object
            stats = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": round(memory.used / (1024**3), 2),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "disk_percent": round((disk_root.used / disk_root.total) * 100, 2),
                "disk_used_gb": round(disk_root.used / (1024**3), 2),
                "disk_total_gb": round(disk_root.total / (1024**3), 2),
            }
            
            # Store in SurrealDB
            await surreal_service.store_system_stats(stats)
            logger.info("📈 Collected and stored system stats")
            
        except Exception as e:
            logger.error(f"❌ Failed to collect system stats: {e}")

# Global instance
background_collector = BackgroundCollector()