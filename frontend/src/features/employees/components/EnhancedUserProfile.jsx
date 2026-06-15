import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEmployeeStore } from "../store/employeeStore";
import { useErrorHandler } from "../../../hooks/useErrorHandler";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import ProfilePicture from "../../../components/ui/ProfilePicture";
import DocumentViewer from "../../../components/ui/DocumentViewer";
import OrganizedDocumentGrid from "../../../components/ui/OrganizedDocumentGrid";
import DetailField, { hasValue } from "../../../components/ui/DetailField";
import { getImageUrl } from "../../../utils/imageUtils";
import {
  formatDateDisplay,
  displayCNIC,
  displayPhoneNumber,
  calculateAge,
  formatCityName,
  formatDistrictName,
  toTitleCase,
} from "../../../utils/formatters";

// Helper functions for experience calculations
const calculateExperienceDuration = (startDate, endDate) => {
  if (!startDate) return "Duration not available";

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);

  if (years > 0) {
    return months > 0
      ? `${years} year${years > 1 ? "s" : ""}, ${months} month${
          months > 1 ? "s" : ""
        }`
      : `${years} year${years > 1 ? "s" : ""}`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? "s" : ""}`;
  } else {
    return "Less than a month";
  }
};

const calculateTotalExperienceYears = (experiences) => {
  if (!experiences || experiences.length === 0) return "0";

  let totalMonths = 0;
  experiences.forEach((exp) => {
    if (exp.start_date) {
      const start = new Date(exp.start_date);
      const end = exp.end_date ? new Date(exp.end_date) : new Date();
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalMonths += Math.floor(diffDays / 30);
    }
  });

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0) {
    return months > 0
      ? `${years}.${Math.floor((months / 12) * 10)}`
      : `${years}`;
  } else {
    return "< 1";
  }
};

const getUniqueCompaniesCount = (experiences) => {
  if (!experiences || experiences.length === 0) return "0";

  const uniqueCompanies = new Set();
  experiences.forEach((exp) => {
    if (exp.company_name && exp.company_name.trim()) {
      uniqueCompanies.add(exp.company_name.trim().toLowerCase());
    }
  });

  return uniqueCompanies.size.toString();
};

// Label/value block that renders nothing when the value is empty (no "")
const ProfileField = ({ label, value }) =>
  hasValue(value) ? (
    <div>
      <p className="text-sm text-gray-700 font-medium">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  ) : null;

const EnhancedUserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEmployee } = useEmployeeStore();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();

  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadEmployeeData();
  }, [id]);

  const loadEmployeeData = async () => {
    try {
      const numericId = parseInt(id);
      const employeeData = await withErrorHandling(
        () => getEmployee(numericId),
        { showAlert: false }
      );

      // Debug logging to check employment records
      console.log(
        "🔍 EnhancedUserProfile: Loaded employee data:",
        employeeData
      );
      console.log(
        "📋 EnhancedUserProfile: Employment records count:",
        employeeData?.employmentRecords?.length || 0
      );
      console.log(
        "📋 EnhancedUserProfile: Employment records:",
        employeeData?.employmentRecords
      );

      if (employeeData?.employmentRecords?.length > 0) {
        const currentPos = getCurrentPosition(employeeData.employmentRecords);
        console.log("🔍 EnhancedUserProfile: Current position:", currentPos);
        console.log(
          "💰 EnhancedUserProfile: Current salary data:",
          currentPos?.salary
        );
      }
      console.log(
        "📋 EnhancedUserProfile: Employment records:",
        employeeData?.employmentRecords
      );

      setEmployee(employeeData);
    } catch (error) {
      console.error("Error loading employee data:", error);
    }
  };

  // Use utility function for consistent date formatting
  const formatDate = (dateString) => {
    console.log(
      "🔍 EnhancedUserProfile: Formatting date:",
      dateString,
      "Type:",
      typeof dateString
    );
    const result = formatDateDisplay(dateString);
    console.log("📅 EnhancedUserProfile: Formatted result:", result);
    return result;
  };

  const calculateExperience = (employmentRecords) => {
    if (!employmentRecords || employmentRecords.length === 0)
      return "No experience";

    const totalMonths = employmentRecords.reduce((total, record) => {
      // Experience is based on employment DURATION only (joining/effective dates),
      // never on salary data (req #12). Prefer the permanent joining_date.
      const startRaw = record.joining_date || record.effective_from;
      if (!startRaw) return total;
      const startDate = new Date(startRaw);
      const endDate = record.effective_till
        ? new Date(record.effective_till)
        : new Date();
      const months =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      return total + Math.max(0, months);
    }, 0);

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
    if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
    return `${years} year${years !== 1 ? "s" : ""}, ${months} month${
      months !== 1 ? "s" : ""
    }`;
  };

  const getCurrentPosition = (employmentRecords) => {
    if (!employmentRecords || employmentRecords.length === 0) return null;

    // First try to find by is_current flag
    let currentRecord = employmentRecords.find(
      (record) => record.is_current === true
    );

    // Fallback: if no is_current flag, look for records without end date
    if (!currentRecord) {
      currentRecord = employmentRecords.find(
        (record) => record.effective_till === null
      );
    }

    // If still no current record, get the most recent one
    if (!currentRecord && employmentRecords.length > 0) {
      currentRecord = [...employmentRecords].sort(
        (a, b) =>
          new Date(b.joining_date || b.effective_from || 0) -
          new Date(a.joining_date || a.effective_from || 0)
      )[0];
    }

    return currentRecord;
  };

  // Format employment location preferring actual location name (loc.name) over generic type labels
  const displayEmploymentLocation = (rec) => {
    const loc = rec?.location;
    if (loc && typeof loc === "object") {
      const clean = (val) => {
        if (val === undefined || val === null) return "";
        const s = String(val).trim();
        if (!s || s.toLowerCase() === "null") return "";
        return s;
      };

      // Prefer the canonical location name field
      const name = clean(loc.name);
      if (name) return name;

      // Fallbacks for legacy bazaar_name field
      const bazaarName = clean(loc.bazaar_name);
      if (bazaarName) return bazaarName;

      // As last resort, map by type
      const typeMap = {
        HEAD_OFFICE: "Head Office",
        HEAD_QUARTER: "Head Quarter",
        BAZAAR: "Bazaar",
        SAHULAT_BAZAAR: "Sahulat Bazaar",
      };
      return typeMap[loc.type] || rec?.office_location || "";
    }
    // Fallback for older data without populated location relation
    return rec?.office_location || "";
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--color-background-secondary)" }}
      >
        <div className="max-w-6xl mx-auto py-8 px-4">
          <LoadingSpinner size="lg" text="Loading employee profile..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--color-background-secondary)" }}
      >
        <div className="max-w-6xl mx-auto py-8 px-4">
          <ErrorMessage error={error} onRetry={loadEmployeeData} />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--color-background-secondary)" }}
      >
        <div className="max-w-6xl mx-auto py-8 px-4">
          <div className="text-center">
            <i className="fas fa-user-slash text-6xl text-gray-600 mb-4"></i>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Employee Not Found
            </h2>
            <p className="text-gray-700 mb-6">
              The employee you're looking for doesn't exist.
            </p>
            <button
              onClick={() => navigate("/employees")}
              className="btn btn-primary"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Employee List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPosition = getCurrentPosition(employee.employmentRecords);
  // Calculate total employment experience from employment history only (all orgs)
  const employmentRecords = Array.isArray(employee.employmentRecords)
    ? employee.employmentRecords
    : [];
  const totalEmploymentExperience =
    employmentRecords.length > 0
      ? calculateExperience(employmentRecords)
      : "No employment experience";

  // Debug logging for current position and salary
  console.log("🔍 EnhancedUserProfile: Current position:", currentPosition);
  console.log(
    "💰 EnhancedUserProfile: Current salary:",
    currentPosition?.salary
  );
  console.log(
    "🏢 EnhancedUserProfile: Current organization:",
    currentPosition?.organization
  );
  console.log(
    "📍 EnhancedUserProfile: Current location:",
    currentPosition?.location
  );
  console.log(
    "📅 EnhancedUserProfile: Current effective_from:",
    currentPosition?.effective_from
  );
  console.log(
    "🏢 EnhancedUserProfile: Current office_location:",
    currentPosition?.office_location
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: "fas fa-user" },
    { id: "employment", label: "Employment History", icon: "fas fa-briefcase" },
    { id: "experience", label: "Past Experience", icon: "fas fa-history" },
    { id: "personal", label: "Personal Details", icon: "fas fa-id-card" },
    { id: "contact", label: "Contact Information", icon: "fas fa-phone" },
    { id: "documents", label: "Documents", icon: "fas fa-file-alt" },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-background-secondary)" }}
    >
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                <ProfilePicture
                  employee={employee}
                  size="2xl"
                  className="w-24 h-24 border-2 border-white/30"
                  showFallback={true}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {employee.full_name}
                </h1>
                <div className="flex items-center space-x-4 text-white">
                  <span>
                    <i className="fas fa-id-card mr-2"></i>
                    {displayCNIC(employee.cnic) || ""}
                  </span>
                  {currentPosition && (
                    <span>
                      <i className="fas fa-briefcase mr-2"></i>
                      {currentPosition.designation?.title ||
                        currentPosition.designation_text ||
                        (typeof currentPosition.designation === "string"
                          ? currentPosition.designation
                          : "")}{" "}
                      at {currentPosition.organization}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-white mt-2">
                  <span>
                    <i className="fas fa-calendar mr-2"></i>
                    {totalEmploymentExperience}
                  </span>
                  {currentPosition &&
                    (currentPosition.scale_grade?.name ||
                      currentPosition.scale_grade_id ||
                      currentPosition.scale_grade) && (
                      <span>
                        <i className="fas fa-layer-group mr-2"></i>
                        Scale/Grade:{" "}
                        {currentPosition.scale_grade?.name ||
                          currentPosition.scale_grade_id ||
                          currentPosition.scale_grade}
                      </span>
                    )}
                  <span>
                    <i className="fas fa-envelope mr-2"></i>
                    {employee.email || ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/employees/${employee.id}/edit`)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <i className="fas fa-edit mr-2"></i>
                Edit Profile
              </button>
              <button
                onClick={() => navigate(`/employees/${employee.id}/employment`)}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <i className="fas fa-briefcase mr-2"></i>
                Manage Employment
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-briefcase text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-700 font-medium">
                  Total Positions
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {employee.employmentRecords?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-700 font-medium">
                  Employment Experience
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {totalEmploymentExperience}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-money-bill text-purple-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-700 font-medium">
                  Current Salary
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {currentPosition?.salary
                    ? (() => {
                        const salary = currentPosition.salary;
                        let totalSalary = 0;

                        // Calculate total salary based on organization
                        if (currentPosition.organization === "MBWO") {
                          // MBWO uses gross_salary
                          totalSalary = salary.gross_salary || 0;
                        } else {
                          // Other organizations use sum of components
                          totalSalary =
                            (salary.basic_salary || 0) +
                            (salary.medical_allowance || 0) +
                            (salary.house_rent || 0) +
                            (salary.conveyance_allowance || 0) +
                            (salary.other_allowances || 0);
                        }

                        return totalSalary > 0
                          ? `PKR ${totalSalary.toLocaleString()}`
                          : "";
                      })()
                    : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-building text-orange-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-700 font-medium">Current Org</p>
                <p className="text-lg font-bold text-gray-900">
                  {currentPosition?.organization || ""}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm mb-8"
        >
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-2 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300"
                    }
                  `}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Current Position */}
                {currentPosition && (
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      Current Position
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-700 font-medium">
                          Organization
                        </p>
                        <p className="font-semibold text-gray-900">
                          {currentPosition.organization}
                        </p>
                      </div>
                      <ProfileField
                        label="Designation"
                        value={
                          currentPosition.designation?.title ||
                          currentPosition.designation_text ||
                          (typeof currentPosition.designation === "string"
                            ? currentPosition.designation
                            : "")
                        }
                      />
                      <ProfileField
                        label="Department"
                        value={
                          currentPosition.department?.name ||
                          currentPosition.department_text ||
                          (typeof currentPosition.department === "string"
                            ? currentPosition.department
                            : "")
                        }
                      />
                      <ProfileField
                        label="Joining Date"
                        value={formatDate(
                          currentPosition.joining_date ||
                            currentPosition.effective_from
                        )}
                      />
                      <ProfileField
                        label="Employment Type"
                        value={currentPosition.employment_type}
                      />
                      <ProfileField
                        label="On Probation"
                        value={currentPosition.is_on_probation ? "Yes" : ""}
                      />
                      {currentPosition.is_on_probation && (
                        <ProfileField
                          label="Probation End Date"
                          value={formatDate(
                            currentPosition.probation_end_date
                          )}
                        />
                      )}
                      <ProfileField
                        label="Office Location"
                        value={displayEmploymentLocation(currentPosition)}
                      />
                    </div>
                  </div>
                )}

                {/* Quick Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">CNIC:</span>
                        <span className="font-semibold text-gray-900">
                          {displayCNIC(employee.cnic)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">
                          Date of Birth:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatDate(employee.date_of_birth)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">
                          Gender:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {employee.gender || ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">
                          Marital Status:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {toTitleCase(employee.marital_status || "")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">
                          Mobile:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {displayPhoneNumber(employee.mobile_number) || ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">
                          Email:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {employee.email || ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">City:</span>
                        <span className="font-semibold text-gray-900">
                          {employee.cityRef?.name ||
                            formatCityName(employee.city) ||
                            ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">
                          District:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {employee.districtRef?.name ||
                            formatDistrictName(employee.district) ||
                            ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "employment" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {employee.employmentRecords &&
                employee.employmentRecords.length > 0 ? (
                  <div className="space-y-4">
                    {[...employee.employmentRecords]
                      .sort(
                        (a, b) =>
                          new Date(b.joining_date || b.effective_from || 0) -
                          new Date(a.joining_date || a.effective_from || 0)
                      )
                      .map((record) => (
                        <div
                          key={record.id}
                          className="relative bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          {/* Big Org Tab */}
                          <div
                            className={`absolute -top-3 left-0 px-4 py-1 rounded-br-lg text-white text-sm font-semibold shadow ${
                              record.organization === "MBWO"
                                ? "bg-blue-600"
                                : record.organization === "PMBMC"
                                ? "bg-amber-600"
                                : record.organization === "PSBA"
                                ? "bg-green-600"
                                : "bg-slate-600"
                            }`}
                          >
                            {record.organization || ""}
                          </div>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {record.designation?.title ||
                                    record.designation_text ||
                                    (typeof record.designation === "string"
                                      ? record.designation
                                      : "")}
                                </h4>
                                {/* Org Tag */}
                                {(() => {
                                  const org = record.organization;
                                  const cfg =
                                    org === "MBWO"
                                      ? {
                                          label: "MBWO",
                                          cls: "bg-blue-100 text-blue-800 ring-blue-200",
                                        }
                                      : org === "PMBMC"
                                      ? {
                                          label: "PMBMC",
                                          cls: "bg-amber-100 text-amber-800 ring-amber-200",
                                        }
                                      : org === "PSBA"
                                      ? {
                                          label: "PSBA",
                                          cls: "bg-green-100 text-green-800 ring-green-200",
                                        }
                                      : {
                                          label: org || "",
                                          cls: "bg-slate-100 text-slate-700 ring-slate-200",
                                        };
                                  return (
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${cfg.cls}`}
                                    >
                                      {cfg.label}
                                    </span>
                                  );
                                })()}
                                {record.id === currentPosition?.id && (
                                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 mb-2 font-medium">
                                {record.organization} •{" "}
                                {record.department?.name ||
                                  record.department_text ||
                                  (typeof record.department === "string"
                                    ? record.department
                                    : "")}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-700 font-medium">
                                    Period:
                                  </span>
                                  <p className="font-semibold text-gray-900">
                                    {formatDate(
                                      record.joining_date || record.effective_from
                                    )}{" "}
                                    -{" "}
                                    {record.effective_till
                                      ? formatDate(record.effective_till)
                                      : "Present"}
                                  </p>
                                </div>
                                {(() => {
                                  const salary = record.salary;
                                  if (!salary) return null;
                                  const totalSalary =
                                    record.organization === "MBWO"
                                      ? salary.gross_salary || 0
                                      : (salary.basic_salary || 0) +
                                        (salary.medical_allowance || 0) +
                                        (salary.house_rent || 0) +
                                        (salary.conveyance_allowance || 0) +
                                        (salary.other_allowances || 0);
                                  if (totalSalary <= 0) return null;
                                  return (
                                    <div>
                                      <span className="text-gray-700 font-medium">
                                        Salary:
                                      </span>
                                      <p className="font-semibold text-gray-900">
                                        {`PKR ${totalSalary.toLocaleString()}`}
                                      </p>
                                    </div>
                                  );
                                })()}
                                {record.employment_type && (
                                  <div>
                                    <span className="text-gray-700 font-medium">
                                      Type:
                                    </span>
                                    <p className="font-semibold text-gray-900">
                                      {record.employment_type}
                                    </p>
                                  </div>
                                )}
                                {record.is_on_probation &&
                                  record.probation_end_date && (
                                    <div>
                                      <span className="text-gray-700 font-medium">
                                        Probation End:
                                      </span>
                                      <p className="font-semibold text-gray-900">
                                        {formatDate(record.probation_end_date)}
                                      </p>
                                    </div>
                                  )}
                                {(record.scale_grade?.name ||
                                  record.scale_grade_id) && (
                                  <div>
                                    <span className="text-gray-700 font-medium">
                                      Scale/Grade:
                                    </span>
                                    <p className="font-semibold text-gray-900">
                                      {record.scale_grade?.name ||
                                        record.scale_grade_id}
                                    </p>
                                  </div>
                                )}
                                {(record.role_tag?.name ||
                                  record.role_tag_id) && (
                                  <div>
                                    <span className="text-gray-700 font-medium">
                                      Role Tag:
                                    </span>
                                    <p className="font-semibold text-gray-900">
                                      {record.role_tag?.name ||
                                        record.role_tag_id}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-700 font-medium">
                                    Location:
                                  </span>
                                  <p className="font-semibold text-gray-900">
                                    {displayEmploymentLocation(record)}
                                  </p>
                                </div>
                              </div>
                              {record.remarks && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <span className="text-gray-500 text-sm">
                                    Remarks:
                                  </span>
                                  <p className="text-sm text-gray-700 mt-1">
                                    {record.remarks}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <i className="fas fa-briefcase text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Employment Records
                    </h3>
                    <p className="text-gray-500 mb-6">
                      This employee doesn't have any employment records yet.
                    </p>
                    <button
                      onClick={() =>
                        navigate(`/employees/${employee.id}/employment`)
                      }
                      className="btn btn-primary"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Employment Record
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "personal" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-700 font-medium">
                          Full Name:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {employee.full_name}
                        </span>
                      </div>
                      <DetailField
                        layout="row"
                        className="border-b border-gray-100"
                        label={
                          employee.relationship_type === "father"
                            ? "Father Name:"
                            : "Husband Name:"
                        }
                        value={employee.father_husband_name}
                      />
                      <DetailField
                        layout="row"
                        className="border-b border-gray-100"
                        label="Relationship Type:"
                        value={employee.relationship_type}
                        valueClassName="capitalize"
                      />
                      <DetailField
                        layout="row"
                        className="border-b border-gray-100"
                        label="Mother Name:"
                        value={employee.mother_name}
                      />
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-700 font-medium">CNIC:</span>
                        <span className="font-semibold text-gray-900">
                          {displayCNIC(employee.cnic)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-700 font-medium">
                          Date of Birth:
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatDate(employee.date_of_birth)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Personal Details
                    </h3>
                    <div className="space-y-3">
                      <DetailField layout="row" className="border-b border-gray-100" label="Gender:" value={employee.gender} />
                      <DetailField layout="row" className="border-b border-gray-100" label="Marital Status:" value={hasValue(employee.marital_status) ? toTitleCase(employee.marital_status) : ""} />
                      <DetailField layout="row" className="border-b border-gray-100" label="Nationality:" value={employee.nationality} />
                      <DetailField layout="row" className="border-b border-gray-100" label="Religion:" value={employee.religion} />
                      <DetailField layout="row" className="border-b border-gray-100" label="Blood Group:" value={employee.blood_group} />
                    </div>
                  </div>

                  {/* Disability Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Disability Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-700 font-medium">
                          Has Disability:
                        </span>
                        <span
                          className={`font-semibold ${
                            employee.has_disability
                              ? "text-orange-600"
                              : "text-green-600"
                          }`}
                        >
                          {employee.has_disability ? "Yes" : "No"}
                        </span>
                      </div>
                      {employee.has_disability && (
                        <>
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-700 font-medium">
                              Disability Type:
                            </span>
                            <span className="font-semibold text-gray-900">
                              {employee.disability_type || ""}
                            </span>
                          </div>
                          {employee.disability_description && (
                            <div className="py-2">
                              <span className="text-gray-700 font-medium">
                                Description:
                              </span>
                              <p className="font-medium text-gray-900 mt-1 p-3 bg-orange-50 rounded border border-orange-200">
                                {employee.disability_description}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">CNIC Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">CNIC Number:</span>
                        <span className="font-medium">
                          {displayCNIC(employee.cnic)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Biometric ID:</span>
                        <span className="font-medium">
                          {employee.deviceUserId || ""}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Issue Date:</span>
                        <span className="font-medium">
                          {formatDate(employee.cnic_issue_date)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Expire Date:</span>
                        <span className="font-medium">
                          {employee.cnic_lifetime
                            ? "Lifetime"
                            : formatDate(employee.cnic_expire_date)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">
                          Domicile District:
                        </span>
                        <span className="font-medium">
                          {formatDistrictName(employee.domicile_district)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Education Qualifications
                    </h3>
                    {employee.educationQualifications &&
                    employee.educationQualifications.length > 0 ? (
                      <div className="space-y-4">
                        {employee.educationQualifications.map(
                          (education, index) => (
                            <div
                              key={index}
                              className="bg-green-50 p-4 rounded-lg border border-green-200"
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 text-sm">
                                    Education Level:
                                  </span>
                                  <span className="font-medium text-green-800">
                                    {education.level?.name ||
                                      education.education_level ||
                                      ""}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 text-sm">
                                    Institution:
                                  </span>
                                  <span className="font-medium">
                                    {education.institution_name || ""}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 text-sm">
                                    Start Year:
                                  </span>
                                  <span className="font-medium">
                                    {education.start_date || ""}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 text-sm">
                                    Date of Completion:
                                  </span>
                                  <span className="font-medium">
                                    {education.year_of_completion
                                      ? formatDate(education.year_of_completion)
                                      : ""}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 text-sm">
                                    Marks/GPA:
                                  </span>
                                  <span className="font-medium">
                                    {education.marks_gpa || ""}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600 text-sm">
                                    Roll No:
                                  </span>
                                  <span className="font-medium">
                                    {education.roll_no || ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <i className="fas fa-graduation-cap text-2xl mb-2"></i>
                        <p>No education qualifications recorded</p>
                      </div>
                    )}

                    {/* Legacy field fallback */}
                    {(!employee.educationQualifications ||
                      employee.educationQualifications.length === 0) &&
                      employee.latest_qualification && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">
                              Latest Qualification (Legacy):
                            </span>
                            <span className="font-medium">
                              {employee.latest_qualification}
                            </span>
                          </div>
                        </div>
                      )}

                    {employee.mission_note && (
                      <div className="mt-4 py-2">
                        <span className="text-gray-600">Missing Note:</span>
                        <p className="font-medium mt-1 p-3 bg-gray-50 rounded">
                          {employee.mission_note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "contact" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="text-gray-700">
                  <h3 className="text-lg font-semibold mb-4">
                    Contact Details
                  </h3>
                  <div className="space-y-3">
                    <DetailField layout="row" className="border-b border-gray-100" label="Mobile Number:" value={displayPhoneNumber(employee.mobile_number)} />
                    <DetailField layout="row" className="border-b border-gray-100" label="WhatsApp Number:" value={employee.whatsapp_number} />
                    <DetailField layout="row" className="border-b border-gray-100" label="Email:" value={employee.email} />
                    <DetailField layout="row" className="border-b border-gray-100" label="City:" value={employee.cityRef?.name || formatCityName(employee.city)} />
                    <DetailField layout="row" className="border-b border-gray-100" label="District:" value={employee.districtRef?.name || formatDistrictName(employee.district)} />
                  </div>
                </div>

                <div className="text-gray-800">
                  <h3 className="text-lg font-semibold mb-4">Addresses</h3>
                  <div className="space-y-4">
                    {hasValue(employee.present_address) && (
                      <div>
                        <span className="text-gray-600 text-sm">Present Address:</span>
                        <p className="font-medium mt-1 p-3 bg-gray-50 rounded">
                          {employee.present_address}
                        </p>
                      </div>
                    )}
                    {hasValue(employee.permanent_address) && (
                      <div>
                        <span className="text-gray-600 text-sm">Permanent Address:</span>
                        <p className="font-medium mt-1 p-3 bg-gray-50 rounded">
                          {employee.permanent_address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "experience" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    <i className="fas fa-history mr-3 text-indigo-600"></i>
                    Past Work Experience
                  </h3>
                  <div className="text-sm text-gray-600">
                    {employee.pastExperiences &&
                    employee.pastExperiences.length > 0
                      ? `${employee.pastExperiences.length} experience(s)`
                      : "No experience recorded"}
                  </div>
                </div>

                {employee.pastExperiences &&
                employee.pastExperiences.length > 0 ? (
                  <div className="space-y-6">
                    {employee.pastExperiences.map((experience, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">
                              {experience.company_name ||
                                "Company Name Not Provided"}
                            </h4>
                            {experience.position && (
                              <p className="text-blue-700 font-medium mb-2">
                                {experience.position}
                              </p>
                            )}
                            <div className="flex items-center text-sm text-gray-600 space-x-4">
                              <span className="flex items-center">
                                <i className="fas fa-calendar-alt mr-2"></i>
                                {formatDate(experience.start_date) ||
                                  "Start date not provided"}
                              </span>
                              <span>→</span>
                              <span className="flex items-center">
                                <i className="fas fa-calendar-check mr-2"></i>
                                {experience.end_date
                                  ? formatDate(experience.end_date)
                                  : "Present"}
                              </span>
                            </div>
                          </div>
                          <div className="bg-white/60 px-3 py-1 rounded-full text-xs font-medium text-indigo-700">
                            Experience #{index + 1}
                          </div>
                        </div>

                        {experience.description && (
                          <div className="mt-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">
                              <i className="fas fa-file-alt mr-2"></i>
                              Job Description:
                            </h5>
                            <div className="bg-white/60 p-4 rounded-lg border border-blue-100">
                              <p className="text-gray-700 leading-relaxed text-sm">
                                {experience.description}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Duration Calculation */}
                        {experience.start_date && (
                          <div className="mt-4 pt-4 border-t border-blue-200">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span className="flex items-center">
                                <i className="fas fa-clock mr-2"></i>
                                Duration:{" "}
                                {calculateExperienceDuration(
                                  experience.start_date,
                                  experience.end_date
                                )}
                              </span>
                              {!experience.end_date && (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                  Currently Working
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Experience Summary */}
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        <i className="fas fa-chart-line mr-2 text-green-600"></i>
                        Experience Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {employee.pastExperiences.length}
                          </div>
                          <div className="text-sm text-gray-600">
                            Total Positions
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {calculateTotalExperienceYears(
                              employee.pastExperiences
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            Years of Experience
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {getUniqueCompaniesCount(employee.pastExperiences)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Companies Worked
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <i className="fas fa-briefcase text-6xl text-gray-400 mb-4"></i>
                    <h4 className="text-lg font-semibold text-gray-600 mb-2">
                      No Past Experience Recorded
                    </h4>
                    <p className="text-gray-500 mb-6">
                      This employee doesn't have any past work experience
                      recorded yet.
                    </p>
                    <button
                      onClick={() => navigate(`/employees/${employee.id}/edit`)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Experience Information
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "documents" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    <i className="fas fa-file-alt mr-3 text-blue-600"></i>
                    Documents & Attachments
                  </h3>
                </div>

                {/* Organized Documents Grid */}
                <OrganizedDocumentGrid
                  documents={employee.documents || []}
                  profilePicture={
                    employee.profile_picture_url
                      ? `${
                          import.meta.env.VITE_API_URL?.replace("/api", "") ||
                          "http://localhost:3000"
                        }${employee.profile_picture_url}`
                      : employee.profile_picture
                      ? getImageUrl(employee.profile_picture)
                      : null
                  }
                  className="mb-6"
                />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center space-x-4"
        >
          <button
            onClick={() => navigate("/employees")}
            className="btn btn-secondary"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Employee List
          </button>
          <button
            onClick={() => navigate(`/employees/${employee.id}/edit`)}
            className="btn btn-primary"
          >
            <i className="fas fa-edit mr-2"></i>
            Edit Profile
          </button>
          <button
            onClick={() => navigate(`/employees/${employee.id}/employment`)}
            className="btn btn-primary"
          >
            <i className="fas fa-briefcase mr-2"></i>
            Manage Employment
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default EnhancedUserProfile;
