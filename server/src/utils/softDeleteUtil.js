/**
 * Utility functions for handling unique field masking during soft delete
 * This prevents unique constraint violations when soft-deleted records are recreated
 */

// Delimiter that's very unlikely to appear in real data
const DELIMITER = '__DEL__';

/**
 * Generate a unique suffix using timestamp and random string
 * Format: timestamp_randomString
 */
function generateSuffix() {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 11); // 9 chars
  return `${timestamp}_${randomStr}`;
}

/**
 * Check if a value is already masked
 */
function isMasked(value) {
  if (!value || typeof value !== 'string') return false;
  return value.includes(DELIMITER);
}

/**
 * Mask a unique field value by appending delimiter and suffix
 * @param {string|number|null|undefined} value - The value to mask
 * @returns {string|number|null|undefined} - Masked value or original if null/undefined/empty
 */
function maskUniqueField(value) {
  // Handle null, undefined, or empty strings
  if (value === null || value === undefined || value === '') {
    return value;
  }
  
  // Convert to string for processing
  const stringValue = String(value);
  
  // If already masked, return as-is (prevent double-masking)
  if (isMasked(stringValue)) {
    return typeof value === 'number' ? stringValue : value;
  }
  
  const masked = `${stringValue}${DELIMITER}${generateSuffix()}`;
  
  // Return as number if original was number (for port_number, etc.)
  // Note: This will return a string since we're appending text, which is fine
  // as the database will handle the type conversion
  return masked;
}

/**
 * Restore a masked unique field value by removing the suffix
 * @param {string|number|null|undefined} maskedValue - The masked value to restore
 * @returns {string|number|null|undefined} - Restored original value
 */
function restoreUniqueField(maskedValue) {
  // Handle null, undefined, or empty strings
  if (maskedValue === null || maskedValue === undefined || maskedValue === '') {
    return maskedValue;
  }
  
  // Convert to string for processing
  const stringValue = String(maskedValue);
  
  // If not masked, return as-is
  if (!isMasked(stringValue)) {
    return maskedValue;
  }
  
  // Split by delimiter and take first part (original value)
  const parts = stringValue.split(DELIMITER);
  const restored = parts[0] || stringValue; // Fallback to original if split fails
  
  // Try to restore original type (number if it was a number)
  // Check if original was a number by trying to parse
  if (typeof maskedValue === 'number' || (!isNaN(restored) && !isNaN(parseFloat(restored)))) {
    const numValue = Number(restored);
    // Only return number if it's a valid integer or float
    if (!isNaN(numValue) && isFinite(numValue)) {
      return numValue;
    }
  }
  
  return restored;
}

/**
 * Mask unique fields for a specific model during soft delete
 * @param {string} modelName - The Prisma model name
 * @param {object} currentData - Current record data
 * @returns {object} - Object with masked data and list of masked fields
 */
function maskUniqueFieldsForSoftDelete(modelName, currentData) {
  if (!currentData) return { masked: {}, maskedFields: [] };
  
  const masked = {};
  const maskedFields = [];
  
  // Define unique fields per model
  const uniqueFieldMap = {
    Employee: ['cnic', 'email'],
    User: ['email', 'employee_id'],
    District: ['name'],
    City: ['name'], // Note: composite with district_id, but we'll mask name
    EducationLevel: ['name'],
    RoleTag: ['name'],
    ScaleGrade: ['name'],
    Role: ['name'],
    LeaveType: ['name'],
    TravelClaimTranche: ['code'],
    PayrollTranch: ['code'],
    Device: ['ip_address'], // Composite unique with port_number, masking ip_address is sufficient
    Designation: ['title'], // Composite with department_id, mask title
    // Note: For composite unique constraints, we mask the string fields
    // The integer fields (like department_id) are less likely to conflict
  };
  
  const fieldsToMask = uniqueFieldMap[modelName] || [];
  
  fieldsToMask.forEach(field => {
    const value = currentData[field];
    // Handle both string and number types (for port_number, etc.)
    if (value != null && value !== '') {
      const originalValue = value;
      const maskedValue = maskUniqueField(originalValue);
      
      // Compare as strings to check if masking occurred
      if (String(maskedValue) !== String(originalValue)) {
        masked[field] = maskedValue;
        maskedFields.push(field);
      }
    }
  });
  
  return { masked, maskedFields };
}

/**
 * Restore unique fields for a specific model during undelete
 * @param {string} modelName - The Prisma model name
 * @param {object} currentData - Current record data (with masked values)
 * @returns {object} - Object with restored data
 */
function restoreUniqueFieldsForUndelete(modelName, currentData) {
  if (!currentData) return {};
  
  const restored = {};
  
  // Define unique fields per model (same as mask function)
  const uniqueFieldMap = {
    Employee: ['cnic', 'email'],
    User: ['email', 'employee_id'],
    District: ['name'],
    City: ['name'],
    EducationLevel: ['name'],
    RoleTag: ['name'],
    ScaleGrade: ['name'],
    Role: ['name'],
    LeaveType: ['name'],
    TravelClaimTranche: ['code'],
    PayrollTranch: ['code'],
    Device: ['ip_address'], // Composite unique with port_number, masking ip_address is sufficient
    Designation: ['title'],
  };
  
  const fieldsToRestore = uniqueFieldMap[modelName] || [];
  
  fieldsToRestore.forEach(field => {
    const value = currentData[field];
    // Handle both string and number types
    if (value != null && value !== '') {
      const maskedValue = value;
      const restoredValue = restoreUniqueField(maskedValue);
      
      // Compare as strings to check if restoration occurred
      if (String(restoredValue) !== String(maskedValue)) {
        restored[field] = restoredValue;
      }
    }
  });
  
  return restored;
}

module.exports = {
  maskUniqueField,
  restoreUniqueField,
  maskUniqueFieldsForSoftDelete,
  restoreUniqueFieldsForUndelete,
  isMasked,
  DELIMITER,
};

