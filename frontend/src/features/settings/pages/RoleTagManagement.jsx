import React, { useState, useEffect } from 'react';
import { roleTagService } from '../services/roleTagService';
import RoleTagForm from '../components/RoleTagForm';
import EnhancedModal from '../../../components/ui/EnhancedModal';
import { useConfirmationContext } from '../../../components/ui/ConfirmationProvider';
import { useToastContext } from '../../../components/ui/ToastContainer';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Custom SVG Icons
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const PencilIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const RoleTagManagement = () => {
  const [roleTags, setRoleTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoleTag, setEditingRoleTag] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statistics, setStatistics] = useState(null);
  
  const { showConfirmation } = useConfirmationContext();
  const { showSuccess, showError } = useToastContext();

  useEffect(() => {
    fetchRoleTags();
    fetchStatistics();
  }, []);

  const fetchRoleTags = async () => {
    try {
      setIsLoading(true);
      const data = await roleTagService.getAllRoleTags();
      
      if (data.success) {
        setRoleTags(data.roleTags);
      } else {
        throw new Error(data.error || 'Failed to fetch role tags');
      }
    } catch (error) {
      console.error('Error fetching role tags:', error);
      showError('Error fetching role tags');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const data = await roleTagService.getRoleTagStatistics();
      
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleCreate = async (formData) => {
    try {
      setIsSubmitting(true);
      await roleTagService.createRoleTag(formData);
      
      showSuccess('Role tag created successfully');
      setShowForm(false);
      fetchRoleTags();
      fetchStatistics();
    } catch (error) {
      console.error('Error creating role tag:', error);
      showError(error.message || 'Failed to create role tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (formData) => {
    try {
      setIsSubmitting(true);
      await roleTagService.updateRoleTag(editingRoleTag.id, formData);
      
      showSuccess('Role tag updated successfully');
      setShowForm(false);
      setEditingRoleTag(null);
      fetchRoleTags();
      fetchStatistics();
    } catch (error) {
      console.error('Error updating role tag:', error);
      showError(error.message || 'Failed to update role tag');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (roleTag) => {
    showConfirmation({
      title: 'Delete Role Tag',
      message: `Are you sure you want to delete "${roleTag.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await roleTagService.deleteRoleTag(roleTag.id);
          showSuccess('Role tag deleted successfully');
          fetchRoleTags();
          fetchStatistics();
        } catch (error) {
          console.error('Error deleting role tag:', error);
          showError(error.message || 'Failed to delete role tag');
        }
      }
    });
  };

  const handleEdit = (roleTag) => {
    setEditingRoleTag(roleTag);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoleTag(null);
  };

  const handleSubmit = (formData) => {
    if (editingRoleTag) {
      handleUpdate(formData);
    } else {
      handleCreate(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading role tags..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-background-secondary)" }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Role Tag Management
              </h1>
              <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                Manage employment role tags and categories
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Role Tag
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <div className="w-6 h-6 bg-blue-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Role Tags</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <div className="w-6 h-6 bg-green-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <div className="w-6 h-6 bg-yellow-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.inactive}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <div className="w-6 h-6 bg-purple-600 rounded"></div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-2xl font-semibold text-gray-900">{statistics.byCategory?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Tags Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Role Tags</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roleTags.map((roleTag) => (
                  <tr key={roleTag.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{roleTag.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {roleTag.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {roleTag.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        roleTag.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {roleTag.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {roleTag._count?.employmentRecords || 0} employment(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(roleTag)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(roleTag)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {roleTags.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No role tags found. Create your first role tag to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <EnhancedModal
        isOpen={showForm}
        onClose={handleCancel}
        title={editingRoleTag ? 'Edit Role Tag' : 'Add New Role Tag'}
        size="md"
      >
        <RoleTagForm
          roleTag={editingRoleTag}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </EnhancedModal>
    </div>
  );
};

export default RoleTagManagement;
