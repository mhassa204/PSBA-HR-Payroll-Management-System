import axiosInstance from "../../../lib/axios";

/**
 * Payroll Tranch Service - Handles payroll tranch-related API calls
 */
class PayrollTranchService {
  constructor() {
    this.apiClient = axiosInstance;
  }

  /**
   * Create a payroll tranch
   * @param {Array<number>} payrollIds - Array of payroll IDs
   * @param {string} name - Optional tranch name
   * @returns {Promise<Object>} Created tranch data
   */
  async createTranch(payrollIds, name = null) {
    try {
      const result = await this.apiClient.post("/payroll-tranches", {
        payrollIds,
        name,
      });

      return result.data;
    } catch (error) {
      console.error("Error creating tranch:", error);
      throw new Error(error.response?.data?.error || "Failed to create tranch");
    }
  }

  /**
   * Get all tranches
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated tranches data
   */
  async getAllTranches(page = 1, limit = 50) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page);
      queryParams.append("limit", limit);

      const result = await this.apiClient.get(
        `/payroll-tranches?${queryParams.toString()}`
      );

      return result.data;
    } catch (error) {
      console.error("Error fetching tranches:", error);
      throw new Error(
        error.response?.data?.error || "Failed to fetch tranches"
      );
    }
  }

  /**
   * Get a single tranch by ID
   * @param {number} tranchId - Tranch ID
   * @returns {Promise<Object>} Tranch data
   */
  async getTranchById(tranchId) {
    try {
      const result = await this.apiClient.get(`/payroll-tranches/${tranchId}`);

      return result.data;
    } catch (error) {
      console.error("Error fetching tranch:", error);
      throw new Error(error.response?.data?.error || "Failed to fetch tranch");
    }
  }
}

export default new PayrollTranchService();
