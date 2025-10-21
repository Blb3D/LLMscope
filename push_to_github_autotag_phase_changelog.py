import os
import re
import subprocess
from datetime import datetime

# === CONFIGURATION ===
REPO_PATH = r"C:\Users\brand\OneDrive\Documents\LLMscope-main\LLMscope_Clean_Baseline_v2.1"
REMOTE_NAME = "origin"
BRANCH_NAME = "main"
TAG_SUFFIX = "-alpha"
CHANGELOG_FILE = "CHANGELOG.md"

# === UTILITIES ===
def run(cmd, cwd=None, return_output=False):
    print(f"→ {cmd}")
    result = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    if return_output:
        return result.stdout.strip()
    return result

def detect_phase_version():
    folder_name = os.path.basename(REPO_PATH)
    match = re.search(r"v(\d+\.\d+)", folder_name)
    if match:
        version = match.group(1)
        print(f"📦 Detected folder version: v{version}")
        return f"v{version}"
    print("⚠️ No version detected in folder name — defaulting to v1.0")
    return "v1.0"

def get_next_tag(base_version):
    output = run("git tag", cwd=REPO_PATH, return_output=True)
    if not output:
        return f"{base_version}{TAG_SUFFIX}"

    tags = [t for t in output.splitlines() if t.startswith(base_version)]
    if not tags:
        return f"{base_version}{TAG_SUFFIX}"

    tags.sort(key=lambda x: [int(n) for n in re.findall(r"\d+", x)] or [0])
    latest = tags[-1]
    match = re.search(rf"{base_version}\.(\d+)", latest)
    if match:
        new_minor = int(match.group(1)) + 1
        new_tag = f"{base_version}.{new_minor}{TAG_SUFFIX}"
    else:
        new_tag = f"{base_version}.1{TAG_SUFFIX}"
    print(f"🔖 Latest tag found: {latest} → Next: {new_tag}")
    return new_tag

def update_changelog(tag, commit_msg):
    changelog_path = os.path.join(REPO_PATH, CHANGELOG_FILE)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Get last 5 commits
    commit_log = run("git log -5 --pretty=format:'- %s (%h)'", cwd=REPO_PATH, return_output=True)

    section = f"""
## {tag} — {timestamp}
{commit_msg}

### Recent Commits
{commit_log}

---
"""
    if not os.path.exists(changelog_path):
        print("🆕 Creating CHANGELOG.md ...")
        with open(changelog_path, "w", encoding="utf-8") as f:
            f.write("# 📜 LLMscope Changelog\n\n")
            f.write(section)
    else:
        with open(changelog_path, "r", encoding="utf-8") as f:
            content = f.read()
        with open(changelog_path, "w", encoding="utf-8") as f:
            f.write("# 📜 LLMscope Changelog\n\n" + section + content)

    print("✅ CHANGELOG.md updated.")

# === MAIN ===
def main():
    os.chdir(REPO_PATH)
    print(f"📂 Working directory: {REPO_PATH}")

    # Initialize if needed
    if not os.path.exists(os.path.join(REPO_PATH, ".git")):
        print("🧩 Initializing new Git repository...")
        run("git init", cwd=REPO_PATH)
        run(f"git remote add {REMOTE_NAME} https://github.com/Blb3D/LLMscope-Desktop.git", cwd=REPO_PATH)

    # Pull latest
    print("⬇️  Pulling latest changes...")
    run(f"git pull {REMOTE_NAME} {BRANCH_NAME} --allow-unrelated-histories", cwd=REPO_PATH)

    # Stage & commit
    print("🗂️  Staging changes...")
    run("git add .", cwd=REPO_PATH)
    phase_version = detect_phase_version()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    commit_msg = f"Stable snapshot {phase_version} ({timestamp})"
    run(f'git commit -m "{commit_msg}"', cwd=REPO_PATH)

    # Push commit
    print(f"🚀 Pushing to {BRANCH_NAME}...")
    run(f"git push {REMOTE_NAME} {BRANCH_NAME}", cwd=REPO_PATH)

    # Tagging
    new_tag = get_next_tag(phase_version)
    print(f"🏷️  Creating and pushing tag: {new_tag}")
    run(f'git tag -a {new_tag} -m "Auto-tagged {phase_version} release {new_tag}"', cwd=REPO_PATH)
    run(f"git push {REMOTE_NAME} {new_tag}", cwd=REPO_PATH)

    # Changelog
    update_changelog(new_tag, commit_msg)

    print("\n✅ All changes pushed, tagged, and changelog updated successfully!")

if __name__ == "__main__":
    main()
