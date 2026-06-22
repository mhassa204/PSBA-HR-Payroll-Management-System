# PSBA HR - Quick Deployment Reference

## File Structure After Configuration

```
PSBA-HR-Payroll-Management-System/
├── frontend/
│   ├── dist/                    ← Built frontend (output of npm run build)
│   ├── src/
│   ├── scripts/
│   │   └── deploy.js           ← Auto-copy script
│   ├── package.json            ← Contains "build" & "deploy" scripts
│   └── vite.config.js          ← Points to ./dist
├── server/
│   ├── ecosystem.config.js     ← PM2 config (PORT=3100)
│   └── src/index.js
├── C:\inetpub\wwwroot\dist/    ← IIS serves from here (auto-synced)
│   └── web.config              ← Reverse proxy rules
└── deploy-full.bat             ← One-click deployment
```

## Quick Start (One-Time Setup)

### 1. Setup Backend
```bash
cd server
pm2 start ecosystem.config.js
pm2 save
```

### 2. Setup Frontend & IIS
Run as Administrator:
```bash
setup-iis.bat
```

### 3. Build & Deploy
```bash
cd frontend
npm run build
```

This automatically:
- Builds to `frontend/dist`
- Copies to `C:\inetpub\wwwroot\dist`
- Ready to serve via IIS

## Ongoing Deployment

### After Code Changes

**Option 1: Manual Build**
```bash
cd frontend
npm run build    # Automatically deploys to IIS
```

**Option 2: One-Click Full Deployment** (runs as Admin)
```bash
deploy-full.bat
```

This will:
- Build frontend
- Restart backend (PM2)
- Restart IIS
- Show status

## Checking Status

```bash
# Backend
pm2 list
pm2 logs psba-hr-api

# IIS
appcmd list site
appcmd list apppool

# Frontend files
dir C:\inetpub\wwwroot\dist
```

## Troubleshooting

### Build Errors
```bash
cd frontend
npm install    # Update dependencies
npm run build
```

### Backend Not Running
```bash
# Check status
pm2 status

# Restart
pm2 restart psba-hr-api

# View logs
pm2 logs psba-hr-api
```

### IIS Not Serving Files
```powershell
# Restart IIS
iisreset /restart

# Check website exists
appcmd list site /name:PSBA-HR
```

### Files Not Updating After Build
```bash
# Clear IIS cache and restart
iisreset /restart

# Manually check deployment
dir frontend\dist
dir C:\inetpub\wwwroot\dist
```

## Environment Configuration

### Frontend Build Paths
- **Development:** `npm run dev` → Port 5176
- **Production Build:** `npm run build` → `frontend/dist`
- **IIS Served:** `frontend/dist` → `C:\inetpub\wwwroot\dist` → Your domain

### Backend Configuration
- **Development:** `npm run dev` → Port 3000
- **Production:** PM2 → Port 3100 (private, only via reverse proxy)

### API Proxying
All requests to `/api/*` are automatically proxied:
- Browser → `http://domain/api/...`
- IIS Reverse Proxy → `http://127.0.0.1:3100/api/...`
- Backend Process → Responds

## Security Notes

- Port 3100 is **NOT** directly accessible from outside
- All traffic must go through IIS reverse proxy (port 80/443)
- Enable HTTPS/SSL for production
- Static files are cached and served efficiently
- API requests are proxied securely through localhost

## Common Commands Reference

```bash
# Frontend
npm run build              # Build and auto-deploy to IIS
npm run dev                # Dev server on port 5176

# Backend
pm2 start ecosystem.config.js
pm2 restart psba-hr-api
pm2 stop psba-hr-api
pm2 logs psba-hr-api

# IIS
iisreset /restart          # Restart IIS
appcmd list site           # List websites
appcmd stop site PSBA-HR   # Stop website
appcmd start site PSBA-HR  # Start website

# Deployment
npm run build              # Build frontend (from frontend dir)
deploy-full.bat            # Full deployment (as Admin)
```

## Logs Location

- **Backend:** `server/logs/` (PM2 logs)
- **IIS:** `C:\inetpub\logs\LogFiles\`
- **Build:** Console output when running `npm run build`
