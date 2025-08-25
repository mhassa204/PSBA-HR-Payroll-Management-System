// src/routes/departmentRoutes.js
const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const { isAuthenticated, authorize } = require('../middleware/auth');

// Department CRUD routes
router.post("/", isAuthenticated, authorize('departments.create'), departmentController.createDepartment);
router.get("/", isAuthenticated, authorize('departments.read'), departmentController.getAllDepartments);
router.get("/statistics", isAuthenticated, authorize('departments.read'), departmentController.getDepartmentStatistics);
router.get("/:id", isAuthenticated, authorize('departments.read'), departmentController.getDepartmentById);
router.put("/:id", isAuthenticated, authorize('departments.update'), departmentController.updateDepartment);
router.delete("/:id", isAuthenticated, authorize('departments.delete'), departmentController.deleteDepartment);

module.exports = router;
