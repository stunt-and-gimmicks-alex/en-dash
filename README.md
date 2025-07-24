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

# Visit http://localhost:3000
```

## Development

```bash
# Frontend development
cd frontend
npm run dev

# Backend development  
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Production Deployment

```bash
# Build and deploy with Docker Compose
make deploy
```
