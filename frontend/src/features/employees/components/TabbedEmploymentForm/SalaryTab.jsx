import { motion } from "framer-motion";
import SearchableSelect from "../../../../components/ui/SearchableSelect";

const SalaryTab = ({
  salaryForm,
  employmentForm, // access employment fields (filer statuses)
  onSalarySubmit,
  currentOrganization,
  watchedEmploymentType,
  watchedFilerStatus,
  getFieldClasses,
  getValidationRules,
  salaryErrors,
  employmentErrors,
}) => {
  const { register, handleSubmit, watch } = salaryForm;
  const { watch: watchEmployment, register: registerEmployment } =
    employmentForm;

  return (
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

        <form onSubmit={handleSubmit(onSalarySubmit)}>
          {/* Daily Wager Specific Fields */}
          {watchedEmploymentType === "Daily Wager" ? (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-6">
              <h4 className="text-md font-semibold text-orange-800 mb-4">
                <i className="fas fa-calendar-day mr-2"></i>
                Daily Wager Salary Information
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                For Daily Wager employment, you may provide a gross salary and/or
                a daily wage rate. Both are optional.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gross Salary (PKR)
                  </label>
                  <input
                    type="number"
                    {...register("basic_salary")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                    placeholder="Enter gross salary (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Daily Wage Rate (PKR)
                  </label>
                  <input
                    type="number"
                    {...register("daily_wage_rate")}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                    placeholder="Enter daily wage rate (optional)"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Standard Salary Fields for Other Employment Types */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {currentOrganization === "MBWO"
                    ? "Gross Salary (PKR)"
                    : "Basic Salary (PKR)"}
                </label>
                <input
                  type="number"
                  {...register(
                    currentOrganization === "MBWO"
                      ? "gross_salary"
                      : "basic_salary"
                  )}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  placeholder={
                    currentOrganization === "MBWO"
                      ? "Enter gross salary"
                      : "Enter basic salary"
                  }
                />
                {salaryErrors?.[
                  currentOrganization === "MBWO"
                    ? "gross_salary"
                    : "basic_salary"
                ] && (
                  <p className="text-red-600 text-sm mt-1">
                    {
                      salaryErrors[
                        currentOrganization === "MBWO"
                          ? "gross_salary"
                          : "basic_salary"
                      ].message
                    }
                  </p>
                )}
              </div>

              <div className={getFieldClasses("salary", "medical_allowance")}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Medical Allowance (PKR)
                </label>
                <input
                  type="number"
                  {...register("medical_allowance")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  placeholder="Enter medical allowance"
                />
              </div>

              <div className={getFieldClasses("salary", "house_rent")}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  House Rent (PKR)
                </label>
                <input
                  type="number"
                  {...register("house_rent")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  placeholder="Enter house rent allowance"
                />
              </div>

              <div
                className={getFieldClasses("salary", "conveyance_allowance")}
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Conveyance Allowance (PKR)
                </label>
                <input
                  type="number"
                  {...register("conveyance_allowance")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  placeholder="Enter conveyance allowance"
                />
              </div>

              <div className={getFieldClasses("salary", "other_allowances")}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Other Allowances (PKR)
                </label>
                <input
                  type="number"
                  {...register("other_allowances")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  placeholder="Enter other allowances"
                />
              </div>

              <div className={getFieldClasses("salary", "daily_wage_rate")}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Daily Wage Rate (PKR)
                </label>
                <input
                  type="number"
                  {...register("daily_wage_rate")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  placeholder="Enter daily wage rate (if applicable)"
                />
              </div>
            </div>
          )}

          {/* Filer Status (moved from Employment tab) - repositioned to bottom */}

          {/* Payment and Bank Information - Common for all employment types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className={getFieldClasses("salary", "payment_mode")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Mode
              </label>
              <SearchableSelect
                options={[
                  { value: "Bank Transfer", label: "Bank Transfer" },
                  { value: "Cheque", label: "Cheque" },
                  { value: "Online Transfer", label: "Online Transfer" },
                  { value: "Mobile Banking", label: "Mobile Banking" },
                ]}
                value={watch("payment_mode")}
                onChange={(value) => salaryForm.setValue("payment_mode", value)}
                placeholder="Select Payment Mode"
                register={register}
                name="payment_mode"
                required={false}
                error={salaryErrors?.payment_mode?.message}
              />
            </div>

            <div className={getFieldClasses("salary", "bank_account_primary")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bank Account Number
              </label>
              <input
                type="text"
                {...register("bank_account_primary", {
                  validate: (value) => {
                    const paymentMode = watch("payment_mode");
                    const bankName = watch("bank_name_primary");
                    if (
                      (paymentMode === "Bank Transfer" ||
                        paymentMode === "Online Transfer" ||
                        paymentMode === "Mobile Banking") &&
                      bankName &&
                      !value
                    ) {
                      return "Bank account number is required when bank details are provided";
                    }
                    return true;
                  },
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                placeholder="Enter bank account number"
              />
              {salaryErrors?.bank_account_primary && (
                <p className="text-red-600 text-sm mt-1">
                  {salaryErrors.bank_account_primary.message}
                </p>
              )}
            </div>

            <div className={getFieldClasses("salary", "bank_name_primary")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                {...register("bank_name_primary")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                placeholder="Enter bank name"
              />
            </div>

            <div className={getFieldClasses("salary", "bank_branch_code")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bank Branch Code
              </label>
              <input
                type="text"
                {...register("bank_branch_code")}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                placeholder="Enter bank branch code"
              />
            </div>

            <div className={getFieldClasses("salary", "payroll_status")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payroll Status
              </label>
              <SearchableSelect
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Suspended", label: "Suspended" },
                ]}
                value={watch("payroll_status")}
                onChange={(value) =>
                  salaryForm.setValue("payroll_status", value)
                }
                placeholder="Select Payroll Status"
                register={register}
                name="payroll_status"
                required={false}
                error={salaryErrors?.payroll_status?.message}
              />
            </div>
          </div>

          {/* Filer Status block now at bottom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <div className={getFieldClasses("employment", "filer_status")}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tax Filer Status
              </label>
              <SearchableSelect
                options={[
                  { value: "non_filer", label: "Non-Filer" },
                  { value: "filer", label: "Filer" },
                ]}
                value={watchEmployment("filer_status")}
                onChange={(value) =>
                  employmentForm.setValue("filer_status", value)
                }
                placeholder="Select Tax Filer Status"
                register={registerEmployment}
                name="filer_status"
                required={false}
                error={employmentErrors?.filer_status?.message}
              />
              {employmentErrors?.filer_status && (
                <p className="text-red-600 text-sm mt-1">
                  {employmentErrors.filer_status.message}
                </p>
              )}
            </div>
            {watchedFilerStatus === "filer" && (
              <div
                className={getFieldClasses("employment", "filer_active_status")}
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filer Active Status
                </label>
                <SearchableSelect
                  options={[
                    { value: "active", label: "Active" },
                    { value: "not_active", label: "Not Active" },
                  ]}
                  value={watchEmployment("filer_active_status")}
                  onChange={(value) =>
                    employmentForm.setValue("filer_active_status", value)
                  }
                  placeholder="Select Status"
                  register={registerEmployment}
                  name="filer_active_status"
                  required={false}
                  error={employmentErrors?.filer_active_status?.message}
                />
                {employmentErrors?.filer_active_status && (
                  <p className="text-red-600 text-sm mt-1">
                    {employmentErrors.filer_active_status.message}
                  </p>
                )}
              </div>
            )}
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
  );
};

export default SalaryTab;
