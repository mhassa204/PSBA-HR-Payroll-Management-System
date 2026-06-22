# PM2 Setup & Deployment Guide

## 1. Install PM2 Globally

```bash
npm install -g pm2
```

## 2. Configure PM2 for Auto-Start on System Reboot

### Step 1: Install PM2 Windows Service
Run PowerShell as Administrator:

```powershell
pm2 install pm2-windows-startup
pm2 set pm2-windows-startup MACHINE_NAME MyPC  # Replace MyPC with your computer name
```

### Step 2: Generate Windows Service Configuration
From your server directory:

```powershell
pm2 startup windows --user Administrator --no-save
```

## 3. Start the Server with PM2

Navigate to the server directory:

```bash
cd C:\Users\Administrator\Desktop\PSBA-HR-Payroll-Management-System\server
pm2 start ecosystem.config.js
```

## 4. Save PM2 Configuration (for auto-start)

```bash
pm2 save
```

This saves the current PM2 process list so it will auto-start on Windows reboot.

## 5. Verify PM2 is Running

```bash
pm2 list
pm2 logs psba-hr-api
```

## 6. Build & Deploy Frontend

Navigate to frontend directory:

```bash
cd C:\Users\Administrator\Desktop\PSBA-HR-Payroll-Management-System\frontend
npm run build
```

This will:
- Build the React app
- Output to: `C:\inetpub\wwwroot\dist` (configured in vite.config.js)
- Ready to serve through IIS on your domain

## 7. Verify Deployment

- **Frontend**: Access via your domain (e.g., `https://yourdomain.com`)
- **API**: Automatically proxied through IIS from frontend requests
- **Security**: Port 3100 is not directly accessible; all traffic goes through IIS reverse proxy

## Additional PM2 Commands

```bash
# Stop the server
pm2 stop psba-hr-api

# Restart the server
pm2 restart psba-hr-api

# Delete from PM2
pm2 delete psba-hr-api

# View logs in real-time
pm2 logs psba-hr-api

# Watch logs
pm2 logrotate

# Show CPU/Memory usage
pm2 monit
```

## Troubleshooting

**Server not starting?**
- Check logs: `pm2 logs psba-hr-api`
- Verify .env file has correct DATABASE_URL and other secrets
- Ensure port 3100 is not already in use

**Auto-start not working on reboot?**
- Verify service was created: `sc query "PM2_Service"`
- Check Windows Event Viewer for startup errors
- Reinstall: `pm2 install pm2-windows-startup`

**Frontend not loading assets?**
- Clear IIS cache: `iisreset /restart`
- Check C:\inetpub\wwwroot\dist exists and has content
- Verify web.config is properly configured

## Configuration Files

- **Server**: `server/ecosystem.config.js` - PM2 configuration with PORT=3100
- **Frontend**: `frontend/vite.config.js` - Build output to C:\inetpub\wwwroot\dist
- **IIS**: `C:\inetpub\wwwroot\dist\web.config` - Reverse proxy & security rules
