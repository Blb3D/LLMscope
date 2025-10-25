#!/usr/bin/env python3
"""
benchmark_suite.py — LLMscope Research Harness (Rev B)
Author: Brandan Baker (BLB3D Labs)
Assistant: GPT-5 (LLMscope Dev Partner)
Date: 2025-10-24

Purpose:
Run controlled latency and cognitive-load benchmarks across multiple models.
Results are logged to the LLMscope backend for SPC and CLI (Cognitive Load Index) analysis.
"""

import time
import json
import random
import aiohttp
import asyncio
from datetime import datetime

# === CONFIGURATION ===
LLMSCOPE_API = "http://localhost:8081/api/log"
API_KEY = "dev-123"  # default local key unless overridden
MODELS = [
    {"provider": "ollama", "name": "claude-3-opus"},
    {"provider": "openai", "name": "gpt-4o"},
    {"provider": "ollama", "name": "mistral"},
    {"provider": "ollama", "name": "gemma"},
]

# Prompt sets by complexity level
PROMPT_SETS = {
    "simple_recall": [
        "What is the capital of France?",
        "Name three prime numbers under 10.",
        "Who wrote The Odyssey?"
    ],
    "moderate_reasoning": [
        "If a train leaves Chicago at 60 mph and another leaves New York at 80 mph, where do they meet?",
        "Summarize the differences between photosynthesis and respiration.",
        "Explain why the sky appears blue in simple terms."
    ],
    "complex_reasoning": [
        "Write a short argument defending the use of open-source AI models.",
        "Simulate a debate between a philosopher and a mathematician about infinity.",
        "Describe how AI could apply Statistical Process Control in manufacturing."
    ],
    "high_load_creative": [
        "Write a 1500-word story about the invention of calculus.",
        "Generate a detailed plan for a colony on Mars with engineering constraints.",
        "Create a full-length poem about entropy in quantum systems."
    ]
}

# Estimated cost per token for simulation (replace with live API billing if available)
TOKEN_COST_IN = 0.00003
TOKEN_COST_OUT = 0.00006

# Number of iterations per prompt level
ITERATIONS = 3


async def run_prompt(session, model, category, prompt):
    """Run a single benchmark test and log it to LLMscope."""
    provider = model["provider"]
    model_name = model["name"]

    start_time = time.perf_counter()

    # Simulate or send to model API (replace this stub with real inference call)
    # Example: await call_openai_api(prompt, model_name)
    await asyncio.sleep(random.uniform(0.5, 3.0))  # simulate latency

    latency = time.perf_counter() - start_time
    tokens_in = random.randint(20, 200)
    tokens_out = random.randint(50, 500)
    cost = tokens_in * TOKEN_COST_IN + tokens_out * TOKEN_COST_OUT

    payload = {
        "provider": provider,
        "model": model_name,
        "latency": latency,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost": cost,
        "success": True,
        "endpoint": "benchmark_suite",
        "metadata": {
            "category": category,
            "prompt_excerpt": prompt[:60],
            "timestamp": datetime.utcnow().isoformat()
        }
    }

    async with session.post(LLMSCOPE_API, json=payload,
                            headers={"Authorization": f"Bearer {API_KEY}"}) as resp:
        if resp.status == 200:
            print(f"[✓] {model_name:<18} | {category:<20} | {latency:>6.2f}s")
        else:
            err = await resp.text()
            print(f"[!] Error {resp.status}: {err}")


async def main():
    print("🔭 Starting LLMscope Benchmark Suite (Rev B)\n")
    async with aiohttp.ClientSession() as session:
        for model in MODELS:
            for category, prompts in PROMPT_SETS.items():
                for _ in range(ITERATIONS):
                    prompt = random.choice(prompts)
                    try:
                        await run_prompt(session, model, category, prompt)
                    except Exception as e:
                        print(f"[!] Exception: {e}")
                    await asyncio.sleep(1.0)
    print("\n✅ Benchmarking complete — results posted to LLMscope backend.")


if __name__ == "__main__":
    asyncio.run(main())
