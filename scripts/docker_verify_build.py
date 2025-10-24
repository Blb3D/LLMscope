import subprocess, os

print("\n🧩 Verifying Docker build context...")
result = subprocess.run(
    ["docker", "build", "-f", "docker/Dockerfile.backend", ".", "--no-cache", "--dry-run"],
    capture_output=True, text=True
)
if ".env" in result.stdout or "node_modules" in result.stdout:
    print("⚠️  Potential leak detected: .env or node_modules present in Docker context!")
else:
    print("✅ Docker build context looks clean.")
