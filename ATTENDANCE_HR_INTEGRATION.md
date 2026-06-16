# HR ⇄ Attendance System Integration

Single source of truth with an availability-aware design:

- **Employees** → the **HR system** is the master.
- **Attendance** → the **Attendance System** (DigitalOcean droplet) is the master.
- The **HR system is the client in both directions**. The always-on droplet is a pure
  server and never calls back into the on-prem network — so when HR is down, nothing
  on the droplet is affected; the tablets keep running off the droplet's local roster.
- The HR DB keeps a **rolling 3-month backup** of attendance (`FaceAttendance`).

`cnic` is the universal join key (already `@unique` in both databases).

```
   ON-PREM (may be DOWN)                       DROPLET (always ON)
   HR  Employee (MASTER) ──push──▶ POST /admin/employees/sync ──▶ Employee mirror ──▶ tablets
   HR  FaceAttendance ◀──pull───── GET  /admin/attendance/export ◀── Attendance (MASTER)
```

## What changed

### Attendance System (droplet) — `PSBA-Attendance-System/face-attendance-server`
- `prisma/schema.prisma` — `Employee` gained `status` (Active/Inactive) and `hrSyncedAt`.
- `src/syncRoutes.js` (new) — two admin-protected endpoints:
  - `POST /admin/employees/sync` — upsert roster by `cnic` (HR push target).
  - `GET  /admin/attendance/export?cursor=&since=&limit=` — id-cursor incremental export.
- `src/index.js` — registers the sync routes.

Both endpoints reuse the existing `requireAdmin` auth: send header
`x-admin-token: <ADMIN_TOKEN>` (or a Bearer admin JWT).

### HR System — `server`
- `prisma/schema.prisma` — new `FaceAttendance` model (local attendance mirror/backup).
- `src/jobs/attendanceSync.js` (new) — push employees, pull attendance (id watermark
  stored in `SystemSetting`), and prune to the rolling window. Scheduled with `node-cron`.
- `src/routes/faceAttendanceRoutes.js` (new) — mounted at `/api/face-attendance`:
  - `GET  /api/face-attendance` — query the backup (cnic/from/to/punchType/limit/offset).
  - `GET  /api/face-attendance/status` — sync health (cursor, last push, record count).
  - `POST /api/face-attendance/sync/:job` — manual trigger (`employees|attendance|prune|all`).
- `src/index.js` — mounts the route and starts the sync jobs on boot.
- `.env` — new `ATTENDANCE_*` config (sync is **off by default**).

## Setup

### 1. Droplet
A shared token must be set (the deploy already sets `ADMIN_PASSWORD`/`JWT_SECRET`).
Ensure `ADMIN_TOKEN` (or `ADMIN_PASSWORD`) in the droplet `.env` is a strong secret —
this is what HR sends as `x-admin-token`.

Deploy: pushing `face-attendance-server/**` to `main` runs the existing GitHub Action,
which executes `npx prisma db push` (adds the new columns) + `pm2 restart`. No manual
migration needed.

### 2. HR (`server/.env`)
```ini
ATTENDANCE_SYNC_ENABLED=true
ATTENDANCE_API_URL=http://139.59.122.254/api     # droplet nginx proxies /api -> server
ATTENDANCE_API_TOKEN=<same value as droplet ADMIN_TOKEN/ADMIN_PASSWORD>
ATTENDANCE_BACKUP_MONTHS=3
```
Apply the new table (additive, no data loss) and restart:
```bash
cd server
npx prisma db push
npm start            # or: npm run dev
```
On boot you'll see `[attendanceSync] started → …`. It runs a full employee reconcile +
attendance catch-up ~8s after start, then on the cron schedule (push/pull every 10 min,
full reconcile 01:30, prune 02:00 — all overridable via `ATTENDANCE_*_CRON`).

### 3. First-run cutover
1. With sync enabled, confirm the droplet roster matches HR:
   `GET http://139.59.122.254/api/employees` count ≈ HR active employees.
2. Confirm HR is receiving attendance: `GET /api/face-attendance/status`.
3. Retire the old CSV seed (`npm run db:seed:employees`) — HR now feeds the roster live.

## Failure behavior
- **HR down:** tablets keep working off the droplet's mirror; punches keep recording.
  When HR restarts, the boot catch-up + watermark backfills the gap and re-pushes the
  full roster. Nothing on the droplet ever blocks on HR.
- **Droplet briefly unreachable:** HR retries next tick. Upserts keyed on `cnic` /
  `sourceId` make every operation idempotent — no dupes, no lost data.

## Hardening TODO (deferred per current decision)
- Move the droplet behind **HTTPS** (domain + Let's Encrypt on the existing nginx)
  before this carries employee PII in production; currently plain HTTP + token.
- Restrict the droplet firewall so `/admin/*` is reachable only from the HR egress IP.
