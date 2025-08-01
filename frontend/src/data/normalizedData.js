// Normalized database structure for better data management
// This simulates proper database normalization with separate tables

// Import comprehensive employment records
import { dummyEmploymentRecords } from './employmentRecords.js';

// Organizations table
export const organizations = [
  {
    id: 1,
    code: "MBWO",
    name: "Model Bazaar Welfare Organization",
    established: "1947",
    type: "Private",
  },
  {
    id: 2,
    code: "PMBMC",
    name: "Punjab Model Bazaars Management Company",
    established: "2016",
    type: "Semi-Government",
  },
  {
    id: 3,
    code: "PSBA",
    name: "Punjab Sahulat Bazaars Authority",
    established: "2025",
    type: "Authority",
  },
];

// Departments table
export const departments = [
  {
    id: 1,
    name: "Engineering",
    code: "ENG",
    description: "Engineering and Technical Services",
  },
  { id: 2, name: "IT", code: "IT", description: "Information Technology" },
  { id: 3, name: "HR", code: "HR", description: "Human Resources" },
  {
    id: 4,
    name: "Administration",
    code: "ADMIN",
    description: "Administrative Services",
  },
  { id: 5, name: "Finance", code: "FIN", description: "Finance and Accounts" },
  { id: 6, name: "Legal", code: "LEGAL", description: "Legal Affairs" },
  {
    id: 7,
    name: "Operations",
    code: "OPS",
    description: "Operations Management",
  },
];

// Designations table with hierarchy (no salary constraints)
export const designations = [
  // Engineering hierarchy
  {
    id: 1,
    title: "Junior Engineer",
    department_id: 1,
    level: 1,
  },
  {
    id: 2,
    title: "Assistant Engineer",
    department_id: 1,
    level: 2,
  },
  {
    id: 3,
    title: "Engineer",
    department_id: 1,
    level: 3,
  },
  {
    id: 4,
    title: "Senior Engineer",
    department_id: 1,
    level: 4,
  },
  {
    id: 5,
    title: "Assistant Manager",
    department_id: 1,
    level: 5,
  },
  {
    id: 6,
    title: "Manager",
    department_id: 1,
    level: 6,
  },
  {
    id: 7,
    title: "Deputy Director Engineering",
    department_id: 1,
    level: 7,
  },

  // IT hierarchy
  {
    id: 8,
    title: "Software Developer",
    department_id: 2,
    level: 1,
  },
  {
    id: 9,
    title: "Senior Software Developer",
    department_id: 2,
    level: 2,
  },
  {
    id: 10,
    title: "IT Manager",
    department_id: 2,
    level: 3,
  },

  // HR hierarchy
  {
    id: 11,
    title: "HR Officer",
    department_id: 3,
    level: 1,
  },
  {
    id: 12,
    title: "Senior HR Officer",
    department_id: 3,
    level: 2,
  },
  {
    id: 13,
    title: "HR Manager",
    department_id: 3,
    level: 3,
  },

  // Administration hierarchy
  {
    id: 14,
    title: "Administrative Officer",
    department_id: 4,
    level: 1,
  },
  {
    id: 15,
    title: "Senior Administrative Officer",
    department_id: 4,
    level: 2,
  },
  {
    id: 16,
    title: "Administrative Manager",
    department_id: 4,
    level: 3,
  },

  // Finance hierarchy
  {
    id: 17,
    title: "Accounts Officer",
    department_id: 5,
    level: 1,
  },
  {
    id: 18,
    title: "Senior Accounts Officer",
    department_id: 5,
    level: 2,
  },
  {
    id: 19,
    title: "Finance Manager",
    department_id: 5,
    level: 3,
  },

  // Legal hierarchy
  {
    id: 20,
    title: "Legal Officer",
    department_id: 6,
    level: 1,
  },
  {
    id: 21,
    title: "Senior Legal Officer",
    department_id: 6,
    level: 2,
  },
  {
    id: 22,
    title: "Legal Manager",
    department_id: 6,
    level: 3,
  },

  // Operations hierarchy
  {
    id: 23,
    title: "Operations Officer",
    department_id: 7,
    level: 1,
  },
  {
    id: 24,
    title: "Senior Operations Officer",
    department_id: 7,
    level: 2,
  },
  {
    id: 25,
    title: "Operations Manager",
    department_id: 7,
    level: 3,
  },
];

