# Docker Troubleshooting Guide for LLMscope Demo Deployment

## Quick Start Checklist

Before running `docker-compose up -d`, ensure:

- [ ] Docker Desktop is installed and running
- [ ] You're in the project root directory
- [ ] The `data/` directory exists
- [ ] Port 8000 and 8081 are available
- [ ] You have sufficient disk space (at least 2GB)

---

## Common Issues and Solutions

### 1. Missing `data` Directory

**Error:**
```
Error response from daemon: invalid mount config for type "bind": bind source path does not exist
```

**Solution:**
```bash
# Create the data directory
mkdir -p data

# Then restart Docker
docker-compose down
docker-compose up -d
```

---

### 2. Docker Desktop Not Running

**Error:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**

**Windows:**
1. Open Docker Desktop from Start Menu
2. Wait for "Docker Desktop is running" message in system tray
3. Try the command again

**Mac:**
1. Open Docker Desktop from Applications
2. Wait for whale icon in menu bar to stop animating
3. Try the command again

**Linux:**
```bash
# Start Docker service
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker
```

---

### 3. Port Already in Use

**Error:**
```
Bind for 0.0.0.0:8000 failed: port is already allocated
```

**Solution:**

**Option A: Stop the conflicting service**
```bash
# Windows - Find what's using port 8000
netstat -ano | findstr :8000
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Mac/Linux - Find and kill process
lsof -ti:8000 | xargs kill -9
```

**Option B: Change the port**

Edit `docker-compose.yml` and change the port mapping:
```yaml
ports:
  - "8080:8000"  # Changed from 8000:8000
```

Then access the API at http://localhost:8080

---

### 4. Build Fails - Missing Dependencies

**Error:**
```
ERROR [backend 5/8] RUN pip install --no-cache-dir -r /app/requirements.txt
```

**Solution:**

**Check your internet connection**, then rebuild:
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### 5. Backend Health Check Failing

**Error:**
```
Container llmscope_backend is unhealthy
```

**Solution:**

Check backend logs:
```bash
# View backend logs
docker logs llmscope_backend

# Common issues:
# - Database initialization failed
# - Port 8000 blocked inside container
# - Python dependencies missing
```

**Fix: Reinitialize the backend**
```bash
# Stop containers
docker-compose down

# Remove old volumes and containers
docker-compose down -v

# Rebuild and restart
docker-compose build --no-cache backend
docker-compose up -d
```

---

### 6. Frontend Shows 404 or Blank Page

**Symptoms:**
- http://localhost:8081 shows blank page
- Browser console shows errors

**Solution:**

Check frontend build:
```bash
# View frontend logs
docker logs llmscope_frontend

# Rebuild frontend
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

**Verify nginx is serving correctly:**
```bash
# Check if nginx config is valid
docker exec llmscope_frontend nginx -t

# If config is invalid, check docker/nginx.conf
```

---

### 7. API Calls Return 502 Bad Gateway

**Error in browser console:**
```
GET http://localhost:8081/api/recommendations 502 (Bad Gateway)
```

**Solution:**

This means nginx cannot reach the backend.

**Check backend is running:**
```bash
# See if backend container is up
docker ps | grep llmscope_backend

# Check backend logs
docker logs llmscope_backend

# Test backend directly
curl http://localhost:8000/
# Should return: {"status":"ok"}
```

**Verify network connectivity:**
```bash
# Check if frontend can reach backend
docker exec llmscope_frontend ping -c 3 llmscope_backend
```

**Fix:**
```bash
# Recreate the containers
docker-compose down
docker-compose up -d
```

---

### 8. Database Permission Issues

**Error:**
```
sqlite3.OperationalError: unable to open database file
```

**Solution:**

**Windows:**
```bash
# Ensure data directory has correct permissions
# Right-click data folder → Properties → Security → Edit
# Grant Full Control to your user account
```

**Mac/Linux:**
```bash
# Fix permissions
chmod 755 data
chmod 644 data/llmscope.db  # If database exists

# Or recreate with correct permissions
sudo rm -rf data
mkdir -p data
docker-compose restart backend
```

---

### 9. Containers Keep Restarting

**Check status:**
```bash
docker ps -a
# Look for containers with "Restarting" status
```

**Debug:**
```bash
# Check logs for specific container
docker logs llmscope_backend --tail 50

