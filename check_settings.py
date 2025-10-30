import sqlite3
import os

DATABASE_PATH = "./data/llmscope.db"
conn = sqlite3.connect(DATABASE_PATH)
c = conn.cursor()

print("Checking copilot settings...")
c.execute("SELECT key, value FROM settings WHERE key LIKE 'copilot%'")
settings = c.fetchall()

if settings:
    print("Found copilot settings:")
    for key, value in settings:
        print(f"  {key}: {value}")
else:
    print("No copilot settings found in database")

print("\nEnvironment variables:")
print(f"  OLLAMA_URL (from env): {os.getenv('OLLAMA_URL', 'Not set')}")

# Let's also check what the get_current_settings function would return
c.execute("SELECT key, value FROM settings")
all_settings = dict(c.fetchall())
print(f"\nDefault Ollama URL would be: {all_settings.get('copilot_ollama_url', os.getenv('OLLAMA_URL', 'http://localhost:11434'))}")

conn.close()