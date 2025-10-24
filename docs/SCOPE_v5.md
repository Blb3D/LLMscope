# 📘 LLMscope — Phase 5 Specification (Unified Claude + SPC Build)

**Version:** v5.0  
**Status:** Active Development (Q4 2025)  
**Maintainer:** BLB3D Labs / Brandan Baker  
**Codename:** “Integration Baseline”

---

## 🎯 Mission
Deliver a deploy-ready, self-hosted AI performance dashboard combining
Claude’s fast-deploy infrastructure with BLB3D Labs’ SPC-based analytics engine.

Goal: Monitor latency, stability, and cost for multiple LLM providers
with engineering-grade statistical insight.

---

## 🧱 System Architecture

monitor_apis.py → backend/app.py → frontend dashboard
(Claude logger) (FastAPI + SPC) (React + Vite/CRA hybrid)
│ │ │
▼ ▼ ▼
Collects latency Computes μ/σ + SPC Displays real-time charts
from APIs Nelson Rules 1–8 and violation alerts


### Components

| Layer | Technology | Description |
|-------|-------------|--------------|
| **Backend** | FastAPI + SQLite | SPC + Nelson R1-R8 logic; REST API; API-key auth |
| **Frontend** | React 18 + Vite (Claude UI merge) | Live SPC/Latency chart, cost metrics, and polished Claude-style layout |
| **Monitor** | Python async (requests + asyncio) | Periodically pings providers (OpenAI, Anthropic, Ollama) |
| **Deployment** | Docker Compose + Nginx | Three services (backend, frontend, monitor) with one-command deploy |
| **Docs** | Markdown + README | All specs and roadmap under /docs/ |

---

## ⚙️ Functional Scope (Phase 5)
- Unified Docker stack (docker/docker-compose.yml)
- Local-first + cloud-optional runtime
- SPC/Nelson rules 1–8 with per-provider rollups
- Cost, token, and latency analytics
- Configurable retention + API key auth
- External monitor for live pinging
- Optional cloud deployment (Railway, Fly.io)

---

## 🧭 Non-Goals / Deferred Features (Phase 6+)

| Deferred | Reason |
|-----------|--------|
| Multi-user accounts | Simplify MVP release |
| Team dashboards / auth UI | Later SaaS tier |
| GPU/CPU resource telemetry | Future “System Metrics” tab |
| Auto-optimizer routing | Requires sustained data volume |
| AI-driven trend prediction | Experimental |

---

## 🎨 UI Design Goals
- Maintain Claude’s clean, card-based dark UI
- Integrate SPC overlays (μ ± σ bands, violation markers)
- Responsive grid (desktop → mobile)
- Modular React components (LatencyChart, ViolationsList, NelsonLegend)

---

## 📈 Success Metrics

| Metric | Target |
|---------|--------|
| Local setup time | < 10 min via docker-compose up |
| Avg API response latency | Visible within 2 s |
| SPC accuracy | ≥ 95 % vs. test dataset |
| Code stability | 0 critical runtime errors after 24 h run |
| User conversion (Beta → Pro) | 10 % within 30 days |

---

## 🔒 Environment Variables


LLMSCOPE_API_KEY=dev-123
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-xxx
OLLAMA_URL=http://localhost:11434

DATA_RETENTION_DAYS=7
MONITORING_INTERVAL=15


---

## 📜 License
© 2025 BLB3D Labs — MIT License
