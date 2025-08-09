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
        self.docker_task = None
        self.stats_task = None  # ADD: Separate task for system stats
        
    async def start(self):
        """Start background collection with separate tasks"""
        if self.running:
            return
            
        self.running = True
        # Start both collection loops
        self.docker_task = asyncio.create_task(self._docker_collection_loop())
        self.stats_task = asyncio.create_task(self._stats_collection_loop())
        logger.info("🔄 Started background Docker → SurrealDB collection")
        
    async def stop(self):
        """Stop background collection"""
        self.running = False
        if self.docker_task:
            self.docker_task.cancel()
        if self.stats_task:
            self.stats_task.cancel()

    async def _docker_collection_loop(self):
        """Collect Docker data every 30 seconds"""
        from ..core.config import settings
        
        while self.running:
            try:
                if not settings.USE_SURREALDB:
                    logger.debug("SurrealDB disabled, skipping Docker collection")
                    await asyncio.sleep(30)
                    continue
                    
                # Collect Docker data
                stacks = await unified_stack_service.get_all_unified_stacks()
                await surreal_service.store_unified_stacks(stacks)
                logger.info("📊 Updated unified stacks in SurrealDB (triggers live query)")
                
                # Wait 30 seconds before next collection
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"❌ Docker collection error: {e}")
                await asyncio.sleep(5)

    async def _stats_collection_loop(self):
        """Collect system stats every 1 second"""
        from ..core.config import settings
        
        while self.running:
            try:
                if not settings.USE_SURREALDB:
                    await asyncio.sleep(1)
                    continue
                    
                # Collect system stats
                await self._collect_system_stats()
                
                # Wait 1 second before next collection
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ System stats collection error: {e}")
                await asyncio.sleep(1)  # Shorter retry for stats

    async def _collect_system_stats(self):
        """Collect comprehensive system statistics including network I/O"""
        try:
            # CPU stats
            cpu_percent = psutil.cpu_percent(interval=None)  # CHANGED: Don't block for 1 second
            memory = psutil.virtual_memory()
            disk_root = psutil.disk_usage('/')
            
            # Network I/O stats
            network_io = psutil.net_io_counters()
            
            # Build comprehensive stats object
            stats = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": round(memory.used / (1024**3), 2),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "disk_percent": round((disk_root.used / disk_root.total) * 100, 2),
                "disk_used_gb": round(disk_root.used / (1024**3), 2),
                "disk_total_gb": round(disk_root.total / (1024**3), 2),
                # Network I/O data
                "network_bytes_sent": network_io.bytes_sent,
                "network_bytes_recv": network_io.bytes_recv,
                "network_packets_sent": network_io.packets_sent,
                "network_packets_recv": network_io.packets_recv,
            }
            
            # Store in SurrealDB
            await surreal_service.store_system_stats(stats)
            logger.debug("📈 Collected and stored system stats with network I/O")  # CHANGED: debug level to reduce spam
            
        except Exception as e:
            logger.error(f"❌ Failed to collect system stats: {e}")

# Global instance
background_collector = BackgroundCollector()