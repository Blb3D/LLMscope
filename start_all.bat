@echo off
title 🚀 Launching LLMscope (Server + Sampler)
echo =====================================================
echo     🚀 Starting LLMscope Dashboard and Sampler
echo =====================================================

REM --- Set project directory ---
cd /d "%~dp0"

REM --- Start the FastAPI dashboard in a new window ---
start "LLMscope Dashboard" cmd /k "python -m uvicorn Web.app:app --reload --port 5000"

REM --- Wait a few seconds to let the server boot ---
timeout /t 5 /nobreak >nul

REM --- Start the latency sampler in a second window ---
start "LLMscope Sampler" cmd /k "python chatgpt_speed_monitor_v1.py"

REM --- Open the browser automatically ---
start "" "http://127.0.0.1:5000"

echo =====================================================
echo  LLMscope launched successfully!
echo  Dashboard running at: http://127.0.0.1:5000
echo =====================================================
pause
