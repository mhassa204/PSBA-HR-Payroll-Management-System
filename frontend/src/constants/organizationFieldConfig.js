// Organization-specific field visibility configuration

/**
 * Field visibility configuration for different organizations
 * Each organization has specific fields that should be hidden or shown
 */
export const ORGANIZATION_FIELD_CONFIG = {
  MBWO: {
    name: "MBWO",
    hiddenFields: {
      employment: [
        "department",
        "employment_type",
        "role_tag",
        "reporting_officer_id",
        "office_location",
        "scale_grade",
        "medical_fitness_report_pdf",
        "filer_status",
        "filer_active_status",
        "employment_status",
        "is_current",
        "is_on_probation",
        "probation_end_date"
      ],
      salary: [
        "medical_allowance",
        "house_rent",
        "conveyance_allowance",
        "other_allowances",
        "daily_wage_rate",
        "payment_mode",
        "bank_account_primary",
        "bank_name_primary",
        "bank_account_secondary",
        "bank_name_secondary",
        "bonus_eligible",
        "payroll_status"
      ],
      location: [],
      contract: [] // No contract fields hidden for MBWO
    },
    visibleFields: {
      employment: [
        "organization",
        "designation",
        "effective_from",
        "effective_till",
        "remarks"
      ],
      salary: [
        "gross_salary"
      ],
      location: "all",
      contract: [] // All contract fields visible for MBWO
    }
  },
  
  PMBMC: {
    name: "PMBMC", 
    hiddenFields: {
      employment: ["scale_grade"],
      salary: [], // No salary fields hidden for PMBMC
      location: [], // No location fields hidden for PMBMC
      contract: [] // No contract fields hidden for PMBMC
    },
    visibleFields: {
      employment: [
        "organization",
        "department",
        "designation",
        "employment_type",
        "role_tag",
        "effective_from",
        "effective_till",
        "medical_fitness_report_pdf",
        "filer_status",
        "filer_active_status",
        "is_current",
        "reporting_officer_id",
        "office_location",
        "employment_status",
        "remarks"
      ],
      salary: [
        "basic_salary",
        "medical_allowance",
        "house_rent",
        "conveyance_allowance", 
        "other_allowances"
      ],
      location: "all", // All location fields visible for PMBMC
      contract: [] // All contract fields visible for PMBMC
    }
  },
  
  PSBA: {
    name: "PSBA",
    hiddenFields: {
      employment: [], // No employment fields hidden for PSBA
      salary: [], // No salary fields hidden for PSBA
      location: [], // No location fields hidden for PSBA
      contract: [] // No contract fields hidden for PSBA
    },
    visibleFields: {
      employment: "all", // All employment fields visible
      salary: "all", // All salary fields visible
      location: "all", // All location fields visible
      contract: "all" // All contract fields visible
    }
  }
};

/**
 * Get field visibility configuration for a specific organization
 * @param {string} organizationName - Name of the organization
 * @returns {Object} Field visibility configuration
 */
export const getOrganizationConfig = (organizationName) => {
  if (!organizationName) {
    return ORGANIZATION_FIELD_CONFIG.PSBA; // Default to PSBA (show all fields)
  }
  
  const orgKey = organizationName.toUpperCase();
  return ORGANIZATION_FIELD_CONFIG[orgKey] || ORGANIZATION_FIELD_CONFIG.PSBA;
};

/**
 * Check if a field should be visible for a specific organization
 * @param {string} organizationName - Name of the organization
 * @param {string} section - Form section (employment, salary, location, contract)
 * @param {string} fieldName - Name of the field
 * @returns {boolean} Whether the field should be visible
 */
export const isFieldVisible = (organizationName, section, fieldName) => {
  const config = getOrganizationConfig(organizationName);
  
  // If visible fields is "all", show all fields except those explicitly hidden
  if (config.visibleFields[section] === "all") {
    return !config.hiddenFields[section].includes(fieldName);
  }
  
  // If visible fields is an array, only show fields in that array
  if (Array.isArray(config.visibleFields[section])) {
    return config.visibleFields[section].includes(fieldName);
  }
  
  // Default to visible if no configuration found
  return true;
};

