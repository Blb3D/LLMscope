# LLMscope Phase 2 - Implementation Guide

## What's New

✅ **Server-Side Violation Detection** - Violations detected on every telemetry POST  
✅ **Frozen Statistics** - Each violation stores the stats from that exact moment  
✅ **Email Alerts** - SMTP-based alerts (Gmail, SendGrid, etc.)  
✅ **Slack Alerts** - Real-time Slack webhook notifications  
✅ **Acknowledgment Workflow** - Mark violations as acknowledged with user tracking  
✅ **Setup Wizard** - First-time configuration UI for alerts  
✅ **Database Persistence** - All settings stored in SQLite (no env vars needed after setup)

---

## Database Schema Changes

Three new tables added:

### `violations`
Stores each detected violation with **frozen statistics**:
- `id` - Unique violation ID
- `telemetry_id` - Reference to original telemetry point
- `rule` - Which rule triggered (R1, R2, R3)
- `timestamp` - When violation occurred
- `latency_ms` - Actual latency at violation time
- `deviation_sigma` - How many sigmas away from mean
- **Frozen stats at violation time:**
  - `mean_ms` - Mean at that moment
  - `std_ms` - Std dev at that moment
  - `ucl_ms` - Upper control limit at that moment
  - `lcl_ms` - Lower control limit at that moment
- **System metrics at violation time:**
  - `cpu_percent`, `memory_percent`, `gpu_percent`, `gpu_memory_percent`
- **Acknowledgment tracking:**
  - `is_acknowledged` - Boolean flag
  - `acknowledged_at` - Timestamp when acknowledged
  - `acknowledged_by` - Who acknowledged it
  - `resolved_at` - When marked as resolved

### `models`
Pre-configured LLM models for future multi-model support:
- `provider` - "ollama", "openai", etc.
- `model_name` - "llama3", "gpt-4", etc.
- `display_name` - Human-readable name
- `is_active` - Enable/disable monitoring
- `config` - JSON config (extensible)

### `settings`
All alert configuration stored here:
- `enable_email_alerts` - true/false
- `enable_slack_alerts` - true/false
- `smtp_server`, `smtp_port`, `smtp_user`, `smtp_password`
- `alert_email_from`, `alert_email_to`
- `slack_webhook_url`
- `alert_on_rule` - "R1,R2,R3" (comma-separated)

---

## Setup Wizard Flow

When user visits dashboard for the first time:

```
Welcome (Intro)
    ↓
Email Setup (Optional)
  - SMTP config
  - Gmail app password instructions
  - Recipient list
    ↓
Slack Setup (Optional)
  - Webhook URL
  - Setup instructions
    ↓
Alert Rules
  - Choose which rules trigger alerts (default: all)
    ↓
Review
  - Confirm settings
  - Save to database
    ↓
Dashboard
```

**Setup is skipped on subsequent visits** - stored in localStorage as `llmscope_setup_complete`

---

## Server-Side Violation Detection

Every time monitor sends telemetry (`POST /api/stats`):

```
1. Insert telemetry into database
2. Calculate stats for that provider/model (last 24h)
3. Check for R1, R2, R3 violations
4. For each violation:
   a. Create violation record with frozen stats
   b. Check if alert rules enabled for this rule
   c. Send email (async, non-blocking)
   d. Send Slack (async, non-blocking)
   e. Return to caller
```

**Key benefit:** Violations are detected and alerted on *immediately*, even if dashboard isn't loaded.

---

## New API Endpoints

### Violations Management

#### `GET /api/violations`
List violations with filtering:
```bash
curl -H "Authorization: Bearer dev-123" \
  "http://localhost:8000/api/violations?model=llama3&rule=R1&limit=50"

Response:
[
  {
    "id": 1,
    "model": "llama3",
    "rule": "R1",
    "timestamp": "2025-10-28T12:34:56",
    "latency_ms": 3500.5,
    "deviation_sigma": 3.2,
    "mean_ms": 2000.0,
    "std_ms": 500.0,
    "ucl_ms": 3500.0,
    "lcl_ms": 500.0,
    "is_acknowledged": false,
    ...
  }
]
```

#### `GET /api/violations/{id}`
Get single violation (with frozen stats for modal):
```bash
curl -H "Authorization: Bearer dev-123" \
  http://localhost:8000/api/violations/1
```

#### `POST /api/violations/{id}/acknowledge`
Mark violation as acknowledged:
```bash
curl -X POST -H "Authorization: Bearer dev-123" \
  -H "Content-Type: application/json" \
  -d '{"acknowledged_by": "alice@company.com"}' \
  http://localhost:8000/api/violations/1/acknowledge
```

#### `POST /api/violations/{id}/resolve`
Mark violation as resolved:
```bash
curl -X POST -H "Authorization: Bearer dev-123" \
  http://localhost:8000/api/violations/1/resolve
```

### Settings Management

