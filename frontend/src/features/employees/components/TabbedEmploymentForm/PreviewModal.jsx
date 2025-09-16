import EnhancedModal from "../../../../components/ui/EnhancedModal";

const PreviewModal = ({
  isOpen,
  onClose,
  previewData,
  formOptions,
  getLabelFromId,
  displayValue,
  getLocationTypeLabel,
  isContractual,
  handleFinalSubmit,
  handleCloneEmployment,
  isEditMode,
  savedEmploymentId,
}) => {
  return (
    <EnhancedModal isOpen={isOpen} onClose={onClose} title="Review Employment Record Before Saving" size="xl">
      <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
        {previewData && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Please review all information before saving</h3>
              <p className="text-gray-600">Fields showing "N/A" indicate no value was entered. You can go back to edit or proceed to save.</p>
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
                  <span className="text-gray-900">{getLabelFromId(previewData.department, formOptions?.departments)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Designation:</span>
                  <span className="text-gray-900">{getLabelFromId(previewData.designation, formOptions?.designations)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Employment Type:</span>
                  <span className="text-gray-900">{displayValue(previewData.employment_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Role Tag:</span>
                  <span className="text-gray-900">{getLabelFromId(previewData.role_tag, formOptions?.roleTags)}</span>
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
                  <span className="text-gray-900">{getLabelFromId(previewData.scale_grade, formOptions?.scaleGrades)}</span>
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
            </div>

            {/* Salary, Location, and Contract sections omitted for brevity in this extracted modal */}

            {/* Action Buttons */}
            <div className="flex justify-between gap-4 pt-6 border-t border-gray-200">
              <button onClick={onClose} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                <i className="fas fa-arrow-left mr-2"></i>
                Go Back to Edit
              </button>
              <div className="flex gap-3">
                <button onClick={handleFinalSubmit} className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                  <i className="fas fa-check mr-2"></i>
                  Confirm & Save Employment Record
                </button>
                {isEditMode && savedEmploymentId && (
                  <button type="button" onClick={handleCloneEmployment} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium" title="Clone this employment as a new current record">
                    <i className="fas fa-clone mr-2"></i>
                    Clone as New
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </EnhancedModal>
  );
};

export default PreviewModal;
