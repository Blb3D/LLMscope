# LLMscope Demo Deployment Guide

This guide helps you quickly deploy LLMscope for demo purposes.

## 🚀 Quick Start

### Option 1: Automated Script (Recommended)

**Windows:**
```cmd
start-demo.bat
```

**Mac/Linux:**
```bash
./start-demo.sh
```

The script will:
- ✓ Check Docker installation and status
- ✓ Verify required ports are available
- ✓ Create necessary directories
- ✓ Build and start Docker containers
- ✓ Wait for services to be ready
- ✓ Optionally generate demo data
- ✓ Open the dashboard in your browser

### Option 2: Manual Setup

```bash
# 1. Ensure data directory exists
mkdir -p data

# 2. Start Docker containers
docker-compose up -d

# 3. Wait for services to start (30-60 seconds)
# Watch logs if needed:
docker-compose logs -f

# 4. Verify backend is running
curl http://localhost:8000/
# Should return: {"status":"ok"}

# 5. Open dashboard
# Visit: http://localhost:8081
```

## 📊 Generate Demo Data

After deployment, generate sample data to populate the dashboard:

```bash
# Using Docker (recommended)
docker exec llmscope_backend python generate_demo_data.py

# Or from backend directory
cd backend
python generate_demo_data.py
```

This creates 100 sample API calls across different providers and models.

## 🔗 Access Points

After successful deployment:

- **Dashboard:** http://localhost:8081
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

## 🛠️ Common Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Check container status
docker-compose ps
```

## ⚠️ Troubleshooting

If you encounter any issues:

1. **Check the comprehensive troubleshooting guide:** [DOCKER_TROUBLESHOOTING.md](./DOCKER_TROUBLESHOOTING.md)

2. **Common fixes:**
   - Ensure Docker Desktop is running
   - Verify ports 8000 and 8081 are available
   - Check you're in the project root directory
   - Ensure the `data/` directory exists

3. **Quick reset:**
   ```bash
   docker-compose down -v
   mkdir -p data
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **View detailed logs:**
   ```bash
   docker-compose logs
   ```

## 📦 What's Included

The demo deployment includes:

- **Backend API** (FastAPI + SQLite)
  - Real-time cost tracking
  - 63+ LLM model pricing data
  - RESTful API endpoints

- **Frontend Dashboard** (React + Vite)
  - Cost visualization
  - Usage analytics
  - Model recommendations

- **Demo Data Generator**
  - Sample API calls
  - Multiple providers (OpenAI, Anthropic, Google, etc.)
  - Realistic usage patterns

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env` file in the project root:

```env
# API Key for authentication
LLMSCOPE_API_KEY=demo-key-123

# Enable system API endpoints
ENABLE_SYSTEM_API=true

# Ollama configuration (optional)
USE_OLLAMA=false
```

See `.env.example` for all available options.

### Port Configuration

To change default ports, edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8080:8000"  # Change 8080 to your desired port

  frontend:
    ports:
      - "8082:80"    # Change 8082 to your desired port
```

## 🧪 Testing the Deployment

### 1. Test Backend API

```bash
# Health check
curl http://localhost:8000/

# Get model recommendations
curl http://localhost:8000/api/recommendations

# Get cost summary
curl http://localhost:8000/api/costs/summary
```

### 2. Test Frontend

Open http://localhost:8081 in your browser. You should see:
- Dashboard with cost metrics
- Model recommendations table
- Recent usage history

### 3. Test API Integration

Send a test usage event:

```bash
curl -X POST http://localhost:8000/api/usage \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4",
    "prompt_tokens": 100,
    "completion_tokens": 50
  }'
```

Refresh the dashboard to see the new data point.

## 📈 Demo Scenarios

### Scenario 1: Cost Comparison Demo

1. Generate demo data with multiple providers
2. Show the cost breakdown by provider
3. Highlight the most expensive models
4. Demonstrate cost optimization recommendations

### Scenario 2: Real-Time Tracking Demo

1. Open the dashboard
2. Use the API to log new usage events
3. Show auto-refresh (every 5 seconds)
4. Demonstrate immediate cost visibility

### Scenario 3: Model Recommendation Demo

1. Show the current model usage
2. Navigate to recommendations page
3. Highlight cheaper alternatives
4. Calculate potential savings

## 🔒 Security Notes for Demo

⚠️ **For demo purposes only!**

Before production deployment:
- Change default API keys in `.env`
- Enable authentication
- Configure HTTPS/SSL
- Review security headers
- Set up proper database backups

## 📝 System Requirements

- **Docker Desktop:** Latest version
  - Windows: Docker Desktop with WSL2 backend
  - Mac: Docker Desktop for Mac
  - Linux: Docker Engine + Docker Compose

- **System Resources:**
  - 2GB RAM minimum (4GB recommended)
  - 2GB free disk space
  - Ports 8000 and 8081 available

- **Supported Operating Systems:**
  - Windows 10/11
  - macOS 10.15+
  - Linux (Ubuntu 20.04+, Fedora, etc.)

## 🆘 Getting Help

If you encounter issues not covered in the troubleshooting guide:

1. Check the logs: `docker-compose logs`
2. Review [DOCKER_TROUBLESHOOTING.md](./DOCKER_TROUBLESHOOTING.md)
3. Open an issue: https://github.com/Blb3D/LLMscope/issues
4. Include:
   - Your OS and Docker version
   - Complete error message
   - Output of `docker-compose logs`

## 📚 Next Steps

After successful demo deployment:

1. **Integrate with your LLM code:** See [README.md](./README.md) for integration examples
2. **Explore the API:** Visit http://localhost:8000/docs for interactive API documentation
3. **Customize the dashboard:** Modify frontend components in `frontend/src/`
4. **Add more providers:** Extend the pricing database in `backend/seed_pricing.py`

---

**Ready to start?** Run `./start-demo.sh` (Mac/Linux) or `start-demo.bat` (Windows)
