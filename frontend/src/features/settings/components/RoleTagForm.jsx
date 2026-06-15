import React, { useState, useEffect } from 'react';
import { useToastContext } from '../../../components/ui/ToastContainer';
import PropTypes from 'prop-types';

const RoleTagForm = ({ roleTag, onSubmit, onCancel, isSubmitting }) => {
  const { showError } = useToastContext();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    is_active: true
  });

  useEffect(() => {
    if (roleTag) {
      setFormData({
        name: roleTag.name || '',
        description: roleTag.description || '',
        category: roleTag.category || '',
        is_active: roleTag.is_active !== undefined ? roleTag.is_active : true
      });
    }
  }, [roleTag]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      showError('Role tag name is required');
      return;
    }
    
    if (formData.name.trim().length < 2) {
      showError('Role tag name must be at least 2 characters long');
      return;
    }
    
    onSubmit(formData);
  };

  const categoryOptions = [
    { value: '', label: 'Select Category' },
    { value: 'Technical', label: 'Technical' },
    { value: 'Administrative', label: 'Administrative' },
    { value: 'Management', label: 'Management' },
    { value: 'Support', label: 'Support' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {/* Role Tag Name */}
      <div className="px-2">
        <label 
          htmlFor="name" 
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Role Tag Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="form-input w-full"
          style={{
            backgroundColor: "var(--color-background-primary)",
            borderColor: "var(--color-border-light)",
            color: "var(--color-text-primary)"
          }}
          placeholder="Enter role tag name"
        />
      </div>

      {/* Description */}
      <div className="px-2">
        <label 
          htmlFor="description" 
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="form-textarea w-full"
          style={{
            backgroundColor: "var(--color-background-primary)",
            borderColor: "var(--color-border-light)",
            color: "var(--color-text-primary)"
          }}
          placeholder="Enter description (optional)"
        />
      </div>

      {/* Category */}
      <div className="px-2">
        <label 
          htmlFor="category" 
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="form-select w-full"
          style={{
            backgroundColor: "var(--color-background-primary)",
            borderColor: "var(--color-border-light)",
            color: "var(--color-text-primary)"
          }}
        >
          {categoryOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Active Status */}
      <div className="px-2 flex items-center">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="is_active" className="ml-2 block text-sm" style={{ color: "var(--color-text-primary)" }}>
          Active
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : (roleTag ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
};

RoleTagForm.propTypes = {
  roleTag: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool
};

export default RoleTagForm;
