#!/bin/bash
# fix-docker-permissions.sh - Fix Docker daemon access

echo "🐳 Diagnosing Docker connectivity..."

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker daemon is not accessible"
    echo ""
    echo "🔧 Possible fixes:"
    echo "1. Start Docker daemon: sudo systemctl start docker"
    echo "2. Add user to docker group: sudo usermod -aG docker $USER"
    echo "3. Re-login or run: newgrp docker"
    echo ""
    
    # Check if user is in docker group
    if groups | grep -q docker; then
        echo "✅ User is in docker group"
    else
        echo "❌ User is NOT in docker group"
        echo "Run: sudo usermod -aG docker $USER"
        echo "Then logout and login again (or run: newgrp docker)"
    fi
    
    # Check Docker service status
    echo ""
    echo "🔍 Docker service status:"
    systemctl is-active docker || echo "Docker service is not running"
    
else
    echo "✅ Docker daemon is accessible!"
    echo ""
    echo "📊 Docker info:"
    docker version --format 'Client: {{.Client.Version}} | Server: {{.Server.Version}}'
    docker info --format 'Containers: {{.ContainersRunning}}/{{.Containers}} | Images: {{.Images}}'
fi

echo ""
echo "🧪 Testing Python Docker SDK..."
python3 -c "
import docker
try:
    client = docker.from_env()
    client.ping()
    print('✅ Python Docker SDK can connect!')
    containers = client.containers.list(all=True)
    print(f'📦 Found {len(containers)} containers')
except Exception as e:
    print(f'❌ Python Docker SDK error: {e}')
    print('This is the issue causing the 503 errors')
"