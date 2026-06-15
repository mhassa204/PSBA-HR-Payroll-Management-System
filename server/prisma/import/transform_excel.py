#!/usr/bin/env python3
"""
Phase 0 ETL — Transform 'Data for HR Software(12-6-26).xlsx' into a clean,
normalized JSON the seed can consume, plus an import_issues.csv quarantine file.

NO database / schema changes. Pure data transformation per the locked decision log
in IMPLEMENTATION_PLAN.md.

Outputs (written next to this script):
  - employees.normalized.json   : the full import payload (employees + derived master data)
  - import_issues.csv           : quarantined / flagged rows for manual review
  - etl_summary.txt             : human-readable verification summary
"""
import os, re, json, csv
from collections import Counter, defaultdict, OrderedDict
from datetime import datetime, date

import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
XLSX = os.path.join(ROOT, "Data for HR Software(12-6-26).xlsx")

OUT_JSON = os.path.join(HERE, "employees.normalized.json")
OUT_ISSUES = os.path.join(HERE, "import_issues.csv")
OUT_SUMMARY = os.path.join(HERE, "etl_summary.txt")

# ----------------------------------------------------------------------------
# Reference data / maps (from the decision log)
# ----------------------------------------------------------------------------

BANK_DEFAULT = "Allied Bank Limited"

# Cost center -> (location_name, location_type, district, city)
# location_type: BAZAAR | MOBILE_BAZAAR | HEAD_OFFICE | SPECIAL_UNIT
def sb(name): return f"Sahulat Bazaar {name}"

# 43 clean matches + 5 fuzzy + Johar Town -> Mian Plaza
CLEAN_MATCH = {
    "Bahawalpur": sb("Bahawalpur"), "Bhakkar": sb("Bhakkar"), "Bhalwal": sb("Bhalwal"),
    "Bhera": sb("Bhera"), "Chakwal": sb("Chakwal"), "China Scheme": sb("China Scheme"),
    "Chiniot": sb("Chiniot"), "Chung": sb("Chung"), "Chunian": sb("Chunian"),
    "DG Khan": sb("DG Khan"), "Farooqabad": sb("Farooqabad"), "Gujranwala": sb("Gujranwala"),
    "Gujrat": sb("Gujrat"), "Hafizabad": sb("Hafizabad"), "Harbanspura": sb("Harbanspura"),
    "Jampur": sb("Jampur"), "Jhang": sb("Jhang"), "Kasur": sb("Kasur"),
    "Khanewal": sb("Khanewal"), "Khushab": sb("Khushab"), "Layyah": sb("Layyah"),
    "Lodhran": sb("Lodhran"), "Mandi Bahauddin": sb("Mandi Bahauddin"),
    "Mianwali": sb("Mianwali"), "Millat Road": sb("Millat Road"),
    "Muzaffargarh": sb("Muzaffargarh"), "Okara": sb("Okara"), "Pakpattan": sb("Pakpattan"),
    "Pattoki": sb("Pattoki"), "Raiwind": sb("Raiwind"), "Rawalpindi": sb("Rawalpindi"),
    "Sabzazaar": sb("Sabzazaar"), "Sahiwal": sb("Sahiwal"), "Sargodha": sb("Sargodha"),
    "Sharaqpur Sharif": sb("Sharaqpur Sharif"), "Sialkot": sb("Sialkot"),
    "Thokar": sb("Thokar"), "Toba Tek Singh": sb("Toba Tek Singh"), "Township": sb("Township"),
    "Vehari": sb("Vehari"), "Wahdat Colony": sb("Wahdat Colony"), "Wazirabad": sb("Wazirabad"),
}
FUZZY_MATCH = {
    "Sher Shah Colony": sb("Shershah"),
    "Taunsa": sb("Taunsa Sharif"),
    "Jarranwala": sb("Jaranwala"),
    "Noshera Virkan": sb("Nowshera Virkan"),
    "Jhang Road Faisalabad": sb("Jhang Road"),
    "Johar Town": sb("Mian Plaza"),
}
# 5 NEW permanent bazaars (with districts)
NEW_BAZAARS = {
    "Arif Wala": (sb("Arif Wala"), "Pakpattan"),
    "Burewala": (sb("Burewala"), "Vehari"),
    "Jalalpur Pirwala": (sb("Jalalpur Pirwala"), "Multan"),
    "Mandi Faizabad": (sb("Mandi Faizabad"), "Sheikhupura"),
    "Nishtar Town": (sb("Nishtar Town"), "Lahore"),
}
# Special units -> Location (SPECIAL_UNIT) AND RoleTag
SPECIAL_UNITS = {
    "Anti Encroachment Squad": "Anti Encroachment Squad",
    "Anti Theft Cell": "Anti Theft Cell",
}
HEAD_OFFICE_NAME = "Head Quarter"  # existing HEAD_OFFICE location in seed

