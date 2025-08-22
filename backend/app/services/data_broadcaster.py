# EMERGENCY HOTFIX for backend/app/services/data_broadcaster.py
# Add this deduplication logic to prevent console-crashing spam

import asyncio
import hashlib
import json
import time
import logging
from datetime import datetime, timezone

from .websocket_manager import ws_manager
from .surreal_service import surreal_service
from .docker_unified import unified_stack_service

# Safe logging setup for uvicorn issues
try:
    logger = logging.getLogger(__name__)
except:
    class FakeLogger:
        def debug(self, msg): print(f"DEBUG: {msg}")
        def info(self, msg): print(f"INFO: {msg}")
        def warning(self, msg): print(f"WARNING: {msg}")
        def error(self, msg): print(f"ERROR: {msg}")
    logger = FakeLogger()

class DataBroadcaster:
    """Enhanced data broadcaster with EMERGENCY DEDUPLICATION"""
    
    def __init__(self):
        self.running = False
        self.live_query_tasks = {}
        self.polling_tasks = {}
        
        # Data broadcasting intervals (in seconds)
        self.intervals = {
            'system_stats': 30.0,
            'docker_stacks': 30.0,
            'heartbeat': 30.0
        }
        
        # Live query tracking
        self.live_query_ids = {}
        
        # Cache for immediate responses
        self.cached_data = {
            'system_stats': None,
            'system_stats_batch': None,
            'docker_stacks': None,
            'last_update': {
                'system_stats': None,
                'system_stats_batch': None,
                'docker_stacks': None
            }
        }
        
        # EMERGENCY DEDUPLICATION SYSTEM
        self.last_broadcast_hashes = {}
        self.last_broadcast_times = {}
        self.dedup_window_seconds = 5.0  # Don't send same message within 5 seconds
    
    def _generate_message_hash(self, message):
        """Generate a hash of the message content for deduplication"""
        try:
            # Create a consistent string representation for hashing
            message_copy = message.copy()
            # Remove timestamps and trigger info that change but don't affect content
            message_copy.pop('cached_at', None)
            message_copy.pop('trigger', None)
            if 'data' in message_copy and isinstance(message_copy['data'], dict):
                message_copy['data'].pop('processing_time', None)
            
            content_str = json.dumps(message_copy, sort_keys=True)
            return hashlib.md5(content_str.encode()).hexdigest()
        except Exception:
            # Fallback to timestamp if hashing fails
            return str(datetime.now().timestamp())
    
    def _should_broadcast(self, message_type, message):
        """Check if we should broadcast this message or if it's a duplicate"""
        current_time = time.time()
        message_hash = self._generate_message_hash(message)
        
        # Check if we've sent this exact message recently
        if message_type in self.last_broadcast_hashes:
            last_hash = self.last_broadcast_hashes[message_type]
            last_time = self.last_broadcast_times.get(message_type, 0)
            
            # If same content within dedup window, skip
            if (last_hash == message_hash and 
                current_time - last_time < self.dedup_window_seconds):
                logger.debug(f"🚫 Skipping duplicate {message_type} broadcast (within {self.dedup_window_seconds}s window)")
                return False
        
        # Update tracking
        self.last_broadcast_hashes[message_type] = message_hash
        self.last_broadcast_times[message_type] = current_time
        return True
    
    async def start(self):
        """Start data broadcasting services"""
        if self.running:
            return
            
        self.running = True
        
        # Initialize cache
        await self._initialize_cache()
        
        # Ensure SurrealDB connection for live queries
        await self._ensure_surrealdb_connection()
        
        # Start monitoring services
        await self._start_system_stats_monitoring()
        await self._start_docker_monitoring()
        await self._start_heartbeat()
        
        logger.info("🚀 Enhanced DataBroadcaster started with DEDUPLICATION")
    
    async def stop(self):
        """Stop data broadcasting services"""
        logger.info("🛑 Stopping data broadcaster...")
        self.running = False
        
        # Clear deduplication tracking
        self.last_broadcast_hashes.clear()
        self.last_broadcast_times.clear()
        
        # Kill all live queries
        if surreal_service.connected:
            for query_id in list(self.live_query_ids.values()):
                try:
                    await surreal_service.kill_live_query(query_id)
                except Exception as e:
                    logger.error(f"Error killing live query {query_id}: {e}")
        
        # Cancel all tasks
        all_tasks = list(self.live_query_tasks.values()) + list(self.polling_tasks.values())
        for task in all_tasks:
            if not task.done():
                task.cancel()
        
        # Wait for tasks to finish
        if all_tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*all_tasks, return_exceptions=True),
                    timeout=5.0
                )
            except asyncio.TimeoutError:
                logger.warning("⚠️ Some broadcaster tasks didn't stop within timeout")
        
        self.live_query_tasks.clear()
        self.polling_tasks.clear()
        self.live_query_ids.clear()
        
        logger.info("✅ Data broadcaster stopped")
    
    async def _initialize_cache(self):
        """Initialize cached data for immediate responses"""
        try:
            # Get initial Docker data
            logger.debug("🔄 Initializing Docker cache...")
            stacks = await unified_stack_service.get_all_unified_stacks()
            self.cached_data['docker_stacks'] = stacks
            self.cached_data['last_update']['docker_stacks'] = datetime.now(timezone.utc)
            
            # Get initial system stats
            logger.debug("🔄 Initializing system stats cache...")
            await self._send_immediate_system_stats()
            
        except Exception as e:
            logger.error(f"Error initializing cache: {e}")
    
    async def _ensure_surrealdb_connection(self):
        """Ensure SurrealDB connection for live queries"""
        try:
            if not surreal_service.connected:
                await surreal_service.connect()
                logger.info("✅ SurrealDB connected for data broadcaster")
            else:
                logger.info("✅ SurrealDB already connected")
        except Exception as e:
            logger.error(f"❌ Failed to connect to SurrealDB: {e}")
            logger.info("🔄 Will use polling fallback only")
    
    # System Stats Monitoring - UPDATED FOR BATCHING
    async def _start_system_stats_monitoring(self):
        """Start system stats monitoring with fallback"""
        try:
            logger.info("🔍 Starting batched system stats monitoring...")
            if surreal_service.connected:
                logger.info("🔍 SurrealDB connected, attempting live query...")
                
                live_id = await surreal_service.create_live_query(
                    "system_stats",
                    self._handle_system_stats_update
                )
                
                logger.info(f"🔍 Live query result: {live_id}")
                
                if live_id:
                    self.live_query_ids['system_stats'] = live_id
                    logger.info("✅ System stats live query started (batched mode)")
                    await self._send_immediate_system_stats()
                    return
                else:
                    logger.error("❌ Live query returned None/False")
            else:
                logger.error("❌ SurrealDB not connected for live queries")
            
            # Fallback to polling
            await self._start_system_stats_polling()
            
        except Exception as e:
            logger.error(f"❌ Live query failed for system stats: {e}")
            await self._start_system_stats_polling()
    
    async def _start_system_stats_polling(self):
        """Fallback polling for system stats"""
        logger.info("🔄 Starting system stats polling fallback (batched mode)")
        logger.warning("🐛 Polling fallback should not be used in batched mode - background_collector handles this!")
        
        async def poll_loop():
            while self.running:
                try:
                    logger.debug("📊 Batched polling mode - waiting for background_collector updates...")
                    await asyncio.sleep(self.intervals['system_stats'])
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in system stats polling: {e}")
                    await asyncio.sleep(10)
        
        self.polling_tasks['system_stats'] = asyncio.create_task(poll_loop())
    
    async def _handle_system_stats_update(self, update_data):
        """Handle system stats live query updates - UPDATED FOR BATCHING"""
        try:
            logger.debug("📊 System stats live update received (batched mode)")
            
            # Get recent batch of stats from SurrealDB
            recent_stats = await surreal_service.get_system_stats(hours_back=1) 
            
            if recent_stats and len(recent_stats) > 0:
                # Take the latest 30 stats for the batch
                stats_batch = recent_stats[:30]
                latest_stats = recent_stats[0]
                
                # Cache both individual and batch
                self.cached_data['system_stats'] = latest_stats
                self.cached_data['system_stats_batch'] = stats_batch
                self.cached_data['last_update']['system_stats'] = datetime.now(timezone.utc)
                self.cached_data['last_update']['system_stats_batch'] = datetime.now(timezone.utc)
                
                # Broadcast the batch with DEDUPLICATION
                await self._broadcast_system_stats_batch(stats_batch, trigger="live_query")
                
            else:
                logger.warning("No recent system stats found in SurrealDB for batching")
                
        except Exception as e:
            logger.error(f"Error handling batched system stats update: {e}")

    async def _broadcast_system_stats_batch(self, stats_batch, trigger="batch"):
        """Broadcast batched system stats with DEDUPLICATION"""
        if not stats_batch:
            logger.warning("⚠️ Empty stats batch - skipping broadcast")
            return
        
        # FIXED: Handle timestamp math safely
        timespan_seconds = 0
        try:
            if len(stats_batch) > 1:
                first_ts = stats_batch[0].get("timestamp", 0)
                last_ts = stats_batch[-1].get("timestamp", 0)
                
                # Handle both string and numeric timestamps
                if isinstance(first_ts, str):
                    first_ts = datetime.fromisoformat(first_ts.replace('Z', '+00:00')).timestamp()
                if isinstance(last_ts, str):
                    last_ts = datetime.fromisoformat(last_ts.replace('Z', '+00:00')).timestamp()
                
                timespan_seconds = float(first_ts) - float(last_ts)
        except Exception as e:
            logger.debug(f"Could not calculate timespan: {e}")
            timespan_seconds = 30  # Default to 30 seconds
            
        message = {
            "type": "system_stats_batch",
            "data": {
                "batch": stats_batch,
                "batch_size": len(stats_batch),
                "latest": stats_batch[0] if stats_batch else None,
                "oldest": stats_batch[-1] if stats_batch else None,
                "timespan_seconds": timespan_seconds
            },
            "trigger": trigger,
            "cached_at": self.cached_data['last_update'].get('system_stats_batch', datetime.now(timezone.utc)).isoformat(),
            "playback_info": {
                "total_duration_ms": 30000,
                "update_interval_ms": 500,
                "smooth_tweening": True
            }
        }
        
        # EMERGENCY DEDUPLICATION CHECK
        if self._should_broadcast("system_stats_batch", message):
            await ws_manager.broadcast(message, topic="system_stats")
            logger.info(f"📡 Broadcasted batch of {len(stats_batch)} system stats")
        else:
            logger.debug("🚫 Skipped duplicate system stats batch broadcast")

    async def _broadcast_system_stats(self, stats_data, trigger="polling"):
        """Broadcast single system stats with DEDUPLICATION (backwards compatibility)"""
        message = {
            "type": "system_stats",
            "data": stats_data,
            "trigger": trigger,
            "cached_at": self.cached_data['last_update'].get('system_stats', datetime.now(timezone.utc)).isoformat()
        }
        
        # EMERGENCY DEDUPLICATION CHECK
        if self._should_broadcast("system_stats", message):
            await ws_manager.broadcast(message, topic="system_stats")
            logger.debug("📡 Broadcasted single system stat")
        else:
            logger.debug("🚫 Skipped duplicate system stats broadcast")
    
    async def _send_immediate_system_stats(self):
        """Send immediate system stats data"""
        try:
            recent_stats = await surreal_service.get_system_stats(hours_back=1)
            
            if recent_stats and len(recent_stats) > 0:
                stats_batch = recent_stats[:30]
                latest_stats = recent_stats[0]
                
                # Update cache
                self.cached_data['system_stats'] = latest_stats
                self.cached_data['system_stats_batch'] = stats_batch
                self.cached_data['last_update']['system_stats'] = datetime.now(timezone.utc)
                self.cached_data['last_update']['system_stats_batch'] = datetime.now(timezone.utc)
                
                logger.debug(f"📊 Cached {len(stats_batch)} system stats for immediate responses")
            else:
                logger.debug("📊 No recent system stats found for immediate cache")
                
        except Exception as e:
            logger.error(f"Error getting immediate system stats: {e}")

    # Docker Monitoring with DEDUPLICATION
    async def _start_docker_monitoring(self):
        """Start Docker stacks monitoring with fallback"""
        try:
            if surreal_service.connected:
                live_id = await surreal_service.create_live_query(
                    "unified_stack",
                    self._handle_docker_update
                )
                
                if live_id:
                    self.live_query_ids['docker_stacks'] = live_id
                    logger.info("✅ Docker stacks live query started")
                    await self._send_immediate_docker_data()
                    return
            
            # Fallback to polling
            await self._start_docker_polling()
            
        except Exception as e:
            logger.error(f"❌ Live query failed for Docker stacks: {e}")
            await self._start_docker_polling()
    
    async def _start_docker_polling(self):
        """Fallback polling for Docker stacks"""
        logger.info("🔄 Starting Docker polling fallback")
        
        async def poll_loop():
            while self.running:
                try:
                    stacks = await unified_stack_service.get_all_unified_stacks()
                    
                    # Cache and broadcast
                    self.cached_data['docker_stacks'] = stacks
                    self.cached_data['last_update']['docker_stacks'] = datetime.now(timezone.utc)
                    
                    await self._broadcast_docker_stacks(stacks, trigger="polling")
                    await asyncio.sleep(self.intervals['docker_stacks'])
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in Docker polling: {e}")
                    await asyncio.sleep(10)
        
        self.polling_tasks['docker_stacks'] = asyncio.create_task(poll_loop())
    
    async def _handle_docker_update(self, update_data):
        """Handle Docker stacks live query updates with DEDUPLICATION"""
        try:
            logger.debug("🐳 Docker live update received")
            
            # Get fresh stacks from unified service
            stacks = await unified_stack_service.get_all_unified_stacks()
            
            # Cache and broadcast with deduplication
            self.cached_data['docker_stacks'] = stacks
            self.cached_data['last_update']['docker_stacks'] = datetime.now(timezone.utc)
            
            await self._broadcast_docker_stacks(stacks, trigger="live_query")
            
        except Exception as e:
            logger.error(f"Error handling Docker update: {e}")

    async def _broadcast_docker_stacks(self, stacks, trigger="polling"):
        """Broadcast Docker stacks with EMERGENCY DEDUPLICATION"""
        message = {
            "type": "unified_stacks",
            "data": {
                "available": True,
                "stacks": stacks,
                "total_stacks": len(stacks),
                "processing_time": "0ms"
            },
            "trigger": trigger,
            "cached_at": self.cached_data['last_update'].get('docker_stacks', datetime.now(timezone.utc)).isoformat()
        }
        
        # EMERGENCY DEDUPLICATION CHECK
        if self._should_broadcast("unified_stacks", message):
            await ws_manager.broadcast(message, topic="unified_stacks")
            logger.info(f"📡 Broadcasted {len(stacks)} Docker stacks")
        else:
            logger.debug("🚫 Skipped duplicate Docker stacks broadcast")
    
    async def _send_immediate_docker_data(self):
        """Send immediate Docker data"""
        try:
            stacks = await unified_stack_service.get_all_unified_stacks()
            
            # Cache and broadcast
            self.cached_data['docker_stacks'] = stacks
            self.cached_data['last_update']['docker_stacks'] = datetime.now(timezone.utc)
            
        except Exception as e:
            logger.error(f"Error getting immediate Docker data: {e}")

    # Heartbeat
    async def _start_heartbeat(self):
        """Start heartbeat broadcasting"""
        async def heartbeat_loop():
            while self.running:
                try:
                    await asyncio.sleep(self.intervals['heartbeat'])
                    
                    if ws_manager.clients:
                        heartbeat_message = {
                            "type": "heartbeat",
                            "data": {
                                "server_time": datetime.now(timezone.utc).isoformat(),
                                "uptime_seconds": 0,
                                "connected_clients": len(ws_manager.clients),
                                "active_topics": list(ws_manager.topic_subscribers.keys())
                            },
                            "trigger": "heartbeat"
                        }
                        
                        # Heartbeat with deduplication (though less critical)
                        if self._should_broadcast("heartbeat", heartbeat_message):
                            await ws_manager.broadcast(heartbeat_message, topic="heartbeat")
                            logger.debug("💓 Heartbeat sent to connected clients")
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in heartbeat loop: {e}")
        
        self.polling_tasks['heartbeat'] = asyncio.create_task(heartbeat_loop())
    
    # Public API
    async def force_update_system_stats(self):
        """Force immediate system stats update (legacy method)"""
        try:
            await self._send_immediate_system_stats()
            logger.info("🔄 Forced system stats update")
        except Exception as e:
            logger.error(f"Error forcing system stats update: {e}")

    async def force_update_system_stats_batch(self, stats_batch):
        """Force immediate system stats batch broadcast"""
        try:
            if not stats_batch:
                logger.warning("⚠️ Empty stats batch provided to force_update_system_stats_batch")
                return
                
            # Update cache with the provided batch
            self.cached_data['system_stats_batch'] = stats_batch
            self.cached_data['system_stats'] = stats_batch[0] if stats_batch else None
            self.cached_data['last_update']['system_stats_batch'] = datetime.now(timezone.utc)
            self.cached_data['last_update']['system_stats'] = datetime.now(timezone.utc)
            
            # Broadcast the batch immediately (with deduplication)
            await self._broadcast_system_stats_batch(stats_batch, trigger="forced")
            logger.info(f"🔄 Forced system stats batch broadcast ({len(stats_batch)} stats)")
            
        except Exception as e:
            logger.error(f"Error forcing system stats batch update: {e}")
    
    async def force_update_docker_stacks(self):
        """Force immediate Docker stacks update"""
        try:
            await self._send_immediate_docker_data()
            logger.info("🔄 Forced Docker stacks update")
        except Exception as e:
            logger.error(f"Error forcing Docker stacks update: {e}")
    
    async def send_welcome_data(self, client_id):
        """Send welcome data package to a newly connected client"""
        try:
            # Send cached Docker data
            if self.cached_data['docker_stacks']:
                welcome_docker = {
                    "type": "unified_stacks",
                    "data": {
                        "available": True,
                        "stacks": self.cached_data['docker_stacks'],
                        "total_stacks": len(self.cached_data['docker_stacks']),
                        "processing_time": "0ms"
                    },
                    "trigger": "welcome",
                    "cached_at": self.cached_data['last_update'].get('docker_stacks', datetime.now(timezone.utc)).isoformat()
                }
                await ws_manager.send_to_client(client_id, welcome_docker)
            
            # Send cached system stats batch (prioritize batch over single stat)
            if self.cached_data['system_stats_batch']:
                # FIXED: Handle timestamp math safely
                timespan_seconds = 30  # Default fallback
                try:
                    if len(self.cached_data['system_stats_batch']) > 1:
                        first_ts = self.cached_data['system_stats_batch'][0].get("timestamp", 0)
                        last_ts = self.cached_data['system_stats_batch'][-1].get("timestamp", 0)
                        
                        # Handle both string and numeric timestamps
                        if isinstance(first_ts, str):
                            first_ts = datetime.fromisoformat(first_ts.replace('Z', '+00:00')).timestamp()
                        if isinstance(last_ts, str):
                            last_ts = datetime.fromisoformat(last_ts.replace('Z', '+00:00')).timestamp()
                        
                        timespan_seconds = float(first_ts) - float(last_ts)
                except Exception as e:
                    logger.debug(f"Could not calculate welcome timespan: {e}")
                
                welcome_stats_batch = {
                    "type": "system_stats_batch",
                    "data": {
                        "batch": self.cached_data['system_stats_batch'],
                        "batch_size": len(self.cached_data['system_stats_batch']),
                        "latest": self.cached_data['system_stats_batch'][0],
                        "oldest": self.cached_data['system_stats_batch'][-1],
                        "timespan_seconds": timespan_seconds
                    },
                    "trigger": "welcome",
                    "cached_at": self.cached_data['last_update'].get('system_stats_batch', datetime.now(timezone.utc)).isoformat(),
                    "playback_info": {
                        "total_duration_ms": 30000,
                        "update_interval_ms": 500,
                        "smooth_tweening": True
                    }
                }
                await ws_manager.send_to_client(client_id, welcome_stats_batch)
            elif self.cached_data['system_stats']:
                # Fallback to single stat if batch not available
                welcome_stats = {
                    "type": "system_stats",
                    "data": self.cached_data['system_stats'],
                    "trigger": "welcome",
                    "cached_at": self.cached_data['last_update'].get('system_stats', datetime.now(timezone.utc)).isoformat()
                }
                await ws_manager.send_to_client(client_id, welcome_stats)
            
            # Send server info
            server_info = {
                "type": "server_info",
                "data": {
                    "backend": "picows",
                    "intervals": self.intervals,
                    "live_queries": list(self.live_query_ids.keys()),
                    "polling_fallbacks": list(self.polling_tasks.keys()),
                    "features": ["binary_frames", "orjson", "high_performance", "batched_stats", "deduplication"],
                    "batching": {
                        "system_stats_batch_size": 30,
                        "system_stats_interval_seconds": 30,
                        "playback_duration_ms": 30000,
                        "playback_interval_ms": 500
                    },
                    "deduplication": {
                        "enabled": True,
                        "window_seconds": self.dedup_window_seconds
                    }
                },
                "trigger": "welcome"
            }
            await ws_manager.send_to_client(client_id, server_info)
            
            logger.debug(f"📦 Welcome data sent to client {client_id} (with deduplication)")
            
        except Exception as e:
            logger.error(f"Error sending welcome data to {client_id}: {e}")
    
    def get_stats(self):
        """Get comprehensive broadcaster statistics"""
        return {
            "running": self.running,
            "live_queries": list(self.live_query_ids.keys()),
            "polling_fallbacks": list(self.polling_tasks.keys()),
            "intervals": self.intervals,
            "surrealdb_connected": surreal_service.connected,
            "cache_status": {
                "docker_stacks": self.cached_data['docker_stacks'] is not None,
                "system_stats": self.cached_data['system_stats'] is not None,
                "system_stats_batch": self.cached_data['system_stats_batch'] is not None,
                "batch_size": len(self.cached_data['system_stats_batch']) if self.cached_data['system_stats_batch'] else 0,
                "last_updates": {
                    k: v.isoformat() if v else None 
                    for k, v in self.cached_data['last_update'].items()
                }
            },
            "websocket_stats": ws_manager.get_stats(),
            "batching_info": {
                "enabled": True,
                "batch_size": 30,
                "collection_interval": 1,
                "broadcast_interval": 30
            },
            "deduplication": {
                "enabled": True,
                "window_seconds": self.dedup_window_seconds,
                "last_broadcast_times": self.last_broadcast_times,
                "tracked_message_types": list(self.last_broadcast_hashes.keys())
            }
        }
    
    async def update_interval(self, data_type, interval):
        """Update broadcasting interval for a specific data type"""
        if data_type in self.intervals and interval > 0:
            old_interval = self.intervals[data_type]
            self.intervals[data_type] = interval
            
            logger.info(f"📝 Updated {data_type} interval: {old_interval}s → {interval}s")
            
            # Restart the relevant task if needed
            if data_type in self.polling_tasks:
                task = self.polling_tasks[data_type]
                if not task.done():
                    task.cancel()
                
                # Restart with new interval
                if data_type == 'system_stats':
                    await self._start_system_stats_polling()
                elif data_type == 'docker_stacks':
                    await self._start_docker_polling()
    
    async def get_cached_data(self, data_type=None):
        """Get cached data for immediate responses"""
        if data_type:
            return {
                "data": self.cached_data.get(data_type),
                "last_update": self.cached_data['last_update'].get(data_type)
            }
        else:
            return {
                "docker_stacks": self.cached_data.get('docker_stacks'),
                "system_stats": self.cached_data.get('system_stats'),
                "system_stats_batch": self.cached_data.get('system_stats_batch'),
                "last_updates": self.cached_data['last_update']
            }

    def get_batch_status(self):
        """Get current batch status for debugging"""
        batch = self.cached_data.get('system_stats_batch', [])
        return {
            "cached_batch_size": len(batch),
            "latest_timestamp": batch[0].get("timestamp") if batch else None,
            "oldest_timestamp": batch[-1].get("timestamp") if batch else None,
            "last_update": self.cached_data['last_update'].get('system_stats_batch'),
            "broadcasting_enabled": self.running,
            "deduplication_active": True,
            "dedup_window_seconds": self.dedup_window_seconds
        }

# Global instance
data_broadcaster = DataBroadcaster()