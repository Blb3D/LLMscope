import os, sys, hashlib, textwrap
from pathlib import Path
from datetime import datetime

# ---- CONFIG ----
ROOT = Path(__file__).resolve().parent
INCLUDE_DIRS = ["Web", "Reports", "Logs", "Data"]
KEY_FILES = [
    "Web/app.py",
    "Web/templates/dashboard.html",
    "Web/templates/reports.html",
    "Web/static/dashboard.js",
    "Web/static/dashboard.css",
    "Reports/reports_generator.py",
    "Reports/summary_report_template.md",
    "requirements.txt",
    "run_wrapper.py",
    "chatgpt_speed_monitor_v1.py",
    "README.md",
]
OUTPUT_DIR = ROOT / "Audit"
OUTPUT_DIR.mkdir(exist_ok=True)
STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUTFILE = OUTPUT_DIR / f"LLMscope_audit_{STAMP}.md"

TEXT_EXTS = {".py",".html",".css",".js",".md",".txt",".json",".yml",".yaml",".ini",".toml",".csv"}

def sha1(p: Path, block=65536):
    h = hashlib.sha1()
    with p.open("rb") as f:
        while True:
            b = f.read(block)
            if not b: break
            h.update(b)
    return h.hexdigest()

def is_text(p: Path):
    return p.suffix.lower() in TEXT_EXTS

def rel(p: Path):
    try:
        return str(p.relative_to(ROOT))
    except Exception:
        return str(p)

def main():
    lines = []
    lines.append(f"# LLMscope Audit Snapshot\n")
    lines.append(f"- Generated: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"- Root: `{ROOT}`\n")
    lines.append("## Directory Overview\n")

    # Walk include dirs
    for dname in INCLUDE_DIRS:
        d = ROOT / dname
        if not d.exists(): 
            lines.append(f"- (missing) {dname}")
            continue
        for p in sorted(d.rglob("*")):
            if p.is_file():
                size = p.stat().st_size
                lines.append(f"- {rel(p)}  ({size} bytes)")

    lines.append("\n## File Hashes (key files)\n")
    for path in KEY_FILES:
        p = ROOT / path
        if p.exists():
            lines.append(f"- `{path}`  sha1: `{sha1(p)}`  size: {p.stat().st_size} bytes")
        else:
            lines.append(f"- `{path}`  (missing)")

    lines.append("\n## Key File Contents\n")
    for path in KEY_FILES:
        p = ROOT / path
        lines.append(f"\n### {path}\n")
        if not p.exists():
            lines.append("_(missing)_\n")
            continue
        if is_text(p):
            try:
                txt = p.read_text(encoding="utf-8", errors="replace")
            except Exception as e:
                txt = f"<<Error reading as text: {e}>>"
            # Keep entire file, but guard against extreme size
            if len(txt) > 120_000:
                head = txt[:60_000]
                tail = txt[-60_000:]
                txt = head + "\n\n<<... SNIPPED ...>>\n\n" + tail
            lines.append("```")
            lines.append(txt)
            lines.append("```")
        else:
            lines.append("_(binary / non-text)_\n")

    OUTFILE.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n✅ Wrote audit file:\n{OUTFILE}\n")
    print("Next: open the file and paste it here, or upload the file itself.")

if __name__ == "__main__":
    main()
