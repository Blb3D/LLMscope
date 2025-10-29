# LLMscope - Technical Scope & Specifications

**Version:** 0.2.0  
**Last Updated:** October 29, 2024  
**Status:** Production-Ready

---

## 1. Executive Summary

**LLMscope** is a self-hosted Statistical Process Control (SPC) monitoring system for LLM latency and performance. It applies industrial quality control methodology (Nelson Rules) to detect when an LLM service degrades, providing engineers with real-time visibility and diagnostic context.

**Core Value Proposition:**
- Replace naive threshold alerts with **statistical anomaly detection**
- Keep all performance data on **your infrastructure** (privacy-first)
- Detect performance issues **before they impact users**

---

## 2. System Architecture

### 2.1 High-Level Design

```
┌─────────────────────────────────────────────────────────┐
│                  Docker Compose Network                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐    ┌────────────────────────────┐  │
│  │   Monitor      │───▶│   Backend (FastAPI)        │  │
│  │   Container    │    │   - SQLite storage         │  │
│  │                │    │   - SPC calculations       │  │
│  │ - Tests LLM    │    │   - Nelson Rules engine    │  │
│  │ - Measures     │    │   - /api/stats endpoints   │  │
│  │   latency      │    │   Port: 8000 (internal)    │  │
│  │ - Collects     │    │                            │  │
│  │   telemetry    │    └────────────────────────────┘  │
│  └────────────────┘                 ▲                   │
│         │                           │                   │
│         │                    ┌──────┴──────────────┐   │
│         │                    │   Frontend (Nginx)  │   │
│         │                    │   - React SPA       │   │
│         │                    │   - Recharts        │   │
│         ▼                    │   - Tailwind CSS    │   │
│  ┌────────────────┐         │   Port: 8081 (host) │   │
│  │  Ollama / LLM  │         └─────────────────────┘   │
│  │  External API  │                                    │
│  └────────────────┘                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Purpose | Technology | Exposed Port |
|-----------|---------|------------|--------------|
| **Monitor** | Test LLM provider, measure latency, POST to backend | Python 3.11 + aiohttp | None |
| **Backend** | Store telemetry, calculate SPC stats, serve API | FastAPI + SQLite | 8000 (internal) |
| **Frontend** | Visualize data, display violations, export CSV | React + Recharts | 8081 (host) |
| **Nginx** | Reverse proxy `/api` to backend, serve static files | Nginx 1.27 | 80 (container) |

---

## 3. Data Model

### 3.1 Telemetry Schema (SQLite)

**Table:** `telemetry`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment |
| `provider` | TEXT | "ollama", "openai", "anthropic" |
| `model` | TEXT | Model name (e.g., "llama3") |
| `latency_ms` | REAL | Total response time in milliseconds |
| `timestamp` | TEXT | ISO 8601 format (UTC) |
| `total_duration_ms` | REAL | Ollama: Total duration (ns → ms) |
| `load_duration_ms` | REAL | Ollama: Model load time (ns → ms) |
| `prompt_eval_duration_ms` | REAL | Ollama: Prompt processing (ns → ms) |
| `eval_duration_ms` | REAL | Ollama: Token generation (ns → ms) |
| `prompt_eval_count` | INTEGER | Number of prompt tokens |
| `eval_count` | INTEGER | Number of generated tokens |
| `cpu_percent` | REAL | CPU utilization (0-100%) |
| `memory_percent` | REAL | Memory utilization (0-100%) |
| `gpu_percent` | REAL | GPU utilization (0-100%) |
| `gpu_memory_percent` | REAL | GPU memory utilization (0-100%) |
| `prompt_hash` | TEXT | SHA-256 hash (first 8 chars) |
| `prompt_text` | TEXT | Full prompt (optional, for debugging) |

**Indexes:**
- `timestamp` (DESC) - For time-range queries
- `model` - For filtering by model

### 3.2 Violations Schema (Phase 2)

**Table:** `violations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Auto-increment |
| `timestamp` | TEXT | ISO 8601 format (UTC) |
| `rule` | TEXT | "R1", "R2", "R3", etc. |
| `model` | TEXT | Model name |
| `provider` | TEXT | Provider name |
| `latency_ms` | REAL | Latency at violation time |
| `deviation_sigma` | REAL | Standard deviations from mean |
| `mean_at_time` | REAL | Process mean (ms) |
| `std_at_time` | REAL | Process std dev (ms) |
| `ucl_at_time` | REAL | UCL at violation (ms) |
| `lcl_at_time` | REAL | LCL at violation (ms) |
| `cpu_percent` | REAL | CPU at violation time |
| `gpu_percent` | REAL | GPU at violation time |
| `is_acknowledged` | BOOLEAN | User acknowledged? |
| `resolved_at` | TEXT | Resolution timestamp |

