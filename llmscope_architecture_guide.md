# LLMscope - Complete Architecture Guide

## High-Level Overview

LLMscope is a **real-time Statistical Process Control (SPC) monitoring system** for LLM latency and performance.

**Goal:** Detect when an LLM service goes out of control using statistical methods (Nelson Rules), visualize trends, and help diagnose performance issues.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR COMPUTER                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐                                       │
│  │ Ollama (GPU)     │                                       │
│  │ Port 11434       │                                       │
│  └────────┬─────────┘                                       │
│           │                                                  │
│           │ Generates responses                             │
│           ↓                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DOCKER COMPOSE NETWORK                             │  │
│  │  ┌────────────────┐  ┌────────────────────────────┐ │  │
│  │  │    Monitor     │  │       Backend API          │ │  │
│  │  │ (monitor_apis) │→→│  (FastAPI + SQLite)       │ │  │
│  │  │                │  │  Port 8000                │ │  │
│  │  │ - Pings Ollama │  │ - Stores telemetry       │ │  │
│  │  │ - Measures     │  │ - Calculates stats       │ │  │
│  │  │   latency      │  │ - Returns SPC data       │ │  │
│  │  │ - Collects     │  │                          │ │  │
│  │  │   telemetry    │  │  SQLite Database:        │ │  │
│  │  └────────────────┘  │  ./data/llmscope.db     │ │  │
│  │                      │  (telemetry + violations)│ │  │
│  │                      └────────────────────────────┘ │  │
│  │                              ↑                      │  │
│  │                              │                      │  │
│  │  ┌────────────────────────────────────────────┐   │  │
│  │  │    Frontend Web Server (Nginx)             │   │  │
│  │  │    Port 8081                               │   │  │
│  │  │ - Serves React dashboard                   │   │  │
│  │  │ - Port 80 → 8081                           │   │  │
│  │  └────────────────────────────────────────────┘   │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                           ↑                               │
│                           │ HTTP                          │
│                           │                               │
│       ┌───────────────────────────────────────┐          │
│       │                                       │          │
└───────┼───────────────────────────────────────┼──────────┘
        │                                       │
        ↓                                       ↓
   Your Browser                          Your Browser
   (localhost:8081)                      (Viewing Dashboard)
```

---

## Component Breakdown

### 1. **Monitor (`monitor_apis.py`)**

**What it does:** Continuously tests Ollama and sends telemetry to the backend.

**Flow:**
```
Every 2 seconds:
  1. Send test prompt to Ollama
  2. Measure response time (latency)
  3. Collect system metrics (CPU, GPU, Memory)
  4. Parse Ollama response (token counts, durations)
  5. Hash the prompt
  6. POST all data to backend API
```

**Key Data Captured:**
```python
{
    "provider": "ollama",
    "model": "llama3",
    "latency_ms": 2050.5,
    "timestamp": "2025-10-28T12:34:56.789",
    
    # Ollama native metrics (in ms)
    "total_duration_ms": 2050.5,
    "load_duration_ms": 50.2,
    "prompt_eval_duration_ms": 100.3,
    "eval_duration_ms": 1900.0,
    
    # Token counts
    "prompt_eval_count": 26,
    "eval_count": 42,
    
    # System metrics
    "cpu_percent": 35.2,
    "memory_percent": 45.6,
    "gpu_percent": 78.5,
    "gpu_memory_percent": 62.3,
    
    # Prompt tracking
    "prompt_hash": "a1b2c3d4",
    "prompt_text": "Write one sentence..."
}
```

**Docker:** Runs in `llmscope_monitor` container

---

### 2. **Backend API (`app.py`)**

**What it does:** Stores telemetry, calculates stats, and serves data to frontend.

**Key Endpoints:**

#### `POST /api/stats`
Receives telemetry from monitor, stores in database.
```
Request: JSON payload from monitor
Response: {"status": "ok", "logged": true}
```

#### `GET /api/stats/spc`
Returns telemetry for charting with SPC analysis.
```
Query Params:
  - hours (int): Time window (1, 6, 24)
  - provider (str): "ollama"
  - model (str): "llama3", etc.

