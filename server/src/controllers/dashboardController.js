const dashboardService = require("../services/dashboardService");

const dashboardController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const userRole = req.session?.user?.role?.name;
      const userId = req.session?.user?.id;

      const stats = await dashboardService.getRoleBasedDashboard(
        userRole,
        userId
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Dashboard controller error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Get quick stats for dashboard widgets
  getQuickStats: async (req, res) => {
    try {
      const userRole = req.session?.user?.role?.name;

      // Get only essential stats for quick loading
      const [totalEmployees, todayPresent, pendingLeaves, pendingTravelClaims] =
        await Promise.all([
          dashboardService.getEmployeeStatistics().then((stats) => stats.total),
          dashboardService
            .getAttendanceStatistics()
            .then((stats) => stats.today_present),
          dashboardService
            .getLeaveStatistics()
            .then((stats) => stats.pending_approvals),
          dashboardService
            .getTravelStatistics()
            .then((stats) => stats.pending_claims),
        ]);

      res.json({
        success: true,
        data: {
          total_employees: totalEmployees,
          today_present: todayPresent,
          pending_leaves: pendingLeaves,
          pending_travel_claims: pendingTravelClaims,
        },
      });
    } catch (error) {
      console.error("Quick stats error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Test endpoint without authentication
  testDashboard: async (req, res) => {
    try {
      const stats = await dashboardService.getDashboardStats();
      res.json({
        success: true,
        data: stats,
        message: "Dashboard service is working correctly"
      });
    } catch (error) {
      console.error("Test dashboard error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  },
};

module.exports = dashboardController;
