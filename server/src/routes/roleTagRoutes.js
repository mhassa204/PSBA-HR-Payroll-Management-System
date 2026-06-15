const express = require("express");
const router = express.Router();
const roleTagController = require("../controllers/roleTagController");
const { isAuthenticated, authorize } = require('../middleware/auth');

// Role Tag CRUD routes
router.post("/", isAuthenticated, authorize('role-tags.create'), roleTagController.createRoleTag);
router.get("/", isAuthenticated, authorize('role-tags.read'), roleTagController.getAllRoleTags);
router.get("/statistics", isAuthenticated, authorize('role-tags.read'), roleTagController.getRoleTagStatistics);
router.get("/:id", isAuthenticated, authorize('role-tags.read'), roleTagController.getRoleTagById);
router.put("/:id", isAuthenticated, authorize('role-tags.update'), roleTagController.updateRoleTag);
router.delete("/:id", isAuthenticated, authorize('role-tags.delete'), roleTagController.deleteRoleTag);

module.exports = router;
