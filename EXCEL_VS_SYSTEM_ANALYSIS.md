# Excel Data vs HR System — Comprehensive Gap Analysis

**Source file:** `Data for HR Software(12-6-26).xlsx` — 1 sheet, **1,547 employee rows**, 26 columns.
**Goal:** Replace dummy seed data with the real 1,547 employees. This document is analysis only — **no code/seed changes made yet.**

---

## 1. Excel file at a glance

| # | Column | Non-null | Notes |
|---|--------|----------|-------|
| 0 | Sr No | 1547 | Row serial only (not an employee ID) |
| 1 | Organization Name | 1547 | All `PSBA` |
| 2 | **CNIC No.** | 1547 | **Unique key.** All 13-digit **except 1 row = 12 digits** (bad) |
| 3 | Biometric ID | 971 | Maps to attendance `deviceUserId`. 576 blank, 1 value = `"AE"` (bad), 13 non-numeric |
| 4 | CNIC Issue Date | 1529 | 18 blank |
| 5 | CNIC Expiry Date | 1529 | 22 `Lifetime` + 5 `Life Time` + 4 `Expired` (text, not dates) |
| 6 | Date of Birth | 1537 | 10 blank |
| 7 | Age | 1547 | Derived from DOB — ignore |
| 8 | Muslim/Non Muslim | 1547 | 1311 Muslim / 236 Non Muslim |
| 9 | Male/Female | 1547 | 1481 Male / 66 Female |
| 10 | Disable/Special Person | 20 | Only 20 flagged disabled |
| 11 | Employee Name | 1547 | 1243 unique names (common names repeat; CNIC is the real key) |
| 12 | Father Name | 1545 | Some are `W/O <name>` (wife-of → spouse relationship) |
| 13 | Designation | 1547 | **61 distinct.** Some multi-line ("... + Additional Charge of ...") |
| 14 | BS/Grade | 904 | Grades 1–20; **643 blank** (all 272 Daily-Wages + 371 Payroll) |
| 15 | Department | 171 | **Only Head-Office staff have departments.** 15 distinct |
| 16 | Joining | 1547 | Range 2011 → 2026; **386 joined in 2026** |
| 17 | Salary | 1547 | **All 0** — no real salary data in file |
| 18 | Bank Account Number | 1521 | 26 blank |
| 19 | Name of Bank | 1521 | All `Allied Bank Limited` |
| 20 | **Cost center** | 1547 | **79 distinct city/location names → must map to bazaars** |
| 21 | Education | 1105 | Free text, 164 distinct, 442 blank |
| 22 | Address | 1539 | Single field; some contain `Present:/Permanent:` split inline |
| 23 | Contact No. | 1535 | Format `0320-2790970` |
| 24 | Personal Email Address | 114 | Only 114 employees have email |
| 25 | Payroll/DailyWages | 1547 | 1275 Payroll / 272 Daily Wages-Stopgap |

---

## 2. Cost center → Bazaar/Location mapping (the core mapping task)

The Excel has **79 cost centers**. The seed file defines bazaars as `Sahulat Bazaar <Name>`.
Result of automated matching:

### 2a. Clean matches — 43 cost centers map directly to existing seed bazaars
Bahawalpur, Bhakkar, Bhalwal, Bhera, Chakwal, China Scheme, Chiniot, Chung, Chunian, DG Khan
(+`DG KHAN` case-dup), Farooqabad, Gujranwala, Gujrat, Hafizabad, Harbanspura, Jampur, Jhang,
Kasur, Khanewal, Khushab, Layyah, Lodhran, Mandi Bahauddin, Mianwali, Millat Road, Muzaffargarh,
Okara, Pakpattan, Pattoki, Raiwind, Rawalpindi, Sabzazaar, Sahiwal, Sargodha, Sharaqpur Sharif,
Sialkot, Thokar, Toba Tek Singh, Township, Vehari, Wahdat Colony, Wazirabad.

### 2b. Fuzzy matches — same bazaar, spelling differs (need confirmation)
| Excel cost center | Seed bazaar | Count |
|---|---|---|
| Sher Shah Colony | Sahulat Bazaar Shershah | 33 |
| Taunsa | Sahulat Bazaar Taunsa Sharif | 14 |
| Jarranwala | Sahulat Bazaar Jaranwala | 16 |
| Noshera Virkan | Sahulat Bazaar Nowshera Virkan | 11 |
| Jhang Road Faisalabad | Sahulat Bazaar Jhang Road | 37 |

### 2c. NEW permanent bazaars — in Excel, **not** in seed (need creation + confirmation)
| Cost center | Count | Likely district |
|---|---|---|
| Arif Wala | 12 | Pakpattan |
| Burewala | 17 | Vehari |
| Jalalpur Pirwala | 15 | Multan |
| Johar Town | 35 | Lahore (is this = seed "Mian Plaza"? **need answer**) |
| Mandi Faizabad | 12 | ? |
| Nishtar Town | 14 | Lahore? |

