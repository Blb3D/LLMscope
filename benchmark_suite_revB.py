#!/usr/bin/env python3
"""
benchmark_suite_revB.py — LLMscope Research Harness (Rev B)
Author: Brandan Baker (BLB3D Labs)
Assistant: GPT-5 (LLMscope Dev Partner)
Date: 2025-10-24

Features:
- Port auto-detection: tries localhost:8000 then localhost:8081 (your compose maps 8081:8000)
- Modes: --mode simulated (default) or --mode ollama (live)
- Ollama auto-discovery: pulls all installed models via /api/tags
- 5 prompt tiers, 30 samples each for statistical relevance
- Logs to LLMscope /api/log with provider/model/latency/tokens/cost/metadata
- Graceful fallback: if backend or Ollama unreachable, reverts to simulated
- Stubs scaffolded for future providers (OpenAI, Anthropic, Gemini, AWS)
"""

import argparse
import asyncio
import json
import random
import time
from datetime import datetime, UTC

import aiohttp


# ===== Config =====
DEFAULT_BACKEND_PORTS = [8000, 8081]  # prefer 8000, fallback 8081; we’ll probe both
OLLAMA_URL = "http://localhost:11434"
OLLAMA_TAGS = f"{OLLAMA_URL}/api/tags"
OLLAMA_GENERATE = f"{OLLAMA_URL}/api/generate"

# cost estimates (tweak when you add real API billing)
TOKEN_COST_IN = 0.00000  # local ollama has no API cost, keep 0
TOKEN_COST_OUT = 0.00000

# number of samples per tier per model (user asked for 30)
SAMPLES_PER_TIER = 30

# prompt tiers (5)
PROMPT_SETS = {
    "simple_recall": [
        "What is the capital of France?",
        "Name three prime numbers under 20.",
        "Who wrote The Odyssey?",
        "What is 12 * 13?",
        "Define inertia in one sentence."
    ],
    "moderate_reasoning": [
        "If a train leaves Chicago at 60 mph and another leaves NYC at 80 mph heading toward each other, explain how you'd compute time to meet (no final number needed).",
        "Summarize the difference between photosynthesis and cellular respiration.",
        "Explain, step by step, why the sky appears blue.",
        "Compare arrays and linked lists in terms of memory and performance.",
        "When should a team choose eventual consistency over strong consistency? Give one example."
    ],
    "complex_reasoning": [
        "Simulate a short debate between a philosopher and a mathematician about the nature of infinity. Provide at least 3 exchanges.",
        "Given an e-commerce system, propose an indexing strategy balancing write throughput and analytical queries. Justify tradeoffs.",
        "Describe how Statistical Process Control can be applied to LLM latency monitoring and why Nelson Rules matter.",
        "Design a simple rate limiter and explain how you'd test it under variable network jitter.",
        "Explain CAP theorem and map it to a multi-region chat app with read replicas."
    ],
    "high_load_creative": [
        "Write ~500 words of a historical fiction vignette about the invention of calculus, blending Leibniz and Newton perspectives.",
        "Draft a detailed plan for a first-month Mars outpost (habitat, power, water, comms).",
        "Produce a structured outline for a 10-chapter book on AI reliability engineering.",
        "Write a technical poem that explains entropy using analogies a high-schooler would grasp.",
        "Create a product spec for a self-hosted LLM monitoring tool with SPC and Nelson rules."
    ],
    "extended_context": [
        # long context: we’ll repeat a base text to stress attention; models differ in window but it still stresses reasoning
        ("You are given background notes about AI observability, SPC, Nelson rules, network jitter, token throughput, "
         "GPU clocks, and prompt complexity. Using this background, answer the query that follows with specific, "
         "testable steps. Notes: SPC detects special-cause variation using mean (μ) and sigma (σ). Nelson Rules 1–8 "
         "capture points beyond 3σ, trends, oscillations, and clustering. Latency emerges from network, queueing, and "
         "cognitive load during token generation. Cost correlates with tokens and provider pricing. Self-hosting improves "
         "privacy; multi-provider comparisons need unified metrics. ") * 12  # repeat to extend context
    ]
}