// Employment types
export const employmentTypes = [
  {
    id: 1,
    type: "Regular",
    description: "Permanent employment",
    benefits: "Full benefits",
  },
  {
    id: 2,
    type: "Contract",
    description: "Fixed-term contract",
    benefits: "Limited benefits",
  },
  {
    id: 3,
    type: "Probation",
    description: "Probationary period",
    benefits: "Basic benefits",
  },
  {
    id: 4,
    type: "Internship",
    description: "Training position",
    benefits: "Stipend only",
  },
];

// Role tags
export const roleTags = [
  { id: 1, tag: "Technical", description: "Technical and engineering roles" },
  {
    id: 2,
    tag: "Administrative",
    description: "Administrative and clerical roles",
  },
  { id: 3, tag: "Management", description: "Management and supervisory roles" },
  { id: 4, tag: "Finance", description: "Finance and accounting roles" },
  { id: 5, tag: "Legal", description: "Legal and compliance roles" },
  { id: 6, tag: "Operations", description: "Operations and field roles" },
  { id: 7, tag: "Support", description: "Support and auxiliary roles" },
];

// Contract types
export const contractTypes = [
  {
    id: 1,
    type: "Contractual",
    description: "Fixed-term contractual employment",
  },
  { id: 2, type: "Daily Wager", description: "Daily wage based employment" },
  { id: 3, type: "Consultant", description: "Consultancy services" },
  { id: 4, type: "Project Based", description: "Project specific employment" },
  { id: 5, type: "Seasonal", description: "Seasonal employment" },
  { id: 6, type: "Part Time", description: "Part-time employment" },
];

// Confirmation statuses
export const confirmationStatuses = [
  { id: 1, status: "Confirmed", description: "Employment confirmed" },
  { id: 2, status: "Extended", description: "Probation period extended" },
  { id: 3, status: "In Progress", description: "Under probation review" },
  { id: 4, status: "Terminated", description: "Employment terminated" },
];

// Performance ratings
export const performanceRatings = [
  { id: 1, rating: "Excellent", description: "Outstanding performance" },
  { id: 2, rating: "Good", description: "Above average performance" },
  { id: 3, rating: "Satisfactory", description: "Meets expectations" },
  { id: 4, rating: "Needs Improvement", description: "Below expectations" },
];

// Renewal reasons
export const renewalReasons = [
  {
    id: 1,
    reason: "Performance",
    description: "Good performance merits renewal",
  },
  {
    id: 2,
    reason: "Project Extension",
    description: "Project timeline extended",
  },
  {
    id: 3,
    reason: "Business Needs",
    description: "Continued business requirement",
  },
  {
    id: 4,
    reason: "Skill Requirement",
    description: "Specialized skills needed",
  },
  {
    id: 5,
    reason: "Budget Approval",
    description: "Budget approved for extension",
  },
];

// Termination reasons
export const terminationReasons = [
  {
    id: 1,
    reason: "Contract Completion",
    description: "Contract period completed",
  },
  {
    id: 2,
    reason: "Performance Issues",
    description: "Unsatisfactory performance",
  },
  { id: 3, reason: "Budget Constraints", description: "Budget limitations" },
  {
    id: 4,
    reason: "Project Completion",
    description: "Project finished early",
  },
  { id: 5, reason: "Resignation", description: "Employee resignation" },
  { id: 6, reason: "Misconduct", description: "Disciplinary action" },
];

// Contract statuses
export const contractStatuses = [
  { id: 1, status: "Active", description: "Currently active contract" },
  {
    id: 2,
    status: "Completed",
    description: "Contract completed successfully",
  },
  { id: 3, status: "Terminated", description: "Contract terminated early" },
  { id: 4, status: "Renewed", description: "Contract has been renewed" },
];

