const express = require("express");
const router = express.Router();
const payrollController = require("../controllers/payrollController");
const { isAuthenticated, authorize } = require("../middleware/auth");

// Get employee payroll details for a specific month
router.get(
  "/employee/:employeeId/details",
  isAuthenticated,
  authorize("employees.read"),
  payrollController.getEmployeePayrollDetails
);

// Create a payroll record
router.post(
  "/employee/:employeeId",
  isAuthenticated,
  authorize("payroll.write"),
  payrollController.createPayroll
);

// Get all payrolls for an employee
router.get(
  "/employee/:employeeId",
  isAuthenticated,
  authorize("employees.read"),
  payrollController.getPayrollsByEmployee
);

// Get a single payroll by ID
router.get(
  "/:payrollId",
  isAuthenticated,
  authorize("payroll.read"),
  payrollController.getPayrollById
);

// Update a payroll (only arrears and deductions)
router.put(
  "/:payrollId",
  isAuthenticated,
  authorize("payroll.write"),
  payrollController.updatePayroll
);

// Process a payroll (mark as PROCESSED)
router.put(
  "/:payrollId/process",
  isAuthenticated,
  authorize("payroll.write"),
  payrollController.processPayroll
);

// Delete a payroll (soft delete)
router.delete(
  "/:payrollId",
  isAuthenticated,
  authorize("payroll.write"),
  payrollController.deletePayroll
);

module.exports = router;
