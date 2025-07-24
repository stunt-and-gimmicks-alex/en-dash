# backend/test_api.py - Test script to verify the API works

import requests
import json
import time

BASE_URL = "http://localhost:8001"  # Changed from 8000 to 8001

def test_endpoint(endpoint, description):
    """Test a single API endpoint"""
    try:
        print(f"🧪 Testing {description}...")
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ {description} - OK")
            
            # Show sample data for some endpoints
            if endpoint == "/api/docker/containers":
                print(f"   📦 Found {len(data)} containers")
            elif endpoint == "/api/system/stats":
                print(f"   💻 CPU: {data['cpu']['percent']}%, Memory: {data['memory']['percent']}%")
            elif endpoint == "/api/docker/stacks":
                print(f"   📋 Found {len(data)} stacks")
                
            return True
        else:
            print(f"   ❌ {description} - HTTP {response.status_code}")
            print(f"   Error: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"   ❌ {description} - Connection failed (is the server running?)")
        return False
    except Exception as e:
        print(f"   ❌ {description} - Error: {str(e)}")
        return False

def main():
    """Run all API tests"""
    print("🚀 En-Dash API Test Suite")
    print("=" * 50)
    
    # Test endpoints
    tests = [
        ("/api/health", "Health Check"),
        ("/api/docker/health", "Docker Health"),
        ("/api/docker/containers", "Docker Containers"),
        ("/api/docker/images", "Docker Images"),
        ("/api/docker/stacks", "Docker Stacks"),
        ("/api/docker/stats", "Docker Stats"),
        ("/api/system/stats", "System Stats"),
        ("/api/system/info", "System Info"),
        ("/api/system/processes", "System Processes"),
        ("/api/system/uptime", "System Uptime"),
    ]
    
    passed = 0
    total = len(tests)
    
    for endpoint, description in tests:
        if test_endpoint(endpoint, description):
            passed += 1
        time.sleep(0.5)  # Small delay between tests
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All tests passed! Your API is working perfectly!")
    else:
        print(f"⚠️  {total - passed} tests failed. Check the errors above.")
    
    print("\n🌐 API Documentation: http://localhost:8001/docs")
    print("🔍 Interactive API: http://localhost:8001/redoc")

if __name__ == "__main__":
    main()