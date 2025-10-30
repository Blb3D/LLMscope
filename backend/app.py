"""
LLMscope FastAPI Backend – Phase 2
Enhanced with violations, alerts, models, and settings management
"""

from fastapi import FastAPI, Depends, Header, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any, List
import sqlite3
import psutil
import platform
import datetime
import os
import json
from io import StringIO
import csv
import math
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiohttp
import asyncio

# === CONFIGURATION ==========================================================
DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/llmscope.db")
LLMSCOPE_API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-123")

# Ollama Config (for AI Copilot)
DEFAULT_OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

# Email Config (can be overridden by database settings)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ALERT_EMAIL_FROM = os.getenv("ALERT_EMAIL_FROM", SMTP_USER)
ALERT_EMAIL_TO = os.getenv("ALERT_EMAIL_TO", "").split(",") if os.getenv("ALERT_EMAIL_TO") else []

# Slack Config (can be overridden by database settings)
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")

# ============================================================================

def init_db():
    """Initialize database with all Phase 2 tables."""
    os.makedirs(os.path.dirname(DATABASE_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()
    
    # Telemetry table (Phase 1)
    c.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT,
            model TEXT,
            latency_ms REAL,
            timestamp TEXT,
            total_duration_ms REAL,
            load_duration_ms REAL,
            prompt_eval_duration_ms REAL,
            eval_duration_ms REAL,
            prompt_eval_count INTEGER,
            eval_count INTEGER,
            cpu_percent REAL,
            memory_percent REAL,
            gpu_percent REAL,
            gpu_memory_percent REAL,
            prompt_hash TEXT,
            prompt_text TEXT
        )
    """)
    
    # Violations table (Phase 2)
    c.execute("""
        CREATE TABLE IF NOT EXISTS violations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telemetry_id INTEGER NOT NULL,
            provider TEXT,
            model TEXT,
            rule TEXT,
            timestamp TEXT,
            latency_ms REAL,
            deviation_sigma REAL,
            mean_ms REAL,
            std_ms REAL,
            ucl_ms REAL,
            lcl_ms REAL,
            cpu_percent REAL,
            memory_percent REAL,
            gpu_percent REAL,
            gpu_memory_percent REAL,
            is_acknowledged BOOLEAN DEFAULT 0,
            acknowledged_at TEXT,
            acknowledged_by TEXT,
            resolved_at TEXT,
            alert_sent BOOLEAN DEFAULT 0,
            email_sent BOOLEAN DEFAULT 0,
            slack_sent BOOLEAN DEFAULT 0,
            context_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(telemetry_id) REFERENCES telemetry(id)
        )
    """)
    
    # Models table (Phase 2)
    c.execute("""
        CREATE TABLE IF NOT EXISTS models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT,
            model_name TEXT UNIQUE,
            display_name TEXT,
            is_active BOOLEAN DEFAULT 1,
            config TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Settings table (Phase 2)
    c.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE,
            value TEXT,
            type TEXT,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Alert logs (Phase 2)
    c.execute("""
        CREATE TABLE IF NOT EXISTS alert_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            violation_id INTEGER,
            alert_type TEXT,
            recipient TEXT,
            status TEXT,
            message TEXT,
            sent_at TEXT,
            FOREIGN KEY(violation_id) REFERENCES violations(id)
        )
    """)
    
    # AI explanations table (Phase 2.5 - Copilot)
    c.execute("""
        CREATE TABLE IF NOT EXISTS ai_explanations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            violation_id INTEGER NOT NULL,
            explanation_type TEXT NOT NULL,
            prompt_template TEXT,
            raw_response TEXT,
            processed_explanation TEXT,
            confidence_score REAL,
            model_used TEXT,
            generation_time_ms INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(violation_id) REFERENCES violations(id)
        )
    """)
    
    # Create indexes for performance
    c.execute("CREATE INDEX IF NOT EXISTS idx_ai_explanations_violation ON ai_explanations(violation_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_ai_explanations_type ON ai_explanations(explanation_type)")
    
    # Insert default copilot settings
    default_copilot_settings = [
        ("copilot_enabled", "true", "boolean", "Enable AI copilot explanations"),
        ("copilot_ollama_url", "http://localhost:11434", "text", "Ollama API endpoint"),
        ("copilot_model", "llama3.2:3b", "text", "Model for explanations"),
        ("copilot_auto_explain", "false", "boolean", "Auto-generate explanations for new violations"),
    ]
    
    for key, value, type_val, desc in default_copilot_settings:
        c.execute(
            "INSERT OR IGNORE INTO settings (key, value, type, description) VALUES (?, ?, ?, ?)",
            (key, value, type_val, desc)
        )
    
    conn.commit()
    
    # Initialize default settings if empty
    c.execute("SELECT COUNT(*) FROM settings")
    if c.fetchone()[0] == 0:
        defaults = [
            ("enable_email_alerts", "true", "boolean", "Send email alerts on violations"),
            ("enable_slack_alerts", "true", "boolean", "Send Slack alerts on violations"),
            ("alert_on_rule", "R1,R2,R3", "string", "Comma-separated rules to alert on"),
            ("violation_threshold_sigma", "3", "int", "Sigma threshold for violations"),
        ]
        for key, value, type_, desc in defaults:
            c.execute(
                "INSERT OR IGNORE INTO settings (key, value, type, description) VALUES (?, ?, ?, ?)",
                (key, value, type_, desc)
            )
        conn.commit()
    
    conn.close()

