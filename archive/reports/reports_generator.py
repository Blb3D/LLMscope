from pathlib import Path
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from datetime import datetime
import plotly.graph_objects as go

LOG_FILE = Path("Logs/chatgpt_speed_log.csv")
EXPORTS_DIR = Path("Reports/exports")
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

def generate_report():
    """Generate a summary PDF report from chatgpt_speed_log.csv with Plotly chart."""
    print("[REPORT] Starting report generation...")

    if not LOG_FILE.exists() or LOG_FILE.stat().st_size == 0:
        print("[ERROR] Log file missing or empty.")
        return None

    try:
        df = pd.read_csv(LOG_FILE, names=["timestamp", "latency"], on_bad_lines="skip")
        df = df.dropna()
        df["latency"] = pd.to_numeric(df["latency"], errors="coerce")
        df = df.dropna(subset=["latency"])
        print(f"[REPORT] Loaded {len(df)} rows.")
    except Exception as e:
        print(f"[ERROR] CSV read failed: {e}")
        return None

    if df.empty:
        print("[ERROR] No valid data.")
        return None

    avg_latency = round(df["latency"].mean(), 2)
    latest_latency = round(df["latency"].iloc[-1], 2)
    total_samples = len(df)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    pdf_path = EXPORTS_DIR / f"LLMscope_Report_{timestamp}.pdf"
    chart_path = EXPORTS_DIR / f"LLMscope_Report_{timestamp}.png"

    # --- Generate Plotly line chart ---
    try:
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=df["timestamp"],
            y=df["latency"],
            mode="lines+markers",
            line=dict(color="#D37E3E", width=2),
            marker=dict(size=4),
            name="Latency (s)"
        ))
        fig.update_layout(
            title="LLMscope Latency Trend",
            xaxis_title="Timestamp",
            yaxis_title="Latency (s)",
            template="plotly_dark",
            paper_bgcolor="#1A0F08",
            plot_bgcolor="#1A0F08",
            font=dict(color="#F4C98A")
        )
        fig.write_image(str(chart_path))
        print(f"[REPORT] Chart exported → {chart_path}")
    except Exception as e:
        print(f"[ERROR] Failed to generate Plotly chart: {e}")
        chart_path = None

    # --- Create PDF ---
    try:
        c = canvas.Canvas(str(pdf_path), pagesize=letter)
        width, height = letter

        c.setTitle("LLMscope Report")
        c.setFont("Helvetica-Bold", 20)
        c.setFillColorRGB(0.83, 0.49, 0.24)
        c.drawString(72, height - 72, "LLMscope Performance Report")

        c.setFont("Helvetica", 12)
        c.setFillColorRGB(1, 1, 1)
        c.drawString(72, height - 110, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        c.drawString(72, height - 130, f"Total Samples: {total_samples}")
        c.drawString(72, height - 150, f"Average Latency: {avg_latency}s")
        c.drawString(72, height - 170, f"Latest Latency: {latest_latency}s")

        if chart_path and chart_path.exists():
            img = ImageReader(str(chart_path))
            c.drawImage(img, 72, 150, width=460, preserveAspectRatio=True)

        c.showPage()
        c.save()
        print(f"[REPORT] PDF generated → {pdf_path}")
    except Exception as e:
        print(f"[ERROR] PDF creation failed: {e}")
        return None

    return pdf_path
