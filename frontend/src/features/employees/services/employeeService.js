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
import axiosInstance from '../../../lib/axios';

class EmployeeService {
  constructor() {
    this.apiClient = axiosInstance;
  }

  /**
   * Create FormData from employee data and files
   * @param {Object} employeeData - Employee data
   * @returns {FormData} FormData object
   */
  createFormData(employeeData) {
    const formData = new FormData();

    Object.keys(employeeData).forEach(key => {
      const value = employeeData[key];

       if (key === 'profile_picture' && value === null) {
        console.log('🔄 Frontend: Profile picture is null, appending "null" to form data');
        formData.append(key, 'null');
        return; // Skip to next iteration
      } else if (key === 'profile_picture' && (value === 'null' || value === '')) {
        console.log('🔄 Frontend: Profile picture is string "null" or empty, appending "null" to form data');
        formData.append(key, 'null');
        return; // Skip to next iteration
      } else if (value !== null && value !== undefined) {
        if (key === 'past_experiences' || key === 'educations' || key === 'documents_to_remove') {
          // Convert array data (including documents_to_remove) to JSON
          formData.append(key, JSON.stringify(value));
        } else if (key === 'experience_documents' || key === 'education_documents') {
          // Skip these - handled below
          return;
        } else if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          // Skip complex non-file objects
          return;
        } else if (Array.isArray(value)) {
          // Append each file in arrays like other_documents
          value.forEach(item => {
            if (item instanceof File) {
              formData.append(key, item);
            }
          });
        } else {
          formData.append(key, value);
        }
      }
    });

    // Handle experience_documents
    if (employeeData.experience_documents && typeof employeeData.experience_documents === 'object') {
      Object.entries(employeeData.experience_documents).forEach(([experienceId, file]) => {
        if (file instanceof File) {
          formData.append(`experience_documents_${experienceId}`, file);
        }
      });
    }

    // Handle education_documents
    if (employeeData.education_documents && typeof employeeData.education_documents === 'object') {
      Object.entries(employeeData.education_documents).forEach(([educationId, file]) => {
        if (file instanceof File) {
          formData.append(`education_documents_${educationId}`, file);
        }
      });
    }

    // Debug logging for form data
    console.log('🔄 Frontend: Form data contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`  - ${key}:`, value);
    }
    
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

      const result = await this.apiClient.get('/employees', { params });
      return {
        data: result.data.employees || result.data || [],
        total: result.data.total || 0,
        page: result.data.page || page,
        limit: result.data.limit || limit,
        totalPages: result.data.totalPages || Math.ceil((result.data.total || 0) / limit)
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
      return result.data.employee || result.data;
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
      const result = await this.apiClient.post('/employees', formData);
      return result.data.employee || result.data;
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
      const result = await this.apiClient.put(`/employees/${id}`, formData);
      return result.data.employee || result.data;
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
      const { data } = await this.apiClient.delete(`/employees/${id}`);
      return data;
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

  /**
   * Get all employees for dropdown/select options (formatted for reporting officer)
   * @returns {Promise<Array>} Array of employees formatted for dropdown
   */
  async getAllEmployeesForDropdown() {
    try {
      // Get all employees without pagination for dropdown
      const result = await this.apiClient.get('/employees?limit=1000');
      const employees = result.data.employees || result.data || [];
      
      console.log("🔍 getAllEmployeesForDropdown: Raw result:", result);
      console.log("🔍 getAllEmployeesForDropdown: Employees count:", employees.length);
      
      if (employees.length > 0) {
        console.log("🔍 getAllEmployeesForDropdown: Sample employee:", employees[0]);
      }
      
      // Format employees for dropdown: "Employee Name_CNIC"
      const formattedEmployees = employees.map(employee => ({
        value: employee.id.toString(),
        label: `${employee.full_name || 'Unknown'}_${employee.cnic || 'N/A'}`
      }));
      
      console.log("🔍 getAllEmployeesForDropdown: Formatted employees count:", formattedEmployees.length);
      if (formattedEmployees.length > 0) {
        console.log("🔍 getAllEmployeesForDropdown: Sample formatted employee:", formattedEmployees[0]);
      }
      
      return formattedEmployees;
    } catch (error) {
      console.error("Error fetching employees for dropdown:", error);
      throw new Error("Failed to fetch employees for dropdown");
    }
  }
}

// Export singleton instance
export const employeeService = new EmployeeService();

// Export class for testing
export { EmployeeService };

// Export default
export default employeeService;