# ===== Helpers =====
async def detect_backend_base(session: aiohttp.ClientSession) -> str | None:
    """Probe ports to find the running backend; return base URL or None."""
    for port in DEFAULT_BACKEND_PORTS:
        url = f"http://localhost:{port}/health"
        try:
            async with session.get(url, timeout=3) as r:
                if r.status < 500:
                    # assume health exists or returns 200/404—either way, port is open
                    # final base is /api/log on same port
                    return f"http://localhost:{port}"
        except Exception:
            continue
    return None


async def ensure_backend_api(session: aiohttp.ClientSession) -> str | None:
    base = await detect_backend_base(session)
    return base


async def get_ollama_models(session: aiohttp.ClientSession) -> list[str]:
    """Return list of installed ollama model names."""
    try:
        async with session.get(OLLAMA_TAGS, timeout=5) as r:
            if r.status == 200:
                data = await r.json()
                models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                return models
    except Exception:
        pass
    return []


def est_tokens_from_text(txt: str) -> int:
    # crude heuristic: ~4 chars per token
    return max(1, int(len(txt) / 4))


def build_payload(provider: str,
                  model: str,
                  latency: float,
                  tokens_in: int,
                  tokens_out: int,
                  cost: float,
                  category: str,
                  prompt: str,
                  mode: str) -> dict:
    return {
        "provider": provider,
        "model": model,
        "latency": float(latency),
        "tokens_in": int(tokens_in),
        "tokens_out": int(tokens_out),
        "cost": float(cost),
        "success": True,
        "endpoint": "benchmark_suite_revB",
        "metadata": {
            "category": category,
            "mode": mode,
            "prompt_excerpt": prompt[:120],
            "timestamp": datetime.now(UTC).isoformat()
        }
    }


async def post_log(session: aiohttp.ClientSession, base: str, api_key: str, payload: dict):
    url = f"{base}/api/log"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
    async with session.post(url, json=payload, headers=headers, timeout=8) as r:
        if r.status != 200:
            txt = await r.text()
            raise RuntimeError(f"Log failed {r.status}: {txt}")


async def run_simulated(session: aiohttp.ClientSession,
                        base: str,
                        api_key: str,
                        models: list[str],
                        samples_per_tier: int):
    print("🧪 Running SIMULATED mode…")
    for model in models:
        for category, prompts in PROMPT_SETS.items():
            for i in range(samples_per_tier):
                prompt = random.choice(prompts) if isinstance(prompts, list) else prompts
                start = time.perf_counter()
                await asyncio.sleep(random.uniform(0.5, 3.0))
                latency = time.perf_counter() - start
                tokens_in = est_tokens_from_text(prompt)
                # generate synthetic output size by category
                mult = {
                    "simple_recall": 40,
                    "moderate_reasoning": 120,
                    "complex_reasoning": 220,
                    "high_load_creative": 600,
                    "extended_context": 800
                }[category]
                tokens_out = random.randint(mult - mult // 4, mult + mult // 4)
                cost = tokens_in * TOKEN_COST_IN + tokens_out * TOKEN_COST_OUT
                payload = build_payload(
                    provider="simulated",
                    model=model,
                    latency=latency,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                    cost=cost,
                    category=category,
                    prompt=prompt,
                    mode="simulated"
                )
                try:
                    await post_log(session, base, api_key, payload)
                    print(f"[✓] SIM | {model:<20} | {category:<20} | {latency:>5.2f}s")
                except Exception as e:
                    print(f"[!] Log error: {e}")
                await asyncio.sleep(0.2)


async def run_ollama_once(session: aiohttp.ClientSession, model: str, prompt: str) -> tuple[str, int, int]:
    """
    Call Ollama /api/generate (non-streaming) and return (response_text, prompt_tokens, output_tokens).
    We'll use prompt_eval_count/eval_count when present; otherwise estimate tokens.
    """
    body = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        # keep temperature modest for reproducibility across runs
        "options": {"temperature": 0.7}
    }
    async with session.post(OLLAMA_GENERATE, json=body, timeout=180) as r:
        txt = await r.text()
        if r.status != 200:
            raise RuntimeError(f"Ollama {model} error {r.status}: {txt}")
        data = json.loads(txt)
        response = data.get("response", "") or ""
        # token accounting (best effort; fields differ by version)
        prompt_tok = data.get("prompt_eval_count")
        output_tok = data.get("eval_count")
        if prompt_tok is None:
            prompt_tok = est_tokens_from_text(prompt)
        if output_tok is None:
            output_tok = est_tokens_from_text(response)
        return response, int(prompt_tok), int(output_tok)


