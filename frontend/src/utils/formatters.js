/**
 * Utility functions for formatting dates, CNIC, and phone numbers
 * across the PSBA HR Portal application
 */

/**
 * Format date to DD/MM/YYYY display format
 * @param {string|Date} dateInput - Date in any format
 * @returns {string} - Formatted date as DD/MM/YYYY or "N/A" if invalid
 */
export const formatDateDisplay = (dateInput) => {
  if (!dateInput) return "N/A";
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "N/A";
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn('Invalid date format:', dateInput);
    return "N/A";
  }
};

/**
 * Parse DD/MM/YYYY format to ISO date string for backend
 * @param {string} dateString - Date in DD/MM/YYYY format
 * @returns {string|null} - ISO date string or null if invalid
 */
export const parseDateInput = (dateString) => {
  if (!dateString || dateString === "N/A") return null;
  
  try {
    // Handle DD/MM/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(year, month - 1, day);
      
      // Validate the date
      if (date.getDate() == day && date.getMonth() == month - 1 && date.getFullYear() == year) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    }
    
    // Fallback: try to parse as-is
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch (error) {
    console.warn('Invalid date input:', dateString);
    return null;
  }
};

/**
 * Format date for HTML date input (YYYY-MM-DD)
 * @param {string|Date} dateInput - Date in any format
 * @returns {string} - Date in YYYY-MM-DD format for input fields
 */
export const formatDateForInput = (dateInput) => {
  if (!dateInput) return "";
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    return "";
  }
};

/**
 * Remove dashes from CNIC number and return clean 13-digit string
 * @param {string} cnic - CNIC with or without dashes
 * @returns {string} - Clean 13-digit CNIC or original if invalid
 */
export const formatCNIC = (cnic) => {
  if (!cnic) return "";
  
  // Remove all dashes and spaces
  const cleaned = cnic.toString().replace(/[-\s]/g, '');
  
  // Validate it's 13 digits
  if (/^\d{13}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Return original if not valid 13-digit format
  return cnic.toString();
};

/**
 * Format CNIC for display (remove dashes)
 * @param {string} cnic - CNIC number
 * @returns {string} - Formatted CNIC without dashes
 */
export const displayCNIC = (cnic) => {
  return formatCNIC(cnic);
};

/**
 * Remove dashes and formatting from phone numbers
 * @param {string} phone - Phone number with or without dashes
 * @returns {string} - Clean phone number without dashes
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  
  // Remove all dashes, spaces, and parentheses
  return phone.toString().replace(/[-\s()]/g, '');
};

/**
 * Format phone number for display (remove dashes)
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number without dashes
 */
export const displayPhoneNumber = (phone) => {
  return formatPhoneNumber(phone);
};

/**
 * Validate CNIC format (13 digits)
 * @param {string} cnic - CNIC to validate
 * @returns {boolean} - True if valid 13-digit CNIC
 */
export const isValidCNIC = (cnic) => {
  if (!cnic) return false;
  const cleaned = formatCNIC(cnic);
  return /^\d{13}$/.test(cleaned);
};

/**
 * Validate phone number format (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const isValidPhoneNumber = (phone) => {
  if (!phone) return false;
  const cleaned = formatPhoneNumber(phone);
  // Allow 10-15 digits for various phone formats
  return /^\d{10,15}$/.test(cleaned);
};

/**
 * Get current date in DD/MM/YYYY format
 * @returns {string} - Current date as DD/MM/YYYY
 */
export const getCurrentDateDisplay = () => {
  return formatDateDisplay(new Date());
};

/**
 * Calculate age from date of birth
 * @param {string|Date} dateOfBirth - Date of birth
 * @returns {number|null} - Age in years or null if invalid
 */
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  try {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    
    if (isNaN(birth.getTime())) return null;
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : null;
  } catch (error) {
    return null;
  }
};

/**
 * Calculate duration between two dates
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date (optional, defaults to current date)
 * @returns {string} - Duration in years and months
 */
export const calculateDuration = (startDate, endDate = null) => {
  if (!startDate) return "N/A";
  
  try {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "N/A";
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
    }
    return `${months} month${months > 1 ? 's' : ''}`;
  } catch (error) {
    return "N/A";
  }
};

/**
 * Format date range for display
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date (optional)
 * @returns {string} - Formatted date range
 */
export const formatDateRange = (startDate, endDate = null) => {
  const start = formatDateDisplay(startDate);
  const end = endDate ? formatDateDisplay(endDate) : "Present";
  return `${start} - ${end}`;
};
