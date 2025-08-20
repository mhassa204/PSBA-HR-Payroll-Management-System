/**
 * Custom Hook for Employment Form Management
 *
 * This hook encapsulates all employment form logic including
 * form state, validation, submission, and data persistence.
 * It provides a clean interface for components to manage employment data.
 *
 * @author PSBA HR Portal Team
 * @version 2.0.0
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { employmentService } from "../services/employmentService";

/**
 * Employment Form Hook
 *
 * @param {Object} options - Hook options
 * @param {Object} options.initialData - Initial form data
 * @param {boolean} options.isEditMode - Whether in edit mode
 * @param {string} options.userId - User ID
 * @param {function} options.onSuccess - Success callback
 * @param {function} options.onError - Error callback
 * @returns {Object} Form state and methods
 */
export const useEmploymentForm = ({
  initialData = null,
  isEditMode = false,
  isCreatingFromExisting = false,
  userId = null,
  onSuccess = null,
  onError = null,
} = {}) => {
  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [formOptions, setFormOptions] = useState(null);
  const [availableDesignations, setAvailableDesignations] = useState([]);
  const [isContractual, setIsContractual] = useState(false);
  const [completedTabs, setCompletedTabs] = useState({
    employment: false,
    salary: false,
    location: false,
    contract: false,
  });
  const [savedEmploymentId, setSavedEmploymentId] = useState(null);

  // Form instances
  const employmentForm = useForm({
    defaultValues: {
      organization: "",
      department: "",
      designation: "",
      employment_type: "Regular",
      effective_from: "",
      effective_till: "",
      role_tag: "",
      reporting_officer_id: "",
      office_location: "",
      remarks: "",
      scale_grade: "",
      employment_status: "active",
      is_current: true,
      filer_status: "non_filer",
      filer_active_status: "",
      medical_fitness_report_pdf: null,
      police_character_certificate: null,
      // Probation fields
      is_on_probation: false,
      probation_end_date: "",
    }, 
  });

  const salaryForm = useForm({
    defaultValues: {
      basic_salary: 0,
      gross_salary: 0,
      medical_allowance: 0,
      house_rent: 0,
      conveyance_allowance: 0,
      other_allowances: 0,
      daily_wage_rate: 0,
      bank_account_primary: "",
      bank_name_primary: "",
      bank_branch_code: "",
      payment_mode: "Bank Transfer",
      salary_effective_from: "",
      salary_effective_till: "",
      payroll_status: "Active",
    },
  });

  const locationForm = useForm({
    defaultValues: {
      district: "",
      city: "",
      bazaar_name: "",
      type: "HEAD_OFFICE",
      full_address: "",
    },
  });

  const contractForm = useForm({
    defaultValues: {
      contract_type: "",
      contract_number: "",
      start_date: "",
      end_date: "",
      renewal_count: 0,
      probation_start: "",
      probation_end: "",
      confirmation_status: "",
      confirmation_date: "",
      is_renewed: false,
      renewal_report: null,
    },
  });

  // Load form options on mount
  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        setIsLoading(true);
        
        const options = await employmentService.getFormOptions();
        
        setFormOptions(options);
      } catch (error) {
        console.error("❌ Error loading form options:", error);
        if (onError) onError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFormOptions();
  }, [onError]);

  // Load designations when form options change
  useEffect(() => {
    const loadDesignations = async () => {
      try {
        // Check if we're dealing with MBWO organization (which hides department field)
        const currentOrg = employmentForm.watch("organization");
        const isMBWO = currentOrg === "MBWO";
        

        console.log("🔍 useEmploymentForm: Form options available:", {
          hasFormOptions: !!formOptions,
          hasDesignations: !!formOptions?.designations,
          designationsCount: formOptions?.designations?.length || 0,
          hasDepartments: !!formOptions?.departments,
          departmentsCount: formOptions?.departments?.length || 0
        });
        
        if (formOptions?.designations && formOptions.designations.length > 0) {
          // Use designations directly from form options instead of loading by department
          console.log("✅ useEmploymentForm: Using designations from form options:", formOptions.designations.length);
          setAvailableDesignations(formOptions.designations);
        } else if (isMBWO && formOptions?.departments && formOptions.departments.length > 0) {
          // For MBWO, load all designations from all departments since department field is hidden
          console.log("🔍 useEmploymentForm: MBWO detected - loading all designations from all departments");
          const allDesignations = [];
          for (const dept of formOptions.departments) {
            try {
              console.log("🔍 useEmploymentForm: Loading designations for department:", dept.label, "ID:", dept.value);
              const designations = await employmentService.getDesignationsByDepartment(dept.value);
              console.log("✅ useEmploymentForm: Loaded designations for department", dept.label, ":", designations.length);
              allDesignations.push(...designations);
            } catch (error) {
              console.error(`❌ Error loading designations for department ${dept.label}:`, error);
            }
          }
          console.log("✅ useEmploymentForm: Loaded all designations for MBWO:", allDesignations.length);
          setAvailableDesignations(allDesignations);
        } else if (formOptions?.departments && formOptions.departments.length > 0) {
          // Fallback: load designations by department (for non-MBWO organizations)
          console.log("🔍 useEmploymentForm: Loading designations by department for non-MBWO organization");
          const allDesignations = [];
          for (const dept of formOptions.departments) {
            try {
              const designations = await employmentService.getDesignationsByDepartment(dept.value);
              allDesignations.push(...designations);
            } catch (error) {
              console.error(`❌ Error loading designations for department ${dept.label}:`, error);
            }
          }
          setAvailableDesignations(allDesignations);
        } else {
          console.warn("⚠️ No departments or designations available in form options");
          setAvailableDesignations([]);
        }
      } catch (error) {
        console.error("❌ Error loading designations:", error);
        setAvailableDesignations([]);
      }
    };

    loadDesignations();
  }, [formOptions, employmentForm]);

  // Watch employment type to determine if contractual
  useEffect(() => {
    const subscription = employmentForm.watch((value, { name }) => {
      if (name === "employment_type") {
        const isContractualType = value.employment_type === "Contract" || value.employment_type === "Daily Wager";
        setIsContractual(isContractualType);
        // Employment type changed - logging removed to prevent infinite loops
      }
    });

    return () => subscription.unsubscribe();
  }, [employmentForm]);

  // Watch organization changes to reload designations when needed
  useEffect(() => {
    const subscription = employmentForm.watch((value, { name }) => {
      if (name === "organization") {
        console.log("🔍 useEmploymentForm: Organization changed to:", value);
        // When organization changes, we need to reload designations
        // This will trigger the loadDesignations function above
        if (value === "MBWO") {
          console.log("🔍 useEmploymentForm: MBWO organization detected - will reload all designations");
          // For MBWO, set is_current to false by default
          employmentForm.setValue("is_current", false);
        } else if (value && value !== "MBWO") {
          // For other organizations, set is_current to true by default
          employmentForm.setValue("is_current", true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [employmentForm]);

  // Submit employment data
  const submitEmployment = useCallback(async (data) => {
    try {
      setIsLoading(true);
      // Submitting employment data

      // Prepare employment data with user ID
      const employmentData = {
        employee_id: userId,
        ...data,
        // Convert file inputs to actual files
        files: {
          medical_fitness_report_pdf: data.medical_fitness_report_pdf?.[0] || null,
          police_character_certificate: data.police_character_certificate?.[0] || null,
        }
      };

      let result;
      if (isEditMode && savedEmploymentId) {
        result = await employmentService.updateEmployment(savedEmploymentId, employmentData);
        // Employment updated successfully
      } else {
        result = await employmentService.createEmployment(employmentData);
        // Employment created successfully
        setSavedEmploymentId(result.id);
      }

      if (onSuccess) onSuccess(result, "employment");
      return result;
    } catch (error) {
      console.error("❌ Error submitting employment:", error);
      if (onError) onError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [userId, isEditMode, savedEmploymentId, onSuccess, onError]);

  // Submit salary data
  const submitSalary = useCallback(async (data) => {
    try {
      setIsLoading(true);


      if (!savedEmploymentId) {
        throw new Error("Employment record must be saved first");
      }

      let result;
      if (isEditMode) {
        result = await employmentService.updateSalary(savedEmploymentId, data);

      } else {
        result = await employmentService.createSalary(savedEmploymentId, data);

      }

      if (onSuccess) onSuccess(result, "salary");
      return result;
    } catch (error) {
      console.error("❌ Error submitting salary:", error);
      if (onError) onError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [savedEmploymentId, isEditMode, onSuccess, onError]);

  // Submit location data
  const submitLocation = useCallback(async (data) => {
    try {
      setIsLoading(true);


      if (!savedEmploymentId) {
        throw new Error("Employment record must be saved first");
      }

      let result;
      if (isEditMode) {
        result = await employmentService.updateLocation(savedEmploymentId, data);

      } else {
        result = await employmentService.createLocation(savedEmploymentId, data);

      }

      if (onSuccess) onSuccess(result, "location");
      return result;
    } catch (error) {
      console.error("❌ Error submitting location:", error);
      if (onError) onError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [savedEmploymentId, isEditMode, onSuccess, onError]);

  // Submit contract data
  const submitContract = useCallback(async (data) => {
    try {
      setIsLoading(true);


      if (!savedEmploymentId) {
        throw new Error("Employment record must be saved first");
      }

      // Prepare contract data with file uploads
      const contractData = {
        ...data,
        files: {
          renewal_report: data.renewal_report?.[0] || null,
        }
      };

      let result;
      if (isEditMode) {
        result = await employmentService.updateContract(savedEmploymentId, contractData);

      } else {
        result = await employmentService.createContract(savedEmploymentId, contractData);

      }

      if (onSuccess) onSuccess(result, "contract");
      return result;
    } catch (error) {
      console.error("❌ Error submitting contract:", error);
      if (onError) onError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [savedEmploymentId, isEditMode, onSuccess, onError]);

  // Validate salary
  const validateSalary = useCallback(async (designationId, salary) => {
    try {
      return await employmentService.validateSalary(designationId, salary);
    } catch (error) {
      console.error("❌ Error validating salary:", error);
      return { valid: false, message: "Validation failed" };
    }
  }, []);

  // Reset all forms
  const resetForms = useCallback(() => {
    employmentForm.reset();
    salaryForm.reset();
    locationForm.reset();
    contractForm.reset();
    setCompletedTabs({
      employment: false,
      salary: false,
      location: false,
      contract: false,
    });
    setSavedEmploymentId(null);
    setIsContractual(false);
  }, [employmentForm, salaryForm, locationForm, contractForm]);

  // Load data into forms (for edit mode)
  const loadDataIntoForms = useCallback((data) => {
    if (!data) return;
    
    console.log("🔍 useEmploymentForm: Loading data into forms:", {
      hasEmployment: !!data.employment,
      hasSalary: !!data.salary,
      hasLocation: !!data.location,
      hasContract: !!data.contract,
      allData: data
    });
    
    // Set values for each form using the structured data
    if (data.employment) {
      console.log("🔍 useEmploymentForm: Setting employment form values:", data.employment);
      Object.entries(data.employment).forEach(([key, value]) => {
        // Ensure that undefined values are handled correctly
        const finalValue = value !== undefined ? value : null;
        console.log(`🔍 useEmploymentForm: Setting ${key} = ${finalValue}`);
        employmentForm.setValue(key, finalValue);
      });
    }
    
    if (data.salary) {
      Object.entries(data.salary).forEach(([key, value]) => {
        salaryForm.setValue(key, value !== undefined ? value : null);
      });
    }
    
    if (data.location) {
      Object.entries(data.location).forEach(([key, value]) => {
        locationForm.setValue(key, value !== undefined ? value : null);
      });
    }
    
    if (data.contract) {
      Object.entries(data.contract).forEach(([key, value]) => {
        contractForm.setValue(key, value !== undefined ? value : null);
      });
    }
    
    // Set employment ID for edit mode
    if (data.id) {
      setSavedEmploymentId(data.id);
    }
    
    // Mark completed tabs based on available data
    const newCompletedTabs = {
      employment: !!(data.employment && Object.keys(data.employment).length > 0),
      salary: !!(data.salary && Object.keys(data.salary).length > 0),
      location: !!(data.location && Object.keys(data.location).length > 0),
      contract: !!(data.contract && Object.keys(data.contract).length > 0),
    };
    setCompletedTabs(newCompletedTabs);
    
    // Set contractual status based on employment type
    if (data.employment?.employment_type) {
      setIsContractual(data.employment.employment_type === 'Contract');
    }
    
    console.log("✅ useEmploymentForm: Data loaded into forms successfully");
  }, [employmentForm, salaryForm, locationForm, contractForm, setSavedEmploymentId, setCompletedTabs, setIsContractual]);

  // Load initial data when it changes - for both create and edit modes
  useEffect(() => {
    console.log("🔍 useEmploymentForm: initialData changed:", {
      hasInitialData: !!initialData,
      initialDataType: typeof initialData,
      initialDataKeys: initialData ? Object.keys(initialData) : [],
      initialDataEmployment: initialData?.employment,
      initialDataEmploymentKeys: initialData?.employment ? Object.keys(initialData.employment) : [],
      reportingOfficerId: initialData?.employment?.reporting_officer_id
    });
    
    if (initialData) {
      loadDataIntoForms(initialData);
    }
  }, [initialData, loadDataIntoForms]);

  return {
    // Form instances
    employmentForm,
    salaryForm,
    locationForm,
    contractForm,

    // State
    isLoading,
    formOptions,
    availableDesignations,
    isContractual,
    completedTabs,
    savedEmploymentId,

    // Methods
    submitEmployment,
    submitSalary,
    submitLocation,
    submitContract,
    validateSalary,
    resetForms,
    loadDataIntoForms,
    setCompletedTabs,
    setSavedEmploymentId,
    setIsContractual,
  };
};

export default useEmploymentForm;
