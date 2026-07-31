#!/usr/bin/env python3
"""
ETL for the 30-7-26 v3 HR refresh — transforms
'Data for HR Software(12-6-26) Reporting Line(18-7-26) 30-7-26v3.xlsx' into
v3_update.json, consumed by scripts/apply_v3_update.js.

Differences from the 10-7-26 workbook (full analysis: EXCEL_V3_ANALYSIS.md):
  - added columns : 'Staff Details' (HR upload flag — stale, ignored),
                    'Mother Name' (1,486 real values)
  - junk columns  : 'Salary' (all 1), 'Bank Account Number' (designation text),
                    'Name of Bank' ('Allied Bank'), one unnamed status column —
                    ALL IGNORED (user decision 2026-07-31)
  - +53 employees, -1 (exit), 68 transfers, 639 new emails, ~100 CNIC renewals

User decisions baked in (2026-07-31):
  - the unnamed status column (Suspended/Attachment) is ignored entirely
  - 'Nishter Colony' / 'Nishtar Town' are the SAME bazaar; correct name is
    'Sahulat Bazaar Nishter Town' (rename emitted for the apply script)
  - 'Bahawalpur one unit' -> existing prod location
    'Sahulat Bazaar One Unit Bahawalpur (On the GO)' (created manually; only its
    login account is missing)
  - Sue-e-Asal is the only NEW location (MOBILE_BAZAAR, Lahore)
  - Minchinabad / Pasrur / Samundri are UNDER CONSTRUCTION: not created; the
    3 employees moved there in the file KEEP their current DB location
  - rows with blank/junk joining or payroll type: joining null, type Regular

The payload also carries a BASELINE snapshot (values from the previously applied
10-7-26 workbook) so the apply script can enforce the overwrite-only-untouched
rule: a changed field is written only if the DB still holds the old workbook's
value (i.e. it was never manually edited in the UI).
"""
import os, re, json, csv
from collections import Counter, OrderedDict
from datetime import datetime, date

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
import sys
sys.path.insert(0, HERE)
from transform_excel import (
    s, digits, iso, split_phones, split_address, map_education_level,
    canon_designation, scale_grade_name, canon_department,
    CLEAN_MATCH, FUZZY_MATCH, NEW_BAZAARS, SPECIAL_UNITS, HEAD_OFFICE_NAME, sb,
)

ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
XLSX_NEW = os.path.join(ROOT, "Data for HR Software(12-6-26) Reporting Line(18-7-26) 30-7-26v3.xlsx")
XLSX_OLD = os.path.join(ROOT, "Data for HR Software(12-6-26) Reporting Line(10-7-26) v1.xlsx")

OUT_JSON = os.path.join(HERE, "v3_update.json")
OUT_ISSUES = os.path.join(HERE, "v3_update_issues.csv")

NISHTER_TOWN = sb("Nishter Town")           # corrected name (rename from 'Nishtar Town')
ONE_UNIT_BWP = sb("One Unit Bahawalpur (On the GO)")  # exists in prod (added manually)
SUE_E_ASAL = sb("Sue-e-Asal (On the GO)")   # the ONE new location this round

KNOWN_15_DEPARTMENTS = {
    "Accounts Department", "Admin Department", "Audit Department", "Civil Department",
    "Competent Authority", "Devops Department", "Electrical Department",
    "Establishment Department", "Home Delivery Department", "IT Department",
    "Legal Department", "Media Department", "Monitoring Department",
    "Operations Department", "Projects & Management Unit Department",
}

# Existing mobile bazaars (canonical base name -> location base as seeded).
MOBILE_BASES = [
    "Awan Town", "Barki Road", "Chowk Azam Layyah", "Fatehpur Layyah", "Ferozwala",
    "Gulshan Ravi", "Karor Lal Easan Layyah", "Kharak Nala", "Khatam e Nabuwat",
    "Kot Sultan Site Layyah", "Kotha Pind Faisal Town", "Mader e Millat",
    "Madina Market Township", "Manga Mandi", "Minor Road Layyah",
    "Raiwind Sundar Road", "Shadman", "Shahdarah", "Valencia",
    "Haideri Chowk Rawalpindi",
]

def key(x):
    return re.sub(r"[^a-z0-9]", "", s(x).lower())

# base-key -> (final location name, type). Built once.
BASE_MAP = {}
for raw, name in {**CLEAN_MATCH, **FUZZY_MATCH}.items():
    BASE_MAP[key(raw)] = (name, "BAZAAR")
for raw, (name, _district) in NEW_BAZAARS.items():
    BASE_MAP[key(raw)] = (name, "BAZAAR")
for base in MOBILE_BASES:
    BASE_MAP[key(base)] = (sb(f"{base} (On the GO)"), "MOBILE_BAZAAR")

