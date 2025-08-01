/**
 * API Configuration
 * 
 * Centralized configuration for API settings and environment management.
 * Provides easy switching between local data and API modes.
 * 
 * @author PSBA HR Portal Team
 * @version 2.0.0
 */

/**
 * API Configuration Object
 */
const apiConfig = {
  // Environment settings
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // API mode configuration
  useApi: process.env.REACT_APP_USE_API === 'true' || false,
  
  // API endpoints
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://172.16.21.178:3000/api',
  
  // Timeout settings
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000, // 30 seconds
  
  // Retry configuration
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  
  // Authentication
  authTokenKey: 'hr_portal_auth_token',
  
  // Local storage keys
  storageKeys: {
    apiMode: 'hr_portal_api_mode',
    authToken: 'hr_portal_auth_token',
    userPreferences: 'hr_portal_user_preferences',
  },
  
  // API endpoints mapping
  endpoints: {
    // Authentication
    auth: {
      login: '/auth/login',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      profile: '/auth/profile',
    },
    
    // Form options
    formOptions: '/form-options',
    
    // Employment management
    employment: {
      list: '/employment',
      create: '/employment',
      update: (id) => `/employment/${id}`,
      delete: (id) => `/employment/${id}`,
      byUser: (userId) => `/employment/user/${userId}`,
    },
    
    // Salary management
    salary: {
      create: '/salary',
      update: (id) => `/salary/${id}`,
      delete: (id) => `/salary/${id}`,
      validate: '/salary/validate',
    },
    
    // Location management
    location: {
      create: '/location',
      update: (id) => `/location/${id}`,
      delete: (id) => `/location/${id}`,
    },
    
    // Contract management
    contract: {
      create: '/contract',
      update: (id) => `/contract/${id}`,
      delete: (id) => `/contract/${id}`,
    },
    
    // Employee management
    employees: {
      list: '/employees',
      create: '/employees',
      update: (id) => `/employees/${id}`,
      delete: (id) => `/employees/${id}`,
      search: '/employees/search',
    },
    
    // Designations
    designations: {
      byDepartment: (departmentId) => `/designations/department/${departmentId}`,
    },
  },
};

/**
 * Get current API mode from localStorage or environment
 * @returns {boolean} Whether API mode is enabled
 */
export const getApiMode = () => {
  // Check localStorage first (runtime configuration)
  const storedMode = localStorage.getItem(apiConfig.storageKeys.apiMode);
  if (storedMode !== null) {
    return storedMode === 'true';
  }
  
  // Fall back to environment variable
  return apiConfig.useApi;
};

/**
 * Set API mode and persist to localStorage
 * @param {boolean} useApi - Whether to use API mode
 */
export const setApiMode = (useApi) => {
  localStorage.setItem(apiConfig.storageKeys.apiMode, useApi.toString());
  
  // Optionally reload the page to apply changes
  if (window.confirm('API mode changed. Reload the page to apply changes?')) {
    window.location.reload();
  }
};

/**
 * Get API base URL
 * @returns {string} API base URL
 */
export const getApiBaseUrl = () => {
  return apiConfig.baseUrl;
};

/**
 * Get full API endpoint URL
 * @param {string} endpoint - Endpoint path
 * @returns {string} Full URL
 */
export const getApiUrl = (endpoint) => {
  return `${apiConfig.baseUrl}${endpoint}`;
};

/**
 * Get authentication token from localStorage
 * @returns {string|null} Auth token or null
 */
export const getAuthToken = () => {
  return localStorage.getItem(apiConfig.storageKeys.authToken);
};

/**
 * Set authentication token in localStorage
 * @param {string} token - Auth token
 */
export const setAuthToken = (token) => {
  localStorage.setItem(apiConfig.storageKeys.authToken, token);
};

/**
 * Remove authentication token from localStorage
 */
export const removeAuthToken = () => {
  localStorage.removeItem(apiConfig.storageKeys.authToken);
};

/**
 * Check if user is authenticated
 * @returns {boolean} Whether user has valid auth token
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  return token !== null && token !== '';
};

/**
 * Create HTTP headers with authentication
 * @returns {Object} Headers object
 */
export const createAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Development utilities for API mode switching
 */
export const devUtils = {
  /**
   * Toggle API mode (development only)
   */
  toggleApiMode: () => {
    if (apiConfig.isDevelopment) {
      const currentMode = getApiMode();
      setApiMode(!currentMode);
      console.log(`API mode switched to: ${!currentMode ? 'API' : 'Local'}`);
    } else {
      console.warn('API mode toggle is only available in development');
    }
  },
  
  /**
   * Show current configuration (development only)
   */
  showConfig: () => {
    if (apiConfig.isDevelopment) {
      console.table({
        'API Mode': getApiMode() ? 'Enabled' : 'Disabled',
        'Base URL': getApiBaseUrl(),
        'Environment': process.env.NODE_ENV,
        'Authenticated': isAuthenticated(),
      });
    }
  },
  
  /**
   * Reset all local storage (development only)
   */
  resetStorage: () => {
    if (apiConfig.isDevelopment) {
      Object.values(apiConfig.storageKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('Local storage cleared');
    }
  },
};

// Make dev utils available globally in development
if (apiConfig.isDevelopment && typeof window !== 'undefined') {
  window.hrPortalDevUtils = devUtils;
  console.log('HR Portal dev utils available at window.hrPortalDevUtils');
}

export default apiConfig;
