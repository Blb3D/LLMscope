#!/usr/bin/env python3
"""
Seed LLM Model Pricing Data
Populates the model_pricing table with current pricing from major LLM providers.

Pricing as of January 2025 (update regularly!)
"""

import sqlite3
import os
from datetime import datetime

DATABASE_PATH = os.getenv("DATABASE_PATH", "./data/llmscope.db")

# Pricing data: (provider, model, input_cost_per_1k, output_cost_per_1k)
# All costs in USD per 1,000 tokens
PRICING_DATA = [
    # OpenAI Models
    ("openai", "gpt-4-turbo", 0.01, 0.03),
    ("openai", "gpt-4", 0.03, 0.06),
    ("openai", "gpt-4-32k", 0.06, 0.12),
    ("openai", "gpt-3.5-turbo", 0.0005, 0.0015),
    ("openai", "gpt-3.5-turbo-16k", 0.003, 0.004),
    ("openai", "gpt-4o", 0.005, 0.015),
    ("openai", "gpt-4o-mini", 0.00015, 0.0006),
    ("openai", "o1-preview", 0.015, 0.06),
    ("openai", "o1-mini", 0.003, 0.012),

    # Anthropic Claude Models
    ("anthropic", "claude-3-opus", 0.015, 0.075),
    ("anthropic", "claude-3-sonnet", 0.003, 0.015),
    ("anthropic", "claude-3-haiku", 0.00025, 0.00125),
    ("anthropic", "claude-3.5-sonnet", 0.003, 0.015),
    ("anthropic", "claude-2.1", 0.008, 0.024),
    ("anthropic", "claude-2.0", 0.008, 0.024),
    ("anthropic", "claude-instant-1.2", 0.0008, 0.0024),

    # Google Gemini Models
    ("google", "gemini-pro", 0.0005, 0.0015),
    ("google", "gemini-pro-vision", 0.00025, 0.00075),
    ("google", "gemini-1.5-pro", 0.00125, 0.005),
    ("google", "gemini-1.5-flash", 0.00015, 0.0006),  # Updated Jan 2025
    ("google", "gemini-2.0-flash", 0.0001, 0.0004),  # New model
    ("google", "gemini-ultra", 0.0, 0.0),  # Pricing TBA

    # Cohere Models
    ("cohere", "command", 0.001, 0.002),
    ("cohere", "command-light", 0.0003, 0.0006),
    ("cohere", "command-nightly", 0.001, 0.002),
    ("cohere", "command-r", 0.0005, 0.0015),
    ("cohere", "command-r-plus", 0.003, 0.015),

    # Meta Llama (via Together AI)
    ("together", "llama-2-70b", 0.0009, 0.0009),
    ("together", "llama-2-13b", 0.000225, 0.000225),
    ("together", "llama-2-7b", 0.0002, 0.0002),
    ("together", "llama-3-70b", 0.0009, 0.0009),
    ("together", "llama-3-8b", 0.0002, 0.0002),
    ("together", "llama-3.1-405b", 0.005, 0.005),
    ("together", "llama-3.1-70b", 0.00088, 0.00088),
    ("together", "llama-3.1-8b", 0.0002, 0.0002),

    # Mistral AI
    ("mistral", "mistral-tiny", 0.00014, 0.00042),
    ("mistral", "mistral-small", 0.0006, 0.0018),
    ("mistral", "mistral-medium", 0.0027, 0.0081),
    ("mistral", "mistral-large", 0.004, 0.012),
    ("mistral", "mixtral-8x7b", 0.0007, 0.0007),
    ("mistral", "mixtral-8x22b", 0.002, 0.006),

    # Perplexity
    ("perplexity", "llama-3-sonar-small-32k", 0.0002, 0.0002),
    ("perplexity", "llama-3-sonar-large-32k", 0.001, 0.001),
    ("perplexity", "llama-3-70b-instruct", 0.001, 0.001),

    # Groq (ultra-fast inference)
    ("groq", "llama-3-70b", 0.00059, 0.00079),
    ("groq", "llama-3-8b", 0.00005, 0.00008),
    ("groq", "mixtral-8x7b", 0.00024, 0.00024),
    ("groq", "gemma-7b", 0.00007, 0.00007),

    # Fireworks AI
    ("fireworks", "llama-3-70b", 0.0009, 0.0009),
    ("fireworks", "mixtral-8x7b", 0.0005, 0.0005),
    ("fireworks", "yi-34b", 0.0009, 0.0009),

    # Azure OpenAI (typically same as OpenAI but can vary)
    ("azure", "gpt-4", 0.03, 0.06),
    ("azure", "gpt-4-turbo", 0.01, 0.03),
    ("azure", "gpt-3.5-turbo", 0.0005, 0.0015),

    # Amazon Bedrock - Claude models
    ("bedrock", "claude-3-opus", 0.015, 0.075),
    ("bedrock", "claude-3-sonnet", 0.003, 0.015),
    ("bedrock", "claude-3-haiku", 0.00025, 0.00125),

    # Local/Self-hosted (Ollama, etc.) - typically free
    ("ollama", "llama3", 0.0, 0.0),
    ("ollama", "llama3.1", 0.0, 0.0),
    ("ollama", "llama3.2", 0.0, 0.0),
    ("ollama", "mixtral", 0.0, 0.0),
    ("ollama", "gemma", 0.0, 0.0),
    ("ollama", "qwen2.5", 0.0, 0.0),
    ("local", "any-model", 0.0, 0.0),
]

