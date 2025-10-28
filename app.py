"""
LLMscope FastAPI Backend – Final Version
Full telemetry storage and SPC analytics
"""

from fastapi import FastAPI, Depends, Header, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any
import sqlite3
import psutil
import platform
import datetime
import os

# === CONFIGURATION ==========================================================
DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/llmscope.db")
LLMSCOPE_API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-123")

# === Initialize database ====================================================
def init_db():
    os.makedirs(os.path.dirname(DATABASE_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    # Enhanced telemetry table with Ollama + system metrics
    c.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT,
            model TEXT,
            latency_ms REAL,
            timestamp TEXT,
            
            -- Ollama metrics
            total_duration_ms REAL,
            load_duration_ms REAL,
            prompt_eval_duration_ms REAL,
            eval_duration_ms REAL,
            prompt_eval_count INTEGER,
            eval_count INTEGER,
            
            -- System metrics
            cpu_percent REAL,
            memory_percent REAL,
            gpu_percent REAL,
            gpu_memory_percent REAL,
            
            -- Prompt tracking
            prompt_hash TEXT,
            prompt_text TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# === APP SETUP ==============================================================
app = FastAPI(title="LLMscope API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === AUTH ===================================================================
def verify_api_key(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        scheme, token = authorization.split()
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    if scheme.lower() != "bearer" or token != LLMSCOPE_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return True

# === HEALTH CHECK ===========================================================
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat()}

# === SYSTEM TELEMETRY =======================================================
@app.get("/api/system")
async def get_system_info(_: bool = Depends(verify_api_key)):
    try:
        cpu = psutil.cpu_percent(interval=0.5)
        memory = psutil.virtual_memory().percent
        system = platform.system()
        release = platform.release()
        
        # Try to get GPU info (NVIDIA)
        gpu_percent = 0
        gpu_memory_percent = 0
        try:
            from pynvml import nvmlInit, nvmlDeviceGetHandleByIndex, nvmlDeviceGetUtilizationRates, nvmlDeviceGetMemoryInfo
            try:
                nvmlInit()
                handle = nvmlDeviceGetHandleByIndex(0)
                util = nvmlDeviceGetUtilizationRates(handle)
                mem_info = nvmlDeviceGetMemoryInfo(handle)
                gpu_percent = util.gpu
                gpu_memory_percent = (mem_info.used / mem_info.total) * 100
            except Exception as gpu_err:
                pass
        except ImportError:
            pass
        
        return {
            "cpu": cpu,
            "memory": memory,
            "gpu": gpu_percent,
            "gpu_memory": gpu_memory_percent,
            "system": system,
            "release": release,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === SUMMARY STATS ==========================================================
@app.get("/api/stats")
async def get_stats(_: bool = Depends(verify_api_key)):
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute("SELECT COUNT(*), AVG(latency_ms), MAX(latency_ms) FROM telemetry")
        row = c.fetchone()
        conn.close()
        return {
            "records": row[0] or 0,
            "avg_latency": row[1] or 0.0,
            "max_latency": row[2] or 0.0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === LOGGING ENDPOINT (FROM MONITOR) ========================================
@app.post("/api/stats")
async def post_stats(
    payload: Dict[str, Any] = Body(...),
    _: bool = Depends(verify_api_key),
):
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute("""
            INSERT INTO telemetry (
                provider, model, latency_ms, timestamp,
                total_duration_ms, load_duration_ms, 
                prompt_eval_duration_ms, eval_duration_ms,
                prompt_eval_count, eval_count,
                cpu_percent, memory_percent, gpu_percent, gpu_memory_percent,
                prompt_hash, prompt_text
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            payload.get("provider", "unknown"),
            payload.get("model", "unknown"),
            payload.get("latency_ms", 0.0),
            payload.get("timestamp", datetime.datetime.utcnow().isoformat()),
            payload.get("total_duration_ms", 0.0),
            payload.get("load_duration_ms", 0.0),
            payload.get("prompt_eval_duration_ms", 0.0),
            payload.get("eval_duration_ms", 0.0),
            payload.get("prompt_eval_count", 0),
            payload.get("eval_count", 0),
            payload.get("cpu_percent", 0.0),
            payload.get("memory_percent", 0.0),
            payload.get("gpu_percent", 0.0),
            payload.get("gpu_memory_percent", 0.0),
            payload.get("prompt_hash", ""),
            payload.get("prompt_text", ""),
        ))
        conn.commit()
        conn.close()
        return {"status": "ok", "logged": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === SPC DATA (FOR CHART) ===================================================
@app.get("/api/stats/spc")
async def stats_spc(
    provider: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(None),
    _: bool = Depends(verify_api_key),
) -> Dict[str, Any]:
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        
        # Dynamic limit based on hours
        if limit is None:
            if hours <= 0.5:  # Live (0.25 hours)
                limit = 450
            elif hours <= 1:
                limit = 1800
            elif hours <= 6:
                limit = 10800
            else:
                limit = 43200
        else:
            limit = min(limit, 50000)
        
        # Calculate cutoff time
        now = datetime.datetime.utcnow()
        cutoff = now - datetime.timedelta(hours=hours)
        cutoff_str = cutoff.isoformat()
        
        # Build query
        query = """
            SELECT timestamp, latency_ms, model, provider, 
                   total_duration_ms, eval_duration_ms, prompt_eval_count, 
                   eval_count, cpu_percent, memory_percent, gpu_percent,
                   prompt_hash
            FROM telemetry
            WHERE timestamp >= ?
        """
        params = [cutoff_str]
        
        if provider:
            query += " AND provider = ?"
            params.append(provider)
        
        if model:
            query += " AND model = ?"
            params.append(model)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        c.execute(query, params)
        rows = c.fetchall()
        conn.close()
        
        # Reverse to get ascending order for charting
        rows = list(reversed(rows))

        print(f"[API] Query: hours={hours}, provider={provider}, model={model}, limit={limit}")
        print(f"[API] Returned {len(rows)} rows")

        # Extract columns
        timestamps = [r[0] for r in rows]
        values = [r[1] for r in rows]
        models = [r[2] for r in rows]
        providers = [r[3] for r in rows]
        total_durations = [r[4] or 0 for r in rows]
        eval_durations = [r[5] or 0 for r in rows]
        prompt_counts = [r[6] or 0 for r in rows]
        eval_counts = [r[7] or 0 for r in rows]
        cpu_percents = [r[8] or 0 for r in rows]
        memory_percents = [r[9] or 0 for r in rows]
        gpu_percents = [r[10] or 0 for r in rows]
        prompt_hashes = [r[11] or "" for r in rows]

        return {
            "timestamps": timestamps,
            "values": values,
            "models": models,
            "providers": providers,
            "total_durations": total_durations,
            "eval_durations": eval_durations,
            "prompt_counts": prompt_counts,
            "eval_counts": eval_counts,
            "cpu_percents": cpu_percents,
            "memory_percents": memory_percents,
            "gpu_percents": gpu_percents,
            "prompt_hashes": prompt_hashes,
        }
    except Exception as e:
        print(f"[API] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# === RUN APP ================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)