// Office locations
export const officeLocations = [
  {
    id: 1,
    name: "Lahore Office",
    address: "Main Office, Lahore",
    organization_id: 1,
  },
  {
    id: 2,
    name: "PMBMC Head Office",
    address: "PMBMC Headquarters, Lahore",
    organization_id: 2,
  },
  {
    id: 3,
    name: "PMBMC IT Center",
    address: "IT Center, PMBMC Complex",
    organization_id: 2,
  },
  {
    id: 4,
    name: "PSBA Headquarters",
    address: "PSBA Main Building, Lahore",
    organization_id: 3,
  },
  {
    id: 5,
    name: "PSBA IT Division",
    address: "IT Wing, PSBA Complex",
    organization_id: 3,
  },
  {
    id: 6,
    name: "PSBA Admin Block",
    address: "Administrative Block, PSBA",
    organization_id: 3,
  },
];

// Transform comprehensive employment records to match the expected structure
const transformEmploymentRecord = (record) => {
  console.log("🔄 NormalizedData: Transforming record:", record);

  const transformed = {
    id: record.id,
    user_id: record.employee_id, // Transform employee_id to user_id
    organization: record.organization,
    department: record.department,
    designation: record.designation,
    employment_type: record.employment_type,
    reporting_officer_id: null, // Not available in source data
    role_tag: "Technical", // Default value, could be enhanced
    effective_from: record.start_date, // Transform start_date to effective_from
    effective_till: record.end_date, // Transform end_date to effective_till
    office_location: record.office_location,
    remarks: record.remarks,
    salary: record.salary, // Include salary information

    // New employment information fields
    scale_grade: record.scale_grade || null,
    medical_fitness_report_pdf: record.medical_fitness_report_pdf || null,
    police_character_certificate: record.police_character_certificate || null,
    filer_status: record.filer_status || 'non_filer', // 'filer' or 'non_filer'
    filer_active_status: record.filer_active_status || null, // 'active' or 'not_active' (only if filer)
    employment_status: record.employment_status || 'active', // 'active', 'inactive', 'terminated', 'resigned'
    is_current: record.is_current !== undefined ? record.is_current : true, // Boolean for current employee

    created_at: record.created_at,
    updated_at: record.created_at, // Use created_at as updated_at if not available
  };

  console.log("✅ NormalizedData: Transformed record:", transformed);
  console.log("📅 NormalizedData: Date fields - effective_from:", transformed.effective_from, "effective_till:", transformed.effective_till);

  return transformed;
};

// Employment records table (main employment data) - using comprehensive data
export let employmentRecords = dummyEmploymentRecords.map(transformEmploymentRecord);