---

## 4. API Specification

### 4.1 Authentication

All endpoints require `Authorization: Bearer <LLMSCOPE_API_KEY>` header.

**Default:** `dev-123` (change in production)

### 4.2 Core Endpoints

#### POST `/api/stats`
**Purpose:** Log telemetry from monitor  
**Request Body:**
```json
{
  "provider": "ollama",
  "model": "llama3",
  "latency_ms": 2050.5,
  "timestamp": "2025-10-29T12:34:56.789Z",
  "total_duration_ms": 2050.5,
  "load_duration_ms": 50.2,
  "prompt_eval_duration_ms": 100.3,
  "eval_duration_ms": 1900.0,
  "prompt_eval_count": 26,
  "eval_count": 42,
  "cpu_percent": 35.2,
  "memory_percent": 45.6,
  "gpu_percent": 78.5,
  "gpu_memory_percent": 62.3,
  "prompt_hash": "a1b2c3d4",
  "prompt_text": "Write one sentence..."
}
```

**Response:**
```json
{
  "status": "ok",
  "logged": true
}
```

#### GET `/api/stats/spc`
**Purpose:** Get telemetry for charting  
**Query Params:**
- `hours` (int, default: 24) - Time window
- `provider` (str, optional) - Filter by provider
- `model` (str, optional) - Filter by model
- `limit` (int, optional) - Max rows (auto-calculated if omitted)

**Response:**
```json
{
  "timestamps": ["2025-10-29T12:34:56.789Z", ...],
  "values": [2.050, 2.100, ...],
  "models": ["llama3", "llama3", ...],
  "providers": ["ollama", "ollama", ...],
  "total_durations": [2050.5, ...],
  "eval_durations": [1900.0, ...],
  "prompt_counts": [26, ...],
  "eval_counts": [42, ...],
  "cpu_percents": [35.2, ...],
  "memory_percents": [45.6, ...],
  "gpu_percents": [78.5, ...],
  "prompt_hashes": ["a1b2c3d4", ...]
}
```

#### GET `/api/system`
**Purpose:** Current system telemetry  
**Response:**
```json
{
  "cpu": 35.2,
  "memory": 45.6,
  "gpu": 78.5,
  "gpu_memory": 62.3,
  "system": "Linux",
  "release": "5.15.0",
  "timestamp": "2025-10-29T12:34:56.789Z"
}
```

#### GET `/api/violations`
**Purpose:** List violations (Phase 2)  
**Query Params:**
- `model` (str, optional)
- `rule` (str, optional)
- `limit` (int, default: 100)
- `offset` (int, default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "timestamp": "2025-10-29T12:34:56.789Z",
    "rule": "R1",
    "model": "llama3",
    "latency_ms": 9000.0,
    "deviation_sigma": 3.5,
    "is_acknowledged": false
  }
]
```

---

## 5. Statistical Methodology

### 5.1 Control Limits Calculation

Given a dataset of latencies `L = [l₁, l₂, ..., lₙ]`:

1. **Mean (μ):** `μ = (Σ lᵢ) / n`
2. **Standard Deviation (σ):** `σ = sqrt((Σ (lᵢ - μ)²) / n)`
3. **Upper Control Limit (UCL):** `UCL = μ + 3σ`
4. **Lower Control Limit (LCL):** `LCL = max(0, μ - 3σ)`

**Why 3σ?**  
In a normal distribution:
- 68% of data falls within ±1σ
- 95% of data falls within ±2σ
- **99.7% of data falls within ±3σ**

Points beyond 3σ have a **0.3% false positive rate** - likely real anomalies.

### 5.2 Nelson Rules (Phase 1 & 2)

| Rule | Condition | Interpretation | Sensitivity |
|------|-----------|----------------|-------------|
| **R1** | Point > UCL or < LCL | Outlier - immediate spike | High |
| **R2** | 9+ points on same side of mean | Sustained shift in process | Medium |
| **R3** | 6+ points in increasing/decreasing trend | Gradual drift | Medium |

**Detection Algorithm:**

```python
def detect_nelson_r1(data, mean, std):
    ucl = mean + 3 * std
    lcl = max(0, mean - 3 * std)
    violations = []
    for i, point in enumerate(data):
        if point.y > ucl or point.y < lcl:
            violations.append({
                'index': i,
                'rule': 'R1',
                'deviation': (point.y - mean) / std
            })
    return violations

