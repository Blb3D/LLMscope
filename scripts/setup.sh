#!/bin/bash
# setup.sh - LLMscope Quick Start Script

set -e

echo "🔭 LLMscope MVP - Quick Setup"
echo "================================"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Visit https://docker.com"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }

echo "✅ Prerequisites checked"
echo ""

# Create project structure
echo "📁 Creating project structure..."
mkdir -p llmscope/{frontend/src,frontend/public,data}
cd llmscope

# Create .env file
if [ ! -f .env ]; then
    echo "🔑 Setting up environment variables..."
    cat > .env << 'EOF'
# LLMscope Configuration
LLMSCOPE_API_KEY=dev-key-change-in-production

# AI Provider API Keys (add your keys here)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Settings
DATA_RETENTION_DAYS=7
MONITORING_INTERVAL=10
EOF
    
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your API keys!"
    echo "   OpenAI: Get key from https://platform.openai.com/api-keys"
    echo "   Anthropic: Get key from https://console.anthropic.com/"
    echo ""
    read -p "Press Enter after adding your API keys to .env..."
fi

# Create backend files
echo "🔧 Creating backend..."
cat > app.py << 'BACKEND_EOF'
# (Copy the complete app.py from the backend artifact)
BACKEND_EOF

cat > monitor.py << 'MONITOR_EOF'
# (Copy the complete monitor.py from the logger artifact)
MONITOR_EOF

cat > requirements.txt << 'REQ_EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
aiohttp==3.9.1
pydantic==2.5.0
REQ_EOF

# Create Dockerfiles
echo "🐳 Creating Docker configuration..."
cat > docker-compose.yml << 'COMPOSE_EOF'
# (Copy the complete docker-compose.yml from the Docker artifact)
COMPOSE_EOF

cat > Dockerfile.backend << 'BACKEND_DOCKER_EOF'
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi==0.104.1 uvicorn[standard]==0.24.0 aiohttp==3.9.1 pydantic==2.5.0
COPY app.py .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
BACKEND_DOCKER_EOF

cat > Dockerfile.monitor << 'MONITOR_DOCKER_EOF'
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir aiohttp==3.9.1
COPY monitor.py .
CMD ["python", "monitor.py"]
MONITOR_DOCKER_EOF

# Create frontend files
echo "⚛️  Creating frontend..."
cd frontend

cat > package.json << 'PACKAGE_EOF'
# (Copy the package.json from the frontend artifact)
PACKAGE_EOF

mkdir -p src public
cat > src/App.js << 'APP_EOF'
# (Copy App.js from frontend artifact)
APP_EOF

cat > src/index.js << 'INDEX_EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
INDEX_EOF

