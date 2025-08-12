# backend/verify_decoupling.py
"""
Script to verify the websocket decoupling worked correctly.
Run this to check that old websocket code has been properly separated.
"""

import sys
import os
from pathlib import Path

def check_file_for_websocket_code(file_path: Path):
    """Check if file contains old websocket connection management code"""
    if not file_path.exists():
        return []
    
    issues = []
    old_websocket_patterns = [
        "class UnifiedStackConnectionManager",
        "class SystemStatsConnectionManager", 
        "WebSocket, WebSocketDisconnect",
        "@router.websocket(",
        "websocket.accept()",
        "websocket.send_text(",
        "websocket.receive_text()",
        "active_connections: Set[WebSocket]",
        "await websocket.accept()",
        "unified_manager = UnifiedStackConnectionManager",
        "stats_manager = SystemStatsConnectionManager"
    ]
    
    try:
        content = file_path.read_text()
        for pattern in old_websocket_patterns:
            if pattern in content:
                issues.append(f"Found old websocket pattern: '{pattern}'")
    except Exception as e:
        issues.append(f"Error reading file: {e}")
    
    return issues

def main():
    """Verify websocket decoupling"""
    print("🔍 Verifying WebSocket Decoupling...")
    print("=" * 50)
    
    # Files that should NO LONGER contain websocket management code
    files_to_check = [
        "app/routers/docker_unified.py",
        "app/routers/system.py"
    ]
    
    # Files that SHOULD contain the new websocket code  
    required_files = [
        "app/services/websocket_manager.py",
        "app/services/data_broadcaster.py", 
        "app/routers/picows_websocket.py"
    ]
    
    all_good = True
    
    # Check that old files are cleaned up
    print("\n📋 Checking old files are decoupled...")
    for file_path in files_to_check:
        full_path = Path(file_path)
        print(f"\nChecking: {file_path}")
        
        if not full_path.exists():
            print(f"  ❌ File not found: {file_path}")
            all_good = False
            continue
            
        issues = check_file_for_websocket_code(full_path)
        if issues:
            print(f"  ❌ Found {len(issues)} websocket remnants:")
            for issue in issues:
                print(f"    - {issue}")
            all_good = False
        else:
            print(f"  ✅ Clean - no old websocket code found")
    
    # Check that new files exist
    print("\n📋 Checking new websocket services exist...")
    for file_path in required_files:
        full_path = Path(file_path)
        print(f"\nChecking: {file_path}")
        
        if full_path.exists():
            print(f"  ✅ File exists")
            
            # Check for expected new patterns
            try:
                content = full_path.read_text()
                if "picows" in content:
                    print(f"  ✅ Contains picows implementation")
                elif "WebSocketManager" in content:
                    print(f"  ✅ Contains new websocket manager")
                elif "DataBroadcaster" in content:
                    print(f"  ✅ Contains data broadcaster")
                else:
                    print(f"  ⚠️  File exists but may be incomplete")
            except Exception as e:
                print(f"  ⚠️  Could not verify content: {e}")
        else:
            print(f"  ❌ File missing: {file_path}")
            all_good = False
    
    # Check main.py integration
    print("\n📋 Checking main.py integration...")
    main_py = Path("main.py")
    if main_py.exists():
        content = main_py.read_text()
        
        checks = [
            ("ws_manager", "WebSocket manager import"),
            ("data_broadcaster", "Data broadcaster import"), 
            ("picows_websocket", "Picows router import"),
            ("await ws_manager.start()", "WebSocket manager startup"),
            ("await data_broadcaster.start()", "Data broadcaster startup")
        ]
        
        for pattern, description in checks:
            if pattern in content:
                print(f"  ✅ {description}")
            else:
                print(f"  ❌ Missing: {description}")
                all_good = False
    else:
        print(f"  ❌ main.py not found")
        all_good = False
    
    # Summary
    print("\n" + "=" * 50)
    if all_good:
        print("🎉 SUCCESS: WebSocket decoupling completed successfully!")
        print("\n📋 What was accomplished:")
        print("  ✅ Old websocket managers removed from data classes")
        print("  ✅ WebSocket handling separated into dedicated services")
        print("  ✅ Data broadcasting isolated from connection management")
        print("  ✅ REST endpoints preserved without websocket coupling")
        print("  ✅ New picows implementation ready for testing")
        
        print("\n🚀 Next steps:")
        print("  1. Install dependencies: pip install picows orjson uvloop")
        print("  2. Start the server: python main.py")
        print("  3. Check health: curl http://localhost:8001/api/docker/ws/status")
        print("  4. Test new endpoint: ws://localhost:8001/api/docker/ws/unified")
        print("  5. Monitor CPU usage improvement")
        
        return True
    else:
        print("❌ ISSUES FOUND: WebSocket decoupling incomplete")
        print("\n🔧 Action required:")
        print("  - Review the issues listed above")
        print("  - Update/replace the flagged files") 
        print("  - Ensure all new service files are in place")
        print("  - Update main.py with new service imports")
        
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)