/**
 * Employment Service Layer
 *
 * This service abstracts all employment-related data operations.
 * It provides a clean interface that can easily switch between
 * local state management and API calls without changing component logic.
 *
 * @author PSBA HR Portal Team
 * @version 1.0.0
 */

// Import only the data manager for local storage fallback
import { dataManager } from "../utils/dataManager";

/**
 * Employment Service Class
 * Provides abstracted data operations for employment management
 * with seamless switching between local data and API calls
 */
class EmploymentService {
  constructor() {
    // Always use API mode for backend integration
    this.apiBaseUrl = this.getApiBaseUrl();
    this.apiClient = null; // Will be initialized when needed
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
   * Initialize API client when needed
   */
  initializeApiClient() {
    // TODO: Initialize your preferred HTTP client (axios, fetch wrapper, etc.)
    // Example with fetch:
    this.apiClient = {
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
   * Get form options (departments, designations, etc.)
   * @returns {Promise<Object>} Form options object
   */
  async getFormOptions() {
    try {
      if (!this.apiClient) this.initializeApiClient();
      return await this.apiClient.get("/employment/form-options");
    } catch (error) {
      console.error("Error fetching form options:", error);
      // Return minimal fallback options
      return {
        options: {
          departments: [],
          designations: [],
          organizations: [
            { value: "MBWO", label: "Model Bazaar Welfare Organization" },
            { value: "PMBMC", label: "Punjab Model Bazaars Management Company" },
            { value: "PSBA", label: "Punjab Sahulat Bazaars Authority" }
          ],
          employmentTypes: [
            { value: "Regular", label: "Regular" },
            { value: "Contract", label: "Contract" },
            { value: "Probation", label: "Probation" }
          ]
        }
      };
    }
  }

  /**
   * Get designations by department
   * @param {string} departmentId - Department ID
   * @returns {Promise<Array>} Array of designations formatted for form options
   */
  async getDesignationsByDepartment(departmentId) {
    try {
      if (!this.apiClient) this.initializeApiClient();
      const response = await this.apiClient.get(`/employment/designations/${departmentId}`);
      return response.designations || [];
    } catch (error) {
      console.error("❌ Error fetching designations:", error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Validate salary for designation
   * @param {string} designationId - Designation ID
   * @param {number} salary - Salary amount
   * @returns {Promise<Object>} Validation result
   */
  async validateSalary(designationId, salary) {
    try {
      if (this.isApiMode) {
        // TODO: Replace with actual API call
        // return await apiClient.post('/api/validate-salary', { designationId, salary });
      }

      // Simple validation logic (no strict salary constraints as per design)
      if (!salary || salary <= 0) {
        return { valid: false, message: "Salary must be greater than 0" };
      }

      if (salary < 15000) {
        return {
          valid: false,
          message: "Salary cannot be less than minimum wage (15,000)",
        };
      }

      if (salary > 500000) {
        return {
          valid: false,
          message: "Salary seems unusually high. Please verify.",
        };
      }

      return { valid: true, message: "Salary is valid" };
    } catch (error) {
      console.error("Error validating salary:", error);
      return { valid: false, message: "Validation failed" };
    }
  }

  /**
   * Create employment record
   * @param {Object} employmentData - Employment data
   * @returns {Promise<Object>} Created employment record
   */
  async createEmployment(employmentData) {
    try {
      console.log("🔍 Creating employment record:", employmentData);

      if (this.isApiMode) {
        if (!this.apiClient) this.initializeApiClient();
        const result = await this.apiClient.post('/employment', employmentData);
        console.log("✅ Employment record created via API:", result);
        return result.employment || result;
      }

      // Use enhanced data manager for local storage
      const result = await dataManager.saveEmploymentRecord(employmentData);
      console.log("✅ Employment record created locally:", result);

      return result;
    } catch (error) {
      console.error("❌ Error creating employment record:", error);
      throw new Error("Failed to create employment record");
    }
  }

  /**
   * Update employment record
   * @param {string} employmentId - Employment ID
   * @param {Object} employmentData - Updated employment data
   * @returns {Promise<Object>} Updated employment record
   */
  async updateEmployment(employmentId, employmentData) {
    try {
      if (!this.apiClient) this.initializeApiClient();
      const result = await this.apiClient.put(`/employment/${employmentId}`, employmentData);
      return result.employment || result;
    } catch (error) {
      console.error("Error updating employment record:", error);
      throw new Error("Failed to update employment record");
    }
  }

  /**
   * Delete employment record
   * @param {string} employmentId - Employment ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmployment(employmentId) {
    try {
      if (!this.apiClient) this.initializeApiClient();
      const result = await this.apiClient.delete(`/employment/${employmentId}`);
      return result.success || true;
    } catch (error) {
      console.error("Error deleting employment record:", error);
      throw new Error("Failed to delete employment record");
    }
  }

  /**
   * Create salary record
   * @param {Object} salaryData - Salary data
   * @returns {Promise<Object>} Created salary record
   */
  async createSalary(salaryData) {
    try {
      console.log("🔍 Creating salary record:", salaryData);

      if (this.isApiMode) {
        if (!this.apiClient) this.initializeApiClient();
        const result = await this.apiClient.post('/salary', salaryData);
        console.log("✅ Salary record created via API:", result);
        return result;
      }

      // Use local data storage
      const result = createSalaryRecord(salaryData);
      console.log("✅ Salary record created locally:", result);

      // Store in localStorage for persistence
      this.saveToLocalStorage('salary_records', result);

      return result;
    } catch (error) {
      console.error("❌ Error creating salary record:", error);
      throw new Error("Failed to create salary record");
    }
  }

  /**
   * Update salary record
   * @param {string} salaryId - Salary ID
   * @param {Object} salaryData - Updated salary data
   * @returns {Promise<Object>} Updated salary record
   */
  async updateSalary(salaryId, salaryData) {
    try {
      if (this.isApiMode) {
        // TODO: Replace with actual API call
        // return await apiClient.put(`/api/salary/${salaryId}`, salaryData);
      }
      return updateSalaryRecord(salaryId, salaryData);
    } catch (error) {
      console.error("Error updating salary record:", error);
      throw new Error("Failed to update salary record");
    }
  }

  /**
   * Create location record
   * @param {Object} locationData - Location data
   * @returns {Promise<Object>} Created location record
   */
  async createLocation(locationData) {
    try {
      console.log("🔍 Creating location record:", locationData);

      if (this.isApiMode) {
        if (!this.apiClient) this.initializeApiClient();
        const result = await this.apiClient.post('/location', locationData);
        console.log("✅ Location record created via API:", result);
        return result;
      }

      // Use local data storage
      const result = createLocationRecord(locationData);
      console.log("✅ Location record created locally:", result);

      // Store in localStorage for persistence
      this.saveToLocalStorage('location_records', result);

      return result;
    } catch (error) {
      console.error("❌ Error creating location record:", error);
      throw new Error("Failed to create location record");
    }
  }

  /**
   * Update location record
   * @param {string} locationId - Location ID
   * @param {Object} locationData - Updated location data
   * @returns {Promise<Object>} Updated location record
   */
  async updateLocation(locationId, locationData) {
    try {
      if (this.isApiMode) {
        // TODO: Replace with actual API call
        // return await apiClient.put(`/api/location/${locationId}`, locationData);
      }
      return updateLocationRecord(locationId, locationData);
    } catch (error) {
      console.error("Error updating location record:", error);
      throw new Error("Failed to update location record");
    }
  }

  /**
   * Create contract record
   * @param {Object} contractData - Contract data
   * @returns {Promise<Object>} Created contract record
   */
  async createContract(contractData) {
    try {
      console.log("🔍 Creating contract record:", contractData);

      if (this.isApiMode) {
        if (!this.apiClient) this.initializeApiClient();
        const result = await this.apiClient.post('/contract', contractData);
        console.log("✅ Contract record created via API:", result);
        return result;
      }

      // Use local data storage
      const result = createContractRecord(contractData);
      console.log("✅ Contract record created locally:", result);

      // Store in localStorage for persistence
      this.saveToLocalStorage('contract_records', result);

      return result;
    } catch (error) {
      console.error("❌ Error creating contract record:", error);
      throw new Error("Failed to create contract record");
    }
  }

  /**
   * Update contract record
   * @param {string} contractId - Contract ID
   * @param {Object} contractData - Updated contract data
   * @returns {Promise<Object>} Updated contract record
   */
  async updateContract(contractId, contractData) {
    try {
      if (this.isApiMode) {
        // TODO: Replace with actual API call
        // return await apiClient.put(`/api/contract/${contractId}`, contractData);
      }
      return updateContractRecord(contractId, contractData);
    } catch (error) {
      console.error("Error updating contract record:", error);
      throw new Error("Failed to update contract record");
    }
  }

  /**
   * Get employment records by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of employment records
   */
  async getEmploymentByUserId(userId) {
    try {
      if (!this.apiClient) this.initializeApiClient();
      const result = await this.apiClient.get(`/employment/employee/${userId}`);
      return result.employments || [];
    } catch (error) {
      console.error("Error fetching employment records:", error);
      throw new Error("Failed to load employment records");
    }
  }

  /**
   * Get employment history for an employee
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Array>} Array of employment records
   */
  async getEmploymentHistory(employeeId) {
    try {
      if (this.isApiMode) {
        if (!this.apiClient) this.initializeApiClient();
        const result = await this.apiClient.get(`/employment/employee/${employeeId}`);
        return result.employments || [];
      }

      // Mock employment history data
      return [
        {
          id: 1,
          employee_id: employeeId,
          department: { id: 1, name: "Engineering" },
          designation: { id: 3, title: "Senior Engineer" },
          employment_type: "Permanent",
          start_date: "2023-01-15",
          end_date: null,
          is_current: true,
          salary: {
            basic_salary: 85000,
            gross_salary: 120000,
            grade: "BPS-17",
            scale: "Senior",
          },
          location: {
            name: "Head Office",
            address: "Lahore, Punjab",
          },
        },
        {
          id: 2,
          employee_id: employeeId,
          department: { id: 1, name: "Engineering" },
          designation: { id: 2, title: "Assistant Engineer" },
          employment_type: "Permanent",
          start_date: "2021-06-01",
          end_date: "2023-01-14",
          is_current: false,
          salary: {
            basic_salary: 65000,
            gross_salary: 90000,
            grade: "BPS-16",
            scale: "Junior",
          },
          location: {
            name: "Regional Office",
            address: "Karachi, Sindh",
          },
        },
      ];
    } catch (error) {
      console.error("Error fetching employment history:", error);
      throw new Error("Failed to load employment history");
    }
  }

  /**
   * Create new employment record
   * @param {Object} recordData - Employment record data
   * @returns {Promise<Object>} Created employment record
   */
  async createEmploymentRecord(recordData) {
    try {
      if (!this.apiClient) this.initializeApiClient();
      const result = await this.apiClient.post('/employment', recordData);
      return result.employment || result;
    } catch (error) {
      console.error("Error creating employment record:", error);
      throw new Error("Failed to create employment record");
    }
  }

  /**
   * Update employment record
   * @param {string} recordId - Record ID
   * @param {Object} recordData - Updated record data
   * @returns {Promise<Object>} Updated employment record
   */
  async updateEmploymentRecord(recordId, recordData) {
    try {
      if (!this.apiClient) this.initializeApiClient();
      const result = await this.apiClient.put(`/employment/${recordId}`, recordData);
      return result.employment || result;
    } catch (error) {
      console.error("Error updating employment record:", error);
      throw new Error("Failed to update employment record");
    }
  }

  /**
   * Delete employment record
   * @param {string} recordId - Record ID
   * @returns {Promise<void>}
   */
  async deleteEmploymentRecord(recordId) {
    try {
      if (!this.apiClient) this.initializeApiClient();
      const result = await this.apiClient.delete(`/employment/${recordId}`);
      return result.success || true;
    } catch (error) {
      console.error("Error deleting employment record:", error);
      throw new Error("Failed to delete employment record");
    }
  }

  /**
   * Save data to localStorage for persistence
   * @param {string} key - Storage key
   * @param {Object} data - Data to save
   */
  saveToLocalStorage(key, data) {
    try {
      const existingData = JSON.parse(localStorage.getItem(key) || '[]');
      const updatedData = Array.isArray(existingData) ? [...existingData, data] : [data];
      localStorage.setItem(key, JSON.stringify(updatedData));
      console.log(`💾 Data saved to localStorage under key: ${key}`);
    } catch (error) {
      console.error(`❌ Error saving to localStorage:`, error);
    }
  }

  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @returns {Array} Stored data array
   */
  loadFromLocalStorage(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      console.log(`📖 Data loaded from localStorage under key: ${key}`, data);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`❌ Error loading from localStorage:`, error);
      return [];
    }
  }

  /**
   * Clear localStorage data
   * @param {string} key - Storage key (optional, clears all if not provided)
   */
  clearLocalStorage(key = null) {
    try {
      if (key) {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared localStorage key: ${key}`);
      } else {
        // Clear all employment-related data
        const keys = ['employment_records', 'salary_records', 'location_records', 'contract_records'];
        keys.forEach(k => localStorage.removeItem(k));
        console.log(`🗑️ Cleared all employment data from localStorage`);
      }
    } catch (error) {
      console.error(`❌ Error clearing localStorage:`, error);
    }
  }


}

// Export singleton instance
export const employmentService = new EmploymentService();

// Export class for testing
export { EmploymentService };

// Export default
export default employmentService;
