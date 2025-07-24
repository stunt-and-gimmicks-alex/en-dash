# Complete En-Dash Monorepo Setup
# Run these commands in your project root directory

# 1. Create the clean monorepo structure
echo "🚀 Setting up clean monorepo structure..."

# Create root-level files
cat > README.md << 'EOF'
# En-Dash - Home Server Management Platform

A modern, comprehensive home server management platform built with React + FastAPI.

## Features

- **Docker Management**: Complete Docker container and compose stack management
- **System Monitoring**: Real-time CPU, memory, disk, and network monitoring  
- **Process Management**: View and manage system processes and services
- **File System**: Browse and manage server files and configurations
- **Network Management**: Monitor and configure network settings
- **Security Center**: System security monitoring and management

## Architecture

- **Frontend**: React + TypeScript + Chakra UI v3
- **Backend**: Python FastAPI + Docker SDK + psutil
- **Database**: SQLite (for configuration and logs)
- **Deployment**: Docker Compose

## Quick Start

```bash
# Install dependencies
make install

# Start development servers
make dev

# Visit http://localhost:5173
```

## Development

```bash
# Frontend development
cd frontend
npm run dev

# Backend development  
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

## Production Deployment

```bash
# Build and deploy with Docker Compose
make deploy
```
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Build outputs
dist/
build/
*.egg-info/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
logs/

# Database
*.db
*.sqlite
*.sqlite3

# Temporary files
tmp/
temp/
EOF

# Create Makefile for easy commands
cat > Makefile << 'EOF'
.PHONY: install dev build deploy clean test

# Install all dependencies
install:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install
	@echo "🐍 Setting up Python backend..."
	cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	@echo "✅ Installation complete!"

# Start development servers
dev:
	@echo "🚀 Starting development servers..."
	@echo "Frontend: http://localhost:5173"
	@echo "Backend API: http://localhost:8001"
	@echo "API Docs: http://localhost:8001/docs"
	@make -j2 dev-frontend dev-backend

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Build for production
build:
	@echo "🏗️ Building for production..."
	cd frontend && npm run build
	@echo "✅ Build complete!"

# Deploy with Docker Compose
deploy:
	@echo "🚢 Deploying with Docker Compose..."
	docker-compose up -d --build
	@echo "✅ Deployment complete!"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	cd frontend && rm -rf dist/ node_modules/.cache/
	cd backend && find . -type d -name __pycache__ -delete
	@echo "✅ Cleaned!"

# Run tests
test:
	@echo "🧪 Running tests..."
	cd frontend && npm run test
	cd backend && source venv/bin/activate && python -m pytest
	@echo "✅ Tests complete!"

# Quick health check
health:
	@echo "🩺 Checking system health..."
	@curl -s http://localhost:8001/api/health | python3 -m json.tool || echo "Backend not running"
	@curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend: OK" || echo "❌ Frontend: Not running"
EOF

# Create backend directory structure
echo "🐍 Setting up Python backend..."
mkdir -p backend/{app/{routers,models,services,core},tests,static}

# Create backend requirements.txt
cat > backend/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
docker==6.1.3
psutil==5.9.6
pyyaml==6.0.1
sqlalchemy==2.0.23
sqlite3
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
aiofiles==23.2.1
httpx==0.25.2
EOF

# Create backend main.py
cat > backend/main.py << 'EOF'
"""
En-Dash Home Server Management API

A FastAPI-based backend for comprehensive home server management.
Provides endpoints for Docker management, system monitoring, and more.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.routers import docker, system, auth
from app.core.config import settings

# Create FastAPI application
app = FastAPI(
    title="En-Dash API",
    description="Home Server Management Platform API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(docker.router, prefix="/api/docker", tags=["docker"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/api/health")
async def health_check():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "service": "en-dash-api", 
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "En-Dash Home Server Management API",
        "docs": "/api/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,  # Changed from 8000 to 8001
        reload=True
    )
EOF

# Create basic backend structure files
mkdir -p backend/app/{routers,models,services,core}

# Core configuration
cat > backend/app/__init__.py << 'EOF'
"""En-Dash Backend Application"""
EOF

cat > backend/app/core/__init__.py << 'EOF'
"""Core application configuration and utilities"""
EOF

cat > backend/app/core/config.py << 'EOF'
"""Application configuration settings"""

from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "En-Dash"
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8080",  # Alternative dev port
        "http://localhost:8001",  # Our backend for self-requests
    ]
    
    # Docker Settings
    DOCKER_SOCKET: str = "unix://var/run/docker.sock"
    STACKS_DIRECTORY: str = "/opt/stacks"
    
    # Security (generate proper secrets in production)
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        case_sensitive = True

settings = Settings()
EOF

echo "✅ Basic monorepo structure created!"
echo ""
echo "📁 Your project structure:"
echo "├── README.md"
echo "├── .gitignore" 
echo "├── Makefile"
echo "├── frontend/ (your existing React app)"
echo "└── backend/"
echo "    ├── requirements.txt"
echo "    ├── main.py"
echo "    └── app/"
echo "        ├── routers/"
echo "        ├── models/"
echo "        ├── services/"
echo "        └── core/"
echo ""
echo "🚀 Next steps:"
echo "1. Run 'make install' to set up dependencies"
echo "2. We'll create the Docker and System API routers"
echo "3. Update your frontend to use the new REST API"
EOF