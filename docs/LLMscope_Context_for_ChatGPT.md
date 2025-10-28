# LLMscope Context for ChatGPT & Developers (v0.6.0-dev)
This file ensures every AI assistant or developer follows the verified baseline.  
All work must conform to [`docs/LLMscope_Phase6_Baseline.md`](./LLMscope_Phase6_Baseline.md).

---

## 💡 Core Directives
1. **Never guess file locations.** Use the baseline tree.  
2. **All Dockerfiles → `/docker/`, context = `.`**  
3. **Backend:** FastAPI at `/backend/app.py`, port 8000.  
4. **Frontend:** React + Plotly served by Nginx on port 8081.  
5. **Monitor:** Python script `/monitor/monitor_apis.py`.  
6. **Single `.env` in root** controls all services.  
7. **Do not duplicate** `.env`, `.dockerignore`, or requirements files.  
8. **All routes start with `/api/`.**  
9. **Do not move files or rename directories** without PM approval.  
10. **Confirm compatibility with Phase 6 Baseline before adding features.**

---

## 🧱 Docker Ground Truth
```yaml
dockerfile: docker/Dockerfile.backend
dockerfile: docker/Dockerfile.frontend
dockerfile: docker/Dockerfile.monitor
```

**Nginx config:** `docker/nginx.conf`  
**Database:** `data/llmscope.db` → mounted at `/app/data/llmscope.db`

---

## 🧭 Environment Variables
```
LLMSCOPE_API_KEY=dev-123
ENABLE_SYSTEM_API=true
DATABASE_PATH=/app/data/llmscope.db
USE_OLLAMA=false
OLLAMA_MODEL=gemma3:4b
```

---

## 🚀 Startup Sequence
```powershell
docker compose build --no-cache
docker compose up -d
```
Then open <http://localhost:8081>

---

## 🧠 If Starting a New ChatGPT Session
Paste this at the start of the conversation:
> “This chat is part of the LLMscope project.  
> Before answering, read `docs/LLMscope_Context_for_ChatGPT.md` and `docs/LLMscope_Phase6_Baseline.md`.  
> Follow the verified file tree and configuration.  
> Do not move, rename, or rebuild files unless explicitly approved by the Project Manager.”
