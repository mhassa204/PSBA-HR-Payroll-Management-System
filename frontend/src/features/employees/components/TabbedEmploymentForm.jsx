import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import EnhancedModal from "../../../components/ui/EnhancedModal";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import FormField from "./ui/FormField";
import FormSection from "./ui/FormSection";
import ActionButton from "./ui/ActionButton";
import useEmploymentForm from "../hooks/useEmploymentForm";
import { useOrganizationFields } from "../hooks/useOrganizationFields";
import { ORGANIZATION_OPTIONS } from "../../../constants/organizationFieldConfig";
import { forceRestoreScroll } from "../../../utils/scrollUtils";

/**
 * Refactored Tabbed Employment Form Component
 *
 * A comprehensive employment form with tabbed interface for managing
 * employment, salary, location, and contract information.
 * Uses the new service layer and reusable components.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {function} props.onClose - Close handler
 * @param {function} props.onSubmit - Submit handler
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.employeeName - Employee name
 * @param {string} props.userId - User ID
 * @param {Object} props.editingRecord - Record being edited
 * @param {boolean} props.isEditMode - Whether in edit mode
 */
const TabbedEmploymentForm = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading: externalLoading = false,
  employeeName = "",
  userId = null,
  editingRecord = null,
  isEditMode = false,
  isCreatingFromExisting = false,
}) => {
  // UI state
  const [activeTab, setActiveTab] = useState("employment");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [confirmType, setConfirmType] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Scroll position preservation
  const modalContentRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Transform editingRecord to the expected structure for the hook
  const transformedInitialData = useMemo(() => {
    if (!editingRecord || (!isEditMode && !isCreatingFromExisting)) return null;

    console.log("🔍 TabbedEmploymentForm: Raw editingRecord:", editingRecord);

    // Check if editingRecord is already in nested format (from EmploymentRecordActions)
    // or flat format (from other sources)
    const isNestedFormat = editingRecord.employment || editingRecord.salary || editingRecord.location || editingRecord.contract;

    let transformed;

    if (isNestedFormat) {
      // Data is already in nested format, use it directly
      transformed = {
        id: editingRecord.id,
        employment: editingRecord.employment || {},
        salary: editingRecord.salary || {},
        location: editingRecord.location || {},
        contract: editingRecord.contract || {},
      };
    } else {
      // Transform flat employment record to structured format
      transformed = {
        id: editingRecord.id,
        employment: {
          organization: editingRecord.organization || "",
          department: editingRecord.department || "",
          designation: editingRecord.designation || "",
          employment_type: editingRecord.employment_type || "Regular",
          role_tag: editingRecord.role_tag || "",
          effective_from: editingRecord.effective_from || "",
          effective_till: editingRecord.effective_till || "",
          reporting_officer_id: editingRecord.reporting_officer_id || "",
          remarks: editingRecord.remarks || "",
          // Probation fields
          is_on_probation: editingRecord.is_on_probation || false,
          probation_end_date: editingRecord.probation_end_date || "",
        },
        // Include salary data if available
        salary: editingRecord.salary ? {
          basic_salary: editingRecord.salary,
          // Add other salary fields if they exist in the record
        } : {},
        // Add location and contract data if available
        location: {},
        contract: {},
      };
    }

    console.log("🔄 TabbedEmploymentForm: Transformed initialData:", transformed);
    return transformed;
  }, [editingRecord, isEditMode, isCreatingFromExisting]);

  // Employment form hook
  const {
    employmentForm,
    salaryForm,
    locationForm,
    contractForm,
    isLoading: formLoading,
    formOptions,
    availableDesignations,
    isContractual,
    completedTabs,
    savedEmploymentId,
    submitEmployment,
    submitSalary,
    submitLocation,
    submitContract,
    validateSalary,
    resetForms,
    setCompletedTabs,
    setSavedEmploymentId,
    setIsContractual,
  } = useEmploymentForm({
    initialData: transformedInitialData,
    isEditMode,
    isCreatingFromExisting,
    userId,
    onSuccess: useCallback((result, type) => {
      setSuccessMessage(
        `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } details saved successfully!`
      );
      setShowSuccessModal(true);
    }, []),
    onError: useCallback((error) => {
      console.error("Employment form error:", error);
    }, []),
  });

  // Combined loading state
  const isLoading = externalLoading || formLoading;

  // Get current organization from employment form
  const currentOrganization = employmentForm.watch("organization");

  // Organization-based field visibility hook
  const {
    isFieldVisible,
    isSectionVisible,
    getFieldClasses,
    getSectionClasses,
    getValidationRules,
    filterFormDataForSubmission,
    hasFieldRestrictions,
    organizationDisplayName
  } = useOrganizationFields(currentOrganization);

  // Debug: Log organization changes and field visibility
  useEffect(() => {
    if (currentOrganization) {
      console.log(`🏢 TabbedEmploymentForm: Organization changed to ${currentOrganization}`);
      console.log(`📋 TabbedEmploymentForm: Location section visible: ${isSectionVisible('location')}`);
      console.log(`💰 TabbedEmploymentForm: Salary allowances visible: ${isFieldVisible('salary', 'medical_allowance')}`);
      console.log(`👔 TabbedEmploymentForm: Department field visible: ${isFieldVisible('employment', 'department')}`);
      console.log(`🎯 TabbedEmploymentForm: Designation field visible: ${isFieldVisible('employment', 'designation')}`);
      console.log(`📝 TabbedEmploymentForm: Available designations count: ${availableDesignations?.length || 0}`);
    }
  }, [currentOrganization, isSectionVisible, isFieldVisible, availableDesignations]);

  // Restore scroll position after form updates
  useEffect(() => {
    if (modalContentRef.current && scrollPosition > 0) {
      modalContentRef.current.scrollTop = scrollPosition;
    }
  }, [completedTabs, activeTab]);

  // Auto-scroll to top when switching tabs
  useEffect(() => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Cleanup effect to ensure all modals are closed and scroll is restored on unmount
  useEffect(() => {
    return () => {
      // Force close all modals and restore scroll when component unmounts
      setShowConfirmModal(false);
      setShowSuccessModal(false);
      setShowPreviewModal(false);
      forceRestoreScroll();
    };
  }, []);

  // Tab configuration with conditional location tab
  const tabsConfig = [
    {
      id: "employment",
      label: "Employment Details",
      icon: "fas fa-briefcase",
      color: "blue",
      required: true,
      completed: completedTabs.employment,
    },
    {
      id: "salary",
      label: "Salary Information",
      icon: "fas fa-money-bill-wave",
      color: "green",
      required: false,
      completed: completedTabs.salary,
    },
    // Conditionally include location tab (hidden for PMBMC)
    ...(isSectionVisible('location') ? [{
      id: "location",
      label: "Location Details",
      icon: "fas fa-map-marker-alt",
      color: "purple",
      required: false,
      completed: completedTabs.location,
    }] : []),
    ...(isContractual
      ? [
          {
            id: "contract",
            label: "Contract Details",
            icon: "fas fa-file-contract",
            color: "orange",
            required: false,
            completed: completedTabs.contract,
          },
        ]
      : []),
  ];

  // Extract form methods from the hook-provided forms
  const {
    register: registerEmployment,
    handleSubmit: handleEmploymentSubmit,
    watch: watchEmployment,
    formState: { errors: employmentErrors },
  } = employmentForm;

  // Watch filer status to conditionally show filer active status
  const watchedFilerStatus = watchEmployment("filer_status");

  const {
    register: registerSalary,
    handleSubmit: handleSalarySubmit,
    watch: watchSalary,
    formState: { errors: salaryErrors },
  } = salaryForm;

  const {
    register: registerLocation,
    handleSubmit: handleLocationSubmit,
    watch: watchLocation,
    formState: { errors: locationErrors },
  } = locationForm;

  const {
    register: registerContract,
    handleSubmit: handleContractSubmit,
    watch: watchContract,
    formState: { errors: contractErrors },
  } = contractForm;

  // Watch form values
  const watchedDepartment = watchEmployment("department");
  const watchedEmploymentType = watchEmployment("employment_type");

  // Reset forms when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if ((isEditMode || isCreatingFromExisting) && editingRecord) {
        console.log("🔄 TabbedEmploymentForm: Resetting forms with editingRecord:", editingRecord);

        // Check if data is in nested format
        const isNestedFormat = editingRecord.employment || editingRecord.salary || editingRecord.location || editingRecord.contract;

        if (isNestedFormat) {
          // Data is already structured, use it directly
          if (editingRecord.employment) {
            console.log("📝 Resetting employment form with nested data:", editingRecord.employment);
            employmentForm.reset(editingRecord.employment);
          }
        } else {
          // Data is flat, populate forms with flat structure
          console.log("📝 Resetting employment form with flat data");
          employmentForm.reset({
            organization: editingRecord.organization || "",
            department: editingRecord.department || "",
            designation: editingRecord.designation || "",
            employment_type: editingRecord.employment_type || "Regular",
            reporting_officer_id: editingRecord.reporting_officer_id || "",
            role_tag: editingRecord.role_tag || "",
            effective_from: editingRecord.effective_from || "",
            effective_till: editingRecord.effective_till || "",
            scale_grade: editingRecord.scale_grade || "",
            medical_fitness_report_pdf: editingRecord.medical_fitness_report_pdf || null,
            police_character_certificate: editingRecord.police_character_certificate || null,
            filer_status: editingRecord.filer_status || "non_filer",
            filer_active_status: editingRecord.filer_active_status || "",
            employment_status: editingRecord.employment_status || "active",
            is_current: editingRecord.is_current || false,
            remarks: editingRecord.remarks || "",
            // Probation fields
            is_on_probation: editingRecord.is_on_probation || false,
            probation_end_date: editingRecord.probation_end_date || "",
          });
        }

        // Set saved employment ID only for actual edit mode
        if (isEditMode) {
          setSavedEmploymentId(editingRecord.id);
        }

        // Mark tabs as completed since we have data
        setCompletedTabs({
          employment: true,
          salary: !!(editingRecord.salary || editingRecord.basic_salary),
          location: !!(editingRecord.location || editingRecord.district),
          contract: !!(editingRecord.contract || editingRecord.contract_type),
        });

        // Contractual status is managed by the hook
      } else {
        // Reset for new record
        employmentForm.reset();
        salaryForm.reset();
        locationForm.reset();
        contractForm.reset();
        setSavedEmploymentId(null);
        setCompletedTabs({
          employment: false,
          salary: false,
          location: false,
          contract: false,
        });
        // Contractual status is managed by the hook
      }
      setActiveTab("employment");
    }
  }, [isOpen, isEditMode, isCreatingFromExisting, editingRecord]);

  // Note: availableDesignations and isContractual are managed by the useEmploymentForm hook

  // Utility function to safely parse numbers
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === "" || value === null || value === undefined)
      return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Show confirmation modal before submitting
  const showConfirmation = (data, type) => {
    setConfirmData(data);
    setConfirmType(type);
    setShowConfirmModal(true);
  };

  // Handle confirmed submission
  const handleConfirmedSubmit = async () => {
    try {
      setShowConfirmModal(false);

      let result;

      if (confirmType === "employment") {
        if (isEditMode && editingRecord) {
          // Update existing employment record
          result = await updateEmploymentRecord(editingRecord.id, {
            ...confirmData,
            effective_till: confirmData.effective_till || null,
            reporting_officer_id: confirmData.reporting_officer_id || null,
          });
          setSuccessMessage("Employment details updated successfully!");
        } else {
          // Create new employment record
          result = await createEmploymentRecord({
            user_id: userId,
            ...confirmData,
            effective_till: confirmData.effective_till || null,
            reporting_officer_id: confirmData.reporting_officer_id || null,
          });
          setSavedEmploymentId(result.id);
          setSuccessMessage(
            "Employment details saved successfully! You can now add salary information in the Salary tab."
          );
        }
        setCompletedTabs((prev) => ({ ...prev, employment: true }));
      } else if (confirmType === "salary") {
        if (!savedEmploymentId) {
          throw new Error("Employment record must be saved first");
        }
        result = await createSalaryRecord({
          employment_id: savedEmploymentId,
          basic_salary: safeParseFloat(confirmData.basic_salary),
          medical_allowance: safeParseFloat(confirmData.medical_allowance),
          house_rent: safeParseFloat(confirmData.house_rent),
          conveyance_allowance: safeParseFloat(
            confirmData.conveyance_allowance
          ),
          other_allowances: safeParseFloat(confirmData.other_allowances),
          daily_wage_rate: confirmData.daily_wage_rate
            ? safeParseFloat(confirmData.daily_wage_rate)
            : null,
          bonus_eligible: Boolean(confirmData.bonus_eligible),
          bank_account_primary: confirmData.bank_account_primary || "",
          bank_name_primary: confirmData.bank_name_primary || "",
          bank_account_secondary: confirmData.bank_account_secondary || "",
          bank_name_secondary: confirmData.bank_name_secondary || "",
          payment_mode: confirmData.payment_mode || "Bank Transfer",
          payroll_status: confirmData.payroll_status || "Active",
        });
        setCompletedTabs((prev) => ({ ...prev, salary: true }));
        setSuccessMessage(
          "Salary information saved successfully! You can now add location details in the Location tab."
        );
      } else if (confirmType === "location") {
        if (!savedEmploymentId) {
          throw new Error("Employment record must be saved first");
        }
        result = await createLocationRecord({
          employment_id: savedEmploymentId,
          district: confirmData.district || "",
          city: confirmData.city || "",
          bazaar_name: confirmData.bazaar_name || "",
          type: confirmData.type || "HEAD_OFFICE",
          full_address: confirmData.full_address || "",
        });
        setCompletedTabs((prev) => ({ ...prev, location: true }));
        setSuccessMessage(
          isContractual
            ? "Location details saved successfully! You can now add contract information in the Contract tab."
            : "Location details saved successfully! Employment record is now complete."
        );
      } else if (confirmType === "contract") {
        if (!savedEmploymentId) {
          throw new Error("Employment record must be saved first");
        }
        result = await createContractRecord({
          employment_id: savedEmploymentId,
          contract_type: confirmData.contract_type || "Contractual",
          contract_number: confirmData.contract_number || "",
          start_date: confirmData.start_date || "",
          end_date: confirmData.end_date || "",
          probation_start: confirmData.probation_start || "",
          probation_end: confirmData.probation_end || "",
          confirmation_date: confirmData.confirmation_date || null,
          confirmation_status: confirmData.confirmation_status || "In Progress",
          performance_rating: confirmData.performance_rating || "",
          renewal_notes: confirmData.renewal_notes || "",
        });
        setCompletedTabs((prev) => ({ ...prev, contract: true }));
        setSuccessMessage(
          "Contract information saved successfully! Employment record is now complete."
        );
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error(`Error saving ${confirmType} data:`, error);
      alert(`Error saving ${confirmType} data: ${error.message}`);
    }
  };

  // Handle employment form submission - progress to next tab
  const onEmploymentSubmit = async (data) => {
    try {
      console.log("📝 TabbedEmploymentForm: Employment form submitted with data:", data);

      // Validate required fields before proceeding, respecting organization-specific visibility
      if (!data.organization?.trim()) {
        alert("Please select an organization");
        return;
      }

      // Only validate fields that are visible for the current organization
      if (isFieldVisible('employment', 'department') && !data.department?.trim()) {
        alert("Please select a department");
        return;
      }

      if (isFieldVisible('employment', 'designation') && !data.designation?.trim()) {
        alert("Please select a designation");
        return;
      }

      if (isFieldVisible('employment', 'role_tag') && !data.role_tag?.trim()) {
        alert("Please select a role tag");
        return;
      }

      if (isFieldVisible('employment', 'effective_from') && !data.effective_from) {
        alert("Please select an effective from date");
        return;
      }

      if (isFieldVisible('employment', 'reporting_officer_id') && !data.reporting_officer_id?.trim()) {
        alert("Please select a reporting officer");
        return;
      }

      console.log("✅ TabbedEmploymentForm: Employment tab completed, moving to salary tab");

      // Mark employment tab as completed
      setCompletedTabs(prev => ({ ...prev, employment: true }));

      // Automatically move to salary tab
      setActiveTab("salary");

    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in employment form:", error);
      alert(`Error in employment form: ${error.message}`);
    }
  };

  const onSalarySubmit = async (data) => {
    try {
      console.log("📝 TabbedEmploymentForm: Salary form submitted with data:", data);

      // Basic validation for salary
      if (!data.basic_salary || data.basic_salary <= 0) {
        alert("Please enter a valid basic salary");
        return;
      }

      console.log("✅ TabbedEmploymentForm: Salary tab completed");

      // Mark salary tab as completed
      setCompletedTabs(prev => ({ ...prev, salary: true }));

      // Determine next tab based on organization
      if (!isSectionVisible('location')) {
        console.log("📋 TabbedEmploymentForm: Location section hidden for this organization, checking for contract tab");
        if (isContractual) {
          console.log("📋 TabbedEmploymentForm: Moving to contract tab (contractual employee)");
          setActiveTab("contract");
        } else {
          console.log("✅ TabbedEmploymentForm: Employment record complete (no location or contract needed)");
          // Could trigger completion here if needed
        }
      } else {
        console.log("📋 TabbedEmploymentForm: Moving to location tab");
        setActiveTab("location");
      }

    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in salary form:", error);
      alert(`Error in salary form: ${error.message}`);
    }
  };

  const onLocationSubmit = async (data) => {
    try {
      console.log("📝 TabbedEmploymentForm: Location form submitted with data:", data);

      // Validate location fields based on organization-specific visibility
      if (isFieldVisible('location', 'district') && !data.district?.trim()) {
        alert("Please select a district");
        return;
      }

      if (isFieldVisible('location', 'city') && !data.city?.trim()) {
        alert("Please enter a city");
        return;
      }

      if (isFieldVisible('location', 'bazaar_name') && !data.bazaar_name?.trim()) {
        alert("Please enter a bazaar/area name");
        return;
      }

      if (isFieldVisible('location', 'type') && !data.type?.trim()) {
        alert("Please select a location type");
        return;
      }

      console.log("✅ TabbedEmploymentForm: Location tab completed");

      // Mark location tab as completed
      setCompletedTabs(prev => ({ ...prev, location: true }));

      // If contractual, move to contract tab, otherwise finish
      if (isContractual) {
        console.log("📋 TabbedEmploymentForm: Moving to contract tab (contractual employee)");
        setActiveTab("contract");
      } else {
        console.log("📋 TabbedEmploymentForm: Regular employee - finishing form");
        await handleCompleteForm();
      }

    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in location form:", error);
      alert(`Error in location form: ${error.message}`);
    }
  };

  const onContractSubmit = async (data) => {
    try {
      console.log("📝 TabbedEmploymentForm: Contract form submitted with data:", data);

      // Validate contract fields based on organization-specific visibility
      if (isFieldVisible('contract', 'contract_type') && !data.contract_type?.trim()) {
        alert("Please select a contract type");
        return;
      }

      if (isFieldVisible('contract', 'start_date') && !data.start_date) {
        alert("Please select a contract start date");
        return;
      }

      if (isFieldVisible('contract', 'end_date') && !data.end_date) {
        alert("Please select a contract end date");
        return;
      }

      console.log("✅ TabbedEmploymentForm: Contract tab completed - finishing form");

      // Mark contract tab as completed
      setCompletedTabs(prev => ({ ...prev, contract: true }));

      // Finish the form
      await handleCompleteForm();

    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in contract form:", error);
      alert(`Error in contract form: ${error.message}`);
    }
  };

  // Handle complete form - show preview before submitting
  const handleCompleteForm = async () => {
    try {
      console.log("🎯 TabbedEmploymentForm: Completing form and collecting all data");

      // Collect all form data from all tabs
      const employmentData = employmentForm.getValues();
      const salaryData = salaryForm.getValues();
      const locationData = locationForm.getValues();
      const contractData = contractForm.getValues();

      console.log("📋 TabbedEmploymentForm: Employment data:", employmentData);
      console.log("📋 TabbedEmploymentForm: Salary data:", salaryData);
      console.log("📋 TabbedEmploymentForm: Location data:", locationData);
      console.log("📋 TabbedEmploymentForm: Contract data:", contractData);

      // Create comprehensive employment record with all data
      const completeData = {
        id: savedEmploymentId || Date.now(),
        user_id: userId, // Ensure user_id is included
        // Employment data
        ...employmentData,
        // Salary data (ensure all values are numbers)
        basic_salary: safeParseFloat(salaryData.basic_salary),
        medical_allowance: safeParseFloat(salaryData.medical_allowance),
        house_rent: safeParseFloat(salaryData.house_rent),
        conveyance_allowance: safeParseFloat(salaryData.conveyance_allowance),
        other_allowances: safeParseFloat(salaryData.other_allowances),
        daily_wage_rate: safeParseFloat(salaryData.daily_wage_rate),
        bank_account_primary: salaryData.bank_account_primary || "",
        bank_name_primary: salaryData.bank_name_primary || "",
        bank_branch_code: salaryData.bank_branch_code || "",
        payment_mode: salaryData.payment_mode || "Bank Transfer",
        payroll_status: salaryData.payroll_status || "Active",
        // Location data
        district: locationData.district || "",
        city: locationData.city || "",
        bazaar_name: locationData.bazaar_name || "",
        location_type: locationData.type || "",
        full_address: locationData.full_address || "",
        // Contract data (if applicable)
        contract_type: contractData.contract_type || "",
        contract_number: contractData.contract_number || "",
        contract_start_date: contractData.start_date || "",
        contract_end_date: contractData.end_date || "",
        probation_start: contractData.probation_start || "",
        probation_end: contractData.probation_end || "",
        confirmation_status: contractData.confirmation_status || "",
      };

      console.log("📤 TabbedEmploymentForm: Showing preview modal with data:", completeData);

      // Show preview modal for confirmation
      setPreviewData(completeData);
      setShowPreviewModal(true);

    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error preparing form data:", error);
      alert(`Error preparing form data: ${error.message}`);
    }
  };

  // Handle final submission after preview confirmation
  const handleFinalSubmit = async () => {
    try {
      if (!previewData) {
        console.error("❌ TabbedEmploymentForm: No preview data available");
        return;
      }

      console.log("📤 TabbedEmploymentForm: Final submission with data:", previewData);

      // Restructure the flat data into the nested format expected by handleUpdateRecord
      const structuredData = {
        employment: {
          organization: previewData.organization || "",
          department: previewData.department || "",
          designation: previewData.designation || "",
          scale_grade: previewData.scale_grade || "",
          employment_type: previewData.employment_type || "Regular",
          role_tag: previewData.role_tag || "",
          reporting_officer_id: previewData.reporting_officer_id || "",
          effective_from: previewData.effective_from || "",
          effective_till: previewData.effective_till || null,
          medical_fitness_report_pdf: previewData.medical_fitness_report_pdf || null,
          police_character_certificate: previewData.police_character_certificate || null,
          filer_status: previewData.filer_status || "non_filer",
          filer_active_status: previewData.filer_active_status || "",
          employment_status: previewData.employment_status || "active",
          is_current: previewData.is_current || true,
          remarks: previewData.remarks || "",
          // Probation fields
          is_on_probation: previewData.is_on_probation || false,
          probation_end_date: previewData.probation_end_date || "",
        },
        salary: {
          basic_salary: previewData.basic_salary || 0,
          medical_allowance: previewData.medical_allowance || 0,
          house_rent: previewData.house_rent || 0,
          conveyance_allowance: previewData.conveyance_allowance || 0,
          other_allowances: previewData.other_allowances || 0,
          daily_wage_rate: previewData.daily_wage_rate || 0,
          bank_account_primary: previewData.bank_account_primary || "",
          bank_name_primary: previewData.bank_name_primary || "",
          bank_branch_code: previewData.bank_branch_code || "",
          payment_mode: previewData.payment_mode || "Bank Transfer",
          salary_effective_from: previewData.salary_effective_from || "",
          salary_effective_till: previewData.salary_effective_till || "",
          payroll_status: previewData.payroll_status || "Active",
        },
        location: {
          district: previewData.district || "",
          city: previewData.city || "",
          bazaar_name: previewData.bazaar_name || "",
          type: previewData.location_type || "HEAD_OFFICE",
          full_address: previewData.full_address || "",
        },
        contract: {
          contract_type: previewData.contract_type || "",
          contract_number: previewData.contract_number || "",
          start_date: previewData.contract_start_date || "",
          end_date: previewData.contract_end_date || "",
          renewal_count: previewData.renewal_count || 0,
          probation_start: previewData.probation_start || "",
          probation_end: previewData.probation_end || "",
          confirmation_status: previewData.confirmation_status || "",
          confirmation_date: previewData.confirmation_date || "",
          is_renewed: previewData.is_renewed || false,
          renewal_report: previewData.renewal_report || null,
        },
      };

      console.log("🔄 TabbedEmploymentForm: Restructured data for submission:", structuredData);

      // Close preview modal
      setShowPreviewModal(false);

      // Pass the structured data to parent for saving
      if (onSubmit) {
        // Close the main modal and pass structured data to parent
        onClose();
        onSubmit(structuredData);
      } else {
        console.error("❌ TabbedEmploymentForm: No onSubmit function provided");
      }
    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in final submission:", error);
      alert(`Error submitting employment record: ${error.message}`);
    }
  };

  // Helper function to get location type display label
  const getLocationTypeLabel = (value, organization) => {
    if (!value) return 'N/A';

    if (organization === 'PSBA') {
      switch (value) {
        case 'HEAD_QUARTER': return 'Head Quarter';
        case 'SAHULAT_BAZAAR': return 'Sahulat Bazaar';
        default: return value;
      }
    } else {
      switch (value) {
        case 'HEAD_OFFICE': return 'Head Office';
        case 'BAZAAR': return 'Bazaar';
        default: return value;
      }
    }
  };

  // Helper function to display field values with N/A fallback
  const displayValue = (value, type = 'text') => {
    if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
      return 'N/A';
    }

    if (type === 'currency') {
      return `PKR ${Number(value).toLocaleString()}`;
    }

    if (type === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return String(value);
  };

  // Handle success modal actions
  const handleContinueToNext = () => {
    setShowSuccessModal(false);
    // Auto-switch to next tab
    if (activeTab === "employment") {
      setActiveTab("salary");
    } else if (activeTab === "salary") {
      setActiveTab("location");
    } else if (activeTab === "location" && isContractual) {
      setActiveTab("contract");
    }
  };

  const handleFinishLater = () => {
    setShowSuccessModal(false);
    onClose();

    if (onSubmit && completedTabs.employment) {
      // Get all form data to pass to parent
      const employmentData = employmentForm.getValues();
      const salaryData = completedTabs.salary ? salaryForm.getValues() : {};
      const locationData = completedTabs.location ? locationForm.getValues() : {};
      const contractData = completedTabs.contract ? contractForm.getValues() : {};

      // Combine all data
      const completeData = {
        id: savedEmploymentId,
        ...employmentData,
        ...salaryData,
        ...locationData,
        ...contractData,
      };

      console.log("📤 Passing complete employment data to parent:", completeData);
      onSubmit(completeData);
    }
  };

  if (!formOptions) {
    console.log("⏳ TabbedEmploymentForm: Form options not loaded yet, showing loading spinner");
    return (
      <EnhancedModal
        isOpen={isOpen}
        onClose={onClose}
        title="Add Employment Record"
        size="lg"
      >
        <div className="p-8 text-center">
          <LoadingSpinner size="md" text="Loading form options..." />
        </div>
      </EnhancedModal>
    );
  }

  console.log("✅ TabbedEmploymentForm: Form options loaded:", formOptions);

  return (
    <>
      <EnhancedModal
        isOpen={isOpen}
        onClose={onClose}
        title={`${isEditMode ? "Edit" : "Add"} Employment Record${
          employeeName ? ` - ${employeeName}` : ""
        }`}
        size="xl"
        maxHeight="95vh"
      >
        <div
          ref={modalContentRef}
          className="p-6 modal-content overflow-y-auto max-h-[80vh]"
          onScroll={(e) => setScrollPosition(e.target.scrollTop)}
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabsConfig.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                    ${
                      activeTab === tab.id
                        ? `border-${tab.color}-500 text-${tab.color}-600`
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                  {tab.completed && (
                    <i className="fas fa-check-circle text-green-500 ml-2"></i>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Completion Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Completion Status
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tabsConfig.map((tab) => (
                <div key={tab.id} className="flex items-center">
                  <i
                    className={`fas ${
                      tab.completed
                        ? "fa-check-circle text-green-500"
                        : "fa-clock text-gray-400"
                    } mr-2`}
                  ></i>
                  <span
                    className={`text-sm ${
                      tab.completed
                        ? "text-green-700 font-medium"
                        : "text-gray-600"
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Employment Tab */}
            {activeTab === "employment" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">
                    <i className="fas fa-briefcase mr-2"></i>
                    Employment Information
                  </h3>

                  <form onSubmit={handleEmploymentSubmit(onEmploymentSubmit)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Organization <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={ORGANIZATION_OPTIONS}
                          value={employmentForm.watch("organization")}
                          onChange={(value) => employmentForm.setValue("organization", value)}
                          placeholder="Select Organization"
                          register={registerEmployment}
                          name="organization"
                          required={true}
                          error={employmentErrors.organization?.message}
                        />
                        {employmentErrors.organization && (
                          <p className="text-red-600 text-sm mt-1">
                            {employmentErrors.organization.message}
                          </p>
                        )}
                      </div>

                      <div className={getFieldClasses('employment', 'department')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Department <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={formOptions?.departments || []}
                          value={employmentForm.watch("department")}
                          onChange={(value) => employmentForm.setValue("department", value)}
                          placeholder="Select Department"
                          register={registerEmployment}
                          name="department"
                          required={getValidationRules('employment', 'department', { required: "Department is required" }).required}
                          error={employmentErrors.department?.message}
                        />
                        {employmentErrors.department && (
                          <p className="text-red-600 text-sm mt-1">
                            {employmentErrors.department.message}
                          </p>
                        )}
                      </div>

                      <div className={getFieldClasses('employment', 'designation')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Designation <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={availableDesignations || []}
                          value={employmentForm.watch("designation")}
                          onChange={(value) => employmentForm.setValue("designation", value)}
                          placeholder="Select Designation"
                          register={registerEmployment}
                          name="designation"
                          required={getValidationRules('employment', 'designation', { required: "Designation is required" }).required}
                          error={employmentErrors.designation?.message}
                        />
                        {employmentErrors.designation && (
                          <p className="text-red-600 text-sm mt-1">
                            {employmentErrors.designation.message}
                          </p>
                        )}
                      </div>



                      <div className={getFieldClasses('employment', 'employment_type')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Employment Type{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={formOptions?.employmentTypes || []}
                          value={employmentForm.watch("employment_type")}
                          onChange={(value) => employmentForm.setValue("employment_type", value)}
                          placeholder="Select Employment Type"
                          register={registerEmployment}
                          name="employment_type"
                          required={getValidationRules('employment', 'employment_type', { required: "Employment type is required" }).required}
                          error={employmentErrors.employment_type?.message}
                        />
                        {employmentErrors.employment_type && (
                          <p className="text-red-600 text-sm mt-1">
                            {employmentErrors.employment_type.message}
                          </p>
                        )}
                      </div>

                      {/* Conditional Probation Section */}
                      {(watchedEmploymentType === "Regular" || watchedEmploymentType === "Contract") &&
                       isFieldVisible('employment', 'employment_type') &&
                       currentOrganization !== 'MBWO' && (
                        <div className="col-span-2 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h4 className="text-md font-semibold text-yellow-800 mb-3">
                            <i className="fas fa-clock mr-2"></i>
                            Probation Information
                          </h4>

                          <div className="space-y-4">
                            {/* Probation Checkbox */}
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                {...registerEmployment("is_on_probation")}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label className="ml-2 text-sm font-medium text-gray-700">
                                Employee is on probation
                              </label>
                            </div>

                            {/* Conditional Probation End Date */}
                            {employmentForm.watch("is_on_probation") && (
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Probation End Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  {...registerEmployment("probation_end_date", {
                                    required: employmentForm.watch("is_on_probation") ? "Probation end date is required when employee is on probation" : false,
                                    validate: (value) => {
                                      if (employmentForm.watch("is_on_probation") && value) {
                                        const selectedDate = new Date(value);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);

                                        if (selectedDate <= today) {
                                          return "Probation end date must be in the future";
                                        }
                                      }
                                      return true;
                                    }
                                  })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // Tomorrow
                                />
                                {employmentErrors.probation_end_date && (
                                  <p className="text-red-600 text-sm mt-1">
                                    {employmentErrors.probation_end_date.message}
                                  </p>
                                )}
                                <p className="text-sm text-gray-500 mt-1">
                                  Select a future date when the probation period will end
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className={getFieldClasses('employment', 'role_tag')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Role Tag <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={formOptions?.roleTags || []}
                          value={employmentForm.watch("role_tag")}
                          onChange={(value) => employmentForm.setValue("role_tag", value)}
                          placeholder="Select Role Tag"
                          register={registerEmployment}
                          name="role_tag"
                          required={getValidationRules('employment', 'role_tag', { required: "Role tag is required" }).required}
                          error={employmentErrors.role_tag?.message}
                        />
                        {employmentErrors.role_tag && (
                          <p className="text-red-600 text-sm mt-1">
                            {employmentErrors.role_tag.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Effective From <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          {...registerEmployment("effective_from", {
                            required: "Effective from date is required",
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        />
                        {employmentErrors.effective_from && (
                          <p className="text-red-600 text-sm mt-1">
                            {employmentErrors.effective_from.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Effective Till
                        </label>
                        <input
                          type="date"
                          {...registerEmployment("effective_till")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        />
                      </div>

                      <div className={getFieldClasses('employment', 'reporting_officer_id')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Reporting Officer
                        </label>
                        <SearchableSelect
                          options={formOptions?.users || []}
                          value={employmentForm.watch("reporting_officer_id")}
                          onChange={(value) => employmentForm.setValue("reporting_officer_id", value)}
                          placeholder="Select Reporting Officer"
                          register={registerEmployment}
                          name="reporting_officer_id"
                          required={false}
                          error={employmentErrors.reporting_officer_id?.message}
                        />
                      </div>



                      {/* Scale/Grade */}
                      <div className={getFieldClasses('employment', 'scale_grade')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Scale/Grade
                        </label>
                        <input
                          type="text"
                          {...registerEmployment("scale_grade")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                          placeholder="Enter scale or grade (e.g., BPS-17, Grade-A)"
                        />
                      </div>

                      {/* Medical Fitness Report */}
                      <div className={getFieldClasses('employment', 'medical_fitness_report_pdf')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Medical Fitness Report (PDF)
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          {...registerEmployment("medical_fitness_report_pdf")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">Upload medical fitness report in PDF format</p>
                      </div>

                      {/* Police Character Certificate */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Police Character Certificate
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          {...registerEmployment("police_character_certificate")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">Upload police character certificate</p>
                      </div>

                      {/* Filer Status */}
                      <div className={getFieldClasses('employment', 'filer_status')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tax Filer Status
                        </label>
                        <SearchableSelect
                          options={[
                            { value: "non_filer", label: "Non-Filer" },
                            { value: "filer", label: "Filer" }
                          ]}
                          value={employmentForm.watch("filer_status")}
                          onChange={(value) => employmentForm.setValue("filer_status", value)}
                          placeholder="Select Tax Filer Status"
                          register={registerEmployment}
                          name="filer_status"
                          required={false}
                          error={employmentErrors.filer_status?.message}
                        />
                      </div>

                      {/* Filer Active Status (conditional) */}
                      {watchedFilerStatus === "filer" && (
                        <div className={getFieldClasses('employment', 'filer_active_status')}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Filer Active Status <span className="text-red-500">*</span>
                          </label>
                          <SearchableSelect
                            options={[
                              { value: "active", label: "Active" },
                              { value: "not_active", label: "Not Active" }
                            ]}
                            value={employmentForm.watch("filer_active_status")}
                            onChange={(value) => employmentForm.setValue("filer_active_status", value)}
                            placeholder="Select Status"
                            register={registerEmployment}
                            name="filer_active_status"
                            required={getValidationRules('employment', 'filer_active_status', {
                              required: watchedFilerStatus === "filer" ? "Filer active status is required" : false,
                            }).required}
                            error={employmentErrors.filer_active_status?.message}
                          />
                          {employmentErrors.filer_active_status && (
                            <p className="text-red-600 text-sm mt-1">
                              {employmentErrors.filer_active_status.message}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Employment Status */}
                      <div className={getFieldClasses('employment', 'employment_status')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Employment Status <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={[
                            { value: "active", label: "Active" },
                            { value: "inactive", label: "Inactive" },
                            { value: "terminated", label: "Terminated" },
                            { value: "resigned", label: "Resigned" }
                          ]}
                          value={employmentForm.watch("employment_status")}
                          onChange={(value) => employmentForm.setValue("employment_status", value)}
                          placeholder="Select Status"
                          register={registerEmployment}
                          name="employment_status"
                          required={getValidationRules('employment', 'employment_status', { required: "Employment status is required" }).required}
                          error={employmentErrors.employment_status?.message}
                        />
                        {employmentErrors.employment_status && (
                          <p className="text-red-600 text-sm mt-1">
                            {employmentErrors.employment_status.message}
                          </p>
                        )}
                      </div>

                      {/* Is Current Employee */}
                      <div className={getFieldClasses('employment', 'is_current')}>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            {...registerEmployment("is_current")}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            Current Employee
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Check if this is the employee's current position</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Remarks
                      </label>
                      <textarea
                        {...registerEmployment("remarks")}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                        rows={3}
                        placeholder="Any additional remarks or notes"
                      />
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <i className="fas fa-arrow-right mr-2"></i>
                        Continue to Salary
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Salary Tab */}
            {activeTab === "salary" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">
                    <i className="fas fa-money-bill-wave mr-2"></i>
                    Salary & Payment Information
                  </h3>

                  <form onSubmit={handleSalarySubmit(onSalarySubmit)}>
                    {/* Daily Wager Specific Fields */}
                    {watchedEmploymentType === "Daily Wager" ? (
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-6">
                        <h4 className="text-md font-semibold text-orange-800 mb-4">
                          <i className="fas fa-calendar-day mr-2"></i>
                          Daily Wager Salary Information
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                          For Daily Wager employment, please provide either a gross salary or daily wage rate (at least one is required).
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Gross Salary (PKR)
                            </label>
                            <input
                              type="number"
                              {...registerSalary("basic_salary", {
                                validate: (value) => {
                                  const dailyWageRate = salaryForm.watch("daily_wage_rate");
                                  if (!value && !dailyWageRate) {
                                    return "Either gross salary or daily wage rate is required";
                                  }
                                  if (value && value <= 0) {
                                    return "Salary must be greater than 0";
                                  }
                                  return true;
                                }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                              placeholder="Enter gross salary (optional)"
                            />
                            {salaryErrors.basic_salary && (
                              <p className="text-red-600 text-sm mt-1">
                                {salaryErrors.basic_salary.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Daily Wage Rate (PKR)
                            </label>
                            <input
                              type="number"
                              {...registerSalary("daily_wage_rate", {
                                validate: (value) => {
                                  const basicSalary = salaryForm.watch("basic_salary");
                                  if (!value && !basicSalary) {
                                    return "Either gross salary or daily wage rate is required";
                                  }
                                  if (value && value <= 0) {
                                    return "Daily wage rate must be greater than 0";
                                  }
                                  return true;
                                }
                              })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                              placeholder="Enter daily wage rate (optional)"
                            />
                            {salaryErrors.daily_wage_rate && (
                              <p className="text-red-600 text-sm mt-1">
                                {salaryErrors.daily_wage_rate.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Standard Salary Fields for Other Employment Types */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {currentOrganization === 'MBWO' ? 'Gross Salary (PKR)' : 'Basic Salary (PKR)'}{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            {...registerSalary("basic_salary", {
                              required: "Basic salary is required",
                              min: {
                                value: 1,
                                message: "Salary must be greater than 0",
                              },
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                            placeholder="Enter basic salary"
                          />
                          {salaryErrors.basic_salary && (
                            <p className="text-red-600 text-sm mt-1">
                              {salaryErrors.basic_salary.message}
                            </p>
                          )}
                        </div>

                        <div className={getFieldClasses('salary', 'medical_allowance')}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Medical Allowance (PKR)
                          </label>
                          <input
                            type="number"
                            {...registerSalary("medical_allowance")}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                            placeholder="Enter medical allowance"
                          />
                        </div>

                        <div className={getFieldClasses('salary', 'house_rent')}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            House Rent (PKR)
                          </label>
                          <input
                            type="number"
                            {...registerSalary("house_rent")}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                            placeholder="Enter house rent allowance"
                          />
                        </div>

                        <div className={getFieldClasses('salary', 'conveyance_allowance')}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Conveyance Allowance (PKR)
                          </label>
                          <input
                            type="number"
                            {...registerSalary("conveyance_allowance")}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                            placeholder="Enter conveyance allowance"
                          />
                        </div>

                        <div className={getFieldClasses('salary', 'other_allowances')}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Other Allowances (PKR)
                          </label>
                          <input
                            type="number"
                            {...registerSalary("other_allowances")}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                            placeholder="Enter other allowances"
                          />
                        </div>

                        <div className={getFieldClasses('salary', 'daily_wage_rate')}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Daily Wage Rate (PKR)
                          </label>
                          <input
                            type="number"
                            {...registerSalary("daily_wage_rate")}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                            placeholder="Enter daily wage rate (if applicable)"
                          />
                        </div>
                      </div>
                    )}

                    {/* Payment and Bank Information - Common for all employment types */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div className={getFieldClasses('salary', 'payment_mode')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Mode
                        </label>
                        <SearchableSelect
                          options={[
                            { value: "Bank Transfer", label: "Bank Transfer" },
                            { value: "Cheque", label: "Cheque" },
                            { value: "Online Transfer", label: "Online Transfer" },
                            { value: "Mobile Banking", label: "Mobile Banking" }
                          ]}
                          value={salaryForm.watch("payment_mode")}
                          onChange={(value) => salaryForm.setValue("payment_mode", value)}
                          placeholder="Select Payment Mode"
                          register={registerSalary}
                          name="payment_mode"
                          required={false}
                          error={salaryErrors.payment_mode?.message}
                        />
                      </div>

                      <div className={getFieldClasses('salary', 'bank_account_primary')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Bank Account Number
                        </label>
                        <input
                          type="text"
                          {...registerSalary("bank_account_primary", {
                            validate: (value) => {
                              const paymentMode = salaryForm.watch("payment_mode");
                              const bankName = salaryForm.watch("bank_name_primary");
                              if ((paymentMode === "Bank Transfer" || paymentMode === "Online Transfer" || paymentMode === "Mobile Banking") && bankName && !value) {
                                return "Bank account number is required when bank details are provided";
                              }
                              return true;
                            }
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                          placeholder="Enter bank account number"
                        />
                        {salaryErrors.bank_account_primary && (
                          <p className="text-red-600 text-sm mt-1">
                            {salaryErrors.bank_account_primary.message}
                          </p>
                        )}
                      </div>

                      <div className={getFieldClasses('salary', 'bank_name_primary')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          {...registerSalary("bank_name_primary")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                          placeholder="Enter bank name"
                        />
                      </div>

                      <div className={getFieldClasses('salary', 'bank_branch_code')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Bank Branch Code
                          {(salaryForm.watch("bank_name_primary") || salaryForm.watch("bank_account_primary")) && (
                            <span className="text-red-500"> *</span>
                          )}
                        </label>
                        <input
                          type="text"
                          {...registerSalary("bank_branch_code", {
                            validate: (value) => {
                              const bankName = salaryForm.watch("bank_name_primary");
                              const bankAccount = salaryForm.watch("bank_account_primary");
                              if ((bankName || bankAccount) && !value) {
                                return "Bank branch code is required when bank details are provided";
                              }
                              return true;
                            }
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                          placeholder="Enter bank branch code"
                        />
                        {salaryErrors.bank_branch_code && (
                          <p className="text-red-600 text-sm mt-1">
                            {salaryErrors.bank_branch_code.message}
                          </p>
                        )}
                      </div>

                      <div className={getFieldClasses('salary', 'payroll_status')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Payroll Status
                        </label>
                        <SearchableSelect
                          options={[
                            { value: "Active", label: "Active" },
                            { value: "Inactive", label: "Inactive" },
                            { value: "Suspended", label: "Suspended" }
                          ]}
                          value={salaryForm.watch("payroll_status")}
                          onChange={(value) => salaryForm.setValue("payroll_status", value)}
                          placeholder="Select Payroll Status"
                          register={registerSalary}
                          name="payroll_status"
                          required={false}
                          error={salaryErrors.payroll_status?.message}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <i className="fas fa-arrow-right mr-2"></i>
                        Continue to Location
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Location Tab */}
            {activeTab === "location" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {isSectionVisible('location') ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">
                      <i className="fas fa-map-marker-alt mr-2"></i>
                      Location Information
                    </h3>

                  <form onSubmit={handleLocationSubmit(onLocationSubmit)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={getFieldClasses('location', 'district')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          District <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...registerLocation("district",
                            getValidationRules('location', 'district', {
                              required: "District is required",
                            })
                          )}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                          placeholder="Enter district"
                        />
                        {locationErrors.district && (
                          <p className="text-red-600 text-sm mt-1">
                            {locationErrors.district.message}
                          </p>
                        )}
                      </div>

                      <div className={getFieldClasses('location', 'city')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...registerLocation("city",
                            getValidationRules('location', 'city', {
                              required: "City is required",
                            })
                          )}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                          placeholder="Enter city"
                        />
                        {locationErrors.city && (
                          <p className="text-red-600 text-sm mt-1">
                            {locationErrors.city.message}
                          </p>
                        )}
                      </div>

                      <div className={getFieldClasses('location', 'location_type')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Location Type <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          options={currentOrganization === 'PSBA' ? [
                            { value: "HEAD_QUARTER", label: "Head Quarter" },
                            { value: "SAHULAT_BAZAAR", label: "Sahulat Bazaar" }
                          ] : [
                            { value: "HEAD_OFFICE", label: "Head Office" },
                            { value: "BAZAAR", label: "Bazaar" }
                          ]}
                          value={locationForm.watch("type")}
                          onChange={(value) => locationForm.setValue("type", value)}
                          placeholder="Select Location Type"
                          register={registerLocation}
                          name="type"
                          required={getValidationRules('location', 'location_type', { required: "Location type is required" }).required}
                          error={locationErrors.type?.message}
                        />
                        {locationErrors.type && (
                          <p className="text-red-600 text-sm mt-1">
                            {locationErrors.type.message}
                          </p>
                        )}
                      </div>

                      <div className={getFieldClasses('location', 'bazaar_name')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Bazaar Name
                        </label>
                        <input
                          type="text"
                          {...registerLocation("bazaar_name")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                          placeholder="Enter bazaar name (if applicable)"
                        />
                      </div>
                    </div>

                    <div className={getFieldClasses('location', 'full_address', 'mt-6')}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description (if any)
                      </label>
                      <textarea
                        {...registerLocation("full_address",
                          getValidationRules('location', 'full_address', {
                            required: false,
                          })
                        )}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                        rows={4}
                        placeholder="Enter additional description (optional)"
                      />
                      {locationErrors.full_address && (
                        <p className="text-red-600 text-sm mt-1">
                          {locationErrors.full_address.message}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        <i className="fas fa-arrow-right mr-2"></i>
                        {isContractual ? "Continue to Contract" : "Complete Employment Record"}
                      </button>
                    </div>
                  </form>
                </div>
                ) : (
                  // Show message when location section is not available for this organization
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <i className="fas fa-info-circle text-gray-400 text-3xl mb-4"></i>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Location Details Not Required
                    </h3>
                    <p className="text-gray-600">
                      Location information is not required for {organizationDisplayName} organization.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Contract Tab */}
            {activeTab === "contract" && isContractual && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-orange-900 mb-4">
                    <i className="fas fa-file-contract mr-2"></i>
                    Contract Information
                  </h3>

                  <form onSubmit={handleContractSubmit(onContractSubmit)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contract Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...registerContract("contract_type", {
                            required: "Contract type is required",
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                        >
                          <option value="">Select Contract Type</option>
                          {formOptions.contractTypes?.map((type) => (
                            <option
                              key={type.value}
                              value={type.value}
                              title={type.description}
                            >
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {contractErrors.contract_type && (
                          <p className="text-red-600 text-sm mt-1">
                            {contractErrors.contract_type.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contract Start Date{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          {...registerContract("start_date", {
                            required: "Contract start date is required",
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                        />
                        {contractErrors.start_date && (
                          <p className="text-red-600 text-sm mt-1">
                            {contractErrors.start_date.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contract End Date{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          {...registerContract("end_date", {
                            required: "Contract end date is required",
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                        />
                        {contractErrors.end_date && (
                          <p className="text-red-600 text-sm mt-1">
                            {contractErrors.end_date.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contract Number
                        </label>
                        <input
                          type="text"
                          {...registerContract("contract_number")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                          placeholder="Enter contract number"
                        />
                      </div>

                      {/* Is Renewed */}
                      <div>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            {...registerContract("is_renewed")}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            Contract Renewed
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Check if this contract is a renewal</p>
                      </div>

                      {/* Renewal Report (conditional) */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Renewal Report
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          {...registerContract("renewal_report")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">Upload renewal report (if applicable)</p>
                      </div>

                      {/* Confirmation Date */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirmation Date
                        </label>
                        <input
                          type="date"
                          {...registerContract("confirmation_date")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                        />
                      </div>

                      {/* Confirmation Status */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirmation Status
                        </label>
                        <select
                          {...registerContract("confirmation_status")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                        >
                          <option value="">Select Status</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Extended">Extended</option>
                          <option value="In Progress">In Progress</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                      >
                        <i className="fas fa-check mr-2"></i>
                        Complete Employment Record
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </EnhancedModal>

      {/* Confirmation Modal */}
      <EnhancedModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Submission"
        size="md"
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <i className="fas fa-question-circle text-4xl text-blue-500 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Save{" "}
              {confirmType?.charAt(0).toUpperCase() + confirmType?.slice(1)}{" "}
              Information?
            </h3>
            <p className="text-gray-600">
              Are you sure you want to save this {confirmType} information? You
              can add more details later if needed.
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmedSubmit}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <i className="fas fa-save mr-2"></i>
              Yes, Save
            </button>
          </div>
        </div>
      </EnhancedModal>

      {/* Success Modal */}
      <EnhancedModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Successfully Saved!"
        size="md"
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <i className="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Data Saved Successfully!
            </h3>
            <p className="text-gray-600">{successMessage}</p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleFinishLater}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <i className="fas fa-times mr-2"></i>
              Finish Later
            </button>
            {((activeTab === "employment" && !completedTabs.salary) ||
              (activeTab === "salary" && !completedTabs.location) ||
              (activeTab === "location" &&
                isContractual &&
                !completedTabs.contract)) && (
              <button
                onClick={handleContinueToNext}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <i className="fas fa-arrow-right mr-2"></i>
                Continue to Next Tab
              </button>
            )}
          </div>
        </div>
      </EnhancedModal>

      {/* Preview/Confirmation Modal */}
      <EnhancedModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Review Employment Record Before Saving"
        size="xl"
      >
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {previewData && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Please review all information before saving
                </h3>
                <p className="text-gray-600">
                  Fields showing "N/A" indicate no value was entered. You can go back to edit or proceed to save.
                </p>
              </div>

              {/* Employment Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <i className="fas fa-briefcase mr-2 text-blue-600"></i>
                  Employment Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Organization:</span>
                    <span className="text-gray-900">{displayValue(previewData.organization)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Department:</span>
                    <span className="text-gray-900">{displayValue(previewData.department)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Designation:</span>
                    <span className="text-gray-900">{displayValue(previewData.designation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Employment Type:</span>
                    <span className="text-gray-900">{displayValue(previewData.employment_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Role Tag:</span>
                    <span className="text-gray-900">{displayValue(previewData.role_tag)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Effective From:</span>
                    <span className="text-gray-900">{displayValue(previewData.effective_from)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Effective Till:</span>
                    <span className="text-gray-900">{displayValue(previewData.effective_till) || 'Present'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Scale/Grade:</span>
                    <span className="text-gray-900">{displayValue(previewData.scale_grade)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Medical Fitness Report:</span>
                    <span className="text-gray-900">{previewData.medical_fitness_report_pdf ? 'Uploaded' : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Police Character Certificate:</span>
                    <span className="text-gray-900">{previewData.police_character_certificate ? 'Uploaded' : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Tax Filer Status:</span>
                    <span className="text-gray-900">{displayValue(previewData.filer_status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Filer Active Status:</span>
                    <span className="text-gray-900">{displayValue(previewData.filer_active_status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Employment Status:</span>
                    <span className="text-gray-900 font-semibold">{displayValue(previewData.employment_status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Current Employee:</span>
                    <span className="text-gray-900">{previewData.is_current ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                {previewData.remarks && (
                  <div>
                    <span className="font-medium text-gray-600">Remarks:</span>
                    <p className="text-gray-900 mt-1 bg-gray-50 p-2 rounded">{displayValue(previewData.remarks)}</p>
                  </div>
                )}

                {/* Probation Information */}
                {(previewData.employment_type === "Regular" || previewData.employment_type === "Contract") &&
                 previewData.organization !== 'MBWO' && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h5 className="text-md font-semibold text-yellow-800 mb-2">
                      <i className="fas fa-clock mr-2"></i>
                      Probation Status
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">On Probation:</span>
                        <span className={`font-semibold ${previewData.is_on_probation ? 'text-orange-600' : 'text-green-600'}`}>
                          {previewData.is_on_probation ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {previewData.is_on_probation && previewData.probation_end_date && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Probation End Date:</span>
                          <span className="text-gray-900 font-semibold">{displayValue(previewData.probation_end_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Salary Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <i className="fas fa-money-bill-wave mr-2 text-green-600"></i>
                  Salary Information
                </h4>

                {/* Daily Wager Specific Salary Display */}
                {previewData.employment_type === "Daily Wager" ? (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h5 className="text-md font-semibold text-orange-800 mb-3">
                      <i className="fas fa-calendar-day mr-2"></i>
                      Daily Wager Salary Details
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {previewData.basic_salary > 0 && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Gross Salary:</span>
                          <span className="text-gray-900 font-semibold">{displayValue(previewData.basic_salary, 'currency')}</span>
                        </div>
                      )}
                      {previewData.daily_wage_rate > 0 && (
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">Daily Wage Rate:</span>
                          <span className="text-gray-900 font-semibold">{displayValue(previewData.daily_wage_rate, 'currency')}</span>
                        </div>
                      )}
                      {!previewData.basic_salary && !previewData.daily_wage_rate && (
                        <div className="col-span-2 text-center text-gray-500">
                          <i className="fas fa-exclamation-triangle mr-2"></i>
                          No salary information provided
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard Salary Display for Other Employment Types */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">{previewData.organization === 'MBWO' ? 'Gross Salary:' : 'Basic Salary:'}</span>
                      <span className="text-gray-900 font-semibold">{displayValue(previewData.basic_salary, 'currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Medical Allowance:</span>
                      <span className="text-gray-900">{displayValue(previewData.medical_allowance, 'currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">House Rent:</span>
                      <span className="text-gray-900">{displayValue(previewData.house_rent, 'currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Conveyance Allowance:</span>
                      <span className="text-gray-900">{displayValue(previewData.conveyance_allowance, 'currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Other Allowances:</span>
                      <span className="text-gray-900">{displayValue(previewData.other_allowances, 'currency')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Total Salary:</span>
                      <span className="text-gray-900 font-bold text-lg">
                        {displayValue(
                          (previewData.basic_salary || 0) +
                          (previewData.medical_allowance || 0) +
                          (previewData.house_rent || 0) +
                          (previewData.conveyance_allowance || 0) +
                          (previewData.other_allowances || 0),
                          'currency'
                        )}
                      </span>
                    </div>
                    {previewData.daily_wage_rate > 0 && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Daily Wage Rate:</span>
                        <span className="text-gray-900">{displayValue(previewData.daily_wage_rate, 'currency')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment and Bank Information - Common for all employment types */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Payment Mode:</span>
                    <span className="text-gray-900">{displayValue(previewData.payment_mode)}</span>
                  </div>
                  {previewData.bank_account_primary && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Bank Account:</span>
                      <span className="text-gray-900">{displayValue(previewData.bank_account_primary)}</span>
                    </div>
                  )}
                  {previewData.bank_name_primary && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Bank Name:</span>
                      <span className="text-gray-900">{displayValue(previewData.bank_name_primary)}</span>
                    </div>
                  )}
                  {previewData.bank_branch_code && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Bank Branch Code:</span>
                      <span className="text-gray-900">{displayValue(previewData.bank_branch_code)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Payroll Status:</span>
                    <span className="text-gray-900">{displayValue(previewData.payroll_status)}</span>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <i className="fas fa-map-marker-alt mr-2 text-purple-600"></i>
                  Location Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">District:</span>
                    <span className="text-gray-900">{displayValue(previewData.district)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">City:</span>
                    <span className="text-gray-900">{displayValue(previewData.city)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Bazaar/Area:</span>
                    <span className="text-gray-900">{displayValue(previewData.bazaar_name)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Location Type:</span>
                    <span className="text-gray-900">{getLocationTypeLabel(previewData.location_type, previewData.organization)}</span>
                  </div>
                </div>
                {previewData.full_address && (
                  <div>
                    <span className="font-medium text-gray-600">Description:</span>
                    <p className="text-gray-900 mt-1 bg-gray-50 p-2 rounded">{displayValue(previewData.full_address)}</p>
                  </div>
                )}
              </div>

              {/* Contract Information (if applicable) */}
              {previewData.employment_type === "Contract" && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    <i className="fas fa-file-contract mr-2 text-orange-600"></i>
                    Contract Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Contract Type:</span>
                      <span className="text-gray-900">{displayValue(previewData.contract_type)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Contract Number:</span>
                      <span className="text-gray-900">{displayValue(previewData.contract_number)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Contract Start:</span>
                      <span className="text-gray-900">{displayValue(previewData.contract_start_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Contract End:</span>
                      <span className="text-gray-900">{displayValue(previewData.contract_end_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Probation Start:</span>
                      <span className="text-gray-900">{displayValue(previewData.probation_start)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Probation End:</span>
                      <span className="text-gray-900">{displayValue(previewData.probation_end)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Confirmation Status:</span>
                      <span className="text-gray-900">{displayValue(previewData.confirmation_status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Contract Renewed:</span>
                      <span className="text-gray-900">{previewData.is_renewed ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Renewal Report:</span>
                      <span className="text-gray-900">{previewData.renewal_report ? 'Uploaded' : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Confirmation Date:</span>
                      <span className="text-gray-900">{displayValue(previewData.confirmation_date)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Go Back to Edit
                </button>
                <button
                  onClick={handleFinalSubmit}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <i className="fas fa-check mr-2"></i>
                  Confirm & Save Employment Record
                </button>
              </div>
            </>
          )}
        </div>
      </EnhancedModal>
    </>
  );
};

export default TabbedEmploymentForm;
