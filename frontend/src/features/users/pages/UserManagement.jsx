import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Mail,
  Shield,
  User,
  Building2,
} from "lucide-react";
import { useConfirmationContext } from "../../../components/ui/ConfirmationProvider";
import { useErrorHandler } from "../../../hooks/useErrorHandler";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import EnhancedModal from "../../../components/ui/EnhancedModal";
import UserForm from "../components/UserForm";
import { userService } from "../services/userService";
import { useAuthStore } from "../../auth/authStore";

const UserManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showConfirmation } = useConfirmationContext();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();

  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Check if we're on the create route
  const isCreateRoute = location.pathname === "/users/create";
  const can = useAuthStore((s) => s.can);
  const currentUser = useAuthStore((s) => s.user);
  const isSuper = currentUser?.role?.name === "Super Admin";
  const canManage = can("users.manage");

  useEffect(() => {
    loadUsers();

    // If we're on the create route, automatically open the create form
    if (isCreateRoute) {
      setIsModalOpen(true);
    }
  }, [isCreateRoute]);

  const loadUsers = async () => {
    try {
      setIsLoadingData(true);
      const response = await userService.getAllUsers();
      setUsers(response.users || response || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreateUser = () => {
    if (!canManage) return;
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    if (!canManage) return;
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (user) => {
    showConfirmation({
      title: "Delete User",
      message: `Are you sure you want to delete user "${user.email}"?`,
      type: "danger",
      action: "delete",
      details: "This action cannot be undone.",
      onConfirm: () => deleteUser(user.id),
    });
  };

  const deleteUser = async (id) => {
    await withErrorHandling(
      async () => {
        await userService.deleteUser(id);
        await loadUsers();
      },
      {
        showAlert: true,
        customMessage: "User deleted successfully!",
      }
    );
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);

    // If we're on the create route, navigate back to users list
    if (isCreateRoute) {
      navigate("/users");
    }
  };

  const handleFormSubmit = async () => {
    await loadUsers();
    handleModalClose();

    // If we're on the create route, navigate back to users list after successful creation
    if (isCreateRoute) {
      navigate("/users");
    }
  };

  if (isLoadingData) {
    return <LoadingSpinner size="lg" text="Loading users..." />;
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-background-secondary)" }}
    >
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(isCreateRoute ? "/users" : "/dashboard")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: "var(--color-background-primary)" }}
            >
              <ArrowLeft
                className="w-5 h-5"
                style={{ color: "var(--color-text-primary)" }}
              />
            </button>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: "var(--color-primary-50)" }}
            >
              <Users
                className="w-8 h-8"
                style={{ color: "var(--color-primary-600)" }}
              />
            </div>
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {isCreateRoute ? "Create New User" : "User Management"}
              </h1>
              <p
                className="text-lg"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {isCreateRoute
                  ? "Add a new user to the system"
                  : "Manage system users and their access"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar - Only show when not on create route and if permitted */}
        {!isCreateRoute && canManage && (
          <div className="mb-6">
            <button
              onClick={handleCreateUser}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New User
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <ErrorMessage message={error} onClose={clearError} className="mb-6" />
        )}

        {/* Users Table - Only show when not on create route */}
        {!isCreateRoute && (
          <div className="card">
            <div className="card-header">
              <h3
                className="text-xl font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                All Users
              </h3>
              <p style={{ color: "var(--color-text-secondary)" }}>
                {users.length} user{users.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="p-6">
              {users.length === 0 ? (
                <div className="text-center py-12">
                  <Users
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
                    style={{ color: "var(--color-text-secondary)" }}
                  />
                  <h3
                    className="text-lg font-medium mb-2"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    No users found
                  </h3>
                  <p style={{ color: "var(--color-text-secondary)" }}>
                    Create your first user to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr
                        className="border-b"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <th
                          className="text-left py-3 px-4 font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          User Details
                        </th>
                        <th
                          className="text-left py-3 px-4 font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Role
                        </th>
                        <th
                          className="text-left py-3 px-4 font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Employee
                        </th>
                        <th
                          className="text-left py-3 px-4 font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Department
                        </th>
                        <th
                          className="text-left py-3 px-4 font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Location
                        </th>
                        <th
                          className="text-left py-3 px-4 font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Status
                        </th>
                        {canManage && (
                          <th
                            className="text-left py-3 px-4 font-medium"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            Operations
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b hover:bg-gray-50"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <div
                                className="font-medium flex items-center gap-2"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                <Mail className="w-4 h-4" />
                                {user.email}
                              </div>
                              <div
                                className="text-sm"
                                style={{ color: "var(--color-text-secondary)" }}
                              >
                                ID: {user.id}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {user.role ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                <Shield className="w-3 h-3" />
                                {isSuper
                                  ? user.role.name
                                  : user.role.name === "Super Admin"
                                  ? "Admin"
                                  : user.role.name}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">
                                No role assigned
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {user.employee ? (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-green-600" />
                                <div>
                                  <div
                                    className="font-medium"
                                    style={{
                                      color: "var(--color-text-primary)",
                                    }}
                                  >
                                    {user.employee.full_name}
                                  </div>
                                  <div
                                    className="text-sm"
                                    style={{
                                      color: "var(--color-text-secondary)",
                                    }}
                                  >
                                    {user.employee.employee_id}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">
                                No employee assigned
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {user.department ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-600" />
                                <div>
                                  <div
                                    className="font-medium"
                                    style={{
                                      color: "var(--color-text-primary)",
                                    }}
                                  >
                                    {user.department.name}
                                  </div>
                                  {user.department.code && (
                                    <div
                                      className="text-sm"
                                      style={{
                                        color: "var(--color-text-secondary)",
                                      }}
                                    >
                                      {user.department.code}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">
                                No department
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {user.location ? (
                              <div className="flex items-center gap-2">
                                {/* Reusing Building2 icon for simplicity */}
                                <Building2 className="w-4 h-4 text-teal-600" />
                                <div>
                                  <div
                                    className="font-medium"
                                    style={{
                                      color: "var(--color-text-primary)",
                                    }}
                                  >
                                    {user.location.name}
                                  </div>
                                  {user.location.type && (
                                    <div
                                      className="text-sm"
                                      style={{
                                        color: "var(--color-text-secondary)",
                                      }}
                                    >
                                      {user.location.type}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">
                                No location
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                          {canManage && (
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    isSuper || user.role?.name !== "Super Admin"
                                      ? handleEditUser(user)
                                      : null
                                  }
                                  disabled={
                                    !isSuper &&
                                    user.role?.name === "Super Admin"
                                  }
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    isSuper || user.role?.name !== "Super Admin"
                                      ? handleDeleteUser(user)
                                      : null
                                  }
                                  disabled={
                                    !isSuper &&
                                    user.role?.name === "Super Admin"
                                  }
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Form Modal - open only if permitted or when editing and permitted */}
        <EnhancedModal
          isOpen={(isModalOpen || isCreateRoute) && canManage}
          onClose={handleModalClose}
          title={editingUser ? "Edit User" : "Create New User"}
          size="lg"
        >
          {canManage && (
            <UserForm
              user={editingUser}
              onSubmit={handleFormSubmit}
              onCancel={handleModalClose}
            />
          )}
        </EnhancedModal>
      </div>
    </div>
  );
};

export default UserManagement;