/**
 * Check if an entire section should be visible for a specific organization
 * @param {string} organizationName - Name of the organization
 * @param {string} section - Form section (employment, salary, location, contract)
 * @returns {boolean} Whether the section should be visible
 */
export const isSectionVisible = (organizationName, section) => {
  const config = getOrganizationConfig(organizationName);
  
  // If visible fields is "all", section is visible
  if (config.visibleFields[section] === "all") {
    return true;
  }
  
  // If visible fields is an array, section is visible if array has items
  if (Array.isArray(config.visibleFields[section])) {
    return config.visibleFields[section].length > 0;
  }
  
  // Default to visible
  return true;
};

/**
 * Get default values for hidden fields based on organization
 * @param {string} organizationName - Name of the organization
 * @returns {Object} Default values for hidden fields
 */
export const getHiddenFieldDefaults = (organizationName) => {
  const config = getOrganizationConfig(organizationName);
  const defaults = {};
  
  // Set default values for hidden fields to prevent validation issues
  Object.keys(config.hiddenFields).forEach(section => {
    config.hiddenFields[section].forEach(fieldName => {
      // Set appropriate default values based on field type
      switch (fieldName) {
        case "employment_status":
          defaults[fieldName] = "active";
          break;
        case "is_current":
          defaults[fieldName] = true;
          break;
        case "employment_type":
          defaults[fieldName] = "Regular";
          break;
        case "filer_status":
          defaults[fieldName] = "non_filer";
          break;
        case "medical_allowance":
        case "house_rent":
        case "conveyance_allowance":
        case "other_allowances":
          defaults[fieldName] = 0;
          break;
        default:
          defaults[fieldName] = "";
      }
    });
  });
  
  return defaults;
};

/**
 * Organization options for dropdown
 */
export const ORGANIZATION_OPTIONS = [
  { value: "", label: "Select Organization" },
  { value: "MBWO", label: "Model Bazaar Welfare Organization (MBWO) - 2010-2016" },
  { value: "PMBMC", label: "Punjab Model Bazaars Management Company (PMBMC) - 2016-2024" },
  { value: "PSBA", label: "Punjab Sahulat Bazaars Authority (PSBA) - 2025-Present" }
];

/**
 * Organization-specific validation rules
 * Each organization has specific required and optional fields
 */
export const ORGANIZATION_VALIDATION_RULES = {
  MBWO: {
    required: ['employee_id', 'organization', 'designation', 'effective_from'],
    optional: ['effective_till', 'remarks', 'gross_salary'],
    hidden: ['department', 'employment_type', 'role_tag', 'reporting_officer_id', 'office_location', 'scale_grade', 'medical_fitness_report_pdf', 'filer_status', 'filer_active_status', 'employment_status', 'is_current', 'is_on_probation', 'probation_end_date'],
    fieldLabels: {
      designation: 'Designation',
      effective_from: 'Effective From Date',
      effective_till: 'Effective Till Date',
      gross_salary: 'Gross Salary',
      remarks: 'Remarks'
    }
  },
  
  PMBMC: {
    required: ['employee_id', 'organization', 'department', 'designation', 'employment_type', 'role_tag', 'effective_from', 'filer_status', 'is_current'],
    optional: ['effective_till', 'remarks', 'filer_active_status', 'basic_salary', 'medical_allowance', 'house_rent', 'conveyance_allowance', 'other_allowances', 'scale_grade', 'reporting_officer_id', 'office_location', 'employment_status'],
    hidden: [],
    fieldLabels: {
      department: 'Department',
      designation: 'Designation',
      employment_type: 'Employment Type',
      role_tag: 'Role Tag',
      effective_from: 'Effective From Date',
      effective_till: 'Effective Till Date',
      // medical_fitness_report_pdf removed from employment module
      filer_status: 'Filer Status',
      filer_active_status: 'Filer Active Status',
      is_current: 'Current Employment',
      scale_grade: 'Scale/Grade',
      reporting_officer_id: 'Reporting Officer',
      office_location: 'Office Location',
      employment_status: 'Employment Status',
      remarks: 'Remarks'
    }
  },
  
  PSBA: {
    required: ['employee_id', 'organization', 'designation', 'effective_from', 'filer_status', 'is_current'],
    optional: ['department', 'employment_type', 'role_tag', 'effective_till', 'remarks', 'filer_active_status', 'scale_grade', 'employment_status', 'is_on_probation', 'probation_end_date', 'reporting_officer_id', 'office_location'],
    hidden: [],
    fieldLabels: {
      department: 'Department',
      designation: 'Designation',
      employment_type: 'Employment Type',
      role_tag: 'Role Tag',
      effective_from: 'Effective From Date',
      effective_till: 'Effective Till Date',
      // medical_fitness_report_pdf removed from employment module
      filer_status: 'Filer Status',
      filer_active_status: 'Filer Active Status',
      is_current: 'Current Employment',
      scale_grade: 'Scale/Grade',
      employment_status: 'Employment Status',
      is_on_probation: 'On Probation',
      probation_end_date: 'Probation End Date',
      reporting_officer_id: 'Reporting Officer',
      office_location: 'Office Location',
      remarks: 'Remarks'
    }
  }
};

