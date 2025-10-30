#!/usr/bin/env python3
"""
Inject test data with violations to demonstrate enhanced chart features
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

def inject_test_data():
    """Inject test telemetry data with designed violations"""
    print("🚀 Injecting test data with violations...")
    
    base_time = datetime.utcnow() - timedelta(minutes=10)
    
    # Normal data points (around 5 seconds)
    normal_latencies = [4.8, 5.1, 4.9, 5.2, 4.7, 5.0, 5.3, 4.6, 5.1, 4.8]
    
    # Create R1 violation (spike > 3σ)
    r1_spike = 15.0  # Way above normal
    
    # Create R2 violations (9 points above mean)
    r2_high = [7.5, 7.8, 7.2, 7.6, 7.9, 7.3, 7.7, 7.4, 7.8]  # 9 consecutive high points
    
    # Create R3 violations (6 points trending up)
    r3_trend = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5]  # 6 increasing points
    
    # Combine all data
    all_data = (
        normal_latencies[:5] +  # 5 normal points
        [r1_spike] +            # 1 R1 violation
        normal_latencies[5:8] + # 3 more normal
        r2_high +               # 9 R2 violations  
        normal_latencies[8:] +  # 2 normal
        r3_trend +              # 6 R3 violations
        normal_latencies[:3]    # 3 final normal
    )
    
    print(f"📊 Injecting {len(all_data)} data points...")
    
    for i, latency in enumerate(all_data):
        timestamp = (base_time + timedelta(seconds=i*2)).isoformat() + "Z"
        
        payload = {
            "timestamp": timestamp,
            "provider": "ollama",
            "model": "mistral", 
            "latency_ms": latency * 1000,  # Convert to milliseconds
            "total_duration_ms": latency * 1000,
            "eval_duration_ms": latency * 900,
            "prompt_eval_count": 25,
            "eval_count": 35,
            "cpu_percent": random.uniform(20, 80),
            "memory_percent": random.uniform(30, 70),
            "gpu_percent": 0.0,
            "prompt_hash": "test_hash_" + str(i)
        }
        
        try:
            response = requests.post(f"{API_BASE}/api/stats", json=payload, headers=headers)
            if response.status_code == 200:
                print(f"✅ Point {i+1}/{len(all_data)}: {latency:.1f}s")
            else:
                print(f"❌ Point {i+1} failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Point {i+1} error: {e}")
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.1)
    
    print("✨ Test data injection complete!")
    print("🎯 Expected violations:")
    print("   - R1: 1 violation (spike at 15.0s)")
    print("   - R2: Multiple violations (9 consecutive high points)")  
    print("   - R3: Multiple violations (6 point increasing trend)")
    print("📈 Visit http://localhost:8081 to see the enhanced chart!")

if __name__ == "__main__":
    inject_test_data()