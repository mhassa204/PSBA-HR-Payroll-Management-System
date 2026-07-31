# Workbook 30-7-26 v3 vs Production Data — Analysis

**New file:** `Data for HR Software(12-6-26) Reporting Line(18-7-26) 30-7-26v3.xlsx` — 1 sheet, **1,641 rows**, 31 columns. All CNICs valid + unique (0 bad, 0 dups).
**Production baseline:** the 10-7-26 v1 workbook (1,589 employees), applied via `npm run update:reporting` from `server/prisma/import/reporting_line_update.json`, on top of the original 12-6-26 seed (`seed:prod`).

---

## 1. Column-level changes (new vs 10-7-26 v1)

| Change | Column | Notes |
|---|---|---|
| NEW | `Staff Details` | HR's own upload flag: 1,544 "Already Uploaded" / 97 "New for Upload". **Stale** — 45 of the 97 are the July joiners we already seeded. Trust the CNIC diff, not this flag. |
| NEW | `Mother Name` | 1,486 filled (DB currently has placeholder "Unknown" for everyone). |
| RETURNED (junk) | `Salary` | All `1` — still no real salary data. |
| RETURNED (junk) | `Bank Account Number` | Does **NOT** contain account numbers — cells hold designation/location text (stray lookup column). Ignore. |
| RETURNED (junk) | `Name of Bank` | All "Allied Bank". No account numbers anywhere. Ignore. |
| NEW (unnamed) | col X (index 23, right of Cost center) | Repeats cost center for 1,480 rows but **overrides with status**: `Suspended` ×54, `Attachment Employees` ×29, `Attachment Employees (HO)` ×4, `#N/A` ×3, plus a few "actually working at" values (e.g. Harbanspura → Nishter Town). Semantics need HR confirmation. |

## 2. Row-level changes

- **+53 new employees** (not in 10-7-26): mostly Sahulat Bazaar Supervisors, Record Keepers, S&P/Sanitation Attendants; several at brand-new SOTG sites. Data quality of these rows is poor:
  - **0/53** have Biometric ID, **0/53** have BS/Grade, only 1 email, 2 mother names.
  - **39/53 have NO joining date and NO payroll type**; 12 more have junk `00:00:00` in Payroll/DailyWages.
  - 51/53 have a reporting officer (missing: the 2 Sue-e-Asal supervisors; the third no-RO row is the ADG himself).
  - One "new" row, **Nabeel Jamil** (Network Support Associate, HO), was in the original 12-6-26 seed → already in DB, will be skipped automatically.
- **−1 removed**: **Muhammad Rashid Javaid** (3640183734959, Arif Wala). Still in production DB. Scripts never delete — confirm exit with HR, then mark inactive via UI (droplet record then auto-deactivates).

## 3. Field changes on existing (already-seeded) employees

| Field | Rows | Nature |
|---|---|---|
| Personal Email | **639 added** | 0 changed/removed. Current apply script never updates existing employees → needs a new fill-where-empty pass. |
| CNIC Expiry / Issue | 110 / 97 | Card renewals + corrections. |
| **Cost center** | 70 | **68 real transfers** + 2 spelling-only. Full list in scratchpad diff; includes moves in/out of Anti Encroachment Squad & Anti Theft Cell. |
| Contact No. | 40 | Phone updates. |
| Date of Birth | 13 | Corrections. |
| Father Name | 4 | Corrections. |
| Reporting Incharge CNIC | 3 | All three were **self-reporting** rows before (skipped at apply time → DB empty) → a plain fill-where-empty pass sets them. 0 self-reporting rows remain; RO coverage 1,638/1,641. |
| Designation | 1 | Aneeza Zafar: blank → Record Keeper. |
| Biometric ID | 0 | No changes. |

## 4. New locations (must be created before seeding)

| Cost center | Emps | Type | District (guess — confirm) |
|---|---|---|---|
| Bahawalpur one unit (Sahulat on the Go) | 8 | MOBILE_BAZAAR | Bahawalpur |
| Sue-e-Asal SOTG | 2 | MOBILE_BAZAAR | Lahore |
| Nishter Colony | 2 | BAZAAR? | Lahore — **confirm it's not Nishtar Town** |
| Minchinabad | 1 | BAZAAR | Bahawalnagar |
| Pasrur | 1 | BAZAAR | Sialkot |
| Samundri | 1 | BAZAAR | Faisalabad |

