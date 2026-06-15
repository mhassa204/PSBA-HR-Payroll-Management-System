import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getOrganizationConfig,
  ORGANIZATION_VALIDATION_RULES,
} from "../../../../constants/organizationFieldConfig";
import {
  ArrowRight,
  Calendar,
  Building2,
  Briefcase,
  DollarSign,
  MapPin,
  FileText,
  TrendingUp,
  Trash2,
} from "lucide-react";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import { employmentService } from "../../services/employmentService";

import EnhancedModal from "../../../../components/ui/EnhancedModal";

const HistoryTab = ({ employmentId, userId }) => {
  const [groupedHistory, setGroupedHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingHistory, setEditingHistory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formOptions, setFormOptions] = useState(null);
  const [employmentOrg, setEmploymentOrg] = useState(null);
  const [orgConfig, setOrgConfig] = useState(null);
  const employmentFieldOptions = useMemo(
    () => [
      // Core employment fields
      "department_id",
      "designation_id",
      "role_tag_id",
      "scale_grade_id",
      "location_id",
      "employment_type",
      "employment_status",
      "is_current",
      "filer_status",
      "filer_active_status",
      "is_on_probation",
      "probation_end_date",
      "reporting_officer_id",
      "office_location",
      "remarks",
      "effective_from",
      "effective_till",
      // Salary fields
      "basic_salary",
      "gross_salary",
      "medical_allowance",
      "house_rent",
      "conveyance_allowance",
      "other_allowances",
      "daily_wage_rate",
      "bank_account_primary",
      "bank_name_primary",
      "payment_mode",
      "salary_effective_from",
      "salary_effective_till",
      "payroll_status",
      // Contract fields
      "contract_type",
      "contract_number",
      "start_date",
      "end_date",
      "renewal_count",
      "confirmation_status",
      "confirmation_date",
      "is_renewed",
    ],
    []
  );

  const [formData, setFormData] = useState({
    field_name: "",
    old_value: "",
    new_value: "",
    changed_at: "",
    change_description: "",
    remarks: "",
  });
  const newValueRef = useRef(null);
  const oldValueRef = useRef(null);
  const changeDescriptionRef = useRef(null);
  const remarksRef = useRef(null);
  const [activeField, setActiveField] = useState("");

  // Generalized focus retention for active input (prevents blur after keystroke)
  useEffect(() => {
    if (!showManualModal || !activeField) return;
    const refMap = {
      new_value: newValueRef,
      old_value: oldValueRef,
      change_description: changeDescriptionRef,
      remarks: remarksRef,
    };
    const targetRef = refMap[activeField];
    if (targetRef?.current && document.activeElement !== targetRef.current) {
      targetRef.current.focus();
    }
  }, [
    showManualModal,
    activeField,
    formData.old_value,
    formData.new_value,
    formData.change_description,
    formData.remarks,
  ]);

  const loadHistory = useCallback(async () => {
    if (!employmentId) return;

    try {
      setIsLoading(true);
      const response = await employmentService.getEmploymentHistoryGrouped(
        employmentId
      );
      if (response.success) {
        setGroupedHistory(response.history);
      }
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [employmentId]);

  useEffect(() => {
    if (employmentId) {
      loadHistory();
    }
  }, [employmentId, loadHistory]);

  // Load employment record to determine organization for conditional field rendering
  useEffect(() => {
    const loadEmployment = async () => {
      try {
        if (!employmentId) return;
        const emp = await employmentService.getEmploymentById(employmentId);
        const org =
          emp?.organization ||
          emp?.employment?.organization ||
          emp?.employment?.organization_name ||
          null;
        setEmploymentOrg(org);
        setOrgConfig(getOrganizationConfig(org));
      } catch (err) {
        console.error("Error loading employment for org context:", err);
      }
    };
    loadEmployment();
  }, [employmentId]);

  const handleDelete = async (historyId) => {
    if (
      !window.confirm("Are you sure you want to delete this history record?")
    ) {
      return;
    }

    try {
      setDeletingId(historyId);
      await employmentService.deleteHistoryRecord(historyId);
      // Reload history after deletion
      await loadHistory();
    } catch (err) {
      console.error("Error deleting history record:", err);
      alert("Failed to delete history record");
    } finally {
      setDeletingId(null);
    }
  };

  const openAddManual = () => {
    setEditingHistory(null);
    setFormData({
      field_name: "",
      old_value: "",
      new_value: "",
      changed_at: "",
      change_description: "",
      remarks: "",
    });
    setShowManualModal(true);
  };

  const openEditHistory = (item) => {
    setEditingHistory(item);
    setFormData({
      field_name: item.field_name === "manual" ? "" : item.field_name,
      old_value: item.old_value_label || item.old_value || "",
      new_value: item.new_value_label || item.new_value || "",
      changed_at: item.changed_at
        ? new Date(item.changed_at).toISOString().slice(0, 16)
        : "",
      change_description: item.change_description || "",
      remarks: item.remarks || "",
    });
    setShowManualModal(true);
  };

  const handleModalClose = () => {
    if (saving) return;
    setShowManualModal(false);
    setEditingHistory(null);
    setActiveField("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!employmentId) return;
    try {
      setSaving(true);
      // Basic validation
      if (!formData.field_name) {
        alert("Please select a field");
        setSaving(false);
        return;
      }
      if (!formData.new_value) {
        alert("Please enter a new value");
        setSaving(false);
        return;
      }
      const payload = {
        field_name: formData.field_name,
        old_value: formData.old_value || undefined,
        old_value_label: formData.old_value_label || formData.old_value,
        new_value: formData.new_value,
        new_value_label: formData.new_value_label || formData.new_value,
        change_description: formData.change_description || undefined,
        remarks: formData.remarks || undefined,
        changed_by: userId || undefined,
        changed_at: formData.changed_at || undefined,
      };
      if (editingHistory) {
        await employmentService.updateEmploymentHistoryEntry(
          editingHistory.id,
          payload
        );
      } else {
        await employmentService.createEmploymentHistoryEntry(
          employmentId,
          payload
        );
      }
      await loadHistory();
      setShowManualModal(false);
      setEditingHistory(null);
    } catch (err) {
      console.error("Error saving manual history entry:", err);
      alert(err.message || "Failed to save history entry");
    } finally {
      setSaving(false);
    }
  };

  const getHistoryTypeConfig = (type) => {
    const configs = {
      TRANSFER: {
        icon: MapPin,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        label: "Transfer History",
      },
      REDESIGNATION: {
        icon: Briefcase,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        borderColor: "border-purple-200",
        label: "Redesignation History",
      },
      SALARY: {
        icon: DollarSign,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        label: "Salary History",
      },
      STATUS: {
        icon: TrendingUp,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        label: "Status History",
      },
      CONTRACT: {
        icon: FileText,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
        borderColor: "border-indigo-200",
        label: "Contract History",
      },
      OTHER: {
        icon: Building2,
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        label: "Other Changes",
      },
    };
    return configs[type] || configs.OTHER;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return "—";
    if (value === "true") return "Yes";
    if (value === "false") return "No";
    return String(value);
  };

  const getFieldLabel = (fieldName) => {
    const labels = {
      department_id: "Department",
      designation_id: "Designation",
      role_tag_id: "Role Tag",
      scale_grade_id: "Scale Grade",
      location_id: "Location",
      employment_type: "Employment Type",
      employment_status: "Employment Status",
      is_current: "Current Status",
      filer_status: "Filer Status",
      filer_active_status: "Filer Active Status",
      is_on_probation: "Probation",
      probation_end_date: "Probation End Date",
      reporting_officer_id: "Reporting Officer",
      office_location: "Office Location",
      remarks: "Remarks",
      effective_from: "Effective From",
      effective_till: "Effective Till",
      basic_salary: "Basic Salary",
      gross_salary: "Gross Salary",
      medical_allowance: "Medical Allowance",
      house_rent: "House Rent",
      conveyance_allowance: "Conveyance Allowance",
      other_allowances: "Other Allowances",
      daily_wage_rate: "Daily Wage Rate",
      bank_account_primary: "Bank Account",
      bank_name_primary: "Bank Name",
      payment_mode: "Payment Mode",
      salary_effective_from: "Salary Effective From",
      salary_effective_till: "Salary Effective Till",
      payroll_status: "Payroll Status",
      contract_type: "Contract Type",
      contract_number: "Contract Number",
      start_date: "Start Date",
      end_date: "End Date",
      renewal_count: "Renewal Count",
      confirmation_status: "Confirmation Status",
      confirmation_date: "Confirmation Date",
      is_renewed: "Renewed",
    };
    return labels[fieldName] || fieldName;
  };

  const renderHistorySection = (type, items) => {
    if (!items || items.length === 0) return null;

    const config = getHistoryTypeConfig(type);
    const Icon = config.icon;

    return (
      <div
        key={type}
        className={`mb-6 rounded-lg border ${config.borderColor} ${config.bgColor} p-6`}
      >
        <div className="flex items-center gap-3 mb-4">
          <Icon className={`w-6 h-6 ${config.color}`} />
          <h3 className={`text-lg font-semibold ${config.color}`}>
            {config.label}
          </h3>
          <span className="ml-auto px-3 py-1 rounded-full bg-white text-sm font-medium text-gray-700">
            {items.length} {items.length === 1 ? "change" : "changes"}
          </span>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(item.changed_at)}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditHistory(item)}
                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    title="Edit this history record"
                  >
                    <Briefcase className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Delete this history record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {item.change_description && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
                  <strong>Change:</strong> {item.change_description}
                </div>
              )}

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-3 text-sm">
                  <div className="col-span-3 text-gray-600 font-medium">
                    {getFieldLabel(item.field_name)}:
                  </div>
                  <div className="col-span-9">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          item.old_value
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {formatValue(item.old_value_label || item.old_value)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                        {formatValue(item.new_value_label || item.new_value)}
                      </span>
                    </div>
                  </div>
                </div>

                {item.remarks && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                    <strong>Remarks:</strong> {item.remarks}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const allHistoryTypes = groupedHistory ? Object.keys(groupedHistory) : [];
  const hasAnyHistory = groupedHistory
    ? allHistoryTypes.some((type) => groupedHistory[type]?.length > 0)
    : false;

  // Load dropdown options when modal opens to assist user selection
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const options = await employmentService.getFormOptions();
        setFormOptions(options);
      } catch (err) {
        console.error("Failed to fetch form options", err);
      }
    };
    if (showManualModal && !formOptions) {
      fetchOptions();
    }
  }, [showManualModal, formOptions]);

  const enumOptions = {
    employment_type: [
      { value: "Regular", label: "Regular" },
      { value: "Contract", label: "Contract" },
      { value: "Daily Wager", label: "Daily Wager" },
      { value: "Probation", label: "Probation" },
      { value: "Internship", label: "Internship" },
    ],
    employment_status: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "terminated", label: "Terminated" },
      { value: "resigned", label: "Resigned" },
      { value: "retired", label: "Retired" },
    ],
    filer_status: [
      { value: "filer", label: "Filer" },
      { value: "non_filer", label: "Non Filer" },
    ],
    filer_active_status: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
    payment_mode: [
      { value: "cash", label: "Cash" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "cheque", label: "Cheque" },
    ],
  };

  // Map fields to input types
  const fieldMeta = useMemo(() => {
    const orgUpper = String(employmentOrg).toUpperCase();
    const isPMBMC = orgUpper === "PMBMC";
    const isMBWO = orgUpper === "MBWO";
    return {
      department_id: isPMBMC
        ? { type: "text" }
        : { type: "relation", optionsKey: "departments" },
      // MBWO requires designation as free text; PMBMC also allowed as text
      designation_id:
        isPMBMC || isMBWO
          ? { type: "text" }
          : { type: "relation", optionsKey: "designations" },
      role_tag_id: { type: "relation", optionsKey: "roleTags" },
      scale_grade_id: { type: "relation", optionsKey: "scaleGrades" },
      location_id: { type: "relation", optionsKey: "locations" },
      reporting_officer_id: { type: "relation", optionsKey: "users" },
      employment_type: { type: "enum", enumKey: "employment_type" },
      employment_status: { type: "enum", enumKey: "employment_status" },
      filer_status: { type: "enum", enumKey: "filer_status" },
      filer_active_status: { type: "enum", enumKey: "filer_active_status" },
      payment_mode: { type: "enum", enumKey: "payment_mode" },
      payroll_status: { type: "boolean" },
      is_current: { type: "boolean" },
      is_on_probation: { type: "boolean" },
      is_renewed: { type: "boolean" },
      effective_from: { type: "date" },
      effective_till: { type: "date" },
      salary_effective_from: { type: "date" },
      salary_effective_till: { type: "date" },
      start_date: { type: "date" },
      end_date: { type: "date" },
      confirmation_date: { type: "date" },
      probation_end_date: { type: "date" },
      basic_salary: { type: "number" },
      gross_salary: { type: "number" },
      medical_allowance: { type: "number" },
      house_rent: { type: "number" },
      conveyance_allowance: { type: "number" },
      other_allowances: { type: "number" },
      daily_wage_rate: { type: "number" },
      renewal_count: { type: "number" },
      bank_account_primary: { type: "text" },
      bank_name_primary: { type: "text" },
      contract_type: { type: "text" },
      contract_number: { type: "text" },
      office_location: { type: "text" },
      remarks: { type: "text" },
    };
  }, [employmentOrg]);

  const fieldOptionSource = useMemo(() => {
    return {
      departments: formOptions?.departments || [],
      designations: formOptions?.designations || [],
      roleTags: formOptions?.roleTags || [],
      scaleGrades: formOptions?.scaleGrades || [],
      locations: formOptions?.locations || [],
      users: formOptions?.users || [],
      employment_type: enumOptions.employment_type,
      employment_status: enumOptions.employment_status,
      filer_status: enumOptions.filer_status,
      filer_active_status: enumOptions.filer_active_status,
      payment_mode: enumOptions.payment_mode,
    };
  }, [formOptions]);

  const handleOptionSelect = (e) => {
    const selectedId = e.target.value;
    const meta = fieldMeta[formData.field_name];
    const optionsKey = meta?.optionsKey || meta?.enumKey;
    const options = optionsKey ? fieldOptionSource[optionsKey] || [] : [];
    const selected = options.find(
      (o) => String(o.value) === String(selectedId)
    );

    const getDepartmentNameById = (id) => {
      const dep = (fieldOptionSource.departments || []).find(
        (d) => String(d.value) === String(id)
      );
      return dep?.label || "";
    };

    const formatOptionLabel = (fieldName, opt) => {
      if (fieldName === "designation_id" && opt) {
        const depName =
          opt.department_label ||
          opt.departmentName ||
          opt.department ||
          getDepartmentNameById(opt.department_id || opt.departmentId);
        return depName ? `${opt.label} - ${depName}` : opt.label;
      }
      return opt?.label ?? String(selectedId);
    };
    setFormData((prev) => ({
      ...prev,
      new_value: selectedId,
      new_value_label: formatOptionLabel(formData.field_name, selected),
    }));
  };

  const handleOldOptionSelect = (e) => {
    const selectedId = e.target.value;
    const meta = fieldMeta[formData.field_name];
    const optionsKey = meta?.optionsKey || meta?.enumKey;
    const options = optionsKey ? fieldOptionSource[optionsKey] || [] : [];
    const selected = options.find(
      (o) => String(o.value) === String(selectedId)
    );

    const getDepartmentNameById = (id) => {
      const dep = (fieldOptionSource.departments || []).find(
        (d) => String(d.value) === String(id)
      );
      return dep?.label || "";
    };

    const formatOptionLabel = (fieldName, opt) => {
      if (fieldName === "designation_id" && opt) {
        const depName =
          opt.department_label ||
          opt.departmentName ||
          opt.department ||
          getDepartmentNameById(opt.department_id || opt.departmentId);
        return depName ? `${opt.label} - ${depName}` : opt.label;
      }
      return opt?.label ?? String(selectedId);
    };
    setFormData((prev) => ({
      ...prev,
      old_value: selectedId,
      old_value_label: formatOptionLabel(formData.field_name, selected),
    }));
  };

  // Friendly field labels per organization
  const getFriendlyLabel = (fieldName) => {
    const labels =
      ORGANIZATION_VALIDATION_RULES?.[
        String(employmentOrg || "PSBA").toUpperCase()
      ]?.fieldLabels || {};
    const defaultLabels = {
      department_id: "Department",
      designation_id: "Designation",
      role_tag_id: "Role Tag",
      scale_grade_id: "Scale/Grade",
      location_id: "Location",
      reporting_officer_id: "Reporting Officer",
      employment_type: "Employment Type",
      employment_status: "Employment Status",
      filer_status: "Filer Status",
      filer_active_status: "Filer Active Status",
      is_current: "Current Employment",
      is_on_probation: "On Probation",
      probation_end_date: "Probation End Date",
      effective_from: "Effective From",
      effective_till: "Effective Till",
      basic_salary: "Basic Salary",
      gross_salary: "Gross Salary",
      medical_allowance: "Medical Allowance",
      house_rent: "House Rent",
      conveyance_allowance: "Conveyance Allowance",
      other_allowances: "Other Allowances",
      daily_wage_rate: "Daily Wage Rate",
      bank_account_primary: "Bank Account",
      bank_name_primary: "Bank Name",
      payment_mode: "Payment Mode",
      salary_effective_from: "Salary Effective From",
      salary_effective_till: "Salary Effective Till",
      contract_type: "Contract Type",
      contract_number: "Contract Number",
      start_date: "Start Date",
      end_date: "End Date",
      renewal_count: "Renewal Count",
      confirmation_status: "Confirmation Status",
      confirmation_date: "Confirmation Date",
      is_renewed: "Renewed",
      office_location: "Office Location",
      remarks: "Remarks",
    };
    const mapped = {
      department_id: labels.department || defaultLabels.department_id,
      designation_id: labels.designation || defaultLabels.designation_id,
      role_tag_id: labels.role_tag || defaultLabels.role_tag_id,
      scale_grade_id: labels.scale_grade || defaultLabels.scale_grade_id,
      employment_type: labels.employment_type || defaultLabels.employment_type,
      employment_status:
        labels.employment_status || defaultLabels.employment_status,
      is_current: labels.is_current || defaultLabels.is_current,
      filer_status: labels.filer_status || defaultLabels.filer_status,
      filer_active_status:
        labels.filer_active_status || defaultLabels.filer_active_status,
      effective_from: labels.effective_from || defaultLabels.effective_from,
      effective_till: labels.effective_till || defaultLabels.effective_till,
      reporting_officer_id:
        labels.reporting_officer_id || defaultLabels.reporting_officer_id,
      office_location: labels.office_location || defaultLabels.office_location,
      remarks: labels.remarks || defaultLabels.remarks,
    };
    return mapped[fieldName] || defaultLabels[fieldName] || fieldName;
  };

  // Filter fields by organization visibility across sections
  const visibleEmploymentFields = useMemo(() => {
    if (!orgConfig) return employmentFieldOptions;

    // Map each field to its section for org visibility rules
    const fieldSectionMap = {
      // employment section
      department_id: "employment",
      designation_id: "employment",
      role_tag_id: "employment",
      scale_grade_id: "employment",
      location_id: "location",
      employment_type: "employment",
      employment_status: "employment",
      is_current: "employment",
      filer_status: "employment",
      filer_active_status: "employment",
      is_on_probation: "employment",
      probation_end_date: "employment",
      reporting_officer_id: "employment",
      office_location: "employment",
      remarks: "employment",
      effective_from: "employment",
      effective_till: "employment",
      // salary section
      basic_salary: "salary",
      gross_salary: "salary",
      medical_allowance: "salary",
      house_rent: "salary",
      conveyance_allowance: "salary",
      other_allowances: "salary",
      daily_wage_rate: "salary",
      bank_account_primary: "salary",
      bank_name_primary: "salary",
      payment_mode: "salary",
      salary_effective_from: "salary",
      salary_effective_till: "salary",
      payroll_status: "salary",
      // contract section
      contract_type: "contract",
      contract_number: "contract",
      start_date: "contract",
      end_date: "contract",
      renewal_count: "contract",
      confirmation_status: "contract",
      confirmation_date: "contract",
      is_renewed: "contract",
    };

    const { visibleFields = {}, hiddenFields = {} } = orgConfig;

    const isFieldVisibleByOrg = (field) => {
      const section = fieldSectionMap[field] || "employment";
      const visible = visibleFields[section];
      const hidden = new Set(hiddenFields[section] || []);

      // Normalize identifiers for hidden list comparisons
      const normalizedForHidden = field
        .replace("_id", "")
        .replace("_status", "status");

      if (visible === "all") {
        return !hidden.has(normalizedForHidden);
      }
      if (Array.isArray(visible)) {
        // Map shorthand names to actual field keys when necessary
        const allowed = new Set(
          visible.map((f) => {
            switch (f) {
              case "department":
                return "department_id";
              case "designation":
                return "designation_id";
              case "role_tag":
                return "role_tag_id";
              case "scale_grade":
                return "scale_grade_id";
              default:
                return f;
            }
          })
        );
        return allowed.has(field);
      }
      // Default visible
      return true;
    };

    return employmentFieldOptions.filter((f) => isFieldVisibleByOrg(f));
  }, [orgConfig, employmentFieldOptions]);

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Employment History
          </h2>
          <p className="text-sm text-gray-600">
            Complete record of all changes made to this employment record
          </p>
          <div className="mt-4">
            <button
              onClick={openAddManual}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Add Manual History Entry
            </button>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        )}
        {!isLoading && !groupedHistory && (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No history loaded yet.</p>
          </div>
        )}
        {!isLoading && groupedHistory && !hasAnyHistory && (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No employment history recorded yet.</p>
          </div>
        )}
        {!isLoading &&
          hasAnyHistory &&
          allHistoryTypes.map((type) => {
            const items = groupedHistory[type];
            return renderHistorySection(type, items);
          })}
      </div>
      <EnhancedModal
        isOpen={showManualModal}
        onClose={handleModalClose}
        title={editingHistory ? "Edit History Entry" : "Add History Entry"}
        size="lg"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field
              </label>
              <select
                name="field_name"
                value={formData.field_name}
                onChange={handleFormChange}
                className="w-full border rounded px-2 py-2 text-sm"
              >
                <option value="">Select a field</option>
                {visibleEmploymentFields.map((f) => (
                  <option key={f} value={f}>
                    {getFriendlyLabel(f)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Value
              </label>
              {(() => {
                const meta = fieldMeta[formData.field_name];
                if (!meta) {
                  return (
                    <input
                      name="new_value"
                      value={formData.new_value}
                      onChange={handleFormChange}
                      onFocus={() => setActiveField("new_value")}
                      className="w-full border rounded px-2 py-2 text-sm"
                      placeholder="Enter new value"
                      ref={newValueRef}
                    />
                  );
                }
                if (meta.type === "relation" || meta.type === "enum") {
                  const optionsKey = meta.optionsKey || meta.enumKey;
                  const opts = optionsKey
                    ? fieldOptionSource[optionsKey] || []
                    : [];
                  const getDepartmentNameById = (id) => {
                    const dep = (fieldOptionSource.departments || []).find(
                      (d) => String(d.value) === String(id)
                    );
                    return dep?.label || "";
                  };
                  const formatOptionLabel = (fieldName, opt) => {
                    if (fieldName === "designation_id" && opt) {
                      const depName =
                        opt.department_label ||
                        opt.departmentName ||
                        opt.department ||
                        getDepartmentNameById(
                          opt.department_id || opt.departmentId
                        );
                      return depName ? `${opt.label} - ${depName}` : opt.label;
                    }
                    return opt.label;
                  };
                  return (
                    <select
                      name="new_value"
                      value={formData.new_value}
                      onChange={handleOptionSelect}
                      onFocus={() => setActiveField("new_value")}
                      className="w-full border rounded px-2 py-2 text-sm"
                      ref={newValueRef}
                    >
                      <option value="">
                        Select {getFriendlyLabel(formData.field_name)}
                      </option>
                      {opts.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {formatOptionLabel(formData.field_name, opt)}
                        </option>
                      ))}
                    </select>
                  );
                }
                if (meta.type === "boolean") {
                  return (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={String(formData.new_value) === "true"}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              new_value: e.target.checked ? "true" : "false",
                              new_value_label: e.target.checked ? "Yes" : "No",
                            }))
                          }
                        />
                        <span>Yes / No</span>
                      </label>
                    </div>
                  );
                }
                if (meta.type === "date") {
                  return (
                    <input
                      type="date"
                      name="new_value"
                      value={formData.new_value}
                      onChange={handleFormChange}
                      onFocus={() => setActiveField("new_value")}
                      className="w-full border rounded px-2 py-2 text-sm"
                      ref={newValueRef}
                    />
                  );
                }
                if (meta.type === "number") {
                  return (
                    <input
                      type="number"
                      name="new_value"
                      value={formData.new_value}
                      onChange={handleFormChange}
                      onFocus={() => setActiveField("new_value")}
                      className="w-full border rounded px-2 py-2 text-sm"
                      ref={newValueRef}
                    />
                  );
                }
                return (
                  <input
                    name="new_value"
                    value={formData.new_value}
                    onChange={handleFormChange}
                    onFocus={() => setActiveField("new_value")}
                    className="w-full border rounded px-2 py-2 text-sm"
                    placeholder={`Enter ${getFriendlyLabel(
                      formData.field_name
                    )}`}
                    ref={newValueRef}
                  />
                );
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Old Value
              </label>
              {(() => {
                const meta = fieldMeta[formData.field_name];
                if (!meta) {
                  return (
                    <input
                      name="old_value"
                      value={formData.old_value || ""}
                      onChange={handleFormChange}
                      onFocus={() => setActiveField("old_value")}
                      className="w-full border rounded px-2 py-2 text-sm"
                      placeholder={`Enter previous ${getFriendlyLabel(
                        formData.field_name
                      )}`}
                      ref={oldValueRef}
                    />
                  );
                }
                if (meta.type === "relation" || meta.type === "enum") {
                  const optionsKey = meta.optionsKey || meta.enumKey;
                  const opts = optionsKey
                    ? fieldOptionSource[optionsKey] || []
                    : [];
                  const getDepartmentNameById = (id) => {
                    const dep = (fieldOptionSource.departments || []).find(
                      (d) => String(d.value) === String(id)
                    );
                    return dep?.label || "";
                  };
                  const formatOptionLabel = (fieldName, opt) => {
                    if (fieldName === "designation_id" && opt) {
                      const depName =
                        opt.department_label ||
                        opt.departmentName ||
                        opt.department ||
                        getDepartmentNameById(
                          opt.department_id || opt.departmentId
                        );
                      return depName ? `${opt.label} - ${depName}` : opt.label;
                    }
                    return opt.label;
                  };
                  return (
                    <select
                      name="old_value"
                      value={formData.old_value || ""}
                      onChange={handleOldOptionSelect}
                      onFocus={() => setActiveField("old_value")}
                      className="w-full border rounded px-2 py-2 text-sm"
                      ref={oldValueRef}
                    >
                      <option value="">
                        Select previous {getFriendlyLabel(formData.field_name)}
                      </option>
                      {opts.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {formatOptionLabel(formData.field_name, opt)}
                        </option>
                      ))}
                    </select>
                  );
                }
                if (meta.type === "boolean") {
                  return (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={String(formData.old_value) === "true"}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              old_value: e.target.checked ? "true" : "false",
                              old_value_label: e.target.checked ? "Yes" : "No",
                            }))
                          }
                        />
                        <span>Yes / No</span>
                      </label>
                    </div>
                  );
                }
                if (meta.type === "date") {
                  return (
                    <input
                      type="date"
                      name="old_value"
                      value={formData.old_value || ""}
                      onChange={handleFormChange}
                      onFocus={() => setActiveField("old_value")}
                      className="w-full border rounded px-2 py-2 text-sm"
                      ref={oldValueRef}
                    />
                  );
                }
                if (meta.type === "number") {
                  return (
                    <input
                      type="number"
                      name="old_value"
                      value={formData.old_value || ""}
                      onChange={handleFormChange}
                      onFocus={() => setActiveField("old_value")}
                      className="w-full border rounded px-2 py-2 text-sm"
                      ref={oldValueRef}
                    />
                  );
                }
                return (
                  <input
                    name="old_value"
                    value={formData.old_value || ""}
                    onChange={handleFormChange}
                    onFocus={() => setActiveField("old_value")}
                    className="w-full border rounded px-2 py-2 text-sm"
                    placeholder={`Enter previous ${getFriendlyLabel(
                      formData.field_name
                    )}`}
                    ref={oldValueRef}
                  />
                );
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Changed At (optional)
              </label>
              <input
                type="datetime-local"
                name="changed_at"
                value={formData.changed_at}
                onChange={handleFormChange}
                className="w-full border rounded px-2 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Change Description (optional)
              </label>
              <input
                name="change_description"
                value={formData.change_description}
                onChange={handleFormChange}
                onFocus={() => setActiveField("change_description")}
                className="w-full border rounded px-2 py-2 text-sm"
                placeholder="If blank we will auto-generate"
                ref={changeDescriptionRef}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks (optional)
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleFormChange}
                onFocus={() => setActiveField("remarks")}
                rows={3}
                className="w-full border rounded px-2 py-2 text-sm"
                ref={remarksRef}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-60"
            >
              {saving
                ? editingHistory
                  ? "Updating..."
                  : "Saving..."
                : editingHistory
                ? "Update"
                : "Save"}
            </button>
          </div>
        </form>
      </EnhancedModal>
    </>
  );
};

export default HistoryTab;
