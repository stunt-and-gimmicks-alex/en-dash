# backend/diagnose_picows.py
"""
Quick diagnostic script to check picows installation and websocket manager
"""

print("🔍 Diagnosing picows setup...")

# Check 1: Is picows installed?
try:
    import picows
    print("✅ picows is installed")
    print(f"   Version: {picows.__version__ if hasattr(picows, '__version__') else 'unknown'}")
except ImportError as e:
    print(f"❌ picows not installed: {e}")
    print("   Run: pip install picows")
    exit(1)

# Check 2: Can we import orjson?
try:
    import orjson
    print("✅ orjson is available")
except ImportError:
    print("❌ orjson not installed")
    print("   Run: pip install orjson")

# Check 3: Test the websocket manager
try:
    from app.services.websocket_manager import ws_manager
    print("✅ websocket_manager imported")
    
    # Test get_stats method
    try:
        stats = ws_manager.get_stats()
        print(f"✅ get_stats() works: {stats}")
    except Exception as e:
        print(f"❌ get_stats() failed: {e}")
        print(f"   Type: {type(e).__name__}")
        
except ImportError as e:
    print(f"❌ Failed to import websocket_manager: {e}")

# Check 4: Test data broadcaster
try:
    from app.services.data_broadcaster import data_broadcaster
    print("✅ data_broadcaster imported")
    
    try:
        stats = data_broadcaster.get_stats()
        print(f"✅ data_broadcaster.get_stats() works: {stats}")
    except Exception as e:
        print(f"❌ data_broadcaster.get_stats() failed: {e}")
        
except ImportError as e:
    print(f"❌ Failed to import data_broadcaster: {e}")

# Check 5: Test the current websocket status endpoint
try:
    print("\n🔍 Testing websocket status endpoint...")
    import requests
    response = requests.get("http://192.168.1.69:8001/api/docker/ws/status")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {response.json()}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"❌ Failed to test endpoint: {e}")

print("\n✅ Diagnostic complete!")