async def run_ollama(session: aiohttp.ClientSession,
                     base: str,
                     api_key: str,
                     models: list[str],
                     samples_per_tier: int):
    print("🤖 Running OLLAMA LIVE mode…")
    # quick connectivity check
    try:
        async with session.get(OLLAMA_TAGS, timeout=4) as r:
            if r.status != 200:
                raise RuntimeError("Ollama is not responding")
    except Exception as e:
        print(f"[!] Ollama unreachable ({e}); falling back to SIMULATED.")
        await run_simulated(session, base, api_key, models, samples_per_tier)
        return

    for model in models:
        for category, prompts in PROMPT_SETS.items():
            for i in range(samples_per_tier):
                prompt = random.choice(prompts) if isinstance(prompts, list) else prompts
                start = time.perf_counter()
                try:
                    response_text, t_in, t_out = await run_ollama_once(session, model, prompt)
                    latency = time.perf_counter() - start
                    cost = t_in * TOKEN_COST_IN + t_out * TOKEN_COST_OUT  # zero by default
                    payload = build_payload(
                        provider="ollama",
                        model=model,
                        latency=latency,
                        tokens_in=t_in,
                        tokens_out=t_out,
                        cost=cost,
                        category=category,
                        prompt=prompt,
                        mode="ollama"
                    )
                    await post_log(session, base, api_key, payload)
                    print(f"[✓] LIVE| {model:<20} | {category:<20} | {latency:>5.2f}s | tok {t_in}/{t_out}")
                except Exception as e:
                    print(f"[!] Ollama call failed for {model} ({category}): {e}")
                await asyncio.sleep(0.2)


# ===== Future Providers (scaffold) =====
# async def run_openai(...): pass
# async def run_anthropic(...): pass
# async def run_gemini(...): pass
# async def run_bedrock(...): pass


async def main():
    parser = argparse.ArgumentParser(description="LLMscope Benchmark Suite Rev B")
    parser.add_argument("--mode", choices=["simulated", "ollama"], default="simulated",
                        help="Run in 'simulated' (default) or 'ollama' live mode.")
    parser.add_argument("--samples", type=int, default=SAMPLES_PER_TIER,
                        help="Samples per tier per model (default 30).")
    parser.add_argument("--api-key", type=str, default="", help="Bearer token for LLMscope (default empty).")
    parser.add_argument("--discover", action="store_true",
                        help="Force re-discovery of models from Ollama /api/tags (on by default).")
    args = parser.parse_args()

    async with aiohttp.ClientSession() as session:
        base = await ensure_backend_api(session)
        if not base:
            print("[!] Could not reach LLMscope backend on ports 8000 or 8081. Falling back to SIMULATED, buffering logs to console only.")
        else:
            print(f"🔌 LLMscope backend: {base}")

        # discover models from ollama if possible
        models = []
        discovered = await get_ollama_models(session)
        if discovered:
            models = discovered
            print("🧭 Discovered Ollama models:", ", ".join(models))
        else:
            # default to your known set if discovery fails
            models = [
                "llama3:latest",
                "mistral:latest",
                "gemma3:4b",
                "gemma3:1b",
                "qwen2.5:0.5b-instruct",
            ]
            print("⚠️  Ollama model discovery failed; using default list:")
            print("   ", ", ".join(models))

        if args.mode == "ollama":
            if base:
                await run_ollama(session, base, args.api_key, models, args.samples)
            else:
                print("[!] Backend unreachable; running SIMULATED instead.")
                await run_simulated(session, base or "http://localhost:8081", args.api_key, models, args.samples)
        else:
            await run_simulated(session, base or "http://localhost:8081", args.api_key, models, args.samples)

    print("\n✅ Benchmarking complete — open your LLMscope dashboard to view SPC charts.")


if __name__ == "__main__":
    asyncio.run(main())
