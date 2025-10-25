import time, csv, random
from datetime import datetime
from pathlib import Path

# ============================================================
# CONFIGURATION
# ============================================================
BASE_DIR = Path(__file__).resolve().parent
LOGS_DIR = BASE_DIR / "Logs"
CSV_FILE = LOGS_DIR / "chatgpt_speed_log.csv"

# Ensure Logs folder exists
LOGS_DIR.mkdir(exist_ok=True)

# ============================================================
# INITIALIZE FILE WITH HEADERS
# ============================================================
if not CSV_FILE.exists():
    with open(CSV_FILE, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "latency"])
    print(f"[INIT] Created new log file with headers at {CSV_FILE}")
else:
    # ✅ Double-check: add headers if missing
    with open(CSV_FILE, "r+", newline="") as f:
        first_line = f.readline().strip()
        if "timestamp" not in first_line:
            print("[FIX] Adding missing headers to CSV.")
            content = f.read()
            f.seek(0)
            writer = csv.writer(f)
            writer.writerow(["timestamp", "latency"])
            f.write(content)

# ============================================================
# MAIN LOOP
# ============================================================
def sample_latency():
    return round(random.uniform(2.0, 8.0), 3)

def safe_write(row):
    """Append safely even if file is temporarily locked."""
    for attempt in range(3):
        try:
            with open(CSV_FILE, "a", newline="") as f:
                csv.writer(f).writerow(row)
            return
        except PermissionError:
            print("[WARN] File locked — retrying...")
            time.sleep(1)
    print("[ERROR] Unable to write; file may be open elsewhere.")

def main():
    print(f"[RUN] Logging to {CSV_FILE}")
    while True:
        latency = sample_latency()
        timestamp = datetime.now().isoformat()
        safe_write([timestamp, latency])
        print(f"[LLMscope] Logged latency: {latency} s at {timestamp}")
        time.sleep(5)

if __name__ == "__main__":
    main()
