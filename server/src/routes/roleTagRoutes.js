const express = require("express");
const router = express.Router();
const roleTagController = require("../controllers/roleTagController");

// Role Tag CRUD routes
router.post("/", roleTagController.createRoleTag);
router.get("/", roleTagController.getAllRoleTags);
router.get("/statistics", roleTagController.getRoleTagStatistics);
router.get("/:id", roleTagController.getRoleTagById);
router.put("/:id", roleTagController.updateRoleTag);
router.delete("/:id", roleTagController.deleteRoleTag);

module.exports = router;
