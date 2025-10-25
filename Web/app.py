# ============================================================
# LLMscope Web App (Chart.js baseline version)
# ============================================================

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
import pandas as pd
import time
import traceback

# ------------------------------------------------------------
# FastAPI setup
# ------------------------------------------------------------
app = FastAPI(title="LLMscope Dashboard")

WEB_DIR = Path(__file__).resolve().parent
TEMPLATES = Jinja2Templates(directory=str(WEB_DIR / "templates"))
STATIC = WEB_DIR / "static"

# Absolute path to log file (update if needed)
LOG_FILE = Path(r"C:\Users\brand\OneDrive\Documents\LLMscope-main\LLMscope_Clean_Baseline_v2.1\Logs\chatgpt_speed_log.csv")
print(f"[DEBUG] Using log file: {LOG_FILE.resolve()}")

EXPORTS_DIR = Path("Reports/exports")
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static folder
app.mount("/static", StaticFiles(directory=STATIC), name="static")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    """Serve the main dashboard HTML."""
    html_path = Path(__file__).resolve().parent / "templates" / "dashboard.html"
    if not html_path.exists():
        return {"error": "Dashboard HTML not found."}
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# ------------------------------------------------------------
# LIVE DATA ENDPOINT
# ------------------------------------------------------------
@app.get("/api/live", response_class=JSONResponse)
def api_live():
    """Provide the most recent latency samples for live chart."""
    try:
        if not LOG_FILE.exists():
            print(f"[WARN] No log file found at {LOG_FILE}")
            return {"status": "ok", "samples": []}

        # Try comma first, then tab if parsing fails
        try:
            df = pd.read_csv(LOG_FILE)
        except Exception:
            df = pd.read_csv(LOG_FILE, sep="\t")

        print(f"[DEBUG] DataFrame preview:\n{df.head()}")
        print(f"[DEBUG] Columns: {df.columns.tolist()}")

        df.columns = df.columns.str.strip().str.lower()
        if not {"timestamp", "latency"}.issubset(df.columns):
            print(f"[ERROR] CSV missing expected columns: {df.columns.tolist()}")
            return {"status": "error", "samples": []}

        df = df.dropna(subset=["timestamp", "latency"])
        df["latency"] = pd.to_numeric(df["latency"], errors="coerce")
        df = df.tail(50)

        samples = [
            {"timestamp": ts, "latency": float(lat)}
            for ts, lat in zip(df["timestamp"], df["latency"])
        ]

        print(f"[DEBUG] Sending {len(samples)} samples to dashboard")
        return {"status": "ok", "samples": samples}

    except Exception as e:
        print(f"[ERROR] Reading CSV failed: {e}")
        traceback.print_exc()
        return {"status": "error", "samples": [], "message": str(e)}

# ------------------------------------------------------------
# REPORT ROUTES
# ------------------------------------------------------------
@app.get("/reports", response_class=HTMLResponse)
def reports(request: Request):
    """Display list of generated reports"""
    items = []
    for p in sorted(EXPORTS_DIR.glob("*.pdf"), key=lambda x: x.stat().st_mtime, reverse=True):
        stat = p.stat()
        items.append({
            "name": p.name,
            "created_at": time.strftime("%Y-%m-%d %H:%M", time.localtime(stat.st_mtime)),
            "size_kb": max(1, stat.st_size // 1024)
        })
    return TEMPLATES.TemplateResponse("reports.html", {"request": request, "exports": items})

@app.post("/reports/generate")
def reports_generate():
    """Trigger PDF generation from log data"""
    try:
        from Reports.reports_generator import generate_report
        output = generate_report()
        if output:
            print(f"[INFO] Report generated: {output}")
        else:
            print("[WARN] No report generated (missing CSV data).")
    except Exception as e:
        print(f"[ERROR] Report generation failed: {e}")
    return RedirectResponse(url="/reports", status_code=303)

@app.get("/reports/download/{name}")
def reports_download(name: str):
    """Download existing PDF report"""
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
