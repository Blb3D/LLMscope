# LLMscope

**Real-time Statistical Process Control (SPC) monitoring for LLM latency and performance.**

> ⚠️ **BETA VERSION 0.2.0** - Currently in testing phase. We welcome testers and feedback!  
> Free for personal/non-commercial use. [Commercial licensing available](#-license).

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-0.2.0--beta-orange)
![Status](https://img.shields.io/badge/status-beta-yellow)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-required-blue.svg)](https://www.docker.com/)

> Detect when your LLM service goes out of control using industry-standard Nelson Rules. Self-hosted, privacy-first, and production-ready.

---

## 🎯 Why LLMscope?

LLM performance isn't just slow or fast—it's **statistically predictable**. LLMscope applies **Statistical Process Control (SPC)**, the same methodology used in manufacturing quality control for decades, to monitor LLM latency in real-time.

### The Problem
- **Generic monitoring** only tells you "latency is high"
- **Cloud dashboards** require sending your data to third parties
- **No context** around what caused performance degradation
- **False alarms** from naive threshold alerts

### The Solution
- ✅ **SPC-based detection** - Nelson Rules identify real anomalies, not noise
- ✅ **Local-first** - All data stays on your infrastructure
- ✅ **Root cause analysis** - System telemetry (CPU, GPU, Memory) captured at violation time
- ✅ **Multi-provider** - Works with Ollama, OpenAI, Anthropic, and any LLM API
- ✅ **Production-ready** - Docker Compose setup in <15 minutes

---

## 🔥 Real-World Example: Cognitive Load Spike

When testing with complex prompts, we observed latency spikes that correlated directly with task complexity:

| Prompt Complexity | Baseline Latency | Spike Latency | Increase |
|-------------------|------------------|---------------|----------|
| Simple (1 sentence) | 2.0s | 2.0s | 0% |
| Medium (paragraph) | 2.0s | 4.0s | **+100%** |
| Complex (1200-page story) | 2.0s | **9.0s** | **+350%** |

**LLMscope detected this immediately** using Rule R1 (point beyond 3σ from mean) and provided full context:
- Latency jumped to 1772ms (violation)
- Rule R3 also triggered (6+ points in increasing trend)
- System telemetry showed GPU at 0% (CPU bottleneck)
- Violation modal showed ±10 points of context for debugging

![Cognitive Load Spike Detection](docs/assets/cognitive-load-spike.png)

*Real screenshot from LLMscope detecting Claude API latency spike during complex prompt generation.*

---

## 📊 Features

### Phase 1 (Released)
- ✅ Real-time SPC chart with UCL/LCL control limits
- ✅ Nelson Rules violation detection (R1, R2, R3)
- ✅ System telemetry (CPU, GPU, Memory)
- ✅ Multi-provider support (Ollama, OpenAI, Anthropic)
- ✅ Time-window filtering (1h, 6h, 24h)
- ✅ SQLite persistence

### Phase 2 (Current - v0.2.0)
- ✅ **Server-side violation detection** - Backend calculates violations, not just frontend
- ✅ **Violation details modal** - Click any violation for full context (±10 points)
- ✅ **CSV export** - Download violation logs for reporting
- ✅ **Violation log** - Persistent record of all SPC rule triggers
- ✅ **Email/Slack alerts** (⚠️ *beta - still testing*)
- ✅ **Setup wizard** (⚠️ *beta - still testing*)

### Phase 3 (Planned)
- 🔄 Advanced Nelson Rules (R4-R8)
- 🔄 Custom alert thresholds
- 🔄 Multi-model comparison
- 🔄 Historical trend analysis
- 🔄 Prometheus/Grafana integration

[Full Roadmap →](docs/ROADMAP_v5.md)

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Ollama running locally (or API keys for OpenAI/Anthropic)
- 2GB RAM, 1GB disk space

### Installation (< 15 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/llmscope.git
cd llmscope

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings:
# - OLLAMA_BASE_URL=http://host.docker.internal:11434
# - OLLAMA_MODEL=llama3
# - LLMSCOPE_API_KEY=your-secure-key

# 3. Start all services
docker-compose up -d

# 4. Open dashboard
open http://localhost:8081
```

**That's it!** LLMscope is now monitoring your LLM and detecting violations in real-time.

---

## 📐 How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR INFRASTRUCTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │ Ollama (GPU)     │ ◄─────  │  Monitor Container       │ │
│  │ Port 11434       │         │  - Tests every 2s        │ │
│  └──────────────────┘         │  - Measures latency      │ │
│                               │  - Collects telemetry    │ │
│                               └────────┬─────────────────┘ │
│                                        │ POST /api/stats   │
│                               ┌────────▼─────────────────┐ │
│                               │  Backend Container       │ │
│                               │  - FastAPI + SQLite      │ │
│                               │  - Calculates SPC stats  │ │
│                               │  - Nelson Rules engine   │ │
│                               └────────┬─────────────────┘ │
│                                        │ GET /api/stats/spc│
│                               ┌────────▼─────────────────┐ │
│                               │  Frontend Container      │ │
│  Your Browser ◄───────────────┤  - React + Recharts      │ │
│  localhost:8081               │  - Real-time chart       │ │
│                               │  - Violation log         │ │
│                               └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Statistical Process Control (SPC)

LLMscope uses **control limits** calculated from your actual data:

- **Mean (μ)** = average latency
- **Std Dev (σ)** = spread of latency
- **UCL** = μ + 3σ (Upper Control Limit)
- **LCL** = μ - 3σ (Lower Control Limit)

**Why 3σ?**  
In a normal distribution, 99.7% of data falls within 3σ. Points outside this range have only a 0.3% chance of being random noise—they're **real anomalies**.

### Nelson Rules (Violation Detection)

| Rule | Condition | What It Detects |
|------|-----------|----------------|
| **R1** | Point beyond 3σ | Outlier - extreme latency spike |
| **R2** | 9+ points on same side of mean | Sustained shift - process changed |
| **R3** | 6+ points in trend (up/down) | Drift - gradual degradation |

*Advanced rules (R4-R8) coming in Phase 3*

---

## 📖 Documentation

- **[Architecture Guide](docs/llmscope_architecture_guide.md)** - Deep dive into system design
- **[Roadmap](docs/ROADMAP_v5.md)** - Feature timeline and vision
- **[Scope Document](docs/SCOPE_v5.md)** - Technical specifications
- **[Case Study: Cognitive Load Spike](docs/CASE_STUDY_Cognitive_Load_Spike_RevA.md)** - Real-world example with data

---

## 🛠️ Technology Stack

**Backend:**
- FastAPI (Python 3.11)
- SQLite (persistence)
- Uvicorn (ASGI server)
- psutil + pynvml (system metrics)

**Frontend:**
- React 18
- Recharts (visualization)
- Tailwind CSS 4
- Vite (build tool)

**Infrastructure:**
- Docker + Docker Compose
- Nginx (reverse proxy)
- Multi-stage builds (optimized images)

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Backend (FastAPI)
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Frontend (React)
cd frontend
npm install
npm run dev
```

---

## 📊 Use Cases

### For AI Engineers
- Detect model degradation before users complain
- Identify which prompts cause performance issues
- Optimize infrastructure based on real telemetry

### For DevOps Teams
- Monitor LLM APIs like any other service
- Set up alerts for SPC violations
- Export violation data for postmortems

### For Researchers
- Study LLM performance characteristics
- Correlate latency with prompt complexity
- Publish reproducible performance benchmarks

---

## 🔒 Privacy & Security

- ✅ **Self-hosted** - All data stays on your infrastructure
- ✅ **No telemetry** - We don't collect anything
- ✅ **API key protected** - Backend requires Bearer token
- ✅ **Prompt hashing** - Store SHA-256 hashes, not full text (optional)

---

## 📜 License

**LLMscope is source-available under the Business Source License 1.1 (BSL).**

### ✅ Free for:
- Personal use, education, testing, and evaluation
- Non-commercial projects and research
- Individual developers learning and experimenting

### ❌ Requires Commercial License for:
- Production use in commercial environments
- Offering LLMscope as a hosted/managed service
- Incorporating LLMscope into commercial products
- Using LLMscope to monitor commercial LLM deployments

### 💰 Commercial Licensing

For commercial use, we offer flexible licensing options for businesses of all sizes.

**Contact:** bbaker@blb3dprinting.com

### ⏰ Future: Automatic Open Source

On **October 29, 2028** (3 years from publication), LLMscope automatically converts to the MIT License, becoming fully open source.

**Full terms:** See [LICENSE](LICENSE) for complete details.

---

### Why BSL?

We chose BSL to:
- ✅ Keep source code visible and auditable
- ✅ Allow free use for testing and evaluation
- ✅ Protect against commercial exploitation
- ✅ Ensure long-term sustainability
- ✅ Guarantee eventual open source release

---

## 🌟 Star History

If LLMscope helps you catch performance issues before your users do, consider giving us a star! ⭐

---

## 📬 Contact

- **Issues & Bugs:** [GitHub Issues](https://github.com/Blb3D/LLMscope/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Blb3D/LLMscope/discussions)
- **Commercial Licensing:** bbaker@blb3dprinting.com
- **General Inquiries:** bbaker@blb3dprinting.com

---

**Built with ❤️ by engineers who are tired of reactive monitoring.**
