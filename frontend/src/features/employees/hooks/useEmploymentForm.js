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

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { employmentService } from "../services/employmentService";
import { locationService } from "../../settings/services/locationService";
import { useWatch } from "react-hook-form";

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
  userId = null,
  onSuccess = null,
  onError = null,
} = {}) => {
  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [formOptions, setFormOptions] = useState(null);
  const [availableDesignations, setAvailableDesignations] = useState([]);
  const [bazaarOptions] = useState([]); // Keep bazaarOptions for API, but don't assign setBazaarOptions
  const [isContractual, setIsContractual] = useState(false);
  const [completedTabs, setCompletedTabs] = useState({
    employment: false,
    salary: false,
    location: false,
    contract: false,
  });
  const [savedEmploymentId, setSavedEmploymentId] = useState(null);
  const [allLocations, setAllLocations] = useState([]); // NEW

  // Ref to prevent recursive calls to loadDataIntoForms
  const isLoadingDataRef = useRef(false);

  // Form instances
  const employmentForm = useForm({
    defaultValues: {
      organization: "",
      department: "",
      designation: "",
      employment_type: "Regular",
      joining_date: "",
      effective_from: "",
      effective_till: "",
      appointment_letter_issue_date: "",
      role_tag: "",
      reporting_officer_id: "",
      office_location: "",
      remarks: "",
      scale_grade: "",
      employment_status: "active",
      is_current: false,
      filer_status: "non_filer",
      filer_active_status: "",
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
      location_id: "", // single selection only
      _location_type_filter: "ALL", // virtual filter state
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

  // Watch current organization at the top level
  const currentOrganization = employmentForm.watch("organization");

  // Load form options on mount
  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        setIsLoading(true);
        const options = await employmentService.getFormOptions();
        setFormOptions(options);
        // Load ALL locations (not just bazaars)
        try {
          const locationsResp = await locationService.getAllLocations();
          // API returns { success, locations } – normalize
          const locs = Array.isArray(locationsResp.locations)
            ? locationsResp.locations
            : Array.isArray(locationsResp)
            ? locationsResp
            : [];
          setAllLocations(locs);
        } catch (error) {
          console.error("❌ Error loading locations:", error);
          setAllLocations([]);
        }
      } catch (error) {
        console.error("❌ Error loading form options:", error);
        if (onError) onError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFormOptions();
  }, [onError]);

  // --- Designations Loader (by Department, for orgs that use structured designations) ---
  // Watch department (and org) to update designation dropdown; also on initialData in edit mode
  const watchedDepartment = useWatch({
    control: employmentForm.control,
    name: "department",
  });

  useEffect(() => {
    async function updateDesignationsForDepartment() {
      // Only need the designations list to be loaded; departments may be empty.
      if (!formOptions) return;
      const allDesignations = formOptions.designations || [];
      const isMBWO = currentOrganization === "MBWO";
      const isPMBMC = currentOrganization === "PMBMC";

      if (isMBWO) {
        // For MBWO, show all designations (handled separately)
        setAvailableDesignations(allDesignations);
        return;
      }

      if (isPMBMC) {
        // For PMBMC, department and designation are free-text; skip fetching
        if (availableDesignations.length !== 0) setAvailableDesignations([]);
        return;
      }

      const departmentId = watchedDepartment || null;
      const isNumericId =
        typeof departmentId === "number" ||
        (!!departmentId && /^\d+$/.test(String(departmentId)));

      if (isNumericId) {
        // Department selected: show ONLY that department's designations
        setIsLoading(true);
        try {
          const designations =
            await employmentService.getDesignationsByDepartment(departmentId);
          setAvailableDesignations(designations || []);
        } catch {
          setAvailableDesignations([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // No department selected: show only department-less (field) designations,
        // e.g. "Security & Parking Attendant", "Sanitation Attendant".
        setAvailableDesignations(allDesignations.filter((d) => !d.department_id));
      }
    }
    updateDesignationsForDepartment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOptions, currentOrganization, watchedDepartment]);

  // Watch employment type to determine if contractual
  useEffect(() => {
    const subscription = employmentForm.watch((value, { name }) => {
      if (name === "employment_type") {
        const isContractualType =
          value.employment_type === "Contract" ||
          value.employment_type === "Daily Wager";
        setIsContractual(isContractualType);
        // Employment type changed - logging removed to prevent infinite loops
      }
    });

    return () => subscription.unsubscribe();
  }, [employmentForm]);

  // Handle is_current based on organization (default false; force false for MBWO/PMBMC)
  useEffect(() => {
    // Prevent running during data loading to avoid conflicts
    if (isLoadingDataRef.current) {
      return;
    }

    if (currentOrganization) {
      const currentIsCurrentValue = employmentForm.getValues("is_current");
      if (currentOrganization === "MBWO" || currentOrganization === "PMBMC") {
        if (currentIsCurrentValue !== false) {
          employmentForm.setValue("is_current", false, {
            shouldValidate: false,
            shouldDirty: true,
          });
        }
      } else {
        // PSBA or others: keep whatever the user sets; default is false
      }
    }
  }, [currentOrganization, employmentForm]);

  // Submit employment data
  const submitEmployment = useCallback(
    async (data) => {
      try {
        setIsLoading(true);
        // Submitting employment data

        // Prepare employment data with user ID
        const employmentData = {
          employee_id: userId,
          ...data,
          // No employment-level document uploads (moved to employee module)
        };

        let result;
        if (isEditMode && savedEmploymentId) {
          result = await employmentService.updateEmployment(
            savedEmploymentId,
            employmentData
          );
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
    },
    [userId, isEditMode, savedEmploymentId, onSuccess, onError]
  );

  // Submit salary data
  const submitSalary = useCallback(
    async (data) => {
      try {
        setIsLoading(true);

        if (!savedEmploymentId) {
          throw new Error("Employment record must be saved first");
        }

        let result;
        if (isEditMode) {
          result = await employmentService.updateSalary(
            savedEmploymentId,
            data
          );
        } else {
          result = await employmentService.createSalary(
            savedEmploymentId,
            data
          );
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
    },
    [savedEmploymentId, isEditMode, onSuccess, onError]
  );

  // Submit location data
  const submitLocation = useCallback(
    async (data) => {
      try {
        setIsLoading(true);
        if (!savedEmploymentId) {
          throw new Error("Employment record must be saved first");
        }
        const payload = {
          location_id: data.location_id ? Number(data.location_id) : null,
        }; // removed full_address
        let result;
        if (isEditMode) {
          result = await employmentService.updateLocation(
            savedEmploymentId,
            payload
          );
        } else {
          result = await employmentService.createLocation(
            savedEmploymentId,
            payload
          );
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
    },
    [savedEmploymentId, isEditMode, onSuccess, onError]
  );

  // Submit contract data
  const submitContract = useCallback(
    async (data) => {
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
          },
        };

        let result;
        if (isEditMode) {
          result = await employmentService.updateContract(
            savedEmploymentId,
            contractData
          );
        } else {
          result = await employmentService.createContract(
            savedEmploymentId,
            contractData
          );
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
    },
    [savedEmploymentId, isEditMode, onSuccess, onError]
  );

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

  // Load data into forms - used for both initial data and edit mode data
  const loadDataIntoForms = useCallback(
    (data) => {
      // Prevent recursive calls
      if (isLoadingDataRef.current) {
        console.log(
          "🔍 useEmploymentForm: loadDataIntoForms called recursively, skipping to prevent infinite loop"
        );
        return;
      }

      isLoadingDataRef.current = true;
      console.log("🔍 useEmploymentForm: Starting to load data into forms:", {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        isEditMode,
      });

      try {
        // Reset forms first
        employmentForm.reset();
        salaryForm.reset();
        locationForm.reset();
        contractForm.reset();

        // Set values for each form using the structured data
        if (data.employment) {
          console.log(
            "🔍 useEmploymentForm: Setting employment form values:",
            data.employment
          );
          Object.entries(data.employment).forEach(([key, value]) => {
            // Ensure that undefined values are handled correctly
            const finalValue = value !== undefined ? value : null;
            console.log(`🔍 useEmploymentForm: Setting ${key} = ${finalValue}`);
            employmentForm.setValue(key, finalValue, {
              shouldValidate: false,
              shouldDirty: true,
            });
          });
        }

        if (data.salary) {
          Object.entries(data.salary).forEach(([key, value]) => {
            salaryForm.setValue(key, value !== undefined ? value : null, {
              shouldValidate: false,
              shouldDirty: true,
            });
          });
        }

        if (data.location) {
          Object.entries(data.location).forEach(([key, value]) => {
            if (key === "full_address") return; // skip removed field
            locationForm.setValue(key, value !== undefined ? value : null, {
              shouldValidate: false,
              shouldDirty: true,
            });
          });
        }

        if (data.contract) {
          Object.entries(data.contract).forEach(([key, value]) => {
            contractForm.setValue(key, value !== undefined ? value : null, {
              shouldValidate: false,
              shouldDirty: true,
            });
          });
        }

        // Set employment ID for edit mode
        if (data.id) {
          setSavedEmploymentId(data.id);
        }

        // Mark completed tabs based on available data
        const newCompletedTabs = {
          employment: !!(
            data.employment && Object.keys(data.employment).length > 0
          ),
          salary: !!(data.salary && Object.keys(data.salary).length > 0),
          location: !!(
            data.location &&
            Object.keys(data.location).some((k) => k !== "full_address")
          ), // ignore removed field
          contract: !!(data.contract && Object.keys(data.contract).length > 0),
        };
        setCompletedTabs(newCompletedTabs);

        // Set contractual status based on employment type
        if (data.employment?.employment_type) {
          setIsContractual(data.employment.employment_type === "Contract");
        }

        console.log(
          "✅ useEmploymentForm: Data loaded into forms successfully"
        );
      } catch (error) {
        console.error(
          "❌ useEmploymentForm: Error loading data into forms:",
          error
        );
      } finally {
        // Reset the flag after a short delay to allow any immediate setValue calls to complete
        setTimeout(() => {
          isLoadingDataRef.current = false;
        }, 100);
      }
    },
    [
      employmentForm,
      salaryForm,
      locationForm,
      contractForm,
      setSavedEmploymentId,
      setCompletedTabs,
      setIsContractual,
      isEditMode,
    ]
  );

  // Load initial data when it changes - for both create and edit modes
  useEffect(() => {
    // Prevent infinite loops when data is loaded programmatically in edit mode
    if (isEditMode && initialData && Object.keys(initialData).length > 0) {
      console.log(
        "🔍 useEmploymentForm: Skipping initialData useEffect in edit mode to prevent infinite loops"
      );
      return;
    }

    console.log("🔍 useEmploymentForm: initialData changed:", {
      hasInitialData: !!initialData,
      initialDataType: typeof initialData,
      initialDataKeys: initialData ? Object.keys(initialData) : [],
      initialDataEmployment: initialData?.employment,
      initialDataEmploymentKeys: initialData?.employment
        ? Object.keys(initialData.employment)
        : [],
      reportingOfficerId: initialData?.employment?.reporting_officer_id,
    });

    if (initialData) {
      loadDataIntoForms(initialData);
    }
  }, [initialData, loadDataIntoForms, isEditMode]);

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
    bazaarOptions,
    isContractual,
    completedTabs,
    savedEmploymentId,
    allLocations, // NEW expose to consumer

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
