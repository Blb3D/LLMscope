import sqlite3
import os

db_path = 'data/llmscope.db'

if not os.path.exists(db_path):
    print("Database file doesn't exist yet")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print(f"Tables: {tables}")

# Get schema for each table
for table in tables:
    print(f"\n{table} schema:")
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    
    # Get sample data
    cursor.execute(f"SELECT * FROM {table} LIMIT 3")
    samples = cursor.fetchall()
    print(f"  Sample rows: {len(samples)}")

conn.close()