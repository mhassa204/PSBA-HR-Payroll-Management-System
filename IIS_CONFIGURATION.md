# IIS Configuration for PSBA HR System

## Overview
This guide walks through manual IIS configuration needed to serve the frontend and proxy API requests to the Node.js backend running on PM2.

## Prerequisites
- Windows Server 2016+ or Windows 10/11 Pro+
- IIS 10.0 or higher installed
- URL Rewrite Module for IIS installed
- Running as Administrator

## Installation Steps

### 1. Install IIS (if not already installed)

**Windows Server:**
```powershell
Install-WindowsFeature Web-Server -IncludeAllSubFeatures
```

**Windows 10/11 Pro:**
- Go to: Settings > Apps > Apps & Features > Optional Features
- Click "Add a feature"
- Search for "Internet Information Services"
- Select and install

### 2. Install URL Rewrite Module

Required for the `web.config` reverse proxy rules to work.

- Download: https://www.iis.net/downloads/microsoft/url-rewrite
- Install the MSI file as Administrator

### 3. Create Application Pool

1. Open IIS Manager (Press `Windows+R`, type `inetmgr`)
2. Right-click **Application Pools** > **Add Application Pool**
3. Name: `PSBA-HR-AppPool`
4. .NET CLR Version: **No Managed Code** (since we're serving static files + proxying)
5. Managed Pipeline Mode: **Integrated**
6. Click **OK**

### 4. Create Website

1. Right-click **Sites** > **Add Website**
2. Configure:
   - **Site name:** `PSBA-HR`
   - **Application pool:** `PSBA-HR-AppPool`
   - **Physical path:** `C:\inetpub\wwwroot\dist`
   - **Binding type:** `http`
   - **IP address:** `All Unassigned`
   - **Port:** `80` (or `443` for HTTPS)
   - **Host name:** Leave blank (to accept all domains) or enter your domain
3. Click **OK**

### 5. Configure SSL/HTTPS (Optional but Recommended)

1. In IIS Manager, select your **PSBA-HR** site
2. Double-click **SSL Settings**
3. Check **Require SSL**
4. Client certificates: **Ignore**
5. Apply changes

To add SSL certificate:
1. Right-click **PSBA-HR** site > **Edit Bindings**
2. Click **Add...**
3. Type: `https`
4. SSL certificate: Select your certificate (or create self-signed for testing)

### 6. Configure Handler Mapping (Optional for Static Files)

1. Select **PSBA-HR** site
2. Double-click **Handler Mappings**
3. Verify these are present:
   - `StaticFile` for static content
   - `PHP-FastCGI` (if needed)
4. If missing, they'll be inherited from parent (which is fine)

### 7. Enable directory features

1. Select **PSBA-HR** site
2. Double-click **Directory Browsing**
3. Click **Disable** in the Actions panel

## Verification

### Check Website is Running
```powershell
# List all sites
appcmd list site

# List application pools
appcmd list apppool
```

### Test Access

```bash
# Test locally
curl http://localhost

# Test from another machine
curl http://your-domain.com
```

### Verify web.config is Applied

1. In IIS Manager, select **PSBA-HR** site
2. Double-click **URL Rewrite**
3. You should see your rewrite rules listed

### Check Backend Proxy is Working

1. Open browser DevTools (F12)
2. Go to Network tab
3. Load your site: `http://your-domain`
4. Check an API call (e.g., `/api/login`)
5. Verify it returns from backend (should NOT show in address bar)
6. Status should be 200/401/403 (not 404 or proxy error)

## Troubleshooting

### web.config Rules Not Applying
- Check URL Rewrite Module is installed: `appcmd list module | find "Rewrite"`
- Verify web.config exists in site root: `C:\inetpub\wwwroot\dist\web.config`
- Check IIS logs: `C:\inetpub\logs\LogFiles`

### 404 Errors on SPA Routes
- Ensure "React Router Fallback" rule is enabled in web.config
- Clear IIS cache: `iisreset /restart`

### API Calls Failing (Proxying Not Working)
- Verify backend is running: `pm2 list`
- Check backend is listening: `netstat -ano | find ":3100"`
- Verify backend has no firewall blocking: Windows Defender Firewall > Advanced Settings
- Check IIS logs for rewrite errors

### SSL Certificate Errors
- For self-signed: Add to trusted root in Windows Certificate Manager
- For production: Use proper certificate from CA

### High Memory Usage
- Check backend logs: `pm2 logs psba-hr-api`
- Restart backend: `pm2 restart psba-hr-api`
- Restart IIS: `iisreset /restart`

## Performance Optimization

### Enable Compression
Already configured in web.config for JSON, JavaScript, CSS.

### Enable Output Caching
1. Select **PSBA-HR** site
2. Double-click **Output Caching**
3. Right-click **Add...** to cache rules

### Set Cache Control Headers
Already configured in web.config security headers section.

## Monitoring

### Real-time Logs
```powershell
# Watch IIS logs
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\u_ex*.log" -Tail 20 -Wait
```

### Check Site Health
```powershell
# Health check
Invoke-WebRequest http://your-domain/api/health -UseBasicParsing
```

## Restart Commands

```powershell
# Restart IIS
iisreset /restart

# Restart specific app pool
appcmd recycle apppool /apppool.name:"PSBA-HR-AppPool"

# Stop/start site
appcmd stop site "PSBA-HR"
appcmd start site "PSBA-HR"
```
