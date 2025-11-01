"""
LLMscope - LLM Cost Dashboard Backend
A self-hosted dashboard that shows LLM API costs in real-time and recommends cheaper models.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import sqlite3
import os
import datetime
import json

# === CONFIGURATION ==========================================================
DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/llmscope.db")
API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-123")

# ============================================================================

def init_db():
    """Initialize database for cost tracking."""
    os.makedirs(os.path.dirname(DATABASE_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    c = conn.cursor()

    # Cost tracking table
    c.execute("""
        CREATE TABLE IF NOT EXISTS api_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            cost_usd REAL,
            request_id TEXT,
            metadata TEXT
        )
    """)

    # Model pricing table
    c.execute("""
        CREATE TABLE IF NOT EXISTS model_pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            input_cost_per_1k REAL NOT NULL,
            output_cost_per_1k REAL NOT NULL,
            last_updated TEXT NOT NULL,
            UNIQUE(provider, model)
        )
    """)

    # Settings table
    c.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print(f"✓ Database initialized at {DATABASE_PATH}")

def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize FastAPI
app = FastAPI(
    title="LLMscope Cost Dashboard",
    description="Track LLM API costs in real-time and get model recommendations",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "LLMscope Cost Dashboard",
        "version": "1.0.0"
    }

@app.get("/api/usage")
async def get_usage(
    limit: int = 100,
    provider: str = None,
    model: str = None
):
    """Get API usage history."""
    conn = get_db()
    query = "SELECT * FROM api_usage WHERE 1=1"
    params = []

    if provider:
        query += " AND provider = ?"
        params.append(provider)
    if model:
        query += " AND model = ?"
        params.append(model)

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    cursor = conn.execute(query, params)
    usage = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {"usage": usage, "count": len(usage)}

@app.get("/api/costs/summary")
async def get_cost_summary():
    """Get cost summary by provider and model."""
    conn = get_db()

    # Total costs
    cursor = conn.execute("""
        SELECT
            provider,
            model,
            SUM(cost_usd) as total_cost,
            SUM(total_tokens) as total_tokens,
            COUNT(*) as request_count
        FROM api_usage
        GROUP BY provider, model
        ORDER BY total_cost DESC
    """)

    summary = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {"summary": summary}

@app.get("/api/models/pricing")
async def get_model_pricing():
    """Get current model pricing data."""
    conn = get_db()
    cursor = conn.execute("SELECT * FROM model_pricing ORDER BY provider, model")
    pricing = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return {"pricing": pricing, "count": len(pricing)}

@app.post("/api/usage")
async def log_usage(usage: Dict[str, Any]):
    """Log API usage and calculate cost."""
    required_fields = ["provider", "model", "prompt_tokens", "completion_tokens"]
    for field in required_fields:
        if field not in usage:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    conn = get_db()

    # Calculate cost based on pricing data
    cursor = conn.execute(
        "SELECT input_cost_per_1k, output_cost_per_1k FROM model_pricing WHERE provider = ? AND model = ?",
        (usage["provider"], usage["model"])
    )
    pricing = cursor.fetchone()

    cost_usd = 0.0
    if pricing:
        input_cost = (usage["prompt_tokens"] / 1000) * pricing["input_cost_per_1k"]
        output_cost = (usage["completion_tokens"] / 1000) * pricing["output_cost_per_1k"]
        cost_usd = input_cost + output_cost

    # Insert usage record
    conn.execute("""
        INSERT INTO api_usage
        (provider, model, timestamp, prompt_tokens, completion_tokens, total_tokens, cost_usd, request_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        usage["provider"],
        usage["model"],
        usage.get("timestamp", datetime.datetime.utcnow().isoformat()),
        usage["prompt_tokens"],
        usage["completion_tokens"],
        usage["prompt_tokens"] + usage["completion_tokens"],
        cost_usd,
        usage.get("request_id"),
        json.dumps(usage.get("metadata", {}))
    ))

    conn.commit()
    conn.close()

    return {"status": "logged", "cost_usd": cost_usd}

@app.get("/api/recommendations")
async def get_recommendations(current_model: str = None):
    """Get cheaper model recommendations."""
    conn = get_db()

    # Get all models with pricing
    cursor = conn.execute("""
        SELECT provider, model, input_cost_per_1k, output_cost_per_1k
        FROM model_pricing
        ORDER BY (input_cost_per_1k + output_cost_per_1k) ASC
    """)

    models = [dict(row) for row in cursor.fetchall()]
    conn.close()

    recommendations = []
    for model in models[:5]:  # Top 5 cheapest
        avg_cost = (model["input_cost_per_1k"] + model["output_cost_per_1k"]) / 2
        recommendations.append({
            **model,
            "avg_cost_per_1k": avg_cost,
            "reason": "Low cost per token"
        })

    return {"recommendations": recommendations}

# ============================================================================
# SETTINGS ENDPOINTS
# ============================================================================

@app.get("/api/settings")
async def get_settings():
    """Get all settings."""
    conn = get_db()
    cursor = conn.execute("SELECT key, value FROM settings")
    settings = {row["key"]: json.loads(row["value"]) for row in cursor.fetchall()}
    conn.close()
    return settings

@app.post("/api/settings")
async def update_settings(settings: Dict[str, Any]):
    """Update settings."""
    conn = get_db()
    for key, value in settings.items():
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
            (key, json.dumps(value), datetime.datetime.utcnow().isoformat())
        )
    conn.commit()
    conn.close()
    return {"status": "updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