# v3 spelling aliases / decisions
BASE_MAP[key("Shershah")] = (sb("Shershah"), "BAZAAR")
BASE_MAP[key("Gulshan-e-Ravi")] = BASE_MAP[key("Gulshan Ravi")]
BASE_MAP[key("Kharak Naala")] = BASE_MAP[key("Kharak Nala")]
BASE_MAP[key("Madar-e-Millat")] = BASE_MAP[key("Mader e Millat")]
BASE_MAP[key("Shahdara")] = BASE_MAP[key("Shahdarah")]
# Nishtar/Nishter: one bazaar, corrected name (rename applied by the apply script)
BASE_MAP[key("Nishtar Town")] = (NISHTER_TOWN, "BAZAAR")
BASE_MAP[key("Nishter Town")] = (NISHTER_TOWN, "BAZAAR")
BASE_MAP[key("Nishter Colony")] = (NISHTER_TOWN, "BAZAAR")
BASE_MAP[key("Bahawalpur one unit")] = (ONE_UNIT_BWP, "MOBILE_BAZAAR")
BASE_MAP[key("One Unit Bahawalpur")] = (ONE_UNIT_BWP, "MOBILE_BAZAAR")
BASE_MAP[key("Sue-e-Asal")] = (SUE_E_ASAL, "MOBILE_BAZAAR")

# Under construction — employees keep their current DB location.
UNDER_CONSTRUCTION = {key("Minchinabad"), key("Pasrur"), key("Samundri")}

SUFFIX_RE = re.compile(r"\s*\((sahulat on the go|on the go)\)\s*$", re.I)
SOTG_RE = re.compile(r"\s+SOTG\s*$", re.I)


def resolve_location(cc_raw):
    """-> (location_name, location_type, role_tag, keep_current) or (None,)*4 if unmapped."""
    cc = re.sub(r"\s+", " ", s(cc_raw)).strip()
    if not cc:
        return None, None, None, False
    if cc.lower() == "head office":
        return HEAD_OFFICE_NAME, "HEAD_OFFICE", None, False
    if cc in SPECIAL_UNITS:
        nm = SPECIAL_UNITS[cc]
        return nm, "SPECIAL_UNIT", nm, False
    base = SOTG_RE.sub("", SUFFIX_RE.sub("", cc)).strip()
    k = key(base)
    if k in UNDER_CONSTRUCTION:
        return None, None, None, True
    if k in BASE_MAP:
        nm, typ = BASE_MAP[k]
        return nm, typ, None, False
    return None, None, None, False


def norm_type(ptype_raw):
    """Payroll/DailyWages cell -> employment_type (+ issue note or '')."""
    p = s(ptype_raw)
    pl = p.lower()
    if "daily" in pl or "wage" in pl or "stopgap" in pl:
        return "Daily Wager", ""
    if "payroll" in pl:
        return "Regular", ""
    # blank or junk like '00:00:00' -> Regular per user decision
    return "Regular", (f"payroll type junk value {p!r}, assumed Regular" if p else "payroll type blank, assumed Regular")


