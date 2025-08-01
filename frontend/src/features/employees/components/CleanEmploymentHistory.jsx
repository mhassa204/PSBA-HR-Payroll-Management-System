import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEmployeeStore } from "../store/employeeStore";
import { useErrorHandler } from "../../../hooks/useErrorHandler";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import EnhancedModal from "../../../components/ui/EnhancedModal";
import TabbedEmploymentForm from "./TabbedEmploymentForm";
import EmploymentRecordActions from "./EmploymentRecordActions";

const CleanEmploymentHistory = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { getEmployee, addEmploymentRecord } = useEmployeeStore();
  const { error, isLoading, handleError, clearError, withErrorHandling } = useErrorHandler();

  const [employee, setEmployee] = useState(null);
  const [employmentRecords, setEmploymentRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showDeleteEmployeeModal, setShowDeleteEmployeeModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);

  useEffect(() => {
    if (!employeeId || isNaN(parseInt(employeeId))) {
      handleError(new Error("Invalid employee ID"));
      return;
    }
    loadEmployeeData();
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      const numericId = parseInt(employeeId);
      const employeeData = await withErrorHandling(
        () => getEmployee(numericId),
        { showAlert: false }
      );
      if (!employeeData) {
        throw new Error("Employee not found");
      }
      setEmployee(employeeData);
      setEmploymentRecords(employeeData.employmentRecords || []);
    } catch (error) {
      handleError(error);
      setEmployee(null);
      setEmploymentRecords([]);
    }
  };

  const handleAddEmployment = async (data) => {
    try {
      console.log("📝 CleanEmploymentHistory: Received employment data:", data);
      console.log("📝 CleanEmploymentHistory: Employee ID:", employee?.id);

      // Validate that we have the required data
      if (!data) {
        throw new Error("No employment data received");
      }

      console.log("🔍 CleanEmploymentHistory: Received data structure:", data);

      // Handle both flat and nested data structures
      const employmentData = data.employment || data;
      const salaryData = data.salary || {};
      const locationData = data.location || {};
      const contractData = data.contract || {};

      console.log("📋 CleanEmploymentHistory: Extracted employment data:", employmentData);

      if (!employmentData.organization) {
        console.error("❌ Missing organization in employment data:", employmentData);
        throw new Error("Organization is required");
      }

      if (!employmentData.department) {
        console.error("❌ Missing department in employment data:", employmentData);
        throw new Error("Department is required");
      }

      if (!employmentData.designation) {
        console.error("❌ Missing designation in employment data:", employmentData);
        throw new Error("Designation is required");
      }

      if (!employmentData.role_tag) {
        console.error("❌ Missing role_tag in employment data:", employmentData);
        throw new Error("Role tag is required");
      }

      if (!employmentData.effective_from) {
        console.error("❌ Missing effective_from in employment data:", employmentData);
        throw new Error("Effective from date is required");
      }

      // Create a comprehensive employment record with all form data
      // Use extracted data from nested or flat structure
      const newRecord = {
        id: data.id || Date.now(),
        user_id: employee.id,
        // Employment information (from employmentData)
        organization: employmentData.organization,
        department: employmentData.department,
        designation: employmentData.designation,
        employment_type: employmentData.employment_type || "Regular",
        role_tag: employmentData.role_tag,
        effective_from: employmentData.effective_from,
        effective_till: employmentData.effective_till || "",
        reporting_officer_id: employmentData.reporting_officer_id || "",
        office_location: employmentData.office_location || "",
        scale_grade: employmentData.scale_grade || "",
        medical_fitness_report_pdf: employmentData.medical_fitness_report_pdf || null,
        police_character_certificate: employmentData.police_character_certificate || null,
        filer_status: employmentData.filer_status || "non_filer",
        filer_active_status: employmentData.filer_active_status || "",
        employment_status: employmentData.employment_status || "active",
        is_current: employmentData.is_current || false,
        remarks: employmentData.remarks || "",
        // Salary information (from salaryData or fallback to flat data)
        basic_salary: salaryData.basic_salary || data.basic_salary || 0,
        medical_allowance: salaryData.medical_allowance || data.medical_allowance || 0,
        house_rent: salaryData.house_rent || data.house_rent || 0,
        conveyance_allowance: salaryData.conveyance_allowance || data.conveyance_allowance || 0,
        other_allowances: salaryData.other_allowances || data.other_allowances || 0,
        bonus_eligible: salaryData.bonus_eligible || data.bonus_eligible || false,
        bank_account_primary: salaryData.bank_account_primary || data.bank_account_primary || "",
        bank_name_primary: salaryData.bank_name_primary || data.bank_name_primary || "",
        payment_mode: salaryData.payment_mode || data.payment_mode || "Bank Transfer",
        payroll_status: salaryData.payroll_status || data.payroll_status || "Active",
        // Location information (from locationData or fallback to flat data)
        district: locationData.district || data.district || "",
        city: locationData.city || data.city || "",
        bazaar_name: locationData.bazaar_name || data.bazaar_name || "",
        location_type: locationData.type || data.location_type || "",
        full_address: locationData.full_address || data.full_address || "",
        // Contract information (from contractData or fallback to flat data)
        contract_type: contractData.contract_type || data.contract_type || "",
        contract_number: contractData.contract_number || data.contract_number || "",
        contract_start_date: contractData.start_date || data.contract_start_date || "",
        contract_end_date: contractData.end_date || data.contract_end_date || "",
        probation_start: contractData.probation_start || data.probation_start || "",
        probation_end: contractData.probation_end || data.probation_end || "",
        confirmation_status: contractData.confirmation_status || data.confirmation_status || "",
        is_renewed: contractData.is_renewed || data.is_renewed || false,
        renewal_report: contractData.renewal_report || data.renewal_report || null,
        // Legacy fields for compatibility
        start_date: employmentData.effective_from,
        end_date: employmentData.effective_till || "",
        salary: salaryData.basic_salary || data.basic_salary || 0, // Keep for backward compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("💾 CleanEmploymentHistory: Saving employment record:", newRecord);
      console.log("📍 CleanEmploymentHistory: Location data - district:", newRecord.district, "city:", newRecord.city, "office_location:", newRecord.office_location);

      // Save to store - pass the record data directly
      await withErrorHandling(() => addEmploymentRecord(newRecord));

      // Update local state
      setEmploymentRecords((prev) => {
        // Check if record already exists (for updates)
        const existingIndex = prev.findIndex(record => record.id === newRecord.id);
        if (existingIndex >= 0) {
          // Update existing record
          const updated = [...prev];
          updated[existingIndex] = newRecord;
          return updated;
        } else {
          // Add new record
          return [...prev, newRecord];
        }
      });

      setShowAddModal(false);

      // Show success message
      console.log("✅ CleanEmploymentHistory: Employment record saved successfully:", newRecord);
    } catch (error) {
      console.error("❌ CleanEmploymentHistory: Error saving employment record:", error);
      handleError(error);
    }
  };

  const handleEditEmployment = (record) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  const handleUpdateEmployment = async (updatedRecord) => {
    console.log("🔄 CleanEmploymentHistory: handleUpdateEmployment called with:", updatedRecord);

    setEmploymentRecords((prev) => {
      console.log("📋 CleanEmploymentHistory: Current employment records:", prev);

      // Check if this is a new record (from edit creating new record)
      const existingRecordIndex = prev.findIndex(record => record.id === updatedRecord.id);
      console.log("🔍 CleanEmploymentHistory: Existing record index:", existingRecordIndex);

      if (existingRecordIndex === -1) {
        // This is a new record, add it to the beginning of the list
        console.log("➕ CleanEmploymentHistory: Adding new employment record from edit:", updatedRecord);
        const newList = [updatedRecord, ...prev];
        console.log("📋 CleanEmploymentHistory: Updated employment records list:", newList);
        return newList;
      } else {
        // This is updating an existing record
        console.log("✏️ CleanEmploymentHistory: Updating existing record");
        return prev.map((record) =>
          record.id === updatedRecord.id ? { ...record, ...updatedRecord } : record
        );
      }
    });

    // Reload employee data to ensure consistency
    console.log("🔄 CleanEmploymentHistory: Reloading employee data...");
    try {
      await loadEmployeeData();
      console.log("✅ CleanEmploymentHistory: Employee data reloaded successfully");
    } catch (error) {
      console.error("❌ CleanEmploymentHistory: Error reloading employee data:", error);
    }

    setShowEditModal(false);
    setEditingRecord(null);
  };

  const handleDeleteEmployment = (record) => {
    setDeletingRecord(record);
    setShowDeleteModal(true);
  };

  const confirmDeleteEmployment = () => {
    setEmploymentRecords((prev) =>
      prev.filter((record) => record.id !== deletingRecord.id)
    );
    setShowDeleteModal(false);
    setDeletingRecord(null);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowDeleteEmployeeModal(false);
    setEditingRecord(null);
    setDeletingRecord(null);
    clearError();
  };

  const organizationOptions = [
    { value: "MBWO", label: "Model Bazaar Welfare Organization (MBWO) - 2010-2016" },
    { value: "PMBMC", label: "Punjab Municipal Board Management Company (PMBMC) - 2016-2024" },
    { value: "PSBA", label: "Punjab Safe Cities Authority (PSBA) - 2025-Present" },
  ];



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <LoadingSpinner size="lg" text="Loading employee data..." />
        </div>
      </div>
    );
  }

  if (!employee && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <i className="fas fa-user-times text-6xl mb-4 text-red-500"></i>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Not Found</h2>
            <p className="text-gray-600 mb-4">The employee with ID {employeeId} could not be found.</p>
            <button
              onClick={() => navigate("/employees")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Employees
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate("/employees")}
              className="p-2 rounded-lg transition-colors bg-white text-gray-600 hover:bg-gray-100"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employment History</h1>
              <p className="text-lg text-gray-600">
                {employee?.full_name || "N/A"} - {employee?.cnic || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorMessage error={error} onRetry={clearError} showHomeLink={false} />
          </div>
        )}

        {/* Employee Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Employee Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="font-medium text-gray-600">Full Name:</span>
              <span className="ml-2 text-gray-900">{employee?.full_name || "N/A"}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">CNIC:</span>
              <span className="ml-2 text-gray-900">{employee?.cnic || "N/A"}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Mobile:</span>
              <span className="ml-2 text-gray-900">{employee?.mobile_number || "N/A"}</span>
            </div>
          </div>
        </div>



        {/* Employment Records */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Employment Records ({employmentRecords.length})
            </h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              title="Add Employment Record"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Employment Record
            </button>
          </div>

          {employmentRecords.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-briefcase text-6xl mb-4 text-gray-300"></i>
              <h4 className="text-xl font-semibold mb-2 text-gray-900">No Employment Records</h4>
              <p className="text-gray-600">
                This employee has no employment records yet. Click "Add Employment Record" to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {employmentRecords.map((record) => (
                <EmploymentRecordActions
                  key={record.id || `record-${Math.random()}`} // Fallback key for safety
                  employeeId={employee?.id}
                  employeeName={employee?.full_name}
                  employmentRecord={record}
                  onRecordUpdated={handleUpdateEmployment}
                  onRecordDeleted={(deletedRecord) => {
                    setEmploymentRecords((prev) =>
                      prev.filter((r) => r.id !== deletedRecord.id)
                    );
                  }}
                  showEditIcon={true}
                  showDeleteIcon={true}
                  showDetailsIcon={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add Employment Modal */}
        <TabbedEmploymentForm
          isOpen={showAddModal}
          onClose={handleCloseModal}
          onSubmit={handleAddEmployment}
          isLoading={isLoading}
          employeeName={employee?.full_name || "N/A"}
          userId={employee?.id}
        />

        {/* Edit Employment Modal */}
        <TabbedEmploymentForm
          isOpen={showEditModal}
          onClose={handleCloseModal}
          onSubmit={handleUpdateEmployment}
          isLoading={isLoading}
          employeeName={employee?.full_name || "N/A"}
          userId={employee?.id}
          editingRecord={editingRecord}
          isEditMode={true}
        />

        {/* Delete Confirmation Modal */}
        <EnhancedModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Employment Record"
          size="md"
        >
          <div className="p-6">
            <div className="text-center mb-6">
              <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Are you sure you want to delete this employment record?
              </h3>
              <p className="text-gray-600">
                This action cannot be undone. The employment record for{" "}
                <strong>{deletingRecord?.designation || "N/A"}</strong> at{" "}
                <strong>
                  {organizationOptions.find((opt) => opt.value === deletingRecord?.organization)?.label ||
                    deletingRecord?.organization ||
                    "N/A"}
                </strong>{" "}
                will be permanently deleted.
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEmployment}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <i className="fas fa-trash mr-2"></i>
                Delete Record
              </button>
            </div>
          </div>
        </EnhancedModal>



        {/* Delete Employee Modal */}
        <EnhancedModal
          isOpen={showDeleteEmployeeModal}
          onClose={() => setShowDeleteEmployeeModal(false)}
          title="Delete Employee"
          size="md"
        >
          <div className="p-6">
            <div className="text-center mb-6">
              <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Are you sure you want to delete this employee?
              </h3>
              <p className="text-gray-600">
                This action cannot be undone. The employee{" "}
                <strong>{employee?.full_name || "N/A"}</strong> and all their employment records will be permanently deleted.
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteEmployeeModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement actual employee deletion logic
                  setShowDeleteEmployeeModal(false);
                  navigate("/employees");
                }}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <i className="fas fa-trash mr-2"></i>
                Delete Employee
              </button>
            </div>
          </div>
        </EnhancedModal>
      </div>
    </div>
  );
};

export default CleanEmploymentHistory;