# Education level mapping (12-level master, ordered)
EDU_LEVELS = [
    "No Formal Education", "Literate", "Matric", "Intermediate (FA/FSc)", "Diploma (DAE)",
    "Associate Degree", "Bachelor", "Master", "MPhil", "PhD",
    "Professional Certification", "Religious (Hafiz)",
]

def map_education_level(s):
    t = s.lower()
    if re.search(r'nil\s*ed|no education|illiterate|uneducat', t): return "No Formal Education"
    if re.search(r'ph\.?\s*d|doctor', t): return "PhD"
    if re.search(r'm\.?\s*phil|mphil', t): return "MPhil"
    if re.search(r'acca|fcca|\baca\b|\bcma\b|fpfa|icma|\bca\b(?!\w)', t): return "Professional Certification"
    if re.search(r'\bms\b|m\.?\s*s\b|m\.?\s*sc|m\.?\s*a\b|m\.?\s*com|\bmba\b|master|\bma\b|\bllm\b|m\.?\s*ed|m\.?\s*phil', t): return "Master"
    if re.search(r'associat\w* degree|\bads\b', t): return "Associate Degree"
    if re.search(r'b\.?\s*s|b\.?\s*sc|b\.?\s*a\b|b\.?\s*com|\bbba\b|bachelor|\bllb\b|b\.?\s*ed|b\.?\s*tech|\bbcs\b|graduation|graduate', t): return "Bachelor"
    if re.search(r'\bdae\b|diploma|dipl|d\.?\s*com|d\.?h\.?m\.?s', t): return "Diploma (DAE)"
    if re.search(r'inter|f\.?\s*sc|f\.?\s*a\b|\bfsc\b|hssc|\bics\b|i\.?\s*com', t): return "Intermediate (FA/FSc)"
    if re.search(r'hafiz|qari|tajweed|dars|aalim', t): return "Religious (Hafiz)"
    if re.search(r'matric|\bssc\b|middle|middel|primary|under matric|10th|8th|9th', t): return "Matric"
    if re.search(r'literate|read|write', t): return "Literate"
    return None  # unmapped -> keep raw text, level null

# Designation canonicalization
def canon_designation(d):
    d = d.strip()
    base = d
    # Security & Parking family -> single canonical, drop the note
    if re.search(r'security\s*&\s*parking', d, re.I):
        return "Security & Parking Attendant"
    low = d.lower()
    if 'sabitation' in low:
        return "Sanitation Attendant"
    # Sub-Engineer family normalization
    m = re.search(r'sub[\s-]*engineer.*?(civil|electrical|maintenance)', low)
    if m:
        return f"Sub-Engineer ({m.group(1).capitalize()})"
    return base

# Scale grade naming
def scale_grade_name(g):
    return f"BS-{int(g)}"

# Excel HO departments -> canonical 15 (clean spacing/case)
def canon_department(d):
    return d.strip()

# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def s(v):
    return "" if v is None else str(v).strip()

def iso(v):
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    return None

def digits(v):
    return re.sub(r"\D", "", s(v))

def split_phones(raw):
    """Return (mobile, whatsapp) normalized to digits; '' when absent."""
    txt = s(raw)
    if not txt:
        return "", ""
    parts = re.split(r"[\n/&,]| and ", txt)
    nums = []
    for p in parts:
        dd = re.sub(r"\D", "", p)
        if len(dd) >= 10:  # plausible PK mobile (often 11 digits 03xxxxxxxxx)
            nums.append(dd)
    if not nums:
        return "", ""
    mobile = nums[0]
    whatsapp = nums[1] if len(nums) > 1 else ""
    return mobile, whatsapp

