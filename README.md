# 💰 LLMscope - LLM Cost Dashboard

> A self-hosted dashboard that shows LLM API costs in real-time and recommends cheaper models.

[![License](https://img.shields.io/badge/license-BSL%201.1-blue)](./LICENSE)
[![Docker Ready](https://img.shields.io/badge/docker-ready-brightgreen)](./docker-compose.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

![LLMscope Dashboard](./Cost_Dashboard_1.png)

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

# Seed the database with LLM pricing data
python seed_pricing.py

# (Optional) Generate demo data for testing
python generate_demo_data.py

# Start the backend
python app.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:8081](http://localhost:8081)

---

## 📊 Features

### 💰 Real-Time Cost Tracking
Track every LLM API call with automatic cost calculation. Monitor spending across **63+ models** from OpenAI, Anthropic, Google, Cohere, Together AI, Mistral, Groq, and more.

- **Instant cost visibility** - See exactly what each request costs
- **Provider comparison** - Compare costs across different LLM providers
- **Token usage analytics** - Track prompt and completion tokens
- **Auto-refresh** - Dashboard updates every 5 seconds

### 💡 Smart Cost Optimization

![Cost Recommendations](./Cost_dashboard_2.png)

Get **intelligent recommendations** for cheaper model alternatives:

- **Cheapest models first** - Groq's Llama-3-8B at $0.000065/1K tokens
- **Side-by-side pricing** - Compare input/output costs instantly
- **Recent usage history** - Track your last 100 API calls
- **Save money automatically** - Identify where you're overspending

### 🔐 Privacy-First & Self-Hosted
- **100% local** - Your data never leaves your infrastructure
- **No external dependencies** - Runs entirely on Docker
- **Open source** - Audit every line of code

---

## 🔌 Integration Examples

### Log API Usage

**Python:**
```python
import requests

response = requests.post("http://localhost:8000/api/usage", json={
    "provider": "openai",
    "model": "gpt-4",
    "prompt_tokens": 100,
    "completion_tokens": 50
})
print(response.json())  # {'status': 'logged', 'cost_usd': 0.006}
```

**JavaScript:**
```javascript
fetch('http://localhost:8000/api/usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',
    model: 'gpt-4',
    prompt_tokens: 100,
    completion_tokens: 50
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/usage" -Method POST `
  -ContentType "application/json" `
  -Body '{"provider":"openai","model":"gpt-4","prompt_tokens":100,"completion_tokens":50}'
```

**cURL:**
```bash
curl -X POST http://localhost:8000/api/usage \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","model":"gpt-4","prompt_tokens":100,"completion_tokens":50}'
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

**Business Source License 1.1**

### ✅ Free for Non-Commercial Use
- ✅ **Self-hosting** for personal use, education, and research
- ✅ **Modify and redistribute** for non-commercial purposes
- ✅ **Full source code access** - no restrictions on reading the code

### 💼 Commercial Use Requires License

Commercial use includes:
- Using LLMscope to monitor production LLM deployments in a business
- Offering LLMscope as a hosted/managed service to customers
- Incorporating LLMscope into a commercial product

**Need a commercial license?** Contact: bbaker@blb3dprinting.com

### 🔓 Future: Converts to MIT License
On **October 29, 2028** (3 years from first publication), this license automatically converts to MIT - making it fully open source forever.

---

**Why BSL?** We want LLMscope to be freely available for individuals and small teams, while ensuring companies using it commercially contribute back. This allows us to keep developing new features like SPC analysis, AI copilot, and enhanced reporting.

---

## 💬 Support

- GitHub Issues: [Report bugs or request features](https://github.com/Blb3D/LLMscope/issues)
- Discussions: [Ask questions](https://github.com/Blb3D/LLMscope/discussions)

---

**Built with ❤️ for the LLM community**
