## 📗 **File 2 — `LLMscope_Phase6_File_Dependency_Map.md`**

```markdown
# 🧩 LLMscope Phase 6 — File Dependency Map

**Version:** v0.6.0-dev  
**Date:** 2025-10-27  

This document defines every required file for a complete LLMscope Phase 6 build and how they interact across containers.

---

## 🧱 Core Backend ( llmscope_api )

| File | Purpose | Depends On |
|------|----------|------------|
| `app.py` | FastAPI main app — exposes `/api/system`, `/api/stats`, `/api/stats/spc`, `/api/report.csv` | `requirements.txt`, `.env`, `llmscope.db` |
| `requirements.txt` | Python deps: `fastapi`, `uvicorn`, `aiohttp`, `sqlite3`, `requests`, etc. | — |
| `.env` | Environment vars (shared all containers) | referenced in `docker-compose.yml` |
| `llmscope.db` | SQLite telemetry store | created by `app.py` at runtime |
| `docker/Dockerfile.backend` | Builds API container from `python:3.11-slim` | `app.py`, `requirements.txt` |

---

## 🔄 Monitor Service ( llmscope_monitor )

| File | Purpose | Depends On |
|------|----------|------------|
| `monitor_apis_revA.py` | Async telemetry loop posting Ollama latency to `/api/stats` | `.env` (`USE_OLLAMA`, `OLLAMA_MODEL`), `LLMSCOPE_API_BASE` |
| `docker/Dockerfile.monitor` | Slim Python image for monitor loop | `monitor_apis_revA.py`, `aiohttp`, `requests` |

---

## 🌐 Frontend ( llmscope_web )

| File | Purpose | Depends On |
|------|----------|------------|
| `frontend/src/Dashboard_ollama_revB.jsx` | Main dashboard UI (telemetry + SPC chart + controls) | `SPCChart_ollama_revB.jsx`, `main.tsx`, `index.css` |
| `frontend/src/SPCChart_ollama_revB.jsx` | Plotly-based SPC chart component with Nelson rules | Plotly JS, chart props from Dashboard |
| `frontend/src/main.tsx` | React entry mount for Vite | `index.html` |
| `frontend/src/index.css` | Tailwind directives and global theme | `postcss.config.js`, `tailwind.config.js` |
| `frontend/package.json` | Frontend dependencies (Vite, React, Plotly, Tailwind) | — |
| `frontend/vite.config.ts` | Vite build config (static assets) | — |
| `docker/Dockerfile.frontend` | Node 22 Alpine → Nginx 1.27.2-alpine image | Frontend files above |
| `docker/nginx.conf` | Routes `/api/*` → `llmscope_api:8000` | Used by frontend container serve stage |

---

## 🐳 Docker / Orchestration

| File | Purpose | Depends On |
|------|----------|------------|
| `docker-compose.yml` | Defines services (api, monitor, web) and networks | All Dockerfiles, `.env` |
| `.dockerignore` | Excludes build cache files | — |
| `VERSION` | Internal build marker | optional metadata |

---

## 🧩 Docs & Context

| File | Purpose |
|------|----------|
| `LLMscope_Phase6_Baseline.md` | Phase 6 baseline architecture definition |
| `LLMscope_Context_for_ChatGPT.md` | ChatGPT context & phase rules |
| `LLMscope_Phase6_Checkpoint_B.md` | Current progress snapshot |
| `LLMscope_Phase6_File_Dependency_Map.md` | (this file) Build index & QA checklist |

---

## 🧮 Phase 6 Pre-Launch Verification Checklist

| Step | Description | Status |
|------|--------------|--------|
| 1️⃣ | `.env` includes `LLMSCOPE_API_KEY=dev-123` and `USE_OLLAMA=true` | ☐ |
| 2️⃣ | `data/llmscope.db` exists after first run | ☐ |
| 3️⃣ | `docker-compose.yml` defines all 3 services | ☐ |
| 4️⃣ | `Dockerfile.frontend` uses `nginx:1.27.2-alpine` | ☐ |
| 5️⃣ | `app.py` exposes `/api/system`, `/api/stats`, `/api/stats/spc` | ☐ |
| 6️⃣ | `monitor_apis_revA.py` POST → `/api/stats` returns `200 OK` | ☐ |
| 7️⃣ | Frontend build completes (`vite v7+`) | ☐ |
| 8️⃣ | Browser loads `http://localhost:8081` with dashboard | ☐ |
| 9️⃣ | Chart and telemetry display live data | ☐ |
| 🔟 | CSV / PDF exports function | ☐ |

All boxes ✅ = ready for internal test deployment.

---

**BLB3D Labs | LLMscope v0.6.0-dev**  
_Compiled 2025-10-27 @ 23:59 EST_