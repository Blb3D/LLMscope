@echo off
title 🚀 LLMscope Dashboard
cd /d "%~dp0"
cd Web

echo =====================================================
echo   🚀 Launching LLMscope Clean Baseline v2.1
echo =====================================================
echo.

REM ---- Check Python ----
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python not found in PATH. Aborting.
    pause
    exit /b
)

echo [INFO] Starting FastAPI server...
python -m uvicorn app:app --host 127.0.0.1 --port 5000

pause
