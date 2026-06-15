# Implementation Plan — Seed 1,547 Real Employees + Required System Changes

Companion to `EXCEL_VS_SYSTEM_ANALYSIS.md`. Reflects all decisions made in conversation.
**Status: plan only — no code written yet.**

## Locked decisions
| Topic | Decision |
|---|---|
| Employee identity | **Remove `Employee.employee_id` string code** (and its generator). **CNIC = single source of truth.** Keep all Int FKs named `employee_id`. |
| Biometric ID | **Reuse `deviceUserId`** column; relabel "Biometric ID" in add/edit/detail forms. Seed Excel Biometric ID → `deviceUserId`. |
| Johar Town | Map to existing **Sahulat Bazaar Mian Plaza**. |
| Sahulat on the GO | New **`Location.type = "MOBILE_BAZAAR"`** (roadside/non-regular). |
| Anti Encroachment Squad / Anti Theft Cell | Create as **Location** AND as **RoleTag**. |
| Logins | Keep current model — **no individual logins** for the 1,547; only bazaar + department/functional accounts. |
| Daily-Wages/Stopgap (272) | Same structure as Payroll (Employment + EmploymentSalary); only `employment_type` differs. |
| Salary & unknown fields | Seed **0 / defaults, never null**. |
| Religion | `"Islam"` / literal `"Non-Muslim"`. |

---

## Phase 0 — Pre-flight (no DB writes)
1. **Build a clean import dataset** from the Excel with a Python ETL script that emits a normalized JSON the seed can consume. Transformations:
   - Normalize cost-center casing (`GO`/`Go`, `DG KHAN`→`DG Khan`).
   - Apply the §2 cost-center→location map (43 clean + 5 fuzzy + Johar Town→Mian Plaza).
   - Normalize mobiles (`0320-2790970`→`03202790970`).
   - Parse CNIC expiry text → `cnic_lifetime` (Lifetime/Life Time) / leave date null + flag (Expired).
   - Split inline `Present:/Permanent:` addresses; else copy present→permanent (`same_address=true`).
   - Map religion, gender, disability, payroll type.
   - Map Education free-text → `EducationLevel` (extend the existing `mapLevelName` heuristic) + raw string kept in `EducationQualification`.
   - Split Designation multi-line → designation + "Additional Charge" remark.
