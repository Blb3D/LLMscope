# app.py - LLMscope MVP Backend (drop-in)
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
import sqlite3
import os
import json
from contextlib import contextmanager
import math
import psutil
import platform

# =========================
# Configuration
# =========================
DATABASE = os.getenv("DATABASE_PATH", "llmscope.db")
API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-123")  # default token for local dev
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DATA_RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", "7"))  # Free tier: 7 days

# =========================
# FastAPI app & CORS
# =========================
app = FastAPI(title="LLMscope", version="0.1.0")
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# System Telemetry Endpoint
# =========================
import psutil
import platform

@app.get("/api/system")
def get_system_stats():
    """
    Returns live CPU, memory, and temperature telemetry for host or container.
    """
    try:
        # ----------------------------
        # CPU and Memory Utilization
        # ----------------------------
        cpu_percent = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        mem_percent = mem.percent

        # ----------------------------
        # Temperature Readings
        # ----------------------------
        gpu_temp = None
        cpu_temp = None

        # --- Try NVIDIA NVML first ---
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            gpu_temp = pynvml.nvmlDeviceGetTemperature(
                handle, pynvml.NVML_TEMPERATURE_GPU
            )
            pynvml.nvmlShutdown()
        except Exception:
            # GPU not detected or NVML not accessible
            gpu_temp = None

        # --- Fallback to psutil sensors (for CPU) ---
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                for label, entries in temps.items():
                    if entries:
                        if cpu_temp is None and (
                            "coretemp" in label.lower() or "cpu" in label.lower()
                        ):
                            cpu_temp = entries[0].current
        except Exception:
            pass

        # ----------------------------
        # System Info
        # ----------------------------
        sys_info = {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
        }

        # ----------------------------
        # Response Payload
        # ----------------------------
        return {
            "cpu": cpu_percent,
            "memory": mem_percent,
            "gpuTemp": gpu_temp,
            "cpuTemp": cpu_temp,
            "info": sys_info,
        }

    except Exception as e:
        # Fallback in case anything fails
        return {
            "cpu": 0,
            "memory": 0,
            "gpuTemp": None,
            "cpuTemp": None,
            "error": str(e),
        }

# =========================
# Database
# =========================
@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,       -- ISO8601 UTC string
                provider TEXT NOT NULL,
                model TEXT,
                latency REAL NOT NULL,         -- seconds
                tokens_in INTEGER,
                tokens_out INTEGER,
                cost REAL,
                success BOOLEAN DEFAULT 1,
                error_message TEXT,
                endpoint TEXT,
                metadata TEXT
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON requests(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_provider ON requests(provider)")

# =========================
# Models
# =========================
class LogEntry(BaseModel):
    provider: str = Field(..., description="AI provider name (openai, anthropic, etc)")
    model: Optional[str] = None
    latency: float = Field(..., ge=0, description="Response time in seconds")
    tokens_in: Optional[int] = Field(None, ge=0)
    tokens_out: Optional[int] = Field(None, ge=0)
    cost: Optional[float] = Field(None, ge=0)
    success: bool = True
    error_message: Optional[str] = None
    endpoint: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# (The React UI uses "series/stats/violations" — these Pydantic models are optional.)

# =========================
# Auth
# =========================
def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return credentials.credentials

# =========================
# Helpers (SPC + violations)
# =========================
def calculate_spc_stats(latencies: List[float]) -> Dict[str, float]:
    if not latencies:
        return {
            "mean": 0.0, "std_dev": 0.0, "p50": 0.0, "p95": 0.0, "p99": 0.0,
            "min": 0.0, "max": 0.0, "ucl": 0.0, "lcl": 0.0
        }
    xs = sorted(latencies)
    n = len(xs)
    mean = sum(xs) / n
    var = sum((x - mean) ** 2 for x in xs) / n  # population σ
    std = math.sqrt(var)

    def pct(p: float) -> float:
        if n == 1:
            return xs[0]
        k = (n - 1) * p
        f = math.floor(k); c = math.ceil(k)
        if f == c:
            return xs[int(k)]
        return xs[f] * (c - k) + xs[c] * (k - f)

    return {
        "mean": round(mean, 4),
        "std_dev": round(std, 4),
        "p50": round(pct(0.50), 4),
        "p95": round(pct(0.95), 4),
        "p99": round(pct(0.99), 4),
        "min": round(xs[0], 4),
        "max": round(xs[-1], 4),
        "ucl": round(mean + 3 * std, 4),
        "lcl": round(max(0.0, mean - 3 * std), 4),
    }

def detect_nelson_violations(latencies: List[float], mean: float, std_dev: float) -> List[Dict[str, Any]]:
    """
    Returns a list of single-point violation dicts:
      {"rule": 1|2|3, "index": int, "severity": "critical|warning", "message": str}
    We'll map these to range form in /api/data.
    """
    v: List[Dict[str, Any]] = []
    n = len(latencies)
    if n < 2 or std_dev == 0:
        return v

    latest_idx = n - 1
    latest = latencies[latest_idx]

    # Rule 1: point beyond 3σ
    if abs(latest - mean) > 3 * std_dev:
        v.append({
            "rule": 1,
            "severity": "critical",
            "message": f"Latency {latest:.3f}s exceeds 3σ control limits",
            "index": latest_idx
        })

    # Rule 2: 9 consecutive points on same side of mean
    if n >= 9:
        last9 = latencies[-9:]
        if all(x > mean for x in last9) or all(x < mean for x in last9):
            v.append({
                "rule": 2,
                "severity": "warning",
                "message": "9 consecutive points on same side of mean",
                "index": latest_idx
            })

    # Rule 3: 6 consecutive increasing or decreasing
    if n >= 6:
        last6 = latencies[-6:]
        inc = all(last6[i] < last6[i+1] for i in range(5))
        dec = all(last6[i] > last6[i+1] for i in range(5))
        if inc or dec:
            v.append({
                "rule": 3,
                "severity": "warning",
                "message": f"Consistent {'degradation' if inc else 'improvement'} trend",
                "index": latest_idx
            })
    return v

def cleanup_old_data() -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=DATA_RETENTION_DAYS)).isoformat()
    with get_db() as conn:
        cur = conn.execute("DELETE FROM requests WHERE timestamp < ?", (cutoff,))
        return cur.rowcount

