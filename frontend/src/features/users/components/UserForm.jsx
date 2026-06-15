import React, { useState, useEffect } from "react";
import {
  Mail,
  Save,
  User,
  Shield,
  Lock,
  Eye,
  EyeOff,
  MapPin,
} from "lucide-react";
import { useErrorHandler } from "../../../hooks/useErrorHandler";
import { userService } from "../services/userService";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import { useAuthStore } from "../../auth/authStore";

const UserForm = ({ user, onSubmit, onCancel }) => {
  const { error, clearError, withErrorHandling, handleError } =
    useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const can = useAuthStore((s) => s.can);
  const canManage = can("users.manage");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role_id: "",
    employee_id: "",
    // New optional department field
    department_id: "",
    // New optional location field
    location_id: "",
  });

  const [roles, setRoles] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  // New: departments list
  const [departments, setDepartments] = useState([]);
  // New: locations list
  const [locations, setLocations] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!canManage) {
      setIsLoadingData(false);
      return;
    }
    loadFormData();
  }, [canManage]);

  const loadFormData = async () => {
    try {
      setIsLoadingData(true);
      // Use single endpoint to fetch roles + employees (+ departments)
      const {
        roles = [],
        employees = [],
        departments = [],
        locations = [],
      } = await userService.getFormOptions();
      setRoles(roles);
      setAvailableEmployees(employees);
      setDepartments(departments);
      setLocations(locations);

      // If editing, add current user's employee to the list
      if (user?.employee) {
        setAvailableEmployees((prev) => {
          const exists = prev.find((emp) => emp.id === user.employee.id);
          if (!exists) {
            return [...prev, user.employee];
          }
          return prev;
        });
      }

      // If editing, add current user's department to the list if missing
      if (user?.department) {
        setDepartments((prev) => {
          const exists = prev.find((dep) => dep.id === user.department.id);
          if (!exists) {
            return [...prev, user.department];
          }
          return prev;
        });
      }

      // If editing, add current user's location to the list if missing
      if (user?.location) {
        setLocations((prev) => {
          const exists = prev.find((loc) => loc.id === user.location.id);
          if (!exists) {
            return [...prev, user.location];
          }
          return prev;
        });
      }

      // Set form data if editing
      if (user) {
        setFormData({
          email: user.email || "",
          password: "",
          role_id: user.role?.id?.toString() || "",
          employee_id: user.employee?.id?.toString() || "",
          department_id: user.department?.id?.toString() || "",
          location_id: user.location?.id?.toString() || "",
        });

        if (user.role?.name === "Super Admin") {
          console.log("Warning: Editing Super Admin user");
        }
      }
    } catch (error) {
      console.error("Error loading form data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!formData.email.trim() || !formData.role_id) {
      return;
    }

    if (!user && !formData.password.trim()) {
      return;
    }

    if (user?.role?.name === "Super Admin") {
      clearError();
      handleError("Super Admin users cannot be modified for security reasons", {
        showAlert: false,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        email: formData.email.trim(),
        role_id: formData.role_id,
        employee_id:
          formData.employee_id && formData.employee_id.toString().trim() !== ""
            ? formData.employee_id
            : null,
        // Include optional department assignment
        department_id:
          formData.department_id &&
          formData.department_id.toString().trim() !== ""
            ? formData.department_id
            : null,
        // Include optional location assignment
        location_id:
          formData.location_id && formData.location_id.toString().trim() !== ""
            ? formData.location_id
            : null,
      };

      if (formData.password.trim()) {
        submitData.password = formData.password;
      }

      if (user) {
        await userService.updateUser(user.id, submitData);
      } else {
        await userService.createUser(submitData);
      }
      onSubmit();
    } catch (error) {
      console.error("Error saving user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleOptions = () => {
    const filteredRoles = roles.filter((role) => role.name !== "Super Admin");
    return filteredRoles.map((role) => ({
      value: role.id.toString(),
      label: role.name,
      description: `${role.type} role`,
    }));
  };

  const getEmployeeOptions = () => {
    return availableEmployees.map((employee) => ({
      value: employee.id.toString(),
      label: `${employee.full_name} - ${employee.cnic}`,
      description: `CNIC: ${employee.cnic}${
        employee.email ? ` | ${employee.email}` : ""
      }`,
    }));
  };

  // New: build department options
  const getDepartmentOptions = () => {
    return departments.map((dept) => ({
      value: dept.id.toString(),
      label: `${dept.name}${dept.code ? ` (${dept.code})` : ""}`,
      description: dept.code ? `Code: ${dept.code}` : undefined,
    }));
  };

  // New: build location options
  const getLocationOptions = () => {
    return locations.map((loc) => ({
      value: loc.id.toString(),
      label: `${loc.name} ${loc.type ? `- ${loc.type.replace("_", " ")}` : ""}`,
      description: loc.type,
    }));
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 font-medium">
            Loading form data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              User Information
            </h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Enter email address (e.g., user@company.com)"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password {!user && "*"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder={
                    user
                      ? "Leave blank to keep current password"
                      : "Enter secure password"
                  }
                  required={!user}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {user && (
                <p className="text-xs text-gray-500 mt-2">
                  Leave blank to keep the current password unchanged
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Role Assignment */}
        <div className="space-y-6 mb-12">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Role Assignment
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role *
              </label>
              <SearchableSelect
                options={getRoleOptions()}
                value={formData.role_id}
                onChange={(value) => handleInputChange("role_id", value)}
                placeholder="Select a role for this user"
                required
                disabled={user?.role?.name === "Super Admin"}
                data-dropdown-type="role"
              />
              <p className="text-xs text-gray-500 mt-2">
                The role determines what actions and data this user can access
              </p>
              <p className="text-xs text-blue-600 mt-1">
                <strong>Note:</strong> Super Admin role is restricted and cannot
                be assigned to new users
              </p>
              {user?.role?.name === "Super Admin" && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>⚠️ Super Admin User:</strong> This user has Super
                    Admin privileges. The role cannot be changed for security
                    reasons.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visual Separator */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Employee Assignment */}
        <div className="space-y-6 mb-8">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Employee Assignment
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assign to Employee (Optional)
              </label>
              {availableEmployees.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>No available employees found.</strong> All employees
                    are already assigned to user accounts.
                  </p>
                  <p className="text-xs text-yellow-700 mt-2">
                    This is normal if all employees in the system already have
                    user accounts. You can still create a user without assigning
                    an employee.
                  </p>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800">
                      <strong>Debug Info:</strong> Found{" "}
                      {availableEmployees.length} available employees
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <SearchableSelect
                    options={getEmployeeOptions()}
                    value={formData.employee_id}
                    onChange={(value) =>
                      handleInputChange("employee_id", value)
                    }
                    placeholder="Select an employee to link with this user account"
                    allowClear
                    data-dropdown-type="employee"
                  />
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Assigning an employee creates a 1:1
                      relationship. Each employee can only be assigned to one
                      user account. This is optional and can be set later.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Available employees: {availableEmployees.length}
                    </p>
                    {availableEmployees.length > 0 && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-xs text-green-800">
                          <strong>Available:</strong>{" "}
                          {availableEmployees
                            .map(
                              (emp) =>
                                `${emp.full_name} (${
                                  emp.cnic || emp.employee_id
                                })`
                            )
                            .join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Department Assignment */}
        <div className="space-y-6 mb-8">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Department Assignment
            </h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assign to Department (Optional)
              </label>
              <SearchableSelect
                options={getDepartmentOptions()}
                value={formData.department_id}
                onChange={(value) => handleInputChange("department_id", value)}
                placeholder="Select a department to link with this user account"
                allowClear
                data-dropdown-type="department"
              />
              <p className="text-xs text-gray-500 mt-2">
                This is optional and can be changed anytime. Useful for
                department accounts or scoping permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Location Assignment */}
        <div className="space-y-6 mb-8">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="p-2 bg-teal-100 rounded-lg">
              <MapPin className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Location Assignment
            </h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assign to Location (Optional)
              </label>
              <SearchableSelect
                options={getLocationOptions()}
                value={formData.location_id}
                onChange={(value) => handleInputChange("location_id", value)}
                placeholder="Select a location to link with this user account"
                allowClear
                data-dropdown-type="location"
              />
              <p className="text-xs text-gray-500 mt-2">
                This is optional. Useful for creating a location-based user
                (e.g., Bazaar account).
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !formData.email.trim() ||
              !formData.role_id ||
              user?.role?.name === "Super Admin"
            }
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Saving..." : user ? "Update User" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
