# LLMscope Phase 2 - Development Roadmap

**Status:** Phase 1 Complete ✅  
**Current Version:** v1.0.0 (Stable)  
**Target:** Phase 2 Production Ready

---

## Phase 2 Goals

Complete the violation reporting system with full telemetry context, making violations actionable and debuggable.

---

## Epic 1: Violation Detail Modal Enhancement

### Story 1.1: Display Ollama Telemetry
**Priority:** HIGH  
**Effort:** 2 hours

**What:** When user clicks a violation, show detailed Ollama metrics in the modal.

**Data to Display:**
```
Ollama Metrics:
- Total Duration: X.XXXs
- Load Duration: X.XXXs (model load time)
- Prompt Eval Duration: X.XXXs (time to process prompt)
- Eval Duration: X.XXXs (time to generate response)
- Prompt Tokens: N
- Response Tokens: N
- Tokens/Second: N (eval_count / eval_duration_ms)
```

**Files to Modify:**
- `Dashboard_ollama_revB.jsx` - Add telemetry section to modal
- `app.py` - Already returning these fields in `/api/stats/spc`

**Implementation Notes:**
- Add new section in modal: "Ollama Telemetry"
- Format durations as milliseconds with 3 decimals
- Calculate tokens/sec = eval_count / (eval_duration_ms / 1000)

---

### Story 1.2: Enhanced Context Table
**Priority:** HIGH  
**Effort:** 1 hour

**What:** Improve the context table (±10 points) to show more insight.

**Current Columns:**
- Time
- Latency
- Deviation
- Status

**Add Columns:**
- Token Count (eval_count)
- Duration Breakdown (eval_duration_ms)
- CPU% at that point
- GPU% at that point

**Files to Modify:**
- `Dashboard_ollama_revB.jsx` - Expand context table

---

### Story 1.3: Mini-Chart Zoom View
**Priority:** MEDIUM  
**Effort:** 2 hours

**What:** Show a zoomed chart of the violation and its context (like a "traffic camera" of the incident).

**Approach:**
- Create a small chart showing ±30 points around violation
- Highlight the violation point in red
- Show mean/UCL/LCL for that mini-window
- Use same Recharts component scaled down

**Files to Modify:**
- `Dashboard_ollama_revB.jsx` - Add mini-chart to modal

---

## Epic 2: Violation Logging & Persistence

### Story 2.1: Database Persistence
**Priority:** MEDIUM  
**Effort:** 2 hours

**What:** Store violations in database so they survive page refresh.

**New Table:**
```sql
CREATE TABLE violations (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    model TEXT,
    provider TEXT,
    rule TEXT,
    latency_ms REAL,
    deviation_sigma REAL,
    mean REAL,
    std_dev REAL,
    ucl REAL,
    lcl REAL,
    cpu_percent REAL,
    memory_percent REAL,
    gpu_percent REAL,
    eval_count INTEGER,
    eval_duration_ms REAL,
    prompt_hash TEXT,
    created_at TEXT
)
```

**Files to Modify:**
- `app.py` - Add `/api/violations` endpoints (GET, POST)
- `Dashboard_ollama_revB.jsx` - Load violations from API on mount

---

### Story 2.2: Violation Export
**Priority:** MEDIUM  
**Effort:** 1.5 hours

**What:** Export violations as CSV/PDF with full telemetry.

**CSV Format:**
```
timestamp,model,rule,latency_ms,deviation_sigma,mean,std_dev,ucl,lcl,cpu%,gpu%,tokens,duration_ms
2025-10-28T12:34:56.789,llama3,R1,8.5,3.2,2.0,2.1,8.3,0.0,45,85,42,2100
```

**Files to Modify:**
- `Dashboard_ollama_revB.jsx` - Update export functions to include telemetry

---

## Epic 3: Violation Filtering & Analysis

### Story 3.1: Violation Rules Legend
**Priority:** LOW  
**Effort:** 1 hour

**What:** Add a collapsible panel showing Nelson Rules explanation.

**Content:**
- R1: Point beyond 3σ
- R2: 9+ points on same side
- R3: 6+ points trending
- etc.

**Files to Modify:**
- `Dashboard_ollama_revB.jsx` - Add rules panel in sidebar

---

### Story 3.2: Filter Violations by Rule
**Priority:** MEDIUM  
**Effort:** 1.5 hours

**What:** Add checkbox filter to violations log.

**UI:**
```
Filter by Rule:
☑ R1 ☑ R2 ☑ R3 (etc.)
```

**Implementation:**
- Frontend-side filtering (no API changes needed)
- Checkboxes in violations panel header

**Files to Modify:**
- `Dashboard_ollama_revB.jsx` - Add filter state and logic

---

## Epic 4: Performance & Polish

### Story 4.1: Violation Alert Notifications
**Priority:** LOW  
**Effort:** 1 hour

**What:** Toast notifications when new violations occur (optional).

**Files to Modify:**
- `Dashboard_ollama_revB.jsx` - Add toast library integration

---

### Story 4.2: Telemetry Metrics Summary Card
**Priority:** LOW  
**Effort:** 1 hour

**What:** Dashboard card showing aggregate stats (e.g., "X violations in last hour, avg latency Y, etc.")

**Files to Modify:**
- `Dashboard_ollama_revB.jsx` - Add summary card to sidebar

---

## Implementation Order (Recommended)

**Day 1:**
1. Story 1.1 - Ollama Telemetry display (quick win)
2. Story 1.2 - Enhanced context table

**Day 2:**
3. Story 2.1 - Database persistence
4. Story 2.2 - Violation export

**Day 3:**
5. Story 1.3 - Mini-chart zoom
6. Story 3.2 - Filter by rule

**Polish/Optional:**
7. Story 3.1 - Rules legend
8. Story 4.1 - Notifications
9. Story 4.2 - Summary card

---

## Data Flow for Violations

**Current (Phase 1):**
```
Ollama → Monitor → Backend → Frontend (display, no persistence)
```

**Phase 2:**
```
Ollama → Monitor → Backend → Database
                          ↓
                      Frontend (display, persist, analyze, export)
```

---

## Testing Checklist

- [ ] Click violation → modal shows all telemetry
- [ ] Context table displays ±10 points with new columns
- [ ] Mini-chart renders correctly
- [ ] Violations persist after page refresh
- [ ] CSV export includes all fields
- [ ] Filter by rule works correctly
- [ ] Rules legend is accurate and helpful

---

## Notes

- Keep violations in-memory during session for speed, persist to DB for history
- Consider adding a "Clear violations" button for testing
- Think about adding violation severity levels in UI (Critical/Warning/Info)
- Consider hourly rollup/summary stats for performance with large datasets

---

## Files Summary

**Modified:**
- `Dashboard_ollama_revB.jsx` - Main UI changes
- `app.py` - New endpoints for violations CRUD

**New (Optional):**
- `SPCChart_mini.jsx` - Reusable mini-chart component

---

Good luck tomorrow! 🚀