# backend/debug_live_updates.py
"""
Debug why live updates are not being sent to connected clients
"""

import asyncio
import logging
import json
from datetime import datetime

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def debug_live_updates():
    """Debug live update broadcasting issues"""
    print("🔍 DEBUGGING LIVE UPDATES")
    print("=" * 40)
    
    try:
        from app.services.websocket_manager import ws_manager
        from app.services.data_broadcaster import data_broadcaster
        from app.services.surreal_service import surreal_service
        
        # 1. Check current connections
        print("\n1. CHECKING CONNECTED CLIENTS...")
        stats = ws_manager.get_stats()
        print(f"   Total connections: {stats.get('total_connections', 0)}")
        
        if stats.get('total_connections', 0) == 0:
            print("   ❌ No clients connected!")
            return False
        
        # List clients
        for client_id, client in ws_manager.clients.items():
            print(f"   📱 Client {client_id}: active={client.active}, subscriptions={list(client.subscriptions)}")
        
        # 2. Check data broadcaster status
        print("\n2. CHECKING DATA BROADCASTER...")
        broadcaster_stats = data_broadcaster.get_stats()
        print(f"   Running: {broadcaster_stats.get('running', False)}")
        print(f"   Live queries: {broadcaster_stats.get('live_queries', [])}")
        print(f"   Polling fallbacks: {broadcaster_stats.get('polling_fallbacks', [])}")
        print(f"   SurrealDB connected: {broadcaster_stats.get('surrealdb_connected', False)}")
        
        # 3. Check SurrealDB live queries
        print("\n3. CHECKING SURREALDB LIVE QUERIES...")
        print(f"   Connected: {surreal_service.connected}")
        print(f"   Live queries registered: {len(surreal_service.live_queries)}")
        
        for query_id, query_info in surreal_service.live_queries.items():
            print(f"   🔴 Query {query_id}: {query_info}")
        
        # 4. Force a manual broadcast to test
        print("\n4. TESTING MANUAL BROADCAST...")
        test_message = {
            "type": "test_live_update",
            "data": {
                "message": "Manual test broadcast",
                "timestamp": datetime.now().isoformat(),
                "test": True
            }
        }
        
        await ws_manager.broadcast(test_message)
        print("   ✅ Manual broadcast sent")
        
        # 5. Force system stats update
        print("\n5. FORCING SYSTEM STATS UPDATE...")
        try:
            await data_broadcaster.force_update_system_stats()
            print("   ✅ System stats update forced")
        except Exception as e:
            print(f"   ❌ System stats update failed: {e}")
        
        # 6. Force docker stacks update
        print("\n6. FORCING DOCKER STACKS UPDATE...")
        try:
            await data_broadcaster.force_update_docker_stacks()
            print("   ✅ Docker stacks update forced")
        except Exception as e:
            print(f"   ❌ Docker stacks update failed: {e}")
        
        # 7. Check if live queries are actually triggering
        print("\n7. TESTING LIVE QUERY TRIGGERS...")
        
        if surreal_service.connected:
            # Write a test record to trigger live queries
            try:
                test_stats = {
                    "timestamp": datetime.now().isoformat(),
                    "cpu_percent": 50.0,
                    "memory_percent": 60.0,
                    "test_record": True
                }
                
                # This should trigger the system_stats live query
                await surreal_service.db.create("system_stats", test_stats)
                print("   ✅ Test system stats record created - should trigger live query")
                
                # Wait a moment to see if the live query fires
                await asyncio.sleep(2)
                
            except Exception as e:
                print(f"   ❌ Live query test failed: {e}")
        else:
            print("   ⚠️ SurrealDB not connected - live queries won't work")
        
        # 8. Check if the issue is with data collection intervals
        print("\n8. CHECKING UPDATE INTERVALS...")
        intervals = data_broadcaster.intervals
        for data_type, interval in intervals.items():
            print(f"   📊 {data_type}: {interval}s")
        
        # 9. Check heartbeat functionality
        print("\n9. TESTING HEARTBEAT...")
        try:
            # The heartbeat should run every 30 seconds
            heartbeat_message = {
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat(),
                "server_status": "healthy"
            }
            
            await ws_manager.broadcast(heartbeat_message, topic="heartbeat")
            print("   ✅ Heartbeat broadcast sent")
        except Exception as e:
            print(f"   ❌ Heartbeat test failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def monitor_live_updates():
    """Monitor for live updates for 30 seconds"""
    print("\n10. MONITORING FOR LIVE UPDATES (30 seconds)...")
    
    try:
        from app.services.websocket_manager import ws_manager
        
        # Hook into the broadcast function to see what's being sent
        original_broadcast = ws_manager.broadcast
        
        async def monitored_broadcast(message, topic=None):
            print(f"   📡 BROADCAST: type={message.get('type')} topic={topic} time={datetime.now().strftime('%H:%M:%S')}")
            return await original_broadcast(message, topic)
        
        # Replace broadcast function temporarily
        ws_manager.broadcast = monitored_broadcast
        
        print("   👂 Listening for broadcasts...")
        await asyncio.sleep(30)
        
        # Restore original function
        ws_manager.broadcast = original_broadcast
        
        print("   ⏰ Monitoring complete")
        
    except Exception as e:
        print(f"   ❌ Monitoring failed: {e}")

if __name__ == "__main__":
    async def main():
        success = await debug_live_updates()
        
        if success:
            await monitor_live_updates()
            
            print("\n" + "=" * 40)
            print("🔧 POSSIBLE ISSUES & FIXES:")
            print("=" * 40)
            print("""
1. If no broadcasts seen during monitoring:
   - Live queries might not be triggering
   - Data collection might be failing
   - Check SurrealDB live query callbacks

2. If broadcasts sent but frontend not receiving:
   - Frontend might not be subscribed to correct topics
   - Check frontend subscription logic

3. If live queries not working:
   - Try restarting data broadcaster
   - Check SurrealDB connection stability

4. If polling fallbacks not working:
   - Check data collection intervals
   - Verify background tasks are running
            """)
    
    asyncio.run(main())