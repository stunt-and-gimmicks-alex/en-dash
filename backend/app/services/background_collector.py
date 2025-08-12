# Fix for backend/app/services/background_collector.py
# Add proper shutdown handling

import asyncio
import logging
import time
import psutil
import signal
from datetime import timedelta
from .surreal_service import surreal_service
from .docker_unified import unified_stack_service

logger = logging.getLogger(__name__)

class BackgroundCollector:
    def __init__(self):
        self.running = False
        self.docker_task = None
        self.stats_task = None
        self.docker_check_count = 0
        self.docker_changes_detected = 0
        self._shutdown_requested = False
        
    async def start(self):
        """Start background collection with separate tasks"""
        if self.running:
            return
            
        self.running = True
        self._shutdown_requested = False
        
        # Start both collection loops
        self.docker_task = asyncio.create_task(self._docker_collection_loop())
        self.stats_task = asyncio.create_task(self._stats_collection_loop())
        logger.info("🔄 Started background Docker → SurrealDB collection with change detection")
        
    async def stop(self):
        """Stop background collection gracefully"""
        logger.info("🛑 Stopping background collector...")
        self._shutdown_requested = True
        self.running = False
        
        # Cancel tasks
        tasks_to_cancel = []
        if self.docker_task and not self.docker_task.done():
            tasks_to_cancel.append(self.docker_task)
        if self.stats_task and not self.stats_task.done():
            tasks_to_cancel.append(self.stats_task)
        
        if tasks_to_cancel:
            # Cancel all tasks
            for task in tasks_to_cancel:
                task.cancel()
            
            # Wait for cancellation with timeout
            try:
                await asyncio.wait_for(
                    asyncio.gather(*tasks_to_cancel, return_exceptions=True),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                logger.warning("⚠️ Background tasks didn't stop within timeout")
        
        # Log summary stats
        if self.docker_check_count > 0:
            change_rate = (self.docker_changes_detected / self.docker_check_count) * 100
            logger.info(f"📊 Docker collection summary: {self.docker_changes_detected}/{self.docker_check_count} checks had changes ({change_rate:.1f}%)")
        
        logger.info("✅ Background collector stopped")

    async def _docker_collection_loop(self):
        """Collect Docker data every 30 seconds - but only write if changed"""
        try:
            from ..core.config import settings
            
            while self.running and not self._shutdown_requested:
                try:
                    if not settings.USE_SURREALDB:
                        await asyncio.sleep(30)
                        continue
                    
                    self.docker_check_count += 1
                    
                    # Collect current Docker state
                    logger.debug(f"🔍 Docker collection check #{self.docker_check_count}")
                    stacks = await unified_stack_service.get_all_unified_stacks()
                    
                    # Store in database - but only if changed
                    changes_made = await surreal_service.store_unified_stacks(stacks)
                    
                    if changes_made:
                        self.docker_changes_detected += 1
                        logger.info(f"🔄 Docker state changed - wrote {len(stacks)} stacks to database")
                        
                        # Log which stacks are running for visibility
                        running_stacks = [s['name'] for s in stacks if s.get('status') == 'running']
                        if running_stacks:
                            logger.info(f"   📦 Running stacks: {', '.join(running_stacks)}")
                    else:
                        logger.debug(f"✅ Docker state unchanged - skipped database write")
                    
                    # Wait 30 seconds before next check (with early exit on shutdown)
                    for _ in range(30):
                        if self._shutdown_requested:
                            break
                        await asyncio.sleep(1)
                    
                except asyncio.CancelledError:
                    logger.info("📡 Docker collection cancelled")
                    break
                except Exception as e:
                    if not self._shutdown_requested:
                        logger.error(f"❌ Docker collection error: {e}")
                    await asyncio.sleep(5)
                    
        except asyncio.CancelledError:
            logger.info("📡 Docker collection loop cancelled")

    async def _stats_collection_loop(self):
        """Collect system stats every 1 second"""
        try:
            from ..core.config import settings
            
            while self.running and not self._shutdown_requested:
                try:

                    logger.info("🔄 STATS COLLECTION LOOP RUNNING")
                    
                    if not settings.USE_SURREALDB:
                        await asyncio.sleep(1)
                        continue
                        
                    # Collect system stats (keep this simple and working)
                    await self._collect_system_stats()
                    
                    # Wait 1 second before next collection
                    await asyncio.sleep(1)
                    
                except asyncio.CancelledError:
                    logger.info("📡 System stats collection cancelled")
                    break
                except Exception as e:
                    if not self._shutdown_requested:
                        logger.error(f"❌ System stats collection error: {e}")
                    await asyncio.sleep(1)
                    
        except asyncio.CancelledError:
            logger.info("📡 System stats collection loop cancelled")

    async def _collect_system_stats(self):
        """Collect comprehensive system statistics - WORKING VERSION"""
        if self._shutdown_requested:
            return
            
        try:
            logger.info("🔥 COLLECTING SYSTEM STATS NOW")

            # CPU stats
            cpu_percent = psutil.cpu_percent(interval=None)  # Non-blocking
            
            # Memory stats
            memory = psutil.virtual_memory()
            
            # Disk stats
            disk = psutil.disk_usage('/')
            
            # Network stats
            network = psutil.net_io_counters()
            
            # Process count
            process_count = len(psutil.pids())
            
            # Load average
            try:
                load_avg = psutil.getloadavg()
            except AttributeError:
                load_avg = [0, 0, 0]  # Windows fallback
            
            # Build comprehensive stats object
            stats_data = {
                "timestamp": time.time(),
                "collected_at": time.time(),
                "cpu": {
                    "percent": cpu_percent,
                    "load_avg_1m": load_avg[0],
                    "load_avg_5m": load_avg[1],
                    "load_avg_15m": load_avg[2],
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "percent": memory.percent,
                    "free": memory.free,
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": (disk.used / disk.total) * 100,
                },
                "network": {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv,
                },
                "processes": {
                    "count": process_count,
                },
                # LEGACY FIELDS FOR COMPATIBILITY
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": round(memory.used / (1024**3), 2),
                "memory_total_gb": round(memory.total / (1024**3), 2),
                "disk_percent": round((disk.used / disk.total) * 100, 2),
                "disk_used_gb": round(disk.used / (1024**3), 2),
                "disk_total_gb": round(disk.total / (1024**3), 2),
                "network_bytes_sent": network.bytes_sent,
                "network_bytes_recv": network.bytes_recv,
                "network_packets_sent": network.packets_sent,
                "network_packets_recv": network.packets_recv,
            }
            
            # Store in SurrealDB
            await surreal_service.store_system_stats(stats_data)
            
        except asyncio.CancelledError:
            logger.info("📡 System stats collection cancelled")
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"Error collecting system stats: {e}")

# Global instance
background_collector = BackgroundCollector()