import requests
import time
from datetime import datetime, timedelta
import random

API_URL = "http://localhost:8000/api/stats"
API_KEY = "dev-123"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Send 30 normal baseline points
print("Sending 30 baseline points...")
for i in range(30):
    latency = 2000 + random.randint(-200, 200)
    ts = (datetime.utcnow() - timedelta(seconds=30-i)).isoformat()
    
    data = {
        "provider": "ollama",
        "model": "llama3",
        "latency_ms": latency,
        "timestamp": ts,
        "cpu_percent": 35,
        "memory_percent": 45,
        "gpu_percent": 78,
        "gpu_memory_percent": 62,
        "prompt_eval_count": 26,
        "eval_count": 42
    }
    
    r = requests.post(API_URL, json=data, headers=headers)
    print(f"Point {i}: {latency}ms - {r.status_code}")
    time.sleep(0.1)

# Send 3 spikes
print("\nSending 3 SPIKES to trigger violations...")
for i in range(3):
    spike = 6500 + random.randint(0, 500)
    ts = (datetime.utcnow() + timedelta(seconds=5+i)).isoformat()
    
    data = {
        "provider": "ollama",
        "model": "llama3",
        "latency_ms": spike,
        "timestamp": ts,
        "cpu_percent": 85,
        "memory_percent": 90,
        "gpu_percent": 95,
        "gpu_memory_percent": 88,
        "prompt_eval_count": 26,
        "eval_count": 42
    }
    
    r = requests.post(API_URL, json=data, headers=headers)
    print(f"SPIKE {i}: {spike}ms - {r.status_code}")
    time.sleep(0.1)

print("\nDone! Refresh dashboard at http://localhost:8081")
