"""
Complete WebSocket Manager using picows for high-performance connections.
"""

import asyncio
import logging
import uuid
import orjson
from typing import Dict, Set, Optional, Callable, Any
from datetime import datetime, timezone

try:
    import picows
    from picows import WSFrame, WSTransport, WSListener, WSMsgType, WSUpgradeRequest, ws_create_server
    PICOWS_AVAILABLE = True
except ImportError:
    picows = None
    PICOWS_AVAILABLE = False
    print("WARNING: picows not installed. Install with: pip install picows")

logger = logging.getLogger(__name__)

class PicowsWebSocketClient:
    """Individual websocket client wrapper for picows"""
    
    def __init__(self, client_id: str, transport: WSTransport, remote_addr: str):
        self.client_id = client_id
        self.transport = transport
        self.remote_addr = remote_addr
        self.connected_at = datetime.now(timezone.utc)
        self.last_ping = None
        self.subscriptions: Set[str] = set()
        self.active = True
        
    def send(self, message: dict):
        """Send message as binary frame with orjson"""
        if not self.active:
            return False
            
        try:
            data = orjson.dumps(message)
            self.transport.send(WSMsgType.BINARY, data)
            return True
        except Exception as e:
            logger.debug(f"Failed to send to client {self.client_id}: {e}")
            self.active = False
            return False
    
    def ping(self):
        """Send ping frame"""
        try:
            if self.active:
                self.transport.ping()
                self.last_ping = datetime.now(timezone.utc)
                return True
        except Exception:
            self.active = False
        return False
    
    def disconnect(self):
        """Disconnect the client"""
        try:
            if self.active:
                self.transport.disconnect()
                self.active = False
        except Exception as e:
            logger.debug(f"Error disconnecting client {self.client_id}: {e}")

class EnDashWebSocketListener(WSListener):
    """Picows WebSocket listener for En-Dash clients"""
    
    def __init__(self, manager: 'PicowsWebSocketManager'):
        self.manager = manager
        self.client: Optional[PicowsWebSocketClient] = None
    
    def on_ws_connected(self, transport: WSTransport):
        """Called when a WebSocket connection is established"""
        client_id = str(uuid.uuid4())
        remote_addr = getattr(transport, 'remote_address', 'unknown')
        
        # Create client wrapper
        self.client = PicowsWebSocketClient(client_id, transport, remote_addr)
        
        # Register with manager
        self.manager.clients[client_id] = self.client
        
        logger.info(f"🔗 Picows client {client_id} connected from {remote_addr}")
        
        # Send welcome message
        welcome_message = {
            "type": "connected",
            "client_id": client_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "backend": "picows"
        }
        
        try:
            self.client.send(welcome_message)
        except Exception as e:
            logger.error(f"Failed to send welcome message: {e}")

        asyncio.create_task(self._send_welcome_data(client_id))

    async def _send_welcome_data(self, client_id: str):
        """Send cached data to newly connected client"""
        try:
            from ..services.data_broadcaster import data_broadcaster
            await data_broadcaster.send_welcome_data(client_id)
            logger.debug(f"📦 Welcome data sent to {client_id}")
        except Exception as e:
            logger.error(f"Error sending welcome data to {client_id}: {e}")
    
    def on_ws_frame(self, transport: WSTransport, frame: WSFrame):
        """Handle incoming WebSocket frames"""
        if not self.client:
            return
            
        try:
            if frame.msg_type == WSMsgType.BINARY:
                # Parse JSON from binary frame
                data = orjson.loads(frame.get_payload_as_bytes())
                asyncio.create_task(self.manager._handle_message(self.client, data))
                
            elif frame.msg_type == WSMsgType.TEXT:
                # Parse JSON from text frame
                data = orjson.loads(frame.get_payload_as_ascii_text())
                asyncio.create_task(self.manager._handle_message(self.client, data))
                
            elif frame.msg_type == WSMsgType.PING:
                # Auto-respond to ping
                transport.send_pong(frame.get_payload_as_bytes())
                
            elif frame.msg_type == WSMsgType.CLOSE:
                # Handle close
                self._on_disconnect()
                
        except Exception as e:
            logger.error(f"Error handling frame from {self.client.client_id}: {e}")
            self._on_disconnect()
    
    def on_ws_disconnected(self, transport: WSTransport):
        """Called when WebSocket is disconnected"""
        self._on_disconnect()
    
    def _on_disconnect(self):
        """Handle client disconnection"""
        if self.client and self.client.client_id in self.manager.clients:
            logger.info(f"🔌 Picows client {self.client.client_id} disconnected")
            
            # Remove from topic subscriptions
            for topic, subscribers in self.manager.topic_subscribers.items():
                subscribers.discard(self.client.client_id)
            
            # Remove from clients
            del self.manager.clients[self.client.client_id]
            
            self.client.active = False

