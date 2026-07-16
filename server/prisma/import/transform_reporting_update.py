#!/usr/bin/env python3
"""
ETL for the July 2026 HR refresh — transforms
'Data for HR Software(12-6-26) Reporting Line(10-7-26) v1.xlsx' into
reporting_line_update.json, consumed by scripts/apply_reporting_line_update.js.

The new workbook differs from the original 12-6-26 file:
  - dropped columns : Salary, Bank Account Number, Name of Bank
  - added columns   : 'Reporting Incharge CNIC' (RO's CNIC), 'Reporting Line' (RO's role text)
  - 45 new employees, 2 rows removed, a handful of cost-center transfers

Output payload:
  - employees        : ALL valid rows, fully normalized (the apply script only
                       CREATES the ones missing from the DB — it never updates
                       existing employees, so live edits are preserved)
  - reporting_lines  : cnic -> reporting officer cnic for every row
  - new_locations    : locations referenced by the file that the original seed
                       does not have (currently: Haideri Chowk Rawalpindi SOTG)
  - issues           : quarantined/flagged rows for manual review

Reuses the normalization rules of transform_excel.py (same directory).
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
XLSX = os.path.join(ROOT, "Data for HR Software(12-6-26) Reporting Line(10-7-26) v1.xlsx")

OUT_JSON = os.path.join(HERE, "reporting_line_update.json")
OUT_ISSUES = os.path.join(HERE, "reporting_update_issues.csv")

# Cost-center spellings that only appear in the new workbook
EXTRA_CC_MATCH = {
    # new spelling of an existing mobile bazaar
    "Khatam-e-Nabuwat SOTG": ("Sahulat Bazaar Khatam e Nabuwat (On the GO)", "MOBILE_BAZAAR", None, None),
    # genuinely new mobile bazaar (not in the original 75-location seed)
    "Haideri Chowk Rawalpindi SOTG": ("Sahulat Bazaar Haideri Chowk Rawalpindi (On the GO)", "MOBILE_BAZAAR", "Rawalpindi", "Rawalpindi"),
}
# Departments in the file that are data-entry noise (location names typed into
# the Department column) — never create these as departments.
KNOWN_15_DEPARTMENTS = {
    "Accounts Department", "Admin Department", "Audit Department", "Civil Department",
    "Competent Authority", "Devops Department", "Electrical Department",
    "Establishment Department", "Home Delivery Department", "IT Department",
    "Legal Department", "Media Department", "Monitoring Department",
    "Operations Department", "Projects & Management Unit Department",
}


def resolve_location(cc_raw, locations, issues_ref):
    cc = re.sub(r"\s+", " ", cc_raw).strip()
    cc_norm = cc.replace("(Sahulat on the Go)", "(Sahulat on the GO)")
    if cc_norm.upper() == "DG KHAN":
        cc_norm = "DG Khan"
    if cc_norm.lower() == "head office":
        return HEAD_OFFICE_NAME, "HEAD_OFFICE", None
    if cc_norm in SPECIAL_UNITS:
        nm = SPECIAL_UNITS[cc_norm]
        return nm, "SPECIAL_UNIT", nm
    if cc_norm in EXTRA_CC_MATCH:
        nm, typ, district, city = EXTRA_CC_MATCH[cc_norm]
        locations[nm] = {"type": typ, "district": district, "city": city}
        return nm, typ, None
    m = re.match(r"(.+?)\s*\(Sahulat on the GO\)$", cc_norm)
    if m:
        nm = f"{sb(m.group(1).strip())} (On the GO)"
        return nm, "MOBILE_BAZAAR", None
    if cc_norm in CLEAN_MATCH:
        return CLEAN_MATCH[cc_norm], "BAZAAR", None
    if cc_norm in FUZZY_MATCH:
        return FUZZY_MATCH[cc_norm], "BAZAAR", None
    if cc_norm in NEW_BAZAARS:
        return NEW_BAZAARS[cc_norm][0], "BAZAAR", None
    return None, None, None


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb.active
    data = list(ws.iter_rows(values_only=True))
    header = [s(h) for h in data[0]]
    H = {h: i for i, h in enumerate(header) if h}
    rows = [r for r in data[1:] if any(v is not None and s(v) != "" for v in r)]
    wb.close()

    def col(r, name):
        return r[H[name]] if name in H else None

    employees, reporting_lines, issues = [], [], []
    new_locations = {}
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

        # --- full normalized employee record (same rules as transform_excel.py) ---
        cnic_issue = iso(col(r, "CNIC Issue Date"))
        exp_val = col(r, "CNIC Expiry Date")
        cnic_lifetime, cnic_expire, missing_note = False, None, ""
        if isinstance(exp_val, (datetime, date)):
            cnic_expire = iso(exp_val)
        else:
            ev = s(exp_val).lower()
            if ev in ("lifetime", "life time"):
                cnic_lifetime = True
            elif ev == "expired":
                missing_note = "CNIC marked Expired in source"
            elif ev:
                missing_note = f"CNIC expiry source value: {s(exp_val)}"

        rel = s(col(r, "Muslim/Non Muslim"))
        religion = "Islam" if rel.lower() == "muslim" else ("Non-Muslim" if rel else "Unknown")
        gender = s(col(r, "Male/Female")) or "Unknown"
        has_disability = bool(s(col(r, "Disable/Sepcial Person")))

        father_raw = s(col(r, "Father Name"))
        relationship_type = "father"
        if re.match(r"\s*w/?\s*o\b", father_raw, re.I):
            relationship_type = "spouse"
            father_raw = re.sub(r"^\s*w/?\s*o\.?\s*", "", father_raw, flags=re.I).strip()

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
        loc_name, loc_type, role_tag = resolve_location(cc_raw, new_locations, issues)
        if loc_name is None:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "UNMAPPED_COST_CENTER", "detail": cc_raw,
                           "action": "QUARANTINED (no location)"})
            continue

        ptype = s(col(r, "Payroll/DailyWages"))
        _pl = ptype.lower()
        employment_type = ("Daily Wager"
                           if ("daily" in _pl or "wage" in _pl or "stopgap" in _pl)
                           else "Regular")

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
            ("mother_name", "Unknown"),
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
                ("location_name", loc_name),
                ("location_type", loc_type),
                ("role_tag", role_tag),
                ("is_current", True),
            ])),
        ]))

    payload = OrderedDict([
        ("_meta", OrderedDict([
            ("source_file", os.path.basename(XLSX)),
            ("generated_for", "apply_reporting_line_update.js"),
            ("total_excel_rows", len(rows)),
            ("employees_in_payload", len(employees)),
            ("reporting_lines", len(reporting_lines)),
            ("self_reporting_rows", sum(1 for x in reporting_lines if x["self"])),
            ("issues", len(issues)),
        ])),
        ("new_locations", [OrderedDict([("name", k), ("type", v["type"]),
                                        ("district", v["district"]), ("city", v["city"])])
                           for k, v in sorted(new_locations.items())]),
        ("employees", employees),
        ("reporting_lines", reporting_lines),
    ])

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    with open(OUT_ISSUES, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["excel_row", "sr_no", "name", "issue", "detail", "action"])
        w.writeheader()
        for i in issues:
            w.writerow(i)

    print("=" * 60)
    print("REPORTING-LINE UPDATE ETL SUMMARY")
    print("=" * 60)
    for k, v in payload["_meta"].items():
        print(f"{k:24s}: {v}")
    print(f"new locations           : {[l['name'] for l in payload['new_locations']]}")
    ro_cnics = {x["ro_cnic"] for x in reporting_lines}
    emp_cnics = {e["cnic"] for e in employees}
    dangling = sorted(ro_cnics - emp_cnics)
    print(f"distinct reporting officers: {len(ro_cnics)}")
    print(f"RO CNICs not in the file   : {dangling if dangling else 'none — OK'}")
    by_issue = Counter(i["issue"] for i in issues)
    for k, n in by_issue.most_common():
        print(f"issue {k:22s}: {n}")
    print(f"\nOutputs:\n  {OUT_JSON}\n  {OUT_ISSUES}")


if __name__ == "__main__":
    main()
