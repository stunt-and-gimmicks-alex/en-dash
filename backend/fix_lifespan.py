# backend/fix_lifespan.py
"""
Check and fix why the FastAPI lifespan function isn't running
"""

import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def check_lifespan_issue():
    """Check what's preventing lifespan from running"""
    print("🔍 CHECKING FASTAPI LIFESPAN ISSUE")
    print("=" * 40)
    
    # 1. Test importing main app
    print("1. TESTING APP IMPORT...")
    try:
        from main import app, lifespan
        print("   ✅ App and lifespan imported successfully")
        print(f"   App: {app}")
        print(f"   Lifespan: {lifespan}")
    except Exception as e:
        print(f"   ❌ Import failed: {e}")
        return False
    
    # 2. Check if lifespan is properly attached
    print("\n2. CHECKING LIFESPAN ATTACHMENT...")
    if hasattr(app, 'router') and hasattr(app.router, 'lifespan_context'):
        print("   ✅ App has lifespan_context")
        print(f"   Lifespan context: {app.router.lifespan_context}")
    else:
        print("   ❌ No lifespan_context found on app")
        print("   This might be the issue!")
    
    # 3. Check app configuration
    print("\n3. CHECKING APP CONFIGURATION...")
    print(f"   App title: {getattr(app, 'title', 'N/A')}")
    print(f"   App version: {getattr(app, 'version', 'N/A')}")
    print(f"   App lifespan: {getattr(app, 'lifespan', 'N/A')}")
    
    # 4. Test manual lifespan execution
    print("\n4. TESTING MANUAL LIFESPAN EXECUTION...")
    try:
        print("   🚀 Manually triggering lifespan startup...")
        
        # Create async generator context
        async_gen = lifespan(app)
        
        # Start the lifespan (startup)
        await async_gen.__anext__()
        print("   ✅ Lifespan startup completed successfully!")
        
        # Check if services are now running
        from app.services.websocket_manager import ws_manager
        from app.services.data_broadcaster import data_broadcaster
        
        ws_stats = ws_manager.get_stats()
        broadcaster_stats = data_broadcaster.get_stats()
        
        print(f"   WebSocket running: {ws_stats.get('running', False)}")
        print(f"   Data broadcaster running: {broadcaster_stats.get('running', False)}")
        
        if ws_stats.get('running', False):
            print("   🎉 SERVICES STARTED SUCCESSFULLY!")
            return True
        else:
            print("   ❌ Services still not running after manual startup")
            return False
        
    except Exception as e:
        print(f"   ❌ Manual lifespan execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def fix_app_lifespan():
    """Fix the app lifespan configuration"""
    print("\n5. CHECKING FASTAPI VERSION AND CONFIGURATION...")
    
    try:
        import fastapi
        print(f"   FastAPI version: {fastapi.__version__}")
        
        # Check if we're using the correct lifespan syntax
        from main import app
        
        print("   Current app configuration:")
        print(f"   - lifespan parameter: {getattr(app, 'lifespan', 'None')}")
        
        # The issue might be in how the app is created
        # Let's check the main.py app creation
        
        print("\n6. SUGGESTED FIX:")
        print("   The lifespan function might not be properly attached to the app.")
        print("   Check that main.py has:")
        print("   ```python")
        print("   app = FastAPI(")
        print("       title=settings.PROJECT_NAME,")
        print("       lifespan=lifespan,  # <-- This line is crucial")
        print("       # ... other parameters")
        print("   )```")
        
        return True
        
    except Exception as e:
        print(f"   ❌ FastAPI check failed: {e}")
        return False

if __name__ == "__main__":
    async def main():
        success = await check_lifespan_issue()
        
        if not success:
            await fix_app_lifespan()
        
        print("\n" + "=" * 40)
        print("🔧 NEXT STEPS:")
        print("=" * 40)
        
        if success:
            print("✅ Lifespan works when run manually")
            print("   The issue is that uvicorn isn't calling it automatically")
            print("   Try restarting your server with the debug endpoint:")
            print("   curl -X POST http://192.168.1.69:8001/debug/force-startup")
        else:
            print("❌ Lifespan function has issues")
            print("   1. Check main.py app creation")
            print("   2. Ensure lifespan=lifespan parameter is present")
            print("   3. Check for import errors in lifespan function")
            print("   4. Try running uvicorn with --reload flag")
    
    asyncio.run(main())