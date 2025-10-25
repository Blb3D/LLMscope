# LLMscope – Phase 5D: Pre-Deployment Checklist (Rev A)
*Date: 2025-10-25*

## 🔐 1. Security / Authentication
| Priority | Task | Target File / Service | Notes |
|-----------|------|----------------------|-------|
| 🔴 | Restrict CORS to known origins | app.py | Replace `allow_origins=["*"]` with specific hostnames |
| 🔴 | Move API key out of code | .env / docker-compose.yml | Use environment secret, not hardcoded `Bearer dev-123` |
| 🟠 | Add basic API key or JWT middleware | app.py | Protect `/api/*` endpoints |
| 🟢 | Sanitize `/health` endpoint | app.py | Keep minimal response; remove debug data |

## 🧰 2. Data / Privacy
| Priority | Task | Target | Notes |
|-----------|-------|--------|-------|
| 🔴 | Secure database volume | docker-compose.yml | Mount with restricted permissions |
| 🟠 | Optional migrate to PostgreSQL | Backend | Future scalability |
| 🟠 | Disable `/api/system` unless flagged | app.py | Use `ENABLE_SYSTEM_API` env var |
| 🟢 | Truncate or anonymize benchmark logs | monitor_apis.py | Prevent sensitive data capture |

## ⚙️ 3. Stability / Analytics
| Priority | Task | Target | Notes |
|-----------|-------|--------|-------|
| 🔴 | Remove automatic simulated data fallback | monitor_apis.py | Only run when `USE_OLLAMA=true` |
| 🟠 | Add graceful shutdown + loop interval | monitor_apis.py | Prevent runaway background tasks |
| 🟢 | Hide null GPU data in dashboard | Dashboard.jsx / SPCAnalysisPlotly.jsx | Improves clarity |

## 🎨 4. Frontend / UX
| Priority | Task | Target | Notes |
|-----------|-------|--------|-------|
| 🔴 | Add live polling or websocket refresh for SPC | Dashboard.jsx | Replace static chart updates |
| 🟠 | Integrate BLB3D Labs bronze theme toggle | main.tsx / vite.config | Brand consistency |
| 🟠 | Secure direct routes (e.g. `/analysis`) | react-router-dom | Add token check |
| 🟢 | Add real-time stats legend (mean, std, Cp, Cpk) | SPCAnalysisPlotly.jsx | Enhances SPC clarity |

## 🧱 5. Deployment / Ops
| Priority | Task | Target | Notes |
|-----------|-------|--------|-------|
| 🔴 | Create `.env.prod` and `.env.dev` separation | root | Keep secrets isolated |
| 🔴 | Pin base images (`python:3.11-slim`, `node:22-alpine`) | Dockerfiles | Prevent drift |
| 🟠 | Add CI workflow (GitHub Actions) | .github/workflows/build.yml | Auto-build and test before push |
| 🟠 | Centralized logging to stdout + rotation | Backend & Monitor | Easier Docker tail |
| 🟢 | Version tagging for releases | all Dockerfiles | e.g. `:revC`, `:revD` |

## 🧪 6. Optional Enhancements
- Add `/api/healthcheck_detailed` endpoint that reports container version, uptime, and last log.
- Integrate self-check log emitter into backend (app.py) to print cause of health failure.
- Implement docker-compose.prod.yml for hardened deployment defaults.
- Create export_sanitized_dataset.py for research sharing.

---

## 🚀 Phase 6 – Public Beta Transition Plan
| Goal | Description | Deliverable |
|------|--------------|-------------|
| ✅ **Functional Validation** | All endpoints operational, no simulated data unless explicitly requested. | Internal “Live System Test Report v1” |
| ✅ **Security Review** | API key rotation, CORS limited, health endpoints hardened. | Security Checklist signed off |
| ✅ **Brand Consistency** | Frontend uses BLB3D Labs palette, responsive layout. | Visual QA screenshot set |
| 🟠 **Telemetry Toggle** | System telemetry optional at runtime. | Env var `ENABLE_SYSTEM_API` |
| 🟢 **Beta Release Packaging** | Docker Hub images tagged `:beta`, GitHub repo Rev C release notes. | Public announcement package |
