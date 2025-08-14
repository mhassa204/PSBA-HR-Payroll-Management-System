import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { designationService } from '../services/designationService';
import { departmentService } from '../services/departmentService';

const DesignationForm = ({ designation, onSubmit, onCancel }) => {
  const { error, isLoading, clearError } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);

  const form = useForm({
    defaultValues: {
      title: designation?.title || '',
      department_id: designation?.department_id || '',
      level: designation?.level || ''
    }
  });

  const { register, handleSubmit, formState: { errors }, reset, watch } = form;
  const selectedDepartmentId = watch('department_id');

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (designation) {
      reset({
        title: designation.title || '',
        department_id: designation.department_id || '',
        level: designation.level || ''
      });
    }
  }, [designation, reset]);

  const loadDepartments = async () => {
    try {
      setIsLoadingDepartments(true);
      const response = await departmentService.getAllDepartments();
      setDepartments(response.departments || response || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  const handleFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Convert level to number if provided
      if (data.level && data.level !== '') {
        data.level = parseInt(data.level);
      } else {
        data.level = null;
      }

      // Convert department_id to number if provided
      if (data.department_id && data.department_id !== '') {
        data.department_id = parseInt(data.department_id);
      } else {
        data.department_id = null;
      }

      if (designation) {
        // Update existing designation
        await designationService.updateDesignation(designation.id, data);
      } else {
        // Create new designation
        await designationService.createDesignation(data);
      }
      onSubmit();
    } catch (error) {
      console.error('Error saving designation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  if (isLoading || isLoadingDepartments) {
    return <LoadingSpinner size="md" text="Loading..." />;
  }

  return (
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Designation Title */}
          <div className="px-2">
            <label 
              htmlFor="title" 
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Designation Title *
            </label>
            <input
              type="text"
              id="title"
              {...register('title', {
                required: 'Designation title is required',
                minLength: { value: 2, message: 'Title must be at least 2 characters' },
                maxLength: { value: 100, message: 'Title must be less than 100 characters' }
              })}
              className={`form-input w-full ${errors.title ? 'border-red-500' : ''}`}
              placeholder="e.g., Software Engineer, HR Manager, Accountant"
              style={{
                backgroundColor: "var(--color-background-primary)",
                borderColor: errors.title ? "var(--color-error-500)" : "var(--color-border-light)",
                color: "var(--color-text-primary)"
              }}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

                {/* Department */}
          <div className="px-2">
            <label 
              htmlFor="department_id" 
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Department
            </label>
            <select
              id="department_id"
              {...register('department_id')}
              className="form-select w-full"
              style={{
                backgroundColor: "var(--color-background-primary)",
                borderColor: "var(--color-border-light)",
                color: "var(--color-text-primary)"
              }}
            >
              <option value="">Select Department (Optional)</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Optional: Assign this designation to a specific department
            </p>
          </div>

          {/* Level */}
          <div className="px-2">
            <label 
              htmlFor="level" 
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Level
            </label>
            <input
              type="number"
              id="level"
              min="1"
              max="99"
              {...register('level', {
                min: { value: 1, message: 'Level must be at least 1' },
                max: { value: 99, message: 'Level must be less than 100' }
              })}
              className={`form-input w-full ${errors.level ? 'border-red-500' : ''}`}
              placeholder="e.g., 1, 2, 3 (Optional)"
              style={{
                backgroundColor: "var(--color-background-primary)",
                borderColor: errors.level ? "var(--color-error-500)" : "var(--color-border-light)",
                color: "var(--color-text-primary)"
              }}
            />
            {errors.level && (
              <p className="mt-1 text-sm text-red-600">{errors.level.message}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Optional: Hierarchical level for the designation (1 = Entry, 2 = Mid, 3 = Senior, etc.)
            </p>
          </div>

                {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t px-2" style={{ borderColor: "var(--color-border-light)" }}>
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  {designation ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                designation ? 'Update Designation' : 'Create Designation'
              )}
            </button>
          </div>
    </form>
  );
};

export default DesignationForm;