# >>> LLMscope PATCH: BEGIN SPC helpers (rolling μ/σ + Nelson 1–4)
@dataclass
class _SpcPoint:
    t_ms: int
    y_ms: float
    mu: float = 0.0
    s1: float = 0.0; s2: float = 0.0; s3: float = 0.0
    n1: float = 0.0; n2: float = 0.0; n3: float = 0.0
    r1: bool = False; r2: bool = False; r3: bool = False; r4: bool = False

def _compute_spc(points: list[_SpcPoint]) -> None:
    if not points: return
    n = 0; mean = 0.0; M2 = 0.0
    same_side_streak = 0; prev_side = 0
    inc_streak = 0; dec_streak = 0
    alt_streak = 0; last_dir = 0
    prev_y = None

    for p in points:
        x = p.y_ms
        n += 1
        d = x - mean
        mean += d / n
        M2 += d * (x - mean)
        var = (M2 / (n - 1)) if n > 1 else 0.0
        sigma = var ** 0.5
        eff_sigma = sigma if sigma > 1e-9 else 1e-9

        # Rule 1
        z = (x - mean) / eff_sigma
        r1 = abs(z) > 3.0

        # Rule 2
        side = 1 if x > mean else (-1 if x < mean else 0)
        same_side_streak = (same_side_streak + 1) if (side != 0 and side == prev_side) else (1 if side != 0 else 0)
        r2 = same_side_streak >= 9
        prev_side = side

        # Rule 3
        if prev_y is None or x == prev_y: dir_ = 0
        else: dir_ = 1 if x > prev_y else -1
        if dir_ > 0: inc_streak += 1; dec_streak = 0
        elif dir_ < 0: dec_streak += 1; inc_streak = 0
        else: inc_streak = dec_streak = 0
        r3 = (inc_streak >= 6) or (dec_streak >= 6)

        # Rule 4
        if dir_ == 0: alt_streak = 0
        else:
            if last_dir == 0: alt_streak = 1
            elif dir_ == -last_dir: alt_streak += 1
            else: alt_streak = 1
        r4 = alt_streak >= 14
        last_dir = dir_
        prev_y = x

        p.mu = mean
        p.s1 = mean + eff_sigma; p.s2 = mean + 2*eff_sigma; p.s3 = mean + 3*eff_sigma
        p.n1 = mean - (p.s1 - mean); p.n2 = mean - 2*(p.s1 - mean); p.n3 = mean - 3*(p.s1 - mean)
        p.r1, p.r2, p.r3, p.r4 = r1, r2, r3, r4

def compute_spc_series(rows: list[sqlite3.Row]) -> dict:
    pts: list[_SpcPoint] = []
    for r in rows:
        t_ms = int(r["t_ms"])
        y_ms = float(r["latency"]) * 1000.0  # convert seconds→ms for charting
        pts.append(_SpcPoint(t_ms=t_ms, y_ms=y_ms))
    _compute_spc(pts)
    return {
        "count": len(pts),
        "series": [{
            "t_ms": p.t_ms, "y_ms": p.y_ms, "mu": p.mu,
            "p1": p.s1, "p2": p.s2, "p3": p.s3,
            "n1": p.n1, "n2": p.n2, "n3": p.n3,
            "r1": p.r1, "r2": p.r2, "r3": p.r3, "r4": p.r4,
        } for p in pts]
    }