init_db()

# === APP SETUP ==============================================================
app = FastAPI(title="LLMscope API", version="2.0.0")

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

# === UTILITIES ==============================================================
def get_current_settings(conn) -> Dict[str, Any]:
    """Fetch all settings from database."""
    c = conn.cursor()
    c.execute("SELECT key, value, type FROM settings")
    rows = c.fetchall()
    settings = {}
    for key, value, type_ in rows:
        if type_ == "boolean":
            settings[key] = value.lower() == "true"
        elif type_ == "int":
            settings[key] = int(value)
        else:
            settings[key] = value
    return settings

def calculate_stats(conn, provider: str, model: str, hours: int = 1) -> Dict[str, float]:
    """Calculate mean, std, UCL, LCL for a provider/model combo."""
    c = conn.cursor()
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(hours=hours)).isoformat()
    c.execute(
        "SELECT latency_ms FROM telemetry WHERE provider = ? AND model = ? AND timestamp >= ? ORDER BY timestamp",
        (provider, model, cutoff)
    )
    rows = c.fetchall()
    values = [r[0] for r in rows]
    
    if len(values) == 0:
        return {"mean": 0, "std": 0, "ucl": 0, "lcl": 0, "count": 0}
    
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std = math.sqrt(variance)
    ucl = mean + 3 * std
    lcl = max(0, mean - 3 * std)
    
    return {"mean": mean, "std": std, "ucl": ucl, "lcl": lcl, "count": len(values)}

def detect_nelson_violations(conn, provider: str, model: str, current_value: float, stats: Dict) -> List[str]:
    """Detect which Nelson Rules are violated for current telemetry point."""
    violations = []
    mean = stats.get("mean", 0)
    std = stats.get("std", 0.001)
    ucl = stats.get("ucl", 0)
    lcl = stats.get("lcl", 0)
    
    # R1: Point beyond 3σ
    if current_value > ucl or current_value < lcl:
        violations.append("R1")
    
    # R2: 9+ consecutive points on same side
    c = conn.cursor()
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(hours=1)).isoformat()
    c.execute(
        "SELECT latency_ms FROM telemetry WHERE provider = ? AND model = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT 9",
        (provider, model, cutoff)
    )
    last_9 = [r[0] for r in c.fetchall()]
    if len(last_9) >= 9:
        last_9.reverse()
        if all(v > mean for v in last_9) or all(v < mean for v in last_9):
            violations.append("R2")
    
    # R3: 6+ points in trend
    c.execute(
        "SELECT latency_ms FROM telemetry WHERE provider = ? AND model = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT 6",
        (provider, model, cutoff)
    )
    last_6 = [r[0] for r in c.fetchall()]
    if len(last_6) >= 6:
        last_6.reverse()
        increasing = all(last_6[i] >= last_6[i-1] for i in range(1, len(last_6)))
        decreasing = all(last_6[i] <= last_6[i-1] for i in range(1, len(last_6)))
        if (increasing or decreasing) and last_6[0] != last_6[-1]:
            violations.append("R3")
    
    return violations

