#!/usr/bin/env python3
"""
LLMscope Phase-5 Documentation Finalizer
----------------------------------------
Creates or refreshes docs/SCOPE_v5.md and docs/ROADMAP_v5.md
for the integrated Claude + SPC/Nelson baseline.

Usage:
    python scripts/finalize_phase5_docs.py
"""

import os, textwrap

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS = os.path.join(ROOT, "docs")
os.makedirs(DOCS, exist_ok=True)

# ---- SCOPE_v5.md ----
SCOPE = textwrap.dedent("""\
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
""")

# ---- ROADMAP_v5.md ----
ROADMAP = textwrap.dedent("""\
# 🧭 LLMscope Phase-5 Developer Roadmap

**Focus:** Integration, Polish, Deployment  
**Timeline:** Q4 2025 – Q1 2026

---

## 📅 Phase 5 Milestones

### 🧩 Milestone 1 — Integration Baseline
**Goal:** Combine Claude’s deploy stack with SPC backend  
- [x] Run migrate_to_phase5.py to create clean structure  
- [x] Confirm backend → frontend → monitor data flow  
- [x] Validate /api/stats/spc endpoint returns JSON  
- [ ] Replace placeholder Dockerfiles with working builds  
- [ ] Test .env.example variables with real keys  

**Deliverable:** LLMscope_Phase5 runs locally and streams data to dashboard.

---

### 🧪 Milestone 2 — Functional Verification
**Goal:** Ensure end-to-end data integrity  
- [ ] Run verify_repo_v2.py → all ✅  
- [ ] Run verify_functional_health.py → all ✅  
- [ ] Confirm monitor logs appear in SQLite  
- [ ] Validate SPC chart shows Nelson R1–R8 markers  

---

### 🎨 Milestone 3 — UI Polish & Brand Alignment
**Goal:** Merge Claude’s dashboard styling with BLB3D Labs theme  
- [ ] Import BLB3D bronze/dark palette (#1A0F08, #D37E3E, #F4C98A)  
- [ ] Replace logo and hero components  
- [ ] Tune chart margins, font, and responsiveness  
- [ ] Add “last updated at ⏱️” indicator  

---

### 🧰 Milestone 4 — Testing & Deployment
**Goal:** Achieve 1-command deploy and test automation  
- [ ] Confirm docker-compose up -d brings up all 3 containers  
- [ ] Add pytest smoke test for /api/data and /api/stats/spc  
- [ ] Implement health checks in Docker Compose  
- [ ] Push to GitHub + Railway demo  

---

### 💡 Milestone 5 — Launch Preparation
**Goal:** Convert internal tool → public beta  
- [ ] Write docs/QuickStart.md  
- [ ] Record 30 s demo video (OBS)  
- [ ] Post to r/LangChain + Indie Hackers  
- [ ] Gather ≥ 10 user sign-ups  

---

## 🚀 Phase 6 Preview (2026)
- Real-time WebSocket streaming  
- Multi-user dashboards  
- “Smart Router” (AI-based provider switch)  
- Cloud analytics tier (Stripe Pro)

---

## 🛠️ Daily Dev Checklist

| Task | Command |
|------|----------|
| Run backend | uvicorn backend.app:app --reload |
| Run frontend | npm run dev (inside /frontend) |
| Seed data | python scripts/demo_ollama.py |
| Run monitor | python scripts/monitor_apis.py |
| Verify structure | python scripts/verify_repo_v2.py |
| Verify logic | python scripts/verify_functional_health.py |

---

## ✅ Completion Criteria
- 100 % ✅ in both verifiers  
- SPC chart stable under 100 requests  
- Docker build deploys cleanly on fresh machine  
- Docs + roadmap published on GitHub  

---

© 2025 BLB3D Labs — Internal Developer Roadmap
""")

def write_doc(filename, content):
    path = os.path.join(DOCS, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"✅ Wrote {filename}")

if __name__ == "__main__":
    write_doc("SCOPE_v5.md", SCOPE)
    write_doc("ROADMAP_v5.md", ROADMAP)
    print(f"\n✨ Docs finalized in: {DOCS}\n")

#!/usr/bin/env python3
"""
LLMscope Phase-5 Documentation Finalizer
----------------------------------------
Creates or refreshes:
    docs/SCOPE_v5.md
    docs/ROADMAP_v5.md
    docs/QuickStart_v5.md
for the integrated Claude + SPC/Nelson baseline.

Usage:
    python scripts/finalize_phase5_docs.py
"""

import os, textwrap

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS = os.path.join(ROOT, "docs")
os.makedirs(DOCS, exist_ok=True)

