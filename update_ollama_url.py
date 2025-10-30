import sqlite3

DATABASE_PATH = "./data/llmscope.db"
conn = sqlite3.connect(DATABASE_PATH)
c = conn.cursor()

print("Updating copilot_ollama_url...")
c.execute("UPDATE settings SET value = ? WHERE key = ?", 
          ("http://host.docker.internal:11434", "copilot_ollama_url"))
conn.commit()

print("Checking updated setting...")
c.execute("SELECT key, value FROM settings WHERE key = 'copilot_ollama_url'")
result = c.fetchone()
if result:
    print(f"  {result[0]}: {result[1]}")
else:
    print("  Setting not found")

conn.close()
print("Done!")