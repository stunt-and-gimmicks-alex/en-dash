# backend/app/services/data_broadcaster.py
"""
Data Broadcasting Service - Separates data collection from websocket management.
Handles data updates and broadcasting through the websocket manager.
FIXED: Use correct SurrealDB method names and ensure connection.
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from .websocket_manager import ws_manager
from .surreal_service import surreal_service
from .docker_unified import unified_stack_service

logger = logging.getLogger(__name__)

class DataBroadcaster:
    """Manages data updates and broadcasting, separate from websocket handling"""
    
    def __init__(self):
        self.running = False
        self.live_query_tasks: Dict[str, asyncio.Task] = {}
        self.polling_tasks: Dict[str, asyncio.Task] = {}
        
        # Data broadcasting intervals
        self.intervals = {
            'system_stats': 5.0,    # 5 second intervals for system stats
            'docker_stacks': 5.0,   # 5 second intervals for docker data  
        }
        
        # Live query IDs
        self.live_query_ids: Dict[str, str] = {}
        
    async def start(self):
        """Start data broadcasting services"""
        if self.running:
            return
            
        self.running = True
        
        # Ensure SurrealDB is connected before starting live queries
        logger.info("🔗 Ensuring SurrealDB connection for data broadcaster...")
        try:
            if not surreal_service.connected:
                await surreal_service.connect()
                logger.info("✅ SurrealDB connected for data broadcaster")
            else:
                logger.info("✅ SurrealDB already connected")
        except Exception as e:
            logger.error(f"❌ Failed to connect to SurrealDB: {e}")
            logger.info("🔄 Will use polling fallback only")
        
        # Start monitoring services
        await self._start_system_stats_monitoring()
        await self._start_docker_monitoring()
        
        logger.info("🚀 DataBroadcaster started")
    
    async def stop(self):
        """Stop data broadcasting services"""
        self.running = False
        
        # Stop all live queries
        for query_type, live_id in self.live_query_ids.items():
            try:
                await surreal_service.kill_live_query(live_id)
                logger.info(f"🛑 Stopped live query for {query_type}")
            except Exception as e:
                logger.error(f"Error stopping live query {query_type}: {e}")
        
        # Cancel all tasks
        all_tasks = list(self.live_query_tasks.values()) + list(self.polling_tasks.values())
        for task in all_tasks:
            if not task.done():
                task.cancel()
        
        # Wait for cancellation
        if all_tasks:
            try:
                await asyncio.gather(*all_tasks, return_exceptions=True)
            except Exception:
                pass
        
        self.live_query_tasks.clear()
        self.polling_tasks.clear()
        self.live_query_ids.clear()
        
        logger.info("🛑 DataBroadcaster stopped")
    
    # System Stats Monitoring
    async def _start_system_stats_monitoring(self):
        """Start system stats monitoring (live query + polling fallback)"""
        try:
            # Try to start live query first - FIXED: use correct method name
            live_id = await surreal_service.create_live_query(
                "LIVE SELECT * FROM system_stats",  # FIXED: Use proper LIVE SELECT syntax
                self._handle_system_stats_update
            )
            
            if live_id:
                self.live_query_ids['system_stats'] = live_id
                logger.info("✅ System stats live query started")
                
                # Send immediate data to new connections
                await self._send_immediate_system_stats()
            else:
                raise Exception("Live query failed")
                
        except Exception as e:
            logger.warning(f"Live query failed for system stats: {e}")
            await self._start_system_stats_polling()
    
    async def _start_system_stats_polling(self):
        """Fallback polling for system stats"""
        logger.info("🔄 Starting system stats polling fallback")
        
        async def poll_loop():
            while self.running:
                try:
                    recent_stats = await surreal_service.get_system_stats(hours_back=1)
                    if recent_stats:
                        await self._broadcast_system_stats(recent_stats[0])
                    
                    await asyncio.sleep(self.intervals['system_stats'])
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in system stats polling: {e}")
                    await asyncio.sleep(5)
        
        self.polling_tasks['system_stats'] = asyncio.create_task(poll_loop())
    
    async def _handle_system_stats_update(self, update_data: Any):
        """Handle system stats live query updates"""
        try:
            logger.debug("📊 System stats live update received")
            
            # Get fresh data
            recent_stats = await surreal_service.get_system_stats(hours_back=1)
            if recent_stats:
                await self._broadcast_system_stats(recent_stats[0], trigger="live_query")
                
        except Exception as e:
            logger.error(f"Error handling system stats update: {e}")
    
    async def _broadcast_system_stats(self, stats_data: dict, trigger: str = "polling"):
        """Broadcast system stats to websocket clients"""
        message = {
            "type": "system_stats",
            "data": stats_data,
            "trigger": trigger
        }
        
        await ws_manager.broadcast(message, topic="system_stats")
    
    async def _send_immediate_system_stats(self):
        """Send immediate system stats to newly connected clients"""
        try:
            recent_stats = await surreal_service.get_system_stats(hours_back=1)
            if recent_stats:
                await self._broadcast_system_stats(recent_stats[0], trigger="immediate")
        except Exception as e:
            logger.error(f"Error sending immediate system stats: {e}")
    
    # Docker Monitoring  
    async def _start_docker_monitoring(self):
        """Start Docker stacks monitoring (live query + polling fallback)"""
        try:
            # Try to start live query first - FIXED: use correct method name
            live_id = await surreal_service.create_live_query(
                "LIVE SELECT * FROM unified_stack",  # FIXED: Use proper LIVE SELECT syntax
                self._handle_docker_update
            )
            
            if live_id:
                self.live_query_ids['docker_stacks'] = live_id
                logger.info("✅ Docker stacks live query started")
                
                # Send immediate data
                await self._send_immediate_docker_data()
            else:
                raise Exception("Live query failed")
                
        except Exception as e:
            logger.warning(f"Live query failed for docker stacks: {e}")
            await self._start_docker_polling()
    
    async def _start_docker_polling(self):
        """Fallback polling for docker stacks"""
        logger.info("🔄 Starting Docker stacks polling fallback")
        
        async def poll_loop():
            while self.running:
                try:
                    stacks = await unified_stack_service.get_all_unified_stacks()
                    await self._broadcast_docker_stacks(stacks)
                    
                    await asyncio.sleep(self.intervals['docker_stacks'])
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in Docker polling: {e}")
                    await asyncio.sleep(5)
        
        self.polling_tasks['docker_stacks'] = asyncio.create_task(poll_loop())
    
    async def _handle_docker_update(self, update_data: Any):
        """Handle Docker stacks live query updates"""
        try:
            logger.debug("📦 Docker stacks live update received")
            
            # Get fresh data
            stacks = await unified_stack_service.get_all_unified_stacks()
            await self._broadcast_docker_stacks(stacks, trigger="live_query")
            
        except Exception as e:
            logger.error(f"Error handling Docker update: {e}")
    
    async def _broadcast_docker_stacks(self, stacks_data: list, trigger: str = "polling"):
        """Broadcast Docker stacks to websocket clients"""
        message = {
            "type": "unified_stacks",
            "data": {
                "available": True,
                "stacks": stacks_data,
                "total_stacks": len(stacks_data),
                "processing_time": "0ms"  # Not relevant for live data
            },
            "trigger": trigger
        }
        
        await ws_manager.broadcast(message, topic="unified_stacks")
    
    async def _send_immediate_docker_data(self):
        """Send immediate Docker data to newly connected clients"""
        try:
            stacks = await unified_stack_service.get_all_unified_stacks()
            await self._broadcast_docker_stacks(stacks, trigger="immediate")
        except Exception as e:
            logger.error(f"Error sending immediate Docker data: {e}")
    
    # Public API
    async def force_update_system_stats(self):
        """Force immediate system stats update"""
        await self._send_immediate_system_stats()
    
    async def force_update_docker_stacks(self):
        """Force immediate Docker stacks update"""
        await self._send_immediate_docker_data()
    
    def get_stats(self) -> dict:
        """Get broadcaster statistics"""
        return {
            "running": self.running,
            "live_queries": list(self.live_query_ids.keys()),
            "polling_fallbacks": list(self.polling_tasks.keys()),
            "intervals": self.intervals,
            "surrealdb_connected": surreal_service.connected
        }

# Global instance
data_broadcaster = DataBroadcaster()