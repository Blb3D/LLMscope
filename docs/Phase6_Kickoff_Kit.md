# Phase 6 Kickoff Kit (Rev A) — Canonical Reference

This document defines the verified structure, dependency interactions, and modification policies for **LLMscope Phase 6 (Public Beta)**.

---

## 🧹 0) Mandatory Pre-Step: Verify & Normalize Repository Structure

**Do this first before editing or rebuilding anything.**

### A. Snapshot the current file tree

**PowerShell (Windows):**
```powershell
Get-ChildItem -Recurse | Select-Object FullName | Out-File -Encoding utf8 .\docs\phase6\file_audit_$(Get-Date -Format yyyy-MM-dd_HH-mm).txt
```

**Bash (Linux/WSL/macOS):**
```bash
mkdir -p docs/phase6
tree -a > docs/phase6/file_audit_$(date +%F_%H-%M).txt
```

### B. Identify stray or duplicate files
- Keep **one** canonical version of each file listed in Section 1.
- Archive duplicates into `archive/phase5/`.

### C. Normalize folder structure
Use these folder names consistently:
```
backend/
monitor/
frontend/
data/
docs/
archive/
```
Then update paths in:
- `docker-compose.yml`
- `Dockerfile.*`
- `reset_llmscope.ps1`

### D. Rebuild cleanly
```powershell
docker-compose down
docker system prune -af
docker-compose build --no-cache
docker-compose up -d
```

---

## 1️⃣ Critical Files Verification Template

| Role | Expected Name | Actual Path (fill me) | Notes |
|------|----------------|-----------------------|-------|
| Compose file | `docker-compose.yml` |  | Defines services, ports, volumes |
| Env vars | `.env` |  | Holds API keys & toggles |
| Reset utility | `reset_llmscope.ps1` |  | Docker prune & smoke test |
| Backend app | `app.py` |  | FastAPI core |
| Requirements | `requirements.txt` |  | Python deps (FastAPI, Uvicorn, Psutil, etc.) |
| Backend Dockerfile | `Dockerfile.backend` |  | Backend build image |
| DB | `data/llmscope.db` |  | Mounted SQLite database |
| Monitor script | `monitor_apis.py` |  | Metrics collector |
| Monitor Dockerfile | `Dockerfile.monitor` |  | Python monitor container |
| Frontend package | `frontend/package.json` |  | React & Vite deps |
| Vite config | `frontend/vite.config.ts` |  | Build configuration |
| Entry point | `frontend/src/main.tsx` |  | Router setup |
| Dashboard | `frontend/src/Dashboard.jsx` |  | SPC dashboard |
| Analysis chart | `frontend/src/SPCAnalysisPlotly.jsx` |  | Plotly SPC analysis |
| Frontend Dockerfile | `Dockerfile.frontend` |  | Node → Nginx build |
| Nginx config | `nginx.conf` |  | SPA routing & serving |
| Docs | `/docs/...` |  | Scope, Roadmap, Handoff, Pre-deploy checklist |

---

## 2️⃣ Data & Service Flow Overview

```
User Prompt
   ↓
Ollama / LLM Model
   ↓  (Latency + Metrics)
monitor_apis.py  →  FastAPI Backend (/api/log)
                         ↓
                   SQLite (llmscope.db)
                         ↓
Frontend (GET /api/stats, /api/analysis)
```

- `/api/system` → CPU/RAM/GPU telemetry (requires ENABLE_SYSTEM_API).
- `/api/analysis` → SPC + stats (mean, σ, Cp/Cpk, Nelson violations).

---

## 3️⃣ Refer-Before-Change Directive

> **Before modifying any file**, open this document and confirm:
> 1. The file name and path match this reference.  
> 2. Dependencies in Dockerfiles and imports still resolve.  
> 3. Health checks pass after changes (`/health`, `/api/system`, `/api/stats`).  
> 4. Run a smoke test before committing or pushing to GitHub.

---

## 4️⃣ Environment Variables Summary

| Variable | Example | Used In | Description |
|-----------|----------|---------|--------------|
| `LLMSCOPE_API_KEY` | `dev-123` | backend, monitor | Local dev auth |
| `USE_OLLAMA` | `true` | monitor | Enables model polling |
| `OLLAMA_MODEL` | `gemma3:4b` | monitor | Default test model |
| `ENABLE_SYSTEM_API` | `true` | backend | Exposes telemetry |
| `LLMSCOPE_API_BASE` | `http://backend:8000` | monitor | Internal network endpoint |

---

## 5️⃣ Phase 6 Goals Snapshot

**Objective:** prepare for **public beta** with validated latency analytics and research-ready SPC charts.

**Immediate tasks:**
- [ ] Verify file structure (this doc Section 0).  
- [ ] Resolve GPU telemetry pipeline (NVIDIA/WSL2 bridge).  
- [ ] Harden authentication for backend API.  
- [ ] Integrate live SPC streaming (Plotly layer).  
- [ ] Publish Docker Hub public images.  
- [ ] Draft public documentation (README.md).  

---

📘 *All contributors must reference this document before any structural or dependency change.*
