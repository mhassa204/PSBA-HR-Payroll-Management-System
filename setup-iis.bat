@echo off
REM IIS Configuration Script for PSBA HR
REM Run as Administrator

echo.
echo ========================================
echo   PSBA HR - IIS Setup Script
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

REM Check if IIS is installed
echo [1/4] Checking IIS installation...
where appcmd >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: IIS Manager (appcmd) not found
    echo Please install IIS first: Control Panel ^> Programs ^> Turn Windows Features On/Off
    pause
    exit /b 1
)

REM Create IIS Application if it doesn't exist
echo [2/4] Setting up IIS Application Pool...
appcmd list apppool /name:"PSBA-HR-AppPool" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creating new Application Pool: PSBA-HR-AppPool
    appcmd add apppool /name:"PSBA-HR-AppPool" /managedRuntimeVersion:"" /managedPipelineMode:"Integrated"
) else (
    echo Application Pool already exists
)

REM Create IIS Site if it doesn't exist
echo [3/4] Setting up IIS Website...
appcmd list site /name:"PSBA-HR" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creating new Website: PSBA-HR
    appcmd add site /name:"PSBA-HR" /id:2 /physicalPath:"C:\inetpub\wwwroot\dist" /bindings:"http/*:80:" /appPool:"PSBA-HR-AppPool"
    echo.
    echo NOTE: You may need to configure hostname bindings and SSL in IIS Manager:
    echo   1. Open IIS Manager
    echo   2. Right-click "PSBA-HR" site ^> Edit Bindings
    echo   3. Add your domain and SSL certificate
) else (
    echo Website already exists
)

REM Enable URL Rewrite module (required for web.config)
echo [4/4] Verifying URL Rewrite Module...
appcmd list module /name:"IIS.Rewrite*" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: URL Rewrite Module not found
    echo Please install it from: https://www.iis.net/downloads/microsoft/url-rewrite
    echo The web.config requires this module to function
) else (
    echo URL Rewrite Module is installed
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Open IIS Manager: Press Windows+R, type "inetmgr", press Enter
echo 2. Configure your website:
echo    - Set physical path to: C:\inetpub\wwwroot\dist
echo    - Add binding for your domain
echo    - Add SSL certificate (if using HTTPS)
echo 3. Build and deploy frontend: cd frontend ^& npm run build
echo 4. Verify app loads at your domain
echo.
pause
