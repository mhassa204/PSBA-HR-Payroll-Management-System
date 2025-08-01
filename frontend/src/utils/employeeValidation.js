// Enhanced validation utilities for employee forms

import { CNIC_REGEX, VALIDATION_MESSAGES, FILE_UPLOAD_CONFIG } from '../constants/employeeOptions';

/**
 * Validate CNIC format
 * @param {string} cnic - CNIC number
 * @returns {object} Validation result
 */
export const validateCNIC = (cnic) => {
  if (!cnic) {
    return { isValid: false, message: VALIDATION_MESSAGES.required_field };
  }
  
  if (!CNIC_REGEX.test(cnic)) {
    return { isValid: false, message: VALIDATION_MESSAGES.cnic_format };
  }
  
  return { isValid: true, message: "" };
};

/**
 * Validate CNIC dates
 * @param {string} issueDate - CNIC issue date
 * @param {string} expiryDate - CNIC expiry date
 * @returns {object} Validation result
 */
export const validateCNICDates = (issueDate, expiryDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
  const issue = new Date(issueDate);
  const expiry = new Date(expiryDate);

  // Check if expiry date is in the past (must be today or future)
  if (expiryDate && expiry < today) {
    return {
      isValid: false,
      message: "CNIC expiry date cannot be in the past",
      field: 'expiry'
    };
  }

  // Check if issue date is before expiry date
  if (issueDate && expiryDate && issue >= expiry) {
    return {
      isValid: false,
      message: VALIDATION_MESSAGES.cnic_issue_before_expiry,
      field: 'issue'
    };
  }

  return { isValid: true, message: "" };
};

/**
 * Validate CNIC expiry date specifically (for real-time validation)
 * @param {string} expiryDate - CNIC expiry date
 * @returns {object} Validation result
 */
export const validateCNICExpiryDate = (expiryDate) => {
  if (!expiryDate) {
    return { isValid: false, message: "CNIC expiry date is required" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
  const expiry = new Date(expiryDate);

  if (expiry < today) {
    return {
      isValid: false,
      message: "CNIC expiry date cannot be in the past"
    };
  }

  return { isValid: true, message: "" };
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {string} fileType - Type of file (profile_picture, cnic_documents, etc.)
 * @returns {object} Validation result
 */
export const validateFileUpload = (file, fileType) => {
  if (!file) {
    return { isValid: true, message: "" }; // File is optional
  }
  
  const config = FILE_UPLOAD_CONFIG[fileType];
  if (!config) {
    return { isValid: false, message: "Unknown file type" };
  }
  
  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
    return { 
      isValid: false, 
      message: `${VALIDATION_MESSAGES.file_size_exceeded} (Max: ${maxSizeMB}MB)` 
    };
  }
  
  // Check file type
  if (!config.types.includes(file.type)) {
    return { 
      isValid: false, 
      message: VALIDATION_MESSAGES.file_type_invalid 
    };
  }
  
  return { isValid: true, message: "" };
};

/**
 * Validate multiple files
 * @param {FileList|Array} files - Files to validate
 * @param {string} fileType - Type of files
 * @param {number} maxFiles - Maximum number of files allowed
 * @returns {object} Validation result
 */
export const validateMultipleFiles = (files, fileType, maxFiles = 5) => {
  if (!files || files.length === 0) {
    return { isValid: true, message: "" };
  }
  
  if (files.length > maxFiles) {
    return { 
      isValid: false, 
      message: `Maximum ${maxFiles} files allowed` 
    };
  }
  
  // Validate each file
  for (let i = 0; i < files.length; i++) {
    const fileValidation = validateFileUpload(files[i], fileType);
    if (!fileValidation.isValid) {
      return { 
        isValid: false, 
        message: `File ${i + 1}: ${fileValidation.message}` 
      };
    }
  }
  
  return { isValid: true, message: "" };
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {object} Validation result
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: true, message: "" }; // Email is optional
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Please enter a valid email address" };
  }
  
  return { isValid: true, message: "" };
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number
 * @returns {object} Validation result
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) {
    return { isValid: true, message: "" }; // Phone is optional
  }
  
  // Pakistani phone number format
  const phoneRegex = /^(\+92|0)?[0-9]{10}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!phoneRegex.test(cleanPhone)) {
    return { 
      isValid: false, 
      message: "Please enter a valid Pakistani phone number" 
    };
  }
  
  return { isValid: true, message: "" };
};

/**
 * Validate required field based on conditions
 * @param {any} value - Field value
 * @param {boolean} isRequired - Whether field is required
 * @param {string} fieldName - Name of the field
 * @returns {object} Validation result
 */
export const validateRequiredField = (value, isRequired, fieldName) => {
  if (isRequired && (!value || (typeof value === 'string' && !value.trim()))) {
    return { 
      isValid: false, 
      message: `${fieldName} is required` 
    };
  }
  
  return { isValid: true, message: "" };
};

/**
 * Validate unified father/husband name field
 * @param {string} name - Father or husband name
 * @param {string} relationshipType - Type of relationship
 * @returns {object} Validation result
 */
export const validateFatherHusbandName = (name, relationshipType) => {
  if (!name || !name.trim()) {
    const nameType = relationshipType === 'father' ? 'Father' : 'Husband';
    return {
      isValid: false,
      message: `${nameType} name is required`
    };
  }

  return { isValid: true, message: "" };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
};

/**
 * Get today's date in YYYY-MM-DD format for date inputs
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};