Response: {
  "timestamps": [...],
  "values": [...],        # latency in seconds
  "models": [...],
  "providers": [...],
  "eval_durations": [...],
  "eval_counts": [...],
  "cpu_percents": [...],
  "gpu_percents": [...],
  ...
}
```

#### `GET /api/system`
Returns current system telemetry (CPU, GPU, Memory).

**Database Schema:**
```sql
telemetry (
    id, provider, model, latency_ms, timestamp,
    total_duration_ms, load_duration_ms,
    prompt_eval_duration_ms, eval_duration_ms,
    prompt_eval_count, eval_count,
    cpu_percent, memory_percent, gpu_percent, gpu_memory_percent,
    prompt_hash, prompt_text
)
```

**Dynamic Limits (based on time window):**
- **1h:** 1800 points (dense, for live streaming)
- **6h:** 10800 points
- **24h:** 43200 points

**Docker:** Runs in `llmscope_api` container on port 8000

---

### 3. **Frontend Dashboard (`Dashboard_ollama_revB.jsx`)**

**What it does:** Real-time visualization of SPC data with violation detection.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ LEFT SIDEBAR (25%)     │   MAIN CONTENT (75%)        │
├───────────────────────┼──────────────────────────────┤
│                       │                              │
│  Title: LLMscope      │  STATS BAR                   │
│                       │  Mean | Std | UCL | LCL      │
│  Status Indicator     │                              │
│  (Live/Historical)    │                              │
│                       │  CHART (60% height)          │
│  Provider Selector    │  ────────────────────        │
│  Model Selector       │  Cyan line (data)            │
│                       │  Red line (UCL)              │
│  Time Windows:        │  Green line (LCL)            │
│  [1h] [6h] [24h]      │  Scrolling in real-time      │
│                       │                              │
│  Stats Panel          │  VIOLATIONS LOG (40% height) │
│  Mean: X.XXs          │  ─────────────────────────   │
│  Std: X.XXs           │  Time | Rule | Latency | σ   │
│  P95: X.XXs           │  [Clickable rows]            │
│  Violations: N        │                              │
│                       │                              │
│  System Panel         │                              │
│  CPU: X%              │                              │
│  GPU: X%              │                              │
│  Mem: X%              │                              │
│                       │                              │
└───────────────────────┴──────────────────────────────┘
```

**Key Features:**

1. **Real-time Chart Updates**
   - Fetches new data every 1 second
   - Shows rolling window of points
   - Y-axis auto-scales to fit data
   - UCL/LCL lines adjust as stats recalculate

2. **Nelson Rules Violation Detection**
   - **R1:** Point beyond 3σ from mean
   - **R2:** 9+ consecutive points on same side
   - **R3:** 6+ points in trend (up or down)
   - Violations logged in table below chart

3. **Interactive Violation Modal**
   - Click any violation row
   - Shows detailed context:
     - Full telemetry snapshot
     - Process statistics at time of violation
     - System metrics (CPU, GPU, Memory)
     - ±10 surrounding points for context

4. **Data Filtering**
   - Filter by time window (1h/6h/24h)
   - Filter by model
   - Filter by provider

**Docker:** Served by `llmscope_web` (Nginx) on port 8081

---

## Data Flow: Complete Journey

### From Ollama → Dashboard

```
1. MONITOR CYCLE (every 2 seconds)
   ├─ Send prompt to Ollama
   ├─ Receive response with metrics
   ├─ Measure total time: 2.050 seconds
   ├─ Collect system metrics: CPU 35%, GPU 78%
   └─ POST to backend

2. BACKEND STORES
   ├─ INSERT into telemetry table
   ├─ Calculate running stats (mean, std dev)
   └─ Ready to serve to frontend

3. FRONTEND FETCHES (every 1 second)
   ├─ GET /api/stats/spc?hours=1
   ├─ Receive last 1800 points in 1-hour window
   ├─ Calculate violations (Nelson Rules)
   ├─ Render chart
   └─ Update violation log

4. USER INTERACTS
   ├─ Clicks violation row
   ├─ Modal opens with details
   ├─ Shows context chart (±10 points)
   └─ Can export violations as CSV
```

