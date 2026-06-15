const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { isAuthenticated, authorize } = require("../middleware/auth");

// Dashboard routes with proper RBAC
router.get(
  "/stats",
  isAuthenticated,
  authorize("dashboard.read"),
  dashboardController.getDashboardStats
);
router.get(
  "/quick-stats",
  isAuthenticated,
  authorize("dashboard.read"),
  dashboardController.getQuickStats
);


module.exports = router;
