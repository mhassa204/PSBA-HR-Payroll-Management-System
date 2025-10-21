/**
 * Employment Service Layer
 *
 * This service abstracts all employment-related data operations.
 * It provides a clean interface that can easily switch between
 * local state management and API calls without changing component logic.
 *
 * @author PSBA HR Portal Team
 * @version 2.0.0
 */

import axios from "axios";

/**
 * Employment Service Class
 * Provides abstracted data operations for employment management
 * with seamless switching between local data and API calls
 */
class EmploymentService {
  constructor() {
    // Always use API mode for backend integration
    this.apiBaseUrl = this.getApiBaseUrl();
    this.apiClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
      withCredentials: true,
    });

    // Debug logging for development
    if (import.meta.env?.MODE === "development") {
      console.log(
        "🔧 EmploymentService initialized with API URL:",
        this.apiBaseUrl
      );
      console.log("📍 Current hostname:", window.location.hostname);
    }
  }

  /**
   * Get API base URL from environment
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    // Prefer localhost inference when app is opened on localhost to keep cookies same-site.
    const preferLocal = (() => {
      try {
        const h = window.location.hostname;
        return h === "localhost" || h === "127.0.0.1";
      } catch {
        return false;
      }
    })();

    const inferredApi = (() => {
      try {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:3000/api`;
      } catch {
        return "";
      }
    })();

    // Use localhost inference when on localhost, otherwise use Vite env or fallback
    return preferLocal
      ? inferredApi
      : import.meta.env?.VITE_API_URL || inferredApi;
  }

  /**
   * Get form options (departments, designations, etc.)
   * @returns {Promise<Object>} Form options object
   */
  async getFormOptions() {
    try {
      const response = await this.apiClient.get("/employment/form-options");

      if (response.data.success && response.data.options) {
        return response.data.options;
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      console.error("❌ Error fetching form options:", error);

      // Return comprehensive fallback options
      return {
        departments: [
          { value: 1, label: "Engineering", code: "ENG" },
          { value: 2, label: "IT", code: "IT" },
          { value: 3, label: "HR", code: "HR" },
          { value: 4, label: "Administration", code: "ADMIN" },
          { value: 5, label: "Finance", code: "FIN" },
          { value: 6, label: "Legal", code: "LEGAL" },
          { value: 7, label: "Operations", code: "OPS" },
        ],
        designations: [
          { value: 1, label: "Junior Engineer", department_id: 1, level: 1 },
          { value: 2, label: "Assistant Engineer", department_id: 1, level: 2 },
          { value: 3, label: "Engineer", department_id: 1, level: 3 },
          { value: 4, label: "Senior Engineer", department_id: 1, level: 4 },
          { value: 5, label: "Software Developer", department_id: 2, level: 1 },
          {
            value: 6,
            label: "Senior Software Developer",
            department_id: 2,
            level: 2,
          },
          { value: 7, label: "IT Manager", department_id: 2, level: 3 },
          { value: 8, label: "HR Officer", department_id: 3, level: 1 },
          { value: 9, label: "Senior HR Officer", department_id: 3, level: 2 },
          { value: 10, label: "HR Manager", department_id: 3, level: 3 },
          {
            value: 11,
            label: "Administrative Officer",
            department_id: 4,
            level: 1,
          },
          {
            value: 12,
            label: "Senior Administrative Officer",
            department_id: 4,
            level: 2,
          },
          {
            value: 13,
            label: "Administrative Manager",
            department_id: 4,
            level: 3,
          },
          { value: 14, label: "Accounts Officer", department_id: 5, level: 1 },
          {
            value: 15,
            label: "Senior Accounts Officer",
            department_id: 5,
            level: 2,
          },
          { value: 16, label: "Finance Manager", department_id: 5, level: 3 },
          { value: 17, label: "Legal Officer", department_id: 6, level: 1 },
          {
            value: 18,
            label: "Senior Legal Officer",
            department_id: 6,
            level: 2,
          },
          { value: 19, label: "Legal Manager", department_id: 6, level: 3 },
          {
            value: 20,
            label: "Operations Officer",
            department_id: 7,
            level: 1,
          },
          {
            value: 21,
            label: "Senior Operations Officer",
            department_id: 7,
            level: 2,
          },
          {
            value: 22,
            label: "Operations Manager",
            department_id: 7,
            level: 3,
          },
        ],
        organizations: [
          { value: "MBWO", label: "Model Bazaar Welfare Organization" },
          { value: "PMBMC", label: "Punjab Model Bazaars Management Company" },
          { value: "PSBA", label: "Punjab Sahulat Bazaars Authority" },
        ],
        employmentTypes: [
          {
            value: "Regular",
            label: "Regular",
            description: "Permanent employment",
          },
          {
            value: "Contract",
            label: "Contract",
            description: "Fixed-term contract",
          },
          {
            value: "Probation",
            label: "Probation",
            description: "Probationary period",
          },
          {
            value: "Internship",
            label: "Internship",
            description: "Training position",
          },
          {
            value: "Daily Wager",
            label: "Daily Wager",
            description: "Daily wage employment",
          },
        ],
        roleTags: [
          {
            value: 1,
            label: "admin",
            description: "Administrator",
            category: "Management",
          },
          {
            value: 2,
            label: "manager",
            description: "Manager",
            category: "Management",
          },
          {
            value: 3,
            label: "supervisor",
            description: "Supervisor",
            category: "Supervision",
          },
          {
            value: 4,
            label: "staff",
            description: "Staff",
            category: "Operations",
          },
          {
            value: 5,
            label: "worker",
            description: "Worker",
            category: "Operations",
          },
        ],
        scaleGrades: [
          {
            value: 1,
            label: "BPS-17",
            description: "Basic Pay Scale 17",
            level: 17,
            category: "Government",
          },
          {
            value: 2,
            label: "BPS-18",
            description: "Basic Pay Scale 18",
            level: 18,
            category: "Government",
          },
          {
            value: 3,
            label: "BPS-19",
            description: "Basic Pay Scale 19",
            level: 19,
            category: "Government",
          },
          {
            value: 4,
            label: "Grade-A",
            description: "Grade A",
            level: 1,
            category: "Private",
          },
          {
            value: 5,
            label: "Grade-B",
            description: "Grade B",
            level: 2,
            category: "Private",
          },
        ],
        users: [
          {
            value: 1,
            label: "John Doe - EMP001",
            employee_id: "EMP001",
            cnic: "12345-1234567-1",
          },
          {
            value: 2,
            label: "Jane Smith - EMP002",
            employee_id: "EMP002",
            cnic: "12345-1234567-2",
          },
          {
            value: 3,
            label: "Bob Johnson - EMP003",
            employee_id: "EMP003",
            cnic: "12345-1234567-3",
          },
        ],
        contractTypes: [
          {
            value: "Contractual",
            label: "Contractual",
            description: "Fixed-term contract",
          },
          {
            value: "Fixed-term",
            label: "Fixed-term",
            description: "Fixed duration contract",
          },
          {
            value: "Project-based",
            label: "Project-based",
            description: "Project-specific contract",
          },
          {
            value: "Temporary",
            label: "Temporary",
            description: "Temporary contract",
          },
        ],
      };
    }
  }

  /**
   * Get employees for reporting officer selection
   * @returns {Promise<Array>} Array of employees formatted for dropdown
   */
  async getEmployeesForReportingOfficer() {
    try {
      const response = await this.apiClient.get(
        "/employment/employees-for-reporting-officer"
      );

      if (response.data.success && response.data.employees) {
        return response.data.employees;
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      console.error(
        "❌ Error fetching employees for reporting officer:",
        error
      );

      // Return fallback data
      return [
        {
          value: 1,
          label: "John Doe - 12345-1234567-1",
          employee_id: "EMP001",
          cnic: "12345-1234567-1",
        },
        {
          value: 2,
          label: "Jane Smith - 23456-2345678-2",
          employee_id: "EMP002",
          cnic: "23456-2345678-2",
        },
        {
          value: 3,
          label: "Bob Johnson - 34567-3456789-3",
          employee_id: "EMP003",
          cnic: "34567-3456789-3",
        },
      ];
    }
  }

  /**
   * Get designations by department
   * @param {string} departmentId - Department ID
   * @returns {Promise<Array>} Array of designations formatted for form options
   */
  async getDesignationsByDepartment(departmentId) {
    try {
      const response = await this.apiClient.get(
        `/employment/designations/${departmentId}`
      );

      if (response.data.success && response.data.designations) {
        return response.data.designations;
      } else {
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      console.error("❌ Error fetching designations:", error);

      // Fallback designations by department
      const fallbackDesignations = {
        1: [
          // Engineering
          { value: 1, label: "Junior Engineer", department_id: 1, level: 1 },
          { value: 2, label: "Assistant Engineer", department_id: 1, level: 2 },
          { value: 3, label: "Engineer", department_id: 1, level: 3 },
          { value: 4, label: "Senior Engineer", department_id: 1, level: 4 },
        ],
        2: [
          // IT
          { value: 5, label: "Software Developer", department_id: 2, level: 1 },
          {
            value: 6,
            label: "Senior Software Developer",
            department_id: 2,
            level: 2,
          },
          { value: 7, label: "IT Manager", department_id: 2, level: 3 },
        ],
        3: [
          // HR
          { value: 8, label: "HR Officer", department_id: 3, level: 1 },
          { value: 9, label: "Senior HR Officer", department_id: 3, level: 2 },
          { value: 10, label: "HR Manager", department_id: 3, level: 3 },
        ],
        4: [
          // Administration
          {
            value: 11,
            label: "Administrative Officer",
            department_id: 4,
            level: 1,
          },
          {
            value: 12,
            label: "Senior Administrative Officer",
            department_id: 4,
            level: 2,
          },
          {
            value: 13,
            label: "Administrative Manager",
            department_id: 4,
            level: 3,
          },
        ],
        5: [
          // Finance
          { value: 14, label: "Accounts Officer", department_id: 5, level: 1 },
          {
            value: 15,
            label: "Senior Accounts Officer",
            department_id: 5,
            level: 2,
          },
          { value: 16, label: "Finance Manager", department_id: 5, level: 3 },
        ],
        6: [
          // Legal
          { value: 17, label: "Legal Officer", department_id: 6, level: 1 },
          {
            value: 18,
            label: "Senior Legal Officer",
            department_id: 6,
            level: 2,
          },
          { value: 19, label: "Legal Manager", department_id: 6, level: 3 },
        ],
        7: [
          // Operations
          {
            value: 20,
            label: "Operations Officer",
            department_id: 7,
            level: 1,
          },
          {
            value: 21,
            label: "Senior Operations Officer",
            department_id: 7,
            level: 2,
          },
          {
            value: 22,
            label: "Operations Manager",
            department_id: 7,
            level: 3,
          },
        ],
      };

      return fallbackDesignations[departmentId] || [];
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
      // Create FormData for file uploads
      const formData = new FormData();

      // Helper function to flatten nested objects
      const flattenObject = (obj, prefix = "") => {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            const newKey = prefix ? `${prefix}_${key}` : key;

            if (value !== null && value !== undefined) {
              if (
                typeof value === "object" &&
                !Array.isArray(value) &&
                !(value instanceof File)
              ) {
                // Recursively flatten nested objects
                flattenObject(value, newKey);
              } else {
                formData.append(newKey, value);
              }
            }
          }
        }
      };

      // Flatten the entire employment data object
      flattenObject(employmentData);

      // Employment-level medical fitness and police certificate removed; only renewal_report remains
      const documentFields = ["renewal_report"];
      documentFields.forEach((field) => {
        if (employmentData[field] && employmentData[field] instanceof File) {
          formData.append(field, employmentData[field]);
        }
      });

      const response = await this.apiClient.post("/employment", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data.employment || response.data;
    } catch (error) {
      console.error("❌ Error creating employment record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to create employment record"
      );
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
      // Create FormData for file uploads
      const formData = new FormData();

      // Helper function to flatten nested objects
      const flattenObject = (obj, prefix = "") => {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            const newKey = prefix ? `${prefix}_${key}` : key;

            if (value !== undefined) {
              if (value === null) {
                formData.append(newKey, "null"); // Send "null" as string
              } else if (
                typeof value === "object" &&
                !Array.isArray(value) &&
                !(value instanceof File)
              ) {
                // Recursively flatten nested objects
                flattenObject(value, newKey);
              } else if (Array.isArray(value)) {
                // Handle arrays properly - convert to JSON string to preserve structure
                formData.append(newKey, JSON.stringify(value));
              } else {
                formData.append(newKey, value);
              }
            }
          }
        }
      };

      // Flatten the entire employment data object
      flattenObject(employmentData);

      // Employment-level medical fitness and police certificate removed; only renewal_report remains
      const documentFields = ["renewal_report"];
      documentFields.forEach((field) => {
        if (employmentData[field] && employmentData[field] instanceof File) {
          formData.append(field, employmentData[field]);
        }
      });

      const response = await this.apiClient.put(
        `/employment/${employmentId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.employment || response.data;
    } catch (error) {
      console.error("Error updating employment record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to update employment record"
      );
    }
  }

  /**
   * Delete employment record
   * @param {string} employmentId - Employment ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmployment(employmentId) {
    try {
      const response = await this.apiClient.delete(
        `/employment/${employmentId}`
      );
      return response.data.success || true;
    } catch (error) {
      console.error("Error deleting employment record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to delete employment record"
      );
    }
  }

  /**
   * Create salary record
   * @param {Object} salaryData - Salary data
   * @returns {Promise<Object>} Created salary record
   */
  async createSalary(employmentId, salaryData) {
    try {
      const response = await this.apiClient.post(
        `/employment/${employmentId}/salary`,
        salaryData
      );

      return response.data.salary || response.data;
    } catch (error) {
      console.error("❌ Error creating salary record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to create salary record"
      );
    }
  }

  /**
   * Update salary record
   * @param {string} employmentId - Employment ID
   * @param {Object} salaryData - Updated salary data
   * @returns {Promise<Object>} Updated salary record
   */
  async updateSalary(employmentId, salaryData) {
    try {
      const response = await this.apiClient.put(
        `/employment/${employmentId}/salary`,
        salaryData
      );
      return response.data.salary || response.data;
    } catch (error) {
      console.error("Error updating salary record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to update salary record"
      );
    }
  }

  /**
   * Delete salary record
   * @param {string} employmentId - Employment ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteSalary(employmentId) {
    try {
      const response = await this.apiClient.delete(
        `/employment/${employmentId}/salary`
      );
      return response.data.success || true;
    } catch (error) {
      console.error("Error deleting salary record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to delete salary record"
      );
    }
  }

  /**
   * Create location record
   * @param {Object} locationData - Location data
   * @returns {Promise<Object>} Created location record
   */
  async createLocation(employmentId, locationData) {
    try {
      const response = await this.apiClient.post(
        `/employment/${employmentId}/location`,
        locationData
      );

      return response.data.location || response.data;
    } catch (error) {
      console.error("❌ Error creating location record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to create location record"
      );
    }
  }

  /**
   * Update location record
   * @param {string} employmentId - Employment ID
   * @param {Object} locationData - Updated location data
   * @returns {Promise<Object>} Updated location record
   */
  async updateLocation(employmentId, locationData) {
    try {
      const response = await this.apiClient.put(
        `/employment/${employmentId}/location`,
        locationData
      );
      return response.data.location || response.data;
    } catch (error) {
      console.error("Error updating location record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to update location record"
      );
    }
  }

  /**
   * Delete location record
   * @param {string} employmentId - Employment ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteLocation(employmentId) {
    try {
      const response = await this.apiClient.delete(
        `/employment/${employmentId}/location`
      );
      return response.data.success || true;
    } catch (error) {
      console.error("Error deleting location record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to delete location record"
      );
    }
  }

  /**
   * Create contract record
   * @param {Object} contractData - Contract data
   * @returns {Promise<Object>} Created contract record
   */
  async createContract(employmentId, contractData) {
    try {
      // Create FormData for file uploads
      const formData = new FormData();

      // Add all form fields
      Object.keys(contractData).forEach((key) => {
        if (key !== "files" && key !== "documentRecords") {
          if (contractData[key] !== null && contractData[key] !== undefined) {
            formData.append(key, contractData[key]);
          }
        }
      });

      // Add files if present
      if (contractData.files) {
        Object.keys(contractData.files).forEach((key) => {
          if (contractData.files[key]) {
            formData.append(key, contractData.files[key]);
          }
        });
      }

      const response = await this.apiClient.post(
        `/employment/${employmentId}/contract`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.contract || response.data;
    } catch (error) {
      console.error("❌ Error creating contract record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to create contract record"
      );
    }
  }

  /**
   * Update contract record
   * @param {string} employmentId - Employment ID
   * @param {Object} contractData - Updated contract data
   * @returns {Promise<Object>} Updated contract record
   */
  async updateContract(employmentId, contractData) {
    try {
      // Create FormData for file uploads
      const formData = new FormData();

      // Add all form fields
      Object.keys(contractData).forEach((key) => {
        if (key !== "files" && key !== "documentRecords") {
          if (contractData[key] !== null && contractData[key] !== undefined) {
            formData.append(key, contractData[key]);
          }
        }
      });

      // Add files if present
      if (contractData.files) {
        Object.keys(contractData.files).forEach((key) => {
          if (contractData.files[key]) {
            formData.append(key, contractData.files[key]);
          }
        });
      }

      const response = await this.apiClient.put(
        `/employment/${employmentId}/contract`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data.contract || response.data;
    } catch (error) {
      console.error("Error updating contract record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to update contract record"
      );
    }
  }

  /**
   * Delete contract record
   * @param {string} employmentId - Employment ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteContract(employmentId) {
    try {
      const response = await this.apiClient.delete(
        `/employment/${employmentId}/contract`
      );
      return response.data.success || true;
    } catch (error) {
      console.error("Error deleting contract record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to delete contract record"
      );
    }
  }

  /**
   * Get employment record by ID
   * @param {string} employmentId - Employment ID
   * @returns {Promise<Object>} Employment record
   */
  async getEmploymentById(employmentId) {
    try {
      const response = await this.apiClient.get(`/employment/${employmentId}`);

      return response.data.employment || response.data;
    } catch (error) {
      console.error("❌ Error fetching employment record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to fetch employment record"
      );
    }
  }

  /**
   * Get employment records by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of employment records
   */
  async getEmploymentByUserId(userId) {
    try {
      const response = await this.apiClient.get(
        `/employment/employee/${userId}`
      );
      return response.data.employments || [];
    } catch (error) {
      console.error("Error fetching employment records:", error);
      throw new Error(
        error.response?.data?.error || "Failed to load employment records"
      );
    }
  }

  /**
   * Get employment history for an employee
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Array>} Array of employment records
   */
  async getEmploymentHistory(employeeId) {
    try {
      const response = await this.apiClient.get(
        `/employment/employee/${employeeId}`
      );
      return response.data.employments || [];
    } catch (error) {
      console.error("Error fetching employment history:", error);
      throw new Error(
        error.response?.data?.error || "Failed to load employment history"
      );
    }
  }

  /**
   * Create new employment record
   * @param {Object} recordData - Employment record data
   * @returns {Promise<Object>} Created employment record
   */
  async createEmploymentRecord(recordData) {
    try {
      const response = await this.apiClient.post("/employment", recordData);
      return response.data.employment || response.data;
    } catch (error) {
      console.error("Error creating employment record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to create employment record"
      );
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
      const response = await this.apiClient.put(
        `/employment/${recordId}`,
        recordData
      );
      return response.data.employment || response.data;
    } catch (error) {
      console.error("Error updating employment record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to update employment record"
      );
    }
  }

  /**
   * Delete employment record
   * @param {string} recordId - Record ID
   * @returns {Promise<void>}
   */
  async deleteEmploymentRecord(recordId) {
    try {
      const response = await this.apiClient.delete(`/employment/${recordId}`);
      return response.data.success || true;
    } catch (error) {
      console.error("Error deleting employment record:", error);
      throw new Error(
        error.response?.data?.error || "Failed to delete employment record"
      );
    }
  }

  /**
   * Get employment statistics
   * @returns {Promise<Object>} Employment statistics
   */
  async getEmploymentStatistics() {
    try {
      const response = await this.apiClient.get("/employment/statistics");
      return response.data.statistics || {};
    } catch (error) {
      console.error("Error fetching employment statistics:", error);
      throw new Error(
        error.response?.data?.error || "Failed to load employment statistics"
      );
    }
  }
}

// Export singleton instance
export const employmentService = new EmploymentService();

// Export class for testing
export { EmploymentService };

// Export default
export default employmentService;
