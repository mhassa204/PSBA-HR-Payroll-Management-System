/**
 * Maps lean employee records to the official Excel export column set
 * (HR workbook layout). Missing fields stay empty — never invent data.
 */

const EXPORT_HEADERS = [
  "Sr No",
  "Organization Name",
  "CNIC No.",
  "Staff Details",
  "Biometric ID",
  "CNIC Issue Date",
  "CNIC Expiry Date",
  "Date of Birth",
  "Age",
  "Muslim/Non Muslim",
  "Male/Female",
  "Disable/Sepcial Person",
  "Employee Name",
  "Father Name",
  "Mother Name",
  "Designation",
  "BS/Grade",
  "Department",
  "Joining",
  "Salary",
  "Bank Account Number",
  "Name of Bank",
  "Cost center",
  "Education",
  "Address",
  "Contact No.",
  "Personal Email Address",
  "Payroll/DailyWages",
  "Reporting Incharge CNIC",
  "Reporting Line",
];

function formatDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return "";
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : "";
}

function numOrEmpty(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function formatReligion(religion) {
  if (!religion) return "";
  const r = String(religion).trim().toLowerCase();
  if (r === "islam" || r === "muslim") return "Muslim";
  if (r === "non-muslim" || r === "non muslim" || r === "nonmuslim") {
    return "Non Muslim";
  }
  return religion;
}

function formatCnicExpiry(employee) {
  if (employee?.cnic_lifetime) return "Lifetime";
  return formatDate(employee?.cnic_expire_date);
}

function formatDisability(employee) {
  if (!employee?.has_disability) return "";
  return (
    employee.disability_type ||
    employee.disability_description ||
    "Yes"
  );
}

function formatPayrollType(employmentType) {
  if (!employmentType) return "";
  const t = String(employmentType).toLowerCase();
  if (t.includes("daily") || t.includes("wage") || t.includes("stopgap")) {
    return "Daily Wages/Stopgap";
  }
  if (t === "regular" || t.includes("payroll")) return "Payroll";
  return employmentType;
}

function formatSalary(employment, salary) {
  if (!salary) return "";
  if (employment?.organization === "MBWO") {
    return numOrEmpty(salary.gross_salary);
  }
  const basic = numOrEmpty(salary.basic_salary);
  if (basic !== "") return basic;
  return numOrEmpty(salary.gross_salary);
}

function formatEducation(qualifications) {
  if (!Array.isArray(qualifications) || qualifications.length === 0) return "";
  return qualifications
    .map((q) => {
      const level = q.level?.name || q.education_level || "";
      const institution = q.institution_name || "";
      if (level && institution) return `${level} - ${institution}`;
      return level || institution || "";
    })
    .filter(Boolean)
    .join("; ");
}

function formatAddress(employee) {
  const present = (employee.present_address || "").trim();
  const permanent = (employee.permanent_address || "").trim();
  if (present && permanent && present !== permanent) {
    return `Present: ${present} / Permanent: ${permanent}`;
  }
  return present || permanent || "";
}

function formatContact(employee) {
  const mobile = (employee.mobile_number || "").trim();
  const whatsapp = (employee.whatsapp_number || "").trim();
  if (mobile && whatsapp && mobile !== whatsapp) {
    return `${mobile}, ${whatsapp}`;
  }
  return mobile || whatsapp || "";
}

/**
 * @param {object} employee
 * @param {number} srNo
 * @param {Map<string, { cnic?: string, full_name?: string, designation?: string }>} reportingLookup
 */
function mapEmployeeToExportRow(employee, srNo, reportingLookup = new Map()) {
  const employment = employee.employmentRecords?.[0] || null;
  const salary = employment?.salary || null;

  const roId = employment?.reporting_officer_id
    ? String(employment.reporting_officer_id).trim()
    : "";
  const ro = roId ? reportingLookup.get(roId) : null;

  return {
    "Sr No": srNo,
    "Organization Name": employment?.organization || "",
    "CNIC No.": employee.cnic || "",
    // Never stored in DB (source workbook upload flag only)
    "Staff Details": "",
    // Legacy ZK biometric field removed from schema; leave blank
    "Biometric ID": "",
    "CNIC Issue Date": formatDate(employee.cnic_issue_date),
    "CNIC Expiry Date": formatCnicExpiry(employee),
    "Date of Birth": formatDate(employee.date_of_birth),
    Age: calcAge(employee.date_of_birth),
    "Muslim/Non Muslim": formatReligion(employee.religion),
    "Male/Female": employee.gender || "",
    "Disable/Sepcial Person": formatDisability(employee),
    "Employee Name": employee.full_name || "",
    "Father Name": employee.father_husband_name || "",
    "Mother Name": employee.mother_name || "",
    Designation:
      employment?.designation?.title || employment?.designation_text || "",
    "BS/Grade": employment?.scale_grade?.name || "",
    Department:
      employment?.department?.name || employment?.department_text || "",
    Joining: formatDate(employment?.joining_date),
    Salary: formatSalary(employment, salary),
    "Bank Account Number": salary?.bank_account_primary || "",
    "Name of Bank": salary?.bank_name_primary || "",
    "Cost center": employment?.location?.name || "",
    Education: formatEducation(employee.educationQualifications),
    Address: formatAddress(employee),
    "Contact No.": formatContact(employee),
    "Personal Email Address": employee.email || "",
    "Payroll/DailyWages": formatPayrollType(employment?.employment_type),
    "Reporting Incharge CNIC": ro?.cnic || "",
    "Reporting Line": ro?.designation || ro?.full_name || "",
  };
}

function buildExportRows(employees, reportingLookup = new Map()) {
  return (employees || []).map((employee, index) =>
    mapEmployeeToExportRow(employee, index + 1, reportingLookup)
  );
}

module.exports = {
  EXPORT_HEADERS,
  formatDate,
  calcAge,
  mapEmployeeToExportRow,
  buildExportRows,
};
