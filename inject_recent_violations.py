#!/usr/bin/env python3
"""
Inject recent test data to trigger R2/R3 violations and test dots
"""
import requests
import time
import random
from datetime import datetime, timedelta

API_BASE = "http://localhost:8000"
API_KEY = "dev-123"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def inject_recent_violations():
    """Inject very recent data to trigger R2/R3 violations"""
    print("🚀 Injecting recent violation data...")
    
    # Start from just 30 seconds ago to ensure it's "recent"
    base_time = datetime.utcnow() - timedelta(seconds=30)
    
    # R2: 9 consecutive points above mean (mean is around 5.26s from the screenshot)
    mean_estimate = 5.26
    r2_high_values = [
        mean_estimate + 0.5,  # 5.76s
        mean_estimate + 0.6,  # 5.86s  
        mean_estimate + 0.4,  # 5.66s
        mean_estimate + 0.7,  # 5.96s
        mean_estimate + 0.5,  # 5.76s
        mean_estimate + 0.8,  # 6.06s
        mean_estimate + 0.6,  # 5.86s
        mean_estimate + 0.9,  # 6.16s
        mean_estimate + 0.7,  # 5.96s
    ]
    
    print(f"📊 Injecting {len(r2_high_values)} R2 violation points...")
    
    for i, latency in enumerate(r2_high_values):
        timestamp = (base_time + timedelta(seconds=i*3)).isoformat() + "Z"
        
        payload = {
            "timestamp": timestamp,
            "provider": "ollama",
            "model": "mistral", 
            "latency_ms": latency * 1000,
            "total_duration_ms": latency * 1000,
            "eval_duration_ms": latency * 900,
            "prompt_eval_count": 25,
            "eval_count": 35,
            "cpu_percent": random.uniform(20, 80),
            "memory_percent": random.uniform(30, 70),
            "gpu_percent": 0.0,
            "prompt_hash": f"r2_test_{i}"
        }
        
        try:
            response = requests.post(f"{API_BASE}/api/stats", json=payload, headers=headers)
            if response.status_code == 200:
                print(f"✅ R2 Point {i+1}/{len(r2_high_values)}: {latency:.2f}s")
            else:
                print(f"❌ R2 Point {i+1} failed: {response.status_code}")
        except Exception as e:
            print(f"❌ R2 Point {i+1} error: {e}")
        
        time.sleep(0.1)
    
    # Add a small delay before R3 data
    time.sleep(2)
    
    # R3: 6 increasing points (trending up)
    base_time = datetime.utcnow() - timedelta(seconds=5)  # Very recent
    r3_trend = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5]  # Clear increasing trend
    
    print(f"📈 Injecting {len(r3_trend)} R3 violation points...")
    
    for i, latency in enumerate(r3_trend):
        timestamp = (base_time + timedelta(seconds=i*2)).isoformat() + "Z"
        
        payload = {
            "timestamp": timestamp,
            "provider": "ollama",
            "model": "mistral", 
            "latency_ms": latency * 1000,
            "total_duration_ms": latency * 1000,
            "eval_duration_ms": latency * 900,
            "prompt_eval_count": 25,
            "eval_count": 35,
            "cpu_percent": random.uniform(20, 80),
            "memory_percent": random.uniform(30, 70),
            "gpu_percent": 0.0,
            "prompt_hash": f"r3_test_{i}"
        }
        
        try:
            response = requests.post(f"{API_BASE}/api/stats", json=payload, headers=headers)
            if response.status_code == 200:
                print(f"✅ R3 Point {i+1}/{len(r3_trend)}: {latency:.2f}s")
            else:
                print(f"❌ R3 Point {i+1} failed: {response.status_code}")
        except Exception as e:
            print(f"❌ R3 Point {i+1} error: {e}")
        
        time.sleep(0.1)
    
    print("✨ Recent violation data injection complete!")
    print("🎯 Should trigger:")
    print("   - R2: 9 consecutive points above mean")
    print("   - R3: 6 point increasing trend")
    print("🔄 Wait 5-10 seconds then refresh http://localhost:8081")

if __name__ == "__main__":
    inject_recent_violations()