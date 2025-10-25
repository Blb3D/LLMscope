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
🧭 LLMscope Scope Definition – Phase 5 (Rev B Core + Expanded Research Plan)
📖 Overview

LLMscope has evolved from a latency-tracking proof-of-concept into a research-grade AI performance and system-health analytics platform.
The Phase 5 Rev B milestone establishes a stable containerized foundation and introduces live hardware telemetry, SPC analytics, and a validated path toward multi-model benchmarking and sustainability research.

🎯 Core Objective

Provide engineers, data scientists, and AI researchers with a local-first diagnostic platform that quantifies LLM performance, resource cost, and operational stability—independent of vendor dashboards.

LLMscope now measures:

Model latency and token throughput

System resource load (CPU %, Memory %, GPU Temp when available)

Statistical process variation (σ, Cp, Cpk, UCL/LCL violations)

Environmental context (Network + Hardware performance)

🧩 Phase 5 Rev B Core Deliverables
Category	Description	Status
Backend API	FastAPI + SQLite service with /api/stats, /api/system, and /api/log endpoints.	✅ Complete
Monitor Service	Python benchmark agent supporting Ollama (local) and simulated modes via USE_OLLAMA.	✅ Complete
Frontend Dashboard	React + Vite UI using Recharts; displays real-time latency and telemetry cards.	✅ Complete
System Telemetry	psutil-based CPU/RAM monitor + optional NVML GPU integration.	✅ Operational
Documentation	GPU Telemetry Support + Hardware Compatibility Matrix added to README.	✅ Complete
🧠 Expanded Scope (Phase 5B–5D)
Phase	Focus	Key Additions
5B – Analytical Visualization	Research-grade SPC Analysis View (Plotly). Adds zone shading, Nelson Rule #1, and export tools (CSV + PNG).	🔜
5C – Statistical Rule Engine	Backend Nelson rules (1–8) + real-time violation tagging and alerts.	🔜
5D – Long-Term Research Mode	Session serialization (/data/spc_sessions/) and pPk tracking across tests. Supports multi-provider benchmark (OpenAI, Anthropic, Gemini, AWS).	🔜
5E – Public Beta / Outreach	Launch LLMscope as an open research tool with documentation, screenshots, and sustainability report integration.	🔜
⚙️ Technical Highlights

Container Architecture: backend (FastAPI 8081), frontend (Vite 3000 / 8082), monitor (Python agent).

Persistent Storage: SQLite database mounted to /data/llmscope.db.

Telemetry Precision: 0.5 s sampling interval, JSON API response.

Frontend Refresh: 5 s polling cycle for stats and system updates.

Security: Bearer token auth (dev-123) with CORS policy for local dev.

🌍 Research & Sustainability Vision

The integration of latency metrics with live power/temperature telemetry enables correlation between AI efficiency, energy usage, and infrastructure sustainability.
Future work will quantify model response time against hardware draw and resource consumption—supporting data-center optimization and environmental reporting initiatives.

🧭 Summary Statement

Phase 5 establishes LLMscope as a local-first AI observatory capable of bridging model performance, system telemetry, and statistical quality control.
The next stage (5B) will introduce Plotly-based analytical visualization and rule-based process monitoring, transforming LLMscope from a utility into a research instrument.

✅ Revision: SCOPE_v5 Rev B
🗓️ Updated: October 25, 2025
✍️ Author: BLB3D Labs / LLMscope Development Team

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
