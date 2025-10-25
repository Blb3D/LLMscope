@echo off
title 🔁 Restart LLMscope Dashboard
echo =====================================================
echo   🔁 Restarting LLMscope Clean Baseline v2.1
echo =====================================================
echo.

call "%~dp0stop_llmscope.bat"
timeout /t 1 >nul
call "%~dp0run_llmscope.bat"
