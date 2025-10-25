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
🧠 GPU Telemetry Support (Optional Feature)
Overview

LLMscope automatically reports real-time CPU, memory, and (when available) GPU temperatures for your local environment.
By default, only CPU and RAM metrics are available inside most Docker / WSL2 setups. GPU telemetry requires additional configuration.

✅ Included by Default

CPU Utilization (%) — via psutil.cpu_percent()

Memory Utilization (%) — via psutil.virtual_memory()

CPU Temperature (if supported) — via psutil.sensors_temperatures()

These values are available on all platforms, including Docker Desktop with WSL2.

⚙️ Optional: NVIDIA GPU Temperature

If you have an NVIDIA GPU (e.g., RTX 30-series) and want temperature reporting:

1️⃣ Install NVIDIA Container Toolkit (inside WSL2 or Linux)
sudo apt update
sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

2️⃣ Enable GPU passthrough in Docker Compose

In your docker-compose.yml, under the backend service, add:

deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]

3️⃣ Install NVML Python bindings

Add this line to your Dockerfile.backend (after RUN pip install psutil):

RUN pip install nvidia-ml-py3

4️⃣ Rebuild and restart
docker-compose up -d --build backend


When configured correctly, the /api/system endpoint will return:

{
  "gpuTemp": 47.0,
  "cpuTemp": 43.6,
  "cpu": 11.3,
  "memory": 58.7
}

⚠️ Note for Windows / WSL2 Users

If you’re running LLMscope inside Docker Desktop on Windows, GPU telemetry may appear as null due to limited hardware access through WSL2.
CPU and memory data remain accurate.

📦 Optional Local Mode (without Docker)

You can also run app.py directly on your Windows or Linux host with Python ≥3.10 installed.
In this mode, LLMscope has direct hardware access and will display GPU temps automatically if NVML is present.

💡 Tooltip / UI Message (for Dashboard)

GPU telemetry unavailable.
This system is running in a virtualized environment without GPU passthrough.
CPU and memory statistics remain active.
See the README section “GPU Telemetry Support” for enablement steps.

---
🧩 System Requirements & Hardware Compatibility
Component	Required	Notes	Status
CPU	✅ Yes	Used for latency measurement and system telemetry	Fully supported
Memory (RAM)	✅ Yes	Reported via psutil	Fully supported
GPU (NVIDIA / CUDA)	⚙️ Optional	Enables GPU temperature monitoring via NVML (nvidia-ml-py3)	Optional
Docker Desktop / Compose	✅ Yes	Required for containerized deployment	Fully supported
Python 3.10+	✅ Yes	Required for backend / FastAPI	Fully supported
WSL2 (Windows only)	⚠️ Optional	Works for CPU/RAM telemetry, limited GPU access	Partially supported
NVIDIA Container Toolkit	⚙️ Optional	Required for GPU passthrough inside Docker	Optional
Internet Access	⚙️ Optional	Required for online model benchmarking (OpenAI, Anthropic, etc.)	Optional
🧠 Notes

CPU/RAM telemetry works in all environments, including Docker on WSL2.

GPU telemetry requires an NVIDIA GPU and additional configuration.

GPU passthrough is disabled by default in Docker Desktop; see the GPU Telemetry Support
 section for setup instructions.

Running LLMscope natively (without Docker) provides full hardware sensor access automatically.
---