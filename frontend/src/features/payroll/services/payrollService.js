import axiosInstance from "../../../lib/axios";

/**
 * Payroll Service - Handles payroll-related API calls
 */
class PayrollService {
  constructor() {
    this.apiClient = axiosInstance;
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
}

export default new PayrollService();
