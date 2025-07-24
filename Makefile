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
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"
	@make -j2 dev-frontend dev-backend

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

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
	@curl -s http://localhost:8000/api/health | python3 -m json.tool || echo "Backend not running"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend: OK" || echo "❌ Frontend: Not running"
