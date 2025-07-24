#!/bin/bash
# port-check.sh - Check what's running on port 8000 and find alternatives

echo "🔍 Checking what's running on your ports..."

# Check port 8000
echo ""
echo "Port 8000 status:"
if lsof -i :8000 >/dev/null 2>&1; then
    echo "❌ Port 8000 is OCCUPIED by:"
    lsof -i :8000
    echo ""
    echo "🌐 Let's see what's there:"
    curl -I http://localhost:8000 2>/dev/null || echo "   (No HTTP response)"
else
    echo "✅ Port 8000 is available"
fi

echo ""
echo "🔍 Checking other common ports..."

# Check other common development ports
for port in 3000 5000 5001 8001 8080 8888 9000; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "❌ Port $port: OCCUPIED"
    else
        echo "✅ Port $port: Available"
    fi
done

echo ""
echo "💡 Recommendations:"
echo "1. Use port 8001 for En-Dash backend (likely available)"
echo "2. Keep whatever is on 8000 if it's useful"
echo "3. Update our backend to use port 8001"