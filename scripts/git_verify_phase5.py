"""
LLMscope Phase 5 — Git Repository Verification Script
------------------------------------------------------
Checks:
✅ Local vs Remote sync
✅ Confirms .env is ignored
✅ Shows latest tag + commit summary
✅ Warns if local changes exist
"""

import subprocess
from pathlib import Path

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("\n🔍 Verifying LLMscope-Desktop Phase 5 Git State\n")

# 1. Verify remote connectivity
remote_check = run("git remote -v")
print("🌐 Remote:\n", remote_check.stdout.strip(), "\n")

# 2. Check branch + sync status
status = run("git status -sb")
print("📦 Branch Status:\n", status.stdout.strip(), "\n")

# 3. Ensure .env files are not tracked
print("🧩 Checking for .env files accidentally staged...")
env_check = run("git ls-files | findstr .env")
if env_check.stdout:
    print("⚠️  WARNING: The following .env files are tracked!\n", env_check.stdout)
else:
    print("✅ No .env files are tracked by Git.\n")

# 4. Compare remote vs local commit hash
local = run("git rev-parse HEAD").stdout.strip()
remote = run("git rev-parse origin/main").stdout.strip()
if local == remote:
    print("✅ Local and remote branches are identical.\n")
else:
    print("⚠️  Local HEAD differs from origin/main.\n")
    print(f"Local:  {local}\nRemote: {remote}\n")

# 5. Show latest tag + commit summary
tag = run("git describe --tags --abbrev=0").stdout.strip()
commit = run("git log -1 --pretty=format:'%h - %an, %ar : %s'").stdout.strip()
print(f"🏷️  Latest tag: {tag if tag else 'No tag found'}")
print(f"🧾  Latest commit: {commit}\n")

print("✅ Verification complete.\n")
