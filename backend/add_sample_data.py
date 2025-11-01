#!/usr/bin/env python3
"""
Add Sample Usage Data
Populates the api_usage table with realistic sample data for testing the dashboard.
"""

import sqlite3
import os
from datetime import datetime, timedelta
import random

DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/llmscope.db")

# Sample usage patterns (provider, model, typical prompt/completion tokens)
USAGE_PATTERNS = [
    ("openai", "gpt-4-turbo", 500, 200),
    ("openai", "gpt-3.5-turbo", 300, 150),
    ("openai", "gpt-4o-mini", 400, 180),
    ("anthropic", "claude-3-sonnet", 600, 250),
    ("anthropic", "claude-3-haiku", 400, 150),
    ("google", "gemini-1.5-flash", 350, 140),
    ("google", "gemini-pro", 450, 200),
    ("groq", "llama-3-8b", 500, 220),
    ("groq", "mixtral-8x7b", 550, 240),
    ("together", "llama-3-70b", 480, 210),
    ("mistral", "mistral-small", 420, 170),
    ("cohere", "command-r", 390, 160),
]

def calculate_cost(provider, model, prompt_tokens, completion_tokens, conn):
    """Calculate cost based on pricing data."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT input_cost_per_1k, output_cost_per_1k
        FROM model_pricing
        WHERE provider = ? AND model = ?
    """, (provider, model))

    result = cursor.fetchone()
    if result:
        input_cost = (prompt_tokens / 1000) * result[0]
        output_cost = (completion_tokens / 1000) * result[1]
        return input_cost + output_cost
    return 0.0

def add_sample_data(num_records=100):
    """Add sample usage data to the database."""

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    print(f"📊 Adding {num_records} sample usage records...")
    print("=" * 50)

    now = datetime.now()
    added = 0

    for i in range(num_records):
        # Pick a random usage pattern
        provider, model, base_prompt, base_completion = random.choice(USAGE_PATTERNS)

        # Add some randomness to token counts (±30%)
        prompt_tokens = int(base_prompt * random.uniform(0.7, 1.3))
        completion_tokens = int(base_completion * random.uniform(0.7, 1.3))
        total_tokens = prompt_tokens + completion_tokens

        # Calculate cost
        cost_usd = calculate_cost(provider, model, prompt_tokens, completion_tokens, conn)

        # Generate timestamp (spread over last 7 days)
        days_ago = random.uniform(0, 7)
        timestamp = (now - timedelta(days=days_ago)).isoformat()

        # Generate random request ID
        request_id = f"req_{provider}_{i:05d}"

        # Insert record
        cursor.execute("""
            INSERT INTO api_usage
            (provider, model, timestamp, prompt_tokens, completion_tokens, total_tokens, cost_usd, request_id, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            provider,
            model,
            timestamp,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            cost_usd,
            request_id,
            '{"source": "sample_data"}'
        ))
        added += 1

    conn.commit()

    # Show summary
    print(f"\n✅ Sample Data Added Successfully!")
    print(f"   📊 Records added: {added}")

    # Show cost summary
    cursor.execute("""
        SELECT
            provider,
            COUNT(*) as requests,
            SUM(total_tokens) as total_tokens,
            SUM(cost_usd) as total_cost
        FROM api_usage
        GROUP BY provider
        ORDER BY total_cost DESC
    """)

    print(f"\n💰 Cost Summary by Provider:")
    total_cost = 0
    for row in cursor.fetchall():
        print(f"   • {row[0]:12} {row[1]:3} requests  {row[2]:7,} tokens  ${row[3]:.4f}")
        total_cost += row[3]

    print(f"\n   {'TOTAL':12} {added:3} requests  {'':7}         ${total_cost:.4f}")

    # Show most expensive models
    cursor.execute("""
        SELECT
            provider,
            model,
            COUNT(*) as requests,
            SUM(cost_usd) as total_cost
        FROM api_usage
        GROUP BY provider, model
        ORDER BY total_cost DESC
        LIMIT 5
    """)

    print(f"\n🔥 Top 5 Most Expensive Models:")
    for row in cursor.fetchall():
        print(f"   • {row[0]}/{row[1]}: ${row[3]:.4f} ({row[2]} requests)")

    conn.close()

    print("\n" + "=" * 50)
    print("✨ Dashboard is now ready to view!")
    print(f"💡 Total sample cost: ${total_cost:.4f}")

if __name__ == "__main__":
    print("🎲 Generating Sample Usage Data...")
    print("=" * 50)
    add_sample_data(100)
