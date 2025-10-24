"""
monitor_apis_revA.py — LLMscope Real API Monitor (Ollama-Enabled)
-----------------------------------------------------------------
This script runs inside the llmscope_monitor Docker container.
It measures latency and token usage from local Ollama models and
sends that data to the LLMscope backend for visualization.

Author: BLB3D Labs
Version: Rev A — Phase 6 Preparation
"""

import os
import time
import asyncio
import aiohttp
from datetime import datetime

# === CONFIGURATION ==========================================================

# The backend API (inside Docker this resolves automatically)
LLMSCOPE_API_BASE = os.getenv("LLMSCOPE_API_BASE", "http://backend:8000")

# Ollama settings
USE_OLLAMA = os.getenv("USE_OLLAMA", "false").lower() == "true"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")   # default single model

# Monitoring interval (seconds)
MONITOR_INTERVAL = int(os.getenv("MONITOR_INTERVAL", "30"))

# Test prompt used for latency measurement
TEST_PROMPT = "Write one sentence explaining what LLMscope does."

# ============================================================================


async def test_ollama(session):
    """
    Send a short test prompt to Ollama and measure latency + token count.
    Returns a result dictionary that can be logged to LLMscope backend.
    """
    start = time.perf_counter()
    try:
        async with session.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": TEST_PROMPT, "stream": False},
            timeout=30
        ) as resp:
            data = await resp.json()
            elapsed = time.perf_counter() - start

            # Estimate token count (approximate word count)
            output_text = data.get("response", "")
            tokens_out = len(output_text.split())

            print(f"✅ Ollama ({OLLAMA_MODEL}): {elapsed:.3f}s | {tokens_out} tokens")
            return {
                "provider": "ollama",
                "model": OLLAMA_MODEL,
                "latency": elapsed,
                "tokens_in": len(TEST_PROMPT.split()),
                "tokens_out": tokens_out,
                "success": True
            }
    except Exception as e:
        elapsed = time.perf_counter() - start
        print(f"❌ Ollama error: {e}")
        return {
            "provider": "ollama",
            "model": OLLAMA_MODEL,
            "latency": elapsed,
            "tokens_in": len(TEST_PROMPT.split()),
            "tokens_out": 0,
            "success": False,
            "error_message": str(e)
        }


async def post_result(session, result):
    """
    Post a result dictionary to the LLMscope backend /api/log endpoint.
    """
    try:
        async with session.post(
            f"{LLMSCOPE_API_BASE}/api/log",
            json=result,
            headers={"Authorization": "Bearer dev-123"},
        ) as resp:
            if resp.status == 200:
                print(f"📨 Logged to backend: {result['provider']} ({result['latency']:.3f}s)")
            else:
                err = await resp.text()
                print(f"⚠️ Log failed ({resp.status}): {err[:100]}")
    except Exception as e:
        print(f"⚠️ Error posting to backend: {e}")


async def monitor_loop():
    """
    Main loop: runs indefinitely, calling Ollama every MONITOR_INTERVAL seconds.
    """
    async with aiohttp.ClientSession() as session:
        print("🚀 Starting LLMscope Monitor (Rev A – Ollama enabled)")
        print(f"🔗 Backend API: {LLMSCOPE_API_BASE}")
        print(f"🤖 Ollama model: {OLLAMA_MODEL}")
        print(f"⏱️ Interval: {MONITOR_INTERVAL}s")

        while True:
            print(f"\n🔍 [{datetime.utcnow().strftime('%H:%M:%S')}] Running monitoring cycle...")

            if USE_OLLAMA:
                result = await test_ollama(session)
                await post_result(session, result)
            else:
                print("⚠️ USE_OLLAMA is set to false — skipping Ollama test.")

            await asyncio.sleep(MONITOR_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(monitor_loop())
    except KeyboardInterrupt:
        print("\n🛑 Monitoring stopped manually.")
