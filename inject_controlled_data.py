#!/usr/bin/env python3
"""
Inject controlled test data for predictable R1, R2, R3 violations
90 baseline points + targeted violation patterns
"""
import requests
import time
from datetime import datetime, timedelta

API_BASE = "http://localhost:8000"
API_KEY = "dev-123"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def inject_controlled_dataset():
    """Inject a controlled dataset with predictable violations"""
    print("🚀 Creating controlled test dataset...")
    
    # Start 200 seconds ago to ensure all data is "recent"
    base_time = datetime.utcnow() - timedelta(seconds=200)
    
    all_data = []
    
    # 90 baseline points at 2.5s (stable mean)
    print("📊 Phase 1: 90 baseline points at 2.5s...")
    for i in range(90):
        all_data.append({
            "timestamp": (base_time + timedelta(seconds=i*2)).isoformat() + "Z",
            "latency": 2.5,
            "phase": "baseline"
        })
    
    # R2 violation: 9 consecutive points at 3.0s (above mean of 2.5s)
    print("🟠 Phase 2: 9 R2 violation points at 3.0s...")
    for i in range(9):
        all_data.append({
            "timestamp": (base_time + timedelta(seconds=(90+i)*2)).isoformat() + "Z",
            "latency": 3.0,
            "phase": "R2_violation"
        })
    
    # R1 violation: 1 spike at 8.0s (way above UCL)
    print("🔴 Phase 3: 1 R1 violation point at 8.0s...")
    all_data.append({
        "timestamp": (base_time + timedelta(seconds=99*2)).isoformat() + "Z",
        "latency": 8.0,
        "phase": "R1_violation"
    })
    
    # R3 violation: 6 increasing points from 2.2 to 2.8s
    print("🟡 Phase 4: 6 R3 violation points (2.2→2.8s trend)...")
    r3_values = [2.2, 2.32, 2.44, 2.56, 2.68, 2.8]  # Evenly spaced increase
    for i, latency in enumerate(r3_values):
        all_data.append({
            "timestamp": (base_time + timedelta(seconds=(100+i)*2)).isoformat() + "Z",
            "latency": latency,
            "phase": "R3_violation"
        })
    
    # Final stabilizing points
    print("📊 Phase 5: 5 stabilizing points at 2.5s...")
    for i in range(5):
        all_data.append({
            "timestamp": (base_time + timedelta(seconds=(106+i)*2)).isoformat() + "Z",
            "latency": 2.5,
            "phase": "stabilize"
        })
    
    print(f"📈 Total dataset: {len(all_data)} points")
    print("🎯 Expected statistics:")
    print("   Mean ≈ 2.5s (dominated by 90 baseline points)")
    print("   UCL ≈ 2.5 + 3×std")
    print("   Expected violations: R1(1), R2(≥1), R3(≥1)")
    
    # Inject all data
    print("💉 Injecting data...")
    for i, point in enumerate(all_data):
        payload = {
            "timestamp": point["timestamp"],
            "provider": "ollama",
            "model": "mistral", 
            "latency_ms": point["latency"] * 1000,
            "total_duration_ms": point["latency"] * 1000,
            "eval_duration_ms": point["latency"] * 900,
            "prompt_eval_count": 25,
            "eval_count": 35,
            "cpu_percent": 45.0,
            "memory_percent": 60.0,
            "gpu_percent": 0.0,
            "prompt_hash": f"{point['phase']}_{i}"
        }
        
        try:
            response = requests.post(f"{API_BASE}/api/stats", json=payload, headers=headers)
            if response.status_code == 200:
                if i % 20 == 0 or point["phase"] != "baseline":
                    print(f"✅ {point['phase']}: {point['latency']:.2f}s (point {i+1}/{len(all_data)})")
            else:
                print(f"❌ Point {i+1} failed: {response.status_code}")
                break
        except Exception as e:
            print(f"❌ Point {i+1} error: {e}")
            break
        
        # Small delay to avoid overwhelming API
        if i % 10 == 0:
            time.sleep(0.5)
        else:
            time.sleep(0.05)
    
    print("✨ Controlled dataset injection complete!")
    print("🔄 Wait 10 seconds then check violations and visit http://localhost:8081")

if __name__ == "__main__":
    inject_controlled_dataset()