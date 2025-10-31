---
name: "P0: Copilot Cognitive Load Analysis"
about: Update AI Copilot prompts to include cognitive load telemetry
title: "[P0] Copilot Cognitive Load Analysis"
labels: ["P0", "enhancement", "v1.0.0", "Phase 0", "AI"]
assignees: []
---

## Description

Update the AI Copilot backend prompts to include Ollama cognitive load metrics (total_duration, eval_duration, etc.) in violation analysis.

## Acceptance Criteria

- [ ] Copilot prompts reference cognitive load where applicable
- [ ] Three explanation modes preserved: Technical, Business, Remediation
- [ ] Telemetry context included in prompt construction
- [ ] Analysis mentions cognitive metrics when relevant to violation

## Technical Details

**Backend:** Update `backend/copilot_service.py` or equivalent:

- Include telemetry fields in prompt template
- Format metrics in human-readable way
- Preserve existing explanation type logic

**Example prompt addition:**
```
Recent telemetry shows:
- Total duration: {total_duration}ms
- Eval duration: {eval_duration}ms
- Tokens/sec: {tokens_per_sec}
```

**Feature Flag:** `FEATURE_COPILOT_COGNITIVE_LOAD=true`

## Testing

- [ ] Unit test: Prompt contains telemetry when flag enabled
- [ ] Unit test: Prompt works without telemetry (graceful degradation)
- [ ] Golden output test: Sample violation → expected analysis mentioning cognitive load
- [ ] Manual test: Trigger violation, verify copilot mentions relevant metrics

## Related

- Roadmap: `docs/v1.0.0_ROADMAP.md` (Phase 0, item 2)
- AI Copilot Design: `docs/AI_COPILOT_DESIGN.md`

## Definition of Done

- Code complete with tests passing
- Feature flag documented
- Example outputs captured in docs
- PR approved and merged to `v2-refactor`
