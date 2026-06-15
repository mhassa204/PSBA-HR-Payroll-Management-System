import React, { useState, useEffect } from 'react';
import { Shield, Save, X, Plus, Eye, EyeOff } from 'lucide-react';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import { roleService, permissionsService } from '../services/roleService';
import { toastBus } from '../../../utils/toastBus';

const RoleForm = ({ role, onSubmit, onCancel }) => {
  const { error, clearError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allPermissions, setAllPermissions] = useState([]);
  
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

  useEffect(() => {
    const loadPerms = async () => {
      try {
        const list = await permissionsService.listAll();
        // list may be {permissions: []} from API wrapper; normalize to array
        const arr = Array.isArray(list) ? list : (list.permissions || []);
        setAllPermissions(arr);
      } catch (e) {
        // toast handled by axios interceptor
      }
    };
    loadPerms();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAction = async () => {
    const key = newAction.trim();
    if (!key) return;
    if (formData.allowed_actions.includes(key)) return;
    try {
      // optimistic update and ensure it exists in registry
      setFormData(prev => ({ ...prev, allowed_actions: [...prev.allowed_actions, key] }));
      await permissionsService.upsertMany([key]);
      toastBus.emit({ type: 'success', message: 'Permission added' });
    } catch (e) {
      // revert on failure
      setFormData(prev => ({ ...prev, allowed_actions: prev.allowed_actions.filter(a => a !== key) }));
    } finally {
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
      setFormData(prev => ({ ...prev, fields: [...prev.fields, newField.trim()] }));
      setNewField('');
    }
  };

  const removeField = (fieldToRemove) => {
    setFormData(prev => ({ ...prev, fields: prev.fields.filter(field => field !== fieldToRemove) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (role) {
        await roleService.updateRole(role.id, formData);
      } else {
        await roleService.createRole(formData);
      }
      toastBus.emit({ type: 'success', message: 'Role saved' });
      onSubmit();
    } catch (error) {
      // toast handled by interceptor too
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
        {/* Basic Information */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: "var(--color-border-light)" }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--color-primary-100)" }}>
              <Shield className="w-6 h-6" style={{ color: "var(--color-primary-600)" }} />
            </div>
            <h3 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Basic Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="form-input w-full"
                placeholder="Enter role name (e.g., HR Manager)"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Role Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="form-input w-full"
              >
                <option value="custom">Custom</option>
                <option value="system">System</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg border" 
               style={{ 
                 backgroundColor: "var(--color-background-secondary)",
                 borderColor: "var(--color-border-light)" 
               }}>
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => handleInputChange('enabled', e.target.checked)}
              className="w-5 h-5 rounded"
              style={{
                color: "var(--color-primary-600)",
                borderColor: "var(--color-border-light)"
              }}
            />
            <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Role is enabled and active</span>
          </div>
        </div>

        {/* Allowed Actions (Permissions) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: "var(--color-border-light)" }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--color-success-100)" }}>
              <Eye className="w-6 h-6" style={{ color: "var(--color-success-600)" }} />
            </div>
            <h3 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Permissions</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Attach permissions by key (e.g., employees.read). Any new key is auto-added to the registry.</p>
            
            <div className="flex gap-3">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, addAction)}
                className="form-input flex-1"
                placeholder="e.g., employees.read"
              />
              <button
                type="button"
                onClick={addAction}
                className="btn btn-success flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {allPermissions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Available:</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                  {allPermissions.map((p) => (
                    <button
                      type="button"
                      key={p.key || p.id}
                      onClick={() => !formData.allowed_actions.includes(p.key) && setFormData(prev => ({ ...prev, allowed_actions: [...prev.allowed_actions, p.key] }))}
                      className="px-3 py-1 rounded border text-xs transition-colors"
                      style={formData.allowed_actions.includes(p.key) ? {
                        backgroundColor: "var(--color-success-100)",
                        borderColor: "var(--color-success-200)",
                        color: "var(--color-success-800)"
                      } : {
                        backgroundColor: "var(--color-background-primary)",
                        borderColor: "var(--color-border-light)",
                        color: "var(--color-text-secondary)"
                      }}
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.allowed_actions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Attached:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.allowed_actions.map((action, index) => (
                    <span key={index} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border"
                          style={{
                            backgroundColor: "var(--color-success-100)",
                            color: "var(--color-success-800)",
                            borderColor: "var(--color-success-200)"
                          }}>
                      {action}
                      <button type="button" 
                              onClick={() => removeAction(action)} 
                              className="p-1 rounded-full transition-colors"
                              style={{ color: "var(--color-success-600)" }}
                              onMouseEnter={(e) => {
                                e.target.style.color = "var(--color-success-800)";
                                e.target.style.backgroundColor = "var(--color-success-200)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.color = "var(--color-success-600)";
                                e.target.style.backgroundColor = "transparent";
                              }}>
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
            <div className="flex gap-3">
              <input
                type="text"
                value={newField}
                onChange={(e) => setNewField(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, () => addField())}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Enter field name (e.g., salary, personal_info)"
              />
              <button type="button" onClick={() => addField()} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium">
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {formData.fields.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Current Fields:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.fields.map((field, index) => (
                    <span key={index} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium border border-purple-200">
                      {field}
                      <button type="button" onClick={() => removeField(field)} className="text-purple-600 hover:text-purple-800 transition-colors p-1 rounded-full hover:bg-purple-200">
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
          <button type="button" onClick={onCancel} className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium">Cancel</button>
          <button type="submit" disabled={isSubmitting || !formData.name.trim()} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium">
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RoleForm;
