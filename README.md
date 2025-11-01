# 💰 LLMscope - LLM Cost Dashboard

> A self-hosted dashboard that shows LLM API costs in real-time and recommends cheaper models.

[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Docker Ready](https://img.shields.io/badge/docker-ready-brightgreen)](./docker-compose.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 🎯 Quick Access

After running `docker-compose up -d`:

- **🌐 Dashboard**: [http://localhost:8081](http://localhost:8081) - Cost tracking interface
- **🔌 API**: [http://localhost:8000](http://localhost:8000) - Backend API endpoints  
- **📊 API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) - Interactive API documentation

---

## 🚨 The Problem

**LLM API costs are spiraling out of control.** You don't know:
- 💸 How much you're spending on each model
- 📈 Which providers are most expensive
- 🔄 If there are cheaper alternatives
- 📊 Your usage patterns over time

## ✅ The Solution

**LLMscope** gives you complete visibility and control over your LLM costs:

- ✅ **Real-time cost tracking** - See costs as they happen
- ✅ **Cost breakdown** - By provider, model, and time period
- ✅ **Smart recommendations** - Get suggestions for cheaper models
- ✅ **Usage analytics** - Track token usage and patterns
- ✅ **Self-hosted** - Keep your data private

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/Blb3D/LLMscope.git
cd LLMscope
docker-compose up -d
```

Visit [http://localhost:8081](http://localhost:8081)

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📊 Features

### Cost Tracking
- Track API usage across OpenAI, Anthropic, Cohere, etc.
- Automatic cost calculation based on token usage
- Real-time cost updates

### Analytics
- Cost breakdown by provider and model
- Historical usage trends
- Token usage statistics

### Recommendations
- Get suggestions for cheaper alternatives
- Compare pricing across models
- Optimize your LLM spend

---

## 🔌 API Usage

### Log API Usage

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

### Get Cost Summary

```bash
curl http://localhost:8000/api/costs/summary
```

### Get Model Recommendations

```bash
curl http://localhost:8000/api/recommendations
```

---

## ⚙️ Configuration

Create a `.env` file:

```env
DATABASE_PATH=./data/llmscope.db
LLMSCOPE_API_KEY=your-secret-key
```

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Frontend       │  React + Vite
│  (Port 8081)    │  Cost dashboard
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  Backend API    │  FastAPI + SQLite
│  (Port 8000)    │  Cost tracking
└─────────────────┘
```

## 📦 Tech Stack

**Backend:**
- FastAPI
- SQLite
- Python 3.9+

**Frontend:**
- React
- Vite
- Tailwind CSS

**Deployment:**
- Docker
- Docker Compose

---

## 🗄️ Database Schema

### api_usage
Tracks all API calls with token counts and costs

### model_pricing
Stores pricing data for different LLM models

### settings
Application configuration

---

## 🛠️ Development

```bash
# Backend tests
cd backend
pytest

# Frontend development
cd frontend
npm run dev

# Production build
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🗺️ Roadmap

- [ ] Support for more LLM providers
- [ ] Cost alerts and budgets
- [ ] Advanced analytics and visualizations
- [ ] Team usage tracking
- [ ] Export reports (PDF, CSV)
- [ ] Cost prediction
- [ ] API key management

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT License - see LICENSE file for details

---

## 💬 Support

- GitHub Issues: [Report bugs or request features](https://github.com/Blb3D/LLMscope/issues)
- Discussions: [Ask questions](https://github.com/Blb3D/LLMscope/discussions)

---

**Built with ❤️ for the LLM community**
