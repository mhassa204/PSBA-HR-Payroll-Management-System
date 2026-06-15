import axios from "../lib/axios";

class DashboardService {
  // Get comprehensive dashboard statistics
  async getDashboardStats() {
    try {
      const response = await axios.get("/dashboard/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  }

  // Get quick stats for dashboard widgets
  async getQuickStats() {
    try {
      const response = await axios.get("/dashboard/quick-stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching quick stats:", error);
      throw error;
    }
  }
}

export default new DashboardService();
