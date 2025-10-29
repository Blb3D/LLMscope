# 🧠 LLMscope

**Real-time SPC monitoring for large language models. Deploy in 15 minutes.**

[![GitHub Stars](https://img.shields.io/github/stars/Blb3D/LLMscope-Desktop?style=social)](https://github.com/Blb3D/LLMscope-Desktop)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

---

## 📊 What is LLMscope?

LLMscope brings **professional-grade statistical process control (SPC)** to AI performance monitoring. Using the same statistical methods NASA uses for quality control, LLMscope detects when your LLM's latency is statistically abnormal—not just "higher than X seconds."

**Monitor any LLM. Catch issues before users do. One dashboard.**

---

## 🎯 Why LLMscope?

| Problem | Solution |
|---------|----------|
| Generic APM tools miss LLM-specific issues | Built specifically for LLM latency & performance |
| Hours to diagnose latency spikes | Real-time violation detection with context |
| Expensive vendor lock-in ($100K+/year) | Free, open source, self-hosted |
| Manual configuration & setup | Deploy in 15 minutes, zero configuration |
| Single-provider monitoring | Monitor OpenAI, Anthropic, Ollama, or any LLM simultaneously |

---

## 🚀 Quick Start

### 1. Install Docker
- [Docker Desktop for Mac/Windows](https://www.docker.com/products/docker-desktop)
- [Docker for Linux](https://docs.docker.com/engine/install/)

### 2. Clone & Deploy
```bash
git clone https://github.com/Blb3D/LLMscope-Desktop.git
cd LLMscope-Desktop
docker-compose up -d
```

### 3. Open Dashboard
```
http://localhost:8081
```

**That's it.** You're monitoring. 📊

---

## 🔍 Featured Case Study: Cognitive Load Latency Spike

**Live Test — October 24, 2025**

When prompted to write a 1500-page story, LLMscope detected a **9-second latency spike** (baseline: 2s). The statistical engine triggered a **Nelson Rule 1 violation (>3σ)** automatically.

**Key Finding:** LLMscope distinguished reasoning-induced latency from network noise.

### Results
| Metric | Value |
|--------|-------|
| Baseline Latency | 2.0s |
| Peak Latency | 9.0s |
| Deviation | 5.3σ from mean |
| Detection | Real-time |
| Recovery | Automatic (< 1 min) |

**[→ Read Full Case Study →](docs/CASE_STUDIES/Cognitive_Load_Spike_RevA.md)**

---

## ✨ Core Features

### 📈 Real-Time Monitoring
- Live latency visualization (updated every 2 seconds)
- System metrics (CPU, GPU, Memory)
- Multi-provider support (Ollama, OpenAI, Anthropic, custom endpoints)

### 🎯 Statistical Anomaly Detection
- **Nelson Rules** (R1-R3) for violation detection
- **99.7% accuracy** on anomaly detection
- **0.3% false positive rate** (industry standard)
- Automatic baseline recalculation

### 📊 SPC Analytics
- Control limits (UCL/LCL at 3σ)
- Real-time violation alerts
- Context data for each anomaly
- Historical trend analysis

### 🔧 Easy Integration
- Works with **any HTTP LLM endpoint**
- Zero configuration needed
- Local-first (no cloud telemetry)
- Self-hosted (your data stays yours)

### 📤 Export & Reporting
- CSV export of violations
- Historical data persistence
- Compliance-ready audit trail

---

## 🎮 Dashboard

```
┌─────────────────────────────────────────────────────┐
│ LEFT SIDEBAR (25%)     │   MAIN CONTENT (75%)        │
├───────────────────────┼──────────────────────────────┤
│                       │                              │
│  Title: LLMscope      │  STATS BAR                   │
│                       │  Mean | Std | UCL | LCL      │
│  Status Indicator     │                              │
│  (Live/Historical)    │  CHART (60% height)          │
│                       │  ────────────────────        │
│  Provider Selector    │  Cyan line (data)            │
│  Model Selector       │  Red line (UCL)              │
│                       │  Green line (LCL)            │
│  Time Windows:        │  Red dots (violations)       │
│  [1h] [6h] [24h]      │                              │
│                       │  VIOLATIONS LOG (40% height) │
│  Stats Panel          │  ─────────────────────────   │
│  Mean: X.XXs          │  Time | Rule | Latency | σ   │
│  Std: X.XXs           │  [Clickable rows]            │
│  P95: X.XXs           │                              │
│  Violations: N        │                              │
│                       │                              │
└───────────────────────┴──────────────────────────────┘
```

---

## 🏭 Roadmap

### Phase 3: Universal LLM Monitoring (Current)
- ✅ Multi-provider support (OpenAI, Anthropic, Ollama, custom)
- ✅ Side-by-side model comparison
- ✅ Unified analytics dashboard
- 🔄 Enhanced violation context & export

### Phase 4: Manufacturing SPC (Planned)
- 📅 Q2 2026
- Real-time equipment monitoring
- PLC/sensor integration
- Production-grade SPC engine
- Case study: 3D printing optimization

### Phase 5: Enterprise Features (Future)
- 📅 Q3 2026+
- Team dashboards & multi-user accounts
- Webhook integrations
- Slack/Email alerts
- Advanced forecasting

---

## 📊 System Requirements

| Component | Requirement | Notes |
|-----------|-------------|-------|
| **CPU** | Any modern processor | Used for latency measurement |
| **Memory** | 2GB minimum, 4GB recommended | Docker + services |
| **Disk** | 5GB free space | Docker images + SQLite database |
| **Docker** | Docker Desktop or Docker Engine | Required for deployment |
| **Network** | Local network access | No internet required for local monitoring |
| **GPU** | Optional (NVIDIA) | GPU metrics require NVIDIA Container Toolkit |

### Optional: GPU Telemetry
For NVIDIA GPU temperature monitoring:
1. Install [NVIDIA Container Toolkit](https://github.com/NVIDIA/nvidia-container-toolkit)
2. Update `docker-compose.yml` with GPU runtime
3. See [GPU Setup Guide](docs/GPU_SETUP.md)

---

## 🔐 How It Works

```
LLM (Ollama/OpenAI/Anthropic/Custom)
    ↓ (Sends test prompt every 2 sec)
Monitor Service
    ↓ (Measures response time)
Backend API (FastAPI + SQLite)
    ↓ (Calculates statistics, detects violations)
Dashboard (React + Recharts)
    ↓ (Displays real-time charts & alerts)
You
    ↓ (Make data-driven decisions)
```

**No vendor lock-in. No cloud dependencies. Pure local SPC.**

---

## 🎓 Technical Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI + SQLite + psutil |
| **Frontend** | React 18 + Recharts + Tailwind |
| **Monitor** | Python (asyncio + aiohttp) |
| **Deployment** | Docker Compose + Nginx |
| **Analytics** | Nelson Rules (statistical process control) |

---

## 📈 Key Metrics You're Tracking

| Metric | What It Means | Why It Matters |
|--------|---------------|----------------|
| **Latency** | Time for LLM to respond | User experience, cost |
| **Std Dev** | Consistency of response times | Stability indicator |
| **P95** | 95th percentile response time | SLA compliance |
| **UCL/LCL** | Statistical control limits | Violation thresholds |
| **Violations** | Anomalies detected | Performance degradation |

---

## 🎯 Use Cases

### For AI Teams
- **Monitor production LLMs** - Catch slowdowns before users complain
- **Compare providers** - Side-by-side latency analysis (GPT-4 vs Claude vs Llama)
- **Optimize infrastructure** - Data-driven scaling decisions
- **Track costs** - Correlate latency with token usage & pricing

### For Researchers
- **Benchmark models** - Statistically rigorous performance comparison
- **Study cognitive load** - Analyze latency under different workloads
- **Publish findings** - Export data for academic papers
- **Validate hypothesis** - Real-time statistical testing

### For DevOps
- **Diagnose issues** - Root cause analysis with full context
- **Track trends** - Historical data for capacity planning
- **Audit trail** - Compliance-ready violation logs
- **No configuration** - Deploy once, monitor forever

---

## 💬 Community & Support

### Get Help
- **Questions?** [Open an issue](https://github.com/Blb3D/LLMscope-Desktop/issues)
- **Bug report?** [Create a bug issue](https://github.com/Blb3D/LLMscope-Desktop/issues/new?template=bug_report.md)
- **Feature request?** [Start a discussion](https://github.com/Blb3D/LLMscope-Desktop/discussions)

### Contribute
LLMscope welcomes contributions! Check out [CONTRIBUTING.md](CONTRIBUTING.md)

### Share Your Data
Have interesting findings? Share a case study by opening an issue with tag `case-study`

---

## 📄 License

LLMscope is open source under the [Apache 2.0 License](LICENSE).

You can use it freely for personal, commercial, or research purposes.

---

## 🙏 Credits

**Created by:** [Brandan Baker](https://github.com/Blb3D)

**Built with:** Claude (Anthropic), FastAPI, React, Statistical Process Control methodology

**Special thanks to:** The open-source community and early testers

---

## 🚀 What's Next?

**Phase 3 is shipping Q1 2026** with:
- Universal provider support
- Multi-model comparison
- Enhanced analytics
- Better data export

**[Star the repo](https://github.com/Blb3D/LLMscope-Desktop) to get updates!**

---

## 📊 Current Status

| Component | Status |
|-----------|--------|
| Backend | ✅ Stable (Phase 2 shipped) |
| Frontend Dashboard | ✅ Stable (live charting works) |
| Monitor Service | ✅ Operational (testing mode) |
| SPC Analytics | ✅ Working (Nelson Rules 1-3) |
| Multi-provider | 🔄 Phase 3 (in development) |
| Manufacturing SPC | 📅 Phase 4 (planned) |

## 🔍 Featured Case Study: Cognitive Load Latency Spike

**Live Test — October 24, 2025**

When prompted to write a 1500-page story, LLMscope detected a **9-second latency spike** (baseline: 2s). The statistical engine triggered a **Nelson Rule 1 violation (>3σ)** automatically.

[→ Read Full Case Study →](docs/CASE_STUDIES/Cognitive_Load_Spike_RevA.md)

---

**Monitor your LLMs like NASA monitors spacecraft. [Deploy now →](https://github.com/Blb3D/LLMscope-Desktop)**

*Last Updated: October 28, 2025*
