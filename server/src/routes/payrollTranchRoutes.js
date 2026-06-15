const express = require("express");
const router = express.Router();
const payrollTranchController = require("../controllers/payrollTranchController");
const { isAuthenticated, authorize } = require("../middleware/auth");

// Create a payroll tranch
router.post(
  "/",
  isAuthenticated,
  authorize("payroll.write"),
  payrollTranchController.createTranch
);

// Get all tranches
router.get(
  "/",
  isAuthenticated,
  authorize("payroll.read"),
  payrollTranchController.getAllTranches
);

// Get a single tranch by ID
router.get(
  "/:tranchId",
  isAuthenticated,
  authorize("payroll.read"),
  payrollTranchController.getTranchById
);

module.exports = router;
