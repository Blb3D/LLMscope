# LLMscope

**Real-time Statistical Process Control (SPC) monitoring for LLM latency and performance**

Monitor your Large Language Models with professional-grade statistical analysis. Detect performance degradation using industry-standard Nelson Rules before it impacts users.

![GitHub release](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen)

---

## Features

✨ **Real-time Monitoring**
- Live latency tracking with sub-second updates
- Historical data retention (24h+)
- Multi-model support (Ollama, ChatGPT, local LLMs)

📊 **Statistical Process Control**
- Nelson Rules violation detection (R1, R2, R3)
- Dynamic control limits (UCL/LCL)
- Mean, standard deviation, P95 percentile analysis

🚨 **Smart Alerting**
- Email alerts (Gmail, SendGrid, Mailgun)
- Slack webhook integration
- Configurable alert rules

🎯 **Violation Workflow**
- Track violations with frozen statistics
- Acknowledge violations with user tracking
- Mark as resolved with timestamps
- CSV export for analysis

🎨 **Professional Dashboard**
- Real-time SPC chart with control lines
- Live system telemetry (CPU, GPU, Memory)
- Violations log with one-click details
- Model filtering and time window selection

---

## Quick Start

### Prerequisites
- Docker Desktop (download from [docker.com](https://www.docker.com/products/docker-desktop))
- Ollama (for local LLM testing, or use your own API)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/LLMscope.git
cd LLMscope
```

2. **Create environment file**
```bash
cp .env.example .env
```

3. **Start with Docker**
```bash
docker-compose up -d
```

4. **Open dashboard**
Navigate to `http://localhost:8081` in your browser

5. **Complete setup wizard**
Configure email alerts, Slack webhooks, and alert rules

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Core
LLMSCOPE_API_KEY=dev-123

# Ollama (for local testing)
USE_OLLAMA=true
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama2
MONITOR_INTERVAL=2

# Email Alerts
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ALERT_EMAIL_FROM=your-email@gmail.com
ALERT_EMAIL_TO=team@company.com

# Slack Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Setup Wizard

On first load, you'll see a 5-step setup wizard:

1. **Welcome** - Overview of features
2. **Email Alerts** - Configure SMTP (optional)
3. **Slack Alerts** - Add webhook URL (optional)
4. **Alert Rules** - Select Nelson Rules to monitor
5. **Review** - Confirm settings and finish

---

## How It Works

### Monitoring Cycle

Every 2 seconds (configurable):

1. **Collect** - Send test prompt to LLM, measure latency
2. **Capture** - Record system metrics (CPU, GPU, Memory)
3. **Store** - Persist to SQLite database
4. **Analyze** - Calculate statistics and detect violations
5. **Alert** - Send email/Slack if violations detected
6. **Display** - Update dashboard in real-time

### Statistical Analysis

**Nelson Rules Detection:**

- **R1**: Point beyond 3σ from mean (sudden spike/drop)
- **R2**: 9+ consecutive points on same side of mean (sustained shift)
- **R3**: 6+ points in increasing/decreasing trend (gradual degradation)

**Control Limits:**
```
Mean (μ) = average latency
Std Dev (σ) = spread of latencies
UCL = μ + 3σ  (Upper Control Limit)
LCL = μ - 3σ  (Lower Control Limit)
```

99.7% of normal data falls within control limits. Violations indicate out-of-control processes.

---

## Documentation

- **[Installation Guide](./docs/INSTALL.md)** - Detailed setup instructions
- **[Email Setup](./docs/EMAIL_SETUP.md)** - Gmail, SendGrid, Mailgun configuration
- **[Slack Setup](./docs/SLACK_SETUP.md)** - Webhook setup guide
- **[API Reference](./docs/API.md)** - REST API endpoints
- **[Architecture](./docs/ARCHITECTURE.md)** - System design overview

---

## Technology Stack

**Backend**
- FastAPI (Python web framework)
- SQLite (embedded database)
- Uvicorn (ASGI server)

**Frontend**
- React (UI framework)
- Recharts (charting library)
- Tailwind CSS (styling)
- Vite (build tool)

**DevOps**
- Docker + Docker Compose
- Nginx (reverse proxy)

**Monitoring**
- psutil (system metrics)
- pynvml (GPU metrics)
- aiohttp (async HTTP)

---

## Project Structure

```
LLMscope/
├── backend/
│   ├── app.py                    # FastAPI application
│   ├── monitor_apis.py           # Telemetry collection
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── SetupWizard.jsx       # Configuration UI
│   │   └── Dashboard_ollama_revB.jsx  # Main dashboard
│   └── package.json
├── tests/
│   ├── test_e2e_phase2.py       # E2E test suite
│   ├── conftest.py              # Pytest fixtures
│   └── pytest.ini
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── Dockerfile.monitor
└── docs/                         # Documentation
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/stats` | Log telemetry |
| GET | `/api/stats/spc` | Get SPC chart data |
| GET | `/api/violations` | List violations |
| POST | `/api/violations/{id}/acknowledge` | Acknowledge violation |
| POST | `/api/violations/{id}/resolve` | Mark as resolved |
| GET | `/api/settings` | Get alert settings |
| PUT | `/api/settings/{key}` | Update setting |
| GET | `/api/system` | Get system telemetry |

---

## Performance

- **Dashboard**: Real-time updates every 1 second
- **Telemetry**: Collection every 2 seconds
- **Storage**: ~1MB per 1000 data points
- **Database**: SQLite (embedded, no external DB needed)
- **Memory**: <100MB for typical use

---

## Roadmap

**Phase 3 (Planned)**
- E2E test suite (Selenium)
- CI/CD pipeline (GitHub Actions)
- Standalone executable (.EXE installer)
- Multi-provider support (OpenAI, Anthropic, local)
- Advanced analytics dashboard
- Webhook alerts for custom integrations

---

## Troubleshooting

**Dashboard shows blank chart?**
- Ensure Ollama is running and accessible
- Check `.env` file has correct `OLLAMA_BASE_URL`
- View logs: `docker-compose logs llmscope_monitor`

**Alerts not sending?**
- Verify SMTP credentials in setup wizard
- Check Gmail app password (not regular password)
- Test Slack webhook URL format

**High latency readings?**
- Smaller models respond faster (gemma3:4b vs gpt-oss:20b)
- GPU memory impacts first-run latency
- Monitor system metrics during spikes

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## Support

- 📧 Email: bbaker@blb3dprinting.com
- 💬 Slack: [Join our community](https://slack.com)
- 📖 Docs: [Full documentation](./docs)
- 🐛 Issues: [GitHub Issues](https://github.com/Blb3D/LLMscope/issues)

---

## Citation

If you use LLMscope in your research or projects, please cite:

```bibtex
@software{llmscope2025,
  title={LLMscope: Real-time SPC Monitoring for LLM Performance},
  author={Your Name},
  year={2025},
  url={https://github.com/yourusername/LLMscope}
}
```

---

**Built with ❤️ for LLM performance monitoring**
