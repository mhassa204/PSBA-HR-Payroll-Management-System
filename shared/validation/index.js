/**
 * SINGLE SOURCE OF TRUTH for form validation — shared by the React frontend and
 * the Express backend so a rule is defined ONCE and enforced on both sides.
 *
 * Written as native ESM (one file, no CJS interop). Vite imports it natively;
 * Node (>=22.12 / 24) loads it through `require()` of an ES module. Both get the
 * named exports below, with no bundler-specific interop tricks.
 *
 * - Frontend: import via the Vite alias `@shared/validation`
 *   (see frontend/src/utils/validationAdapter.js).
 * - Backend: require() in a middleware
 *   (see server/src/middleware/sharedValidate.js).
 */

// ---------------------------------------------------------------------------
// Primitive helpers
// ---------------------------------------------------------------------------
// Treat the literal strings "null"/"undefined" as empty too: the frontend's
// FormData flattener serializes null values to the string "null", which would
// otherwise fail format validators (e.g. dates) and cause spurious 422s.
export const isEmpty = (v) => {
  if (v === undefined || v === null) return true;
  if (typeof v !== "string") return false;
  const t = v.trim();
  return t === "" || t === "null" || t === "undefined";
};

const onlyDigits = (v) => String(v == null ? "" : v).replace(/\D/g, "");

// ---------------------------------------------------------------------------
// Reusable field validators. Each returns `true` when valid, or an error string.
// They PASS on empty input — "required" is enforced separately so a validator can
// be reused for both optional and required fields.
// ---------------------------------------------------------------------------
export const validators = {
  cnic: (v) => {
    if (isEmpty(v)) return true;
    const d = onlyDigits(v);
    return d.length === 13 || "CNIC must be 13 digits";
  },
  phone: (v) => {
    if (isEmpty(v)) return true;
    const d = onlyDigits(v);
    return (d.length >= 10 && d.length <= 11) || "Enter a valid phone number";
  },
  email: (v) => {
    if (isEmpty(v)) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) || "Enter a valid email address";
  },
  isoDate: (v) => {
    if (isEmpty(v)) return true;
    return /^\d{4}-\d{2}-\d{2}/.test(String(v)) || "Enter a valid date";
  },
  notFutureDate: (v) => {
    if (isEmpty(v)) return true;
    const d = new Date(v);
    return d <= new Date() || "Date cannot be in the future";
  },
  maxLen: (n) => (v) =>
    isEmpty(v) || String(v).length <= n || `Must be at most ${n} characters`,
};

// ---------------------------------------------------------------------------
// Organization-aware required-field rules (used by frontend + backend).
// ---------------------------------------------------------------------------
export const ORGANIZATION_REQUIRED = {
  MBWO: ["employee_id", "organization", "designation"],
  PMBMC: ["employee_id", "organization", "designation"],
  PSBA: ["employee_id", "organization", "designation"],
};

export const requiredForOrg = (organization, field) => {
  const list = ORGANIZATION_REQUIRED[organization] || ORGANIZATION_REQUIRED.PSBA;
  return list.includes(field);
};

// ---------------------------------------------------------------------------
// Form schemas. Each field: { label, required (bool|fn(data)), validate[] }
// ---------------------------------------------------------------------------
export const schemas = {
  employee: {
    full_name: { label: "Full Name", required: true, validate: [validators.maxLen(150)] },
    cnic: { label: "CNIC", required: true, validate: [validators.cnic] },
    // Mobile / WhatsApp: no format validation (per HR request — accept any value)
    mobile_number: { label: "Mobile Number", required: false, validate: [] },
    whatsapp_number: { label: "WhatsApp Number", required: false, validate: [] },
    email: { label: "Email", required: false, validate: [validators.email] },
    date_of_birth: { label: "Date of Birth", required: false, validate: [validators.isoDate, validators.notFutureDate] },
    cnic_issue_date: { label: "CNIC Issue Date", required: false, validate: [validators.isoDate] },
    cnic_expire_date: { label: "CNIC Expiry Date", required: false, validate: [validators.isoDate] },
  },
  employment: {
    organization: { label: "Organization", required: true },
    designation: {
      label: "Designation",
      required: (data) => requiredForOrg(data && data.organization, "designation"),
    },
    department: { label: "Department", required: false },
    role_tag: { label: "Role Tag", required: false },
    scale_grade: { label: "Scale/Grade", required: false },
    reporting_officer_id: { label: "Reporting Officer", required: false },
    location_id: { label: "Location", required: false },
    joining_date: { label: "Joining Date", required: false, validate: [validators.isoDate] },
    effective_from: { label: "Effective From", required: false, validate: [validators.isoDate] },
    effective_till: { label: "Effective Till", required: false, validate: [validators.isoDate] },
    appointment_letter_issue_date: { label: "Letter Issuance Date", required: false, validate: [validators.isoDate] },
  },
};

export const resolveRequired = (rule, data) =>
  typeof rule.required === "function" ? !!rule.required(data) : !!rule.required;

/**
 * Validate a data object against a named schema.
 * @returns {{ valid: boolean, errors: Record<string,string> }}
 */
export function validate(schemaName, data = {}) {
  const schema = schemas[schemaName];
  if (!schema) throw new Error(`Unknown validation schema: ${schemaName}`);
  const errors = {};
  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];
    if (resolveRequired(rule, data) && isEmpty(value)) {
      errors[field] = `${rule.label} is required`;
      continue;
    }
    for (const fn of rule.validate || []) {
      const res = fn(value, data);
      if (res !== true) {
        errors[field] = res;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export default {
  isEmpty,
  validators,
  schemas,
  ORGANIZATION_REQUIRED,
  requiredForOrg,
  resolveRequired,
  validate,
};
