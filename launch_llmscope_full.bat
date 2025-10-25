@echo off
title LLMscope Full Launch
echo =====================================================
echo   🚀 Launching LLMscope Sampler + Dashboard
echo =====================================================

REM --- Go to the project directory ---
cd /d "%~dp0"

REM --- Start latency sampler ---
start "LLMscope Sampler" cmd /k python chatgpt_speed_monitor_v1.py

REM --- Wait a moment to start web dashboard ---
timeout /t 3 >nul

REM --- Start FastAPI dashboard ---
start "LLMscope Dashboard" cmd /k run_llmscope.bat

echo.
echo All systems running.
echo Visit: http://127.0.0.1:5000
echo -----------------------------------------------------
echo Press any key to close all LLMscope processes safely.
pause >nul

REM --- Graceful shutdown ---
echo Stopping all processes...
taskkill /FI "WINDOWTITLE eq LLMscope Sampler" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq LLMscope Dashboard" /T /F >nul 2>&1

echo =====================================================
echo ✅ LLMscope has been stopped successfully.
echo =====================================================
timeout /t 2 >nul
exit
