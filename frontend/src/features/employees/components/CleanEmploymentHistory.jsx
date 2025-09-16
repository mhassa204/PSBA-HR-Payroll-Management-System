import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEmployeeStore } from "../store/employeeStore";
import { employmentService } from "../services/employmentService";
import { useErrorHandler } from "../../../hooks/useErrorHandler";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import EnhancedModal from "../../../components/ui/EnhancedModal";
import TabbedEmploymentForm from "./TabbedEmploymentForm";
import EmploymentRecordActions from "./EmploymentRecordActions";
import { validateEmploymentData } from '../../../constants/organizationFieldConfig';

const CleanEmploymentHistory = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { getEmployee } = useEmployeeStore();
  const { error, isLoading, handleError, clearError, withErrorHandling } = useErrorHandler();

  const [employee, setEmployee] = useState(null);
  const [employmentRecords, setEmploymentRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showDeleteEmployeeModal, setShowDeleteEmployeeModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  
  // Ref for the edit form to call refresh function
  const editFormRef = useRef(null);
  
  // Add a key to force entire component refresh when data is updated
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!employeeId || isNaN(parseInt(employeeId))) {
      handleError(new Error("Invalid employee ID"));
      return;
    }
    loadEmployeeData();
  }, [employeeId]);

  // Debug: Log when editingRecord changes
  useEffect(() => {
    console.log("🔍 CleanEmploymentHistory: editingRecord changed:", editingRecord);
  }, [editingRecord]);
  


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
      
      // Load employment records using the employment service
      const employmentData = await withErrorHandling(
        () => employmentService.getEmploymentHistory(numericId),
        { showAlert: false }
      );
      setEmploymentRecords(employmentData || []);
    } catch (error) {
      handleError(error);
      setEmployee(null);
      setEmploymentRecords([]);
    }
  };

  // Provide a refresh callback for child forms to trigger page refresh after clone/edit
  const refreshEmploymentPage = async () => {
    await loadEmployeeData();
    setRefreshKey(prev => prev + 1);
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

      // Check if designation is at the top level (from TabbedEmploymentForm)
      const designationValue = data.designation || employmentData.designation;
      const designationIdValue = data.designation_id || employmentData.designation_id || designationValue;

      // Check if department and role_tag are at the top level or nested
      const departmentValue = data.department || employmentData.department;
      const departmentIdValue = data.department_id || employmentData.department_id || departmentValue;
      const roleTagValue = data.role_tag || employmentData.role_tag;
      const roleTagIdValue = data.role_tag_id || employmentData.role_tag_id || roleTagValue;
      const scaleGradeValue = data.scale_grade || employmentData.scale_grade;
      const scaleGradeIdValue = data.scale_grade_id || employmentData.scale_grade_id || scaleGradeValue;

      console.log("🔍 CleanEmploymentHistory: Field extraction:", {
        topLevelDesignation: data.designation,
        nestedDesignation: employmentData.designation,
        topLevelDesignationId: data.designation_id,
        nestedDesignationId: employmentData.designation_id,
        finalDesignationValue: designationValue,
        finalDesignationIdValue: designationIdValue,
        topLevelDepartment: data.department,
        nestedDepartment: employmentData.department,
        topLevelDepartmentId: data.department_id,
        nestedDepartmentId: employmentData.department_id,
        finalDepartmentValue: departmentValue,
        finalDepartmentIdValue: departmentIdValue,
        topLevelRoleTag: data.role_tag,
        nestedRoleTag: employmentData.role_tag,
        topLevelRoleTagId: data.role_tag_id,
        nestedRoleTagId: employmentData.role_tag_id,
        finalRoleTagValue: roleTagValue,
        finalRoleTagIdValue: roleTagIdValue,
        topLevelScaleGrade: data.scale_grade,
        nestedScaleGrade: employmentData.scale_grade,
        topLevelScaleGradeId: data.scale_grade_id,
        nestedScaleGradeId: employmentData.scale_grade_id,
        finalScaleGradeValue: scaleGradeValue,
        finalScaleGradeIdValue: scaleGradeIdValue
      });

      console.log("📝 CleanEmploymentHistory: Creating employment record with data:", data);

      // Add employee_id to the data for validation
      const dataWithEmployeeId = {
        ...employmentData,
        designation: designationValue, // Ensure designation field is present for validation
        designation_id: designationIdValue, // Also include designation_id
        department: departmentValue, // Ensure department field is present for validation
        department_id: departmentIdValue, // Also include department_id
        role_tag: roleTagValue, // Ensure role_tag field is present for validation
        role_tag_id: roleTagIdValue, // Also include role_tag_id
        scale_grade: scaleGradeValue, // Ensure scale_grade field is present for validation
        scale_grade_id: scaleGradeIdValue, // Also include scale_grade_id
        employee_id: employee.id,
        user_id: employee.id
      };

      console.log("🔍 CleanEmploymentHistory: Data being validated:", dataWithEmployeeId);
      console.log("🔍 CleanEmploymentHistory: Designation value:", dataWithEmployeeId.designation);
      console.log("🔍 CleanEmploymentHistory: Designation ID value:", dataWithEmployeeId.designation_id);
      console.log("🔍 CleanEmploymentHistory: Organization value:", dataWithEmployeeId.organization);
      console.log("🔍 CleanEmploymentHistory: Effective from value:", dataWithEmployeeId.effective_from);

      // Organization-specific validation
      const validation = validateEmploymentData(dataWithEmployeeId);
      if (!validation.isValid) {
        console.error("❌ Validation errors:", validation.errors);
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Create a comprehensive employment record with all form data
      const completeEmploymentData = {
        employee_id: employee.id,
        // Employee information for file storage
        employee_name: employee.full_name,
        employee_cnic: employee.cnic,
        // Employment data
        organization: employmentData.organization,
        department_id: departmentIdValue,
        designation: designationValue, // Use properly extracted designation value
        designation_id: designationIdValue, // Use properly extracted designation ID value
        employment_type: employmentData.employment_type || "Regular",
        role_tag_id: roleTagIdValue,
        scale_grade_id: scaleGradeIdValue,
        effective_from: employmentData.effective_from,
        effective_till: employmentData.effective_till || null,
        reporting_officer_id: employmentData.reporting_officer_id || null,
        office_location: employmentData.office_location || null,
        remarks: employmentData.remarks || null,
        employment_status: employmentData.employment_status || "active",
        is_current: employmentData.is_current !== undefined ? employmentData.is_current : (employmentData.organization === 'MBWO' ? false : true),
        filer_status: employmentData.filer_status || "non_filer",
        filer_active_status: employmentData.filer_active_status || null,
        is_on_probation: employmentData.is_on_probation || false,
        probation_end_date: employmentData.probation_end_date || null,
        // Document uploads
        medical_fitness_report_pdf: employmentData.medical_fitness_report_pdf || null,
        police_character_certificate: employmentData.police_character_certificate || null,
        // Related data
        salary: Object.keys(salaryData).length > 0 ? salaryData : null,
        location: Object.keys(locationData).length > 0 ? locationData : null,
        contract: Object.keys(contractData).length > 0 ? contractData : null,
      };

      console.log("📤 CleanEmploymentHistory: Creating employment record:", completeEmploymentData);

      // Use the employment service to create the record
      const newEmployment = await employmentService.createEmployment(completeEmploymentData);
      console.log("✅ CleanEmploymentHistory: Employment record created:", newEmployment);

      // Refresh the employment records
      await loadEmployeeData();

      // Close modal and show success message
      setShowAddModal(false);
      alert("Employment record created successfully!");

    } catch (error) {
      console.error("❌ CleanEmploymentHistory: Error creating employment record:", error);
      alert(`Error creating employment record: ${error.message}`);
    }
  };

  const handleEditEmployment = (record) => {
    console.log("🔍 CleanEmploymentHistory: handleEditEmployment called with record:", record);
    console.log("🔍 CleanEmploymentHistory: Current editingRecord state:", editingRecord);
    setEditingRecord(record);
    setShowEditModal(true);
    console.log("🔍 CleanEmploymentHistory: Set editingRecord and showEditModal to true");
  };

  const handleUpdateEmployment = async (updatedRecord) => {
    try {
      console.log("📝 CleanEmploymentHistory: Updating employment record:", updatedRecord);

      if (!updatedRecord || !updatedRecord.employment || !updatedRecord.employment.id) {
        throw new Error("Invalid employment record for update - missing employment ID");
      }

      // Extract data from the updated record
      const employmentData = updatedRecord.employment || updatedRecord;
      const salaryData = updatedRecord.salary || {};
      const locationData = updatedRecord.location || {};
      const contractData = updatedRecord.contract || {};

      // Check if designation is at the top level (from TabbedEmploymentForm)
      const designationValue = updatedRecord.designation || employmentData.designation;
      const designationIdValue = updatedRecord.designation_id || employmentData.designation_id || designationValue;

      // Check if department, role_tag, and scale_grade are at the top level or nested
      const departmentValue = updatedRecord.department || employmentData.department;
      const departmentIdValue = updatedRecord.department_id || employmentData.department_id || departmentValue;
      const roleTagValue = updatedRecord.role_tag || employmentData.role_tag;
      const roleTagIdValue = updatedRecord.role_tag_id || employmentData.role_tag_id || roleTagValue;
      const scaleGradeValue = updatedRecord.scale_grade || employmentData.scale_grade;
      const scaleGradeIdValue = updatedRecord.scale_grade_id || employmentData.scale_grade_id || scaleGradeValue;
      const reportingOfficerValue = updatedRecord.reporting_officer_id || employmentData.reporting_officer_id;

      console.log("🔍 CleanEmploymentHistory: Field extraction for update:", {
        topLevelDesignation: updatedRecord.designation,
        employmentDesignation: employmentData.designation,
        finalDesignationValue: designationValue,
        finalDesignationIdValue: designationIdValue,
        hasDesignation: !!designationValue,
        topLevelDepartment: updatedRecord.department,
        nestedDepartment: employmentData.department,
        finalDepartmentValue: departmentValue,
        finalDepartmentIdValue: departmentIdValue,
        topLevelRoleTag: updatedRecord.role_tag,
        nestedRoleTag: employmentData.role_tag,
        finalRoleTagValue: roleTagValue,
        finalRoleTagIdValue: roleTagIdValue,
        topLevelScaleGrade: updatedRecord.scale_grade,
        nestedScaleGrade: employmentData.scale_grade,
        finalScaleGradeValue: scaleGradeValue,
        finalScaleGradeIdValue: scaleGradeIdValue,
        topLevelReportingOfficer: updatedRecord.reporting_officer_id,
        nestedReportingOfficer: employmentData.reporting_officer_id,
        finalReportingOfficerValue: reportingOfficerValue
      });

      // Add employee_id and document fields to the data for validation
      const dataWithEmployeeId = {
        ...employmentData,
        designation: designationValue, // Ensure designation field is present for validation
        designation_id: designationIdValue, // Also include designation_id
        department: departmentValue, // Ensure department field is present for validation
        department_id: departmentIdValue, // Also include department_id
        role_tag: roleTagValue, // Ensure role_tag field is present for validation
        role_tag_id: roleTagIdValue, // Also include role_tag_id
        scale_grade: scaleGradeValue, // Ensure scale_grade field is present for validation
        scale_grade_id: scaleGradeIdValue, // Also include scale_grade_id
        reporting_officer_id: reportingOfficerValue, // Ensure reporting_officer_id field is present for validation
        // Include document fields for validation
        medical_fitness_report_pdf: updatedRecord.medical_fitness_report_pdf || employmentData.medical_fitness_report_pdf || null,
        police_character_certificate: updatedRecord.police_character_certificate || employmentData.police_character_certificate || null,
        renewal_report: updatedRecord.renewal_report || employmentData.renewal_report || null,
        employee_id: employee.id,
        user_id: employee.id
      };

      // Organization-specific validation
      console.log("🔍 CleanEmploymentHistory: Data being sent to validation:", {
        dataKeys: Object.keys(dataWithEmployeeId),
        hasMedicalFitness: !!dataWithEmployeeId.medical_fitness_report_pdf,
        hasPoliceCharacter: !!dataWithEmployeeId.police_character_certificate,
        medicalFitnessValue: dataWithEmployeeId.medical_fitness_report_pdf,
        policeCharacterValue: dataWithEmployeeId.police_character_certificate,
        organization: dataWithEmployeeId.organization
      });
      
      const validation = validateEmploymentData(dataWithEmployeeId);
      if (!validation.isValid) {
        console.error("❌ Validation errors:", validation.errors);
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare update data
      const updateData = {
        // Employee information for file storage
        employee_name: employee.full_name,
        employee_cnic: employee.cnic,
        employee_id: employee.id,
        user_id: employee.id,
        // Employment data
        organization: employmentData.organization,
        department_id: departmentIdValue,
        designation: designationValue, // Keep original designation field
        designation_id: designationIdValue, // Also map to designation_id for backend
        employment_type: employmentData.employment_type || "Regular",
        role_tag_id: roleTagIdValue,
        scale_grade_id: scaleGradeIdValue,
        effective_from: employmentData.effective_from,
        effective_till: employmentData.effective_till || null,
        reporting_officer_id: reportingOfficerValue,
        office_location: employmentData.office_location || null,
        remarks: employmentData.remarks || null,
        scale_grade: employmentData.scale_grade || null,
        employment_status: employmentData.employment_status || "active",
        is_current: employmentData.is_current !== undefined ? employmentData.is_current : (employmentData.organization === 'MBWO' ? false : true),
        filer_status: employmentData.filer_status || "non_filer",
        filer_active_status: employmentData.filer_active_status || null,
        is_on_probation: employmentData.is_on_probation || false,
        probation_end_date: employmentData.probation_end_date || null,
        // Document uploads - properly structure document data for backend
        medical_fitness_report_pdf: updatedRecord.medical_fitness_report_pdf || employmentData.medical_fitness_report_pdf || null,
        police_character_certificate: updatedRecord.police_character_certificate || employmentData.police_character_certificate || null,
        // Pass-through existing renewal report metadata if present (when no new upload)
        ...(updatedRecord.renewal_report_id || updatedRecord.renewal_report_url || updatedRecord.renewal_report_file_path || updatedRecord.renewal_report_document_name || updatedRecord.renewal_report_file_type || updatedRecord.renewal_report_file_size || updatedRecord.renewal_report_mime_type ? {
          renewal_report_id: updatedRecord.renewal_report_id,
          renewal_report_url: updatedRecord.renewal_report_url,
          renewal_report_file_path: updatedRecord.renewal_report_file_path,
          renewal_report_document_name: updatedRecord.renewal_report_document_name,
          renewal_report_file_type: updatedRecord.renewal_report_file_type,
          renewal_report_file_size: updatedRecord.renewal_report_file_size,
          renewal_report_mime_type: updatedRecord.renewal_report_mime_type,
        } : {}),
        // Document removal - include documents to remove
        documents_to_remove: employmentData.documents_to_remove || [],
        // Related data
        salary: Object.keys(salaryData).length > 0 ? salaryData : null,
        location: Object.keys(locationData).length > 0 ? locationData : null,
        // Flatten contract data for backend processing
        ...(Object.keys(contractData).length > 0 ? {
          contract_contract_type: contractData.contract_type || "",
          contract_contract_number: contractData.contract_number || "",
          contract_start_date: contractData.start_date || "",
          contract_end_date: contractData.end_date || "",
          renewal_count: contractData.renewal_count || 0,
          probation_start: contractData.probation_start || "",
          probation_end: contractData.probation_end || "",
          confirmation_status: contractData.confirmation_status || "",
          confirmation_date: contractData.confirmation_date || "",
          contract_is_renewed: contractData.is_renewed || false,  // Fixed: Use contract_is_renewed to match backend
          renewal_report: contractData.renewal_report || null
        } : {}),
      };

      console.log("📤 CleanEmploymentHistory: Updating employment record:", updateData);
      console.log("🔍 CleanEmploymentHistory: Document removal data:", {
        documentsToRemove: employmentData.documents_to_remove,
        documentsToRemoveType: typeof employmentData.documents_to_remove,
        documentsToRemoveLength: Array.isArray(employmentData.documents_to_remove) ? employmentData.documents_to_remove.length : 'not array'
      });
      console.log("🔍 CleanEmploymentHistory: Contract data being sent:", {
        originalContractData: contractData,
        flattenedContractFields: Object.keys(updateData).filter(key => key.startsWith('contract_') || key === 'renewal_count' || key === 'probation_start' || key === 'probation_end' || key === 'confirmation_status' || key === 'confirmation_date' || key === 'is_renewed' || key === 'renewal_report')
      });

      // Use the employment service to update the record
      const updatedEmployment = await employmentService.updateEmployment(updatedRecord.employment.id, updateData);
      console.log("✅ CleanEmploymentHistory: Employment record updated:", updatedEmployment);
      console.log("🔍 CleanEmploymentHistory: Updated employment structure:", {
        id: updatedEmployment?.id,
        organization: updatedEmployment?.organization,
        contract: updatedEmployment?.contract,
        contractIsRenewed: updatedEmployment?.contract?.is_renewed,
        allKeys: Object.keys(updatedEmployment || {})
      });

      // Show success message
      alert("Employment record updated successfully!");
      
      // Close modal first
      setShowEditModal(false);
      
      // Refresh the employment records to keep the list in sync
      await loadEmployeeData();
      
      // Force entire component refresh by changing the key
      setRefreshKey(prev => prev + 1);
      
      // Reset all state to force fresh data load
      setEditingRecord(null);

    } catch (error) {
      console.error("❌ CleanEmploymentHistory: Error updating employment record:", error);
      alert(`Error updating employment record: ${error.message}`);
    }
  };

  const handleDeleteEmployment = (record) => {
          setDeletingRecord(record);
      setShowDeleteModal(true);
  };

  const confirmDeleteEmployment = async () => {
    try {
      if (!deletingRecord) {
        throw new Error("No employment record selected for deletion");
      }

      // Use the employment service to delete the record
      await employmentService.deleteEmployment(deletingRecord.id);


      // Refresh the employment records
      await loadEmployeeData();

      // Close modal and show success message
      setShowDeleteModal(false);
      setDeletingRecord(null);
      alert("Employment record deleted successfully!");

    } catch (error) {
      console.error("❌ CleanEmploymentHistory: Error deleting employment record:", error);
      alert(`Error deleting employment record: ${error.message}`);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setEditingRecord(null);
    setDeletingRecord(null);
  };

  // Handle edit modal close specifically
  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingRecord(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading employment history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage 
          title="Error Loading Employment History"
          message={error}
          onRetry={loadEmployeeData}
        />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Employee Not Found</h2>
          <p className="text-gray-600 mb-4">The requested employee could not be found.</p>
          <button
            onClick={() => navigate("/employees")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div key={refreshKey} className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Employment History - {employee.full_name}
            </h1>
            <p className="text-gray-600 mt-2">
              Employee ID: {employee.employee_id || employee.id}
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate("/employees")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Employees
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Employment Record
            </button>
          </div>
        </div>

        <EmploymentRecordActions
          employmentRecords={employmentRecords}
          onEdit={handleEditEmployment}
          onDelete={handleDeleteEmployment}
          employeeName={employee.full_name}
          userId={employee.id}
        />
      </div>

      {/* Add Employment Modal */}
      <TabbedEmploymentForm
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onSubmit={handleAddEmployment}
        employeeName={employee.full_name}
        userId={employee.id}
        isEditMode={false}
        onRefresh={refreshEmploymentPage}
      />

      {/* Edit Employment Modal */}
      {editingRecord && (
        <TabbedEmploymentForm
          ref={editFormRef}
          key={`edit-${editingRecord.id}-${refreshKey}`}
          isOpen={showEditModal}
          onClose={handleEditModalClose}
          onSubmit={handleUpdateEmployment}
          editingRecord={editingRecord}
          isEditMode={true}
          employeeName={employee.full_name}
          userId={employee.id}
          onRefresh={refreshEmploymentPage}
        />
      )}

      {/* Delete Confirmation Modal */}
      <EnhancedModal
        isOpen={showDeleteModal}
        onClose={handleCloseModal}
        title="Delete Employment Record"
        size="md"
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirm Deletion
            </h3>
            <p className="text-gray-600">
              Are you sure you want to delete this employment record? This action cannot be undone.
            </p>
            {deletingRecord && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Organization:</strong> {deletingRecord.organization}<br />
                  <strong>Department:</strong> {deletingRecord.department?.name || 'N/A'}<br />
                  <strong>Designation:</strong> {deletingRecord.designation?.title || 'N/A'}<br />
                  <strong>Effective From:</strong> {deletingRecord.effective_from ? new Date(deletingRecord.effective_from).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleCloseModal}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteEmployment}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <i className="fas fa-trash mr-2"></i>
              Delete
            </button>
          </div>
        </div>
      </EnhancedModal>
    </div>
  );
};

export default CleanEmploymentHistory;