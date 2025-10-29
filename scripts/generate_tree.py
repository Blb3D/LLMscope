# scripts/generate_tree.py
import os

EXCLUDE_DIRS = {
    ".git", "__pycache__", "node_modules", ".venv", ".idea",
    "archive", "dist", "backups", ".DS_Store"
}
OUTPUT_FILE = "project_tree.txt"

def print_tree(base_path="."):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for root, dirs, files in os.walk(base_path):
            # skip excluded dirs
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            rel_root = os.path.relpath(root, base_path)
            depth = 0 if rel_root == "." else rel_root.count(os.sep)
            indent = "│   " * depth
            folder = "." if rel_root == "." else os.path.basename(root)
            f.write(f"{indent}📁 {folder}/\n")
            for file in sorted(files):
                f.write(f"{indent}│   ├── {file}\n")
    print(f"✅ File tree written to {OUTPUT_FILE}")

if __name__ == "__main__":
    print_tree(".")
