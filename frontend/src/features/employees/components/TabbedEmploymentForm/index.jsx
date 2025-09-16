import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import EnhancedModal from "../../../../components/ui/EnhancedModal";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import EmploymentTab from "./EmploymentTab";
import SalaryTab from "./SalaryTab";
import LocationTab from "./LocationTab";
import ContractTab from "./ContractTab";
import EmploymentDocumentManager from "../../../../components/ui/EmploymentDocumentManager";
import useEmploymentForm from "../../hooks/useEmploymentForm";
import { useEmploymentDocumentManager } from "../../hooks/useEmploymentDocumentManager";
import { useOrganizationFields } from "../../hooks/useOrganizationFields";
import { forceRestoreScroll } from "../../../../utils/scrollUtils";
import { validateEmploymentData } from "../../../../constants/organizationFieldConfig";
import { employmentService } from "../../services/employmentService";
import useToast from "../../../../hooks/useToast";

const TabbedEmploymentForm = forwardRef(({
  isOpen,
  onClose,
  onSubmit,
  isLoading: externalLoading = false,
  employeeName = "",
  userId = null,
  editingRecord = null,
  isEditMode = false,
  isCreatingFromExisting = false,
  onRefresh = null,
}, ref) => {
  const [activeTab, setActiveTab] = useState("employment");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [confirmType, setConfirmType] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingEmployment, setIsLoadingEmployment] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [previousOrganization, setPreviousOrganization] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const documentManager = useEmploymentDocumentManager([]);

  const modalContentRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const dataLoadedRef = useRef(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const effectiveIsOpen = isSubmitting ? true : isOpen;

  const { showSuccess, showError } = useToast();

  const transformedInitialData = useMemo(() => {
    if (!editingRecord || (!isEditMode && !isCreatingFromExisting)) return null;

    const isNestedFormat = editingRecord.employment || editingRecord.salary || editingRecord.location || editingRecord.contract;
    let transformed;
    if (isNestedFormat) {
      transformed = {
        id: editingRecord.id,
        employee_id: editingRecord.employee_id || editingRecord.employee?.id,
        employment: editingRecord.employment || {},
        salary: editingRecord.salary || {},
        location: editingRecord.location || {},
        contract: editingRecord.contract || {},
      };
    } else {
      transformed = {
        id: editingRecord.id,
        employee_id: editingRecord.employee_id || editingRecord.employee?.id,
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
          is_current: editingRecord.is_current !== undefined ? editingRecord.is_current : false,
          is_on_probation: editingRecord.is_on_probation || false,
          probation_end_date: editingRecord.probation_end_date || "",
          scale_grade: editingRecord.scale_grade || "",
          filer_status: editingRecord.filer_status || "non_filer",
          filer_active_status: editingRecord.filer_active_status || "",
          employment_status: editingRecord.employment_status || "active",
          office_location: editingRecord.office_location || "",
        },
        salary: editingRecord.salary ? { basic_salary: editingRecord.salary } : {},
        location: {},
        contract: {},
      };
    }

    if (transformed && !transformed.designation) {
      transformed.designation = editingRecord.designation || transformed.employment?.designation || "";
    }
    if (transformed && !transformed.department) {
      transformed.department = editingRecord.department || transformed.employment?.department || "";
    }
    if (transformed && !transformed.role_tag) {
      transformed.role_tag = editingRecord.role_tag || transformed.employment?.role_tag || "";
    }
    if (transformed && !transformed.scale_grade) {
      transformed.scale_grade = editingRecord.scale_grade || transformed.employment?.scale_grade || "";
    }
    if (transformed && !transformed.reporting_officer_id) {
      transformed.reporting_officer_id = editingRecord.reporting_officer_id || transformed.employment?.reporting_officer_id || "";
    }
    if (transformed && !transformed.is_current) {
      transformed.is_current = editingRecord.is_current !== undefined ? editingRecord.is_current : (transformed.employment?.is_current !== undefined ? transformed.employment.is_current : false);
    }

    return transformed;
  }, [editingRecord?.id, isEditMode, isCreatingFromExisting]);

  const {
    employmentForm,
    salaryForm,
    locationForm,
    contractForm,
    isLoading: formLoading,
    formOptions,
    availableDesignations,
    bazaarOptions,
    isContractual,
    completedTabs,
    savedEmploymentId,
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
  } = useEmploymentForm({
    initialData: transformedInitialData,
    isEditMode,
    isCreatingFromExisting,
    userId,
    onSuccess: useCallback((result, type) => {
      setSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} details saved successfully!`);
      setShowSuccessModal(true);
    }, []),
    onError: useCallback((error) => {
      console.error("Employment form error:", error);
    }, []),
  });

  const handleCloneEmployment = async () => {
    try {
      if (!isEditMode || !savedEmploymentId) {
        alert("Clone is only available while editing an existing employment record.");
        return;
      }
      if (!window.confirm("Clone this employment as a new record and set it as current? The existing record will be marked not current.")) {
        return;
      }
      setIsSubmitting(true);

      // Load latest saved record
      const existing = await employmentService.getEmploymentById(savedEmploymentId);
      const employmentBase = existing?.employment || existing || {};
      const salaryBase = existing?.salary || existing?.employment?.salary || null;
      const contractBase = existing?.contract || existing?.employment?.contract || null;
      const locationBase = existing?.location || existing?.employment?.location || null;

      // Read current form values (user may have changed some before cloning)
      const eForm = employmentForm.getValues();
      const sForm = salaryForm.getValues();
      const lForm = locationForm.getValues();
      const cForm = contractForm.getValues();

      // Helper: normalize optional date field (empty -> null, invalid -> null, ISO -> YYYY-MM-DD)
      const normalizeDateField = (val) => {
        if (val === undefined || val === null) return null;
        const s = String(val).trim();
        if (!s) return null;
        const d = new Date(s);
        if (isNaN(d.getTime())) return null;
        return s.includes('T') ? s.split('T')[0] : s;
      };

      // Prefer updated form values; fallback to existing values
      const organization = eForm.organization || employmentBase.organization || "";
      const department = eForm.department || employmentBase.department || employmentBase.department_id || "";
      const designation = eForm.designation || employmentBase.designation || employmentBase.designation_id || "";
      const employment_type = eForm.employment_type || employmentBase.employment_type || "Regular";
      const role_tag = eForm.role_tag || employmentBase.role_tag || employmentBase.role_tag_id || "";
      const effective_from = eForm.effective_from || employmentBase.effective_from || "";
      const effective_till = normalizeDateField(eForm.effective_till ?? employmentBase.effective_till ?? null);
      const filer_status = eForm.filer_status || employmentBase.filer_status || "non_filer";
      const remarks = (eForm.remarks ?? employmentBase.remarks) ?? "";
      const scale_grade = eForm.scale_grade || employmentBase.scale_grade || employmentBase.scale_grade_id || "";
      const reporting_officer_id = (eForm.reporting_officer_id ?? employmentBase.reporting_officer_id) ?? "";
      const office_location = (eForm.office_location ?? employmentBase.office_location) ?? "";

      // 1) Preserve existing record: only mark it as not current (but include required fields for validation)
      const oldUpdatePayload = {
        employee_id: userId || editingRecord?.employee_id || editingRecord?.employee?.id || transformedInitialData?.employee_id,
        organization,
        // include both plain and *_id to satisfy backend
        department: department,
        department_id: department,
        designation: designation,
        designation_id: designation,
        employment_type,
        role_tag: role_tag,
        role_tag_id: role_tag,
        effective_from,
        effective_till: effective_till === null ? null : effective_till,
        filer_status,
        remarks,
        scale_grade: scale_grade,
        scale_grade_id: scale_grade,
        reporting_officer_id,
        office_location,
        is_current: false,
      };
      await employmentService.updateEmployment(savedEmploymentId, oldUpdatePayload);

      // 2) Create new employment from merged values (including user's latest edits)
      const newEmploymentPayload = {
        employee_id: userId || editingRecord?.employee_id || editingRecord?.employee?.id || transformedInitialData?.employee_id,
        organization,
        department,
        department_id: department,
        designation,
        designation_id: designation,
        employment_type,
        role_tag,
        role_tag_id: role_tag,
        effective_from,
        effective_till: effective_till === null ? null : effective_till,
        filer_status,
        remarks,
        scale_grade,
        scale_grade_id: scale_grade,
        reporting_officer_id,
        office_location,
        is_current: true,
      };
      const created = await employmentService.createEmployment(newEmploymentPayload);

      // 3) Salary for the new record: merge current form with base
      if (salaryBase || Object.values(sForm || {}).some(v => v !== undefined && v !== null && v !== "")) {
        const mergedSalary = { ...(salaryBase || {}), ...(sForm || {}) };
        const salaryPayload = {
          basic_salary: mergedSalary.basic_salary != null ? Number(mergedSalary.basic_salary) : 0,
          gross_salary: mergedSalary.gross_salary != null ? Number(mergedSalary.gross_salary) : 0,
          medical_allowance: mergedSalary.medical_allowance != null ? Number(mergedSalary.medical_allowance) : 0,
          house_rent: mergedSalary.house_rent != null ? Number(mergedSalary.house_rent) : 0,
          conveyance_allowance: mergedSalary.conveyance_allowance != null ? Number(mergedSalary.conveyance_allowance) : 0,
          other_allowances: mergedSalary.other_allowances != null ? Number(mergedSalary.other_allowances) : 0,
          daily_wage_rate: mergedSalary.daily_wage_rate != null ? Number(mergedSalary.daily_wage_rate) : 0,
          bank_account_primary: mergedSalary.bank_account_primary || "",
          bank_name_primary: mergedSalary.bank_name_primary || "",
          bank_branch_code: mergedSalary.bank_branch_code || "",
          payment_mode: mergedSalary.payment_mode || "Bank Transfer",
          salary_effective_from: mergedSalary.salary_effective_from || null,
          salary_effective_till: mergedSalary.salary_effective_till || null,
          payroll_status: mergedSalary.payroll_status || "Active",
        };
        await employmentService.createSalary(created.id, salaryPayload);
      }

      // 4) Location for the new record: merge current form with base (no city/district now)
      if (locationBase || Object.values(lForm || {}).some(v => v !== undefined && v !== null && v !== "")) {
        const mergedLocation = { ...(locationBase || {}), ...(lForm || {}) };
        const locationPayload = {
          type: mergedLocation.type || (organization === 'PSBA' ? 'HEAD_QUARTER' : 'HEAD_OFFICE'),
          bazaar_name: toBazaarNameString(mergedLocation.bazaar_name),
          full_address: mergedLocation.full_address || "",
        };
        await employmentService.createLocation(created.id, locationPayload);
      }

      // 5) Contract for the new record: merge current form with base (files can't be auto-cloned)
      if (contractBase || Object.values(cForm || {}).some(v => v !== undefined && v !== null && v !== "")) {
        const c = { ...(contractBase || {}), ...(cForm || {}) };
        delete c.id;
        delete c.renewal_report;
        const contractPayload = {
          contract_type: c.contract_type || "",
          contract_number: c.contract_number || "",
          start_date: c.start_date || null,
          end_date: c.end_date || null,
          renewal_count: c.renewal_count != null ? Number(c.renewal_count) : 0,
          probation_start: c.probation_start || null,
          probation_end: c.probation_end || null,
          confirmation_status: c.confirmation_status || "",
          confirmation_date: c.confirmation_date || null,
          is_renewed: typeof c.is_renewed === 'string' ? c.is_renewed === 'true' : Boolean(c.is_renewed),
        };
        await employmentService.createContract(created.id, contractPayload);
      }

      setSavedEmploymentId(created.id);
      showSuccess('Employment cloned successfully');
      setShowPreviewModal(false);
      if (onRefresh) onRefresh();
      else if (typeof window !== 'undefined' && window.location) { window.location.reload(); }
      handleClose();
    } catch (err) {
      console.error("❌ Error cloning employment:", err);
      showError(`Failed to clone employment: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = externalLoading || formLoading;
  const currentOrganization = employmentForm.watch("organization");

  const { isFieldVisible, isSectionVisible, getFieldClasses, getSectionClasses, getValidationRules, filterFormDataForSubmission, hasFieldRestrictions, organizationDisplayName } = useOrganizationFields(currentOrganization);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [onClose, isSubmitting, isEditMode]);

  const handleOrganizationChange = useCallback((newOrganization) => {
    if (isInitialLoad && isEditMode) { setPreviousOrganization(newOrganization); return; }
    if (isInitialLoad && !isEditMode) { setPreviousOrganization(newOrganization); setIsInitialLoad(false); return; }
    if (isSubmitting) { setPreviousOrganization(newOrganization); return; }
    if (previousOrganization && previousOrganization !== newOrganization) {
      resetForms();
      documentManager.reset();
      setCompletedTabs({ employment: false, salary: false, location: false, contract: false });
      setSavedEmploymentId(null);
      setActiveTab("employment");
      alert(`Organization changed from ${previousOrganization} to ${newOrganization}. All form data has been reset. Please fill in the form again.`);
    }
    setPreviousOrganization(newOrganization);
    setIsInitialLoad(false);
  }, [previousOrganization, isInitialLoad, isEditMode, resetForms, documentManager, setCompletedTabs, setSavedEmploymentId, setActiveTab, isSubmitting]);

  useEffect(() => {
    if (modalContentRef.current && scrollPosition > 0) {
      modalContentRef.current.scrollTop = scrollPosition;
    }
  }, [completedTabs, activeTab]);
  useEffect(() => { if (modalContentRef.current) { modalContentRef.current.scrollTop = 0; } }, [activeTab]);
  useEffect(() => () => { setShowConfirmModal(false); setShowSuccessModal(false); setShowPreviewModal(false); forceRestoreScroll(); }, []);
  useEffect(() => {
    const subscription = locationForm.watch((value, { name }) => {
      if (name === "type") {
        const locationType = value.type;
        const bazaarName = locationForm.getValues("bazaar_name");
        if ((locationType === 'HEAD_OFFICE' || locationType === 'HEAD_QUARTER') && bazaarName) {
          locationForm.setValue("bazaar_name", "", { shouldValidate: false, shouldDirty: true });
          locationForm.clearErrors("bazaar_name");
        }
        if (locationType) locationForm.trigger("bazaar_name");
      }
    });
    return () => subscription.unsubscribe();
  }, [locationForm]);

  const tabsConfig = [
    { id: "employment", label: "Employment Details", icon: "fas fa-briefcase", color: "blue", required: true, completed: completedTabs.employment },
    { id: "salary", label: "Salary Information", icon: "fas fa-money-bill-wave", color: "green", required: false, completed: completedTabs.salary },
    ...(isSectionVisible('location') ? [{ id: "location", label: "Location Details", icon: "fas fa-map-marker-alt", color: "purple", required: false, completed: completedTabs.location }] : []),
    ...(isContractual ? [{ id: "contract", label: "Contract Details", icon: "fas fa-file-contract", color: "orange", required: false, completed: completedTabs.contract }] : []),
  ];

  const { register: registerEmployment, handleSubmit: handleEmploymentSubmit, watch: watchEmployment, formState: { errors: employmentErrors } } = employmentForm;
  const { register: registerSalary, handleSubmit: handleSalarySubmit, watch: watchSalary, formState: { errors: salaryErrors } } = salaryForm;
  const { register: registerLocation, handleSubmit: handleLocationSubmit, watch: watchLocation, formState: { errors: locationErrors } } = locationForm;
  const { register: registerContract, handleSubmit: handleContractSubmit, watch: watchContract, formState: { errors: contractErrors } } = contractForm;

  const watchedEmploymentType = watchEmployment("employment_type");
  const watchedFilerStatus = watchEmployment("filer_status");

  useEffect(() => {
    if (isOpen && !isEditMode) {
      employmentForm.reset(); salaryForm.reset(); locationForm.reset(); contractForm.reset(); setSavedEmploymentId(null);
      setCompletedTabs({ employment: false, salary: false, location: false, contract: false }); setActiveTab("employment");
    }
  }, [isOpen, isEditMode]);

  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === "" || value === null || value === undefined) return defaultValue;
    const parsed = parseFloat(value); return isNaN(parsed) ? defaultValue : parsed;
  };

  const showConfirmation = (data, type) => { setConfirmData(data); setConfirmType(type); setShowConfirmModal(true); };

  const handleConfirmedSubmit = async () => {
    try {
      setShowConfirmModal(false);
      let result;
      if (confirmType === "employment") {
        if (isEditMode && editingRecord) {
          result = await updateEmploymentRecord(editingRecord.id, { ...confirmData, effective_till: confirmData.effective_till || null, reporting_officer_id: confirmData.reporting_officer_id || null, });
          setSuccessMessage("Employment details updated successfully!");
        } else {
          result = await createEmploymentRecord({ user_id: userId, ...confirmData, effective_till: confirmData.effective_till || null, reporting_officer_id: confirmData.reporting_officer_id || null, });
          setSavedEmploymentId(result.id);
          setSuccessMessage("Employment details saved successfully! You can now add salary information in the Salary tab.");
        }
        setCompletedTabs((prev) => ({ ...prev, employment: true }));
      } else if (confirmType === "salary") {
        if (!savedEmploymentId) throw new Error("Employment record must be saved first");
        result = await createSalaryRecord({ employment_id: savedEmploymentId, basic_salary: safeParseFloat(confirmData.basic_salary), medical_allowance: safeParseFloat(confirmData.medical_allowance), house_rent: safeParseFloat(confirmData.house_rent), conveyance_allowance: safeParseFloat(confirmData.conveyance_allowance), other_allowances: safeParseFloat(confirmData.other_allowances), daily_wage_rate: confirmData.daily_wage_rate ? safeParseFloat(confirmData.daily_wage_rate) : null, bonus_eligible: Boolean(confirmData.bonus_eligible), bank_account_primary: confirmData.bank_account_primary || "", bank_name_primary: confirmData.bank_name_primary || "", bank_account_secondary: confirmData.bank_account_secondary || "", bank_name_secondary: confirmData.bank_name_secondary || "", payment_mode: confirmData.payment_mode || "Bank Transfer", payroll_status: confirmData.payroll_status || "Active", });
        setCompletedTabs((prev) => ({ ...prev, salary: true }));
        setSuccessMessage("Salary information saved successfully! You can now add location details in the Location tab.");
      } else if (confirmType === "location") {
        if (!savedEmploymentId) throw new Error("Employment record must be saved first");
        result = await createLocationRecord({ employment_id: savedEmploymentId, bazaar_name: toBazaarNameString(confirmData.bazaar_name), type: confirmData.type || "HEAD_OFFICE", full_address: confirmData.full_address || "", });
        setCompletedTabs((prev) => ({ ...prev, location: true }));
        setSuccessMessage(isContractual ? "Location details saved successfully! You can now add contract information in the Contract tab." : "Location details saved successfully! Employment record is now complete.");
      } else if (confirmType === "contract") {
        if (!savedEmploymentId) throw new Error("Employment record must be saved first");
        result = await createContractRecord({ employment_id: savedEmploymentId, contract_type: confirmData.contract_type || "Contractual", contract_number: confirmData.contract_number || "", start_date: confirmData.start_date || "", end_date: confirmData.end_date || "", probation_start: confirmData.probation_start || "", probation_end: confirmData.probation_end || "", confirmation_date: confirmData.confirmation_date || null, confirmation_status: confirmData.confirmation_status || "In Progress", performance_rating: confirmData.performance_rating || "", renewal_notes: confirmData.renewal_notes || "", });
        setCompletedTabs((prev) => ({ ...prev, contract: true }));
        setSuccessMessage("Contract information saved successfully! Employment record is now complete.");
      }
      // Refresh current page after any successful save/edit
      if (onRefresh) onRefresh();
      else setRefreshTrigger(prev => prev + 1);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(`Error saving ${confirmType} data:`, error);
      alert(`Error saving ${confirmType} data: ${error.message}`);
    }
  };

  const onEmploymentSubmit = async (data) => {
    try {
      const validationRules = getValidationRules('employment', 'designation', { required: "Designation is required" });
      if (validationRules.required && !data.designation) { alert("Please select a designation before proceeding."); return; }
      const filesToUpload = documentManager.getFilesToUpload();
      const existingDocuments = documentManager.documents.filter(doc => !doc.isNewFile);
      const documentData = {};
      const dataWithUserIdAndDocuments = { ...data, ...documentData, user_id: userId, employee_id: userId };
      const validation = validateEmploymentData(dataWithUserIdAndDocuments);
      if (!validation.isValid) { alert(`Validation errors:\n${validation.errors.join('\n')}`); return; }
      setCompletedTabs(prev => ({ ...prev, employment: true }));
      setActiveTab("salary");
    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in employment form:", error);
      alert(`Error in employment form: ${error.message}`);
    }
  };

  const onSalarySubmit = async (data) => {
    try {
      const salaryField = currentOrganization === 'MBWO' ? 'gross_salary' : 'basic_salary';
      const salaryValue = data[salaryField];
      if (!salaryValue || salaryValue <= 0) { const fieldName = currentOrganization === 'MBWO' ? 'gross salary' : 'basic salary'; alert(`Please enter a valid ${fieldName}`); return; }
      setCompletedTabs(prev => ({ ...prev, salary: true }));
      if (!isSectionVisible('location')) {
        if (isContractual) setActiveTab("contract");
      } else {
        setActiveTab("location");
      }
    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in salary form:", error);
      alert(`Error in salary form: ${error.message}`);
    }
  };

  const onLocationSubmit = async (data) => {
    try {
      const typeValue = data?.type;
      const hasType = typeof typeValue === 'string' ? typeValue.trim() !== '' : Boolean(typeValue);
      if (isFieldVisible('location', 'type') && !hasType) { alert("Please select a location type"); return; }

      const isBazaarType = typeValue === 'BAZAAR' || typeValue === 'SAHULAT_BAZAAR';
      if (isBazaarType) {
        const bazaarValue = data?.bazaar_name;
        const hasBazaar = typeof bazaarValue === 'string' ? bazaarValue.trim() !== '' : (bazaarValue !== null && bazaarValue !== undefined && bazaarValue !== '');
        if (!hasBazaar) { alert("Bazaar name is required when Bazaar or Sahulat Bazaar is selected"); return; }
      }
      setCompletedTabs(prev => ({ ...prev, location: true }));
      if (isContractual) setActiveTab("contract"); else await handleCompleteForm();
    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in location form:", error);
      alert(`Error in location form: ${error.message}`);
    }
  };

  const onContractSubmit = async (data) => {
    try {
      if (isFieldVisible('contract', 'contract_type') && !data.contract_type?.trim()) { alert("Please select a contract type"); return; }
      if (isFieldVisible('contract', 'start_date') && !data.start_date) { alert("Please select a contract start date"); return; }
      if (isFieldVisible('contract', 'end_date') && !data.end_date) { alert("Please select a contract end date"); return; }
      setCompletedTabs(prev => ({ ...prev, contract: true }));
      await handleCompleteForm();
    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in contract form:", error);
      alert(`Error in contract form: ${error.message}`);
    }
  };

  const handleCompleteForm = async () => {
    try {
      const employmentData = employmentForm.getValues();
      const salaryData = salaryForm.getValues();
      const locationData = locationForm.getValues();
      const contractData = contractForm.getValues();
      if (currentOrganization === 'MBWO' && !employmentData.designation) { alert("Please select a designation before proceeding. Designation is required for MBWO organization."); return; }
      if (currentOrganization === 'PSBA') {
        if (!employmentData.department) { alert("Please select a department before proceeding. Department is required for PSBA organization."); return; }
        if (!employmentData.role_tag) { alert("Please select a role tag before proceeding. Role tag is required for PSBA organization."); return; }
        if (!employmentData.employment_type) { alert("Please select an employment type before proceeding. Employment type is required for PSBA organization."); return; }
      }
      const completeData = {
        id: savedEmploymentId || Date.now(),
        user_id: isEditMode ? (editingRecord?.employee_id || userId) : userId,
        employee_id: isEditMode ? (editingRecord?.employee_id || userId) : userId,
        ...employmentData,
        basic_salary: currentOrganization === 'MBWO' ? 0 : parseFloat(salaryData.basic_salary || 0),
        gross_salary: currentOrganization === 'MBWO' ? parseFloat(salaryData.gross_salary || 0) : null,
        medical_allowance: parseFloat(salaryData.medical_allowance || 0),
        house_rent: parseFloat(salaryData.house_rent || 0),
        conveyance_allowance: parseFloat(salaryData.conveyance_allowance || 0),
        other_allowances: parseFloat(salaryData.other_allowances || 0),
        daily_wage_rate: parseFloat(salaryData.daily_wage_rate || 0),
        bank_account_primary: salaryData.bank_account_primary || "",
        bank_name_primary: salaryData.bank_name_primary || "",
        bank_branch_code: salaryData.bank_branch_code || "",
        payment_mode: salaryData.payment_mode || "Bank Transfer",
        payroll_status: salaryData.payroll_status || "Active",
        bazaar_name: locationData.bazaar_name || "",
        location_type: locationData.type || "HEAD_OFFICE",
        full_address: locationData.full_address || "",
        contract_type: contractData.contract_type || "",
        contract_number: contractData.contract_number || "",
        contract_start_date: contractData.start_date || "",
        contract_end_date: contractData.end_date || "",
        probation_start: contractData.probation_start || "",
        probation_end: contractData.probation_end || "",
        confirmation_status: contractData.confirmation_status || "",
        confirmation_date: contractData.confirmation_date || "",
        is_renewed: contractData.is_renewed || false,
        renewal_count: contractData.renewal_count || 0,
      };
      setPreviewData(completeData);
      setShowPreviewModal(true);
    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error preparing form data:", error);
      alert(`Error preparing form data: ${error.message}`);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      if (!previewData) return;
      setIsSubmitting(true);
      const filesToUpload = documentManager.getFilesToUpload();
      const documentsToRemove = documentManager.getDocumentsToRemove();
      const existingDocuments = documentManager.documents.filter(doc => !doc.isNewFile);
      const documentData = { ...filesToUpload };

      // If contract is renewed and no new renewal_report file is uploaded,
      // include existing renewal report metadata so backend recognizes it
      const hasNewRenewalFile = !!filesToUpload.renewal_report;
      const existingRenewalDoc = !hasNewRenewalFile
        ? existingDocuments.find(doc => doc.file_type === 'renewal_report')
        : null;

      const dataWithUserIdAndDocuments = {
        ...previewData,
        ...documentData,
        user_id: userId || editingRecord?.employee_id || editingRecord?.employee?.id || transformedInitialData?.employee_id,
        employee_id: userId || editingRecord?.employee_id || editingRecord?.employee?.id || transformedInitialData?.employee_id,
        designation: previewData.designation || "",
        department: previewData.department || "",
        role_tag: previewData.role_tag || "",
        scale_grade: previewData.scale_grade || null,
        reporting_officer_id: previewData.reporting_officer_id || "",
      };
      if (!dataWithUserIdAndDocuments.employee_id) { throw new Error("Employee ID is required for validation"); }
      const validation = validateEmploymentData(dataWithUserIdAndDocuments);
      if (!validation.isValid) { alert(`Validation errors:\n${validation.errors.join('\n')}`); setIsSubmitting(false); return; }
      const structuredData = {
        renewal_report: filesToUpload.renewal_report || previewData.renewal_report || null,
        // Pass through existing renewal report metadata when not uploading a new file
        ...(existingRenewalDoc ? {
          renewal_report_id: existingRenewalDoc.id,
          renewal_report_url: existingRenewalDoc.url,
          renewal_report_file_path: existingRenewalDoc.file_path,
          renewal_report_document_name: existingRenewalDoc.document_name,
          renewal_report_file_type: existingRenewalDoc.file_type,
          renewal_report_file_size: existingRenewalDoc.file_size,
          renewal_report_mime_type: existingRenewalDoc.mime_type,
        } : {}),
        organization: previewData.organization || "",
        designation: previewData.designation || "",
        department: previewData.department || "",
        role_tag: previewData.role_tag || "",
        scale_grade: previewData.scale_grade || null,
        reporting_officer_id: previewData.reporting_officer_id || "",
        effective_from: previewData.effective_from || "",
        employment: {
          id: previewData.id,
          organization: previewData.organization || "",
          department_id: previewData.department || "",
          designation_id: previewData.designation || "",
          scale_grade_id: previewData.scale_grade || null,
          employment_type: previewData.employment_type || "Regular",
          role_tag_id: previewData.role_tag || "",
          reporting_officer_id: previewData.reporting_officer_id || "",
          effective_from: previewData.effective_from || "",
          effective_till: previewData.effective_till || null,
          filer_status: previewData.filer_status || "non_filer",
          filer_active_status: previewData.filer_active_status || "",
          employment_status: previewData.employment_status || "active",
          is_current: previewData.is_current !== undefined ? previewData.is_current : (previewData.organization === 'MBWO' ? false : true),
          remarks: previewData.remarks || "",
          ...filesToUpload,
          documents_to_remove: documentsToRemove,
        },
        salary: {
          basic_salary: previewData.organization === 'MBWO' ? 0 : (previewData.basic_salary || 0),
          gross_salary: previewData.organization === 'MBWO' ? (previewData.gross_salary || 0) : null,
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
          renewal_report: filesToUpload.renewal_report || previewData.renewal_report || null,
        },
      };
      setShowPreviewModal(false);
      if (onSubmit) { onSubmit(structuredData); } else { console.error("❌ TabbedEmploymentForm: No onSubmit function provided"); setIsSubmitting(false); }
    } catch (error) {
      console.error("❌ TabbedEmploymentForm: Error in final submission:", error);
      alert(`Error submitting employment record: ${error.message}`);
    }
  };

  const getLocationTypeLabel = (value, organization) => {
    if (!value) return 'N/A';
    if (organization === 'PSBA') { switch (value) { case 'HEAD_QUARTER': return 'Head Quarter'; case 'SAHULAT_BAZAAR': return 'Sahulat Bazaar'; default: return value; } }
    else { switch (value) { case 'HEAD_OFFICE': return 'Head Office'; case 'BAZAAR': return 'Bazaar'; default: return value; } }
  };
  const getLabelFromId = (id, options, field = 'label') => {
    if (!id || !options || !Array.isArray(options)) return 'N/A';
    const option = options.find(opt => opt.value == id); return option ? option[field] : 'N/A';
  };
  const displayValue = (value, type = 'text') => {
    if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) return 'N/A';
    if (type === 'currency') return `PKR ${Number(value).toLocaleString()}`;
    if (type === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };
  // Map bazaar id/string to label for preview
  const getBazaarLabel = (val) => {
    if (!val && val !== 0) return 'N/A';
    const byOption = getLabelFromId(val, bazaarOptions, 'label');
    if (byOption && byOption !== 'N/A') return byOption;
    const s = String(val).trim();
    if (/^\d+$/.test(s) || s.toLowerCase() === 'null') return 'N/A';
    return s;
  };

  // Ensure we always send a string bazaar name to the backend (not a numeric ID)
  const toBazaarNameString = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const opt = Array.isArray(bazaarOptions) ? bazaarOptions.find(o => o.value == val) : null;
    if (opt && opt.label) return opt.label; // prefer dropdown label
    if (typeof val === 'object') return val.name || val.label || '';
    const s = String(val).trim();
    if (!s || s.toLowerCase() === 'null' || /^\d+$/.test(s)) return '';
    return s;
  };

  const handleContinueToNext = () => {
    setShowSuccessModal(false);
    if (activeTab === "employment") setActiveTab("salary");
    else if (activeTab === "salary") setActiveTab("location");
    else if (activeTab === "location" && isContractual) setActiveTab("contract");
  };
  const handleFinishLater = () => {
    setShowSuccessModal(false);
    handleClose();
    if (onSubmit && completedTabs.employment) {
      const employmentData = employmentForm.getValues();
      const salaryData = completedTabs.salary ? salaryForm.getValues() : {};
      const locationData = completedTabs.location ? locationForm.getValues() : {};
      const contractData = completedTabs.contract ? contractForm.getValues() : {};
      const completeData = { id: savedEmploymentId, ...employmentData, ...salaryData, ...locationData, ...contractData };
      onSubmit(completeData);
    }
  };

  useEffect(() => {
    const loadEmploymentData = async () => {
      if (isEditMode && editingRecord?.id && !isLoadingEmployment && !dataLoadedRef.current && effectiveIsOpen && !isSubmitting && isOpen) {
        try {
          setIsLoadingEmployment(true);
          const employmentData = await employmentService.getEmploymentById(editingRecord.id);
          if (employmentData) {
            const transformedData = {
              id: employmentData.id,
              employee_id: employmentData.employee_id,
              user_id: employmentData.employee_id,
              employment: {
                organization: employmentData.organization || "",
                department: employmentData.department_id || "",
                designation: employmentData.designation_id || "",
                employment_type: employmentData.employment_type || "Regular",
                role_tag: employmentData.role_tag_id || "",
                effective_from: employmentData.effective_from ? employmentData.effective_from.split('T')[0] : "",
                effective_till: employmentData.effective_till ? employmentData.effective_till.split('T')[0] : "",
                reporting_officer_id: employmentData.reporting_officer_id || "",
                remarks: employmentData.remarks || "",
                scale_grade: employmentData.scale_grade_id || "",
                filer_status: employmentData.filer_status || "non_filer",
                filer_active_status: employmentData.filer_active_status || "",
                employment_status: employmentData.employment_status || "active",
                is_current: employmentData.is_current || false,
                is_on_probation: employmentData.is_on_probation || false,
                probation_end_date: employmentData.probation_end_date ? employmentData.probation_end_date.split('T')[0] : "",
              },
              salary: employmentData.salary ? {
                ...employmentData.salary,
                salary_effective_from: employmentData.salary.salary_effective_from ? employmentData.salary.salary_effective_from.split('T')[0] : "",
                salary_effective_till: employmentData.salary.salary_effective_till ? employmentData.salary.salary_effective_till.split('T')[0] : "",
              } : {},
              location: employmentData.location || {},
              contract: employmentData.contract ? {
                ...employmentData.contract,
                start_date: employmentData.contract.start_date ? employmentData.contract.start_date.split('T')[0] : "",
                end_date: employmentData.contract.end_date ? employmentData.contract.end_date.split('T')[0] : "",
                probation_start: employmentData.contract.probation_start ? employmentData.contract.probation_start.split('T')[0] : "",
                probation_end: employmentData.contract.probation_end ? employmentData.contract.probation_end.split('T')[0] : "",
                confirmation_date: employmentData.contract.confirmation_date ? employmentData.contract.confirmation_date.split('T')[0] : "",
              } : {},
            };
            loadDataIntoForms(transformedData);
            if (employmentData.documents && employmentData.documents.length > 0) {
              documentManager.reset(employmentData.documents);
            }
            setPreviousOrganization(employmentData.organization);
            setIsInitialLoad(false);
            dataLoadedRef.current = true;
          }
        } catch (error) {
          console.error("❌ Error loading employment data:", error);
        } finally {
          setIsLoadingEmployment(false);
        }
      }
    };
    loadEmploymentData();
  }, [isEditMode, editingRecord?.id, isLoadingEmployment, refreshTrigger]);

  useEffect(() => { if (!isEditMode && effectiveIsOpen) { setIsInitialLoad(true); setPreviousOrganization(null); setIsSubmitting(false); } }, [effectiveIsOpen, isEditMode]);
  useEffect(() => { if (isEditMode && effectiveIsOpen) { setIsSubmitting(false); } }, [effectiveIsOpen, isEditMode]);
  useEffect(() => { if (!effectiveIsOpen && isSubmitting) { setIsSubmitting(false); } }, [effectiveIsOpen, isSubmitting]);
  useEffect(() => { if (!effectiveIsOpen && isEditMode && editingRecord) { /* keep state */ } }, [effectiveIsOpen, isEditMode, editingRecord]);

  const refreshFormData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  useImperativeHandle(ref, () => ({ refreshFormData }), [refreshFormData]);
  useEffect(() => { if (!isOpen && isSubmitting) { setIsSubmitting(false); } }, [isOpen, isSubmitting]);

  if (!formOptions) {
    return (
      <EnhancedModal isOpen={effectiveIsOpen} onClose={handleClose} title="Add Employment Record" size="lg">
        <div className="p-8 text-center"><LoadingSpinner size="md" text="Loading form options..." /></div>
      </EnhancedModal>
    );
  }

  return (
    <>
      <EnhancedModal
        isOpen={effectiveIsOpen}
        onClose={handleClose}
        title={`${isEditMode ? "Edit" : "Add"} Employment Record${employeeName ? ` - ${employeeName}` : ""}`}
        size="xl"
        maxHeight="95vh"
      >
        <div ref={modalContentRef} className="p-6 modal-content overflow-y-auto max-h-[80vh]" onScroll={(e) => setScrollPosition(e.target.scrollTop)} style={{ scrollBehavior: 'smooth' }}>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabsConfig.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id ? `border-${tab.color}-500 text-${tab.color}-600` : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                  {tab.completed && (<i className="fas fa-check-circle text-green-500 ml-2"></i>)}
                </button>
              ))}
            </nav>
          </div>

          {/* Completion Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Completion Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tabsConfig.map((tab) => (
                <div key={tab.id} className="flex items-center">
                  <i className={`fas ${tab.completed ? "fa-check-circle text-green-500" : "fa-clock text-gray-400"} mr-2`}></i>
                  <span className={`text-sm ${tab.completed ? "text-green-700 font-medium" : "text-gray-600"}`}>{tab.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === "employment" && (
              <EmploymentTab
                employmentForm={employmentForm}
                formOptions={formOptions}
                availableDesignations={availableDesignations}
                formLoading={formLoading}
                getFieldClasses={getFieldClasses}
                getValidationRules={getValidationRules}
                handleOrganizationChange={handleOrganizationChange}
                onEmploymentSubmit={onEmploymentSubmit}
                isEditMode={isEditMode}
                currentOrganization={currentOrganization}
                watchedEmploymentType={watchedEmploymentType}
                watchedFilerStatus={watchedFilerStatus}
                employmentErrors={employmentErrors}
              />
            )}

            {activeTab === "salary" && (
              <SalaryTab
                salaryForm={salaryForm}
                onSalarySubmit={onSalarySubmit}
                currentOrganization={currentOrganization}
                watchedEmploymentType={watchedEmploymentType}
                getFieldClasses={getFieldClasses}
                salaryErrors={salaryErrors}
              />
            )}

            {activeTab === "location" && (
              <LocationTab
                locationForm={locationForm}
                onLocationSubmit={onLocationSubmit}
                isSectionVisible={isSectionVisible}
                getFieldClasses={getFieldClasses}
                getValidationRules={getValidationRules}
                bazaarOptions={bazaarOptions}
                currentOrganization={currentOrganization}
                isContractual={isContractual}
                locationErrors={locationErrors}
              />
            )}

            {activeTab === "contract" && isContractual && (
              <ContractTab
                contractForm={contractForm}
                onContractSubmit={onContractSubmit}
                formOptions={formOptions}
                contractErrors={contractErrors}
                documentManager={documentManager}
                isEditMode={isEditMode}
              />
            )}
          </div>
        </div>
      </EnhancedModal>

      {/* Confirmation Modal */}
      <EnhancedModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Submission" size="md">
        <div className="p-6">
          <div className="text-center mb-6">
            <i className="fas fa-question-circle text-4xl text-blue-500 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Save {confirmType?.charAt(0).toUpperCase() + confirmType?.slice(1)} Information?</h3>
            <p className="text-gray-600">Are you sure you want to save this {confirmType} information? You can add more details later if needed.</p>
          </div>
          <div className="flex space-x-4">
            <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">Cancel</button>
            <button onClick={handleConfirmedSubmit} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"><i className="fas fa-save mr-2"></i>Yes, Save</button>
          </div>
        </div>
      </EnhancedModal>

      {/* Success Modal */}
      <EnhancedModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Successfully Saved!" size="md">
        <div className="p-6">
          <div className="text-center mb-6">
            <i className="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Saved Successfully!</h3>
            <p className="text-gray-600">{successMessage}</p>
          </div>
          <div className="flex space-x-4">
            <button onClick={handleFinishLater} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"><i className="fas fa-times mr-2"></i>Finish Later</button>
            {((activeTab === "employment" && !completedTabs.salary) || (activeTab === "salary" && !completedTabs.location) || (activeTab === "location" && isContractual && !completedTabs.contract)) && (
              <button onClick={handleContinueToNext} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"><i className="fas fa-arrow-right mr-2"></i>Continue to Next Tab</button>
            )}
          </div>
        </div>
      </EnhancedModal>

      {/* Preview/Confirmation Modal */}
      <EnhancedModal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} title="Review Employment Record Before Saving" size="xl">
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {previewData && (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Please review all information before saving</h3>
                <p className="text-gray-600">Fields showing "N/A" indicate no value was entered. You can go back to edit or proceed to save.</p>
              </div>

              {/* Employment Info */}
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Employment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-600">Organization:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.organization)}</span></div>
                  <div><span className="text-gray-600">Department:</span> <span className="ml-1 text-gray-900">{getLabelFromId(previewData.department, formOptions?.departments)}</span></div>
                  <div><span className="text-gray-600">Designation:</span> <span className="ml-1 text-gray-900">{getLabelFromId(previewData.designation, formOptions?.designations)}</span></div>
                  <div><span className="text-gray-600">Role Tag:</span> <span className="ml-1 text-gray-900">{getLabelFromId(previewData.role_tag, formOptions?.roleTags)}</span></div>
                  <div><span className="text-gray-600">Scale Grade:</span> <span className="ml-1 text-gray-900">{getLabelFromId(previewData.scale_grade, formOptions?.scaleGrades)}</span></div>
                  <div><span className="text-gray-600">Employment Type:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.employment_type)}</span></div>
                  <div><span className="text-gray-600">Effective From:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.effective_from)}</span></div>
                  <div><span className="text-gray-600">Effective Till:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.effective_till)}</span></div>
                  <div><span className="text-gray-600">Reporting Officer ID:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.reporting_officer_id)}</span></div>
                  <div className="md:col-span-2"><span className="text-gray-600">Remarks:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.remarks)}</span></div>
                </div>
              </div>

              {/* Salary Info */}
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Salary Information</h4>
                {previewData.organization === 'MBWO' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-600">Gross Salary:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.gross_salary, 'currency')}</span></div>
                    <div><span className="text-gray-600">Payment Mode:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.payment_mode)}</span></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-600">Basic:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.basic_salary, 'currency')}</span></div>
                    <div><span className="text-gray-600">Medical:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.medical_allowance, 'currency')}</span></div>
                    <div><span className="text-gray-600">House Rent:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.house_rent, 'currency')}</span></div>
                    <div><span className="text-gray-600">Conveyance:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.conveyance_allowance, 'currency')}</span></div>
                    <div><span className="text-gray-600">Other:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.other_allowances, 'currency')}</span></div>
                    <div className="md:col-span-2"><span className="text-gray-600">Payment Mode:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.payment_mode)}</span></div>
                  </div>
                )}
              </div>

              {/* Location Info */}
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Location Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-600">Type:</span> <span className="ml-1 text-gray-900">{getLocationTypeLabel(previewData.location_type, previewData.organization)}</span></div>
                  {(previewData.location_type === 'BAZAAR' || previewData.location_type === 'SAHULAT_BAZAAR') && (
                    <div><span className="text-gray-600">Bazaar:</span> <span className="ml-1 text-gray-900">{getBazaarLabel(previewData.bazaar_name)}</span></div>
                  )}
                  <div className="md:col-span-2"><span className="text-gray-600">Description:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.full_address)}</span></div>
                </div>
              </div>

              {/* Contract Info */}
              {isContractual && (
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Contract Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-600">Type:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.contract_type)}</span></div>
                    <div><span className="text-gray-600">Number:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.contract_number)}</span></div>
                    <div><span className="text-gray-600">Start Date:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.contract_start_date)}</span></div>
                    <div><span className="text-gray-600">End Date:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.contract_end_date)}</span></div>
                    <div><span className="text-gray-600">Is Renewed:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.is_renewed, 'boolean')}</span></div>
                    <div><span className="text-gray-600">Renewal Count:</span> <span className="ml-1 text-gray-900">{displayValue(previewData.renewal_count)}</span></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-4 pt-6 border-t border-gray-200">
                <button onClick={() => setShowPreviewModal(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"><i className="fas fa-arrow-left mr-2"></i>Go Back to Edit</button>
                <div className="flex gap-3">
                  <button onClick={handleFinalSubmit} className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"><i className="fas fa-check mr-2"></i>Confirm & Save Employment Record</button>
                  {isEditMode && savedEmploymentId && (
                    <button type="button" onClick={handleCloneEmployment} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium" title="Clone this employment as a new current record"><i className="fas fa-clone mr-2"></i>Clone as New</button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </EnhancedModal>
    </>
  );
});

export default TabbedEmploymentForm;
