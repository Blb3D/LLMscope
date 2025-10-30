import sqlite3

conn = sqlite3.connect('data/telemetry.db')
cursor = conn.cursor()

# Remove old test data
cursor.execute('''
    DELETE FROM telemetry 
    WHERE prompt_hash LIKE "baseline_%" 
    OR prompt_hash LIKE "R%_violation_%" 
    OR prompt_hash LIKE "stabilize_%"
''')

# Also clean violations table
cursor.execute('DELETE FROM violations')

affected_rows = cursor.rowcount
conn.commit()
conn.close()

print(f"Cleaned {affected_rows} test records from database")
print("Starting fresh with live data only!")