### 2d. NEW "Sahulat on the GO" mobile bazaars — not in seed (19 distinct, ~200 employees)
Awan Town, Barki Road, Chowk Azam Layyah, Fatehpur Layyah, Ferozwala, Gulshan Ravi, Karor Lal
Easan Layyah, Kharak Nala, Khatam e Nabuwat, Kot Sultan Site Layyah, Kotha Pind Faisal Town,
Mader e Millat, Madina Market Township, Manga Mandi, Minor Road Layyah, Raiwind Sundar Road,
Shadman, Shahdarah, Valencia.
*(Note inconsistent casing `GO`/`Go` produces duplicate cost-center strings that must be normalized.)*

### 2e. Non-bazaar cost centers (special handling)
| Cost center | Count | Proposed type |
|---|---|---|
| Head Office | 175 | HEAD_OFFICE (seed "Head Quarter") |
| Anti Encroachment Squad | 25 | Special unit — not a bazaar |
| Anti Theft Cell | 10 | Special unit — not a bazaar |

### 2f. Seed bazaars with **zero** employees in Excel
Mian Plaza, Narowal — (plus the ones renamed in 2b). Keep, retire, or merge? **Need answer.**

---

## 3. Current system state (what dummy data exists)

- **18 dummy employees** (leadership + a few staff) with fake CNICs like `3520212345671`.
- **18 employment records**, 49+ bazaar locations, ~24 functional/department user accounts + ~49 bazaar user accounts.
- Master data seeded: 4 districts (Lahore, Faisalabad, Jhang, Layyah), 4 cities (same), 6 education levels,
  19 departments, ~35 designations, 10 role tags, **only 4 scale grades (BPS-17..20)**, 6 master locations + 49 bazaars.
- **Bazaars/users are "almost correct"** per your note — they are the reliable anchor for mapping.

---

## 4. Field-by-field mapping: Excel → Schema

| Excel column | Target model.field | Transform / issue |
|---|---|---|
| CNIC No. | `Employee.cnic` | Unique key; fix 1×12-digit row |
| Biometric ID | `Employee.deviceUserId` | Links attendance; 576 null, clean `"AE"` |
| CNIC Issue Date | `Employee.cnic_issue_date` | direct |
| CNIC Expiry Date | `Employee.cnic_expire_date` + `cnic_lifetime` | "Lifetime/Life Time"→`cnic_lifetime=true`, "Expired"→? |
| Date of Birth | `Employee.date_of_birth` | 10 null |
| Muslim/Non Muslim | `Employee.religion` | Muslim→"Islam"; Non-Muslim → **which religion? unknown** |
| Male/Female | `Employee.gender` | direct |
| Disable/Special Person | `Employee.has_disability` | 20 true |
| Employee Name | `Employee.full_name` | direct |
| Father Name | `Employee.father_husband_name` (+`relationship_type`) | `W/O` → spouse |
| Designation | `Designation` (+ `Employment.designation_id`) | 61 to create; split "Additional Charge" remark |
| BS/Grade | `ScaleGrade` (+ `Employment.scale_grade_id`) | **create grades 1–20**; 643 null |
| Department | `Department` (+ `Employment.department_id`) | 15 (HO only); rest no dept |
| Joining | `Employment.effective_from` | direct |
| Salary | `EmploymentSalary.basic_salary` | **all 0 — no data** |
| Bank Account Number | `EmploymentSalary.bank_account_primary` | direct |
| Name of Bank | `EmploymentSalary.bank_name_primary` | all "Allied Bank Limited" |
| Cost center | `Employment.location_id` → `Location` | the §2 mapping |
| Education | `EducationQualification` (+ `EducationLevel`) | parse 164 free-text strings |
| Address | `Employee.present_address`/`permanent_address` | split inline Present/Permanent |
| Contact No. | `Employee.mobile_number` | normalize `0320-2790970`→`03202790970` |
| Personal Email Address | `Employee.email` | only 114; unique constraint |
| Payroll/DailyWages | `Employment.employment_type` | "Daily Wages/Stopgap" vs "Payroll/Regular" |

### Schema fields with **no Excel source** (will be null/defaulted)
`mother_name`, `marital_status`, `nationality` (assume Pakistani?), `blood_group`,
`domicile_district`, `whatsapp_number`, present-vs-permanent split, `reporting_officer_id`,
`employee_id` (human code like EMPDG001 — generate?).

---

## 5. Master-data gaps the system must absorb

