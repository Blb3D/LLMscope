from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
import csv

app = FastAPI(title="LLMscope Dashboard")
WEB_DIR = Path(__file__).resolve().parent
TEMPLATES = Jinja2Templates(directory=str(WEB_DIR / "templates"))
STATIC = WEB_DIR / "static"
LOG_FILE = Path("Logs/chatgpt_speed_log.csv")
app.mount("/static", StaticFiles(directory=STATIC), name="static")

@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request):
    return TEMPLATES.TemplateResponse("dashboard.html", {"request": request})

@app.get("/api/live", response_class=JSONResponse)
def api_live():
    if not LOG_FILE.exists():
        return {"status": "waiting", "message": "No samples yet."}
    samples = []
    try:
        with open(LOG_FILE, "r", newline="", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) == 2:
                    samples.append(row)
    except Exception as e:
        print(f"[WARN] Could not read CSV: {e}")
        return {"status": "error", "message": str(e)}
    if not samples:
        return {"status": "waiting", "message": "No valid data."}
    timestamps, latencies = zip(*samples[-20:])
    return {
        "status": "ok",
        "timestamps": list(timestamps),
        "latencies": [float(x) for x in latencies],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
