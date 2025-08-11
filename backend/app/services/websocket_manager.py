# backend/app/services/websocket_manager.py
"""
Optimized WebSocket Manager using picows for high-performance connections.
Separates websocket handling from data collection/processing.
"""

import asyncio
import logging
import uuid
import orjson
from typing import Dict, Set, Optional, Callable, Any
from datetime import datetime, timezone
from contextlib import asynccontextmanager

try:
    import picows
except ImportError:
    picows = None
    print("WARNING: picows not installed. Install with: pip install picows")

logger = logging.getLogger(__name__)

class WebSocketClient:
    """Individual websocket client wrapper"""
    
    def __init__(self, client_id: str, ws, remote_addr: str):
        self.client_id = client_id
        self.ws = ws
        self.remote_addr = remote_addr
        self.connected_at = datetime.now(timezone.utc)
        self.last_ping = None
        self.subscriptions: Set[str] = set()
        
    async def send(self, message: dict):
        """Send message as binary frame with orjson"""
        try:
            data = orjson.dumps(message)
            await self.ws.send(data, picows.WSMsgType.BINARY)
            return True
        except Exception as e:
            logger.debug(f"Failed to send to client {self.client_id}: {e}")
            return False
    
    async def ping(self):
        """Send ping frame"""
        try:
            await self.ws.ping()
            self.last_ping = datetime.now(timezone.utc)
            return True
        except Exception:
            return False