1. **Scale Grades:** seed has BPS-17..20 only. Excel uses grades **1,3,4,5,6,7,9,11,12,14,16,17,18,19,20**. → create all.
2. **Designations:** Excel's 61 are mostly operational (Security & Parking Attendant ×599, Sanitation Attendant ×338, Sahulat Bazaar Supervisor ×251, Record Keeper ×151, Gardener ×40 …). Seed designations are office-hierarchy roles → **near-total replacement.** Also typos to clean: `Sabitation Attendant`, `Sub-Engineer` variants, `Assistant Director (...)` variants.
3. **Departments:** Excel's 15 (Admin, Operations, Monitoring, Civil, Accounts, Projects & Management Unit, Establishment, IT, Audit, Devops, Electrical, Home Delivery, Media, Competent Authority, Legal) differ from the seed's 19 (different naming). → reconcile.
4. **Districts/Cities:** seed has only 4 districts + 4 cities. Cost centers span ~30+ districts across Punjab → **must expand district/city master data** (or leave Location.district_id null).
5. **Locations:** ~25–28 new permanent + 19 on-the-go + 2 special units to create.
6. **Religion** has only Islam in education-level seeds; "Non Muslim" needs a generic value.

---

## 6. Data-quality issues to resolve before seeding

- 1 CNIC is 12 digits; Biometric ID `"AE"` and 13 non-numeric values.
- 643 rows missing BS/Grade; 442 missing Education; 576 missing Biometric ID; 26 missing bank account.
- Cost-center casing duplicates (`GO`/`Go`, `DG KHAN`/`DG Khan`).
- 386 joining dates in 2026 (current year — plausible new hires, confirm not data-entry errors).
- Salary column is entirely 0 → payroll cannot be computed from this file.
- Only 114 emails → vast majority of employees will have **no login / no `User` record** (operational staff). Confirm that's intended.

---

## 6b. DECISIONS MADE (round 1)

- **Johar Town (35)** → map to existing **Sahulat Bazaar Mian Plaza** (same physical bazaar).
- **"Sahulat on the GO" (19, ~200 emps)** → model as a **new bazaar type** (roadside, non-regular/mobile). Proposed `Location.type = "MOBILE_BAZAAR"`.
- **Anti Encroachment Squad / Anti Theft Cell** → create as **Locations AND as Role Tags** (employees attach via location, plus a role tag identifies the unit).
- **Login accounts** → **keep current approach**: only bazaar + department/functional accounts. The 1,547 field-staff get employee records but **no User logins**.

## 6c. DECISIONS MADE (round 2) — includes SYSTEM/SCHEMA CHANGES

- **Remove `Employee.employee_id`** (the EMPxxx code) from schema + all code. **CNIC is the single source of truth / employee ID.**
  ⚠️ Careful: `Employment.employee_id`, `User.employee_id`, etc. are **Int foreign keys to Employee.id** — those stay. Only the human-code string field `Employee.employee_id` is removed.
- **Biometric ID** must be a visible field on Employee + on detail/add/edit forms. Some employees have it, some don't. Legacy attendance machines + their `deviceUserId` are being retired. → decide whether to repurpose `deviceUserId` or add a new `biometric_id` field.
- **Daily-Wages/Stopgap (272):** same structure as Payroll (Employment + EmploymentSalary), only `employment_type` differs.
- **Salary & missing fields:** seed `0`/defaults, **never null** (null breaks record updates in the app).
- **Religion:** `"Islam"` for Muslim, literal `"Non-Muslim"` for the rest.
- **Biometric ID impl:** **reuse the existing `deviceUserId` column**, relabel it "Biometric ID" in add/edit/detail forms. No new column; nulls stay null (unique allows multiple nulls). Excel Biometric ID → `deviceUserId`.

## 7. Open questions for you (blocking decisions)

1. **Johar Town (35 emps)** — new bazaar, or is it the existing `Sahulat Bazaar Mian Plaza` (Johar Town)?
2. New permanent bazaars (Arif Wala, Burewala, Jalalpur Pirwala, Mandi Faizabad, Nishtar Town) — confirm names + which district each belongs to.
3. **"Sahulat on the GO"** — should these be a distinct `Location.type` (e.g. `MOBILE_BAZAAR`) or just `BAZAAR`?
4. **Anti Encroachment Squad / Anti Theft Cell** — Locations, Departments, or something else?
5. Bazaars in seed with no employees (Mian Plaza, Narowal) — keep or retire?
6. Confirm fuzzy matches in §2b are the same physical bazaar.
7. **employee_id** human code — generate a scheme (e.g. PSBA-00001) or leave null and rely on CNIC?
8. **Non-Muslim religion** — store literal "Non Muslim", or leave specific religion blank?
9. Should the 272 Daily-Wages/Stopgap workers get `Employment` + `EmploymentSalary` rows like Payroll staff?
10. Do you want **User/login accounts** created for any of the 1,547 (beyond the 114 with email), or only bazaar/department accounts as today?
11. Salary is all 0 — seed salary as 0 for now and load real salaries later?
