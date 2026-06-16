# HR ⇄ Attendance System Integration

Single source of truth with an availability-aware design:

- **Employees** → the **HR system** is the master.
- **Attendance** → the **Attendance System** (DigitalOcean droplet) is the master.
- The **HR system is the client in both directions**. The always-on droplet is a pure
  server and never calls back into the on-prem network — so when HR is down, nothing
  on the droplet is affected; tablets keep running off the droplet's local roster.
- The HR DB keeps a **rolling 3-month backup** of attendance in its existing
  `Attendance` table (face rows tagged `source = "face"`).

`cnic` is the universal join key (already `@unique` in both databases).

```
   ON-PREM (may be DOWN)                       DROPLET (always ON)
   HR  Employee (MASTER) ──push──▶ POST /admin/employees/sync ──▶ Employee mirror ──▶ tablets
   HR  Attendance(source=face) ◀─pull─ GET /admin/attendance/export ◀── Attendance (MASTER)
```

## Data model — `Attendance` table (face-only)

The legacy ZKTeco biometric flow has been **removed entirely**. The HR `Attendance`
table now holds **only** face-recognition punches mirrored from the droplet, keyed by
`cnic`:

| Field | Meaning |
|---|---|
| `cnic` | join key to `Employee.cnic` |
| `type` | `IN` / `OUT` (mapped from droplet `CHECK_IN` / `CHECK_OUT`) |
| `timestamp`, `attendanceDate` | punch time + normalized PK calendar day |
| `source_id` (`@unique`) | droplet `Attendance.id` — makes the pull **idempotent** |
| `name`, `verify_mode`, `auth_method`, `score`, `punch_source`, `source_device_id` | mirror metadata |

Removed in this cutover: the `Device` model, `Employee.deviceUserId`, the ZKTeco
ingestion service, device-fetch endpoints, and the `node-zklib` / `zklib-ts` deps.
Reports (FMO / roster / LSR), payroll, and the dashboard now join attendance by `cnic`,
and determine an employee's location from their **roster / current employment** (not a
device). Pruning keeps a rolling `ATTENDANCE_BACKUP_MONTHS` window (default 3).

## Components

### Attendance System (droplet) — `PSBA-Attendance-System/face-attendance-server`
- `src/syncRoutes.js` — admin-protected: `POST /admin/employees/sync` (roster upsert
  by cnic) and `GET /admin/attendance/export?cursor=&since=&limit=` (id-cursor export).
- `src/index.js` — registers the routes; JSON body limit raised to `5mb`.
- `prisma/schema.prisma` — `Employee` has `status` + `hrSyncedAt`.
- Auth: send header `x-admin-token: <ADMIN_TOKEN>` (must equal droplet `ADMIN_TOKEN`).

### HR System — `server`
- `prisma/schema.prisma` — `Attendance` extended (see table above).
- `src/jobs/attendanceSync.js` — push employees (incremental + nightly full reconcile),
  pull attendance (id watermark in `SystemSetting`), prune. Started from `index.js`.
- `src/routes/faceAttendanceRoutes.js` — `/api/face-attendance` read + status + manual
  trigger (reads `Attendance` where `source = "face"`).
- `scripts/sync-employees-initial.js` — one-time reconciliation (report + `--push`).
- `.env` — `ATTENDANCE_*` config (sync **off by default**).

---

# Setup from scratch

### A. Droplet (once)
The deploy GitHub Action (`.github/workflows/deploy.yml`) handles code + `npm ci` +
`prisma generate` + `prisma db push` + pm2 restart, and self-heals file ownership.

Set a shared machine token in the droplet `.env`
(`/home/psba/apps/PSBA-Attendance-System/face-attendance-server/.env`):
```ini
ADMIN_TOKEN=<openssl rand -hex 32>
```
The server has **no dotenv** — its env comes from PM2, so apply token changes with:
```bash
cd /home/psba/apps/PSBA-Attendance-System/face-attendance-server
sudo -u psba bash -lc 'set -a; . ./.env; set +a; PM2_HOME=/home/psba/.pm2 pm2 restart psba-api --update-env'
curl -s http://127.0.0.1/api/admin/me -H "x-admin-token: <token>"   # {"ok":true,...}
```

### B. HR server (every install — dev or on-prem production)
```bash
cd server
npm ci
# 1. create/extend the Attendance table + generate client (REQUIRED on each machine)
npx prisma db push
# 2. configure .env:
#    ATTENDANCE_SYNC_ENABLED=true        (enable on ONE HR instance only)
#    ATTENDANCE_API_URL=http://139.59.122.254/api
#    ATTENDANCE_API_TOKEN=<same as droplet ADMIN_TOKEN>
#    ATTENDANCE_BACKUP_MONTHS=3
npm start    # or: npm run dev
```
On boot you'll see `[attendanceSync] started → …`, an ~8s catch-up (full employee
reconcile + attendance pull), then the cron schedule (push/pull every 10 min, full
reconcile 01:30, prune 02:00).

> Run the sync cron on **one** HR instance only. On any other instance set
> `ATTENDANCE_SYNC_ENABLED=false` to avoid redundant pushing/pulling.

### C. One-time employee reconciliation
With `.env` configured:
```bash
cd server
node scripts/sync-employees-initial.js          # dry run — review matched/new/orphans
node scripts/sync-employees-initial.js --push    # apply: create new + update matched
```
The script flags likely CNIC typos (same name, 1-digit-different CNIC) and lists orphans
(in attendance but not HR) without modifying them. Resolve those in HR, then re-run.

## Failure behavior
- **HR down:** tablets keep working off the droplet mirror; punches keep recording. On
  HR restart the boot catch-up + watermark backfills attendance and re-pushes the full
  roster. Nothing on the droplet blocks on HR.
- **Droplet briefly unreachable:** HR retries next tick. Upserts keyed on `cnic` /
  `source_id` are idempotent — no dupes, no lost data.

## Hardening TODO (deferred per current decision)
- Move the droplet behind **HTTPS** (domain + Let's Encrypt on nginx) before this
  carries employee PII in production; currently plain HTTP + token.
- Firewall `/admin/*` to the HR egress IP.
