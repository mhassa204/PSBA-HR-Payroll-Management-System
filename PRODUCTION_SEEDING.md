# Production Seeding & Migration Guide

How to push the Excel employee data (and master data) to a **production** server,
and how to apply the schema/data migrations safely. All production scripts are
**idempotent and non-destructive** (they never wipe data).

## One-time / refresh: seed employees from the Excel

The Excel file is transformed into a committed JSON artifact, which the production
seeder consumes. Python is only needed to (re)generate the JSON from a new Excel —
**production itself only needs Node.**

```bash
# 1. (local, where Python is available) regenerate JSON from the Excel
cd server
npm run etl
#    -> writes prisma/import/employees.normalized.json  (+ import_issues.csv)

# 2. commit the regenerated JSON
git add server/prisma/import/employees.normalized.json && git commit -m "Refresh employee data"

# 3. (production) apply schema, then seed idempotently
cd server
npx prisma migrate deploy        # or: npx prisma db push   (applies new columns)
npm run seed:prod                # idempotent: upserts master data + employees by CNIC
```

`seed:prod` ([prisma/seedProduction.js](server/prisma/seedProduction.js)):
- Upserts districts/cities (full Punjab), education levels, departments, scale grades,
  designations, role tags, and all 75 locations **with district + city**.
- Upserts every employee **by CNIC** (+ current employment, salary, education).
- Safe to re-run — existing rows are updated, not duplicated.

> `npm run seed` (NOT `seed:prod`) is the **local-dev** seeder — it WIPES and rebuilds.
> Never run `npm run seed` against production.

## July 2026 update: new joiners + reporting lines

The 10-7-26 HR workbook (`Data for HR Software(12-6-26) Reporting Line(10-7-26) v1.xlsx`)
added 45 new employees and a **Reporting Incharge CNIC** column. This is applied by a
dedicated, strictly-additive script — **do NOT re-run `seed:prod` for this** (it would
overwrite live employee edits with workbook values).

```bash
# 1. (local, Python) regenerate the update payload from the new Excel
cd server
npm run etl:reporting        # -> prisma/import/reporting_line_update.json (+ issues csv)
git add prisma/import/reporting_line_update.json && git commit -m "Reporting line payload"

# 2. (production, Node only)
cd server
npm run update:reporting               # DRY RUN — prints the full plan, writes nothing
npm run update:reporting -- --apply    # execute
```

`update:reporting` ([scripts/apply_reporting_line_update.js](server/scripts/apply_reporting_line_update.js)):
- **Creates** employees whose CNIC is missing (never updates existing employees).
- Creates the one new location (Sahulat Bazaar Haideri Chowk Rawalpindi (On the GO)).
- Sets `Employment.reporting_officer_id` (= RO's Employee.id, the format the
  leave/travel approval routing expects) on current employments **only where empty**;
  pass `--overwrite-reporting` to replace values that were already set differently.
- Skips + reports anomalies (self-reporting rows, missing CNICs). Idempotent —
  a second run is a no-op.

## Data migrations (run once after deploying the new schema)

```bash
cd server
npm run migrate:joining-date     # backfills Employment.joining_date from effective_from
npm run backfill:location-geo    # ensures every Location has a district + city
```

Both are idempotent — re-running them is a no-op once applied.

## What the scripts do

| Script | Purpose | Destructive? |
|---|---|---|
| `npm run etl` | Excel → normalized JSON (+ quarantine log) | No (writes files) |
| `npm run seed:prod` | Upsert master data + employees from JSON | **No** |
| `npm run migrate:joining-date` | Copy effective_from → joining_date, clear effective_from/till | No (idempotent) |
| `npm run backfill:location-geo` | Fill district_id/city_id on all locations | No (idempotent) |
| `npm run seed` | **Local dev only** — wipe + rebuild | **YES — dev only** |

## Quarantined rows

`server/prisma/import/import_issues.csv` lists rows that were not seeded (e.g. an
invalid 13-digit CNIC) or were auto-corrected (invalid biometric IDs). Review it
after each ETL run and fix the source Excel as needed.
