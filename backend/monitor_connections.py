# backend/debug_connection_tracking.py
"""
Debug why connections appear to work but aren't tracked
"""

import asyncio
import logging
from datetime import datetime

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def debug_connection_tracking():
    """Debug connection tracking issues"""
    print("🔍 DEBUGGING CONNECTION TRACKING")
    print("=" * 50)
    
    try:
        from app.services.websocket_manager import ws_manager
        
        # 1. Check WebSocket manager status
        print("1. WEBSOCKET MANAGER STATUS:")
        stats = ws_manager.get_stats()
        print(f"   Available: {stats.get('available', False)}")
        print(f"   Running: {stats.get('running', False)}")
        print(f"   Host: {stats.get('server_info', {}).get('host', 'N/A')}")
        print(f"   Port: {stats.get('server_info', {}).get('port', 'N/A')}")
        print(f"   Total connections: {stats.get('total_connections', 0)}")
        print(f"   Active clients: {stats.get('active_clients', 0)}")
        
        # 2. Check actual clients dictionary
        print(f"\n2. CLIENTS DICTIONARY:")
        print(f"   Raw client count: {len(ws_manager.clients)}")
        print(f"   Client IDs: {list(ws_manager.clients.keys())}")
        
        # Show details of each client
        for client_id, client in ws_manager.clients.items():
            print(f"   📱 Client {client_id}:")
            print(f"      Active: {client.active}")
            print(f"      Remote: {client.remote_addr}")
            print(f"      Connected at: {client.connected_at}")
            print(f"      Subscriptions: {list(client.subscriptions)}")
        
        # 3. Check if picows server is actually running
        print(f"\n3. PICOWS SERVER CHECK:")
        if hasattr(ws_manager, 'picows_server') and ws_manager.picows_server:
            print("   ✅ Picows server object exists")
            print(f"   Server: {ws_manager.picows_server}")
        else:
            print("   ❌ No picows server object found")
        
        # 4. Monitor for new connections in real-time
        print(f"\n4. MONITORING NEW CONNECTIONS...")
        print("   Connect from frontend now...")
        
        # Hook into the connection events
        original_on_connected = None
        if hasattr(ws_manager, '_on_client_connected'):
            original_on_connected = ws_manager._on_client_connected
        
        def debug_on_connected(client_id, client):
            print(f"   🔗 DEBUG: New client connected: {client_id}")
            print(f"      Remote: {client.remote_addr}")
            print(f"      Active: {client.active}")
            if original_on_connected:
                return original_on_connected(client_id, client)
        
        # Monitor for 30 seconds
        start_time = datetime.now()
        last_count = len(ws_manager.clients)
        
        for i in range(30):
            await asyncio.sleep(1)
            current_count = len(ws_manager.clients)
            
            if current_count != last_count:
                timestamp = datetime.now().strftime('%H:%M:%S')
                print(f"   [{timestamp}] Client count changed: {last_count} → {current_count}")
                
                # Show new clients
                if current_count > last_count:
                    for client_id, client in ws_manager.clients.items():
                        print(f"      📱 {client_id}: active={client.active}")
                
                last_count = current_count
        
        # 5. Final status check
        print(f"\n5. FINAL STATUS:")
        final_stats = ws_manager.get_stats()
        print(f"   Total connections: {final_stats.get('total_connections', 0)}")
        print(f"   Active clients: {final_stats.get('active_clients', 0)}")
        print(f"   Raw client count: {len(ws_manager.clients)}")
        
        return len(ws_manager.clients) > 0
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_manual_broadcast():
    """Test sending data to any connected clients"""
    print(f"\n6. TESTING MANUAL BROADCAST...")
    
    try:
        from app.services.websocket_manager import ws_manager
        
        # Check if we have any clients
        if not ws_manager.clients:
            print("   ❌ No clients to broadcast to")
            return
        
        # Send test message
        test_message = {
            "type": "debug_test",
            "data": {
                "message": "Manual test from debug script",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        await ws_manager.broadcast(test_message)
        print("   ✅ Test broadcast sent")
        
        # Also try sending to each client individually
        for client_id, client in ws_manager.clients.items():
            direct_message = {
                "type": "debug_direct",
                "data": {
                    "message": f"Direct message to {client_id}",
                    "timestamp": datetime.now().isoformat()
                }
            }
            
            success = await ws_manager.send_to_client(client_id, direct_message)
            print(f"   📤 Direct message to {client_id}: {success}")
        
    except Exception as e:
        print(f"   ❌ Broadcast test failed: {e}")

if __name__ == "__main__":
    async def main():
        has_connections = await debug_connection_tracking()
        
        if has_connections:
            await test_manual_broadcast()
        
        print("\n" + "=" * 50)
        print("🔧 DIAGNOSIS:")
        print("=" * 50)
        
        if has_connections:
            print("✅ Connections are being tracked properly")
            print("   Issue might be with data broadcasting logic")
        else:
            print("❌ Connections are not being tracked")
            print("   Possible causes:")
            print("   1. Connections established but immediately dropped")
            print("   2. Connection tracking broken in websocket manager")
            print("   3. Frontend connecting to wrong endpoint")
            print("   4. Picows server not handling connections properly")
    
    asyncio.run(main())