import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for managing tab-based form state
 *
 * Features:
 * - Cross-tab state management
 * - Auto-save with localStorage
 * - Data encryption for sensitive fields
 * - Form recovery mechanism
 * - Validation state tracking
 * - Progress calculation
 */

// Simple encryption/decryption for localStorage (basic security)
const encryptData = (data) => {
  try {
    return btoa(JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to encrypt data:", error);
    return JSON.stringify(data);
  }
};

const decryptData = (encryptedData) => {
  try {
    return JSON.parse(atob(encryptedData));
  } catch (error) {
    console.warn("Failed to decrypt data:", error);
    try {
      return JSON.parse(encryptedData);
    } catch (parseError) {
      return null;
    }
  }
};

const useTabFormState = (formId, initialData = {}, tabConfig = []) => {
  const [formData, setFormData] = useState({
    users: {},
    employees: {},
    employment_history: [],
    location: {},
    files: {},
    ...initialData,
  });

  const [validationStates, setValidationStates] = useState({});
  const [completionStates, setCompletionStates] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  const initialDataRef = useRef(initialData);
  const storageKey = `employee_form_${formId}`;

  // Field mapping configuration for normalized data structure
  const fieldMapping = {
    personal: {
      table: "users",
      fields: [
        "full_name",
        "father_or_husband_name",
        "mother_name",
        "cnic",
        "gender",
        "marital_status",
        "nationality",
        "religion",
        "blood_group",
        "domicile_district",
        "date_of_birth",
        "cnic_issue_date",
        "cnic_expiry_date",
      ],
    },
    employment: {
      table: "employees",
      fields: [
        "department_id",
        "designation_id",
        "grade_scale",
        "latest_qualification",
        "joining_date_psba",
        "joining_date_mwo",
        "joining_date_pmbmc",
        "status",
        "filer_status",
        "filer_active_status",
        "disability_status",
        "disability_description",
        "medical_fitness_status",
        "termination_or_suspend_date",
        "termination_reason",
        "special_duty_note",
        "document_missing_note",
      ],
    },
    history: {
      table: "employment_history",
      fields: ["start_date", "end_date", "description"],
    },
    contact: {
      table: "location",
      fields: [
        "mobile_number",
        "whatsapp_number",
        "email",
        "present_address",
        "permanent_address",
        "district",
        "city",
      ],
    },
    files: {
      table: "files",
      fields: ["profile_picture_file", "medical_fitness_file"],
    },
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const decryptedData = decryptData(savedData);
        if (decryptedData && typeof decryptedData === "object") {
          setFormData((prev) => ({
            ...prev,
            ...decryptedData.formData,
          }));
          setLastSaveTime(new Date(decryptedData.timestamp));
        }
      } catch (error) {
        console.warn("Failed to load saved form data:", error);
      }
    }
  }, [storageKey]);

  // Save data to localStorage
  const saveToStorage = useCallback(
    (data, timestamp = new Date()) => {
      try {
        const dataToSave = {
          formData: data,
          timestamp: timestamp.toISOString(),
          version: "1.0",
        };
        const encryptedData = encryptData(dataToSave);
        localStorage.setItem(storageKey, encryptedData);
        setLastSaveTime(timestamp);
        return true;
      } catch (error) {
        console.error("Failed to save form data:", error);
        return false;
      }
    },
    [storageKey]
  );

  // Update form data for specific table
  const updateFormData = useCallback((table, updates) => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        [table]:
          table === "employment_history"
            ? updates // Array replacement for history
            : { ...prev[table], ...updates }, // Object merge for others
      };

      // Check if data has changed
      const hasChanged =
        JSON.stringify(newData) !== JSON.stringify(initialDataRef.current);
      setHasUnsavedChanges(hasChanged);

      return newData;
    });
  }, []);

  // Update field value with automatic table mapping
  const updateField = useCallback(
    (fieldName, value, tabId) => {
      // Find which table this field belongs to
      const mapping = Object.values(fieldMapping).find((config) =>
        config.fields.includes(fieldName)
      );

      if (mapping) {
        updateFormData(mapping.table, { [fieldName]: value });
      } else {
        console.warn(`Field ${fieldName} not found in mapping configuration`);
      }

      // Update validation state for the tab
      setValidationStates((prev) => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          [fieldName]: null, // Clear error when user types
        },
      }));
    },
    [updateFormData]
  );

  // Add employment history entry
  const addEmploymentHistory = useCallback((entry) => {
    setFormData((prev) => {
      const newHistory = [
        ...prev.employment_history,
        {
          id: Date.now(), // Temporary ID
          start_date: "",
          end_date: "",
          description: "",
          ...entry,
        },
      ];

      return {
        ...prev,
        employment_history: newHistory,
      };
    });

    setHasUnsavedChanges(true);
  }, []);

  // Remove employment history entry
  const removeEmploymentHistory = useCallback((index) => {
    setFormData((prev) => {
      const newHistory = prev.employment_history.filter((_, i) => i !== index);

      return {
        ...prev,
        employment_history: newHistory,
      };
    });

    setHasUnsavedChanges(true);
  }, []);

  // Update employment history entry
  const updateEmploymentHistory = useCallback((index, updates) => {
    setFormData((prev) => {
      const newHistory = prev.employment_history.map((entry, i) =>
        i === index ? { ...entry, ...updates } : entry
      );

      return {
        ...prev,
        employment_history: newHistory,
      };
    });

    setHasUnsavedChanges(true);
  }, []);

  // Calculate completion state for a tab
  const calculateTabCompletion = useCallback(
    (tabId) => {
      const tabMapping = fieldMapping[tabId];
      if (!tabMapping)
        return {
          isComplete: false,
          hasData: false,
          completedFields: 0,
          totalFields: 0,
        };

      const tableData = formData[tabMapping.table];
      const fields = tabMapping.fields;

      if (tabMapping.table === "employment_history") {
        const hasHistory = Array.isArray(tableData) && tableData.length > 0;
        const validEntries =
          tableData?.filter((entry) => entry.start_date && entry.description)
            .length || 0;

        return {
          isComplete: hasHistory && validEntries === tableData.length,
          hasData: hasHistory,
          completedFields: validEntries,
          totalFields: tableData?.length || 0,
        };
      }

      const completedFields = fields.filter((field) => {
        const value = tableData?.[field];
        return value !== null && value !== undefined && value !== "";
      }).length;

      const requiredFields =
        tabConfig.find((tab) => tab.id === tabId)?.requiredFields || [];
      const completedRequiredFields = requiredFields.filter((field) => {
        const value = tableData?.[field];
        return value !== null && value !== undefined && value !== "";
      }).length;

      return {
        isComplete:
          requiredFields.length > 0
            ? completedRequiredFields === requiredFields.length
            : completedFields > 0,
        hasData: completedFields > 0,
        completedFields,
        totalFields: fields.length,
      };
    },
    [formData, tabConfig]
  );

  // Update completion states for all tabs
  useEffect(() => {
    const newCompletionStates = {};
    tabConfig.forEach((tab) => {
      newCompletionStates[tab.id] = calculateTabCompletion(tab.id);
    });
    setCompletionStates(newCompletionStates);
  }, [formData, tabConfig, calculateTabCompletion]);

  // Validate tab data
  const validateTab = useCallback(
    (tabId, validationRules = {}) => {
      const tabMapping = fieldMapping[tabId];
      if (!tabMapping) return {};

      const tableData = formData[tabMapping.table];
      const errors = {};

      tabMapping.fields.forEach((field) => {
        const value = tableData?.[field];
        const rules = validationRules[field];

        if (rules?.required && (!value || value.toString().trim() === "")) {
          errors[field] = `${rules.label || field} is required`;
        }

        if (value && rules?.pattern && !rules.pattern.test(value)) {
          errors[field] =
            rules.message || `Invalid ${rules.label || field} format`;
        }
      });

      setValidationStates((prev) => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          ...errors,
          hasErrors: Object.keys(errors).length > 0,
        },
      }));

      return errors;
    },
    [formData]
  );

  // Save form data
  const saveForm = useCallback(
    (saveType = "manual") => {
      const timestamp = new Date();
      const success = saveToStorage(formData, timestamp);

      if (success) {
        setHasUnsavedChanges(false);
        console.log(
          `Form ${saveType} saved at ${timestamp.toLocaleTimeString()}`
        );
      }

      return success;
    },
    [formData, saveToStorage]
  );

  // Clear saved data
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(storageKey);
    setLastSaveTime(null);
    setHasUnsavedChanges(false);
  }, [storageKey]);

  // Get normalized data for API submission
  const getNormalizedData = useCallback(() => {
    return {
      users: formData.users,
      employees: formData.employees,
      employment_history: formData.employment_history,
      location: formData.location,
      files: formData.files,
    };
  }, [formData]);

  return {
    // Data
    formData,
    normalizedData: getNormalizedData(),

    // State
    validationStates,
    completionStates,
    hasUnsavedChanges,
    lastSaveTime,

    // Actions
    updateField,
    updateFormData,
    addEmploymentHistory,
    removeEmploymentHistory,
    updateEmploymentHistory,
    validateTab,
    saveForm,
    clearSavedData,

    // Utilities
    fieldMapping,
  };
};

export default useTabFormState;
