@echo off
REM LLMscope Demo Quick Start Script for Windows
REM This script automates the setup and startup of LLMscope for demo purposes

setlocal enabledelayedexpansion

echo ==========================================
echo    LLMscope Demo Deployment Script
echo ==========================================
echo.

REM Step 1: Check if Docker is installed
echo Step 1: Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker is installed
echo.

REM Step 2: Check if Docker is running
echo Step 2: Checking if Docker is running...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Step 3: Check if docker-compose is available
echo Step 3: Checking Docker Compose...
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not available!
    echo Please ensure you have Docker Compose installed.
    pause
    exit /b 1
)
echo [OK] Docker Compose is available
echo.

REM Step 4: Create data directory if it doesn't exist
echo Step 4: Setting up data directory...
if not exist "data" (
    mkdir data
    echo [OK] Created data directory
) else (
    echo [OK] Data directory already exists
)
echo.

REM Step 5: Check if ports are available (Windows version)
echo Step 5: Checking if required ports are available...

REM Check port 8000
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] Port 8000 is already in use!
    echo Please free up port 8000 or modify docker-compose.yml
    echo.
    echo To find the process using port 8000:
    echo   netstat -ano ^| findstr :8000
    pause
    exit /b 1
)
echo [OK] Port 8000 is available

REM Check port 8081
netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] Port 8081 is already in use!
    echo Please free up port 8081 or modify docker-compose.yml
    echo.
    echo To find the process using port 8081:
    echo   netstat -ano ^| findstr :8081
    pause
    exit /b 1
)
echo [OK] Port 8081 is available
echo.

REM Step 6: Stop any existing containers
echo Step 6: Stopping any existing LLMscope containers...
docker compose down >nul 2>&1
echo [OK] Cleaned up existing containers
echo.

REM Step 7: Build and start containers
echo Step 7: Building and starting Docker containers...
echo (This may take a few minutes on first run)
echo.

docker compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start containers
    echo.
    echo Showing logs for debugging:
    docker compose logs
    pause
    exit /b 1
)
echo [OK] Containers started successfully
echo.

REM Step 8: Wait for services to be ready
echo Step 8: Waiting for services to be ready...
echo (This may take 30-60 seconds)

set MAX_WAIT=60
set COUNTER=0

:wait_loop
if %COUNTER% geq %MAX_WAIT% (
    echo [ERROR] Backend failed to start within %MAX_WAIT% seconds
    echo.
    echo Backend logs:
    docker logs llmscope_backend
    pause
    exit /b 1
)

curl -f http://localhost:8000/ >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend is ready!
    goto :backend_ready
)

echo|set /p="."
timeout /t 2 /nobreak >nul
set /a COUNTER+=2
goto :wait_loop

:backend_ready
echo.

REM Wait a bit more for frontend
timeout /t 3 /nobreak >nul

REM Step 9: Generate demo data (optional)
echo.
echo Step 9: Generate demo data?
set /p GENERATE_DEMO="Generate demo data? (y/n): "
if /i "%GENERATE_DEMO%"=="y" (
    echo Generating demo data...
    docker exec llmscope_backend python generate_demo_data.py
    if %errorlevel% equ 0 (
        echo [OK] Demo data generated successfully
    ) else (
        echo [WARNING] Failed to generate demo data (you can run this manually later)
    )
)
echo.

REM Step 10: Display success message
echo ==========================================
echo    LLMscope Demo is Ready!
echo ==========================================
echo.
echo [OK] Dashboard: http://localhost:8081
echo [OK] Backend API: http://localhost:8000
echo [OK] API Docs: http://localhost:8000/docs
echo.
echo Useful commands:
echo   - View logs:          docker compose logs -f
echo   - Stop services:      docker compose down
echo   - Restart services:   docker compose restart
echo   - Generate demo data: docker exec llmscope_backend python generate_demo_data.py
echo.
echo Troubleshooting guide: See DOCKER_TROUBLESHOOTING.md
echo.
echo [INFO] Opening dashboard in your browser...
echo.

REM Try to open browser
start http://localhost:8081

echo ==========================================
echo.
pause