async def send_email_alert(violation_id: int, violation_data: Dict):
    """Send email alert for violation."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        settings = get_current_settings(conn)
        conn.close()
        
        smtp_user = settings.get("smtp_user") or SMTP_USER
        smtp_password = settings.get("smtp_password") or SMTP_PASSWORD
        smtp_server = settings.get("smtp_server") or SMTP_SERVER
        smtp_port = int(settings.get("smtp_port") or SMTP_PORT)
        alert_email_from = settings.get("alert_email_from") or ALERT_EMAIL_FROM
        alert_email_to = settings.get("alert_email_to", "").split(",") if settings.get("alert_email_to") else ALERT_EMAIL_TO
        
        if not smtp_user or not alert_email_to or not alert_email_to[0]:
            return False
        
        subject = f"🚨 LLMscope Violation Alert: {violation_data['rule']} on {violation_data['model']}"
        body = f"""
LLMscope Violation Alert

Rule: {violation_data['rule']}
Model: {violation_data['model']}
Timestamp: {violation_data['timestamp']}
Latency: {violation_data['latency_ms']:.2f}ms
Deviation: {violation_data['deviation_sigma']:.2f}σ

Process Statistics:
- Mean: {violation_data['mean_ms']:.2f}ms
- Std Dev: {violation_data['std_ms']:.2f}ms
- UCL: {violation_data['ucl_ms']:.2f}ms
- LCL: {violation_data['lcl_ms']:.2f}ms

System Metrics:
- CPU: {violation_data['cpu_percent']:.1f}%
- GPU: {violation_data['gpu_percent']:.1f}%
- Memory: {violation_data['memory_percent']:.1f}%

