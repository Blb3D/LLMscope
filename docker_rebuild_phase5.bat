@echo off
title 🔭 LLMscope Phase 5 - Docker Rebuild
color 0A
setlocal enabledelayedexpansion

echo.
echo ===========================================================
echo    🔧  LLMscope Phase 5  —  Clean Docker Rebuild Utility
echo ===========================================================
echo.

REM ---- Change to project root ----
cd /d "%~dp0"
if errorlevel 1 (
    echo ❌ Failed to change directory.
    pause
    exit /b
)

REM ---- Confirm docker/.env exists ----
if not exist docker\.env (
    echo ⚠️  docker\.env file missing! Please add one before building.
    pause
    exit /b
)

REM ---- Stop and remove previous containers/volumes ----
echo 🧹 Stopping and removing previous containers...
docker compose -f docker\docker-compose.yml down -v

REM ---- Rebuild all containers from scratch ----
echo 🧱 Rebuilding containers...
docker compose -f docker\docker-compose.yml build --no-cache

REM ---- Start stack in detached mode ----
echo 🚀 Starting stack...
docker compose -f docker\docker-compose.yml up -d

REM ---- Wait a few seconds for services to settle ----
timeout /t 5 >nul

REM ---- Show container status ----
echo.
echo ============================================
echo 📦  Container Status:
echo ============================================
docker compose -f docker\docker-compose.yml ps

REM ---- Optional: open docs in browser ----
echo.
echo 🌐  Opening backend docs in browser...
start "" "http://localhost:8000/docs"

echo.
echo ✅  Docker rebuild complete!
echo Log files and build cache have been refreshed.
echo.
pause
