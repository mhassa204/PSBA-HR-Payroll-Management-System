import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { departmentService } from '../services/departmentService';

const DepartmentForm = ({ department, onSubmit, onCancel }) => {
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      name: department?.name || '',
      code: department?.code || '',
      description: department?.description || ''
    }
  });

  const { register, handleSubmit, formState: { errors }, reset } = form;

  useEffect(() => {
    if (department) {
      reset({
        name: department.name || '',
        code: department.code || '',
        description: department.description || ''
      });
    }
  }, [department, reset]);

  const handleFormSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (department) {
        // Update existing department
        await departmentService.updateDepartment(department.id, data);
      } else {
        // Create new department
        await departmentService.createDepartment(data);
      }
      onSubmit();
    } catch (error) {
      console.error('Error saving department:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  if (isLoading) {
    return <LoadingSpinner size="md" text="Loading..." />;
  }

  return (
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-6">
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Department Name */}
          <div className="px-2">
            <label 
              htmlFor="name" 
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Department Name *
            </label>
            <input
              type="text"
              id="name"
              {...register('name', { 
                required: 'Department name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 100, message: 'Name must be less than 100 characters' }
              })}
              className={`form-input w-full ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter department name"
              style={{
                backgroundColor: "var(--color-background-primary)",
                borderColor: errors.name ? "var(--color-error-500)" : "var(--color-border-light)",
                color: "var(--color-text-primary)"
              }}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

                {/* Department Code */}
          <div className="px-2">
            <label 
              htmlFor="code" 
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Department Code
            </label>
            <input
              type="text"
              id="code"
              {...register('code', {
                maxLength: { value: 20, message: 'Code must be less than 20 characters' },
                pattern: {
                  value: /^[A-Z0-9_-]*$/,
                  message: 'Code can only contain uppercase letters, numbers, hyphens, and underscores'
                }
              })}
              className={`form-input w-full ${errors.code ? 'border-red-500' : ''}`}
              placeholder="e.g., HR, IT, FIN"
              style={{
                backgroundColor: "var(--color-background-primary)",
                borderColor: errors.code ? "var(--color-error-500)" : "var(--color-border-light)",
                color: "var(--color-text-primary)"
              }}
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Optional: Short code for the department (e.g., HR, IT, FIN)
            </p>
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
              rows={4}
              {...register('description', {
                maxLength: { value: 500, message: 'Description must be less than 500 characters' }
              })}
              className={`form-textarea w-full ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Enter department description (optional)"
              style={{
                backgroundColor: "var(--color-background-primary)",
                borderColor: errors.description ? "var(--color-error-500)" : "var(--color-border-light)",
                color: "var(--color-text-primary)"
              }}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Optional: Brief description of the department's purpose and responsibilities
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
                  {department ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                department ? 'Update Department' : 'Create Department'
              )}
            </button>
          </div>
    </form>
  );
};

export default DepartmentForm;