class PicowsWebSocketManager:
    """High-performance WebSocket manager using picows"""
    
    def __init__(self):
        self.clients: Dict[str, WebSocketClient] = {}
        self.topic_subscribers: Dict[str, Set[str]] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self.running = False
        self.cleanup_task: Optional[asyncio.Task] = None
        
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
        """Start the websocket manager"""
        if self.running:
            return
            
        self.running = True
        # Start cleanup task for dead connections
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("🚀 PicowsWebSocketManager started")
    
    async def stop(self):
        """Stop the websocket manager"""
        self.running = False
        
        # Cancel cleanup task
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Close all connections
        for client in list(self.clients.values()):
            await self._disconnect_client(client.client_id)
        
        logger.info("🛑 PicowsWebSocketManager stopped")
    
    async def handle_connection(self, ws, remote_addr: str = "unknown"):
        """Handle new websocket connection"""
        client_id = str(uuid.uuid4())
        client = WebSocketClient(client_id, ws, remote_addr)
        
        self.clients[client_id] = client
        logger.info(f"🔗 Client {client_id} connected from {remote_addr}")
        
        try:
            # Send welcome message
            await client.send({
                "type": "connected",
                "client_id": client_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "compression_disabled": True,
                "binary_frames": True
            })
            
            # Handle messages with timeout
            while self.running:
                try:
                    # Non-blocking receive with 1s timeout
                    msg = await asyncio.wait_for(ws.recv(), timeout=1.0)
                    
                    if msg.msg_type == picows.WSMsgType.BINARY:
                        await self._handle_binary_message(client, msg.data)
                    elif msg.msg_type == picows.WSMsgType.TEXT:
                        await self._handle_text_message(client, msg.data)
                    elif msg.msg_type == picows.WSMsgType.PING:
                        await ws.pong(msg.data)
                    elif msg.msg_type == picows.WSMsgType.CLOSE:
                        break
                        
                except asyncio.TimeoutError:
                    # Timeout is normal - allows cleanup and prevents blocking
                    continue
                except picows.WSError as e:
                    if "close" not in str(e).lower():
                        logger.debug(f"WebSocket error for {client_id}: {e}")
                    break
                except Exception as e:
                    logger.error(f"Error handling client {client_id}: {e}")
                    break
                    
        finally:
            await self._disconnect_client(client_id)
    
    async def _handle_binary_message(self, client: WebSocketClient, data: bytes):
        """Handle binary message (preferred format)"""
        try:
            message = orjson.loads(data)
            await self._process_message(client, message)
        except orjson.JSONDecodeError:
            await client.send({
                "type": "error",
                "message": "Invalid JSON in binary message"
            })
    
    async def _handle_text_message(self, client: WebSocketClient, data: str):
        """Handle text message (fallback)"""
        try:
            message = orjson.loads(data)
            await self._process_message(client, message)
        except orjson.JSONDecodeError:
            await client.send({
                "type": "error", 
                "message": "Invalid JSON in text message"
            })
    
    async def _process_message(self, client: WebSocketClient, message: dict):
        """Process parsed message"""
        msg_type = message.get("type")
        if not msg_type:
            await client.send({
                "type": "error",
                "message": "Message missing 'type' field"
            })
            return
        
        handler = self.message_handlers.get(msg_type)
        if handler:
            try:
                await handler(client, message)
            except Exception as e:
                logger.error(f"Error in handler for {msg_type}: {e}")
                await client.send({
                    "type": "error",
                    "message": f"Handler error: {str(e)}"
                })
        else:
            logger.warning(f"No handler for message type: {msg_type}")
    
    # Default message handlers
    async def _handle_ping(self, client: WebSocketClient, message: dict):
        """Handle ping message"""
        await client.send({
            "type": "pong", 
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def _handle_subscribe(self, client: WebSocketClient, message: dict):
        """Handle subscription to topics"""
        topics = message.get("topics", [])
        if isinstance(topics, str):
            topics = [topics]
        
        for topic in topics:
            client.subscriptions.add(topic)
            if topic not in self.topic_subscribers:
                self.topic_subscribers[topic] = set()
            self.topic_subscribers[topic].add(client.client_id)
        
        await client.send({
            "type": "subscribed",
            "topics": list(client.subscriptions)
        })
    
    async def _handle_unsubscribe(self, client: WebSocketClient, message: dict):
        """Handle unsubscription from topics"""
        topics = message.get("topics", [])
        if isinstance(topics, str):
            topics = [topics]
        
        for topic in topics:
            client.subscriptions.discard(topic)
            if topic in self.topic_subscribers:
                self.topic_subscribers[topic].discard(client.client_id)
        
        await client.send({
            "type": "unsubscribed", 
            "topics": topics
        })
    
    async def _handle_update_interval(self, client: WebSocketClient, message: dict):
        """Handle update interval change (legacy compatibility)"""
        interval = message.get("interval", 3.0)
        # Store interval preference for client
        # This is handled by data broadcaster, not websocket layer
        await client.send({
            "type": "config_updated",
            "message": f"Update interval preference set to {interval} seconds"
        })
    
    async def _disconnect_client(self, client_id: str):
        """Disconnect and cleanup client"""
        client = self.clients.get(client_id)
        if not client:
            return
        
        # Remove from topic subscriptions
        for topic in client.subscriptions:
            if topic in self.topic_subscribers:
                self.topic_subscribers[topic].discard(client_id)
        
        # Remove client
        del self.clients[client_id]
        
        logger.info(f"🔌 Client {client_id} disconnected")
    
    async def _cleanup_loop(self):
        """Periodic cleanup of dead connections"""
        while self.running:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                dead_clients = []
                for client_id, client in self.clients.items():
                    # Try to ping client
                    if not await client.ping():
                        dead_clients.append(client_id)
                
                # Remove dead clients
                for client_id in dead_clients:
                    await self._disconnect_client(client_id)
                    
                if dead_clients:
                    logger.info(f"🧹 Cleaned up {len(dead_clients)} dead connections")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
    
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
        message.update({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "connection_count": len(self.clients)
        })
        
        # Send to all clients concurrently
        tasks = [client.send(message) for client in clients]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successful sends
        successful = sum(1 for r in results if r is True)
        logger.debug(f"📡 Broadcast sent to {successful}/{len(clients)} clients")
    
    async def send_to_client(self, client_id: str, message: dict):
        """Send message to specific client"""
        client = self.clients.get(client_id)
        if client:
            return await client.send(message)
        return False
    
    def get_stats(self) -> dict:
        """Get websocket manager statistics"""
        return {
            "total_connections": len(self.clients),
            "topics": {topic: len(subs) for topic, subs in self.topic_subscribers.items()},
            "running": self.running
        }
    
    def register_handler(self, message_type: str, handler: Callable):
        """Register custom message handler"""
        self.message_handlers[message_type] = handler

# Global instance
ws_manager = PicowsWebSocketManager()