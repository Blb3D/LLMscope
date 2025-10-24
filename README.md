# 🧱 LLMscope v2.1

Local-first AI performance dashboard

## Overview

LLMscope lets you measure and visualize AI latency locally with no cloud telemetry.  
It uses a CLI sampler that writes to `Logs/chatgpt_speed_log.csv` and a FastAPI + Plotly dashboard to display live metrics.

## Run the Sampler

```bash
python chatgpt_speed_monitor_v1.py

---

## 🔍 Featured Case Study: Cognitive Load Latency Spike  
**Captured Live — October 24, 2025**

> *When prompted to write a 1500-page story, LLMscope detected a 3σ latency surge —  
revealing the hidden cost of cognitive load in large language models.*

[![Cognitive Load Latency Spike – LLMscope Dashboard](docs/images/cognitive_load_spike_thumb.png)](docs/CASE_STUDY_Cognitive_Load_Spike_RevA.md)

**Key Findings**
- Latency spiked from baseline **2 s → 9 s**, then recovered dynamically  
- SPC analytics triggered a **Nelson Rule 1 violation (> 3σ)**  
- Confirmed detection of reasoning-induced latency, not network noise  

**→ [Read Full Case Study →](docs/CASE_STUDY_Cognitive_Load_Spike_RevA.md)**  

---

