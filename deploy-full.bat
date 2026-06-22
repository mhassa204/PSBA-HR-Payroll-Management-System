@echo off
REM Complete Deployment Script for PSBA HR
REM Builds frontend and deploys to IIS, restarts services
REM Run as Administrator

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ========================================
echo   PSBA HR - Complete Deployment
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

REM Step 1: Build Frontend
echo [1/4] Building frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)
cd ..

REM Step 2: Restart Backend
echo.
echo [2/4] Restarting backend services...
pm2 restart psba-hr-api
if %errorlevel% neq 0 (
    echo WARNING: Could not restart PM2 service
    echo Make sure PM2 is started: pm2 start ecosystem.config.js
)

REM Step 3: Restart IIS
echo.
echo [3/4] Restarting IIS...
iisreset /restart /noforce
if %errorlevel% neq 0 (
    echo WARNING: Could not restart IIS
    echo Try manually: iisreset /restart
)

REM Step 4: Verification
echo.
echo [4/4] Verifying deployment...
echo.
echo === Backend Status ===
pm2 list
echo.
echo === Frontend Build Size ===
dir frontend\dist | find /i "bytes"
echo.
echo === IIS Website Status ===
appcmd list site
echo.

echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Access your application at:
echo   http://your-domain.com
echo   or
echo   http://localhost (if bound to port 80)
echo.
echo Monitor backend logs:
echo   pm2 logs psba-hr-api
echo.
pause
