const express = require("express");
const router = express.Router();
const rosterController = require("../controllers/rosterController");
const { isAuthenticated, authorize } = require("../middleware/auth");

router.get(
  "/",
  isAuthenticated,
  authorize("roster.read"),
  rosterController.list
);

// Helper endpoints for roster creation - rely on controller eligibility (HOD or bazaar user)
router.get(
  "/helpers/officer-employees/list",
  isAuthenticated,
  rosterController.employeesForLoggedInOfficer
);
router.get(
  "/helpers/bazaars",
  isAuthenticated,
  rosterController.bazaarsForRoster
);

router.get(
  "/:id",
  isAuthenticated,
  authorize("roster.read"),
  rosterController.getById
);
router.post(
  "/",
  isAuthenticated,
  rosterController.create
);
router.put(
  "/:id",
  isAuthenticated,
  authorize("roster.update"),
  rosterController.update
);
router.delete(
  "/:id",
  isAuthenticated,
  authorize("roster.delete"),
  rosterController.remove
);

// Approval/status actions (system role only + permission)
router.post(
  "/:id/approve",
  isAuthenticated,
  authorize("roster.status.change"),
  rosterController.approve
);
router.post(
  "/:id/reject",
  isAuthenticated,
  authorize("roster.status.change"),
  rosterController.reject
);
router.put(
  "/:id/status",
  isAuthenticated,
  authorize("roster.status.change"),
  rosterController.setStatus
);

module.exports = router;