View full details: https://your-dashboard/violations/{violation_id}
        """
        
        msg = MIMEMultipart()
        msg["From"] = alert_email_from or smtp_user
        msg["To"] = ", ".join([e.strip() for e in alert_email_to if e.strip()])
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"[Email Alert] Error: {e}")
        return False

async def send_slack_alert(violation_id: int, violation_data: Dict):
    """Send Slack webhook alert for violation."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        settings = get_current_settings(conn)
        conn.close()
        
        slack_webhook_url = settings.get("slack_webhook_url") or SLACK_WEBHOOK_URL
        if not slack_webhook_url:
            return False
        
        color = "#FF0000" if violation_data['rule'] == 'R1' else "#FFA500" if violation_data['rule'] == 'R2' else "#0099FF"
        
        payload = {
            "attachments": [
                {
                    "color": color,
                    "title": f"🚨 {violation_data['rule']} Violation",
                    "title_link": f"https://your-dashboard/violations/{violation_id}",
                    "fields": [
                        {"title": "Model", "value": violation_data['model'], "short": True},
                        {"title": "Provider", "value": violation_data['provider'], "short": True},
                        {"title": "Latency", "value": f"{violation_data['latency_ms']:.2f}ms", "short": True},
                        {"title": "Deviation", "value": f"{violation_data['deviation_sigma']:.2f}σ", "short": True},
                        {"title": "Mean", "value": f"{violation_data['mean_ms']:.2f}ms", "short": True},
                        {"title": "Std Dev", "value": f"{violation_data['std_ms']:.2f}ms", "short": True},
                    ],
                    "footer": "LLMscope Monitoring",
                    "ts": int(datetime.datetime.utcnow().timestamp())
                }
            ]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(slack_webhook_url, json=payload, timeout=5) as resp:
                return resp.status == 200
    except Exception as e:
        print(f"[Slack Alert] Error: {e}")
        return False

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
            except Exception:
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

# === LOGGING ENDPOINT (WITH VIOLATION DETECTION) ==========================
@app.post("/api/stats")
async def post_stats(
    payload: Dict[str, Any] = Body(...),
    _: bool = Depends(verify_api_key),
):
    """Log telemetry and detect violations server-side."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        
        provider = payload.get("provider", "unknown")
        model = payload.get("model", "unknown")
        latency_ms = payload.get("latency_ms", 0.0)
        
        # Insert telemetry
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
            provider,
            model,
            latency_ms,
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
        telemetry_id = c.lastrowid
        
        # Calculate stats for this provider/model
        stats = calculate_stats(conn, provider, model, hours=24)
        
        # Detect violations
        detected_rules = detect_nelson_violations(conn, provider, model, latency_ms, stats)
        
        # Get settings
        settings = get_current_settings(conn)
        alert_rules = set(settings.get("alert_on_rule", "R1,R2,R3").split(","))
        
        # For each violation, create record and send alerts
        for rule in detected_rules:
            if rule not in alert_rules:
                continue
            
            deviation = (latency_ms - stats["mean"]) / max(stats["std"], 0.001)
            
            violation_data = {
                "provider": provider,
                "model": model,
                "rule": rule,
                "timestamp": payload.get("timestamp", datetime.datetime.utcnow().isoformat()),
                "latency_ms": latency_ms,
                "deviation_sigma": deviation,
                "mean_ms": stats["mean"],
                "std_ms": stats["std"],
                "ucl_ms": stats["ucl"],
                "lcl_ms": stats["lcl"],
                "cpu_percent": payload.get("cpu_percent", 0.0),
                "memory_percent": payload.get("memory_percent", 0.0),
                "gpu_percent": payload.get("gpu_percent", 0.0),
                "gpu_memory_percent": payload.get("gpu_memory_percent", 0.0),
            }
            
            # Insert violation with frozen stats
            c.execute("""
                INSERT INTO violations (
                    telemetry_id, provider, model, rule, timestamp,
                    latency_ms, deviation_sigma,
                    mean_ms, std_ms, ucl_ms, lcl_ms,
                    cpu_percent, memory_percent, gpu_percent, gpu_memory_percent
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                telemetry_id,
                violation_data["provider"],
                violation_data["model"],
                violation_data["rule"],
                violation_data["timestamp"],
                violation_data["latency_ms"],
                violation_data["deviation_sigma"],
                violation_data["mean_ms"],
                violation_data["std_ms"],
                violation_data["ucl_ms"],
                violation_data["lcl_ms"],
                violation_data["cpu_percent"],
                violation_data["memory_percent"],
                violation_data["gpu_percent"],
                violation_data["gpu_memory_percent"],
            ))
            conn.commit()
            violation_id = c.lastrowid
            
            # Send alerts asynchronously (don't block response)
            if settings.get("enable_email_alerts"):
                asyncio.create_task(send_email_alert(violation_id, violation_data))
            if settings.get("enable_slack_alerts"):
                asyncio.create_task(send_slack_alert(violation_id, violation_data))
            
            print(f"[Violation] {rule} detected on {model}: {latency_ms:.2f}ms ({deviation:.2f}σ)")
        
        conn.close()
        return {"status": "ok", "logged": True, "violations_detected": len(detected_rules)}
    except Exception as e:
        print(f"[Post Stats Error] {e}")
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
        
        if limit is None:
            if hours <= 1:
                limit = 1800
            elif hours <= 6:
                limit = 10800
            else:
                limit = 43200
        else:
            limit = min(limit, 50000)
        
        now = datetime.datetime.utcnow()
        cutoff = now - datetime.timedelta(hours=hours)
        cutoff_str = cutoff.isoformat()
        
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
        
        rows = list(reversed(rows))

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

