#!/usr/bin/env python3
"""
Periodic violation injection script for LLMscope testing.
Injects specific violation patterns into live data stream.
"""

import sqlite3
import time
import sys
from datetime import datetime, timezone
import random

def get_current_stats():
    """Get current mean and std from recent data."""
    conn = sqlite3.connect('data/llmscope.db')
    cursor = conn.cursor()
    
    # Get last 30 points to calculate current baseline
    cursor.execute("""
        SELECT total_duration_ms FROM telemetry 
        ORDER BY id DESC 
        LIMIT 30
    """)
    
    recent_values = [row[0] for row in cursor.fetchall()]
    conn.close()
    
    if len(recent_values) < 10:
        # Default values if not enough data
        return 2500.0, 200.0
    
    mean = sum(recent_values) / len(recent_values)
    variance = sum((x - mean) ** 2 for x in recent_values) / len(recent_values)
    std = variance ** 0.5
    
    return mean, std

def inject_r3_trend_pattern():
    """Inject 6 consecutive trending points (R3 violation)."""
    print("🟡 Injecting R3 trend pattern (6 increasing points)...")
    
    mean, std = get_current_stats()
    base_latency = mean - std  # Start below mean
    increment = std * 0.3  # Small increments
    
    conn = sqlite3.connect('data/llmscope.db')
    cursor = conn.cursor()
    
    for i in range(6):
        timestamp = datetime.now(timezone.utc).isoformat()
        latency = base_latency + (i * increment)
        
        cursor.execute("""
            INSERT INTO telemetry (
                provider, model, latency_ms, timestamp, total_duration_ms,
                load_duration_ms, prompt_eval_duration_ms, eval_duration_ms,
                prompt_eval_count, eval_count, cpu_percent, memory_percent, 
                gpu_percent, gpu_memory_percent, prompt_hash, prompt_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "ollama", "mistral", latency, timestamp, latency,
            latency * 0.1, latency * 0.1, latency * 0.8,
            25, 35, 45.0, 60.0, 0.0, 0.0,
            f"R3_trend_{i}", f"Test R3 trending pattern point {i+1}"
        ))
        
        print(f"  Point {i+1}: {latency:.0f}ms at {timestamp}")
        time.sleep(2)  # 2 second intervals
    
    conn.commit()
    conn.close()
    print("✅ R3 trend pattern injected")

def inject_r2_above_mean_pattern():
    """Inject 9 consecutive points above mean (R2 violation)."""
    print("🟠 Injecting R2 pattern (9 points above mean)...")
    
    mean, std = get_current_stats()
    above_mean = mean + std * 0.8  # Clearly above mean but below UCL
    
    conn = sqlite3.connect('data/llmscope.db')
    cursor = conn.cursor()
    
    for i in range(9):
        timestamp = datetime.now(timezone.utc).isoformat()
        latency = above_mean + random.uniform(-50, 50)  # Small variation
        
        cursor.execute("""
            INSERT INTO telemetry (
                provider, model, latency_ms, timestamp, total_duration_ms,
                load_duration_ms, prompt_eval_duration_ms, eval_duration_ms,
                prompt_eval_count, eval_count, cpu_percent, memory_percent, 
                gpu_percent, gpu_memory_percent, prompt_hash, prompt_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "ollama", "mistral", latency, timestamp, latency,
            latency * 0.1, latency * 0.1, latency * 0.8,
            25, 35, 45.0, 60.0, 0.0, 0.0,
            f"R2_above_{i}", f"Test R2 above mean pattern point {i+1}"
        ))
        
        print(f"  Point {i+1}: {latency:.0f}ms at {timestamp}")
        time.sleep(2)  # 2 second intervals
    
    conn.commit()
    conn.close()
    print("✅ R2 above mean pattern injected")

def inject_r2_below_mean_pattern():
    """Inject 9 consecutive points below mean (R2 violation)."""
    print("🟠 Injecting R2 pattern (9 points below mean)...")
    
    mean, std = get_current_stats()
    below_mean = mean - std * 0.8  # Clearly below mean but above LCL
    
    conn = sqlite3.connect('data/llmscope.db')
    cursor = conn.cursor()
    
    for i in range(9):
        timestamp = datetime.now(timezone.utc).isoformat()
        latency = max(100, below_mean + random.uniform(-50, 50))  # Don't go below 100ms
        
        cursor.execute("""
            INSERT INTO telemetry (
                provider, model, latency_ms, timestamp, total_duration_ms,
                load_duration_ms, prompt_eval_duration_ms, eval_duration_ms,
                prompt_eval_count, eval_count, cpu_percent, memory_percent, 
                gpu_percent, gpu_memory_percent, prompt_hash, prompt_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "ollama", "mistral", latency, timestamp, latency,
            latency * 0.1, latency * 0.1, latency * 0.8,
            25, 35, 45.0, 60.0, 0.0, 0.0,
            f"R2_below_{i}", f"Test R2 below mean pattern point {i+1}"
        ))
        
        print(f"  Point {i+1}: {latency:.0f}ms at {timestamp}")
        time.sleep(2)  # 2 second intervals
    
    conn.commit()
    conn.close()
    print("✅ R2 below mean pattern injected")

def inject_r1_spike():
    """Inject single R1 violation (3σ outlier)."""
    print("🔴 Injecting R1 spike...")
    
    mean, std = get_current_stats()
    spike_latency = mean + (std * 4)  # Well above UCL
    
    timestamp = datetime.now(timezone.utc).isoformat()
    
    conn = sqlite3.connect('data/llmscope.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO telemetry (
            provider, model, latency_ms, timestamp, total_duration_ms,
            load_duration_ms, prompt_eval_duration_ms, eval_duration_ms,
            prompt_eval_count, eval_count, cpu_percent, memory_percent, 
            gpu_percent, gpu_memory_percent, prompt_hash, prompt_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "ollama", "mistral", spike_latency, timestamp, spike_latency,
        spike_latency * 0.1, spike_latency * 0.1, spike_latency * 0.8,
        25, 35, 45.0, 60.0, 0.0, 0.0,
        f"R1_spike", f"Test R1 spike violation"
    ))
    
    conn.commit()
    conn.close()
    print(f"✅ R1 spike injected: {spike_latency:.0f}ms at {timestamp}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python inject_periodic_violations.py <pattern>")
        print("Patterns:")
        print("  r3         - 6 point trend (R3 violation)")
        print("  r2-above   - 9 points above mean (R2 violation)")
        print("  r2-below   - 9 points below mean (R2 violation)")
        print("  r1         - Single 3σ spike (R1 violation)")
        print("  sequence   - All patterns in sequence")
        return
    
    pattern = sys.argv[1].lower()
    
    if pattern == "r3":
        inject_r3_trend_pattern()
    elif pattern == "r2-above":
        inject_r2_above_mean_pattern()
    elif pattern == "r2-below":
        inject_r2_below_mean_pattern()
    elif pattern == "r1":
        inject_r1_spike()
    elif pattern == "sequence":
        print("🚀 Running full sequence...")
        inject_r3_trend_pattern()
        print("\n⏳ Waiting 30 seconds before next pattern...")
        time.sleep(30)
        inject_r2_above_mean_pattern()
        print("\n⏳ Waiting 30 seconds before next pattern...")
        time.sleep(30)
        inject_r2_below_mean_pattern()
        print("\n⏳ Waiting 30 seconds before R1 spike...")
        time.sleep(30)
        inject_r1_spike()
        print("\n🎉 Full sequence complete!")
    else:
        print(f"Unknown pattern: {pattern}")
        return

if __name__ == "__main__":
    main()