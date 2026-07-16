const express = require("express");
const router = express.Router();
const rosterController = require("../controllers/rosterController");
const { isAuthenticated, authorize } = require("../middleware/auth");

// Static paths must be registered before /:id

// Approver queue (assignment enforced in the controller)
router.get(
  "/pending-approvals",
  isAuthenticated,
  authorize("roster.approve"),
  rosterController.pendingApprovals
);

// Everything the create/edit page needs: scope, eligible employees,
// cycle defaults, approver preview, last roster for prefill
router.get(
  "/helpers/context",
  isAuthenticated,
  authorize("roster.create"),
  rosterController.context
);

router.get("/", isAuthenticated, authorize("roster.read"), rosterController.list);
router.get("/:id", isAuthenticated, authorize("roster.read"), rosterController.getById);

// Create/edit/delete are creator-scoped (ownership checked in the controller)
router.post("/", isAuthenticated, authorize("roster.create"), rosterController.create);
router.put("/:id", isAuthenticated, authorize("roster.create"), rosterController.update);
router.delete("/:id", isAuthenticated, authorize("roster.create"), rosterController.remove);

// Approval actions (assigned approver only; reason required for reject)
router.post(
  "/:id/approve",
  isAuthenticated,
  authorize("roster.approve"),
  rosterController.approve
);
router.post(
  "/:id/reject",
  isAuthenticated,
  authorize("roster.approve"),
  rosterController.reject
);

module.exports = router;
