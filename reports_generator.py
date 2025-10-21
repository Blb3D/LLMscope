"""
LLMscope Report Generator — Phase 5C
Converts chatgpt_speed_log.csv into a Markdown + PDF report.
"""

from pathlib import Path
import pandas as pd, markdown, plotly.express as px
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from datetime import datetime

LOG_FILE = Path("Logs/chatgpt_speed_log.csv")
TEMPLATE_FILE = Path("Reports/summary_report_template.md")
EXPORTS_DIR = Path("Reports/exports")

def generate_report():
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

    # --- 1. Load CSV ---
    if not LOG_FILE.exists():
        print("[WARN] No log file found, cannot generate report.")
        return None

    df = pd.read_csv(LOG_FILE, names=["timestamp", "latency_ms"], header=None)
    latency = df["latency_ms"].astype(float)
    stats = {
        "latency_min_ms": round(latency.min(), 2),
        "latency_p50_ms": round(latency.quantile(0.5), 2),
        "latency_p90_ms": round(latency.quantile(0.9), 2),
        "latency_p95_ms": round(latency.quantile(0.95), 2),
        "latency_max_ms": round(latency.max(), 2),
        "latency_mean_ms": round(latency.mean(), 2),
        "latency_std_ms": round(latency.std(), 2),
        "sample_count": len(df),
    }

    # --- 2. Load Markdown template ---
    template = TEMPLATE_FILE.read_text(encoding="utf-8")
    for k, v in stats.items():
        template = template.replace(f"{{{{ {k} }}}}", str(v))
    template = template.replace("{{ generated_at }}", datetime.now().strftime("%Y-%m-%d %H:%M"))
    template = template.replace("{{ report_id }}", datetime.now().strftime("%Y%m%d_%H%M"))

    # --- 3. Generate chart ---
    fig = px.line(df.tail(200), y="latency_ms", title="Recent Latency Samples (ms)")
    img_path = EXPORTS_DIR / "temp_plot.png"
    fig.write_image(img_path)

    # --- 4. Generate PDF ---
    output_file = EXPORTS_DIR / f"run_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    doc = SimpleDocTemplate(output_file)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("<b>LLMscope Report</b>", styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]),
        Spacer(1, 12),
        Image(str(img_path), width=400, height=200),
        Spacer(1, 12),
        Paragraph(markdown.markdown(template), styles["Normal"]),
    ]
    doc.build(story)

    print(f"✅ Report saved to {output_file}")
    return output_file

if __name__ == "__main__":
    generate_report()
