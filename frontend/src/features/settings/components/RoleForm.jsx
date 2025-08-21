import React, { useState, useEffect } from 'react';
import { Shield, Save, X, Plus, Eye, EyeOff } from 'lucide-react';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { roleService } from '../services/roleService';

const RoleForm = ({ role, onSubmit, onCancel }) => {
  const { error, clearError, withErrorHandling } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    allowed_actions: [],
    enabled: true,
    fields: []
  });

  const [newAction, setNewAction] = useState('');
  const [newField, setNewField] = useState('');

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        type: role.type || 'custom',
        allowed_actions: role.allowed_actions || [],
        enabled: role.enabled !== undefined ? role.enabled : true,
        fields: role.fields || []
      });
    }
  }, [role]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addAction = () => {
    if (newAction.trim() && !formData.allowed_actions.includes(newAction.trim())) {
      setFormData(prev => ({
        ...prev,
        allowed_actions: [...prev.allowed_actions, newAction.trim()]
      }));
      setNewAction('');
    }
  };

  const removeAction = (actionToRemove) => {
    setFormData(prev => ({
      ...prev,
      allowed_actions: prev.allowed_actions.filter(action => action !== actionToRemove)
    }));
  };

  const addField = () => {
    if (newField.trim() && !formData.fields.includes(newField.trim())) {
      setFormData(prev => ({
        ...prev,
        fields: [...prev.fields, newField.trim()]
      }));
      setNewField('');
    }
  };

  const removeField = (fieldToRemove) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field !== fieldToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (role) {
        await roleService.updateRole(role.id, formData);
      } else {
        await roleService.createRole(formData);
      }
      onSubmit();
    } catch (error) {
      console.error('Error saving role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

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
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Basic Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Enter role name (e.g., HR Manager)"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              >
                <option value="custom">Custom</option>
                <option value="system">System</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => handleInputChange('enabled', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-700">Role is enabled and active</span>
          </div>
        </div>

        {/* Allowed Actions */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Allowed Actions</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Define what actions this role can perform. Actions should be descriptive and follow a consistent naming pattern.
            </p>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addAction)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Enter action (e.g., create_employee, view_reports)"
              />
              <button
                type="button"
                onClick={addAction}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {formData.allowed_actions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Current Actions:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.allowed_actions.map((action, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200"
                    >
                      {action}
                      <button
                        type="button"
                        onClick={() => removeAction(action)}
                        className="text-green-600 hover:text-green-800 transition-colors p-1 rounded-full hover:bg-green-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Allowed Fields */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            <div className="p-2 bg-purple-100 rounded-lg">
              <EyeOff className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Allowed Fields</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Specify which data fields this role can access. Fields should be descriptive and follow a consistent naming pattern.
            </p>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addField)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Enter field name (e.g., salary, personal_info)"
              />
              <button
                type="button"
                onClick={addField}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {formData.fields.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Current Fields:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.fields.map((field, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium border border-purple-200"
                    >
                      {field}
                      <button
                        type="button"
                        onClick={() => removeField(field)}
                        className="text-purple-600 hover:text-purple-800 transition-colors p-1 rounded-full hover:bg-purple-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
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
            disabled={isSubmitting || !formData.name.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleForm;
