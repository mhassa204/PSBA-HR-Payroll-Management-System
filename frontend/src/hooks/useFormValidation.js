import { useState, useCallback } from 'react';

/**
 * Custom hook for form validation with security best practices
 * Provides validation rules, error handling, and input sanitization
 */
const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Security: Input sanitization
  const sanitizeInput = useCallback((value, type = 'text') => {
    if (typeof value !== 'string') return value;

    switch (type) {
      case 'email':
        return value.toLowerCase().trim();
      case 'text':
      case 'textarea':
        // Remove potentially dangerous characters
        return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
      case 'number':
        return value.replace(/[^0-9.-]/g, '');
      case 'tel':
        return value.replace(/[^0-9+\-\s()]/g, '');
      case 'cnic':
        return value.replace(/[^0-9-]/g, '');
      default:
        return value.trim();
    }
  }, []);

  // Validation rules
  const validateField = useCallback((name, value, rules = {}) => {
    const fieldRules = rules[name] || validationRules[name] || {};
    const errors = [];

    // Required validation
    if (fieldRules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${fieldRules.label || name} is required`);
      return errors;
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return errors;
    }

    // Type-specific validations
    switch (fieldRules.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push('Please enter a valid email address');
        }
        break;

      case 'cnic':
        const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
        if (!cnicRegex.test(value)) {
          errors.push('CNIC must be in format: 12345-1234567-1');
        }
        break;

      case 'tel':
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
        if (!phoneRegex.test(value)) {
          errors.push('Please enter a valid phone number');
        }
        break;

      case 'password':
        if (value.length < 8) {
          errors.push('Password must be at least 8 characters long');
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          errors.push('Password must contain uppercase, lowercase, and number');
        }
        break;
    }

    // Length validations
    if (fieldRules.minLength && value.length < fieldRules.minLength) {
      errors.push(`Minimum length is ${fieldRules.minLength} characters`);
    }

    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
      errors.push(`Maximum length is ${fieldRules.maxLength} characters`);
    }

    // Custom validation function
    if (fieldRules.validate && typeof fieldRules.validate === 'function') {
      const customError = fieldRules.validate(value, values);
      if (customError) {
        errors.push(customError);
      }
    }

    return errors;
  }, [validationRules, values]);

  // Handle field change
  const handleChange = useCallback((name, value, type = 'text') => {
    const sanitizedValue = sanitizeInput(value, type);
    
    setValues(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  }, [sanitizeInput, errors]);

  // Handle field blur (validation)
  const handleBlur = useCallback((name) => {
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    const fieldErrors = validateField(name, values[name]);
    setErrors(prev => ({
      ...prev,
      [name]: fieldErrors.length > 0 ? fieldErrors[0] : null
    }));
  }, [validateField, values]);

  // Validate all fields
  const validateAll = useCallback((customRules = {}) => {
    const allErrors = {};
    const rulesToUse = { ...validationRules, ...customRules };

    Object.keys(rulesToUse).forEach(name => {
      const fieldErrors = validateField(name, values[name], rulesToUse);
      if (fieldErrors.length > 0) {
        allErrors[name] = fieldErrors[0];
      }
    });

    setErrors(allErrors);
    setTouched(Object.keys(rulesToUse).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}));

    return Object.keys(allErrors).length === 0;
  }, [validateField, values, validationRules]);

  // Reset form
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Set field value programmatically
  const setValue = useCallback((name, value, type = 'text') => {
    const sanitizedValue = sanitizeInput(value, type);
    setValues(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  }, [sanitizeInput]);

  // Set multiple values
  const setValues = useCallback((newValues) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }));
  }, []);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValue,
    setValues,
    isValid: Object.keys(errors).length === 0,
    hasErrors: Object.keys(errors).some(key => errors[key])
  };
};

export default useFormValidation;