# Common causes:
# - Application crash on startup
# - Missing environment variables
# - Database corruption
```

**Solution:**
```bash
# Complete reset
docker-compose down -v
rm -rf data  # ⚠️ This deletes all data
mkdir -p data
docker-compose build --no-cache
docker-compose up -d
```

---

### 10. "No such file or directory" During Build

**Error:**
```
COPY backend/requirements.txt /app/requirements.txt
ERROR: failed to calculate checksum: "/backend/requirements.txt": not found
```

**Solution:**

**Ensure you're in the project root:**
```bash
# You should see these directories:
ls
# Expected output: backend, frontend, docker, docker-compose.yml

# If not, navigate to the correct directory
cd /path/to/LLMscope
```

---

## Advanced Troubleshooting

### View All Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Inspect Container
```bash
# Get shell access to backend
docker exec -it llmscope_backend /bin/bash

# Check if database exists
ls -la /app/data/

# Test Python dependencies
python -c "import fastapi; print('FastAPI OK')"
```

### Check Docker Resources
```bash
# View resource usage
docker stats

# Check available disk space
docker system df
```

### Clean Docker Environment
```bash
# Remove all LLMscope containers
docker-compose down -v

# Remove orphaned images (careful!)
docker system prune -a

# Fresh start
docker-compose build --no-cache
docker-compose up -d
```

---

## Windows-Specific Issues

### WSL2 Backend Required

If using Docker Desktop on Windows, ensure WSL2 backend is enabled:

1. Open Docker Desktop
2. Settings → General → **Use WSL 2 based engine** (should be checked)
3. Restart Docker Desktop

### File Path Issues

If you copied the project from OneDrive or a network drive:

**Problem:** File permissions may be inconsistent

**Solution:**
```powershell
# Copy to local drive
xcopy "C:\Users\brand\OneDrive\Desktop\Change Management Database\DEMO Package" "C:\LLMscope" /E /I

# Navigate to local copy
cd C:\LLMscope

# Run Docker
docker-compose up -d
```

### Line Ending Issues

**Problem:** Scripts fail with "command not found" or "syntax error"

**Solution:**
```bash
# Convert line endings (if you have git installed)
git config core.autocrlf false
git rm --cached -r .
git reset --hard
```

---

## Verification Steps

After starting Docker, verify everything works:

```bash
# 1. Check containers are running
docker ps
# Expected: 2 containers (llmscope_backend, llmscope_frontend)

# 2. Test backend API
curl http://localhost:8000/
# Expected: {"status":"ok"}

# 3. Test frontend
curl http://localhost:8081/
# Expected: HTML content

# 4. Test API through nginx proxy
curl http://localhost:8081/api/recommendations
# Expected: JSON array of models

# 5. Open browser
# Visit: http://localhost:8081
# Expected: LLMscope dashboard
```

---

## Demo Data Setup

After Docker is running successfully, generate demo data:

```bash
# Option 1: Generate demo data using the container
docker exec llmscope_backend python generate_demo_data.py

# Option 2: Generate from host (if Python installed)
cd backend
pip install -r requirements.txt
python generate_demo_data.py
```

Refresh http://localhost:8081 to see the demo data.

---

## Getting Help

If issues persist:

1. **Collect logs:**
   ```bash
   docker-compose logs > docker-logs.txt
   docker ps -a > docker-status.txt
   ```

2. **Check Docker info:**
   ```bash
   docker version
   docker info
   ```

3. **Report the issue:**
   - GitHub Issues: https://github.com/Blb3D/LLMscope/issues
   - Include logs, error messages, and OS information

---

## Quick Reference Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild specific service
docker-compose build --no-cache backend
docker-compose up -d backend

# Complete reset
docker-compose down -v
rm -rf data
mkdir -p data
docker-compose build --no-cache
docker-compose up -d

# Check service health
docker-compose ps
```

---

## Success Indicators

You know Docker is working correctly when:

✅ `docker ps` shows 2 running containers
✅ http://localhost:8000/ returns `{"status":"ok"}`
✅ http://localhost:8081/ loads the dashboard
✅ No errors in `docker-compose logs`
✅ `docker-compose ps` shows both services as "healthy" or "running"

---

**Need more help?** Open an issue on GitHub with:
- Your OS and Docker version
- Complete error message
- Output of `docker-compose logs`
