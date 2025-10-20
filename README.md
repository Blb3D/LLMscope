# 🧱 LLMscope v2.1

Local-first AI performance dashboard

## Overview

LLMscope lets you measure and visualize AI latency locally with no cloud telemetry.  
It uses a CLI sampler that writes to `Logs/chatgpt_speed_log.csv` and a FastAPI + Plotly dashboard to display live metrics.

## Run the Sampler

```bash
python chatgpt_speed_monitor_v1.py