def split_address(raw):
    """Return (present, permanent). Per decision: present only; permanent '' unless
    the cell explicitly contains a Present/Permanent split."""
    txt = s(raw)
    if not txt:
        return "", ""
    if re.search(r'present', txt, re.I) and re.search(r'permanent', txt, re.I):
        m = re.split(r'permanent\s*:?', txt, flags=re.I, maxsplit=1)
        present = re.sub(r'present\s*:?', '', m[0], flags=re.I).strip(" \n,")
        permanent = m[1].strip(" \n,") if len(m) > 1 else ""
        return present, permanent
    return txt, ""

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb.active
    data = list(ws.iter_rows(values_only=True))
    H = {h: i for i, h in enumerate(data[0])}
    rows = data[1:]

    def col(r, name):
        return r[H[name]]

    employees = []
    issues = []
    # derived master-data collectors
    locations = {}            # name -> {type, district, city}
    departments = set()
    designations = Counter()
    scale_grades = set()
    role_tags = set()
    edu_used = set()
    unmapped_costcenters = Counter()
    unmapped_edu = Counter()

    # biometric uniqueness guard (deviceUserId is @unique)
    seen_bio = set()

    def resolve_location(cc_raw):
        cc = re.sub(r"\s+", " ", cc_raw).strip()
        # normalize casing variants
        cc_norm = cc.replace("(Sahulat on the Go)", "(Sahulat on the GO)")
        if cc_norm.upper() == "DG KHAN":
            cc_norm = "DG Khan"
        # Head office
        if cc_norm.lower() == "head office":
            locations[HEAD_OFFICE_NAME] = {"type": "HEAD_OFFICE", "district": "Lahore", "city": "Lahore"}
            return HEAD_OFFICE_NAME, "HEAD_OFFICE", None
        # Special units
        if cc_norm in SPECIAL_UNITS:
            nm = SPECIAL_UNITS[cc_norm]
            locations[nm] = {"type": "SPECIAL_UNIT", "district": None, "city": None}
            role_tags.add(nm)
            return nm, "SPECIAL_UNIT", nm
        # Mobile bazaar "(Sahulat on the GO)"
        m = re.match(r"(.+?)\s*\(Sahulat on the GO\)$", cc_norm)
        if m:
            base = m.group(1).strip()
            nm = f"{sb(base)} (On the GO)"
            locations[nm] = {"type": "MOBILE_BAZAAR", "district": None, "city": None}
            return nm, "MOBILE_BAZAAR", None
        # Clean / fuzzy / new permanent bazaars
        if cc_norm in CLEAN_MATCH:
            nm = CLEAN_MATCH[cc_norm]
            locations.setdefault(nm, {"type": "BAZAAR", "district": None, "city": None})
            return nm, "BAZAAR", None
        if cc_norm in FUZZY_MATCH:
            nm = FUZZY_MATCH[cc_norm]
            locations.setdefault(nm, {"type": "BAZAAR", "district": None, "city": None})
            return nm, "BAZAAR", None
        if cc_norm in NEW_BAZAARS:
            nm, dist = NEW_BAZAARS[cc_norm]
            locations[nm] = {"type": "BAZAAR", "district": dist, "city": cc_norm}
            return nm, "BAZAAR", None
        # unmapped
        unmapped_costcenters[cc_norm] += 1
        return None, None, None

    for idx, r in enumerate(rows, start=2):  # excel row number (header=1)
        sr = col(r, "Sr No")
        name = s(col(r, "Employee Name"))
        cnic = digits(col(r, "CNIC No."))

        # --- quarantine rule: CNIC must be 13 digits (single source of truth) ---
        if len(cnic) != 13:
            issues.append({
                "excel_row": idx, "sr_no": sr, "name": name,
                "issue": "INVALID_CNIC", "detail": f"CNIC='{s(col(r,'CNIC No.'))}' len={len(cnic)}",
                "action": "QUARANTINED (not seeded)",
            })
            continue

        # --- biometric / deviceUserId ---
        bio_raw = s(col(r, "Biometric ID"))
        device_user_id = None
        if bio_raw and bio_raw.isdigit():
            if bio_raw in seen_bio:
                issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                               "issue": "DUPLICATE_BIOMETRIC", "detail": bio_raw,
                               "action": "biometric set null (kept employee)"})
            else:
                seen_bio.add(bio_raw)
                device_user_id = bio_raw
        elif bio_raw:  # e.g. 'AE'
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "INVALID_BIOMETRIC", "detail": bio_raw,
                           "action": "biometric set null (kept employee)"})

        # --- CNIC dates / lifetime ---
        cnic_issue = iso(col(r, "CNIC Issue Date"))
        exp_val = col(r, "CNIC Expiry Date")
        cnic_lifetime = False
        cnic_expire = None
        missing_note = ""
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

        # --- religion / gender / disability ---
        rel = s(col(r, "Muslim/Non Muslim"))
        religion = "Islam" if rel.lower() == "muslim" else ("Non-Muslim" if rel else "Unknown")
        gender = s(col(r, "Male/Female")) or "Unknown"
        has_disability = bool(s(col(r, "Disable/Sepcial Person")))

        # --- father / spouse ---
        father_raw = s(col(r, "Father Name"))
        relationship_type = "father"
        if re.match(r"\s*w/?\s*o\b", father_raw, re.I):
            relationship_type = "spouse"
            father_raw = re.sub(r"^\s*w/?\s*o\.?\s*", "", father_raw, flags=re.I).strip()
        father_husband_name = father_raw if father_raw else "Unknown"

        # --- contact ---
        mobile, whatsapp = split_phones(col(r, "Contact No."))

        # --- email (unique -> null when absent) ---
        email_raw = s(col(r, "Personal Email Address")).lower()
        email = email_raw if email_raw else None

        # --- address ---
        present_addr, permanent_addr = split_address(col(r, "Address"))

        # --- designation ---
        des_raw = s(col(r, "Designation"))
        des_first = des_raw.split("\n")[0].strip()
        additional_charge = ""
        if "\n" in des_raw:
            rest = des_raw.split("\n", 1)[1].strip()
            if rest:
                additional_charge = rest
        designation = canon_designation(des_first)
        designations[designation] += 1

        # --- scale grade ---
        grade_val = col(r, "BS/Grade")
        scale_grade = None
        if isinstance(grade_val, int):
            scale_grade = scale_grade_name(grade_val)
            scale_grades.add(scale_grade)

        # --- department (HO only) ---
        dept_raw = s(col(r, "Department"))
        department = canon_department(dept_raw) if dept_raw else None
        if department:
            departments.add(department)

        # --- location ---
        cc_raw = s(col(r, "Cost center"))
        loc_name, loc_type, role_tag = resolve_location(cc_raw)
        if loc_name is None:
            issues.append({"excel_row": idx, "sr_no": sr, "name": name,
                           "issue": "UNMAPPED_COST_CENTER", "detail": cc_raw,
                           "action": "QUARANTINED (no location)"})
            continue

        # --- employment type ---
        ptype = s(col(r, "Payroll/DailyWages"))
        employment_type = "Daily Wages" if "daily" in ptype.lower() else "Regular"

        # --- salary / bank ---
        bank_acct = s(col(r, "Bank Account Number")) or None
        bank_name = s(col(r, "Name of Bank")) or (BANK_DEFAULT if bank_acct else None)

        # --- education ---
        education = []
        edu_raw = s(col(r, "Education"))
        if edu_raw:
            lvl = map_education_level(edu_raw)
            if lvl:
                edu_used.add(lvl)
            else:
                unmapped_edu[edu_raw] += 1
            education.append({"raw_text": edu_raw, "education_level": lvl})

        emp = OrderedDict([
            ("sr_no", sr),
            ("cnic", cnic),
            ("full_name", name),
            ("father_husband_name", father_husband_name),
            ("relationship_type", relationship_type),
            ("mother_name", "Unknown"),
            ("device_user_id", device_user_id),         # biometric
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
            ("email", email),
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
                ("payroll_category", ptype),
                # Excel "Joining" -> permanent joining_date; effective_from/till left empty (req #2)
                ("joining_date", iso(col(r, "Joining"))),
                ("effective_from", None),
                ("designation", designation),
                ("additional_charge", additional_charge),
                ("scale_grade", scale_grade),
                ("department", department),
                ("location_name", loc_name),
                ("location_type", loc_type),
                ("role_tag", role_tag),
                ("is_current", True),
                ("salary", OrderedDict([
                    ("basic_salary", 0),
                    ("bank_account_primary", bank_acct),
                    ("bank_name_primary", bank_name),
                ])),
            ])),
        ])
        employees.append(emp)

    # ---- assemble derived master data ----
    payload = OrderedDict([
        ("_meta", OrderedDict([
            ("source_file", os.path.basename(XLSX)),
            ("total_excel_rows", len(rows)),
            ("seeded_employees", len(employees)),
            ("quarantined", len([i for i in issues if "QUARANTINED" in i["action"]])),
            ("flagged_non_blocking", len([i for i in issues if "QUARANTINED" not in i["action"]])),
        ])),
        ("master_data", OrderedDict([
            ("locations", [OrderedDict([("name", k), ("type", v["type"]),
                                        ("district", v["district"]), ("city", v["city"])])
                           for k, v in sorted(locations.items())]),
            ("departments", sorted(departments)),
            ("designations", [OrderedDict([("title", t), ("count", n)])
                              for t, n in designations.most_common()]),
            ("scale_grades", sorted(scale_grades, key=lambda x: int(x.split("-")[1]))),
            ("education_levels", EDU_LEVELS),
            ("role_tags_new", sorted(role_tags)),
        ])),
        ("employees", employees),
    ])

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    # ---- issues csv ----
    with open(OUT_ISSUES, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["excel_row", "sr_no", "name", "issue", "detail", "action"])
        w.writeheader()
        for i in issues:
            w.writerow(i)

    # ---- summary ----
    lines = []
    def p(x=""):
        lines.append(x)
    p("=" * 60)
    p("ETL SUMMARY")
    p("=" * 60)
    p(f"Total Excel rows         : {len(rows)}")
    p(f"Employees seeded         : {len(employees)}")
    p(f"Quarantined (not seeded) : {len([i for i in issues if 'QUARANTINED' in i['action']])}")
    p(f"Flagged (kept w/ fix)    : {len([i for i in issues if 'QUARANTINED' not in i['action']])}")
    p(f"Check: seeded+quarantined = {len(employees) + len([i for i in issues if 'QUARANTINED' in i['action']])} (should be {len(rows)})")
    p("")
    p(f"Distinct locations       : {len(locations)}")
    for k, v in sorted(locations.items()):
        p(f"    [{v['type']:13s}] {k}")
    p("")
    p(f"Distinct departments     : {len(departments)} -> {sorted(departments)}")
    p(f"Distinct scale grades    : {sorted(scale_grades, key=lambda x:int(x.split('-')[1]))}")
    p(f"Distinct designations    : {len(designations)}")
    p(f"Education levels used     : {sorted(edu_used)}")
    p("")
    # integrity checks
    cn = Counter(e["cnic"] for e in employees)
    bio = Counter(e["device_user_id"] for e in employees if e["device_user_id"])
    em = Counter(e["email"] for e in employees if e["email"])
    p(f"CNIC duplicates in output     : {[k for k,n in cn.items() if n>1]}")
    p(f"Biometric duplicates in output: {[k for k,n in bio.items() if n>1]}")
    p(f"Email duplicates in output    : {[k for k,n in em.items() if n>1]}")
    p(f"Employees missing scale_grade : {sum(1 for e in employees if not e['employment']['scale_grade'])}")
    p(f"Employees missing department  : {sum(1 for e in employees if not e['employment']['department'])}")
    p(f"Employees missing biometric   : {sum(1 for e in employees if not e['device_user_id'])}")
    p(f"Employees missing email       : {sum(1 for e in employees if not e['email'])}")
    p("")
    if unmapped_costcenters:
        p(f"!! UNMAPPED cost centers ({len(unmapped_costcenters)}): {dict(unmapped_costcenters)}")
    else:
        p("All cost centers mapped. OK")
    if unmapped_edu:
        p(f"Education strings with no level (kept raw): {len(unmapped_edu)} distinct, "
          f"{sum(unmapped_edu.values())} rows")
    p("")
    p(f"Outputs:\n  {OUT_JSON}\n  {OUT_ISSUES}\n  {OUT_SUMMARY}")

    with open(OUT_SUMMARY, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("\n".join(lines))


if __name__ == "__main__":
    main()