---

## Statistics & Control Limits (SPC)

**What we're calculating:**

```
For any dataset:

Mean (μ) = average of all latencies
Std Dev (σ) = spread of latencies

Control Limits:
  UCL = μ + 3σ  (Upper Control Limit - red line)
  LCL = μ - 3σ  (Lower Control Limit - green line)

Violation Rules:
  R1: Any point > UCL or < LCL → out of bounds
  R2: 9+ points all > μ or all < μ → sustained shift
  R3: 6+ points trending up/down → drift detected
```

**Why 3σ?**
- Statistical probability: 99.7% of normal data falls within 3σ
- Only 0.3% chance of false alarm
- Professional standard for manufacturing/quality control

---

## Docker Architecture

**Three containers:**

```
llmscope_api (Backend)
├─ Python 3.11
├─ FastAPI + Uvicorn
├─ SQLite database
└─ Port 8000 (internal)

llmscope_monitor (Monitor)
├─ Python 3.11
├─ Runs monitor_apis.py
├─ Connects to Ollama & API
└─ Runs forever (infinite loop)

llmscope_web (Frontend)
├─ Nginx 1.27
├─ Serves React dashboard
├─ Proxies /api → backend
└─ Port 8081 (user-facing)
```

**Networking:**
- All internal communication via Docker bridge network
- Only port 8081 exposed to host machine
- Backend/Monitor use container DNS: `llmscope_api:8000`

---

## How the "Streaming" Effect Works

**Problem:** You have potentially thousands of data points. How do you show real-time scrolling?

**Solution:** Constant window + high refresh rate

```
1. LIMIT by time window
   1h mode = show last 1 hour of data = ~1800 points

2. FETCH constantly
   Refresh every 1 second to get latest points

3. NEW DATA ARRIVES
   Last N points in time window change
   Old data falls off left, new enters right

4. RECHARTS RE-RENDERS
   React component re-renders on data change
   Chart smoothly shows new line position

Result: Illusion of "streaming" line scrolling
```

---

## Key Metrics You're Tracking

| Metric | Unit | Why It Matters |
|--------|------|---------------|
| **Latency** | seconds | Total time for response (what users experience) |
| **Load Duration** | ms | Time to load model into memory |
| **Prompt Eval** | ms | Time to process your prompt |
| **Eval Duration** | ms | Time to generate response |
| **Tokens/sec** | count/s | Throughput metric |
| **CPU %** | percent | System load |
| **GPU %** | percent | GPU utilization |
| **Std Dev** | seconds | Consistency (lower = more stable) |

---

## Technology Stack

**Backend:**
- FastAPI (lightweight, async Python web framework)
- SQLite (single-file database, no setup needed)
- Uvicorn (ASGI server)

**Frontend:**
- React (UI framework)
- Recharts (charting library)
- Tailwind CSS (styling)
- Vite (build tool)

**DevOps:**
- Docker + Docker Compose (containerization)
- Nginx (reverse proxy + static file serving)

**Monitoring:**
- psutil (system metrics)
- pynvml (NVIDIA GPU metrics)
- aiohttp (async HTTP client)

---

## Common Questions

**Q: What happens if Ollama crashes?**
A: Monitor keeps trying, fails gracefully, logs error. Dashboard shows no new data but old data stays.

**Q: Can I run multiple models?**
A: Yes, change `OLLAMA_MODEL` env var. Dashboard filters by model.

**Q: How much disk space?**
A: ~1MB per 1000 data points. 1 month at 2sec intervals ≈ 1.3GB

**Q: How accurate are the violation detections?**
A: Very accurate. Uses industry-standard Nelson Rules. False positives ~0.3%

**Q: Can I view historical data?**
A: Yes, all data is persisted to SQLite. Switch between 1h/6h/24h views.

---

## Next Steps (Phase 2)

- Display full Ollama telemetry in modal
- Enhance context visualization
- Add mini-charts for incident analysis
- Persist violations to database
- Export violation reports
- Add filtering by violation type

---

Good luck! 🚀
