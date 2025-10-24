# app.py - LLMscope MVP Backend
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
import sqlite3
import asyncio
import time
import os
import json
from contextlib import contextmanager

# Configuration
DATABASE = os.getenv("DATABASE_PATH", "llmscope.db")
API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-key-change-in-production")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DATA_RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", "7"))  # Free tier: 7 days

# FastAPI app
app = FastAPI(title="LLMscope", version="0.1.0")
security = HTTPBearer()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
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
                timestamp TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT,
                latency REAL NOT NULL,
                tokens_in INTEGER,
                tokens_out INTEGER,
                cost REAL,
                success BOOLEAN DEFAULT 1,
                error_message TEXT,
                endpoint TEXT,
                metadata TEXT
            )
        """)
        
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_timestamp ON requests(timestamp)
        """)
        
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_provider ON requests(provider)
        """)

# Pydantic models
class LogEntry(BaseModel):
    provider: str = Field(..., description="AI provider name (openai, anthropic, etc)")
    model: Optional[str] = Field(None, description="Model name")
    latency: float = Field(..., ge=0, description="Response time in seconds")
    tokens_in: Optional[int] = Field(None, ge=0)
    tokens_out: Optional[int] = Field(None, ge=0)
    cost: Optional[float] = Field(None, ge=0)
    success: bool = True
    error_message: Optional[str] = None
    endpoint: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class DataPoint(BaseModel):
    timestamp: str
    latency: float
    cost: Optional[float]
    tokens_total: Optional[int]
    success: bool

class StatsResponse(BaseModel):
    mean: float
    std_dev: float
    p50: float
    p95: float
    p99: float
    min: float
    max: float
    ucl: float  # Upper Control Limit (mean + 3σ)
    lcl: float  # Lower Control Limit (mean - 3σ)
    count: int
    total_cost: float
    error_rate: float

class DataResponse(BaseModel):
    data: List[DataPoint]
    stats: StatsResponse
    violations: List[Dict[str, Any]]

# Authentication
def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return credentials.credentials

# Helper functions
def calculate_spc_stats(latencies: List[float]) -> Dict[str, float]:
    if not latencies:
        return {
            "mean": 0, "std_dev": 0, "p50": 0, "p95": 0, "p99": 0,
            "min": 0, "max": 0, "ucl": 0, "lcl": 0
        }
    
    latencies_sorted = sorted(latencies)
    n = len(latencies_sorted)
    
    mean = sum(latencies) / n
    variance = sum((x - mean) ** 2 for x in latencies) / n
    std_dev = variance ** 0.5
    
    p50 = latencies_sorted[int(n * 0.50)]
    p95 = latencies_sorted[int(n * 0.95)] if n > 1 else latencies_sorted[0]
    p99 = latencies_sorted[int(n * 0.99)] if n > 1 else latencies_sorted[0]
    
    return {
        "mean": round(mean, 4),
        "std_dev": round(std_dev, 4),
        "p50": round(p50, 4),
        "p95": round(p95, 4),
        "p99": round(p99, 4),
        "min": round(min(latencies), 4),
        "max": round(max(latencies), 4),
        "ucl": round(mean + 3 * std_dev, 4),
        "lcl": round(max(0, mean - 3 * std_dev), 4)
    }

def detect_nelson_violations(latencies: List[float], mean: float, std_dev: float) -> List[Dict[str, Any]]:
    violations = []
    if len(latencies) < 2 or std_dev == 0:
        return violations
    
    latest_idx = len(latencies) - 1
    latest = latencies[latest_idx]
    
    # Rule 1: Point beyond 3σ
    if abs(latest - mean) > 3 * std_dev:
        violations.append({
            "rule": 1,
            "severity": "critical",
            "message": f"Latency {latest:.2f}s exceeds 3σ control limits",
            "index": latest_idx
        })
    
    # Rule 2: 9 consecutive points on same side of mean
    if len(latencies) >= 9:
        last_9 = latencies[-9:]
        if all(x > mean for x in last_9) or all(x < mean for x in last_9):
            violations.append({
                "rule": 2,
                "severity": "warning",
                "message": "9 consecutive points on same side of mean",
                "index": latest_idx
            })
    
    # Rule 3: 6 consecutive increasing or decreasing
    if len(latencies) >= 6:
        last_6 = latencies[-6:]
        increasing = all(last_6[i] < last_6[i+1] for i in range(5))
        decreasing = all(last_6[i] > last_6[i+1] for i in range(5))
        if increasing or decreasing:
            violations.append({
                "rule": 3,
                "severity": "warning",
                "message": f"Consistent {'degradation' if increasing else 'improvement'} trend",
                "index": latest_idx
            })
    
    return violations

def cleanup_old_data():
    """Remove data older than retention period"""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=DATA_RETENTION_DAYS)).isoformat()
    with get_db() as conn:
        result = conn.execute("DELETE FROM requests WHERE timestamp < ?", (cutoff,))
        return result.rowcount

# Routes
@app.on_event("startup")
async def startup():
    init_db()
    print(f"✅ LLMscope started - Database: {DATABASE}")
    print(f"📊 Data retention: {DATA_RETENTION_DAYS} days")

@app.get("/health")
async def health():
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) as count FROM requests").fetchone()["count"]
    
    return {
        "status": "healthy",
        "database": DATABASE,
        "total_requests": count,
        "retention_days": DATA_RETENTION_DAYS,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/log")
async def log_request(entry: LogEntry, _: str = Depends(verify_api_key)):
    """Log a new API request"""
    timestamp = datetime.now(timezone.utc).isoformat()
    
    with get_db() as conn:
        conn.execute("""
            INSERT INTO requests (
                timestamp, provider, model, latency, tokens_in, tokens_out,
                cost, success, error_message, endpoint, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            timestamp, entry.provider, entry.model, entry.latency,
            entry.tokens_in, entry.tokens_out, entry.cost,
            entry.success, entry.error_message, entry.endpoint,
            json.dumps(