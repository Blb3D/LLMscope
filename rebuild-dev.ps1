#!/usr/bin/env pwsh
# LLMscope Development Rebuild Script
# Use this when frontend/backend changes aren't applying

Write-Host "🔄 Starting clean rebuild process..." -ForegroundColor Cyan

# Step 1: Stop all containers
Write-Host "1️⃣ Stopping containers..." -ForegroundColor Yellow
docker compose down

# Step 2: Aggressive cleanup
Write-Host "2️⃣ Cleaning Docker cache..." -ForegroundColor Yellow
docker system prune -af

# Step 3: Clean build from scratch
Write-Host "3️⃣ Building fresh containers..." -ForegroundColor Yellow
docker compose build --no-cache

# Step 4: Start everything
Write-Host "4️⃣ Starting containers..." -ForegroundColor Yellow
docker compose up -d

# Step 5: Wait for health check
Write-Host "5️⃣ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 6: Test endpoints
Write-Host "6️⃣ Testing services..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:8081" -Method Get -TimeoutSec 5 | Out-Null
    Write-Host "✅ Frontend: http://localhost:8081" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend not ready" -ForegroundColor Red
}

try {
    $headers = @{ "Authorization" = "Bearer dev-123" }
    Invoke-RestMethod -Uri "http://localhost:8000/api/copilot/test" -Headers $headers -TimeoutSec 5 | Out-Null
    Write-Host "✅ Backend API: http://localhost:8000" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend API not ready" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Rebuild complete!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:8081" -ForegroundColor Cyan
Write-Host "API Test: curl -H 'Authorization: Bearer dev-123' http://localhost:8000/api/copilot/test" -ForegroundColor Cyan