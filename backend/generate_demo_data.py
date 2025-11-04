#!/usr/bin/env python3
"""
Generate Demo Data for LLMscope
Creates realistic API usage data for testing and screenshots with weighted usage patterns.
"""

import sqlite3
import os
import random
from datetime import datetime, timedelta

DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/llmscope.db")

# === CONFIGURATION CONSTANTS ================================================

# Completion token ratios by pattern type (response length as % of prompt)
COMPLETION_RATIOS = {
    "simple": (0.1, 0.3),    # Short answers to quick queries
    "medium": (0.2, 0.5),    # Normal conversation responses
    "complex": (0.3, 0.6),   # Detailed explanations
    "extreme": (0.2, 0.4),   # Focused responses to large contexts
}

# Temporal distribution (60% of requests occur in the most recent 1/3 of time period)
RECENT_DATA_WEIGHT = 0.6  # Biases data generation toward recent timestamps

# Weighted token ranges matching real-world usage patterns
# 30% simple, 40% medium, 25% complex, 5% extreme
REQUEST_PATTERNS = [
    # Pattern: (name, min_prompt, max_prompt, weight)
    ("simple", 50, 300, 0.30),      # 30% - Quick queries, simple tasks
    ("medium", 200, 1500, 0.40),    # 40% - Normal conversations
    ("complex", 1000, 8000, 0.25),  # 25% - Long documents, detailed analysis
    ("extreme", 4000, 15000, 0.05), # 5% - Very large contexts
]

# Models to use for demo (mix of expensive and cheap)
DEMO_MODELS = [
    # Expensive models (premium tier)
    ("openai", "gpt-4-turbo"),
    ("openai", "gpt-4"),
    ("anthropic", "claude-3-opus"),
    ("anthropic", "claude-3-sonnet"),

    # Mid-tier models
    ("openai", "gpt-3.5-turbo"),
    ("anthropic", "claude-3-haiku"),
    ("google", "gemini-pro"),
    ("google", "gemini-1.5-flash"),
    ("cohere", "command-r"),
    ("mistral", "mistral-small"),

    # Budget models (fast and cheap)
    ("openai", "gpt-4o-mini"),
    ("together", "llama-3-70b"),
    ("together", "llama-3-8b"),
    ("groq", "mixtral-8x7b"),
    ("groq", "llama-3-8b"),
]

def select_request_pattern():
    """Select a request pattern based on weighted probabilities."""
    rand = random.random()
    cumulative = 0.0

    for name, min_tokens, max_tokens, weight in REQUEST_PATTERNS:
        cumulative += weight
        if rand <= cumulative:
            return name, min_tokens, max_tokens

    # Fallback to medium
    return "medium", 200, 1500

def calculate_cost(provider, model, prompt_tokens, completion_tokens):
    """Calculate cost based on pricing data."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT input_cost_per_1k, output_cost_per_1k
        FROM model_pricing
        WHERE provider = ? AND model = ?
    """, (provider, model))

    result = cursor.fetchone()
    conn.close()

    if not result:
        return 0.0

    input_cost_per_1k, output_cost_per_1k = result

    cost = (prompt_tokens / 1000 * input_cost_per_1k) + \
           (completion_tokens / 1000 * output_cost_per_1k)

    return round(cost, 6)

def generate_demo_data(num_requests=500, days=30):
    """Generate realistic demo data with weighted patterns.

    Args:
        num_requests: Number of API requests to generate (default: 500)
        days: Number of days to spread data over (default: 30)
    """

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Generate requests over the specified time period
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    inserted = 0
    total_cost = 0.0
    pattern_counts = {"simple": 0, "medium": 0, "complex": 0, "extreme": 0}

    print(f"Generating {num_requests} requests over {days} days...")
    print(f"Time range: {start_time.strftime('%Y-%m-%d')} to {end_time.strftime('%Y-%m-%d')}")
    print()

    for _ in range(num_requests):
        # Select request pattern (weighted)
        pattern_name, min_prompt, max_prompt = select_request_pattern()
        pattern_counts[pattern_name] += 1

        # Pick random model
        provider, model = random.choice(DEMO_MODELS)

        # Generate realistic token counts based on pattern
        prompt_tokens = random.randint(min_prompt, max_prompt)

        # Completion is typically 10-60% of prompt, varies by use case
        # Simple queries get shorter responses, complex ones get longer
        min_ratio, max_ratio = COMPLETION_RATIOS[pattern_name]
        completion_ratio = random.uniform(min_ratio, max_ratio)

        completion_tokens = int(prompt_tokens * completion_ratio)
        total_tokens = prompt_tokens + completion_tokens

        # Calculate cost
        cost = calculate_cost(provider, model, prompt_tokens, completion_tokens)
        total_cost += cost

        # Random timestamp with slight bias toward recent data
        # RECENT_DATA_WEIGHT (60%) of requests in last 1/3 of time period (more recent activity)
        if random.random() < RECENT_DATA_WEIGHT:
            # Recent third of time period
            recent_start = end_time - timedelta(days=days//3)
            time_delta = random.uniform(0, (end_time - recent_start).total_seconds())
            timestamp = recent_start + timedelta(seconds=time_delta)
        else:
            # Earlier two-thirds
            time_delta = random.uniform(0, (end_time - start_time).total_seconds())
            timestamp = start_time + timedelta(seconds=time_delta)

        # Insert into database
        cursor.execute("""
            INSERT INTO api_usage
            (provider, model, timestamp, prompt_tokens, completion_tokens, total_tokens, cost_usd)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (provider, model, timestamp.isoformat(), prompt_tokens, completion_tokens, total_tokens, cost))

        inserted += 1

    conn.commit()
    conn.close()

    return inserted, total_cost, pattern_counts

if __name__ == "__main__":
    print("🎲 Generating Demo Data for LLMscope...")
    print("=" * 60)
    print()

    # Default: 500 requests over 30 days
    num_requests = 500
    days = 30

    inserted, total_cost, pattern_counts = generate_demo_data(num_requests, days)

    print()
    print("=" * 60)
    print("✅ Demo Data Generated Successfully!")
    print()
    print(f"   📊 Total requests: {inserted}")
    print(f"   💰 Total cost: ${total_cost:.4f}")
    print(f"   📅 Date range: Last {days} days")
    print(f"   💾 Database: {DATABASE_PATH}")
    print()
    print("   📈 Request Pattern Distribution:")
    print(f"      • Simple (50-300 tokens):     {pattern_counts['simple']:3d} ({pattern_counts['simple']/inserted*100:.1f}%)")
    print(f"      • Medium (200-1.5K tokens):   {pattern_counts['medium']:3d} ({pattern_counts['medium']/inserted*100:.1f}%)")
    print(f"      • Complex (1K-8K tokens):     {pattern_counts['complex']:3d} ({pattern_counts['complex']/inserted*100:.1f}%)")
    print(f"      • Extreme (4K-15K tokens):    {pattern_counts['extreme']:3d} ({pattern_counts['extreme']/inserted*100:.1f}%)")
    print()
    print("=" * 60)
    print("✨ Done! Your dashboard now has realistic data.")
    print()
    print("💡 Next steps:")
    print("   1. Start the dashboard: docker-compose up -d")
    print("   2. Visit: http://localhost:8081")
    print("   3. Explore cost breakdown and recommendations!")
