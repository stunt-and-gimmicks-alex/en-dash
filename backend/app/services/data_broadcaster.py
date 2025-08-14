# backend/app/services/data_broadcaster.py
"""
Enhanced Data Broadcasting Service for Picows WebSocket Manager
Handles data updates and broadcasting with proper error handling and fallbacks
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from .websocket_manager import ws_manager
from .surreal_service import surreal_service
from .docker_unified import unified_stack_service

logger = logging.getLogger(__name__)

class DataBroadcaster:
    """Enhanced data broadcaster for picows integration"""
    
    def __init__(self):
        self.running = False
        self.live_query_tasks: Dict[str, asyncio.Task] = {}
        self.polling_tasks: Dict[str, asyncio.Task] = {}
        
        # Data broadcasting intervals (in seconds)
        self.intervals = {
            'system_stats': 5.0,
            'docker_stacks': 3.0,  # Slightly faster for docker updates
            'heartbeat': 30.0      # Regular heartbeat
        }
        
        # Live query tracking
        self.live_query_ids: Dict[str, str] = {}
        
        # Cache for immediate responses to new connections
        self.cached_data = {
            'system_stats': None,
            'docker_stacks': None,
            'last_update': {}
        }
    
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
        
        logger.info("🚀 Enhanced DataBroadcaster started")
    
    async def stop(self):
        """Stop data broadcasting services"""
        self.running = False
        
        # Stop all live queries
        for query_type, live_id in self.live_query_ids.items():
            try:
                if surreal_service.connected:
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
        
        # Clear state
        self.live_query_tasks.clear()
        self.polling_tasks.clear()
        self.live_query_ids.clear()
        self.cached_data = {'system_stats': None, 'docker_stacks': None, 'last_update': {}}
        
        logger.info("🛑 Enhanced DataBroadcaster stopped")
    
    async def _initialize_cache(self):
        """Initialize data cache with current values"""
        try:
            # Cache Docker stacks
            docker_data = await unified_stack_service.get_all_unified_stacks()
            self.cached_data['docker_stacks'] = docker_data
            self.cached_data['last_update']['docker_stacks'] = datetime.now(timezone.utc)
            
            logger.info("✅ Data cache initialized")
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
    
    # System Stats Monitoring
    async def _start_system_stats_monitoring(self):
        """Start system stats monitoring with fallback"""
        try:
            logger.info("🔍 DEBUG: Starting system stats monitoring...")
            if surreal_service.connected:
                logger.info("🔍 DEBUG: SurrealDB is connected, attempting live query...")
                
                live_id = await surreal_service.create_live_query(
                    "system_stats",  # Just the table name
                    self._handle_system_stats_update
                )
                
                logger.info(f"🔍 DEBUG: Live query result: {live_id}")
                
                if live_id:
                    self.live_query_ids['system_stats'] = live_id
                    logger.info("✅ System stats live query started")
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
        logger.info("🔄 Starting system stats polling fallback")
        
        async def poll_loop():
            while self.running:
                try:
                    # This would integrate with your system stats service
                    # For now, we'll send a basic heartbeat
                    stats_data = {
                        "cpu_usage": 0.0,
                        "memory_usage": 0.0,
                        "disk_usage": 0.0,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "source": "polling"
                    }
                    
                    # Cache and broadcast
                    self.cached_data['system_stats'] = stats_data
                    self.cached_data['last_update']['system_stats'] = datetime.now(timezone.utc)
                    
                    await self._broadcast_system_stats(stats_data, trigger="polling")
                    await asyncio.sleep(self.intervals['system_stats'])
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in system stats polling: {e}")
                    await asyncio.sleep(10)  # Longer delay on error
        
        self.polling_tasks['system_stats'] = asyncio.create_task(poll_loop())
    
    async def _handle_system_stats_update(self, update_data: Any):
        """Handle system stats live query updates"""
        try:
            logger.debug("📊 System stats live update received")
            
            # Get fresh data from SurrealDB 
            recent_stats = await surreal_service.get_system_stats(hours_back=1)  # We'll fix this method call in step 2
            
            if recent_stats and len(recent_stats) > 0:
                # Get the most recent stat entry
                latest_stats = recent_stats[0]
                
                # Cache and broadcast (same pattern as Docker)
                self.cached_data['system_stats'] = latest_stats
                self.cached_data['last_update']['system_stats'] = datetime.now(timezone.utc)
                
                await self._broadcast_system_stats(latest_stats, trigger="live_query")
            else:
                logger.warning("No recent system stats found in SurrealDB")
                
        except Exception as e:
            logger.error(f"Error handling system stats update: {e}")

    async def _broadcast_system_stats(self, stats_data: dict, trigger: str = "polling"):
        """Broadcast system stats to websocket clients"""
        message = {
            "type": "system_stats",
            "data": stats_data,
            "trigger": trigger,
            "cached_at": self.cached_data['last_update'].get('system_stats', datetime.now(timezone.utc)).isoformat()
        }
        
        await ws_manager.broadcast(message, topic="system_stats")
    
    async def _send_immediate_system_stats(self):
        """Send immediate system stats data"""
        try:
            if self.cached_data['system_stats']:
                await self._broadcast_system_stats(self.cached_data['system_stats'], trigger="immediate")
        except Exception as e:
            logger.error(f"Error sending immediate system stats: {e}")
    

    # Docker Monitoring
    
    # =============================================================================
    # USER EVENT TABLE BIFURCATION
    # =============================================================================    

    async def _start_docker_monitoring(self):
        """Start Docker stacks monitoring with fallback"""
        try:
            if surreal_service.connected:
                # Try live query first
                live_id = await surreal_service.create_live_query(
                    "user_events",
                    self._handle_user_event
                )
                                
                if live_id:
                    self.live_query_ids['docker_stacks'] = live_id
                    
                    # Send immediate data
                    await self._send_immediate_docker_data()
                    return
            
            logger.info("🔄 Docker monitoring will use live queries only (no polling fallback)")
            
        except Exception as e:
            logger.warning(f"Live query failed for docker stacks: {e}")
    
    async def _handle_docker_update(self, update_data: Any):
        """Handle significant Docker stacks live query updates"""
        try:
            
            # Re-fetch and broadcast (only called for significant changes now)
            stacks = await unified_stack_service.get_all_unified_stacks()
            self.cached_data['docker_stacks'] = stacks
            self.cached_data['last_update']['docker_stacks'] = datetime.now(timezone.utc)
            
            await self._broadcast_docker_stacks(stacks, trigger="live_query_filtered")
            
        except Exception as e:
            print(f"🐛 ERROR in docker update: {e}")

    async def _handle_user_event(self, event_data: Any):
        """Handle user events from the events table"""
        try:
            
            # Only broadcast for Docker-related events
            if "docker" in str(event_data).lower():
                
                # Get fresh stack data and broadcast
                stacks = await unified_stack_service.get_all_unified_stacks()
                self.cached_data['docker_stacks'] = stacks
                self.cached_data['last_update']['docker_stacks'] = datetime.now(timezone.utc)
                
                await self._broadcast_docker_stacks(stacks, trigger="user_event")
            else:
                print(f"🐛 NON-DOCKER EVENT - Ignoring")
            
        except Exception as e:
            print(f"🐛 ERROR in user event handler: {e}")
    
    async def _broadcast_docker_stacks(self, stacks_data: list, trigger: str = "polling"):
        """Broadcast Docker stacks to websocket clients"""
        message = {
            "type": "unified_stacks",
            "data": {
                "available": True,
                "stacks": stacks_data,
                "total_stacks": len(stacks_data),
                "processing_time": "0ms"  # Real-time data
            },
            "trigger": trigger,
            "cached_at": self.cached_data['last_update'].get('docker_stacks', datetime.now(timezone.utc)).isoformat()
        }
        
        await ws_manager.broadcast(message, topic="unified_stacks")
    
    async def _send_immediate_docker_data(self):
        """Send immediate Docker data to newly connected clients"""
        try:
            if self.cached_data['docker_stacks']:
                await self._broadcast_docker_stacks(self.cached_data['docker_stacks'], trigger="immediate")
            else:
                # Fetch fresh data if cache is empty
                stacks = await unified_stack_service.get_all_unified_stacks()
                self.cached_data['docker_stacks'] = stacks
                self.cached_data['last_update']['docker_stacks'] = datetime.now(timezone.utc)
                await self._broadcast_docker_stacks(stacks, trigger="immediate")
        except Exception as e:
            logger.error(f"Error sending immediate Docker data: {e}")
    
    # Heartbeat
    async def _start_heartbeat(self):
        """Start heartbeat broadcasting"""
        async def heartbeat_loop():
            while self.running:
                try:
                    await asyncio.sleep(self.intervals['heartbeat'])
                    
                    if ws_manager.clients:  # Only send if there are connected clients
                        heartbeat_message = {
                            "type": "heartbeat",
                            "data": {
                                "server_time": datetime.now(timezone.utc).isoformat(),
                                "uptime_seconds": 0,  # Could calculate actual uptime
                                "connected_clients": len(ws_manager.clients),
                                "active_topics": list(ws_manager.topic_subscribers.keys())
                            },
                            "trigger": "heartbeat"
                        }
                        
                        await ws_manager.broadcast(heartbeat_message, topic="heartbeat")
                        logger.debug("💓 Heartbeat sent to connected clients")
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in heartbeat loop: {e}")
        
        self.polling_tasks['heartbeat'] = asyncio.create_task(heartbeat_loop())
    
    # Public API
    async def force_update_system_stats(self):
        """Force immediate system stats update"""
        try:
            await self._send_immediate_system_stats()
            logger.info("🔄 Forced system stats update")
        except Exception as e:
            logger.error(f"Error forcing system stats update: {e}")
    
    async def force_update_docker_stacks(self):
        """Force immediate Docker stacks update"""
        try:
            await self._send_immediate_docker_data()
            logger.info("🔄 Forced Docker stacks update")
        except Exception as e:
            logger.error(f"Error forcing Docker stacks update: {e}")
    
    async def send_welcome_data(self, client_id: str):
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
            
            # Send cached system stats
            if self.cached_data['system_stats']:
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
                    "features": ["binary_frames", "orjson", "high_performance"]
                },
                "trigger": "welcome"
            }
            await ws_manager.send_to_client(client_id, server_info)
            
            logger.debug(f"📦 Welcome data sent to client {client_id}")
            
        except Exception as e:
            logger.error(f"Error sending welcome data to {client_id}: {e}")
    
    def get_stats(self) -> dict:
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
                "last_updates": {
                    k: v.isoformat() if v else None 
                    for k, v in self.cached_data['last_update'].items()
                }
            },
            "websocket_stats": ws_manager.get_stats()
        }
    
    async def update_interval(self, data_type: str, interval: float):
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
    
    async def get_cached_data(self, data_type: str = None) -> dict:
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
                "last_updates": self.cached_data['last_update']
            }

# Global instance
data_broadcaster = DataBroadcaster()