2. **Quarantine bad rows for manual review** (don't silently drop): 12-digit CNIC (1), Biometric `"AE"`, the 13 non-numeric biometrics — log to a `import_issues.csv`.
3. **Verify counts**: 1,547 in → 1,547 out (minus any you choose to fix), CNIC uniqueness holds.

## Phase 1 — Schema changes (`schema.prisma` + migration)
1. **Remove `Employee.employee_id`** field (the `String? @unique` human code at line 12). Generate a Prisma migration.
   - ⚠️ Do **not** touch `Employment.employee_id`, `User.employee_id`, `EmployeeDocument.employee_id`, etc. — those are Int FKs to `Employee.id`.
2. **Add `MOBILE_BAZAAR`** as an accepted `Location.type` value (it's a free String today — just a convention + any UI enum/select).
3. No new column for biometric (reusing `deviceUserId`).
4. Run migration against dev DB; regenerate Prisma client.

## Phase 2 — Backend code changes
1. `employeeService.js` — **delete the `employee_id` generator** (lines ~24–27) and the field from `employeePayload` (line ~64). Audit create/update/list/detail for the string field.
2. Grep the 24 server files for **string** `employee_id` (Employee code) vs **FK** `employee_id` and remove only string-code references. Likely spots: employee controller, search/filter by code, any DTO.
3. Ensure employee endpoints accept/return `deviceUserId` (biometric) on create/update.
4. Confirm payroll/attendance still function (they key on `deviceUserId` + `Employee.id`, unaffected by removing the code).

## Phase 3 — Frontend code changes
1. Add/Edit/Detail employee forms (`features/employees/...`): 
   - Remove any "Employee ID/Code" input bound to `Employee.employee_id`.
   - Add a **"Biometric ID"** field bound to `deviceUserId` (optional; many blank).
2. Employee list/search columns: drop the code column; surface CNIC as the identifier.
3. Verify the 7 employee feature files + employee store don't break on the removed field.

## Phase 4 — Master-data seeding (rewrite seed sections)
1. **Districts & Cities**: expand from 4 to the full set implied by cost centers (~30+ districts). Build the district list, attach each Location.
2. **Scale Grades**: create grades for all values present (1,3,4,5,6,7,9,11,12,14,16,17,18,19,20) — naming TBD (e.g. `BPS-1`…`BPS-20`).
3. **Designations**: replace seed list with the **61 from Excel** (cleaned of typos: `Sabitation`→`Sanitation`, `Sub-Engineer` variants, `Assistant Director (...)`). Decide department attachment (operational designations may be deptless).
4. **Departments**: reconcile Excel's 15 (HO) with existing 19; map or rename.
5. **Locations**: keep existing bazaars; create the 6 new permanent bazaars, 19 MOBILE_BAZAAR, and the 2 special units. Retire/keep Narowal (no employees) — your call.
6. **Role Tags**: add "Anti Encroachment Squad" and "Anti Theft Cell".

## Phase 5 — Employee + Employment + child-record seeding
1. Replace the 18 dummy employees with the 1,547 (idempotent: upsert by CNIC).
2. For each: create 1 `Employment` (organization=PSBA, type=Payroll/DailyWages, effective_from=Joining, location_id from map, designation_id, scale_grade_id, department_id if HO) + 1 `EmploymentSalary` (basic 0, bank fields from Excel) + `EducationQualification` rows where present.
3. Keep existing bazaar/department/functional **User** accounts as-is.
4. Re-point the seed's hardcoded leadership references (DG, ADs) to real CNIC-based lookups, or drop the dummy leadership block.

## Phase 6 — Verification
1. Row counts: Employee=1,547; Employment=1,547; EmploymentSalary=1,547.
2. Every employee has a resolvable `location_id`; print any unmapped cost centers.
3. CNIC + deviceUserId uniqueness; no orphan FKs.
4. Spot-check 10 employees across bazaar / HO / daily-wages / mobile-bazaar in the running app (forms load, biometric field shows, no employee-code errors).
5. Attendance + payroll smoke test on one HO employee with a biometric ID.

---

## FULL DECISION LOG (rounds 1–5, all confirmed)
| # | Decision |
|---|---|
| Bad CNIC (12-digit `322034333393`) | **Quarantine** → import_issues.csv, not seeded |
| Missing BS/Grade (643) | **Leave `scale_grade_id` null** |
| Field-staff department (1,372) | **Leave `department_id` null** |
| CNIC field | **Make REQUIRED (non-null)** in schema |
| Biometric `"AE"` ×13 | Treat as **null** (invalid; unique constraint) |
| Phone multi-value (41) | **1st → mobile_number, 2nd → whatsapp_number**; garbage → null |
| Addresses | **Present only**; permanent = empty string (the 57 explicit splits parse both) |
| Missing personal fields | `nationality="Pakistani"`, others `"Unknown"` (never null) |
| Scale-grade naming | **`BS-1` … `BS-20`** |
| `W/O` father names (9) | `relationship_type="spouse"`, strip `W/O` |
| `"Expired"` CNICs (4) | `cnic_expire_date=null` + `missing_note` |
| `Lifetime`/`Life Time` (27) | `cnic_lifetime=true`, date null |
| 5 fuzzy bazaar matches | **Merge** (same physical bazaars) |
| Mandi Faizabad | district = **Sheikhupura** |
| New bazaar districts | Arif Wala→Pakpattan, Burewala→Vehari, Jalalpur Pirwala→Multan, Nishtar Town→Lahore |
| Narowal bazaar | **Do not seed** |
| Designations | **Canonicalize** typos/variants (user reviews map) |
| Education | **12-level master approved** (No Formal Education, Literate, Matric, Intermediate, Diploma, Associate Degree, Bachelor, Master, MPhil, PhD, Professional Certification, Religious/Hafiz); best-effort map + keep raw text |
| Security & Parking variants | **Merge all into `Security & Parking Attendant`**, drop Welder/Electrician note |
| Departments | **Replace seed's 19 with Excel's 15**; re-link functional users |
| Dummy employees (18) | **Wipe**; keep functional + bazaar logins |
| Real employee ↔ login | **Match by CNIC, else exact name**; unmatched logins stay employee-less |
| Johar Town | → existing Mian Plaza bazaar |
| Sahulat on the GO (19) | new `Location.type="MOBILE_BAZAAR"` |
| Anti Encroachment / Anti Theft | Location **and** RoleTag |
| Logins for 1,547 | none (only bazaar + dept/functional accounts) |
| Daily-Wages (272) | same structure as Payroll, `employment_type` differs |
| Salary | seed 0 |
| Religion | "Islam" / literal "Non-Muslim" |
| `Employee.employee_id` code | **Removed** from schema + code; CNIC is identity |
| Biometric ID | reuse `deviceUserId`, relabel in forms |

## Still-open items (non-blocking — propose defaults, you can correct)
- New-bazaar districts: Arif Wala→Pakpattan, Burewala→Vehari, Jalalpur Pirwala→Multan, Nishtar Town→Lahore, **Mandi Faizabad→? (need district)**.
- Confirm §2b fuzzy matches are the same physical bazaars.
- Scale-grade naming convention (`BPS-n` vs `Grade-n`).
- Whether deptless operational designations are acceptable, or all need a department.
- Narowal bazaar (0 employees): keep or retire.

## Risks
- Removing `employee_id` touches many files — needs careful string-vs-FK disambiguation (Phase 2 audit).
- Education free-text (164 variants) won't map perfectly to 6 levels — accept best-effort + keep raw string.
- 386 joining dates in 2026 — confirm not data-entry artifacts before they drive probation/seniority logic.
- District/city expansion may ripple into any UI that assumes the original 4.