def load_rows(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    data = list(ws.iter_rows(values_only=True))
    wb.close()
    header = [s(h) for h in data[0]]
    H = {h: i for i, h in enumerate(header) if h}
    rows = [r for r in data[1:] if any(v is not None and s(v) != "" for v in r)]
    return H, rows


def cnic_expiry(exp_val):
    """-> (cnic_expire_date, cnic_lifetime, missing_note)."""
    if isinstance(exp_val, (datetime, date)):
        return iso(exp_val), False, ""
    ev = s(exp_val).lower()
    if ev in ("lifetime", "life time"):
        return None, True, ""
    if ev == "expired":
        return None, False, "CNIC marked Expired in source"
    if ev:
        return None, False, f"CNIC expiry source value: {s(exp_val)}"
    return None, False, ""


def main():
    H, rows = load_rows(XLSX_NEW)
    HO, old_rows = load_rows(XLSX_OLD)

    def col(r, name, HH=H):
        return r[HH[name]] if name in HH else None

    # ---------- baseline from the previously applied 10-7-26 workbook ----------
    baseline = {}
    old_cnics = set()
    for r in old_rows:
        cnic = digits(col(r, "CNIC No.", HO))
        if len(cnic) != 13 or cnic in old_cnics:
            continue
        old_cnics.add(cnic)
        loc_name, _t, _rt, _kc = resolve_location(col(r, "Cost center", HO))
        exp, lifetime, _n = cnic_expiry(col(r, "CNIC Expiry Date", HO))
        father_raw = s(col(r, "Father Name", HO))
        father = re.sub(r"^\s*w/?\s*o\.?\s*", "", father_raw, flags=re.I).strip() if re.match(r"\s*w/?\s*o\b", father_raw, re.I) else father_raw
        des_first = s(col(r, "Designation", HO)).split("\n")[0].strip()
        mobile, _wa = split_phones(col(r, "Contact No.", HO))
        baseline[cnic] = OrderedDict([
            ("location_name", loc_name),
            ("cnic_issue_date", iso(col(r, "CNIC Issue Date", HO))),
            ("cnic_expire_date", exp),
            ("cnic_lifetime", lifetime),
            ("date_of_birth", iso(col(r, "Date of Birth", HO))),
            ("mobile_number", mobile),
            ("father_husband_name", father if father else "Unknown"),
            ("designation", canon_designation(des_first) if des_first else None),
        ])

    # ---------- transform the v3 workbook ----------
    employees, reporting_lines, issues = [], [], []
    seen_cnic = set()

    for idx, r in enumerate(rows, start=2):
        sr = col(r, "Sr No")
        name = s(col(r, "Employee Name"))
        cnic = digits(col(r, "CNIC No."))

        if len(cnic) != 13:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "INVALID_CNIC", "detail": s(col(r, "CNIC No.")),
                           "action": "QUARANTINED (not in payload)"})
            continue
        if cnic in seen_cnic:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "DUPLICATE_CNIC", "detail": cnic,
                           "action": "QUARANTINED (first occurrence kept)"})
            continue
        seen_cnic.add(cnic)

        # --- reporting officer ---
        ro_cnic = digits(col(r, "Reporting Incharge CNIC"))
        ro_line = s(col(r, "Reporting Line"))
        if s(col(r, "Reporting Incharge CNIC")) and len(ro_cnic) != 13:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "INVALID_RO_CNIC", "detail": s(col(r, "Reporting Incharge CNIC")),
                           "action": "reporting line skipped for this row"})
            ro_cnic = ""
        if ro_cnic:
            reporting_lines.append(OrderedDict([
                ("cnic", cnic), ("name", name),
                ("ro_cnic", ro_cnic), ("ro_line", ro_line),
                ("self", ro_cnic == cnic),
            ]))
            if ro_cnic == cnic:
                issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                               "issue": "SELF_REPORTING", "detail": f"RO CNIC == own CNIC ({cnic})",
                               "action": "skipped by apply script — fix in source / set via UI"})
        else:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "NO_REPORTING_INFO", "detail": "",
                           "action": "no reporting line for this row"})

        # --- normalized employee record ---
        cnic_issue = iso(col(r, "CNIC Issue Date"))
        cnic_expire, cnic_lifetime, missing_note = cnic_expiry(col(r, "CNIC Expiry Date"))

        rel = s(col(r, "Muslim/Non Muslim"))
        religion = "Islam" if rel.lower() == "muslim" else ("Non-Muslim" if rel else "Unknown")
        gender = s(col(r, "Male/Female")) or "Unknown"
        has_disability = bool(s(col(r, "Disable/Sepcial Person")))

        father_raw = s(col(r, "Father Name"))
        relationship_type = "father"
        if re.match(r"\s*w/?\s*o\b", father_raw, re.I):
            relationship_type = "spouse"
            father_raw = re.sub(r"^\s*w/?\s*o\.?\s*", "", father_raw, flags=re.I).strip()

        mother = s(col(r, "Mother Name"))
        mobile, whatsapp = split_phones(col(r, "Contact No."))
        email_raw = s(col(r, "Personal Email Address")).lower()
        present_addr, permanent_addr = split_address(col(r, "Address"))

        des_raw = s(col(r, "Designation"))
        des_first = des_raw.split("\n")[0].strip()
        additional_charge = des_raw.split("\n", 1)[1].strip() if "\n" in des_raw else ""
        designation = canon_designation(des_first) if des_first else None

        grade_val = col(r, "BS/Grade")
        scale_grade = scale_grade_name(grade_val) if isinstance(grade_val, int) else None

        dept_raw = s(col(r, "Department"))
        department = canon_department(dept_raw) if dept_raw else None
        if department and department not in KNOWN_15_DEPARTMENTS:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "UNKNOWN_DEPARTMENT", "detail": department,
                           "action": "department left empty (looks like location noise)"})
            department = None

        cc_raw = s(col(r, "Cost center"))
        loc_name, loc_type, role_tag, keep_current = resolve_location(cc_raw)
        if keep_current:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "LOCATION_UNDER_CONSTRUCTION", "detail": cc_raw,
                           "action": "keeps current DB location (bazaar not built yet)"})
        elif loc_name is None:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "UNMAPPED_COST_CENTER", "detail": cc_raw,
                           "action": "QUARANTINED (no location)"})
            continue

        employment_type, type_note = norm_type(col(r, "Payroll/DailyWages"))
        if type_note:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "PAYROLL_TYPE_ASSUMED", "detail": type_note,
                           "action": "employment_type = Regular"})

        education = []
        edu_raw = s(col(r, "Education"))
        if edu_raw:
            education.append({"raw_text": edu_raw, "education_level": map_education_level(edu_raw)})

        employees.append(OrderedDict([
            ("sr_no", sr),
            ("cnic", cnic),
            ("full_name", name),
            ("father_husband_name", father_raw if father_raw else "Unknown"),
            ("relationship_type", relationship_type),
            ("mother_name", mother if mother else "Unknown"),
            ("cnic_issue_date", cnic_issue),
            ("cnic_expire_date", cnic_expire),
            ("cnic_lifetime", cnic_lifetime),
            ("date_of_birth", iso(col(r, "Date of Birth"))),
            ("gender", gender),
            ("marital_status", "Unknown"),
            ("nationality", "Pakistani"),
            ("religion", religion),
            ("blood_group", "Unknown"),
            ("domicile_district", "Unknown"),
            ("mobile_number", mobile),
            ("whatsapp_number", whatsapp),
            ("email", email_raw if email_raw else None),
            ("present_address", present_addr),
            ("permanent_address", permanent_addr),
            ("same_address", False),
            ("has_disability", has_disability),
            ("missing_note", missing_note),
            ("status", "Active"),
            ("education", education),
            ("employment", OrderedDict([
                ("organization", "PSBA"),
                ("employment_type", employment_type),
                ("joining_date", iso(col(r, "Joining"))),
                ("designation", designation),
                ("additional_charge", additional_charge),
                ("scale_grade", scale_grade),
                ("department", department),
                ("location_name", loc_name),           # None when keep_current
                ("location_type", loc_type),
                ("location_keep_current", keep_current),
                ("role_tag", role_tag),
                ("is_current", True),
            ])),
        ]))

    # ---------- removals: in the applied 10-7-26 workbook but gone from v3 ----------
    removals = []
    for cnic in sorted(old_cnics - seen_cnic):
        old_r = next(r for r in old_rows if digits(col(r, "CNIC No.", HO)) == cnic)
        removals.append(OrderedDict([
            ("cnic", cnic),
            ("name", s(col(old_r, "Employee Name", HO))),
            ("last_cost_center", s(col(old_r, "Cost center", HO))),
        ]))

    payload = OrderedDict([
        ("_meta", OrderedDict([
            ("source_file", os.path.basename(XLSX_NEW)),
            ("baseline_file", os.path.basename(XLSX_OLD)),
            ("generated_for", "apply_v3_update.js"),
            ("total_excel_rows", len(rows)),
            ("employees_in_payload", len(employees)),
            ("reporting_lines", len(reporting_lines)),
            ("self_reporting_rows", sum(1 for x in reporting_lines if x["self"])),
            ("removals", len(removals)),
            ("issues", len(issues)),
        ])),
        ("location_renames", [
            {"from": sb("Nishtar Town"), "to": NISHTER_TOWN},
        ]),
        ("locations_to_ensure", [
            # expect_existing: added manually in prod; created only if genuinely missing
            {"name": ONE_UNIT_BWP, "type": "MOBILE_BAZAAR", "district": "Bahawalpur",
             "city": "Bahawalpur", "expect_existing": True},
            {"name": SUE_E_ASAL, "type": "MOBILE_BAZAAR", "district": "Lahore",
             "city": "Lahore", "expect_existing": False},
        ]),
        ("employees", employees),
        ("baseline", baseline),
        ("reporting_lines", reporting_lines),
        ("removals", removals),
    ])

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    with open(OUT_ISSUES, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["excel_row", "sr_no", "name", "issue", "detail", "action"])
        w.writeheader()
        for i in issues:
            w.writerow(i)

    print("=" * 60)
    print("V3 UPDATE ETL SUMMARY")
    print("=" * 60)
    for k, v in payload["_meta"].items():
        print(f"{k:24s}: {v}")
    ro_cnics = {x["ro_cnic"] for x in reporting_lines}
    emp_cnics = {e["cnic"] for e in employees}
    dangling = sorted(ro_cnics - emp_cnics)
    print(f"distinct reporting officers: {len(ro_cnics)}")
    print(f"RO CNICs not in the file   : {dangling if dangling else 'none — OK'}")
    print(f"new-vs-baseline employees  : {len(emp_cnics - old_cnics)}")
    print(f"keep-current (UC) rows     : {sum(1 for e in employees if e['employment']['location_keep_current'])}")
    by_issue = Counter(i["issue"] for i in issues)
    for k, n in by_issue.most_common():
        print(f"issue {k:28s}: {n}")
    print(f"\nOutputs:\n  {OUT_JSON}\n  {OUT_ISSUES}")


if __name__ == "__main__":
    main()
