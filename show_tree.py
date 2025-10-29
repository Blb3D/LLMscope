# show_tree.py
import os

def print_tree(startpath, exclude_dirs=None, output_file="project_tree.txt"):
    exclude_dirs = exclude_dirs or {'.git', '__pycache__', 'node_modules', '.venv', '.idea'}
    with open(output_file, 'w', encoding='utf-8') as f:
        for root, dirs, files in os.walk(startpath):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            level = root.replace(startpath, '').count(os.sep)
            indent = '│   ' * (level - 1) + ('├── ' if level > 0 else '')
            f.write(f"{indent}{os.path.basename(root)}/\n")
            subindent = '│   ' * level
            for file in files:
                f.write(f"{subindent}├── {file}\n")
    print(f"✅ File tree saved to {output_file}")

if __name__ == "__main__":
    print_tree(os.getcwd())
