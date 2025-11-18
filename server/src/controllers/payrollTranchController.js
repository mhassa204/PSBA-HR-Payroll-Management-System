const payrollTranchService = require("../services/payrollTranchService");
const payrollService = require("../services/payrollService");

const payrollTranchController = {
  // Create a payroll tranch
  createTranch: async (req, res) => {
    try {
      const { payrollIds, name } = req.body;
      const userId = req.session?.user?.id;

      if (
        !payrollIds ||
        !Array.isArray(payrollIds) ||
        payrollIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Payroll IDs are required",
        });
      }

      const result = await payrollTranchService.createTranch(
        payrollIds,
        name,
        userId
      );

      return res.status(201).json(result);
    } catch (error) {
      console.error("Error in createTranch:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to create tranch",
      });
    }
  },

  // Get all tranches
  getAllTranches: async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;

      const result = await payrollTranchService.getAllTranches(page, limit);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getAllTranches:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to fetch tranches",
      });
    }
  },

  // Get a single tranch by ID
  getTranchById: async (req, res) => {
    try {
      const { tranchId } = req.params;

      const result = await payrollTranchService.getTranchById(tranchId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getTranchById:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to fetch tranch",
      });
    }
  },
};

module.exports = payrollTranchController;
