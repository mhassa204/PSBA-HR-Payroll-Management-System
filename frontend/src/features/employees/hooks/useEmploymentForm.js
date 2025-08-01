/**
 * Custom Hook for Employment Form Management
 *
 * This hook encapsulates all employment form logic including
 * form state, validation, submission, and data persistence.
 * It provides a clean interface for components to manage employment data.
 *
 * @author PSBA HR Portal Team
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import employmentService from "../services/employmentService";

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
      // Probation fields
      is_on_probation: false,
      probation_end_date: "",
      ...initialData?.employment,
    },
  });

  const salaryForm = useForm({
    defaultValues: {
      basic_salary: 0,
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
      ...initialData?.salary,
    },
  });

  const locationForm = useForm({
    defaultValues: {
      district: "",
      city: "",
      bazaar_name: "",
      type: "HEAD_OFFICE",
      full_address: "",
      ...initialData?.location,
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
      ...initialData?.contract,
    },
  });

  // Load form options
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    let hasLoaded = false; // Prevent multiple loads

    const loadFormOptions = async () => {
      // Prevent multiple simultaneous loads
      if (hasLoaded || !isMounted) {
        return;
      }

      hasLoaded = true;

      try {
        if (isMounted) {
          setIsLoading(true);
        }

        console.log("🔍 Loading form options...");
        const options = await employmentService.getFormOptions();
        console.log("✅ Form options loaded successfully");

        if (isMounted) {
          setFormOptions(options);
        }
      } catch (error) {
        console.error("Error loading form options:", error);

        // Only call onError if component is still mounted and onError exists
        if (isMounted && typeof onError === "function") {
          onError(error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFormOptions();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array to run only once

  // Load all designations (no department-based filtering)
  useEffect(() => {
    const loadAllDesignations = async () => {
      if (formOptions) {
        try {
          // Use all designations from formOptions instead of filtering by department
          const allDesignations = formOptions.designations || [];
          console.log("🔍 useEmploymentForm: Loading all designations:", allDesignations);
          setAvailableDesignations(allDesignations);
        } catch (error) {
          console.error("Error loading designations:", error);
          setAvailableDesignations([]);
        }
      }
    };

    loadAllDesignations();
  }, [formOptions]); // Only depend on formOptions, not department

  // Watch for employment type changes
  const watchedEmploymentType = employmentForm.watch("employment_type");
  useEffect(() => {
    setIsContractual(watchedEmploymentType === "Contract");
  }, [watchedEmploymentType]);

  // Initialize form data for edit mode or creating from existing
  useEffect(() => {
    if ((isEditMode || isCreatingFromExisting) && initialData) {
      console.log("🔄 useEmploymentForm: Initializing forms with data:", initialData);

      // Reset forms with initial data
      if (initialData.employment) {
        console.log("📝 Resetting employment form with:", initialData.employment);
        employmentForm.reset(initialData.employment);
        setCompletedTabs((prev) => ({ ...prev, employment: true }));
      }
      if (initialData.salary) {
        console.log("💰 Resetting salary form with:", initialData.salary);
        salaryForm.reset(initialData.salary);
        setCompletedTabs((prev) => ({ ...prev, salary: true }));
      }
      if (initialData.location) {
        console.log("📍 Resetting location form with:", initialData.location);
        locationForm.reset(initialData.location);
        setCompletedTabs((prev) => ({ ...prev, location: true }));
      }
      if (initialData.contract) {
        console.log("📄 Resetting contract form with:", initialData.contract);
        contractForm.reset(initialData.contract);
        setCompletedTabs((prev) => ({ ...prev, contract: true }));
      }

      // Only set saved employment ID for actual edit mode, not for creating from existing
      if (isEditMode) {
        setSavedEmploymentId(initialData.id);
      }

      setIsContractual(initialData.employment?.employment_type === "Contract");
    }
  }, [isEditMode, isCreatingFromExisting, initialData]); // Add dependencies to trigger when data changes

  // Submit employment data
  const submitEmployment = useCallback(
    async (data) => {
      try {
        setIsLoading(true);
        const employmentData = { ...data, user_id: userId };

        let result;
        if (isEditMode && savedEmploymentId) {
          result = await employmentService.updateEmployment(
            savedEmploymentId,
            employmentData
          );
        } else {
          result = await employmentService.createEmployment(employmentData);
          setSavedEmploymentId(result.id);
        }

        setCompletedTabs((prev) => ({ ...prev, employment: true }));
        if (onSuccess) onSuccess(result, "employment");
        return result;
      } catch (error) {
        console.error("Error submitting employment:", error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, isEditMode, savedEmploymentId, onSuccess, onError]
  );

  // Submit salary data
  const submitSalary = useCallback(
    async (data) => {
      try {
        setIsLoading(true);
        const salaryData = { ...data, employment_id: savedEmploymentId };

        let result;
        if (isEditMode && initialData?.salary?.id) {
          result = await employmentService.updateSalary(
            initialData.salary.id,
            salaryData
          );
        } else {
          result = await employmentService.createSalary(salaryData);
        }

        setCompletedTabs((prev) => ({ ...prev, salary: true }));
        if (onSuccess) onSuccess(result, "salary");
        return result;
      } catch (error) {
        console.error("Error submitting salary:", error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [savedEmploymentId, isEditMode, initialData, onSuccess, onError]
  );

  // Submit location data
  const submitLocation = useCallback(
    async (data) => {
      try {
        setIsLoading(true);
        const locationData = { ...data, employment_id: savedEmploymentId };

        let result;
        if (isEditMode && initialData?.location?.id) {
          result = await employmentService.updateLocation(
            initialData.location.id,
            locationData
          );
        } else {
          result = await employmentService.createLocation(locationData);
        }

        setCompletedTabs((prev) => ({ ...prev, location: true }));
        if (onSuccess) onSuccess(result, "location");
        return result;
      } catch (error) {
        console.error("Error submitting location:", error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [savedEmploymentId, isEditMode, initialData, onSuccess, onError]
  );

  // Submit contract data
  const submitContract = useCallback(
    async (data) => {
      try {
        setIsLoading(true);
        const contractData = { ...data, employment_id: savedEmploymentId };

        let result;
        if (isEditMode && initialData?.contract?.id) {
          result = await employmentService.updateContract(
            initialData.contract.id,
            contractData
          );
        } else {
          result = await employmentService.createContract(contractData);
        }

        setCompletedTabs((prev) => ({ ...prev, contract: true }));
        if (onSuccess) onSuccess(result, "contract");
        return result;
      } catch (error) {
        console.error("Error submitting contract:", error);
        if (onError) onError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [savedEmploymentId, isEditMode, initialData, onSuccess, onError]
  );

  // Validate salary
  const validateSalary = useCallback(async (designationId, salary) => {
    try {
      return await employmentService.validateSalary(designationId, salary);
    } catch (error) {
      console.error("Error validating salary:", error);
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

    // Setters
    setCompletedTabs,
    setSavedEmploymentId,
    setIsContractual,
  };
};

export default useEmploymentForm;
