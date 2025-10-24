#!/usr/bin/env python3
"""
LLMscope Phase-5 Docs Manager
-----------------------------
Interactive tool for viewing, regenerating, and exporting docs.

Adds "Export as PDF" option using pypandoc.
"""

import os, sys, subprocess, textwrap

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS = os.path.join(ROOT, "docs")
FINALIZER = os.path.join(ROOT, "scripts", "finalize_phase5_docs.py")

def list_docs():
    print(f"\n📁 Docs directory: {DOCS}\n")
    if not os.path.exists(DOCS):
        print("⚠️  docs/ folder not found. Run finalize_phase5_docs.py first.\n")
        return
    for name in sorted(os.listdir(DOCS)):
        if name.endswith(".md"):
            size = os.path.getsize(os.path.join(DOCS, name)) / 1024
            print(f"  • {name:20} ({size:.1f} KB)")
    print()

def view_doc():
    files = [f for f in sorted(os.listdir(DOCS)) if f.endswith(".md")]
    if not files:
        print("⚠️  No Markdown docs found.\n")
        return
    print("\nSelect a doc to view:")
    for i, f in enumerate(files, 1):
        print(f"  {i}. {f}")
    try:
        idx = int(input("\nEnter number: ").strip())
        chosen = files[idx - 1]
    except (ValueError, IndexError):
        print("❌ Invalid choice.\n")
        return
    with open(os.path.join(DOCS, chosen), "r", encoding="utf-8") as f:
        print("\n" + f.read() + "\n")

def regenerate_docs():
    if not os.path.exists(FINALIZER):
        print("⚠️  finalize_phase5_docs.py not found.\n")
        return
    print("♻️  Regenerating docs...\n")
    subprocess.run([sys.executable, FINALIZER], check=False)
    print("✅ Regeneration complete.\n")

def export_pdf():
    try:
        import pypandoc
    except ImportError:
        print("⚠️  pypandoc not installed. Run: pip install pypandoc\n")
        return
    files = [os.path.join(DOCS, f) for f in sorted(os.listdir(DOCS)) if f.endswith(".md")]
    if not files:
        print("⚠️  No Markdown files to export.\n")
        return
    output_path = os.path.join(DOCS, "LLMscope_Phase5_Docs.pdf")
    try:
        print("📦 Converting Markdown → PDF...")
        pypandoc.convert_text(
            "\n\n---\n\n".join(open(f, "r", encoding="utf-8").read() for f in files),
            "pdf", format="md", outputfile=output_path, extra_args=["--standalone"]
        )
        print(f"✅ Exported to {output_path}\n")
    except Exception as e:
        print(f"❌ PDF export failed: {e}\n")

def open_docs_folder():
    if not os.path.exists(DOCS):
        print("⚠️  docs folder missing.\n")
        return
    if sys.platform.startswith("win"):
        os.startfile(DOCS)
    elif sys.platform.startswith("darwin"):
        subprocess.run(["open", DOCS])
    else:
        subprocess.run(["xdg-open", DOCS])

def main_menu():
    while True:
        print(textwrap.dedent("""
        ===============================
        🧭  LLMscope Phase-5 Docs Manager
        ===============================
        1. List docs
        2. View doc
        3. Regenerate all docs
        4. Export all docs as single PDF
        5. Open docs folder
        6. Exit
        """))
        choice = input("Select option: ").strip()
        if choice == "1":
            list_docs()
        elif choice == "2":
            view_doc()
        elif choice == "3":
            regenerate_docs()
        elif choice == "4":
            export_pdf()
        elif choice == "5":
            open_docs_folder()
        elif choice == "6":
            print("👋 Exiting.")
            break
        else:
            print("❌ Invalid selection.\n")

if __name__ == "__main__":
    os.makedirs(DOCS, exist_ok=True)
    main_menu()
