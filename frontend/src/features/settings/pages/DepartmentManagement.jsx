import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Users,
  Briefcase,
  UserCircle
} from 'lucide-react';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import DepartmentForm from '../components/DepartmentForm';
import { departmentService } from '../services/departmentService';

const DepartmentManagement = () => {
  const navigate = useNavigate();
  const { showConfirmation } = useConfirmationContext();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();
  
  const [departments, setDepartments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setIsLoadingData(true);
      const response = await departmentService.getAllDepartments();
      setDepartments(response.departments || response || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreateDepartment = () => {
    setEditingDepartment(null);
    setIsModalOpen(true);
  };

  const handleEditDepartment = (department) => {
    setEditingDepartment(department);
    setIsModalOpen(true);
  };

  const handleDeleteDepartment = (department) => {
    showConfirmation({
      title: 'Delete Department',
      message: `Are you sure you want to delete "${department.name}"?`,
      type: 'danger',
      action: 'delete',
      details: `This will also affect ${department._count?.designations || 0} designations and ${department._count?.employmentRecords || 0} employees.`,
      onConfirm: () => deleteDepartment(department.id)
    });
  };

  const deleteDepartment = async (id) => {
    await withErrorHandling(
      async () => {
        await departmentService.deleteDepartment(id);
        await loadDepartments();
      },
      {
        showAlert: true,
        customMessage: 'Department deleted successfully!'
      }
    );
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
  };

  const handleFormSubmit = async () => {
    await loadDepartments();
    handleModalClose();
  };

  if (isLoadingData) {
    return <LoadingSpinner size="lg" text="Loading departments..." />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-background-secondary)" }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg transition-colors"
              style={{
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-background-primary)",
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
              <Building2 className="w-8 h-8" style={{ color: "var(--color-primary-600)" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Department Management
              </h1>
              <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                Create and manage company departments
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage error={error} onRetry={clearError} showHomeLink={false} />
          </div>
        )}

        {/* Action Bar */}
        <div className="card mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Total Departments: {departments.length}
                </h3>
              </div>
              <button
                onClick={handleCreateDepartment}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Department
              </button>
            </div>
          </div>
        </div>

        {/* Departments List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
              <i className="fas fa-building mr-2"></i>
              Departments
            </h3>
            <p style={{ color: "var(--color-text-secondary)" }}>
              Manage your organization's department structure
            </p>
          </div>
          
          <div className="p-6">
            {departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--color-text-tertiary)" }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                  No departments found
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                  Get started by creating your first department
                </p>
                <button
                  onClick={handleCreateDepartment}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Department
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((department) => (
                  <div
                    key={department.id}
                    className="p-6 rounded-lg border transition-all duration-200 hover:shadow-md"
                    style={{
                      backgroundColor: "var(--color-background-primary)",
                      borderColor: "var(--color-border-light)",
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--color-primary-50)" }}>
                          <Building2 className="w-5 h-5" style={{ color: "var(--color-primary-600)" }} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg" style={{ color: "var(--color-text-primary)" }}>
                            {department.name}
                          </h4>
                          {department.code && (
                            <p className="text-sm font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                              {department.code}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditDepartment(department)}
                          className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                          style={{ color: "var(--color-text-secondary)" }}
                          title="Edit Department"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(department)}
                          className="p-2 rounded-lg transition-colors hover:bg-red-100"
                          style={{ color: "var(--color-text-secondary)" }}
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {department.description && (
                      <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                        {department.description}
                      </p>
                    )}

                    {department.head && (
                      <div className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        <UserCircle className="w-4 h-4" />
                        <span>Head: {department.head.full_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{department._count?.designations || 0} Designations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span>{department._count?.employmentRecords || 0} Employees</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Department Form Modal */}
        <EnhancedModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          title={editingDepartment ? 'Edit Department' : 'Create Department'}
          size="md"
        >
          <DepartmentForm
            department={editingDepartment}
            onSubmit={handleFormSubmit}
            onCancel={handleModalClose}
          />
        </EnhancedModal>
      </div>
    </div>
  );
};

export default DepartmentManagement;
