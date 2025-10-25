@echo off
title 🟥 Stop LLMscope
echo =====================================================
echo   🟥 Stopping LLMscope Dashboard
echo =====================================================
echo.

REM ---- Kill existing Python or Uvicorn processes ----
taskkill /IM "python.exe" /F >nul 2>nul
taskkill /IM "uvicorn.exe" /F >nul 2>nul

echo [INFO] All Python/Uvicorn processes terminated.
echo -----------------------------------------------------
timeout /t 1 >nul
exit