class PicowsWebSocketManager:
    """High-performance WebSocket manager using picows native server"""
    
    def __init__(self):
        self.clients: Dict[str, PicowsWebSocketClient] = {}
        self.topic_subscribers: Dict[str, Set[str]] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self.running = False
        self.cleanup_task: Optional[asyncio.Task] = None
        self.picows_server: Optional[asyncio.Server] = None
        
        # WebSocket server configuration
        self.host = "0.0.0.0"
        self.port = 8002  # Separate port for picows
        
        # Register default message handlers
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default message handlers"""
        self.message_handlers.update({
            'ping': self._handle_ping,
            'subscribe': self._handle_subscribe,
            'unsubscribe': self._handle_unsubscribe,
            'set_update_interval': self._handle_update_interval,
        })
    
    async def start(self):
        """Start the picows websocket server"""
        if self.running:
            return
            
        if not PICOWS_AVAILABLE:
            logger.error("❌ Cannot start picows server - picows not installed")
            return
            
        self.running = True
        
        try:
            # Create picows server
            def listener_factory(request: WSUpgradeRequest):
                """Factory function to create listeners for new connections"""
                return EnDashWebSocketListener(self)
            
            self.picows_server = await ws_create_server(
                listener_factory,
                self.host,
                self.port,
                # Performance optimizations
                enable_auto_ping=True,
                auto_ping_idle_timeout=30.0,
                auto_ping_reply_timeout=10.0,
                enable_auto_pong=True,
                max_frame_size=10 * 1024 * 1024,  # 10MB max frame
                disconnect_on_exception=True,
                logger_name='endash.picows'
            )
            
            # Start cleanup task
            self.cleanup_task = asyncio.create_task(self._cleanup_loop())
            
            logger.info(f"🚀 Picows WebSocket server started on {self.host}:{self.port}")
            logger.info(f"📡 WebSocket endpoint: ws://{self.host}:{self.port}/")
            
        except Exception as e:
            logger.error(f"❌ Failed to start picows server: {e}")
            self.running = False
    
    async def stop(self):
        """Stop the picows websocket server"""
        if not self.running:
            return
            
        self.running = False
        
        # Stop picows server
        if self.picows_server:
            self.picows_server.close()
            await self.picows_server.wait_closed()
            logger.info("🛑 Picows server closed")
        
        # Cancel cleanup task
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Disconnect all clients
        for client in list(self.clients.values()):
            client.disconnect()
        
        self.clients.clear()
        self.topic_subscribers.clear()
        
        logger.info("🛑 PicowsWebSocketManager stopped")
    
    async def _cleanup_loop(self):
        """Periodic cleanup of dead connections"""
        while self.running:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Find and remove dead clients
                dead_clients = []
                for client_id, client in self.clients.items():
                    if not client.active:
                        dead_clients.append(client_id)
                
                # Remove dead clients
                for client_id in dead_clients:
                    if client_id in self.clients:
                        # Remove from topic subscriptions
                        for topic, subscribers in self.topic_subscribers.items():
                            subscribers.discard(client_id)
                        
                        # Remove from clients
                        del self.clients[client_id]
                
                if dead_clients:
                    logger.info(f"🧹 Cleaned up {len(dead_clients)} dead connections")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
    
    async def _handle_message(self, client: PicowsWebSocketClient, message: dict):
        """Handle incoming messages from clients"""
        try:
            msg_type = message.get('type', 'unknown')
            handler = self.message_handlers.get(msg_type)
            
            if handler:
                await handler(client, message)
            else:
                logger.debug(f"Unknown message type: {msg_type}")
                
        except Exception as e:
            logger.error(f"Error handling message from {client.client_id}: {e}")
    
    # Message handlers
    async def _handle_ping(self, client: PicowsWebSocketClient, message: dict):
        """Handle ping messages"""
        client.send({
            "type": "pong",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def _handle_subscribe(self, client: PicowsWebSocketClient, message: dict):
        """Handle subscription requests"""
        topic = message.get('topic')
        if topic:
            if topic not in self.topic_subscribers:
                self.topic_subscribers[topic] = set()
            
            self.topic_subscribers[topic].add(client.client_id)
            client.subscriptions.add(topic)
            
            logger.debug(f"Client {client.client_id} subscribed to {topic}")
            
            client.send({
                "type": "subscribed",
                "topic": topic,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    
    async def _handle_unsubscribe(self, client: PicowsWebSocketClient, message: dict):
        """Handle unsubscription requests"""
        topic = message.get('topic')
        if topic and topic in self.topic_subscribers:
            self.topic_subscribers[topic].discard(client.client_id)
            client.subscriptions.discard(topic)
            
            logger.debug(f"Client {client.client_id} unsubscribed from {topic}")
            
            client.send({
                "type": "unsubscribed",
                "topic": topic,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    
    async def _handle_update_interval(self, client: PicowsWebSocketClient, message: dict):
        """Handle update interval changes"""
        interval = message.get('interval', 5.0)
        logger.debug(f"Client {client.client_id} requested interval: {interval}s")
        
        client.send({
            "type": "interval_updated",
            "interval": interval,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    # Public API methods
    async def broadcast(self, message: dict, topic: str = None):
        """Broadcast message to all clients or topic subscribers"""
        if topic:
            # Broadcast to topic subscribers
            subscriber_ids = self.topic_subscribers.get(topic, set())
            clients = [self.clients[cid] for cid in subscriber_ids if cid in self.clients]
        else:
            # Broadcast to all clients
            clients = list(self.clients.values())
        
        if not clients:
            return
        
        # Add metadata
        enhanced_message = message.copy()
        enhanced_message.update({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "connection_count": len(self.clients),
            "backend": "picows"
        })
        
        # Send to all clients
        successful = 0
        for client in clients:
            if client.send(enhanced_message):
                successful += 1
        
        if successful > 0:
            logger.debug(f"📡 Picows broadcast sent to {successful}/{len(clients)} clients")
    
    async def send_to_client(self, client_id: str, message: dict):
        """Send message to specific client"""
        client = self.clients.get(client_id)
        if client:
            return client.send(message)
        return False
    
    def get_stats(self) -> dict:
        """Get websocket manager statistics"""
        return {
            "backend": "picows",
            "available": PICOWS_AVAILABLE,
            "running": self.running,
            "server_info": {
                "host": self.host,
                "port": self.port,
                "endpoint": f"ws://{self.host}:{self.port}/"
            },
            "total_connections": len(self.clients),
            "active_clients": sum(1 for c in self.clients.values() if c.active),
            "topics": {topic: len(subs) for topic, subs in self.topic_subscribers.items()}
        }
    
    def register_handler(self, message_type: str, handler: Callable):
        """Register custom message handler"""
        self.message_handlers[message_type] = handler

# Global instance
ws_manager = PicowsWebSocketManager()