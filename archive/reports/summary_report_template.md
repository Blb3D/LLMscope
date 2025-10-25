# LLMscope — Run Summary Report (Template)

> **Version:** v2.1 • **Theme:** BLB3D Bronze/Black (#D37E3E / #1A0F08)  
> Replace the curly-brace placeholders during report generation.

---

## 1) Overview
- **Report ID:** {{ report_id }}
- **Generated At:** {{ generated_at }}
- **Run Window:** {{ run_window_start }} → {{ run_window_end }}
- **Sample Count:** {{ sample_count }}

---

## 2) Latency Snapshot
| Metric | Value |
|---|---|
| Min (ms) | {{ latency_min_ms }} |
| P50 (ms) | {{ latency_p50_ms }} |
| P90 (ms) | {{ latency_p90_ms }} |
| P95 (ms) | {{ latency_p95_ms }} |
| Max (ms) | {{ latency_max_ms }} |
| Mean (ms) | {{ latency_mean_ms }} |
| Std Dev (ms) | {{ latency_std_ms }} |

> Source: `Logs/chatgpt_speed_log.csv`

---

## 3) Throughput & Health
- **Samples / min:** {{ samples_per_min }}
- **Gaps detected:** {{ gaps_count }}
- **Nelson-rule alerts (if implemented):** {{ nelson_alerts_count }}

---

## 4) Trend & Distribution
The generation script should embed a **trend chart** (latency over time) and a **distribution chart** (histogram/PDF).  
When exporting HTML/PDF, inject images or inline Plotly HTML here.

**Trend (inline HTML or static image):**
{{ chart_trend_html_or_img }}

**Distribution (inline HTML or static image):**
{{ chart_distribution_html_or_img }}

---

## 5) System Footprint (Optional)
- **RAM (MB):** {{ ram_mb }}
- **CPU (%):** {{ cpu_pct }}
- **Sampler PID:** {{ sampler_pid }}

> Only populate if the diag module is enabled.

---

## 6) Notes
{{ notes_md }}

---

### Appendix A — Generation Parameters
```json
{{ generation_params_json }}
```
