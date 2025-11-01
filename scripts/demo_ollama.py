#!/usr/bin/env python3
"""
Call a local Ollama model and log each call to LLMscope.

Defaults to posting logs to the UI proxy http://localhost:8081 so entries
appear in the dashboard immediately. Override with --base http://localhost:8000
if your UI points directly at the backend.
"""

import argparse, json, os, time, uuid
from datetime import datetime, timezone
import requests

# ---- defaults (can override via CLI flags) ----
DEFAULT_BASE   = os.getenv("LLMSCOPE_BASE", "http://localhost:8081")
DEFAULT_APIKEY = os.getenv("LLMSCOPE_API_KEY", "dev-123")
OLLAMA_URL     = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL  = os.getenv("OLLAMA_MODEL", "gemma3:1b")
PROVIDER       = "ollama"
DEFAULT_PROMPT = "Give me a 1-sentence Python tip about context managers."
TIMEOUT_S      = 120

def call_ollama(model: str, prompt: str):
    """Return (text, prompt_tokens, completion_tokens)."""
    r = requests.post(f"{OLLAMA_URL}/api/generate",
                      headers={"Content-Type":"application/json"},
                      data=json.dumps({"model": model, "prompt": prompt, "stream": False}),
                      timeout=TIMEOUT_S)
    r.raise_for_status()
    d = r.json()
    return d.get("response",""), d.get("prompt_eval_count"), d.get("eval_count")

def post_log(log_url: str, api_key: str, payload: dict) -> None:
    r = requests.post(log_url,
                      headers={"Authorization": f"Bearer {api_key}",
                               "Content-Type": "application/json"},
                      data=json.dumps(payload),
                      timeout=30)
    print(f"[POST {log_url}] {r.status_code}")
    if r.status_code >= 400:
        print(r.text)
    r.raise_for_status()

def run_once(log_url: str, api_key: str, model: str, prompt: str):
    req_id = str(uuid.uuid4())
    started_ms = int(time.time()*1000)

    ok, err, text = True, None, ""
    ptoks = ctoks = None

    try:
        text, ptoks, ctoks = call_ollama(model, prompt)
    except Exception as e:
        ok, err = False, f"{type(e).__name__}: {e}"

    ended_ms = int(time.time()*1000)
    latency_ms = ended_ms - started_ms

    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "timestamp_ms": ended_ms,
        "request_id": req_id,
        "provider": PROVIDER,
        "model": model,
        "prompt": prompt,
        "response": text,
        "prompt_preview": (prompt[:200] + ("…" if len(prompt) > 200 else "")),
        "response_preview": (text[:500] + ("…" if len(text) > 500 else "")),
        "latency": latency_ms / 1000.0,     # seconds, to satisfy the API
        "latency_ms": latency_ms,
        "success": ok,
        "error": err,
        "prompt_tokens": ptoks,
        "completion_tokens": ctoks,
        "input_tokens": ptoks,
        "output_tokens": ctoks,
        "cost_usd": 0.0,
        "tags": ["dev","ollama"],
        "metrics": {"latency_ms": latency_ms},
        "timing": {"started_at_ms": started_ms, "ended_at_ms": ended_ms},
    }

    try:
        post_log(log_url, api_key, payload)
        print(f"[OK] {model} :: {latency_ms} ms :: {('' if ok else 'ERR ')}{(text or err or '')[:80]!r}")
    except Exception as e:
        print(f"[WARN] log post failed: {e}")

def preflight(base: str, model: str):
    # Ollama reachable?
    try:
        requests.get(f"{OLLAMA_URL}/api/tags", timeout=5).raise_for_status()
    except Exception as e:
        raise SystemExit(f"Ollama not reachable at {OLLAMA_URL}. ({e})")

    # Try to ensure model present (best-effort)
    try:
        tags = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5).json().get("models", [])
        if model not in {m.get("name") for m in tags}:
            print(f"[INFO] Model '{model}' not installed; triggering a quick call to pull…")
            call_ollama(model, "ping")
    except Exception:
        pass

    # Log endpoint precheck
    try:
        r = requests.options(f"{base.rstrip('/')}/api/log", timeout=5)
        print(f"[INFO] Logging to {base} (options {r.status_code})")
    except Exception as e:
        print(f"[WARN] Could not precheck {base}/api/log ({e}). Continuing…")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", type=str, default=DEFAULT_BASE,
                    help="LLMscope base (UI proxy 8081 or backend 8000)")
    ap.add_argument("--model", type=str, default=DEFAULT_MODEL,
                    help="Ollama model tag, e.g. gemma3:1b")
    ap.add_argument("--prompt", type=str, default=DEFAULT_PROMPT)
    ap.add_argument("--loops", type=int, default=1)
    ap.add_argument("--sleep_ms", type=int, default=300)
    ap.add_argument("--api_key", type=str, default=DEFAULT_APIKEY)
    args = ap.parse_args()

    log_url = f"{args.base.rstrip('/')}/api/log"
    preflight(args.base, args.model)

    for i in range(args.loops):
        run_once(log_url, args.api_key, args.model, args.prompt)
        if i < args.loops - 1:
            time.sleep(args.sleep_ms / 1000.0)

if __name__ == "__main__":
    main()
