from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
import csv
import time

# ============================================================
# APP INITIALIZATION
# ============================================================

app = FastAPI(title="LLMscope Dashboard")

# Directories
WEB_DIR = Path(__file__).resolve().parent
TEMPLATES = Jinja2Templates(directory=str(WEB_DIR / "templates"))
STATIC = WEB_DIR / "static"
LOG_FILE = Path("Logs/chatgpt_speed_log.csv")
EXPORTS_DIR = Path("Reports/exports")

# Ensure exports folder exists
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static assets
app.mount("/static", StaticFiles(directory=STATIC), name="static")

# ============================================================
# DASHBOARD ROUTES
# ============================================================

@app.get("/", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request):
    """Main live dashboard"""
    return TEMPLATES.TemplateResponse("dashboard.html", {"request": request})

# ============================================================
# API ENDPOINT – LIVE DATA
# ============================================================

@app.get("/api/live", response_class=JSONResponse)
def api_live():
    """Return latest latency samples"""
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

# ============================================================
# REPORT ROUTES – PHASE 5C (Updated with View/Download)
# ============================================================

from fastapi.responses import FileResponse, RedirectResponse
from Reports.reports_generator import generate_report

@app.get("/reports", response_class=HTMLResponse)
def reports(request: Request):
    """Display list of generated reports"""
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    items = []

    for p in sorted(EXPORTS_DIR.glob("*.pdf"), key=lambda x: x.stat().st_mtime, reverse=True):
        stat = p.stat()
        items.append({
            "name": p.name,
            "created_at": time.strftime("%Y-%m-%d %H:%M", time.localtime(stat.st_mtime)),
            "size_kb": max(1, stat.st_size // 1024),
        })

    return TEMPLATES.TemplateResponse("reports.html", {
        "request": request,
        "exports": items
    })


@app.post("/reports/generate")
def reports_generate():
    """Trigger PDF generation from sampler CSV"""
    try:
        output = generate_report()
        if output:
            print(f"[INFO] Report generated: {output}")
        else:
            print("[WARN] No report generated (missing CSV data).")
    except Exception as e:
        print(f"[ERROR] Report generation failed: {e}")

    # Redirect back to reports page
    return RedirectResponse(url="/reports", status_code=303)


@app.get("/reports/download/{name}")
def reports_download(name: str):
    """Download an existing report"""
    file_path = EXPORTS_DIR / name
    if not file_path.exists():
        return {"error": "File not found"}
    return FileResponse(path=file_path, filename=name, media_type="application/pdf")


@app.get("/reports/view/{name}")
def reports_view(name: str):
    """View PDF inline in browser (no download prompt)"""
    file_path = EXPORTS_DIR / name
    if not file_path.exists():
        return {"error": "File not found"}
    headers = {"Content-Disposition": f'inline; filename="{name}"'}
    return FileResponse(path=file_path, media_type="application/pdf", headers=headers)

# ============================================================
# SERVER ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
