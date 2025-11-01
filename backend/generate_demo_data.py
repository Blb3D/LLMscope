#!/usr/bin/env python3
"""
Generate Demo Data for LLMscope
Creates realistic API usage data for testing and screenshots.
"""

import sqlite3
import os
import random
from datetime import datetime, timedelta

DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/llmscope.db")

# Realistic token ranges for different model sizes
TOKEN_RANGES = {
    "small": (50, 500),      # Quick queries
    "medium": (500, 2000),   # Normal conversations
    "large": (2000, 5000),   # Long documents
}

# Models to use for demo (mix of expensive and cheap)
DEMO_MODELS = [
    ("openai", "gpt-4-turbo", "large"),
    ("openai", "gpt-3.5-turbo", "small"),
    ("openai", "gpt-4o-mini", "small"),
    ("anthropic", "claude-3-sonnet", "medium"),
    ("anthropic", "claude-3-haiku", "small"),
    ("google", "gemini-pro", "medium"),
    ("google", "gemini-1.5-flash", "small"),
    ("together", "llama-3-70b", "medium"),
    ("mistral", "mistral-small", "small"),
    ("cohere", "command-r", "medium"),
    ("groq", "mixtral-8x7b", "medium"),
    ("groq", "llama-3-8b", "small"),
]

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

def generate_demo_data(num_requests=100):
    """Generate realistic demo data."""

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Generate requests over the last 7 days
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=7)

    inserted = 0
    total_cost = 0.0

    for _ in range(num_requests):
        # Pick random model
        provider, model, size = random.choice(DEMO_MODELS)

        # Generate realistic token counts
        prompt_range = TOKEN_RANGES[size]
        prompt_tokens = random.randint(prompt_range[0], prompt_range[1])

        # Completion is typically 10-50% of prompt
        completion_ratio = random.uniform(0.1, 0.5)
        completion_tokens = int(prompt_tokens * completion_ratio)

        total_tokens = prompt_tokens + completion_tokens

        # Calculate cost
        cost = calculate_cost(provider, model, prompt_tokens, completion_tokens)
        total_cost += cost

        # Random timestamp in the last 7 days
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

    return inserted, total_cost

if __name__ == "__main__":
    print("🎲 Generating Demo Data for LLMscope...")
    print("=" * 50)

    num_requests = 100
    inserted, total_cost = generate_demo_data(num_requests)

    print(f"\n✅ Demo Data Generated Successfully!")
    print(f"   📊 Requests created: {inserted}")
    print(f"   💰 Total cost: ${total_cost:.4f}")
    print(f"   📅 Date range: Last 7 days")
    print(f"   💾 Database: {DATABASE_PATH}")

    print("\n" + "=" * 50)
    print("✨ Done! Your dashboard now has realistic data.")
    print("\n💡 Tip: Run 'docker-compose up -d' and visit http://localhost:8081")
