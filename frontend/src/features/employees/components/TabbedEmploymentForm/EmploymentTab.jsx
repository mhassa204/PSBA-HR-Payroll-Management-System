import { motion } from "framer-motion";
import { Controller } from "react-hook-form";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import SearchableSelect from "../../../../components/ui/SearchableSelect";
import SmartDateInput from "../../../../components/ui/SmartDateInput";
import EmploymentDocumentManager from "../../../../components/ui/EmploymentDocumentManager";
import { ORGANIZATION_OPTIONS } from "../../../../constants/organizationFieldConfig";

const EmploymentTab = ({
  employmentForm,
  formOptions,
  availableDesignations,
  formLoading,
  getFieldClasses,
  getValidationRules,
  handleOrganizationChange,
  onEmploymentSubmit,
  documentManager,
  isEditMode,
  currentOrganization,
  watchedEmploymentType,
  watchedFilerStatus,
  employmentErrors,
}) => {
  const { register, handleSubmit, watch } = employmentForm;

  return (
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

        {/* Organization-specific guidance */}
        {currentOrganization === "MBWO" && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-sm text-green-800">
              <i className="fas fa-info-circle mr-2"></i>
              <strong>MBWO Organization:</strong> Only Designation and Effective
              From are required fields.
            </p>
          </div>
        )}
        {currentOrganization === "PMBMC" && (
          <div className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-lg">
            <p className="text-sm text-purple-800">
              <i className="fas fa-info-circle mr-2"></i>
              <strong>PMBMC Organization:</strong> Department, Designation,
              Employment Type, Role Tag, Effective From, and Medical Fitness
              Report are required fields.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onEmploymentSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Organization <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={ORGANIZATION_OPTIONS}
                value={watch("organization")}
                onChange={(value) => {
                  employmentForm.setValue("organization", value);
                  handleOrganizationChange(value);
                }}
                placeholder="Select Organization"
                register={register}
                name="organization"
                required={true}
                error={employmentErrors?.organization?.message}
              />
            </div>

            <div className={getFieldClasses("employment", "department")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Department
              </label>
              {formLoading ? (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">
                    Loading departments...
                  </span>
                </div>
              ) : currentOrganization === "PMBMC" ? (
                <input
                  type="text"
                  {...register("department", {
                    required: getValidationRules("employment", "department", {
                      required: "Department is required",
                    }).required
                      ? "Department is required"
                      : false,
                  })}
                  placeholder="Enter Department"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
              ) : (
                <SearchableSelect
                  options={formOptions?.departments || []}
                  value={watch("department")}
                  onChange={(value) =>
                    employmentForm.setValue("department", value)
                  }
                  placeholder={
                    formOptions?.departments?.length > 0
                      ? "Select Department"
                      : "No departments available"
                  }
                  register={register}
                  name="department"
                  required={
                    getValidationRules("employment", "department", {
                      required: "Department is required",
                    }).required
                  }
                  error={employmentErrors?.department?.message}
                  disabled={
                    isEditMode
                      ? false
                      : !formOptions?.departments ||
                        formOptions.departments.length === 0
                  }
                />
              )}
              {!formLoading &&
                currentOrganization !== "PMBMC" &&
                (!formOptions?.departments ||
                  formOptions.departments.length === 0) && (
                  <p className="text-yellow-600 text-sm mt-1">
                    ⚠️ No departments available. Please check your connection or
                    contact support.
                  </p>
                )}
            </div>

            <div className={getFieldClasses("employment", "designation")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Designation <span className="text-red-500">*</span>
              </label>
              {formLoading ? (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">
                    Loading designations...
                  </span>
                </div>
              ) : currentOrganization === "MBWO" ||
                currentOrganization === "PMBMC" ? (
                <input
                  type="text"
                  {...register("designation", {
                    required: getValidationRules("employment", "designation", {
                      required: "Designation is required",
                    }).required
                      ? "Designation is required"
                      : false,
                  })}
                  placeholder="Enter Designation"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                />
              ) : (
                <>
                  <SearchableSelect
                    options={availableDesignations || []}
                    value={watch("designation")}
                    onChange={(value) => {
                      employmentForm.setValue("designation", value);
                    }}
                    placeholder={
                      availableDesignations?.length > 0
                        ? "Select Designation"
                        : "Loading designations..."
                    }
                    register={register}
                    name="designation"
                    required={
                      getValidationRules("employment", "designation", {
                        required: "Designation is required",
                      }).required
                    }
                    error={employmentErrors?.designation?.message}
                  />
                </>
              )}
              {!formLoading &&
                watch("department") &&
                currentOrganization !== "MBWO" &&
                currentOrganization !== "PMBMC" &&
                (!availableDesignations ||
                  availableDesignations.length === 0) && (
                  <p className="text-yellow-600 text-sm mt-1">
                    ⚠️ No designations found for the selected department.
                  </p>
                )}
              {!formLoading &&
                !watch("department") &&
                currentOrganization !== "MBWO" &&
                currentOrganization !== "PMBMC" && (
                  <p className="text-xs text-gray-500 mt-1">
                    No department selected — showing general (field) designations.
                    Select a department to see its specific designations.
                  </p>
                )}
            </div>

            <div className={getFieldClasses("employment", "employment_type")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Employment Type
              </label>
              <SearchableSelect
                options={(formOptions?.employmentTypes || []).filter(
                  (opt) => opt.value !== "Probation"
                )}
                value={watch("employment_type")}
                onChange={(value) =>
                  employmentForm.setValue("employment_type", value)
                }
                placeholder="Select Employment Type"
                register={register}
                name="employment_type"
                required={
                  getValidationRules("employment", "employment_type", {
                    required: "Employment type is required",
                  }).required
                }
                error={employmentErrors?.employment_type?.message}
              />
            </div>

            {/* Conditional Probation Section */}
            {(watchedEmploymentType === "Regular" ||
              watchedEmploymentType === "Contract") &&
              currentOrganization !== "MBWO" && (
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
                        {...register("is_on_probation")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">
                        Employee is on probation
                      </label>
                    </div>

                    {/* Conditional Probation End Date */}
                    {watch("is_on_probation") && (
                      <div>
                        <Controller
                          name="probation_end_date"
                          control={employmentForm.control}
                          rules={{
                            required: watch("is_on_probation")
                              ? "Probation end date is required when employee is on probation"
                              : false,
                          }}
                          render={({ field }) => (
                            <SmartDateInput
                              label="Probation End Date"
                              required={!!watch("is_on_probation")}
                              value={field.value || ""}
                              onChange={field.onChange}
                              error={employmentErrors?.probation_end_date?.message}
                              helperText="Date when the probation period will end"
                            />
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

            <div className={getFieldClasses("employment", "role_tag")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role Tag
              </label>
              <SearchableSelect
                options={formOptions?.roleTags || []}
                value={watch("role_tag")}
                onChange={(value) => employmentForm.setValue("role_tag", value)}
                placeholder="Select Role Tag"
                register={register}
                name="role_tag"
                required={
                  getValidationRules("employment", "role_tag", {
                    required: "Role tag is required",
                  }).required
                }
                error={employmentErrors?.role_tag?.message}
                disabled={
                  isEditMode
                    ? false
                    : !formOptions?.roleTags ||
                      formOptions.roleTags.length === 0
                }
              />
            </div>

            {/* Joining Date — permanent first-joining record (req #2) */}
            <div>
              <Controller
                name="joining_date"
                control={employmentForm.control}
                render={({ field }) => (
                  <SmartDateInput
                    label="Joining Date"
                    value={field.value || ""}
                    onChange={field.onChange}
                    helperText="First joining date in the Company/Authority"
                  />
                )}
              />
            </div>

            <div>
              <Controller
                name="effective_from"
                control={employmentForm.control}
                render={({ field }) => (
                  <SmartDateInput
                    label="Effective From"
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div>
              <Controller
                name="effective_till"
                control={employmentForm.control}
                render={({ field }) => (
                  <SmartDateInput
                    label="Effective Till"
                    value={field.value || ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div
              className={getFieldClasses("employment", "reporting_officer_id")}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reporting Officer
              </label>
              {formLoading ? (
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">
                    Loading users...
                  </span>
                </div>
              ) : (
                <>
                  <SearchableSelect
                    options={formOptions?.users || []}
                    value={watch("reporting_officer_id")}
                    onChange={(value) =>
                      employmentForm.setValue("reporting_officer_id", value)
                    }
                    placeholder={
                      formOptions?.users?.length > 0
                        ? "Select Reporting Officer"
                        : "No users available"
                    }
                    register={register}
                    name="reporting_officer_id"
                    required={false}
                    error={employmentErrors?.reporting_officer_id?.message}
                    disabled={
                      !formOptions?.users || formOptions.users.length === 0
                    }
                  />
                </>
              )}
              {!formLoading &&
                (!formOptions?.users || formOptions.users.length === 0) && (
                  <p className="text-yellow-600 text-sm mt-1">
                    ⚠️ No users available for reporting officer selection.
                    Please check your connection or contact support.
                  </p>
                )}
            </div>

            {/* Scale/Grade */}
            <div className={getFieldClasses("employment", "scale_grade")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Scale/Grade
              </label>
              <SearchableSelect
                options={formOptions?.scaleGrades || []}
                value={watch("scale_grade")}
                onChange={(value) =>
                  employmentForm.setValue("scale_grade", value)
                }
                placeholder="Select Scale/Grade"
                register={register}
                name="scale_grade"
                required={false}
                error={employmentErrors?.scale_grade?.message}
              />
            </div>

            {/* Filer status fields moved to Salary tab */}

            {/* Employment Status */}
            <div className={getFieldClasses("employment", "employment_status")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Employment Status
              </label>
              <SearchableSelect
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "terminated", label: "Terminated" },
                  { value: "resigned", label: "Resigned" },
                ]}
                value={watch("employment_status")}
                onChange={(value) =>
                  employmentForm.setValue("employment_status", value)
                }
                placeholder="Select Status"
                register={register}
                name="employment_status"
                required={
                  getValidationRules("employment", "employment_status", {
                    required: "Employment status is required",
                  }).required
                }
                error={employmentErrors?.employment_status?.message}
              />
            </div>

            {/* Is Current Employee: show only for PSBA; hidden for MBWO/PMBMC */}
            {currentOrganization === "PSBA" && (
              <div className={getFieldClasses("employment", "is_current")}>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...register("is_current")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Current Employee
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Check if this is the employee's current position
                </p>
              </div>
            )}
          </div>

          {/* Appointment / Employment Letter (req #1) */}
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="text-md font-semibold text-indigo-900 mb-3">
              <i className="fas fa-file-signature mr-2"></i>
              Appointment / Employment Letter
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Controller
                  name="appointment_letter_issue_date"
                  control={employmentForm.control}
                  render={({ field }) => (
                    <SmartDateInput
                      label="Letter Issuance Date"
                      value={field.value || ""}
                      onChange={field.onChange}
                      helperText="Date the appointment letter was issued"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Appointment Letter
                </label>
                {documentManager && (
                  <EmploymentDocumentManager
                    documents={documentManager.documents}
                    documentType="appointment_letter"
                    title="Appointment / Employment Letter"
                    accept="application/pdf,image/jpeg,image/jpg,image/png"
                    maxSize={50 * 1024 * 1024}
                    onDocumentAdd={documentManager.addDocument}
                    onDocumentRemove={documentManager.removeDocument}
                    isEditMode={isEditMode}
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  PDF or JPEG. Pair with the issuance date above.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Remarks
            </label>
            <textarea
              {...register("remarks")}
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
  );
};

export default EmploymentTab;
