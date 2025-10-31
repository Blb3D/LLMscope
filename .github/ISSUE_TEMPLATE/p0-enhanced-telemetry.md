---
name: "P0: Enhanced Telemetry in UI"
about: Add Ollama cognitive load metrics to System Status display
title: "[P0] Enhanced Telemetry in UI"
labels: ["P0", "enhancement", "v1.0.0", "Phase 0"]
assignees: []
---

## Description

Add Ollama-specific cognitive load metrics to the System Status section of the dashboard UI.

## Acceptance Criteria

- [ ] Ollama metrics visible in UI: `total_duration`, `eval_duration`, `prompt_eval`, `eval_count`, `tokens/sec`
- [ ] Backend → frontend state wiring complete
- [ ] Null-safe rendering (no errors when metrics unavailable)
- [ ] Values match backend JSON response
- [ ] No console errors

## Technical Details

**Backend:** Ensure `/api/stats` or similar endpoint includes Ollama telemetry fields.

**Frontend:** Update `SystemMetrics.jsx` or equivalent to:
- Fetch and display new fields
- Handle missing/null values gracefully
- Format values appropriately (e.g., duration in ms, tokens/sec as rate)

**Feature Flag:** `FEATURE_ENHANCED_TELEMETRY=true`

## Testing

- [ ] Snapshot test for UI component
- [ ] Integration test verifying fields render correctly
- [ ] Manual test: Start system, verify metrics appear in UI

## Related

- Roadmap: `docs/v1.0.0_ROADMAP.md` (Phase 0, item 1)
- Step-by-step: `docs/v1.0.0_STEP_BY_STEP_START.md`

## Definition of Done

- Code complete with tests passing
- Feature flag documented
- PR approved and merged to `v2-refactor`
