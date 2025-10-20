const express = require("express");
const router = express.Router();
const { isAuthenticated, authorizeAny } = require("../middleware/auth");
const leaveController = require("../controllers/leaveController");
const { leaveUpload } = require("../config/multer");

// Permissions: leaves.read, leaves.create, leaves.update, leaves.delete, leaves.status, leaves.apply
const canAnyRead = authorizeAny([
  "*",
  "leaves.read",
  "employees.read",
  "leaves.apply",
]);
const canCreate = authorizeAny(["*", "leaves.create", "leaves.apply"]);
const canUpdate = authorizeAny(["*", "leaves.update"]);
const canDelete = authorizeAny(["*", "leaves.delete"]);
const canStatus = authorizeAny(["*", "leaves.status"]);
const canAct = authorizeAny([
  "*",
  "leaves.status",
  "leaves.read",
  "leaves.apply",
]);

router.use(isAuthenticated);

// Preserve original endpoints but delegate to controller
router.get(
  "/apply/employees",
  authorizeAny(["*", "leaves.apply", "leaves.read", "roster.create"]),
  leaveController.listApplyEmployees
);
router.get("/employees", canAnyRead, leaveController.listEmployees);
router.get(
  "/backup-employees",
  authorizeAny(["*", "leaves.apply", "leaves.read"]),
  leaveController.getBackupEmployees
);
// Search approver users for manual routing (exclude Establishment/Admin)
router.get(
  "/approver-users",
  authorizeAny(["*", "leaves.apply", "leaves.create", "leaves.read"]),
  leaveController.searchApproverUsers
);
router.post(
  "/upload-documents",
  authorizeAny(["*", "leaves.apply", "leaves.create"]),
  leaveUpload.array("documents", 10),
  leaveController.uploadDocuments
);
router.get("/:employeeId", canAnyRead, leaveController.getEmployeeLeaves);
router.post("/:employeeId", canCreate, leaveController.createLeaves);
router.put("/:id", canUpdate, leaveController.updateLeave);
router.patch("/:id/status", canStatus, leaveController.updateStatus);
router.delete("/:id", leaveController.deleteLeave);

// Approvals listing and action routes
router.get(
  "/approvals/mine",
  authorizeAny(["*", "leaves.read", "leaves.status", "leaves.apply"]),
  leaveController.listApprovals
);
router.get(
  "/approvals/all",
  authorizeAny(["*", "leaves.read", "leaves.status", "leaves.apply"]),
  leaveController.listAllApprovals
);
router.post("/:id/act", canAct, leaveController.actOnLeave);
router.post("/:id/undo", canAct, leaveController.undoAction);

module.exports = router;
