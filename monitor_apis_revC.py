"""
monitor_apis_revC.py – LLMscope Real API Monitor (Enhanced Telemetry)
---------------------------------------------------------------------------
Continuously pings Ollama and logs rich telemetry data
to the LLMscope backend for SPC visualization and violation analysis.
"""

import os
import time
import asyncio
import aiohttp
from datetime import datetime

# === CONFIGURATION ==========================================================
LLMSCOPE_API_BASE = os.getenv("LLMSCOPE_API_BASE", "http://llmscope_api:8000")
API_KEY = os.getenv("LLMSCOPE_API_KEY", "dev-123")

USE_OLLAMA = os.getenv("USE_OLLAMA", "false").lower() == "true"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
MONITOR_INTERVAL = int(os.getenv("MONITOR_INTERVAL", "2"))

TEST_PROMPT = "Write one sentence explaining what LLMscope does."
# ============================================================================


async def test_ollama(session):
    """Send test prompt to Ollama and measure latency + capture full telemetry."""
    start = time.perf_counter()
    try:
        async with session.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": TEST_PROMPT, "stream": False},
            timeout=120
        ) as resp:
            data = await resp.json()
            elapsed = time.perf_counter() - start
            
            # Extract Ollama's telemetry
            total_duration_ns = data.get("total_duration", 0)
            load_duration_ns = data.get("load_duration", 0)
            prompt_eval_duration_ns = data.get("prompt_eval_duration", 0)
            eval_duration_ns = data.get("eval_duration", 0)
            prompt_eval_count = data.get("prompt_eval_count", 0)
            eval_count = data.get("eval_count", 0)
            
            # Convert nanoseconds to milliseconds
            total_duration_ms = total_duration_ns / 1_000_000
            load_duration_ms = load_duration_ns / 1_000_000
            prompt_eval_duration_ms = prompt_eval_duration_ns / 1_000_000
            eval_duration_ms = eval_duration_ns / 1_000_000

            print(f"✅ Ollama ({OLLAMA_MODEL}): {elapsed:.3f}s total | {eval_count} tokens generated")

            return {
                "provider": "ollama",
                "model": OLLAMA_MODEL,
                "latency_ms": round(elapsed * 1000, 3),
                "timestamp": datetime.utcnow().isoformat(),
                "success": True,
                # Enhanced telemetry from Ollama
                "total_duration_ms": round(total_duration_ms, 3),
                "load_duration_ms": round(load_duration_ms, 3),
                "prompt_eval_duration_ms": round(prompt_eval_duration_ms, 3),
                "eval_duration_ms": round(eval_duration_ms, 3),
                "prompt_eval_count": prompt_eval_count,
                "eval_count": eval_count,
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
            "error_message": str(e)
        }


async def post_result(session, result):
    """Post result to the LLMscope backend /api/stats endpoint."""
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
    """Main loop: runs indefinitely, calling Ollama every MONITOR_INTERVAL seconds."""
    async with aiohttp.ClientSession() as session:
        print("🚀 Starting LLMscope Monitor (Rev C – Enhanced Telemetry)")
        print(f"🔗 Backend API: {LLMSCOPE_API_BASE}")
        print(f"🤖 Ollama model: {OLLAMA_MODEL}")
        print(f"⏱️ Interval: {MONITOR_INTERVAL}s")

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