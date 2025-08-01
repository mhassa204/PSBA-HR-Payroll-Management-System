import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect } from "react";

const DataReviewModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Review Your Information",
  data = {},
  type = "create", // create, update, employment
  isLoading = false,
  employeeName = "",
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-gray-500 italic">Not provided</span>;
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return value;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getModalTitle = () => {
    switch (type) {
      case "create":
        return "Review New Employee Information";
      case "update":
        return `Review Updates for ${employeeName}`;
      case "employment":
        return `Review Employment Record${
          employeeName ? ` for ${employeeName}` : ""
        }`;
      default:
        return title;
    }
  };

  const getModalIcon = () => {
    switch (type) {
      case "create":
        return "fas fa-user-plus";
      case "update":
        return "fas fa-user-edit";
      case "employment":
        return "fas fa-briefcase";
      default:
        return "fas fa-check-circle";
    }
  };

  const getModalColor = () => {
    switch (type) {
      case "create":
        return "blue";
      case "update":
        return "green";
      case "employment":
        return "purple";
      default:
        return "blue";
    }
  };

  const renderEmploymentData = () => {
    if (type !== "employment") return null;

    return (
      <div className="space-y-6">
        {/* Employment Details */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-900 mb-3">
            <i className="fas fa-briefcase mr-2"></i>
            Employment Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-700 font-medium">Organization:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.organization)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Department:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.department)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Designation:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.designation)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">
                Employment Type:
              </span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.employment_type)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Role Tag:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.role_tag)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Scale/Grade:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.scale_grade)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Effective From:</span>
              <p className="font-semibold text-gray-900">
                {formatDate(data.effective_from || data.start_date)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Effective Till:</span>
              <p className="font-semibold text-gray-900">
                {data.effective_till || data.end_date
                  ? formatDate(data.effective_till || data.end_date)
                  : "Currently Working"}
              </p>
            </div>
            {data.reporting_officer_id && (
              <div>
                <span className="text-gray-700 font-medium">
                  Reporting Officer:
                </span>
                <p className="font-semibold text-gray-900">
                  {formatValue(
                    data.reporting_officer_name || data.reporting_officer_id
                  )}
                </p>
              </div>
            )}
          </div>
          {data.remarks && (
            <div className="mt-4">
              <span className="text-gray-700 font-medium">Remarks:</span>
              <p className="font-semibold text-gray-900 mt-1">{data.remarks}</p>
            </div>
          )}
        </div>

        {/* Salary Information */}
        {data.salary && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-green-900 mb-3">
              <i className="fas fa-money-bill-wave mr-2"></i>
              Salary Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-700 font-medium">Basic Salary:</span>
                <p className="font-semibold text-gray-900">
                  PKR {formatValue(data.salary.basic_salary)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Medical Allowance:
                </span>
                <p className="font-semibold text-gray-900">
                  PKR {formatValue(data.salary.medical_allowance)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">House Rent:</span>
                <p className="font-semibold text-gray-900">
                  PKR {formatValue(data.salary.house_rent)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Conveyance Allowance:
                </span>
                <p className="font-semibold text-gray-900">
                  PKR {formatValue(data.salary.conveyance_allowance)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Other Allowances:
                </span>
                <p className="font-semibold text-gray-900">
                  PKR {formatValue(data.salary.other_allowances)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Bonus Eligible:
                </span>
                <p className="font-semibold text-gray-900">
                  {formatValue(data.salary.bonus_eligible)}
                </p>
              </div>
              {data.salary.daily_wage_rate && (
                <div>
                  <span className="text-gray-700 font-medium">
                    Daily Wage Rate:
                  </span>
                  <p className="font-semibold text-gray-900">
                    PKR {formatValue(data.salary.daily_wage_rate)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-700 font-medium">Payment Mode:</span>
                <p className="font-semibold text-gray-900">
                  {formatValue(data.salary.payment_mode)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Payroll Status:
                </span>
                <p className="font-semibold text-gray-900">
                  {formatValue(data.salary.payroll_status)}
                </p>
              </div>
            </div>

            {(data.salary.bank_account_primary ||
              data.salary.bank_name_primary) && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <h5 className="font-medium text-green-900 mb-2">
                  Banking Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-700 font-medium">
                      Primary Bank:
                    </span>
                    <p className="font-semibold text-gray-900">
                      {formatValue(data.salary.bank_name_primary)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-700 font-medium">
                      Primary Account:
                    </span>
                    <p className="font-semibold text-gray-900">
                      {formatValue(data.salary.bank_account_primary)}
                    </p>
                  </div>
                  {data.salary.bank_name_secondary && (
                    <>
                      <div>
                        <span className="text-gray-700 font-medium">
                          Secondary Bank:
                        </span>
                        <p className="font-semibold text-gray-900">
                          {formatValue(data.salary.bank_name_secondary)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-700 font-medium">
                          Secondary Account:
                        </span>
                        <p className="font-semibold text-gray-900">
                          {formatValue(data.salary.bank_account_secondary)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Location Information */}
        {data.location && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-purple-900 mb-3">
              <i className="fas fa-map-marker-alt mr-2"></i>
              Location Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-700 font-medium">District:</span>
                <p className="font-semibold text-gray-900">
                  {formatValue(data.location.district)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">City:</span>
                <p className="font-semibold text-gray-900">
                  {formatValue(data.location.city)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Location Type:
                </span>
                <p className="font-semibold text-gray-900">
                  {data.location.type === "HEAD_OFFICE"
                    ? "Head Office"
                    : "Bazaar"}
                </p>
              </div>
              {data.location.bazaar_name && (
                <div>
                  <span className="text-gray-700 font-medium">
                    Bazaar Name:
                  </span>
                  <p className="font-semibold text-gray-900">
                    {formatValue(data.location.bazaar_name)}
                  </p>
                </div>
              )}
            </div>
            {data.location.full_address && (
              <div className="mt-4">
                <span className="text-gray-700 font-medium">Full Address:</span>
                <p className="font-semibold text-gray-900 mt-1">
                  {data.location.full_address}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contract Information */}
        {data.contract && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-orange-900 mb-3">
              <i className="fas fa-file-contract mr-2"></i>
              Contract Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-700 font-medium">
                  Contract Type:
                </span>
                <p className="font-semibold text-gray-900">
                  {formatValue(data.contract.contract_type)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Contract Period:
                </span>
                <p className="font-semibold text-gray-900">
                  {formatDate(data.contract.start_date)} -{" "}
                  {formatDate(data.contract.end_date)}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Probation Period:
                </span>
                <p className="font-semibold text-gray-900">
                  {data.contract.probation_start && data.contract.probation_end
                    ? `${formatDate(
                        data.contract.probation_start
                      )} - ${formatDate(data.contract.probation_end)}`
                    : "Not specified"}
                </p>
              </div>
              <div>
                <span className="text-gray-700 font-medium">
                  Confirmation Status:
                </span>
                <p className="font-semibold text-gray-900">
                  {formatValue(data.contract.confirmation_status)}
                </p>
              </div>
              {data.contract.confirmation_date && (
                <div>
                  <span className="text-gray-700 font-medium">
                    Confirmation Date:
                  </span>
                  <p className="font-semibold text-gray-900">
                    {formatDate(data.contract.confirmation_date)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-700 font-medium">
                  Contract Renewed:
                </span>
                <p className="font-semibold text-gray-900">
                  {formatValue(data.contract.is_renewed)}
                </p>
              </div>
            </div>
            {data.contract.renewal_notes && (
              <div className="mt-4">
                <span className="text-gray-700 font-medium">
                  Renewal Notes:
                </span>
                <p className="font-semibold text-gray-900 mt-1">
                  {data.contract.renewal_notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEmployeeData = () => {
    if (type === "employment") return null;

    return (
      <div className="space-y-6">
        {/* Personal Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-900 mb-3">
            <i className="fas fa-user mr-2"></i>
            Personal Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-700 font-medium">Full Name:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.full_name)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">CNIC:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.cnic)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Date of Birth:</span>
              <p className="font-semibold text-gray-900">
                {formatDate(data.date_of_birth)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Gender:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.gender)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">
                Father/Husband Name:
              </span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.father_husband_name)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Mother Name:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.mother_name)}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-green-900 mb-3">
            <i className="fas fa-phone mr-2"></i>
            Contact Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-700 font-medium">Mobile Number:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.mobile_number)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Email:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.email)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">City:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.city)}
              </p>
            </div>
            <div>
              <span className="text-gray-700 font-medium">District:</span>
              <p className="font-semibold text-gray-900">
                {formatValue(data.district)}
              </p>
            </div>
          </div>
          {(data.present_address || data.permanent_address) && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.present_address && (
                  <div>
                    <span className="text-gray-700 font-medium">
                      Present Address:
                    </span>
                    <p className="font-semibold text-gray-900 mt-1">
                      {data.present_address}
                    </p>
                  </div>
                )}
                {data.permanent_address && (
                  <div>
                    <span className="text-gray-700 font-medium">
                      Permanent Address:
                    </span>
                    <p className="font-semibold text-gray-900 mt-1">
                      {data.permanent_address}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        {(data.marital_status ||
          data.nationality ||
          data.religion ||
          data.blood_group) && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-purple-900 mb-3">
              <i className="fas fa-info-circle mr-2"></i>
              Additional Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.marital_status && (
                <div>
                  <span className="text-gray-700 font-medium">
                    Marital Status:
                  </span>
                  <p className="font-semibold text-gray-900">
                    {formatValue(data.marital_status)}
                  </p>
                </div>
              )}
              {data.nationality && (
                <div>
                  <span className="text-gray-700 font-medium">
                    Nationality:
                  </span>
                  <p className="font-semibold text-gray-900">
                    {formatValue(data.nationality)}
                  </p>
                </div>
              )}
              {data.religion && (
                <div>
                  <span className="text-gray-700 font-medium">Religion:</span>
                  <p className="font-semibold text-gray-900">
                    {formatValue(data.religion)}
                  </p>
                </div>
              )}
              {data.blood_group && (
                <div>
                  <span className="text-gray-700 font-medium">
                    Blood Group:
                  </span>
                  <p className="font-semibold text-gray-900">
                    {formatValue(data.blood_group)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const modalColor = getModalColor();

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: "spring", damping: 25, stiffness: 400 },
        }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div
          className={`bg-gradient-to-r from-${modalColor}-600 to-${modalColor}-700 px-6 py-4 text-white`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <i className={`${getModalIcon()} text-2xl mr-3`}></i>
              <h2 className="text-xl font-semibold">{getModalTitle()}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="mb-6">
            <p className="text-gray-700 text-center">
              Please review the information below carefully. You can go back to
              make changes or confirm to proceed.
            </p>
          </div>

          {renderEmploymentData()}
          {renderEmployeeData()}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isLoading}
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Go Back & Edit
            </button>

            <button
              onClick={onConfirm}
              className={`px-8 py-3 bg-${modalColor}-600 text-white rounded-lg hover:bg-${modalColor}-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {type === "create"
                    ? "Creating..."
                    : type === "update"
                    ? "Updating..."
                    : "Saving..."}
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Confirm &{" "}
                  {type === "create"
                    ? "Create"
                    : type === "update"
                    ? "Update"
                    : "Save"}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default DataReviewModal;
