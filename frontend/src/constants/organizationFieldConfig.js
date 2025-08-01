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
        "basic_salary"
      ],
      location: "all",
      contract: [] // All contract fields visible for MBWO
    }
  },
  
  PMBMC: {
    name: "PMBMC", 
    hiddenFields: {
      employment: [
        "scale_grade",
        "reporting_officer_id",
        "office_location",
        "employment_status"
      ],
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
      employment: ["office_location"], // Hide office location for all organizations
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
  { value: "MBWO", label: "MBWO" },
  { value: "PMBMC", label: "PMBMC" },
  { value: "PSBA", label: "PSBA" }
];
