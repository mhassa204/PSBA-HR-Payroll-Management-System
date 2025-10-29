import axiosInstance from "../../../lib/axios";

/**
 * Payroll Service - Handles payroll-related API calls
 */
class PayrollService {
  constructor() {
    this.apiClient = axiosInstance;
  }

  /**
   * Get employee payroll details for a specific month
   * @param {number} employeeId - Employee ID
   * @param {number} year - Year (e.g., 2024)
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Payroll details data
   */
  async getEmployeePayrollDetails(employeeId, year, month) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("year", year);
      queryParams.append("month", month);

      const result = await this.apiClient.get(
        `/payroll/employee/${employeeId}/details?${queryParams.toString()}`
      );

      return result.data;
    } catch (error) {
      console.error("Error fetching payroll details:", error);
      throw new Error("Failed to fetch payroll details");
    }
  }

  /**
   * Get all employees for payroll with pagination and filters
   * @param {Object} params - Search and filter parameters
   * @returns {Promise<Object>} Paginated employees data
   */
  async getPayrollEmployees(params = {}) {
    try {
      const queryParams = new URLSearchParams();

      // Add pagination params
      if (params.page) queryParams.append("page", params.page);
      if (params.limit) queryParams.append("limit", params.limit);
      if (params.search) queryParams.append("search", params.search);

      // Add filter params
      if (params.department_id)
        queryParams.append("department_id", params.department_id);
      if (params.designation_id)
        queryParams.append("designation_id", params.designation_id);
      if (params.designation_title)
        queryParams.append("designation_title", params.designation_title);
      if (params.location_id)
        queryParams.append("location_id", params.location_id);
      if (params.scale_grade_id)
        queryParams.append("scale_grade_id", params.scale_grade_id);

      const result = await this.apiClient.get(
        `/employees?${queryParams.toString()}`
      );

      return {
        success: true,
        employees: result.data.employees || [],
        total: result.data.total || 0,
        page: result.data.page || 1,
        limit: result.data.limit || 10,
        totalPages: result.data.totalPages || 0,
      };
    } catch (error) {
      console.error("Error fetching payroll employees:", error);
      throw new Error("Failed to fetch payroll employees");
    }
  }

  /**
   * Create a payroll record
   * @param {number} employeeId - Employee ID
   * @param {Object} payrollData - Payroll data to save
   * @returns {Promise<Object>} Created payroll data
   */
  async createPayroll(employeeId, payrollData) {
    try {
      const result = await this.apiClient.post(
        `/payroll/employee/${employeeId}`,
        payrollData
      );

      return result.data;
    } catch (error) {
      console.error("Error creating payroll:", error);
      throw new Error(
        error.response?.data?.error || "Failed to create payroll"
      );
    }
  }

  /**
   * Get all payrolls for an employee
   * @param {number} employeeId - Employee ID
   * @returns {Promise<Object>} List of payrolls
   */
  async getPayrollsByEmployee(employeeId) {
    try {
      const result = await this.apiClient.get(
        `/payroll/employee/${employeeId}`
      );

      return result.data;
    } catch (error) {
      console.error("Error fetching payrolls:", error);
      throw new Error("Failed to fetch payrolls");
    }
  }

  /**
   * Get a single payroll by ID
   * @param {number} payrollId - Payroll ID
   * @returns {Promise<Object>} Payroll data
   */
  async getPayrollById(payrollId) {
    try {
      const result = await this.apiClient.get(`/payroll/${payrollId}`);

      return result.data;
    } catch (error) {
      console.error("Error fetching payroll:", error);
      throw new Error(error.response?.data?.error || "Failed to fetch payroll");
    }
  }

  /**
   * Update a payroll (arrears and deductions)
   * @param {number} payrollId - Payroll ID
   * @param {Object} updateData - Update data (arrears, other_deductions)
   * @returns {Promise<Object>} Updated payroll data
   */
  async updatePayroll(payrollId, updateData) {
    try {
      const result = await this.apiClient.put(
        `/payroll/${payrollId}`,
        updateData
      );

      return result.data;
    } catch (error) {
      console.error("Error updating payroll:", error);
      throw new Error(
        error.response?.data?.error || "Failed to update payroll"
      );
    }
  }

  /**
   * Process a payroll (mark as PROCESSED)
   * @param {number} payrollId - Payroll ID
   * @returns {Promise<Object>} Updated payroll data
   */
  async processPayroll(payrollId) {
    try {
      const result = await this.apiClient.put(`/payroll/${payrollId}/process`);

      return result.data;
    } catch (error) {
      console.error("Error processing payroll:", error);
      throw new Error(
        error.response?.data?.error || "Failed to process payroll"
      );
    }
  }

  /**
   * Delete a payroll
   * @param {number} payrollId - Payroll ID
   * @returns {Promise<Object>} Deletion result
   */
  async deletePayroll(payrollId) {
    try {
      const result = await this.apiClient.delete(`/payroll/${payrollId}`);

      return result.data;
    } catch (error) {
      console.error("Error deleting payroll:", error);
      throw new Error(
        error.response?.data?.error || "Failed to delete payroll"
      );
    }
  }
}

export default new PayrollService();
