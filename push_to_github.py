import os
import subprocess
from datetime import datetime

# === CONFIGURATION ===
REPO_PATH = r"C:\Users\brand\OneDrive\Documents\LLMscope-main\LLMscope_Clean_Baseline_v2.1"
REMOTE_NAME = "origin"
BRANCH_NAME = "main"   # or "master" if your repo uses that

# === SCRIPT ===
def run(cmd, cwd=None):
    print(f"→ {cmd}")
    result = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    return result

def main():
    os.chdir(REPO_PATH)
    print(f"📂 Working directory: {REPO_PATH}")

    # Step 1: Initialize git if not already
    if not os.path.exists(os.path.join(REPO_PATH, ".git")):
        print("🧩 Initializing new Git repository...")
        run("git init", cwd=REPO_PATH)
        run(f"git remote add {REMOTE_NAME} https://github.com/Blb3D/LLMscope-Desktop.git", cwd=REPO_PATH)

    # Step 2: Pull latest to prevent conflicts
    print("⬇️  Pulling latest changes (safe merge)...")
    run(f"git pull {REMOTE_NAME} {BRANCH_NAME} --allow-unrelated-histories", cwd=REPO_PATH)

    # Step 3: Stage all changes
    print("🗂️  Staging all files...")
    run("git add .", cwd=REPO_PATH)

    # Step 4: Commit with timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    commit_msg = f'Stable snapshot: LLMscope Phase 6 Base - {timestamp}'
    print(f"💾 Committing with message: {commit_msg}")
    run(f'git commit -m "{commit_msg}"', cwd=REPO_PATH)

    # Step 5: Push to GitHub
    print(f"🚀 Pushing to GitHub branch '{BRANCH_NAME}'...")
    run(f"git push {REMOTE_NAME} {BRANCH_NAME}", cwd=REPO_PATH)

    print("\n✅ Upload complete — repository is up to date!")

if __name__ == "__main__":
    main()
