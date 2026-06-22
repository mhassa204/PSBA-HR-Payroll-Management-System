@echo off
REM PM2 Quick Deployment Script
REM Run as Administrator

echo.
echo ========================================
echo   PSBA HR - PM2 Deployment Script
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Please right-click and select "Run as Administrator"
    pause
    exit /b 1
)

REM Install PM2 globally if not already installed
echo [1/5] Checking PM2 installation...
pm2 -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PM2 globally...
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install PM2
        pause
        exit /b 1
    )
) else (
    echo PM2 is already installed
)

REM Navigate to server directory
echo.
echo [2/5] Navigating to server directory...
cd /d "C:\Users\Administrator\Desktop\PSBA-HR-Payroll-Management-System\server"
if %errorlevel% neq 0 (
    echo ERROR: Cannot navigate to server directory
    pause
    exit /b 1
)

REM Install server dependencies
echo.
echo [3/5] Installing server dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Start server with PM2
echo.
echo [4/5] Starting server with PM2...
call pm2 start ecosystem.config.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to start server with PM2
    pause
    exit /b 1
)

REM Save PM2 configuration for auto-start
echo.
echo [5/5] Saving PM2 configuration for auto-start...
call pm2 save
if %errorlevel% neq 0 (
    echo WARNING: Could not save PM2 configuration
    echo You may need to run: pm2 install pm2-windows-startup
) else (
    echo PM2 configuration saved successfully
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Server Status:
call pm2 list
echo.
echo Next Steps:
echo 1. Verify server is running: pm2 logs psba-hr-api
echo 2. Build frontend: cd frontend ^& npm run build
echo 3. Access via your domain in the browser
echo.
pause