Plus **new spelling variants** that must be added to the ETL alias map or rows quarantine as `UNMAPPED_COST_CENTER`: `Awan Town SOTG`, `Gulshan-e-Ravi SOTG`, `Kharak Naala SOTG`, `Madar-e-Millat SOTG`, `Madina Market Township SOTG`, `Shadman SOTG`, `Shahdara SOTG`, `Shershah`, `DG khan`, `Khatam-e-Nabuwat (Sahulat on the Go)`, `Nishtar Town (Sahulat on the GO)` (⚠ Nishtar Town now written as SOTG — did the permanent bazaar become mobile?).

## 5. Status information (NEW — no pipeline exists)

- **54 Suspended** employees (from the unnamed status column).
- **33 Attachment Employees** (29 + 4 "HO") — posted away from their cost center.
- ⚠ If we set `Employee.status = 'Suspended'`, the attendance sync marks them **inactive on the droplet** → face/fingerprint punching stops immediately. Decide deliberately.

## 6. Production update procedure (proposed)

Do **NOT** re-run `seed:prod` (would overwrite live edits). Follow the additive pattern:

1. **New ETL** (`transform_v3.py`, clone of `transform_reporting_update.py`): point at v3 file, extend cost-center alias maps + 6 new locations, read `Mother Name`, ignore Salary/Bank junk columns, treat `00:00:00`/blank payroll type as issue rows, emit `{employees, new_locations, transfers, backfills, reporting_lines, statuses}` → committed JSON.
2. **New apply script** (`apply_v3.js`, dry-run by default, idempotent phases):
   - create the 6 locations (with district/city);
   - create the 52 missing employees (existing CNICs skipped);
   - apply the 68 transfers **via `employmentTransferService` semantics** (EmploymentHistory TRANSFER row, `changed_at` = effective date — the file has none; default to 2026-07-30 unless HR supplies dates);
   - fill-where-empty backfills: email (dedupe first — unique constraint), mother_name (replace "Unknown"), DOB, contact, father name; **overwrite** CNIC issue/expiry (renewals are strictly newer);
   - set `reporting_officer_id` where empty (covers the 3 fixed self-reporters + new employees);
   - optional `--suspend` phase, off by default, pending decision.
3. On production: `git pull`, `npm run <apply_v3>` (dry run), review plan, re-run with `--apply`. No schema change needed.
4. After apply: create bazaar login accounts for the new locations (pattern of `scripts/create_roster_accounts.js`), review the issues CSV.

## 7. Attendance-system impact

- **Employee push is automatic**: production HR cron pushes to the droplet every 10 min (+ nightly full reconcile), keyed by CNIC. No manual step; `scripts/sync-employees-initial.js --push` (on prod) forces an immediate reconcile.
- **New 53 employees**: appear on droplet/tablets but have **no biometric enrollment** → must enroll face/fingerprint on a tablet before punching; until then they count absent in reports.
- **68 transfers**: droplet mirror updates location; HR location-wise reports (locationAgainstRoster/LSR, multi-select bazaar exports) attribute them to the NEW location — historical punches don't move, but any report grouped by *current* employment location re-buckets past data. Old-location **approved rosters are immutable** and stay in effect until superseded; new-location incharge must create fresh rosters, else the droplet default (09:15–17:00 Mon–Fri, 09:15 late cutoff) applies.
- **Suspended (if applied)**: droplet deactivates them → punches rejected, dropped from gallery sync.
- **Removed employee**: soft-delete in HR auto-deactivates his droplet record.
- Leave/roster approval routing: transfers keep the non-HEAD_OFFICE → Operations convention; the 3 RO fixes change HQ leave routing for those people.

## 8. Open questions (blocking)

1. Unnamed status column semantics — confirm "Suspended"/"Attachment" meaning and the few "working-at" overrides.
2. Suspend in HR (and hence block attendance) for the 54 — yes/no?
3. How to record the 33 Attachment Employees (role tag vs location change)?
4. Nishter Colony = Nishtar Town? Nishtar Town now a mobile (SOTG) bazaar?
5. Effective dates for the 68 transfers (file has none).
6. Joining date + payroll type for the 39 blank new rows — get from HR or seed as null/Regular?
7. Muhammad Rashid Javaid — confirmed exit?
