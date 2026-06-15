import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Users,
  Settings
} from 'lucide-react';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import RoleForm from '../components/RoleForm';
import { roleService } from '../services/roleService';

const RoleManagement = () => {
  const navigate = useNavigate();
  const { showConfirmation } = useConfirmationContext();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();
  
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setIsLoadingData(true);
      const response = await roleService.getAllRoles();
      setRoles(response.roles || response || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setIsModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleDeleteRole = (role) => {
    showConfirmation({
      title: 'Delete Role',
      message: `Are you sure you want to delete "${role.name}"?`,
      type: 'danger',
      action: 'delete',
      details: `This will also affect ${role._count?.users || 0} users.`,
      onConfirm: () => deleteRole(role.id)
    });
  };

  const deleteRole = async (id) => {
    await withErrorHandling(
      async () => {
        await roleService.deleteRole(id);
        await loadRoles();
      },
      {
        showAlert: true,
        customMessage: 'Role deleted successfully!'
      }
    );
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleFormSubmit = async () => {
    await loadRoles();
    handleModalClose();
  };

  if (isLoadingData) {
    return <LoadingSpinner size="lg" text="Loading roles..." />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-background-secondary)" }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ backgroundColor: "var(--color-background-primary)" }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: "var(--color-text-primary)" }} />
            </button>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
              <Shield className="w-8 h-8" style={{ color: "var(--color-primary-600)" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Role Management
              </h1>
              <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                Manage system roles and permissions
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6">
          <button
            onClick={handleCreateRole}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Role
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <ErrorMessage 
            message={error} 
            onClose={clearError}
            className="mb-6"
          />
        )}

        {/* Roles Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
              All Roles
            </h3>
            <p style={{ color: "var(--color-text-secondary)" }}>
              {roles.length} role{roles.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          <div className="p-6">
            {roles.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: "var(--color-text-secondary)" }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                  No roles found
                </h3>
                <p style={{ color: "var(--color-text-secondary)" }}>
                  Create your first role to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        Role Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        Type
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        Actions
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        Users
                      </th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: "var(--color-text-primary)" }}>
                        Operations
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id} className="border-b hover:bg-gray-50" style={{ borderColor: "var(--color-border)" }}>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                              {role.name}
                            </div>
                            <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                              {role.allowed_actions?.length || 0} permissions
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            role.type === 'system' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {role.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            role.enabled 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {role.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {role.allowed_actions?.slice(0, 3).map((action, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {action}
                              </span>
                            ))}
                            {role.allowed_actions?.length > 3 && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                                +{role.allowed_actions.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                            {role._count?.users || 0} users
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditRole(role)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit role"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(role)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete role"
                              disabled={role._count?.users > 0}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Role Form Modal */}
        <EnhancedModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          title={editingRole ? 'Edit Role' : 'Create New Role'}
          size="lg"
        >
          <RoleForm
            role={editingRole}
            onSubmit={handleFormSubmit}
            onCancel={handleModalClose}
          />
        </EnhancedModal>
      </div>
    </div>
  );
};

export default RoleManagement;