/**
 * Get validation rules for a specific organization
 * @param {string} organizationName - Name of the organization
 * @returns {Object} Validation rules
 */
export const getOrganizationValidationRules = (organizationName) => {
  if (!organizationName) {
    return ORGANIZATION_VALIDATION_RULES.PSBA; // Default to PSBA rules
  }
  
  const orgKey = organizationName.toUpperCase();
  return ORGANIZATION_VALIDATION_RULES[orgKey] || ORGANIZATION_VALIDATION_RULES.PSBA;
};

/**
 * Validate employment data based on organization rules
 * @param {Object} data - Employment data to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export const validateEmploymentData = (data) => {


  const { organization, user_id, employee_id, ...employmentData } = data;
  const rules = getOrganizationValidationRules(organization);
  

  
  const errors = [];
  
  if (!organization) {
    errors.push("Organization is required");
    return { isValid: false, errors };
  }
  
  // Check if we have employee_id or user_id
  const actualEmployeeId = employee_id || user_id;
  if (!actualEmployeeId) {
    errors.push("Employee ID is required");
  }
  
  // Check required fields (excluding employee_id and organization as they're handled above)
  const requiredFields = rules.required.filter(field => field !== 'employee_id' && field !== 'organization');
  requiredFields.forEach(field => {
    // Handle field name variations
    let fieldValue;
    if (field === 'designation') {
      fieldValue = employmentData.designation || employmentData.designation_id || employmentData.designation_name;
    } else if (field === 'department') {
      fieldValue = employmentData.department || employmentData.department_id || employmentData.department_name;
    } else if (field === 'role_tag') {
      fieldValue = employmentData.role_tag || employmentData.role_tag_id || employmentData.role_tag_name;
    } else if (field === 'scale_grade') {
      fieldValue = employmentData.scale_grade || employmentData.scale_grade_id || employmentData.scale_grade_name;
    } else if (field === 'reporting_officer_id') {
      fieldValue = employmentData.reporting_officer_id || employmentData.reporting_officer || employmentData.reporting_officer_name;
    } else {
      fieldValue = employmentData[field];
    }
    
    // Special handling for boolean fields - they should exist but can be false
    if (typeof fieldValue === 'boolean') {
      if (fieldValue === undefined || fieldValue === null) {
        const fieldLabel = rules.fieldLabels[field] || field;
        errors.push(`${fieldLabel} is required for ${organization} organization`);
      }
    } else if (!fieldValue || (typeof fieldValue === 'string' && !fieldValue.trim())) {
      const fieldLabel = rules.fieldLabels[field] || field;
      errors.push(`${fieldLabel} is required for ${organization} organization`);
    }
  });
  
  // Validate dates
  if (employmentData.effective_from) {
    const effectiveFrom = new Date(employmentData.effective_from);
    if (isNaN(effectiveFrom.getTime())) {
      errors.push('Effective from date must be valid');
    }
  }
  
  if (employmentData.effective_till && employmentData.effective_from) {
    const effectiveFrom = new Date(employmentData.effective_from);
    const effectiveTill = new Date(employmentData.effective_till);
    if (effectiveTill <= effectiveFrom) {
      errors.push('Effective till date must be after effective from date');
    }
  }
  
  // Document validations removed from employment module
  

  
  return {
    isValid: errors.length === 0,
    errors
  };
};
