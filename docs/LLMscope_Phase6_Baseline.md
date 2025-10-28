# LLMscope Phase 6 – Developer Baseline (v0.6.0-dev)
**Repository:** [Blb3D/LLMscope-Desktop](https://github.com/Blb3D/LLMscope-Desktop)  
**Status:** ✅ Verified Running (October 2025)  
**Purpose:** Canonical architecture and configuration reference for all development going forward.

---

## 🧩 Core Architecture
LLMscope consists of **three coordinated services** managed by Docker Compose:

| Service | Description | Port | Container Name |
|----------|--------------|------|----------------|
| **llmscope_api** | FastAPI backend (data storage + SPC analytics) | 8000 | llmscope_api |
| **llmscope_web** | React + Plotly frontend served via Nginx | 8081 | llmscope_web |
| **llmscope_monitor** | Python telemetry simulator/logger | internal | llmscope_monitor |

All containers share one Docker network and communicate by service name.

---

## 🗂️ Directory Structure
```
LLMscope/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── __init__.py
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── package-lock.json
│   └── src/
│       ├── Dashboard.jsx
│       ├── SPCAnalysisPlotly.jsx
│       └── …
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── Dockerfile.monitor
│   └── nginx.conf
├── data/
│   └── llmscope.db
├── scripts/
│   ├── Compare-TreeToSpec.ps1
│   ├── reset_llmscope.ps1
│   ├── diagnostics.ps1
│   └── …
├── docs/
│   ├── LLMscope_Phase6_Baseline.md
│   ├── LLMscope_Context_for_ChatGPT.md
│   └── LLMscope_Phase6_TreeSpec.txt
├── .env
├── docker-compose.yml
└── README.md
```
> 🧱 **Rule:** All Dockerfiles live in `/docker/`; never in root.

---

## ⚙️ Environment Configuration
Single root `.env` file (never duplicate):
```
LLMSCOPE_API_KEY=dev-123
ENABLE_SYSTEM_API=true
DATABASE_PATH=/app/data/llmscope.db
USE_OLLAMA=false
OLLAMA_MODEL=gemma3:4b
```

---

## 🐳 Docker Compose Summary
- Compose file: `docker-compose.yml`
- Backend → `docker/Dockerfile.backend`
- Frontend → `docker/Dockerfile.frontend` (using `docker/nginx.conf`)
- Monitor → `docker/Dockerfile.monitor`

---

## 🧰 Verified Commands
```powershell
docker compose down --remove-orphans
docker system prune -af
docker compose build --no-cache
docker compose up -d
docker compose ps
```
Expected:
```
llmscope_api       Up (healthy)
llmscope_monitor   Up
llmscope_web       Up
```

### Health Tests
```powershell
irm http://localhost:8081/health -Headers @{ Authorization='Bearer dev-123' }
irm http://localhost:8081/api/stats  -Headers @{ Authorization='Bearer dev-123' }
irm http://localhost:8081/api/analysis -Headers @{ Authorization='Bearer dev-123' }
```

---

## 🧠 Immutable Rules
1. Dockerfiles always under `/docker/`
2. Single `.env` in root
3. Backend → port 8000
4. Frontend → port 8081
5. Route prefix `/api/` is permanent
6. Monitor depends on backend health
7. Frontend communicates only via `/api/`

---

## 🧾 Troubleshooting Quick Reference

| Problem | Symptom | Fix |
|----------|----------|-----|
| `nginx.conf` not found | Build fails on COPY | `COPY docker/nginx.conf` in Dockerfile.frontend |
| `Database not found` | `/analysis` error | `.env → DATABASE_PATH=/app/data/llmscope.db` |
| Blank chart | No monitor data | Start monitor service or seed API |
| Port conflict | 8000/8081 busy | Stop other apps or edit compose |
| Name conflict | old containers | `docker system prune -af` then rebuild |

---

## 🔒 Phase 6 Baseline Commitment
All future work must maintain compatibility with this baseline  
unless explicitly approved by the **Project Manager (LLMscope chat)**.