def detect_nelson_r2(data, mean):
    violations = []
    for i in range(8, len(data)):
        last_9 = data[i-8:i+1]
        all_above = all(p.y > mean for p in last_9)
        all_below = all(p.y < mean for p in last_9)
        if all_above or all_below:
            violations.append({
                'index': i,
                'rule': 'R2',
                'deviation': (data[i].y - mean) / std
            })
    return violations

def detect_nelson_r3(data):
    violations = []
    for i in range(5, len(data)):
        last_6 = data[i-5:i+1]
        increasing = all(last_6[j].y >= last_6[j-1].y for j in range(1, 6))
        decreasing = all(last_6[j].y <= last_6[j-1].y for j in range(1, 6))
        if (increasing or decreasing) and last_6[0].y != last_6[-1].y:
            violations.append({
                'index': i,
                'rule': 'R3',
                'deviation': (data[i].y - mean) / std
            })
    return violations
```

### 5.3 Advanced Nelson Rules (Phase 3 - Planned)

| Rule | Condition | Interpretation |
|------|-----------|----------------|
| **R4** | 14+ alternating points | Oscillation (possible overcompensation) |
| **R5** | 2 of 3 points > 2σ from mean | Early warning of shift |
| **R6** | 4 of 5 points > 1σ from mean | Trend confirmation |
| **R7** | 15 points within ±1σ | Reduced variability (possibly stratified) |
| **R8** | 8 points beyond ±1σ | Increased variability |

---

## 6. Deployment Architecture

### 6.1 Docker Compose Configuration

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # Backend API
  api:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: llmscope_api
    ports:
      - "8000:8000"  # Internal only
    environment:
      - DATABASE_PATH=/app/data/llmscope.db
      - LLMSCOPE_API_KEY=dev-123
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      timeout: 5s
      retries: 10

  # Monitor
  monitor:
    build:
      context: .
      dockerfile: Dockerfile.monitor
    container_name: llmscope_monitor
    environment:
      - LLMSCOPE_API_BASE=http://llmscope_api:8000
      - LLMSCOPE_API_KEY=dev-123
      - USE_OLLAMA=true
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      - OLLAMA_MODEL=llama3
      - MONITOR_INTERVAL=2
    depends_on:
      api:
        condition: service_healthy

  # Frontend
  web:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: llmscope_web
    ports:
      - "8081:80"
    depends_on:
      - api

volumes:
  data:
```

### 6.2 Resource Requirements

| Component | CPU | Memory | Disk | Notes |
|-----------|-----|--------|------|-------|
| Backend | 0.5 core | 512 MB | 100 MB + data | SQLite grows ~1MB/1000 points |
| Monitor | 0.1 core | 128 MB | 50 MB | Minimal overhead |
| Frontend | 0.1 core | 64 MB | 50 MB | Static files |
| **Total** | **<1 core** | **<1 GB** | **200 MB + data** | Lightweight |

**Disk Growth:**
- 1 data point = ~1 KB (with full telemetry)
- 2-second intervals = 43,200 points/day = ~43 MB/day
- **30 days ≈ 1.3 GB** (with no cleanup)

**Recommendation:** Implement data retention policy (e.g., keep 90 days).

### 6.3 Network Security

- Backend API: **Internal only** (not exposed to internet)
- Frontend: **Exposed on port 8081** (public dashboard)
- Nginx: **Proxies /api → backend** with Authorization header forwarding

**Production Hardening:**
1. Change `LLMSCOPE_API_KEY` from `dev-123`
2. Use HTTPS (put Nginx behind reverse proxy like Caddy/Traefik)
3. Add rate limiting (Nginx `limit_req`)
4. Enable CORS restrictions (FastAPI middleware)

---

## 7. Technology Stack

### 7.1 Backend

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11 | Runtime |
| FastAPI | Latest | Web framework |
| Uvicorn | Latest | ASGI server |
| SQLite | 3.x | Database |
| psutil | 5.9.8 | System metrics |
| pynvml | Latest | NVIDIA GPU metrics |
| aiohttp | Latest | Async HTTP client |

### 7.2 Frontend

| Component | Version | Purpose |
|-----------|---------|---------|
| React | 18 | UI framework |
| Recharts | Latest | Charting |
| Tailwind CSS | 4.1 | Styling |
| Vite | Latest | Build tool |

### 7.3 Infrastructure

| Component | Version | Purpose |
|-----------|---------|---------|
| Docker | 20.10+ | Containerization |
| Docker Compose | 2.0+ | Orchestration |
| Nginx | 1.27 | Reverse proxy |
| Node.js | 22 Alpine | Build stage (frontend) |

---

## 8. Performance Characteristics

### 8.1 Latency Budget