# >>> LLMscope PATCH: END SPC helpers (rolling μ/σ + Nelson 1–4)


# =========================
# Lifecycle
# =========================
@app.on_event("startup")
async def startup():
    init_db()
    print(f"✅ LLMscope started - Database: {DATABASE}")
    print(f"📊 Data retention: {DATA_RETENTION_DAYS} days")

# =========================
# Routes
# =========================
@app.get("/health")
async def health():
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM requests").fetchone()["c"]
    return {
        "status": "healthy",
        "database": DATABASE,
        "total_requests": count,
        "retention_days": DATA_RETENTION_DAYS,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.post("/api/log")
async def log_request(entry: LogEntry, _: str = Depends(verify_api_key)):
    """Log a new API request"""
    ts = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO requests (
                timestamp, provider, model, latency, tokens_in, tokens_out,
                cost, success, error_message, endpoint, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ts, entry.provider, entry.model, float(entry.latency),
            entry.tokens_in, entry.tokens_out, entry.cost,
            1 if entry.success else 0, entry.error_message, entry.endpoint,
            json.dumps(entry.metadata) if entry.metadata else None
        ))
    return {"status": "logged", "timestamp": ts}

@app.get("/api/data")
async def get_data(
    provider: Optional[str] = Query(None, description="Filter by provider"),
    hours: int = Query(24, ge=1, le=168, description="Hours of data to retrieve"),
    limit: int = Query(2000, ge=1, le=10000, description="Max number of points"),
    _: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """
    Returns the shape expected by the React dashboard:
    {
      "series": [{"t": ISO_UTC, "y": float}, ...],
      "stats": {"mean","std","p50","p95","p99","min","max","ucl","lcl","count","total_cost","error_rate"},
      "violations": [{"rule":"R1","start_idx":N,"end_idx":M,"count":K}, ...]
    }
    error_rate is a fraction [0,1].
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

    with get_db() as conn:
        sql = "SELECT timestamp, latency, cost, tokens_in, tokens_out, success FROM requests WHERE timestamp >= ?"
        params: List[Any] = [cutoff]
        if provider:
            sql += " AND provider = ?"
            params.append(provider)
        sql += " ORDER BY timestamp ASC LIMIT ?"
        params.append(limit)
        rows = conn.execute(sql, params).fetchall()

    series: List[Dict[str, Any]] = []
    latencies: List[float] = []
    costs_sum = 0.0
    errors = 0

    for r in rows:
        y = float(r["latency"])
        t = r["timestamp"]  # ISO text
        series.append({"t": t, "y": y})
        latencies.append(y)
        if r["cost"]:
            costs_sum += float(r["cost"])
        if not bool(r["success"]):
            errors += 1

    spc = calculate_spc_stats(latencies)
    count = len(latencies)
    stats = {
        "mean": spc["mean"],
        "std": spc.get("std_dev", 0.0),  # rename std_dev -> std
        "p50": spc["p50"],
        "p95": spc["p95"],
        "p99": spc["p99"],
        "min": spc["min"],
        "max": spc["max"],
        "ucl": spc["ucl"],
        "lcl": spc["lcl"],
        "count": count,
        "total_cost": round(costs_sum, 6),
        "error_rate": (errors / count) if count else 0.0
    }

    # Map your single-point violations to range format
    raw = detect_nelson_violations(latencies, spc["mean"], spc["std_dev"])
    violations: List[Dict[str, Any]] = []
    for v in raw:
        idx = v.get("index")
        if idx is None:
            continue
        rule_num = v.get("rule", 1)
        violations.append({
            "rule": f"R{rule_num}",
            "start_idx": idx,
            "end_idx": idx,
            "count": 1
        })

    return {"series": series, "stats": stats, "violations": violations}

# >>> LLMscope PATCH: BEGIN /api/stats/spc endpoint
@app.get("/api/stats/spc")
async def stats_spc(
    provider: Optional[str] = Query(None, description="Filter by provider"),
    model: Optional[str] = Query(None, description="Filter by model"),
    hours: int = Query(24, ge=1, le=168, description="Hours of data to include"),
    limit: int = Query(2000, ge=10, le=20000, description="Max points"),
    _: str = Depends(verify_api_key)
) -> Dict[str, Any]:
    """
    Returns time-ordered latency (ms) with rolling μ/σ bands and Nelson rule flags.
    Uses requests.latency (seconds) and converts to ms for charting.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    sql = """
      SELECT CAST(strftime('%s', timestamp) AS INTEGER)*1000 AS t_ms, latency
      FROM requests
      WHERE timestamp >= ?
    """
    params: List[Any] = [cutoff]
    if provider:
        sql += " AND provider = ?"; params.append(provider)
    if model:
        sql += " AND model = ?"; params.append(model)
    sql += " AND latency IS NOT NULL ORDER BY timestamp ASC LIMIT ?"
    params.append(limit)
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return compute_spc_series(rows)
# >>> LLMscope PATCH: END /api/stats/spc endpoint

# >>> LLMscope PATCH: BEGIN /api/stats (simple dashboard feed)
@app.get("/api/stats")
async def get_recent_stats(summary: bool = Query(False)):
    """
    Returns recent request metrics in a shape consumable by the frontend dashboard.
    Example:
      {"logs": [{"provider":..., "model":..., "latency":..., ...}, ...]}
    """
    try:
        with get_db() as conn:
            rows = conn.execute("""
                SELECT provider, model, latency, tokens_in, tokens_out, cost, success, timestamp
                FROM requests
                ORDER BY timestamp DESC
                LIMIT 200
            """).fetchall()
        logs = [
            {
                "provider": r["provider"],
                "model": r["model"],
                "latency": r["latency"],
                "tokens_in": r["tokens_in"],
                "tokens_out": r["tokens_out"],
                "cost": r["cost"],
                "success": bool(r["success"]),
                "timestamp": r["timestamp"],
            }
            for r in rows
        ]
        if summary:
            latencies = [r["latency"] for r in rows]
            stats = calculate_spc_stats(latencies)
            return {"logs": logs, "summary": stats}
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {e}")
# >>> LLMscope PATCH: END /api/stats

@app.get("/api/providers")
async def get_providers(_: str = Depends(verify_api_key)):
    with get_db() as conn:
        rows = conn.execute("""
            SELECT provider, COUNT(*) AS count,
                   AVG(latency) AS avg_latency,
                   SUM(cost) AS total_cost
            FROM requests
            WHERE timestamp >= datetime('now', '-24 hours')
            GROUP BY provider
        """).fetchall()

    providers = []
    for r in rows:
        providers.append({
            "name": r["provider"],
            "requests_24h": r["count"],
            "avg_latency": round(r["avg_latency"], 3) if r["avg_latency"] is not None else 0.0,
            "cost_24h": round(r["total_cost"] or 0.0, 6)
        })
    return {"providers": providers}

@app.get("/api/cost/summary")
async def cost_summary(
    days: int = Query(7, ge=1, le=30),
    _: str = Depends(verify_api_key)
):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    with get_db() as conn:
        rows = conn.execute("""
            SELECT DATE(timestamp) AS date, provider,
                   SUM(cost) AS daily_cost,
                   COUNT(*) AS requests,
                   AVG(latency) AS avg_latency
            FROM requests
            WHERE timestamp >= ? AND cost IS NOT NULL
            GROUP BY DATE(timestamp), provider
            ORDER BY date DESC
        """, (cutoff,)).fetchall()

    daily_costs: Dict[str, Any] = {}
    for r in rows:
        date = r["date"]
        if date not in daily_costs:
            daily_costs[date] = {
                "date": date,
                "total_cost": 0.0,
                "requests": 0,
                "providers": {}
            }
        daily_costs[date]["total_cost"] += r["daily_cost"] or 0.0
        daily_costs[date]["requests"] += r["requests"]
        daily_costs[date]["providers"][r["provider"]] = {
            "cost": round(r["daily_cost"] or 0.0, 6),
            "requests": r["requests"],
            "avg_latency": round(r["avg_latency"], 3) if r["avg_latency"] is not None else 0.0
        }

    return {
        "summary": list(daily_costs.values()),
        "total_period_cost": round(sum(d["total_cost"] for d in daily_costs.values()), 6)
    }

@app.post("/api/cleanup")
async def trigger_cleanup(_: str = Depends(verify_api_key)):
    deleted = cleanup_old_data()
    return {"status": "completed", "deleted_records": deleted, "retention_days": DATA_RETENTION_DAYS}

@app.delete("/api/data")
async def delete_all_data(_: str = Depends(verify_api_key)):
    with get_db() as conn:
        cur = conn.execute("DELETE FROM requests")
        return {"status": "deleted", "count": cur.rowcount}

@app.get("/api/export")
async def export_data(
    provider: Optional[str] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    _: str = Depends(verify_api_key)
):
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    with get_db() as conn:
        sql = "SELECT * FROM requests WHERE timestamp >= ?"
        params: List[Any] = [cutoff]
        if provider:
            sql += " AND provider = ?"
            params.append(provider)
        sql += " ORDER BY timestamp DESC"
        rows = conn.execute(sql, params).fetchall()

    data = [dict(r) for r in rows]
    return {
        "export_time": datetime.now(timezone.utc).isoformat(),
        "record_count": len(data),
        "data": data
    }

@app.get("/_routes")
def _routes():
    return [getattr(r, "path", None) for r in app.router.routes]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
