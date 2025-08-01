// Employee data structure for reference
export const employeeSchema = {
  id: "number",
  full_name: "string",
  // Unified father/husband name field
  father_husband_name: "string | null",
  relationship_type: "string | null", // "father" or "husband"
  mother_name: "string | null",
  cnic: "string",
  cnic_issue_date: "string | null",
  cnic_expiry_date: "string | null",
  date_of_birth: "string | null",
  gender: "string | null",
  marital_status: "string | null", // Optional now
  nationality: "string | null",
  religion: "string | null", // Updated options: Muslim, Non-Muslim, Maseehi
  blood_group: "string | null",
  domicile_district: "string | null", // Now dropdown
  mobile_number: "string | null",
  whatsapp_number: "string | null",
  email: "string | null",
  present_address: "string | null",
  permanent_address: "string | null",
  same_address: "boolean", // New field for address optimization
  district: "string | null", // Now dropdown
  city: "string | null", // Now dropdown linked to district
  latest_qualification: "string | null", // Now dropdown
  past_experience: "string | null",
  department_id: "string",
  designation_id: "string",
  joining_date_mwo: "string | null",
  joining_date_pmbmc: "string | null",
  joining_date_psba: "string | null",
  termination_or_suspend_date: "string | null",
  grade_scale: "string | null",
  termination_reason: "string | null",
  special_duty_note: "string | null",
  document_missing_note: "string | null",
  // Enhanced disability information
  has_disability: "boolean",
  disability_type: "string | null", // Dropdown: Hearing Impairment, Visual Impairment, etc.
  disability_description: "string | null",
  medical_fitness_status: "boolean",
  medical_fitness_file: "string | null",
  filer_status: "string | null",
  filer_active_status: "string | null",
  status: "string",
  // Enhanced file uploads
  profile_picture_file: "string | null",
  cnic_front_file: "string | null",
  cnic_back_file: "string | null",
  domicile_certificate_file: "string | null",
  educational_certificates_files: "array | null",
  other_documents_files: "array | null",
  createdAt: "string",
  updatedAt: "string",
  password: "string | null",
  department: {
    id: "string",
    name: "string",
    createdAt: "string",
    updatedAt: "string",
  },
  designation: {
    id: "string",
    name: "string",
    createdAt: "string",
    updatedAt: "string",
  },
  documents: "array",
}

// API Response structure
export const apiResponseSchema = {
  success: "boolean",
  employees: "Employee[]",
}