def seed_pricing():
    """Seed the model_pricing table with current LLM pricing."""

    # Create database directory if it doesn't exist
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Create table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS model_pricing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            input_cost_per_1k REAL NOT NULL,
            output_cost_per_1k REAL NOT NULL,
            last_updated TEXT NOT NULL,
            UNIQUE(provider, model)
        )
    """)

    timestamp = datetime.utcnow().isoformat()

    # Insert pricing data
    inserted = 0
    updated = 0

    for provider, model, input_cost, output_cost in PRICING_DATA:
        try:
            cursor.execute("""
                INSERT INTO model_pricing (provider, model, input_cost_per_1k, output_cost_per_1k, last_updated)
                VALUES (?, ?, ?, ?, ?)
            """, (provider, model, input_cost, output_cost, timestamp))
            inserted += 1
        except sqlite3.IntegrityError:
            # Record already exists, update it
            cursor.execute("""
                UPDATE model_pricing
                SET input_cost_per_1k = ?, output_cost_per_1k = ?, last_updated = ?
                WHERE provider = ? AND model = ?
            """, (input_cost, output_cost, timestamp, provider, model))
            updated += 1

    conn.commit()

    # Show summary
    print(f"\n✅ Pricing Data Seeded Successfully!")
    print(f"   📊 Inserted: {inserted} new models")
    print(f"   🔄 Updated: {updated} existing models")
    print(f"   📍 Total models: {len(PRICING_DATA)}")
    print(f"   💾 Database: {DATABASE_PATH}")

    # Show breakdown by provider
    cursor.execute("""
        SELECT provider, COUNT(*) as count
        FROM model_pricing
        GROUP BY provider
        ORDER BY count DESC
    """)

    print(f"\n📋 Models by Provider:")
    for row in cursor.fetchall():
        print(f"   • {row[0]}: {row[1]} models")

    # Show cheapest models
    cursor.execute("""
        SELECT provider, model,
               ROUND((input_cost_per_1k + output_cost_per_1k) / 2, 6) as avg_cost
        FROM model_pricing
        WHERE avg_cost > 0
        ORDER BY avg_cost ASC
        LIMIT 5
    """)

    print(f"\n💰 Top 5 Cheapest Models (excluding free):")
    for row in cursor.fetchall():
        print(f"   • {row[0]}/{row[1]}: ${row[2]:.6f} per 1K tokens (avg)")

    conn.close()

if __name__ == "__main__":
    print("🌱 Seeding LLM Model Pricing Database...")
    print("=" * 50)
    seed_pricing()
    print("\n" + "=" * 50)
    print("✨ Done! Your pricing database is ready.")
    print("\n💡 Tip: Run this script periodically to update pricing as providers change rates.")
