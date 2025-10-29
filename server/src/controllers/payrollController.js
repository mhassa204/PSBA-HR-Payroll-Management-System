const payrollService = require("../services/payrollService");
const { isAuthenticated, authorize } = require("../middleware/auth");

const payrollController = {
  // Get employee payroll details for a specific month
  getEmployeePayrollDetails: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { year, month } = req.query;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: "Year and month are required",
        });
      }

      const payrollDetails = await payrollService.getEmployeePayrollDetails(
        employeeId,
        parseInt(year),
        parseInt(month)
      );

      return res.status(200).json(payrollDetails);
    } catch (error) {
      console.error("Error in getEmployeePayrollDetails:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to fetch payroll details",
      });
    }
  },

  // Create a payroll record
  createPayroll: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { year, month, ...payrollData } = req.body;

      if (!year || !month) {
        return res.status(400).json({
          success: false,
          error: "Year and month are required",
        });
      }

      const result = await payrollService.createPayroll(
        employeeId,
        year,
        month,
        payrollData
      );

      return res.status(201).json(result);
    } catch (error) {
      console.error("Error in createPayroll:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to create payroll",
      });
    }
  },

  // Get all payrolls for an employee
  getPayrollsByEmployee: async (req, res) => {
    try {
      const { employeeId } = req.params;

      const result = await payrollService.getPayrollsByEmployee(employeeId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getPayrollsByEmployee:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to fetch payrolls",
      });
    }
  },

  // Process a payroll (mark as PROCESSED)
  processPayroll: async (req, res) => {
    try {
      const { payrollId } = req.params;
      const userId = req.user?.id; // Assuming user info is in req.user from auth middleware

      const result = await payrollService.processPayroll(payrollId, userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in processPayroll:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to process payroll",
      });
    }
  },

  // Get a single payroll by ID
  getPayrollById: async (req, res) => {
    try {
      const { payrollId } = req.params;

      const result = await payrollService.getPayrollById(payrollId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in getPayrollById:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to fetch payroll",
      });
    }
  },

  // Update a payroll
  updatePayroll: async (req, res) => {
    try {
      const { payrollId } = req.params;
      const { arrears, other_deductions } = req.body;

      const result = await payrollService.updatePayroll(payrollId, {
        arrears,
        other_deductions,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in updatePayroll:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to update payroll",
      });
    }
  },

  // Delete a payroll
  deletePayroll: async (req, res) => {
    try {
      const { payrollId } = req.params;

      const result = await payrollService.deletePayroll(payrollId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in deletePayroll:", error);
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to delete payroll",
      });
    }
  },
};

module.exports = payrollController;