cat > src/index.css << 'CSS_EOF'
* { margin: 0; padding: 0; box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
CSS_EOF

cat > public/index.html << 'HTML_EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LLMscope</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
HTML_EOF

cat > .env.example << 'ENV_EOF'
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_KEY=dev-key-change-in-production
ENV_EOF

cd ..

# Create Makefile
cat > Makefile << 'MAKE_EOF'
.PHONY: help start stop logs clean test

help:
	@echo "LLMscope Commands:"
	@echo "  make start   - Start all services"
	@echo "  make stop    - Stop all services"
	@echo "  make logs    - View logs"
	@echo "  make clean   - Remove all data"
	@echo "  make test    - Test connection"

start:
	@echo "🚀 Starting LLMscope..."
	docker-compose up -d
	@echo ""
	@echo "✅ LLMscope is running!"
	@echo "🌐 Dashboard: http://localhost:3000"
	@echo "🔌 API: http://localhost:8000"
	@echo ""
	@echo "📊 View logs: make logs"

stop:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	rm -rf data/*

test:
	@curl -s http://localhost:8000/health | python3 -m json.tool
MAKE_EOF

# Create README
cat > README.md << 'README_EOF'
# 🔭 LLMscope

Real-time AI Performance Monitoring with Statistical Process Control

## Quick Start

1. **Add your API keys to `.env`**
   ```bash
   nano .env
   # Add your OPENAI_API_KEY and/or ANTHROPIC_API_KEY
   ```

2. **Start services**
   ```bash
   make start
   ```

3. **Open dashboard**
   ```
   http://localhost:3000
   ```

## Commands

- `make start` - Start all services
- `make stop` - Stop all services  
- `make logs` - View logs
- `make test` - Test API connection
- `make clean` - Remove all data

## Documentation

See full docs at: https://github.com/yourusername/llmscope
README_EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env and add your API keys"
echo "   2. Run: make start"
echo "   3. Open: http://localhost:3000"
echo ""
echo "💡 Commands:"
echo "   make logs    - View logs"
echo "   make stop    - Stop services"
echo "   make test    - Test connection"
echo ""

---
# install.sh - One-liner installer
#!/bin/bash
curl -fsSL https://raw.githubusercontent.com/yourusername/llmscope/main/setup.sh | bash

---
# Alternative: Railway Deploy Button
# railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.backend"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}

---
# Alternative: Fly.io Deploy
# fly.toml
app = "llmscope"

[build]
  dockerfile = "Dockerfile.backend"

[env]
  DATA_RETENTION_DAYS = "7"

[[services]]
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[services.concurrency]
  type = "connections"
  hard_limit = 25
  soft_limit = 20

[[services.tcp_checks]]
  interval = "15s"
  timeout = "2s"
  grace_period = "5s"

---
# GitHub Actions CI/CD
# .github/workflows/deploy.yml
name: Deploy LLMscope

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and push Docker images
        run: |
          docker build -f Dockerfile.backend -t llmscope-backend .
          docker build -f Dockerfile.monitor -t llmscope-monitor .
      
      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm i -g @railway/cli
          railway up

---
# Kubernetes Deployment (Optional for Enterprise)
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llmscope-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: llmscope-backend
  template:
    metadata:
      labels:
        app: llmscope-backend
    spec:
      containers:
      - name: backend
        image: llmscope/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: LLMSCOPE_API_KEY
          valueFrom:
            secretKeyRef:
              name: llmscope-secrets
              key: api-key
        - name: DATABASE_PATH
          value: /data/llmscope.db
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: llmscope-pvc

---
# Docker Swarm Stack (Alternative to K8s)
# docker-stack.yml
version: '3.8'

services:
  backend:
    image: llmscope/backend:latest
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
    environment:
      - LLMSCOPE_API_KEY_FILE=/run/secrets/llmscope_key
    secrets:
      - llmscope_key
    volumes:
      - llmscope-data:/data
    ports:
      - "8000:8000"

  monitor:
    image: llmscope/monitor:latest
    deploy:
      replicas: 1
    environment:
      - LLMSCOPE_API_URL=http://backend:8000
    secrets:
      - llmscope_key
      - openai_key

secrets:
  llmscope_key:
    external: true
  openai_key:
    external: true

volumes:
  llmscope-data:

---
# Monitoring with Prometheus
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'llmscope'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'

---
# Grafana Dashboard JSON
# grafana-dashboard.json
{
  "dashboard": {
    "title": "LLMscope Metrics",
    "panels": [
      {
        "title": "API Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "llmscope_latency_seconds"
          }
        ]
      },
      {
        "title": "Cost per Hour",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(llmscope_cost_total[1h])"
          }
        ]
      }
    ]
  }
}

---
# Health Check Script
# healthcheck.sh
#!/bin/bash

HEALTH_URL="http://localhost:8000/health"
MAX_RETRIES=5
RETRY_DELAY=2

for i in $(seq 1 $MAX_RETRIES); do
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo "✅ Service is healthy"
        exit 0
    fi
    echo "⏳ Attempt $i/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
done

echo "❌ Service is unhealthy after $MAX_RETRIES attempts"
exit 1

---
# Backup Script
# backup.sh
#!/bin/bash

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_FILE="data/llmscope.db"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
    echo "📦 Creating backup: $BACKUP_DIR/llmscope_$TIMESTAMP.db"
    cp "$DB_FILE" "$BACKUP_DIR/llmscope_$TIMESTAMP.db"
    
    # Keep only last 7 days
    find "$BACKUP_DIR" -name "llmscope_*.db" -mtime +7 -delete
    
    echo "✅ Backup complete"
else
    echo "❌ Database file not found"
    exit 1
fi

---
# Restore Script
# restore.sh
#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo "Available backups:"
    ls -1 backups/
    exit 1
fi

BACKUP_FILE="$1"
DB_FILE="data/llmscope.db"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⏹️  Stopping services..."
docker-compose down

echo "📥 Restoring from: $BACKUP_FILE"
cp "$BACKUP_FILE" "$DB_FILE"

echo "🚀 Starting services..."
docker-compose up -d

echo "✅ Restore complete"