// Contract records table (for contractual employees)
export let contractRecords = [
  // Sample contract records
  {
    id: 1,
    employment_id: 1, // Foreign key to employment_records
    contract_type: "Contractual", // Contractual, Daily Wager, Consultant, etc.
    contract_number: "MBWO-2024-001", // Unique contract identifier
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    is_renewed: false,
    renewal_from_contract_id: null, // Points to previous contract if this is a renewal
    renewal_notes: null,
    renewal_reason: null, // Performance, Extension, etc.
    renewal_report: null, // PDF or document for renewal report
    probation_start: "2024-01-01",
    probation_end: "2024-03-31",
    probation_extended: false,
    probation_extension_reason: null,
    confirmation_date: "2024-04-01",
    confirmation_status: "Confirmed", // Confirmed, Extended, In Progress, Terminated
    termination_date: null,
    termination_reason: null,
    performance_rating: null, // Excellent, Good, Satisfactory, Needs Improvement
    contract_status: "Active", // Active, Completed, Terminated, Renewed
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Salary records table (separate from employment)
export let salaryRecords = [
  // Sample salary records
  {
    id: 1,
    employment_id: 1, // Foreign key to employment_records
    basic_salary: 45000,
    medical_allowance: 5000,
    house_rent: 15000,
    conveyance_allowance: 3000,
    other_allowances: 2000,
    bonus_eligible: true,
    daily_wage_rate: null, // For daily wage employees
    bank_account_primary: "1234567890",
    bank_name_primary: "HBL",
    bank_account_secondary: null,
    bank_name_secondary: null,
    payment_mode: "Bank Transfer", // Bank Transfer, Cash, Cheque
    salary_effective_from: "2024-01-01",
    salary_effective_till: null, // null means current
    payroll_status: "Active", // Active, Held, Stopped
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Location records table (separate from employment)
export let locationRecords = [
  // Sample location records
  {
    id: 1,
    employment_id: 1, // Foreign key to employment_records
    district: "Lahore",
    city: "Lahore",
    bazaar_name: null, // For bazaar type locations
    type: "HEAD_OFFICE", // HEAD_OFFICE, BAZAAR
    full_address: "Main Office Building, Gulberg III, Lahore",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Salary grades/scales (for reference only, no validation)
export const salaryGrades = [
  { id: 1, grade: "BPS-17", description: "Basic Pay Scale 17" },
  { id: 2, grade: "BPS-18", description: "Basic Pay Scale 18" },
  { id: 3, grade: "BPS-19", description: "Basic Pay Scale 19" },
  { id: 4, grade: "BPS-20", description: "Basic Pay Scale 20" },
  { id: 5, grade: "BPS-21", description: "Basic Pay Scale 21" },
  { id: 6, grade: "BPS-22", description: "Basic Pay Scale 22" },
];

// Helper functions for normalized data
export const getOrganizationById = (id) =>
  organizations.find((org) => org.id === id);
export const getOrganizationByCode = (code) =>
  organizations.find((org) => org.code === code);

export const getDepartmentById = (id) =>
  departments.find((dept) => dept.id === id);
export const getDepartmentsByName = (name) =>
  departments.filter((dept) =>
    dept.name.toLowerCase().includes(name.toLowerCase())
  );

export const getDesignationById = (id) =>
  designations.find((des) => des.id === id);
export const getDesignationsByDepartment = (departmentIdOrName) => {
  console.log(
    "🔍 getDesignationsByDepartment called with:",
    departmentIdOrName
  );
  console.log("🔍 Type:", typeof departmentIdOrName);

  // Handle both department ID and department name
  let targetDepartmentId = departmentIdOrName;

  // If it's a string that doesn't look like an ID, treat it as department name
  if (typeof departmentIdOrName === "string" && isNaN(departmentIdOrName)) {
    console.log("🔍 Searching for department by name:", departmentIdOrName);
    const department = departments.find(
      (dept) =>
        dept.name === departmentIdOrName ||
        dept.name.toLowerCase() === departmentIdOrName.toLowerCase()
    );
    console.log("🔍 Found department:", department);
    targetDepartmentId = department?.id;
  }

  console.log("🔍 Target department ID:", targetDepartmentId);

  if (!targetDepartmentId) {
    console.warn(`❌ Department not found: ${departmentIdOrName}`);
    return [];
  }

  const filteredDesignations = designations.filter(
    (des) => des.department_id === targetDepartmentId
  );
  console.log("🔍 Filtered designations:", filteredDesignations);

  return filteredDesignations;
};
export const getDesignationsByLevel = (level) =>
  designations.filter((des) => des.level === level);

export const getEmploymentTypeById = (id) =>
  employmentTypes.find((type) => type.id === id);

export const getOfficeLocationById = (id) =>
  officeLocations.find((loc) => loc.id === id);
export const getOfficeLocationsByOrganization = (organizationId) =>
  officeLocations.filter((loc) => loc.organization_id === organizationId);

export const getSalaryGradeById = (id) =>
  salaryGrades.find((grade) => grade.id === id);
// Removed getSalaryGradeForSalary function as salary grades no longer have min/max constraints

// Salary Records CRUD Functions
let salaryIdCounter = 2;

export const createSalaryRecord = (salaryData) => {
  const newSalary = {
    id: salaryIdCounter++,
    ...salaryData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  salaryRecords.push(newSalary);
  return newSalary;
};

export const getSalaryByEmploymentId = (employmentId) => {
  return salaryRecords.filter(
    (salary) => salary.employment_id === employmentId
  );
};

export const getCurrentSalaryByEmploymentId = (employmentId) => {
  return salaryRecords.find(
    (salary) =>
      salary.employment_id === employmentId &&
      salary.salary_effective_till === null
  );
};

export const updateSalaryRecord = (id, updateData) => {
  const index = salaryRecords.findIndex((salary) => salary.id === id);
  if (index !== -1) {
    salaryRecords[index] = {
      ...salaryRecords[index],
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    return salaryRecords[index];
  }
  return null;
};

export const deleteSalaryRecord = (id) => {
  const index = salaryRecords.findIndex((salary) => salary.id === id);
  if (index !== -1) {
    return salaryRecords.splice(index, 1)[0];
  }
  return null;
};

// Location Records CRUD Functions
let locationIdCounter = 2;

export const createLocationRecord = (locationData) => {
  const newLocation = {
    id: locationIdCounter++,
    ...locationData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  locationRecords.push(newLocation);
  return newLocation;
};

export const getLocationByEmploymentId = (employmentId) => {
  return locationRecords.filter(
    (location) => location.employment_id === employmentId
  );
};

export const updateLocationRecord = (id, updateData) => {
  const index = locationRecords.findIndex((location) => location.id === id);
  if (index !== -1) {
    locationRecords[index] = {
      ...locationRecords[index],
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    return locationRecords[index];
  }
  return null;
};

export const deleteLocationRecord = (id) => {
  const index = locationRecords.findIndex((location) => location.id === id);
  if (index !== -1) {
    return locationRecords.splice(index, 1)[0];
  }
  return null;
};

// Employment Records CRUD Functions
let employmentIdCounter = 2;

export const createEmploymentRecord = (employmentData) => {
  const newEmployment = {
    id: employmentIdCounter++,
    ...employmentData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  employmentRecords.push(newEmployment);
  return newEmployment;
};

export const getEmploymentByUserId = (userId) => {
  return employmentRecords.filter(
    (employment) => employment.user_id === userId
  );
};

export const getCurrentEmploymentByUserId = (userId) => {
  return employmentRecords.find(
    (employment) =>
      employment.user_id === userId && employment.effective_till === null
  );
};

export const updateEmploymentRecord = (id, updateData) => {
  const index = employmentRecords.findIndex(
    (employment) => employment.id === id
  );
  if (index !== -1) {
    employmentRecords[index] = {
      ...employmentRecords[index],
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    return employmentRecords[index];
  }
  return null;
};

export const deleteEmploymentRecord = (id) => {
  const index = employmentRecords.findIndex(
    (employment) => employment.id === id
  );
  if (index !== -1) {
    return employmentRecords.splice(index, 1)[0];
  }
  return null;
};

// Contract Records CRUD Functions
let contractIdCounter = 2;

export const createContractRecord = (contractData) => {
  const newContract = {
    id: contractIdCounter++,
    ...contractData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  contractRecords.push(newContract);
  return newContract;
};

export const getContractByEmploymentId = (employmentId) => {
  return contractRecords.filter(
    (contract) => contract.employment_id === employmentId
  );
};

export const getCurrentContractByEmploymentId = (employmentId) => {
  return contractRecords.find(
    (contract) =>
      contract.employment_id === employmentId &&
      new Date(contract.end_date) >= new Date()
  );
};

export const updateContractRecord = (id, updateData) => {
  const index = contractRecords.findIndex((contract) => contract.id === id);
  if (index !== -1) {
    contractRecords[index] = {
      ...contractRecords[index],
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    return contractRecords[index];
  }
  return null;
};

export const deleteContractRecord = (id) => {
  const index = contractRecords.findIndex((contract) => contract.id === id);
  if (index !== -1) {
    return contractRecords.splice(index, 1)[0];
  }
  return null;
};

// Contract Renewal Functions
export const renewContract = (originalContractId, renewalData) => {
  const originalContract = contractRecords.find(
    (contract) => contract.id === originalContractId
  );
  if (!originalContract) {
    throw new Error("Original contract not found");
  }

  // Mark original contract as renewed
  updateContractRecord(originalContractId, {
    is_renewed: true,
    contract_status: "Renewed",
    renewal_notes: renewalData.renewal_notes || "Contract renewed",
  });

  // Create new contract record
  const newContract = createContractRecord({
    employment_id: originalContract.employment_id,
    contract_type: renewalData.contract_type || originalContract.contract_type,
    contract_number: renewalData.contract_number,
    start_date: renewalData.start_date,
    end_date: renewalData.end_date,
    is_renewed: false,
    renewal_from_contract_id: originalContractId,
    renewal_notes: renewalData.renewal_notes,
    renewal_reason: renewalData.renewal_reason,
    probation_start: renewalData.reset_probation
      ? renewalData.probation_start
      : null,
    probation_end: renewalData.reset_probation
      ? renewalData.probation_end
      : null,
    probation_extended: false,
    confirmation_status: renewalData.reset_probation
      ? "In Progress"
      : "Confirmed",
    confirmation_date: renewalData.reset_probation
      ? null
      : renewalData.confirmation_date,
    performance_rating: renewalData.performance_rating,
    contract_status: "Active",
  });

  return newContract;
};

export const getContractHistory = (employmentId) => {
  return contractRecords
    .filter((contract) => contract.employment_id === employmentId)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
};

export const extendProbation = (contractId, extensionData) => {
  return updateContractRecord(contractId, {
    probation_end: extensionData.new_probation_end,
    probation_extended: true,
    probation_extension_reason: extensionData.extension_reason,
    confirmation_status: "Extended",
  });
};

export const confirmEmployee = (contractId, confirmationData) => {
  return updateContractRecord(contractId, {
    confirmation_date: confirmationData.confirmation_date,
    confirmation_status: "Confirmed",
    performance_rating: confirmationData.performance_rating,
  });
};

export const terminateContract = (contractId, terminationData) => {
  return updateContractRecord(contractId, {
    termination_date: terminationData.termination_date,
    termination_reason: terminationData.termination_reason,
    contract_status: "Terminated",
  });
};

// Draft/Session Management for Progressive Forms
export let employmentDrafts = [];
let draftIdCounter = 1;

export const saveDraft = (userId, draftData, draftType = "employment") => {
  const existingDraftIndex = employmentDrafts.findIndex(
    (draft) => draft.user_id === userId && draft.type === draftType
  );

  const draftRecord = {
    id:
      existingDraftIndex >= 0
        ? employmentDrafts[existingDraftIndex].id
        : draftIdCounter++,
    user_id: userId,
    type: draftType,
    data: draftData,
    step_completed: draftData.step_completed || 1,
    created_at:
      existingDraftIndex >= 0
        ? employmentDrafts[existingDraftIndex].created_at
        : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingDraftIndex >= 0) {
    employmentDrafts[existingDraftIndex] = draftRecord;
  } else {
    employmentDrafts.push(draftRecord);
  }

  return draftRecord;
};

export const getDraft = (userId, draftType = "employment") => {
  return employmentDrafts.find(
    (draft) => draft.user_id === userId && draft.type === draftType
  );
};

export const deleteDraft = (userId, draftType = "employment") => {
  const index = employmentDrafts.findIndex(
    (draft) => draft.user_id === userId && draft.type === draftType
  );
  if (index >= 0) {
    return employmentDrafts.splice(index, 1)[0];
  }
  return null;
};

export const getAllDrafts = () => {
  return employmentDrafts;
};

// Employment Status Management
export const getEmploymentStatus = (userId) => {
  const employment = getCurrentEmploymentByUserId(userId);
  const draft = getDraft(userId);

  return {
    hasActiveEmployment: !!employment,
    hasDraft: !!draft,
    draftStep: draft?.step_completed || 0,
    lastUpdated: draft?.updated_at || employment?.updated_at,
    canContinue: !!draft,
    employment: employment,
    draft: draft,
  };
};

// Completion Status Tracking
export const getCompletionStatus = (employmentId) => {
  const salary = getCurrentSalaryByEmploymentId(employmentId);
  const location = getLocationByEmploymentId(employmentId);
  const contract = getCurrentContractByEmploymentId(employmentId);

  return {
    employment_completed: true, // If we have employmentId, employment is completed
    salary_completed: !!salary && salary.length > 0,
    location_completed: !!location && location.length > 0,
    contract_completed: !!contract,
    overall_completed: !!salary && !!location && contract !== null, // contract can be null for regular employees
  };
};

export const getCareerProgression = (currentDesignationId) => {
  const current = getDesignationById(currentDesignationId);
  if (!current) return [];

  return designations
    .filter(
      (des) =>
        des.department_id === current.department_id && des.level > current.level
    )
    .sort((a, b) => a.level - b.level);
};

// Data export for forms
export const getFormOptions = () => {
  try {
    return {
      organizations: organizations.map((org) => ({
        value: org.code,
        label: `${org.name} (${org.code})`,
      })),
      departments: departments.map((dept) => ({
        value: dept.name,
        label: dept.name,
        id: dept.id, // Include ID for designation filtering
      })),
      designations: designations.map((des) => ({
        value: des.title,
        label: des.title,
        id: des.id,
        department_id: des.department_id,
        department: getDepartmentById(des.department_id)?.name,
        level: des.level,
      })),
      employmentTypes: employmentTypes.map((type) => ({
        value: type.type,
        label: type.type,
      })),
      officeLocations: officeLocations.map((loc) => ({
        value: loc.name,
        label: loc.name,
        organization: getOrganizationById(loc.organization_id)?.code,
      })),
      salaryGrades: salaryGrades.map((grade) => ({
        value: grade.grade,
        label: `${grade.grade} - ${grade.description}`,
      })),
      roleTags: roleTags.map((role) => ({
        value: role.tag,
        label: role.tag,
        description: role.description,
      })),
      contractTypes: contractTypes.map((contract) => ({
        value: contract.type,
        label: contract.type,
        description: contract.description,
      })),
      confirmationStatuses: confirmationStatuses.map((status) => ({
        value: status.status,
        label: status.status,
        description: status.description,
      })),
      performanceRatings: performanceRatings.map((rating) => ({
        value: rating.rating,
        label: rating.rating,
        description: rating.description,
      })),
      renewalReasons: renewalReasons.map((reason) => ({
        value: reason.reason,
        label: reason.reason,
        description: reason.description,
      })),
      terminationReasons: terminationReasons.map((reason) => ({
        value: reason.reason,
        label: reason.reason,
        description: reason.description,
      })),
      contractStatuses: contractStatuses.map((status) => ({
        value: status.status,
        label: status.status,
        description: status.description,
      })),
    };
  } catch (error) {
    console.error("Error generating form options:", error);
    // Return minimal fallback options
    return {
      organizations: [],
      departments: [],
      designations: [],
      employmentTypes: [],
      officeLocations: [],
      salaryGrades: [],
      roleTags: [],
      contractTypes: [],
      confirmationStatuses: [],
      performanceRatings: [],
      renewalReasons: [],
      terminationReasons: [],
      contractStatuses: [],
    };
  }
};

// Statistics and reporting functions
export const getOrganizationStats = () => {
  return organizations.map((org) => ({
    ...org,
    departments: departments.filter((dept) =>
      designations.some((des) => des.department_id === dept.id)
    ).length,
    designations: designations.filter((des) =>
      getDepartmentById(des.department_id)
    ).length,
    locations: getOfficeLocationsByOrganization(org.id).length,
  }));
};

export const getDepartmentStats = () => {
  return departments.map((dept) => ({
    ...dept,
    designations: getDesignationsByDepartment(dept.id),
    designationCount: getDesignationsByDepartment(dept.id).length,
  }));
};
