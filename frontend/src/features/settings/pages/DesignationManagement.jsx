import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Building2,
  Briefcase
} from 'lucide-react';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import DesignationForm from '../components/DesignationForm';
import { designationService } from '../services/designationService';

const DesignationManagement = () => {
  const navigate = useNavigate();
  const { showConfirmation } = useConfirmationContext();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();
  
  const [designations, setDesignations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadDesignations();
  }, []);

  const loadDesignations = async () => {
    try {
      setIsLoadingData(true);
      const response = await designationService.getAllDesignations();
      setDesignations(response.designations || response || []);
    } catch (error) {
      console.error('Error loading designations:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleCreateDesignation = () => {
    setEditingDesignation(null);
    setIsModalOpen(true);
  };

  const handleEditDesignation = (designation) => {
    setEditingDesignation(designation);
    setIsModalOpen(true);
  };

  const handleDeleteDesignation = (designation) => {
    showConfirmation({
      title: 'Delete Designation',
      message: `Are you sure you want to delete "${designation.title}"?`,
      type: 'danger',
      action: 'delete',
      details: `This will affect ${designation._count?.employmentRecords || 0} employees.`,
      onConfirm: () => deleteDesignation(designation.id)
    });
  };

  const deleteDesignation = async (id) => {
    await withErrorHandling(
      async () => {
        await designationService.deleteDesignation(id);
        await loadDesignations();
      },
      {
        showAlert: true,
        customMessage: 'Designation deleted successfully!'
      }
    );
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDesignation(null);
  };

  const handleFormSubmit = async () => {
    await loadDesignations();
    handleModalClose();
  };

  if (isLoadingData) {
    return <LoadingSpinner size="lg" text="Loading designations..." />;
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
              <Users className="w-8 h-8" style={{ color: "var(--color-primary-600)" }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Designation Management
              </h1>
              <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                Create and manage job titles and positions
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
                  Total Designations: {designations.length}
                </h3>
              </div>
              <button
                onClick={handleCreateDesignation}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Designation
              </button>
            </div>
          </div>
        </div>

        {/* Designations List */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
              <i className="fas fa-users mr-2"></i>
              Designations
            </h3>
            <p style={{ color: "var(--color-text-secondary)" }}>
              Manage your organization's job titles and positions
            </p>
          </div>
          
          <div className="p-6">
            {designations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--color-text-tertiary)" }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
                  No designations found
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                  Get started by creating your first designation
                </p>
                <button
                  onClick={handleCreateDesignation}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Designation
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {designations.map((designation) => (
                  <div
                    key={designation.id}
                    className="p-6 rounded-lg border transition-all duration-200 hover:shadow-md"
                    style={{
                      backgroundColor: "var(--color-background-primary)",
                      borderColor: "var(--color-border-light)",
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--color-green-50)" }}>
                          <Users className="w-5 h-5" style={{ color: "var(--color-green-600)" }} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg" style={{ color: "var(--color-text-primary)" }}>
                            {designation.title}
                          </h4>
                          {designation.level && (
                            <p className="text-sm font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                              Level {designation.level}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditDesignation(designation)}
                          className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                          style={{ color: "var(--color-text-secondary)" }}
                          title="Edit Designation"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDesignation(designation)}
                          className="p-2 rounded-lg transition-colors hover:bg-red-100"
                          style={{ color: "var(--color-text-secondary)" }}
                          title="Delete Designation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {designation.department && (
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
                        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {designation.department.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span>{designation._count?.employmentRecords || 0} Employees</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Designation Form Modal */}
        <EnhancedModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          title={editingDesignation ? 'Edit Designation' : 'Create Designation'}
          size="md"
        >
          <DesignationForm
            designation={editingDesignation}
            onSubmit={handleFormSubmit}
            onCancel={handleModalClose}
          />
        </EnhancedModal>
      </div>
    </div>
  );
};

export default DesignationManagement;
