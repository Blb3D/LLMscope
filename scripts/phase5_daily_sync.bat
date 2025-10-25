@echo off
title 🔭 LLMscope Phase 5 Daily Sync
color 0A
setlocal enabledelayedexpansion

REM ---- Initialize paths ----
cd /d "%~dp0"
set LOGDIR=%~dp0logs
set LOGFILE=%LOGDIR%\phase5_sync_log.txt

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo =============================================================== >> "%LOGFILE%"
echo 🔭 LLMscope Phase 5 Daily Sync - %date% %time% >> "%LOGFILE%"
echo =============================================================== >> "%LOGFILE%"
echo. >> "%LOGFILE%"

echo.
echo ================================================
echo   LLMscope Phase 5 - Daily Verification & Push
echo ================================================
echo.

REM ---- Step 1: Git verification ----
echo 🧠 Checking Git repository integrity...
echo 🧠 Git verification... >> "%LOGFILE%"
python scripts\git_verify_phase5.py >> "%LOGFILE%" 2>&1

if errorlevel 1 (
    echo ⚠️  Git verification reported an issue. See log.
    echo ⚠️  Verification failed. >> "%LOGFILE%"
) else (
    echo ✅ Git verification complete.
    echo ✅ Verification passed. >> "%LOGFILE%"
)

REM ---- Step 2: Docker verification ----
if exist scripts\docker_verify_build.py (
    echo 🧩 Verifying Docker build context...
    echo 🧩 Docker verification... >> "%LOGFILE%"
    python scripts\docker_verify_build.py >> "%LOGFILE%" 2>&1
)

REM ---- Step 3: Stage + Commit ----
echo 📦 Staging and committing any changes...
echo 📦 Commit step... >> "%LOGFILE%"
git add . >> "%LOGFILE%" 2>&1
git reset .env 2>nul
git reset **/.env 2>nul
set /p COMMSG=Enter commit message (default: "Daily Phase 5 sync"): 
if "%COMMSG%"=="" set COMMSG=Daily Phase 5 sync

git commit -m "%COMMSG%" >> "%LOGFILE%" 2>&1
if errorlevel 1 (
    echo ⚠️  Nothing to commit.
    echo ⚠️  Nothing to commit. >> "%LOGFILE%"
) else (
    echo ✅ Commit created: "%COMMSG%"
    echo ✅ Commit: %COMMSG% >> "%LOGFILE%"
)

REM ---- Step 4: Pull + Push ----
echo 🔄 Pulling latest from remote...
git pull origin main --allow-unrelated-histories --no-rebase >> "%LOGFILE%" 2>&1

echo 🚀 Pushing to GitHub...
git push origin main >> "%LOGFILE%" 2>&1

REM ---- Step 5: Tag ----
for /f "tokens=2 delims==" %%v in ('wmic os get localdatetime /value ^| find "="') do set datetime=%%v
set tagdate=%datetime:~0,8%
git tag -a v0.5-phase5-%tagdate% -m "Daily sync on %tagdate%" >> "%LOGFILE%" 2>&1
git push origin --tags >> "%LOGFILE%" 2>&1

REM ---- Step 6: Wrap up ----
echo. >> "%LOGFILE%"
echo ✅ Sync completed successfully on %date% %time% >> "%LOGFILE%"
echo. >> "%LOGFILE%"
echo ✅ Daily sync complete! Log saved to "%LOGFILE%"
echo.
pause