#### `GET /api/settings`
Retrieve all alert settings:
```bash
curl -H "Authorization: Bearer dev-123" \
  http://localhost:8000/api/settings
```

#### `PUT /api/settings/{key}`
Update a setting:
```bash
curl -X PUT -H "Authorization: Bearer dev-123" \
  -H "Content-Type: application/json" \
  -d '{"value": "false"}' \
  http://localhost:8000/api/settings/enable_email_alerts
```

---

## Email Alert Setup

### Gmail (Recommended)

1. **Enable 2-Factor Authentication**
   - Go to myaccount.google.com
   - Security → 2-Step Verification

2. **Create App Password**
   - myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Google generates 16-character password
   - **Copy this, not your regular password**

3. **Enter in Setup Wizard**
   - SMTP Server: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP User: `your-email@gmail.com`
   - SMTP Password: `[16-char app password]`

### Other Providers

**SendGrid:**
- SMTP Server: `smtp.sendgrid.net`
- SMTP Port: `587`
- SMTP User: `apikey`
- SMTP Password: `SG.xxxxx...` (API key)

**Mailgun:**
- SMTP Server: `smtp.mailgun.org`
- SMTP Port: `587`
- SMTP User: `postmaster@yourdomain.com`
- SMTP Password: `[your SMTP password]`

---

## Slack Alert Setup

### Create Slack Webhook

1. **Go to Slack Workspace**
   - Workspace Settings → Manage Apps

2. **Create New App**
   - "From scratch"
   - Name: "LLMscope"
   - Pick workspace

3. **Enable Incoming Webhooks**
   - Features → Incoming Webhooks → ON

4. **Add New Webhook**
   - Click "Add New Webhook to Workspace"
   - Select channel (e.g., #alerts)
   - Authorize

5. **Copy Webhook URL**
   - Format: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXX`
   - Paste into setup wizard

### Slack Alert Format

Each violation sends a rich message:
```
🚨 R1 Violation

Model: llama3
Provider: ollama
Latency: 3500.50ms
Deviation: 3.20σ
Mean: 2000.00ms
Std Dev: 500.00ms

[View Details] button → links to dashboard
```

Colors:
- **Red (#FF0000)** - R1 violations (spike/drop)
- **Orange (#FFA500)** - R2 violations (sustained shift)
- **Blue (#0099FF)** - R3 violations (trend)

---

## Files Changed

### Backend
- `app.py` - Complete rewrite with Phase 2 features

### Frontend
- `main.tsx` - Wraps dashboard with SetupWizard check
- `SetupWizard.jsx` - New 5-step setup flow (create as new file)
- `Dashboard_ollama_revB.jsx` - Next: will update to use DB violations

### Configuration
- `requirements.txt` - Already has `aiohttp` (for Slack webhooks)

---

## Deployment Checklist

### Before Deploy

- [ ] Update `app.py` with Phase 2 code
- [ ] Create `SetupWizard.jsx` component
- [ ] Update `main.tsx` to use SetupWizard
- [ ] Ensure `aiohttp` in requirements.txt
- [ ] Database migration (automatic on first run)

### After Deploy

1. **First-time users** see setup wizard
2. **Configure email or Slack** (or skip)
3. **Save settings** to database
4. **Dashboard loads** and starts monitoring
5. **Violations detected** and alerts sent

### Optional: Pre-configure via Env Vars

If you want to skip setup wizard, set env vars:
```bash
LLMSCOPE_API_KEY=dev-123
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxx
ALERT_EMAIL_FROM=alerts@gmail.com
ALERT_EMAIL_TO=team@company.com,ops@company.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Then delete `localStorage.llmscope_setup_complete` to re-run wizard, or it auto-skips.

---

## Next Steps (After Phase 2)

- [ ] Update Dashboard to pull violations from DB instead of calculating client-side
- [ ] Add violation detail modal with frozen stats
- [ ] Add acknowledge/resolve buttons
- [ ] Settings UI to tweak alert preferences after setup
- [ ] Violation history/analytics page
- [ ] Export violations as PDF reports
- [ ] Webhook alerts for custom integrations
- [ ] PagerDuty/Opsgenie integration for on-call

---

## Troubleshooting

### Email alerts not sending
- Check SMTP credentials in settings
- Verify Gmail app password (not regular password)
- Check that `enable_email_alerts = true`
- Check backend logs for SMTP errors

### Slack alerts not sending
- Verify webhook URL format
- Test webhook manually: `curl -X POST https://hooks.slack.com/... -d '{"text":"test"}'`
- Check `enable_slack_alerts = true`
- Verify webhook channel hasn't been deleted

### Setup wizard not showing
- Clear localStorage: `localStorage.clear()` in browser console
- Refresh page
- Or delete `llmscope_setup_complete` key specifically

### Violations not detecting
- Check if stats are calculating (wait 5+ minutes of data)
- Verify model/provider match
- Check if `alert_on_rule` includes the rule you expect
- Monitor logs for "Violation" entries

---

Good luck with Phase 2! 🚀