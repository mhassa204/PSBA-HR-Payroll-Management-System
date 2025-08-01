/**
 * Employee Service Layer
 *
 * This service handles all employee-related API operations.
 * It provides a clean interface for employee CRUD operations
 * and replaces dummy data usage with real backend API calls.
 *
 * @author PSBA HR Portal Team
 * @version 1.0.0
 */

/**
 * Employee Service Class
 * Provides real API operations for employee management
 */
class EmployeeService {
  constructor() {
    this.apiBaseUrl = this.getApiBaseUrl();
    this.apiClient = this.initializeApiClient();
  }

  /**
   * Get API base URL from environment
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    if (typeof process !== "undefined" && process.env) {
      return process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api";
    }
    return "http://localhost:3000/api";
  }

  /**
   * Initialize API client
   */
  initializeApiClient() {
    return {
      get: async (url) => {
        const response = await fetch(`${this.apiBaseUrl}${url}`);
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      },
      post: async (url, data) => {
        const response = await fetch(`${this.apiBaseUrl}${url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      },
      postFormData: async (url, formData) => {
        const response = await fetch(`${this.apiBaseUrl}${url}`, {
          method: "POST",
          body: formData, // Don't set Content-Type for FormData
        });
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      },
      put: async (url, data) => {
        const response = await fetch(`${this.apiBaseUrl}${url}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      },
      putFormData: async (url, formData) => {
        const response = await fetch(`${this.apiBaseUrl}${url}`, {
          method: "PUT",
          body: formData, // Don't set Content-Type for FormData
        });
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      },
      delete: async (url) => {
        const response = await fetch(`${this.apiBaseUrl}${url}`, {
          method: "DELETE",
        });
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      },
    };
  }

  /**
   * Create FormData from employee data and files
   * @param {Object} employeeData - Employee data
   * @returns {FormData} FormData object
   */
  createFormData(employeeData) {
    const formData = new FormData();

    // Add all text fields
    Object.keys(employeeData).forEach(key => {
      if (employeeData[key] !== null && employeeData[key] !== undefined) {
        if (key === 'past_experiences' || key === 'educations') {
          // Convert arrays to JSON strings
          formData.append(key, JSON.stringify(employeeData[key]));
        } else if (employeeData[key] instanceof File) {
          // Handle file uploads
          formData.append(key, employeeData[key]);
        } else {
          // Handle regular fields
          formData.append(key, employeeData[key]);
        }
      }
    });

    return formData;
  }

  /**
   * Get all employees with pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} searchTerm - Search term
   * @returns {Promise<Object>} Paginated employees data
   */
  async getAllEmployees(page = 1, limit = 10, searchTerm = '') {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm })
      });

      const result = await this.apiClient.get(`/employees?${params}`);
      return {
        data: result.employees || result.data || [],
        total: result.total || 0,
        page: result.page || page,
        limit: result.limit || limit,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / limit)
      };
    } catch (error) {
      console.error("Error fetching employees:", error);
      throw new Error("Failed to fetch employees");
    }
  }

  /**
   * Get employee by ID
   * @param {string|number} id - Employee ID
   * @returns {Promise<Object>} Employee data
   */
  async getEmployeeById(id) {
    try {
      const result = await this.apiClient.get(`/employees/${id}`);
      return result.employee || result;
    } catch (error) {
      console.error("Error fetching employee:", error);
      throw new Error("Failed to fetch employee");
    }
  }

  /**
   * Create new employee
   * @param {Object} employeeData - Employee data including files
   * @returns {Promise<Object>} Created employee data
   */
  async createEmployee(employeeData) {
    try {
      const formData = this.createFormData(employeeData);
      const result = await this.apiClient.postFormData('/employees', formData);
      return result.employee || result;
    } catch (error) {
      console.error("Error creating employee:", error);
      throw new Error("Failed to create employee");
    }
  }

  /**
   * Update employee
   * @param {string|number} id - Employee ID
   * @param {Object} employeeData - Updated employee data
   * @returns {Promise<Object>} Updated employee data
   */
  async updateEmployee(id, employeeData) {
    try {
      const formData = this.createFormData(employeeData);
      const result = await this.apiClient.putFormData(`/employees/${id}`, formData);
      return result.employee || result;
    } catch (error) {
      console.error("Error updating employee:", error);
      throw new Error("Failed to update employee");
    }
  }

  /**
   * Delete employee
   * @param {string|number} id - Employee ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmployee(id) {
    try {
      await this.apiClient.delete(`/employees/${id}`);
      return true;
    } catch (error) {
      console.error("Error deleting employee:", error);
      throw new Error("Failed to delete employee");
    }
  }

  /**
   * Search employees
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching employees
   */
  async searchEmployees(searchTerm) {
    try {
      const result = await this.getAllEmployees(1, 100, searchTerm);
      return result.data;
    } catch (error) {
      console.error("Error searching employees:", error);
      throw new Error("Failed to search employees");
    }
  }

  /**
   * Get employees paginated (alias for getAllEmployees for compatibility)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} searchTerm - Search term
   * @returns {Promise<Object>} Paginated employees data
   */
  async getEmployeesPaginated(page = 1, limit = 10, searchTerm = '') {
    return this.getAllEmployees(page, limit, searchTerm);
  }
}

// Export singleton instance
export const employeeService = new EmployeeService();

// Export class for testing
export { EmployeeService };

// Export default
export default employeeService;