# === VIOLATIONS MANAGEMENT ==================================================
@app.get("/api/violations")
async def get_violations(
    model: Optional[str] = Query(None),
    rule: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    _: bool = Depends(verify_api_key),
) -> List[Dict[str, Any]]:
    """Get violations with optional filtering."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        query = "SELECT * FROM violations WHERE 1=1"
        params = []
        
        if model:
            query += " AND model = ?"
            params.append(model)
        
        if rule:
            query += " AND rule = ?"
            params.append(rule)
        
        if acknowledged is not None:
            query += " AND is_acknowledged = ?"
            params.append(1 if acknowledged else 0)
        
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        c.execute(query, params)
        rows = c.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/violations/{violation_id}")
async def get_violation(violation_id: int, _: bool = Depends(verify_api_key)):
    """Get single violation details with frozen stats."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM violations WHERE id = ?", (violation_id,))
        row = c.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Violation not found")
        
        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/violations/{violation_id}/acknowledge")
async def acknowledge_violation(
    violation_id: int,
    data: Dict[str, str] = Body(...),
    _: bool = Depends(verify_api_key)
):
    """Mark violation as acknowledged."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute(
            "UPDATE violations SET is_acknowledged = 1, acknowledged_at = ?, acknowledged_by = ? WHERE id = ?",
            (datetime.datetime.utcnow().isoformat(), data.get("acknowledged_by", "unknown"), violation_id)
        )
        conn.commit()
        conn.close()
        return {"status": "ok", "acknowledged": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/violations/{violation_id}/resolve")
async def resolve_violation(violation_id: int, _: bool = Depends(verify_api_key)):
    """Mark violation as resolved."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute(
            "UPDATE violations SET resolved_at = ? WHERE id = ?",
            (datetime.datetime.utcnow().isoformat(), violation_id)
        )
        conn.commit()
        conn.close()
        return {"status": "ok", "resolved": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === MODELS MANAGEMENT ======================================================
@app.get("/api/models")
async def get_models(_: bool = Depends(verify_api_key)) -> List[Dict[str, Any]]:
    """Get all configured models."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM models WHERE is_active = 1 ORDER BY provider, model_name")
        rows = c.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/models")
async def create_model(
    model: Dict[str, Any] = Body(...),
    _: bool = Depends(verify_api_key),
):
    """Create new model configuration."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute("""
            INSERT INTO models (provider, model_name, display_name, is_active, config, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            model.get("provider"),
            model.get("model_name"),
            model.get("display_name", model.get("model_name")),
            model.get("is_active", True),
            json.dumps(model.get("config", {})),
            datetime.datetime.utcnow().isoformat(),
            datetime.datetime.utcnow().isoformat(),
        ))
        conn.commit()
        model_id = c.lastrowid
        conn.close()
        return {"status": "ok", "id": model_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/models/{model_id}")
async def update_model(
    model_id: int,
    model: Dict[str, Any] = Body(...),
    _: bool = Depends(verify_api_key),
):
    """Update model configuration."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute("""
            UPDATE models SET display_name = ?, is_active = ?, config = ?, updated_at = ?
            WHERE id = ?
        """, (
            model.get("display_name"),
            model.get("is_active", True),
            json.dumps(model.get("config", {})),
            datetime.datetime.utcnow().isoformat(),
            model_id,
        ))
        conn.commit()
        conn.close()
        return {"status": "ok", "updated": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === SETTINGS MANAGEMENT ====================================================
@app.get("/api/settings")
async def get_settings(_: bool = Depends(verify_api_key)) -> Dict[str, Any]:
    """Get all settings."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        settings = get_current_settings(conn)
        conn.close()
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/settings/{key}")
async def update_setting(
    key: str,
    value: Dict[str, Any] = Body(...),
    _: bool = Depends(verify_api_key),
):
    """Update a setting."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        c.execute(
            "UPDATE settings SET value = ?, updated_at = ? WHERE key = ?",
            (str(value.get("value")), datetime.datetime.utcnow().isoformat(), key)
        )
        conn.commit()
        conn.close()
        return {"status": "ok", "key": key, "value": value.get("value")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === EXPORT (PHASE 2) =======================================================
@app.get("/api/export/violations")
async def export_violations_csv(
    model: Optional[str] = Query(None),
    rule: Optional[str] = Query(None),
    _: bool = Depends(verify_api_key),
):
    """Export violations as CSV."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        
        query = "SELECT * FROM violations WHERE 1=1"
        params = []
        
        if model:
            query += " AND model = ?"
            params.append(model)
        
        if rule:
            query += " AND rule = ?"
            params.append(rule)
        
        query += " ORDER BY timestamp DESC"
        
        c.execute(query, params)
        rows = c.fetchall()
        conn.close()
        
        output = StringIO()
        if rows:
            writer = csv.writer(output)
            headers = [desc[0] for desc in c.description]
            writer.writerow(headers)
            writer.writerows(rows)
        
        return {
            "status": "ok",
            "csv": output.getvalue(),
            "count": len(rows)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === AI COPILOT ENDPOINTS ==================================================
try:
    from copilot_service import CopilotService
    COPILOT_AVAILABLE = True
except ImportError:
    COPILOT_AVAILABLE = False
    print("[Warning] Copilot service not available. Install aiohttp: pip install aiohttp")

@app.get("/api/copilot/test")
async def copilot_test(_: bool = Depends(verify_api_key)):
    """Test Ollama connection and model availability."""
    if not COPILOT_AVAILABLE:
        return {"success": False, "error": "Copilot service not available"}
    
    settings = get_current_settings(sqlite3.connect(DATABASE_PATH))
    ollama_url = settings.get("copilot_ollama_url", DEFAULT_OLLAMA_URL)
    model = settings.get("copilot_model", "llama3.2:3b")
    
    async with CopilotService(ollama_url, model) as copilot:
        return await copilot.test_connection()

@app.get("/api/copilot/model-updates")
async def copilot_model_updates(_: bool = Depends(verify_api_key)):
    """Check for newer model versions and recommendations."""
    if not COPILOT_AVAILABLE:
        return {"success": False, "error": "Copilot service not available"}
    
    settings = get_current_settings(sqlite3.connect(DATABASE_PATH))
    ollama_url = settings.get("copilot_ollama_url", DEFAULT_OLLAMA_URL)
    model = settings.get("copilot_model", "llama3.2:3b")
    
    async with CopilotService(ollama_url, model) as copilot:
        return await copilot.check_model_updates()

@app.get("/api/copilot/validate")
async def validate_copilot_model(_: bool = Depends(verify_api_key)):
    """Validate current model for appropriate SPC monitoring behavior."""
    if not COPILOT_AVAILABLE:
        return {"success": False, "error": "Copilot service not available"}
    
    try:
        from model_validator import ModelValidator
        
        settings = get_current_settings(sqlite3.connect(DATABASE_PATH))
        ollama_url = settings.get("copilot_ollama_url", DEFAULT_OLLAMA_URL)
        model = settings.get("copilot_model", "llama3.2:3b")
        
        validator = ModelValidator(ollama_url)
        result = await validator.validate_model(model)
        
        return {
            "success": True,
            "validation_result": result,
            "recommendation": {
                "safe_for_production": result["safe_for_production"],
                "overall_score": result["score"],
                "status": result["overall_status"],
                "message": result["recommendation"]
            }
        }
        
    except ImportError:
        return {
            "success": False, 
            "error": "Model validation service not available"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Validation failed: {str(e)}"
        }

@app.get("/api/copilot/validate-all")
async def validate_all_recommended_models(_: bool = Depends(verify_api_key)):
    """Validate all recommended models for LLMscope deployment."""
    if not COPILOT_AVAILABLE:
        return {"success": False, "error": "Copilot service not available"}
    
    try:
        from model_validator import ModelValidator
        
        settings = get_current_settings(sqlite3.connect(DATABASE_PATH))
        ollama_url = settings.get("copilot_ollama_url", DEFAULT_OLLAMA_URL)
        
        validator = ModelValidator(ollama_url)
        results = await validator.validate_recommended_models()
        
        return {
            "success": True,
            "validation_results": results,
            "summary": {
                "total_models_tested": len(results["validation_summary"]),
                "safe_for_production": len(results["recommended_for_production"]),
                "models_to_avoid": len(results["models_to_avoid"]),
                "best_model": results["best_model"]
            }
        }
        
    except ImportError:
        return {
            "success": False, 
            "error": "Model validation service not available"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Validation failed: {str(e)}"
        }

@app.post("/api/violations/{violation_id}/explain")
async def explain_violation(
    violation_id: int,
    explanation_type: str = Query("technical", regex="^(technical|business|remediation)$"),
    _: bool = Depends(verify_api_key)
):
    """Generate AI explanation for violation using Ollama."""
    print(f"[DEBUG] Explain endpoint called: violation_id={violation_id}, type={explanation_type}")
    
    if not COPILOT_AVAILABLE:
        print("[DEBUG] Copilot not available")
        raise HTTPException(status_code=503, detail="AI copilot not available")
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Get violation data
        c.execute("SELECT * FROM violations WHERE id = ?", (violation_id,))
        violation_row = c.fetchone()
        
        if not violation_row:
            raise HTTPException(status_code=404, detail="Violation not found")
        
        violation_data = dict(violation_row)
        
        # Check if explanation already exists
        c.execute("""
            SELECT processed_explanation, confidence_score, model_used, generation_time_ms 
            FROM ai_explanations 
            WHERE violation_id = ? AND explanation_type = ?
        """, (violation_id, explanation_type))
        existing = c.fetchone()
        
        if existing:
            return {
                "explanation": existing[0],
                "confidence": existing[1],
                "model": existing[2],
                "generation_time_ms": existing[3],
                "cached": True
            }
        
        # Get copilot settings
        settings = get_current_settings(conn)
        if not settings.get("copilot_enabled", True):
            raise HTTPException(status_code=503, detail="AI copilot disabled in settings")
        
        ollama_url = settings.get("copilot_ollama_url", DEFAULT_OLLAMA_URL)
        model = settings.get("copilot_model", "llama3.2:3b")
        
        # Generate explanation
        async with CopilotService(ollama_url, model) as copilot:
            result = await copilot.explain_violation(violation_data, explanation_type)
        
        if result["success"]:
            # Store explanation in database
            c.execute("""
                INSERT INTO ai_explanations 
                (violation_id, explanation_type, raw_response, processed_explanation, 
                 confidence_score, model_used, generation_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                violation_id, 
                explanation_type,
                result["explanation"],
                result["explanation"],
                result["confidence_score"],
                result["model_used"],
                result["generation_time_ms"]
            ))
            conn.commit()
            
            return {
                "explanation": result["explanation"],
                "confidence": result["confidence_score"],
                "model": result["model_used"],
                "generation_time_ms": result["generation_time_ms"],
                "cached": False
            }
        else:
            raise HTTPException(
                status_code=503, 
                detail=f"AI explanation failed: {result.get('error', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'conn' in locals():
            conn.close()

@app.get("/api/copilot/settings")
async def get_copilot_settings(_: bool = Depends(verify_api_key)):
    """Get current copilot configuration."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        settings = get_current_settings(conn)
        conn.close()
        
        return {
            "enabled": settings.get("copilot_enabled", True),
            "ollama_url": settings.get("copilot_ollama_url", "http://localhost:11434"),
            "model": settings.get("copilot_model", "llama3.2:3b"),
            "auto_explain": settings.get("copilot_auto_explain", False)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/copilot/settings")
async def update_copilot_settings(
    settings_data: Dict[str, Any] = Body(...),
    _: bool = Depends(verify_api_key)
):
    """Update copilot configuration."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        c = conn.cursor()
        
        # Update allowed settings
        allowed_keys = ["copilot_enabled", "copilot_ollama_url", "copilot_model", "copilot_auto_explain"]
        
        for key in allowed_keys:
            if key in settings_data:
                value = str(settings_data[key]).lower() if isinstance(settings_data[key], bool) else str(settings_data[key])
                c.execute(
                    "INSERT OR REPLACE INTO settings (key, value, type) VALUES (?, ?, ?)",
                    (key, value, "boolean" if isinstance(settings_data[key], bool) else "text")
                )
        
        conn.commit()
        conn.close()
        return {"status": "ok", "updated": list(settings_data.keys())}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# === RUN APP ================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)