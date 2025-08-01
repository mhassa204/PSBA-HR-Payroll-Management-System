


import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash } from "lucide-react";
import EnhancedModal from "../../../components/ui/EnhancedModal";
import TabbedEmploymentForm from "./TabbedEmploymentForm";
import employmentService from "../services/employmentService";
import { createEmploymentRecord } from "../../../data/normalizedData";

const EmploymentRecordActions = ({
  employeeId,
  employeeName,
  employmentRecord,
  onRecordUpdated,
  onRecordDeleted,
  showEditIcon = true,
  showDeleteIcon = true,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const organizationOptions = [
    { value: "MBWO", label: "Model Bazaar Welfare Organization (MBWO) - 2010-2016" },
    {
      value: "PMBMC",
      label: "Punjab Municipal Board Management Company (PMBMC) - 2016-2024",
    },
    {
      value: "PSBA",
      label: "Punjab Safe Cities Authority (PSBA) - 2025-Present",
    },
  ];

  const getOrganizationColor = (org) => {
    switch (org) {
      case "MBWO":
        return "#3B82F6";
      case "PMBMC":
        return "#F59E0B";
      case "PSBA":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const getOrganizationIcon = (org) => {
    switch (org) {
      case "MBWO":
        return "building-2";
      case "PMBMC":
        return "factory";
      case "PSBA":
        return "shield";
      default:
        return "briefcase";
    }
  };

  const handleEditRecord = () => {
    // Debug: Log the raw employment record to see what data we have
    console.log("🔍 Raw employmentRecord data:", employmentRecord);

    // Create a properly structured record for editing (creating new record)
    // Ensure all fields have fallback values to avoid undefined issues
    // Structure matches the expected format for TabbedEmploymentForm
    const populatedRecord = {
      // Remove ID to create a new record
      id: undefined,
      employment: {
        organization: employmentRecord.organization || "",
        department: employmentRecord.department || "",
        designation: employmentRecord.designation || "",
        scale_grade: employmentRecord.scale_grade || "",
        employment_type: employmentRecord.employment_type || "Regular",
        role_tag: employmentRecord.role_tag || "",
        reporting_officer_id: employmentRecord.reporting_officer_id || "",
        effective_from: new Date().toISOString().split('T')[0], // Set to today for new record
        effective_till: null, // New record will be current
        office_location: employmentRecord.office_location || "",
        medical_fitness_report_pdf: employmentRecord.medical_fitness_report_pdf || null,
        police_character_certificate: employmentRecord.police_character_certificate || null,
        filer_status: employmentRecord.filer_status || "non_filer",
        filer_active_status: employmentRecord.filer_active_status || "",
        employment_status: employmentRecord.employment_status || "active",
        is_current: true, // New record will be current
        remarks: employmentRecord.remarks ?
          `${employmentRecord.remarks}\n\n[Edited from record ID ${employmentRecord.id} on ${new Date().toLocaleDateString()}]` :
          `[Edited from record ID ${employmentRecord.id} on ${new Date().toLocaleDateString()}]`,
      },
      salary: {
        basic_salary: employmentRecord.basic_salary || employmentRecord.salary || 0,
        medical_allowance: employmentRecord.medical_allowance || 0,
        house_rent: employmentRecord.house_rent || 0,
        conveyance_allowance: employmentRecord.conveyance_allowance || 0,
        other_allowances: employmentRecord.other_allowances || 0,
        bonus_eligible: employmentRecord.bonus_eligible || false,
        daily_wage_rate: employmentRecord.daily_wage_rate || 0,
        bank_account_primary: employmentRecord.bank_account_primary || "",
        bank_name_primary: employmentRecord.bank_name_primary || "",
        bank_account_secondary: employmentRecord.bank_account_secondary || "",
        bank_name_secondary: employmentRecord.bank_name_secondary || "",
        payment_mode: employmentRecord.payment_mode || "Bank Transfer",
        salary_effective_from: employmentRecord.salary_effective_from || "",
        salary_effective_till: employmentRecord.salary_effective_till || "",
        payroll_status: employmentRecord.payroll_status || "Active",
      },
      location: {
        district: employmentRecord.district || "",
        city: employmentRecord.city || "",
        bazaar_name: employmentRecord.bazaar_name || "",
        type: employmentRecord.location_type || employmentRecord.type || "HEAD_OFFICE",
        full_address: employmentRecord.full_address || "",
      },
      contract: {
        contract_type: employmentRecord.contract_type || "",
        contract_number: employmentRecord.contract_number || "",
        start_date: employmentRecord.contract_start_date || "",
        end_date: employmentRecord.contract_end_date || "",
        renewal_count: employmentRecord.renewal_count || 0,
        probation_start: employmentRecord.probation_start || "",
        probation_end: employmentRecord.probation_end || "",
        confirmation_status: employmentRecord.confirmation_status || "",
        confirmation_date: employmentRecord.confirmation_date || "",
        is_renewed: employmentRecord.is_renewed || false,
        renewal_report: employmentRecord.renewal_report || null,
      },
    };

    console.log("📝 Populated record for creating new employment record:", populatedRecord);
    setEditingRecord(populatedRecord);
    setShowEditModal(true);
  };

  const handleUpdateRecord = async (updatedRecord) => {
    try {
      console.log("🔄 handleUpdateRecord: Received updated record:", updatedRecord);

      // Flatten the updated record for creating a new employment record
      const flattenedData = {
        ...updatedRecord.employment,
        ...updatedRecord.salary,
        ...updatedRecord.location,
        ...updatedRecord.contract,
        user_id: employeeId,
        employee_id: employeeId, // For backward compatibility
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("📋 handleUpdateRecord: Flattened data for creation:", flattenedData);

      // Create a new employment record instead of updating the existing one
      console.log("🚀 handleUpdateRecord: Calling createEmploymentRecord...");
      const newRecord = await createEmploymentRecord(flattenedData);

      console.log("✅ New employment record created from edit:", newRecord);

      // Create the new record for display
      const newRecordForDisplay = {
        ...flattenedData,
        id: newRecord.id,
        start_date: updatedRecord.employment?.effective_from || new Date().toISOString().split('T')[0],
        end_date: updatedRecord.employment?.effective_till || null,
        effective_from: updatedRecord.employment?.effective_from || new Date().toISOString().split('T')[0],
        effective_till: updatedRecord.employment?.effective_till || null,
        // Ensure both salary fields are available for display
        salary: updatedRecord.salary?.basic_salary || 0,
        basic_salary: updatedRecord.salary?.basic_salary || 0,
      };

      setShowEditModal(false);
      setEditingRecord(null);

      // Notify parent component that a new record was created
      console.log("📤 handleUpdateRecord: Notifying parent with new record:", newRecordForDisplay);
      if (onRecordUpdated) {
        console.log("📞 handleUpdateRecord: Calling onRecordUpdated callback");
        onRecordUpdated(newRecordForDisplay);
      } else {
        console.error("❌ handleUpdateRecord: No onRecordUpdated callback provided!");
      }

      console.log("✅ Employment record edited successfully! New record created.");

    } catch (error) {
      console.error("❌ Error creating new employment record:", error);
      alert("Failed to create new employment record. Please try again.");
    }
  };

  const handleDeleteRecord = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteRecord = async () => {
    try {
      await employmentService.deleteEmployment(employmentRecord.id);
      setShowDeleteModal(false);
      if (onRecordDeleted) {
        onRecordDeleted(employmentRecord);
      }
    } catch (error) {
      console.error("Error deleting employment record:", error);
      alert("Failed to delete employment record. Please try again.");
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setShowDeleteModal(false);
    setEditingRecord(null);
  };

  const hasBasicInfo =
    employmentRecord.organization && employmentRecord.designation;
  const hasSalaryInfo =
    employmentRecord.salary || employmentRecord.basic_salary;
  const hasLocationInfo = employmentRecord.district && employmentRecord.city;
  const hasContractInfo =
    employmentRecord.contract_type || employmentRecord.contract_number;

  return (
    <>
      {/* Employment Record Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowDetailsModal(true)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <i
              className={`lucide-${getOrganizationIcon(
                employmentRecord.organization
              )}`}
              style={{
                color: getOrganizationColor(employmentRecord.organization),
                fontSize: "1.5rem",
              }}
            ></i>
            <div>
              <h4 className="font-semibold text-lg text-gray-900">
                {employmentRecord.designation}
              </h4>
              <p
                style={{
                  color: getOrganizationColor(employmentRecord.organization),
                }}
              >
                {organizationOptions.find(
                  (opt) => opt.value === employmentRecord.organization
                )?.label || employmentRecord.organization}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                PKR {(
                  parseFloat(employmentRecord.basic_salary || employmentRecord.salary  || 0)
                ).toLocaleString() || "N/A"}
              </p>
              <p className="text-sm text-gray-700 font-medium">
                {employmentRecord.start_date || employmentRecord.effective_from} -{" "}
                {employmentRecord.end_date || employmentRecord.effective_till || "Present"}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {showEditIcon && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleEditRecord();
                  }}
                  className="text-orange-600 hover:text-orange-800 transition-colors"
                  title="Create New Employment Record (Based on Current)"
                  aria-label="Create new employment record based on current data"
                >
                  <div className="relative">
                    <Pencil size={20} />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">+</span>
                    </div>
                  </div>
                </button>
              )}
              {showDeleteIcon && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleDeleteRecord();
                  }}
                  className="text-red-600 hover:text-red-800 transition-colors"
                  title="Delete Employment Record"
                  aria-label="Delete employment record"
                >
                  <Trash size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Department:</span>
            <span className="ml-2 text-gray-900">
              {employmentRecord.department || "N/A"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Type:</span>
            <span className="ml-2 text-gray-900">
              {employmentRecord.employment_type}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Location:</span>
            <span className="ml-2 text-gray-900">
              {employmentRecord.office_location || "N/A"}
            </span>
          </div>
        </div>

        {/* Completion Status */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                hasBasicInfo
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <i
                className={`lucide-${
                  hasBasicInfo ? "check" : "clock"
                } mr-1`}
              ></i>
              Employment Details
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                hasSalaryInfo
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <i
                className={`lucide-${
                  hasSalaryInfo ? "check" : "clock"
                } mr-1`}
              ></i>
              Salary Info
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                hasLocationInfo
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <i
                className={`lucide-${
                  hasLocationInfo ? "check" : "clock"
                } mr-1`}
              ></i>
              Location Info
            </span>
            {employmentRecord.employment_type === "Contract" && (
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  hasContractInfo
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <i
                  className={`lucide-${
                    hasContractInfo ? "check" : "clock"
                  } mr-1`}
                ></i>
                Contract Info
              </span>
            )}
          </div>
        </div>

        {employmentRecord.remarks && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="font-medium text-gray-600">Remarks:</span>
            <p className="mt-1 text-gray-900">{employmentRecord.remarks}</p>
          </div>
        )}
      </motion.div>

      {/* Edit Employment Modal */}
      <TabbedEmploymentForm
        isOpen={showEditModal}
        onClose={handleCloseModal}
        onSubmit={handleUpdateRecord}
        employeeName={employeeName}
        userId={employeeId}
        editingRecord={editingRecord}
        isEditMode={false} // Always false because we're creating a new record
        isCreatingFromExisting={true} // Flag to indicate this is based on existing data
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
            <i className="lucide-alert-triangle text-4xl text-red-500 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Are you sure you want to delete this employment record?
            </h3>
            <p className="text-gray-600">
              This action cannot be undone. The employment record for{" "}
              <strong>{employmentRecord.designation}</strong> at{" "}
              <strong>
                {organizationOptions.find(
                  (opt) => opt.value === employmentRecord.organization
                )?.label || employmentRecord.organization}
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
              onClick={confirmDeleteRecord}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Trash className="inline-block mr-2" size={20} />
              Delete Record
            </button>
          </div>
        </div>
      </EnhancedModal>

      {/* Employment Record Details Modal */}
      <EnhancedModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Employment Record Details - ${employmentRecord.designation}`}
        size="lg"
      >
        <div className="p-6 space-y-6">
          {/* Header with Organization */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <i
              className={`lucide-${getOrganizationIcon(employmentRecord.organization)}`}
              style={{
                color: getOrganizationColor(employmentRecord.organization),
                fontSize: "2rem",
              }}
            ></i>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {employmentRecord.designation}
              </h3>
              <p className="text-lg font-medium" style={{ color: getOrganizationColor(employmentRecord.organization) }}>
                {organizationOptions.find(opt => opt.value === employmentRecord.organization)?.label || employmentRecord.organization}
              </p>
              <p className="text-sm text-gray-600">
                {employmentRecord.department} • {employmentRecord.employment_type}
              </p>
            </div>
          </div>

          {/* Employment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                <i className="fas fa-briefcase mr-2 text-blue-600"></i>
                Employment Details
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Organization:</span>
                  <span className="text-gray-900">{organizationOptions.find(opt => opt.value === employmentRecord.organization)?.label || employmentRecord.organization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Department:</span>
                  <span className="text-gray-900">{employmentRecord.department || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Designation:</span>
                  <span className="text-gray-900">{employmentRecord.designation || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Employment Type:</span>
                  <span className="text-gray-900">{employmentRecord.employment_type || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Scale/Grade:</span>
                  <span className="text-gray-900">{employmentRecord.scale_grade || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Role Tag:</span>
                  <span className="text-gray-900">{employmentRecord.role_tag || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Period:</span>
                  <span className="text-gray-900">
                    {employmentRecord.start_date || employmentRecord.effective_from || "N/A"} - {employmentRecord.end_date || employmentRecord.effective_till || "Present"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Office Location:</span>
                  <span className="text-gray-900">{employmentRecord.office_location || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                <i className="fas fa-money-bill-wave mr-2 text-green-600"></i>
                Salary Information
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Basic Salary:</span>
                  <span className="text-gray-900 font-semibold">PKR {parseFloat(employmentRecord.basic_salary || employmentRecord.salary || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Medical Allowance:</span>
                  <span className="text-gray-900">PKR {parseFloat(employmentRecord.medical_allowance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">House Rent:</span>
                  <span className="text-gray-900">PKR {parseFloat(employmentRecord.house_rent || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Conveyance:</span>
                  <span className="text-gray-900">PKR {parseFloat(employmentRecord.conveyance_allowance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Other Allowances:</span>
                  <span className="text-gray-900">PKR {parseFloat(employmentRecord.other_allowances || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Total Salary:</span>
                  <span className="text-gray-900 font-bold text-lg">
                    PKR {(
                      parseFloat(employmentRecord.basic_salary || employmentRecord.salary || 0) +
                      parseFloat(employmentRecord.medical_allowance || 0) +
                      parseFloat(employmentRecord.house_rent || 0) +
                      parseFloat(employmentRecord.conveyance_allowance || 0) +
                      parseFloat(employmentRecord.other_allowances || 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Payment Mode:</span>
                  <span className="text-gray-900">{employmentRecord.payment_mode || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Bank Account:</span>
                  <span className="text-gray-900">{employmentRecord.bank_account_primary || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Bank Name:</span>
                  <span className="text-gray-900">{employmentRecord.bank_name_primary || "N/A"}</span>
                </div>
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
                <span className="text-gray-900">{employmentRecord.district || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">City:</span>
                <span className="text-gray-900">{employmentRecord.city || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Bazaar/Area:</span>
                <span className="text-gray-900">{employmentRecord.bazaar_name || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Location Type:</span>
                <span className="text-gray-900">{employmentRecord.location_type || "N/A"}</span>
              </div>
            </div>
            {employmentRecord.full_address && (
              <div>
                <span className="font-medium text-gray-600">Full Address:</span>
                <p className="text-gray-900 mt-1">{employmentRecord.full_address}</p>
              </div>
            )}
          </div>

          {/* Contract Information (if applicable) */}
          {employmentRecord.employment_type === "Contract" && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                <i className="fas fa-file-contract mr-2 text-orange-600"></i>
                Contract Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Contract Type:</span>
                  <span className="text-gray-900">{employmentRecord.contract_type || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Contract Number:</span>
                  <span className="text-gray-900">{employmentRecord.contract_number || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Contract Start:</span>
                  <span className="text-gray-900">{employmentRecord.contract_start_date || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Contract End:</span>
                  <span className="text-gray-900">{employmentRecord.contract_end_date || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Probation Period:</span>
                  <span className="text-gray-900">
                    {employmentRecord.probation_start && employmentRecord.probation_end
                      ? `${employmentRecord.probation_start} - ${employmentRecord.probation_end}`
                      : "N/A"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Confirmation Status:</span>
                  <span className="text-gray-900">{employmentRecord.confirmation_status || "N/A"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          {employmentRecord.remarks && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                <i className="fas fa-comment mr-2 text-gray-600"></i>
                Remarks
              </h4>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{employmentRecord.remarks}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </EnhancedModal>
    </>
  );
};

export default EmploymentRecordActions;