# Fix for backend/app/services/background_collector.py
# Add proper shutdown handling, now with BATCHED SYSTEM STATS COLLECTION

import asyncio
import logging
import time
import psutil
import signal
from datetime import datetime, timedelta
from typing import List, Dict, Any
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
        
        # Batched stats collection system
        self.stats_batch: List[Dict[str, Any]] = []
        self.stats_batch_size = 30  # 30 seconds worth of stats
        self.stats_collection_interval = 1.0  # Collect every 1 second
        self.batch_write_interval = 30.0  # Write to DB every 30 seconds
        self.last_batch_write = 0
        
    async def start(self):
        """Start background collection with separate tasks"""
        if self.running:
            return
            
        self.running = True
        self._shutdown_requested = False
        
        # Reset batch tracking
        self.stats_batch = []
        self.last_batch_write = time.time()
        
        # Start both collection loops
        self.docker_task = asyncio.create_task(self._docker_collection_loop())
        self.stats_task = asyncio.create_task(self._stats_collection_loop())
        logger.info("🔄 Started background Docker → SurrealDB collection with batched stats")
        
    async def stop(self):
        """Stop background collection gracefully"""
        logger.info("🛑 Stopping background collector...")
        self._shutdown_requested = True
        self.running = False
        
        # Write any remaining stats before shutdown
        if self.stats_batch:
            logger.info(f"📊 Writing final batch of {len(self.stats_batch)} stats before shutdown")
            await self._write_stats_batch()
        
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

                    # =============================================================================
                    # USER EVENT TABLE BIFURCATION
                    # =============================================================================

                    # Store in database - but only if changed
                    changes_made = await surreal_service.store_unified_stacks(stacks)

                    if changes_made:
                        self.docker_changes_detected += 1
                        logger.info(f"🔄 Docker state changed - wrote {len(stacks)} stacks to database")
                        
                        # Generate user event for stack changes
                        await surreal_service.store_user_event(
                            event_type="docker_stacks_updated",
                            stack_name="all_stacks",
                            details={"stack_count": len(stacks), "change_reason": "background_scan"}
                        )
                        
                        # Log which stacks are running for visibility
                        running_stacks = [s['name'] for s in stacks if s.get('status') == 'running']
                        if running_stacks:
                            logger.info(f"   📦 Running stacks: {', '.join(running_stacks)}")
                    else:
                        logger.debug(f"✅ Docker state unchanged - skipped database write")
                    
                    # Wait 30 seconds before next check (with early exit on shutdown)
                    for _ in range(60):  # 60 iterations of 0.5s = 30s
                        if self._shutdown_requested:
                            break
                        await asyncio.sleep(0.5)
                    
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
        """BATCHED system stats collection - collect every 1s, write every 30s"""
        try:
            from ..core.config import settings
            
            while self.running and not self._shutdown_requested:
                try:
                    if not settings.USE_SURREALDB:
                        await asyncio.sleep(self.stats_collection_interval)
                        continue
                        
                    # Collect system stats and add to batch
                    stats_data = await self._collect_system_stats()
                    if stats_data:
                        self.stats_batch.append(stats_data)
                        
                        logger.debug(f"📊 Collected stats #{len(self.stats_batch)}/{self.stats_batch_size}")
                    
                    # Check if it's time to write the batch
                    current_time = time.time()
                    time_since_last_write = current_time - self.last_batch_write
                    
                    # Write batch if we have enough stats OR enough time has passed
                    should_write_batch = (
                        len(self.stats_batch) >= self.stats_batch_size or
                        time_since_last_write >= self.batch_write_interval
                    )
                    
                    if should_write_batch and self.stats_batch:
                        await self._write_stats_batch()
                    
                    # Wait 1 second before next collection
                    await asyncio.sleep(self.stats_collection_interval)
                    
                except asyncio.CancelledError:
                    logger.info("📡 System stats collection cancelled")
                    break
                except Exception as e:
                    if not self._shutdown_requested:
                        logger.error(f"❌ System stats collection error: {e}")
                    await asyncio.sleep(1)
                    
        except asyncio.CancelledError:
            logger.info("📡 System stats collection loop cancelled")

    async def _collect_system_stats(self) -> Dict[str, Any] | None:
        """Collect comprehensive system statistics - returns dict or None"""
        if self._shutdown_requested:
            return None
            
        try:
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
            
            return stats_data
            
        except asyncio.CancelledError:
            logger.info("📡 System stats collection cancelled")
            return None
        except Exception as e:
            if not self._shutdown_requested:
                logger.error(f"Error collecting system stats: {e}")
            return None

    async def _write_stats_batch(self):
        """Write the current batch of stats to SurrealDB and trigger broadcast"""
        if not self.stats_batch:
            return
            
        try:
            batch_size = len(self.stats_batch)
            batch_start_time = self.stats_batch[0]["timestamp"] if self.stats_batch else time.time()
            batch_end_time = self.stats_batch[-1]["timestamp"] if self.stats_batch else time.time()
            
            logger.info(f"📊 Writing batch of {batch_size} stats to database (timespan: {batch_end_time - batch_start_time:.1f}s)")
            
            # Write each stat to SurrealDB (could optimize with bulk insert later)
            write_count = 0
            for stats_data in self.stats_batch:
                await surreal_service.store_system_stats(stats_data)
                write_count += 1
            
            logger.info(f"✅ Successfully wrote {write_count} stats to database")
            
            # Trigger data broadcaster to send the batch via WebSocket
            # This will be handled by the live query system automatically
            # but we can also manually trigger it for immediate broadcast
            try:
                from .data_broadcaster import data_broadcaster
                await data_broadcaster.force_update_system_stats_batch(self.stats_batch)
                logger.debug(f"📡 Triggered WebSocket broadcast for batch of {batch_size} stats")
            except Exception as e:
                logger.warning(f"⚠️ Could not trigger WebSocket broadcast: {e}")
            
            # Clear the batch and update timing
            self.stats_batch = []
            self.last_batch_write = time.time()
            
        except Exception as e:
            logger.error(f"❌ Failed to write stats batch: {e}")
            # Don't clear the batch on error - we'll try again next time

    def get_batch_status(self) -> Dict[str, Any]:
        """Get current batch collection status for debugging"""
        current_time = time.time()
        return {
            "batch_size": len(self.stats_batch),
            "max_batch_size": self.stats_batch_size,
            "time_since_last_write": current_time - self.last_batch_write,
            "batch_write_interval": self.batch_write_interval,
            "collection_interval": self.stats_collection_interval,
            "next_write_in": max(0, self.batch_write_interval - (current_time - self.last_batch_write)),
            "running": self.running,
            "shutdown_requested": self._shutdown_requested
        }

# Global instance
background_collector = BackgroundCollector()