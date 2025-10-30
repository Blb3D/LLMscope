#!/usr/bin/env pwsh
# LLMscope Frontend-Only Rebuild Script
# Use this for React/frontend changes only (faster than full rebuild)

Write-Host "🎨 Frontend-only rebuild..." -ForegroundColor Cyan

# Stop just the web container
Write-Host "1️⃣ Stopping frontend container..." -ForegroundColor Yellow
docker compose stop llmscope_web

# Remove the frontend image
Write-Host "2️⃣ Removing frontend image..." -ForegroundColor Yellow
docker image rm llmscope-llmscope_web -f 2>$null

# Rebuild just frontend
Write-Host "3️⃣ Rebuilding frontend..." -ForegroundColor Yellow
docker compose build --no-cache llmscope_web

# Start frontend
Write-Host "4️⃣ Starting frontend..." -ForegroundColor Yellow
docker compose up -d llmscope_web

Write-Host "5️⃣ Testing frontend..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
try {
    Invoke-RestMethod -Uri "http://localhost:8081" -Method Get -TimeoutSec 5 | Out-Null
    Write-Host "✅ Frontend ready: http://localhost:8081" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend not ready yet, wait a few more seconds" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎨 Frontend rebuild complete!" -ForegroundColor Green