# --- SCOPE_v5.md ---
SCOPE = textwrap.dedent("""\
# 📘 LLMscope — Phase-5 Specification (Unified Claude + SPC Build)

**Version:** v5.0  
**Status:** Active Development (Q4 2025)  
**Maintainer:** BLB3D Labs / Brandan Baker  

## 🎯 Mission
Deliver a deploy-ready, self-hosted AI performance dashboard combining
Claude’s fast-deploy infrastructure with BLB3D Labs’ SPC-based analytics engine.

## 🧱 System Architecture

Three Docker services: backend | frontend | monitor.

## ⚙️ Functional Scope
- Unified Docker stack  
- SPC R1-R8 analytics  
- Cost / latency tracking  
- External monitor pings  
- Auth + retention  
- Local or Railway deploy

## 📈 Success Metrics
| Metric | Target |
|---------|---------|
| Setup time | < 10 min |
| SPC accuracy | ≥ 95 % |
| Runtime errors | 0 critical in 24 h |
| Beta → Pro conversion | 10 % |

© 2025 BLB3D Labs — MIT License
""")

# --- ROADMAP_v5.md ---
ROADMAP = textwrap.dedent("""\
# 🧭 LLMscope Phase-5 Developer Roadmap

**Focus:** Integration + Deployment  **Timeline:** Q4 2025 – Q1 2026

### 🧩 Milestone 1 — Integration Baseline
- [x] Run migrate_to_phase5.py  
- [x] Verify backend ↔ frontend ↔ monitor  
- [ ] Finalize Docker builds  

### 🧪 Milestone 2 — Functional Verification
- [ ] Run verify_repo_v2.py → all ✅  
- [ ] Run verify_functional_health.py → all ✅  
- [ ] Confirm SPC chart violations  

### 🎨 Milestone 3 — UI Polish & Brand Alignment
- [ ] Apply BLB3D palette (#1A0F08 #D37E3E #F4C98A)  
- [ ] Responsive layout + logo  

### 🧰 Milestone 4 — Testing & Deployment
- [ ] `docker-compose up -d` brings all containers healthy  
- [ ] Push to GitHub + Railway  

### 💡 Milestone 5 — Public Beta Launch
- [ ] Create demo video + QuickStart  
- [ ] Post to r/LangChain / Indie Hackers  

© 2025 BLB3D Labs — Internal Roadmap
""")

# --- QuickStart_v5.md ---
QUICKSTART = textwrap.dedent("""\
# 🚀 LLMscope Phase-5 Quick Start

### 🧰 Requirements
- Docker Desktop or Podman  
- Python 3.11+  
- Node 18+ (optional for manual frontend dev)

---

## 1️⃣ Clone or Create Project
```bash
git clone https://github.com/Blb3D/LLMscope.git
cd LLMscope_Phase5

2️⃣ Set Up Environment
cp .env.example .env
# Edit .env and insert your API keys

LLMSCOPE_API_KEY=dev-123
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-your-key
OLLAMA_URL=http://localhost:11434
DATA_RETENTION_DAYS=7
MONITORING_INTERVAL=15

3️⃣ Launch with Docker
docker-compose up -d
Then visit http://localhost:3000

4️⃣ Optional — Run Tools Manually
# Backend
uvicorn backend.app:app --reload

# Frontend (dev mode)
cd frontend && npm run dev

# Seed data / monitor
python scripts/demo_ollama.py
python scripts/monitor_apis.py

5️⃣ Verify Health
python scripts/verify_repo_v2.py
python scripts/verify_functional_health.py


All ✅ = deployment ready.

Next Steps

Edit docs/ROADMAP_v5.md for your tasks

Customize branding (logo + colors)

Deploy to Railway or Fly.io

© 2025 BLB3D Labs — Quick Start Guide
""")

def write_doc(name, content):
path = os.path.join(DOCS, name)
with open(path, "w", encoding="utf-8") as f:
f.write(content.strip() + "\n")
print(f"✅ Created {name}")

if name == "main":
write_doc("SCOPE_v5.md", SCOPE)
write_doc("ROADMAP_v5.md", ROADMAP)
write_doc("QuickStart_v5.md", QUICKSTART)
print(f"\n✨ Phase-5 docs finalized in: {DOCS}\n")


---

### 🧠 How to run
From your Phase-5 project root:

```powershell
python scripts\finalize_phase5_docs.py


You’ll see:

✅ Created SCOPE_v5.md
✅ Created ROADMAP_v5.md
✅ Created QuickStart_v5.md
✨ Phase-5 docs finalized in: C:\...\LLMscope_Phase5\docs


Then open /docs/ — you’ll have all three Markdown files ready for commit or upload to GitHub Pages.