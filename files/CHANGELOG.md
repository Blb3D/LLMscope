# Changelog

All notable changes to LLMscope will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Phase 3 (Planned - Q1 2025)
- Advanced Nelson Rules (R4, R5, R6, R7, R8)
- Custom alert thresholds per rule
- Multi-model comparison view
- Historical trend analysis (30-day, 90-day windows)
- Prometheus/Grafana integration
- Webhook support for custom integrations

---

## [0.2.0] - 2024-10-29

### Added
- **Server-side violation detection** - Backend now calculates Nelson Rules violations, not just frontend
- **Violation details modal** - Click any violation in the log to see:
  - Full telemetry snapshot at time of violation
  - Process statistics (mean, std dev, UCL, LCL)
  - System metrics (CPU, GPU, Memory)
  - ±10 points of context for debugging
- **CSV export** - Download violation logs for reporting and analysis
- **Violation log persistence** - All violations now stored in SQLite with timestamps
- **Email alerts (beta)** - Send alerts on R1 violations (⚠️ still testing)
- **Slack webhooks (beta)** - Post violations to Slack channels (⚠️ still testing)
- **Setup wizard (beta)** - Guided configuration for first-time users (⚠️ still testing)

### Changed
- Violations now calculated server-side for consistency across clients
- Dashboard now fetches violations from `/api/violations` endpoint
- Improved violation log UI with rule-based color coding

### Fixed
- React component re-rendering issues with Recharts
- Violation detection edge cases when data < 10 points
- Time window filtering accuracy

---

## [0.1.0] - 2024-10-15

### Added (Phase 1 - Initial Release)
- Real-time SPC chart with latency over time
- Nelson Rules detection (R1, R2, R3)
- UCL/LCL control limit visualization
- System telemetry collection (CPU, GPU, Memory)
- Multi-provider support (Ollama, OpenAI, Anthropic)
- Time-window filtering (1h, 6h, 24h)
- SQLite database persistence
- Docker Compose deployment
- Monitor container (tests LLM every 2 seconds)
- FastAPI backend with `/api/stats/spc` endpoint
- React frontend with Recharts visualization
- Interactive tooltips showing deviation from mean
- Prompt hashing for privacy (SHA-256)

### Infrastructure
- Three-container architecture (monitor, backend, frontend)
- Nginx reverse proxy for `/api` routing
- Health checks for all services
- Multi-stage Docker builds for frontend
- Volume mounts for SQLite persistence

---

## [0.0.1] - 2024-09-20 (Alpha)

### Added
- Initial proof of concept
- Basic latency logging
- Simple chart visualization
- SQLite storage

---

## Version History Summary

| Version | Date | Key Features | Status |
|---------|------|-------------|--------|
| 0.2.0 | 2024-10-29 | Server-side violations, CSV export, alerts (beta) | **Current** |
| 0.1.0 | 2024-10-15 | SPC chart, Nelson Rules (R1-R3), Docker Compose | Stable |
| 0.0.1 | 2024-09-20 | Proof of concept | Alpha |

---

## Upcoming Releases

### v0.3.0 (Q1 2025)
Focus: Advanced detection and integrations
- Complete implementation of Nelson Rules (R4-R8)
- Custom threshold configuration UI
- Prometheus metrics exporter
- Grafana dashboard templates
- Multi-model comparison chart

### v0.4.0 (Q2 2025)
Focus: Enterprise features
- Role-based access control (RBAC)
- Multi-tenant support
- SSO integration (SAML, OAuth)
- Audit logging
- Custom branding

### v1.0.0 (Q3 2025)
Focus: Production hardening
- High availability (HA) deployment
- PostgreSQL support (in addition to SQLite)
- Advanced analytics engine
- Machine learning anomaly detection
- Full API documentation with Swagger/OpenAPI

---

## Breaking Changes

None yet - project is in active development.

When we introduce breaking changes, they will be clearly marked with:
- **[BREAKING]** in the changelog
- Migration guides in `docs/migrations/`
- Semantic version bump (major version)

---

## Deprecation Notices

None yet.

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to suggest features or report bugs.

Feature requests should be opened as GitHub Issues with the `enhancement` label.

---

**Note:** Dates in this changelog use ISO 8601 format (YYYY-MM-DD).
