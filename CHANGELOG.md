# Changelog

## [0.2.0] - 2025-10-28

### Added
- Server-side violation detection using Nelson Rules (R1, R2, R3)
- Email alerts via SMTP (Gmail, SendGrid, Mailgun support)
- Slack webhook alerts with rich formatting
- Setup Wizard for first-time configuration
- Violation acknowledgment workflow with user tracking
- Frozen statistics in violation modal (no stale data)
- `/api/violations` endpoint for violation management
- `/api/settings` endpoint for alert configuration
- Export violations as CSV

### Changed
- Dashboard now pulls violations from backend API
- Statistics display frozen at violation time (not live)
- Improved UI/UX with Setup Wizard

### Technical
- Phase 2 backend with full SPC violation detection
- SQLite database schema for violations, models, settings
- Async email/Slack alerting (non-blocking)
- Database persistence for all configurations

## [0.1.0] - 2025-10-27

### Initial Release
- Real-time SPC monitoring dashboard
- Live latency charting with Recharts
- Nelson Rules violation detection (client-side)
- System telemetry monitoring (CPU, GPU, Memory)
- Docker containerization
- Ollama integration