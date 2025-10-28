import { useState, useEffect, useCallback } from "react";
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

const HistoryTab = ({ employmentId }) => {
  const [groupedHistory, setGroupedHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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
    if (!dateString) return "N/A";
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
    if (value === null || value === undefined) return "N/A";
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
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Delete this history record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!groupedHistory) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No history available</p>
      </div>
    );
  }

  const allHistoryTypes = Object.keys(groupedHistory);
  const hasAnyHistory = allHistoryTypes.some(
    (type) => groupedHistory[type]?.length > 0
  );

  if (!hasAnyHistory) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No employment history recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Employment History
        </h2>
        <p className="text-sm text-gray-600">
          Complete record of all changes made to this employment record
        </p>
      </div>

      {allHistoryTypes.map((type) => {
        const items = groupedHistory[type];
        return renderHistorySection(type, items);
      })}
    </div>
  );
};

export default HistoryTab;
