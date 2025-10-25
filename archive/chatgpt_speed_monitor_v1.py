import time, csv, random
from datetime import datetime
from pathlib import Path

DATA_DIR = Path("Logs")
DATA_DIR.mkdir(exist_ok=True)
CSV_FILE = DATA_DIR / "chatgpt_speed_log.csv"

def sample_latency():
    return round(random.uniform(2.0, 8.0), 3)

def safe_write(row):
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
    while True:
        latency = sample_latency()
        safe_write([datetime.now().isoformat(), latency])
        print(f"[LLMscope] Logged latency: {latency} sec")
        time.sleep(5)

if __name__ == "__main__":
    main()
