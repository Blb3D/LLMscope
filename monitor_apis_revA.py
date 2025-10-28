"""
monitor_apis_revD.py – LLMscope Monitor with Full Telemetry
---------------------------------------------------------------------------
Captures Ollama metrics, system metrics, GPU info, and prompt hashing.
"""

import os
import time
import asyncio
import aiohttp
import psutil
import hashlib
from datetime import datetime

# === CONFIGURATION ==========================================================
LLMSCOPE_API_BASE = os.getenv("LLMSCOPE_API_BASE", "http://llmscope_api:8000")
API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-123")

USE_OLLAMA = os.getenv("USE_OLLAMA", "false").lower() == "true"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
MONITOR_INTERVAL = int(os.getenv("MONITOR_INTERVAL", "2"))

TEST_PROMPT = "Write one sentence explaining what LLMscope does."
PROMPT_HASH = hashlib.sha256(TEST_PROMPT.encode()).hexdigest()[:8]

# ============================================================================

def get_system_telemetry():
    """Capture CPU, Memory, and GPU metrics."""
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory().percent
        gpu = 0
        gpu_memory = 0
        
        # Try NVIDIA GPU
        try:
            from pynvml import nvmlInit, nvmlDeviceGetHandleByIndex, nvmlDeviceGetUtilizationRates, nvmlDeviceGetMemoryInfo
            try:
                nvmlInit()
                handle = nvmlDeviceGetHandleByIndex(0)
                util = nvmlDeviceGetUtilizationRates(handle)
                mem_info = nvmlDeviceGetMemoryInfo(handle)
                gpu = util.gpu
                gpu_memory = (mem_info.used / mem_info.total) * 100
            except Exception as gpu_err:
                # NVIDIA GPU init failed, skip
                pass
        except ImportError:
            # pynvml not installed, skip
            pass
        
        return {
            "cpu_percent": round(cpu, 2),
            "memory_percent": round(memory, 2),
            "gpu_percent": round(gpu, 2),
            "gpu_memory_percent": round(gpu_memory, 2),
        }
    except Exception as e:
        print(f"⚠️ Error getting system telemetry: {e}")
        return {
            "cpu_percent": 0,
            "memory_percent": 0,
            "gpu_percent": 0,
            "gpu_memory_percent": 0,
        }


async def test_ollama(session):
    """Send test prompt to Ollama and capture all telemetry."""
    start = time.perf_counter()
    sys_telemetry = get_system_telemetry()
    
    try:
        async with session.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": TEST_PROMPT, "stream": False},
            timeout=120
        ) as resp:
            data = await resp.json()
            elapsed = time.perf_counter() - start
            
            # Ollama telemetry (nanoseconds to milliseconds)
            total_duration_ms = data.get("total_duration", 0) / 1_000_000
            load_duration_ms = data.get("load_duration", 0) / 1_000_000
            prompt_eval_duration_ms = data.get("prompt_eval_duration", 0) / 1_000_000
            eval_duration_ms = data.get("eval_duration", 0) / 1_000_000
            prompt_eval_count = data.get("prompt_eval_count", 0)
            eval_count = data.get("eval_count", 0)

            print(f"✅ Ollama ({OLLAMA_MODEL}): {elapsed:.3f}s | {eval_count} tokens | GPU: {sys_telemetry['gpu_percent']:.1f}%")

            return {
                "provider": "ollama",
                "model": OLLAMA_MODEL,
                "latency_ms": round(elapsed * 1000, 3),
                "timestamp": datetime.utcnow().isoformat(),
                "success": True,
                # Ollama metrics
                "total_duration_ms": round(total_duration_ms, 3),
                "load_duration_ms": round(load_duration_ms, 3),
                "prompt_eval_duration_ms": round(prompt_eval_duration_ms, 3),
                "eval_duration_ms": round(eval_duration_ms, 3),
                "prompt_eval_count": prompt_eval_count,
                "eval_count": eval_count,
                # System metrics
                "cpu_percent": sys_telemetry["cpu_percent"],
                "memory_percent": sys_telemetry["memory_percent"],
                "gpu_percent": sys_telemetry["gpu_percent"],
                "gpu_memory_percent": sys_telemetry["gpu_memory_percent"],
                # Prompt tracking
                "prompt_hash": PROMPT_HASH,
                "prompt_text": TEST_PROMPT,
            }
    except Exception as e:
        elapsed = time.perf_counter() - start
        print(f"❌ Ollama error: {e}")
        return {
            "provider": "ollama",
            "model": OLLAMA_MODEL,
            "latency_ms": round(elapsed * 1000, 3),
            "timestamp": datetime.utcnow().isoformat(),
            "success": False,
            "error_message": str(e),
            "cpu_percent": sys_telemetry["cpu_percent"],
            "memory_percent": sys_telemetry["memory_percent"],
            "gpu_percent": sys_telemetry["gpu_percent"],
            "gpu_memory_percent": sys_telemetry["gpu_memory_percent"],
        }


async def post_result(session, result):
    """Post result to LLMscope backend."""
    try:
        async with session.post(
            f"{LLMSCOPE_API_BASE}/api/stats",
            json=result,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
        ) as resp:
            if resp.status == 200:
                print(f"📨 POST /api/stats -> 200 OK")
            else:
                err = await resp.text()
                print(f"⚠️ Log failed ({resp.status}): {err[:120]}")
    except Exception as e:
        print(f"⚠️ Error posting to backend: {e}")


async def monitor_loop():
    """Main monitoring loop."""
    async with aiohttp.ClientSession() as session:
        print("🚀 Starting LLMscope Monitor (Rev D – Full Telemetry)")
        print(f"🔗 Backend API: {LLMSCOPE_API_BASE}")
        print(f"🤖 Ollama model: {OLLAMA_MODEL}")
        print(f"⏱️ Interval: {MONITOR_INTERVAL}s")
        print(f"📝 Prompt hash: {PROMPT_HASH}")

        while True:
            print(f"\n🔄 [{datetime.utcnow().strftime('%H:%M:%S')}] Running monitoring cycle...")
            if USE_OLLAMA:
                result = await test_ollama(session)
                await post_result(session, result)
            else:
                print("⚠️ USE_OLLAMA is set to false – skipping Ollama test.")
            await asyncio.sleep(MONITOR_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(monitor_loop())
    except KeyboardInterrupt:
        print("\n🛑 Monitoring stopped manually.")