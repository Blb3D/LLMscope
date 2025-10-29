import os
import sys
import difflib
from pathlib import Path

BASE_SPEC = "project_tree.txt"
EXCLUDE = {".git", "__pycache__", "node_modules", ".venv", ".idea", "archive", "dist", "backups"}

def generate_current_tree(root="."):
    """Generate current directory tree lines."""
    lines = []
    for current_root, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in EXCLUDE]
        rel_root = os.path.relpath(current_root, root)
        depth = 0 if rel_root == "." else rel_root.count(os.sep)
        indent = "│   " * depth
        lines.append(f"{indent}📁 {'.' if rel_root == '.' else os.path.basename(current_root)}/")
        for f in sorted(files):
            lines.append(f"{indent}│   ├── {f}")
    return [l.rstrip() for l in lines]

def load_spec(path):
    """Load the existing tree spec file."""
    with open(path, encoding="utf-8") as f:
        return [line.rstrip() for line in f if line.strip()]

def save_spec(lines, path):
    """Save a new tree spec."""
    header = [
        "# LLMscope Phase 6 TreeSpec",
        f"# Auto-generated on {Path.cwd()}",
        "# Regenerate using: python scripts/compare_to_spec.py --update",
        ""
    ]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(header + lines))
    print(f"✅ Updated {path} with current repo structure.\n")

def main():
    repo_root = Path(__file__).resolve().parents[1]
    os.chdir(repo_root)

    update_mode = "--update" in sys.argv

    if not Path(BASE_SPEC).exists() and not update_mode:
        print(f"❌ Spec file {BASE_SPEC} not found. Run with --update to create it.")
        sys.exit(1)

    current_lines = generate_current_tree(".")

    if update_mode:
        save_spec(current_lines, BASE_SPEC)
        sys.exit(0)

    spec_lines = load_spec(BASE_SPEC)
    diff = list(difflib.unified_diff(spec_lines, current_lines, fromfile="spec", tofile="current", lineterm=""))

    if diff:
        print("\n⚠️  Repository layout differs from spec:\n")
        for line in diff:
            if line.startswith("+") and not line.startswith("+++"):
                print(f"\033[32m{line}\033[0m")  # green = new
            elif line.startswith("-") and not line.startswith("---"):
                print(f"\033[31m{line}\033[0m")  # red = missing
        print("\n❌ Layout mismatch detected.\n")
        print("💡 To accept these changes as the new baseline, run:\n"
              "   python scripts/compare_to_spec.py --update\n")
        sys.exit(1)
    else:
        print("✅ Repo structure matches project_tree.txt exactly.")

if __name__ == "__main__":
    main()