| Operation | Target Latency | Measured |
|-----------|----------------|----------|
| Monitor → LLM | 0.5 - 10s | Variable (LLM-dependent) |
| Monitor → Backend POST | <50ms | ~20ms (local Docker) |
| Frontend → Backend GET | <100ms | ~40ms (1h window, 1800 points) |
| Chart Re-render | <16ms | ~10ms (60 FPS) |

### 8.2 Scalability

**Current Limits (v0.2.0):**
- Max data points per query: 50,000
- Max telemetry records: ~10M (SQLite practical limit)
- Max concurrent users: ~50 (single backend instance)

**Bottlenecks:**
- SQLite write throughput (~1,000 writes/sec)
- Frontend chart rendering (>5,000 points causes lag)

**Future Optimizations (Phase 3+):**
- TimescaleDB for high-volume deployments
- Server-side downsampling (reduce points sent to frontend)
- WebSocket streaming (replace polling)

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Coverage:** Backend API logic

```bash
cd backend
pytest tests/test_api.py
```

**Key Test Cases:**
- SPC calculation accuracy (mean, std dev, UCL/LCL)
- Nelson Rules detection (R1, R2, R3)
- API authentication
- Database queries

### 9.2 Integration Tests

**Coverage:** Full stack (monitor → backend → frontend)

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

**Key Test Cases:**
- Monitor posts telemetry successfully
- Backend stores and retrieves data
- Frontend renders chart without errors
- Violations are detected and logged

### 9.3 Load Testing

**Tool:** Locust

```python
# locustfile.py
from locust import HttpUser, task

class LLMscopeUser(HttpUser):
    @task
    def get_spc_data(self):
        self.client.get(
            "/api/stats/spc?hours=1",
            headers={"Authorization": "Bearer dev-123"}
        )
```

**Target:** 100 concurrent users, <200ms p95 latency

---

## 10. Monitoring & Observability

### 10.1 Health Checks

- **Backend:** `GET /health` (returns `{"status": "ok"}`)
- **Docker Compose:** Built-in healthcheck (15s interval)

### 10.2 Logs

**Backend Logs:**
```bash
docker logs -f llmscope_api
```

**Monitor Logs:**
```bash
docker logs -f llmscope_monitor
```

**Log Format:** Structured JSON (timestamp, level, message)

### 10.3 Metrics (Phase 3)

**Planned Prometheus exporter:**
- `llmscope_latency_seconds` (histogram)
- `llmscope_violations_total` (counter by rule)
- `llmscope_requests_total` (counter by provider/model)

---

## 11. Security Considerations

### 11.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| Unauthorized API access | Bearer token authentication |
| Prompt data leakage | SHA-256 hashing (opt-in full text storage) |
| SQL injection | Parameterized queries (SQLite) |
| XSS attacks | React auto-escaping |
| CSRF attacks | Same-origin policy + API key |

### 11.2 Data Privacy

**By default:**
- Prompts are **hashed** (SHA-256, first 8 chars stored)
- Full prompt text is **opt-in** (set `prompt_text` in config)
- All data stays **on your infrastructure** (no cloud telemetry)

**Compliance:**
- GDPR-friendly (no PII collection)
- SOC 2 ready (audit logging planned for Phase 4)

---

## 12. Limitations & Known Issues

### 12.1 Current Limitations (v0.2.0)

1. **Single backend instance** - No horizontal scaling yet
2. **SQLite only** - Not suitable for >10M records
3. **No authentication UI** - API key set via env var only
4. **Email/Slack alerts in beta** - Rate limiting not handled
5. **Nelson Rules R4-R8 not implemented** - Only R1-R3 active

### 12.2 Known Issues

- **Recharts re-rendering** - Chart flickers on rapid updates (>1 update/sec)
- **Large datasets** - Frontend lags with >5,000 points (needs downsampling)
- **GPU metrics** - Only works with NVIDIA GPUs (pynvml dependency)

**Workarounds:**
- Use 1-second polling interval (not faster)
- Limit time windows to 24h max
- Disable GPU metrics if not using NVIDIA

---

## 13. Changelog & Versioning

See [CHANGELOG.md](../CHANGELOG.md) for version history.

**Versioning Scheme:** Semantic Versioning (MAJOR.MINOR.PATCH)

- **MAJOR:** Breaking changes (e.g., database schema change)
- **MINOR:** New features (backwards-compatible)
- **PATCH:** Bug fixes

---

## 14. Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup.

**Key Areas for Contribution:**
- Nelson Rules R4-R8 implementation
- PostgreSQL support
- Prometheus exporter
- Documentation improvements

---

## 15. License

MIT License - see [LICENSE](../LICENSE)

---

**Document Version:** 1.0  
**Last Updated:** October 29, 2024  
**Maintained by:** LLMscope Team
