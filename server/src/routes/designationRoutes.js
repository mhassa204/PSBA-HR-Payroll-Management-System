// src/routes/designationRoutes.js
const express = require("express");
const router = express.Router();
const designationController = require("../controllers/designationController");
const { isAuthenticated, authorize } = require('../middleware/auth');

// Designation CRUD routes
router.post("/", isAuthenticated, authorize('designations.create'), designationController.createDesignation);
router.get("/", isAuthenticated, authorize('designations.read'), designationController.getAllDesignations);
router.get("/statistics", isAuthenticated, authorize('designations.read'), designationController.getDesignationStatistics);
router.get("/department/:departmentId", isAuthenticated, authorize('designations.read'), designationController.getDesignationsByDepartment);
router.get("/:id", isAuthenticated, authorize('designations.read'), designationController.getDesignationById);
router.put("/:id", isAuthenticated, authorize('designations.update'), designationController.updateDesignation);
router.delete("/:id", isAuthenticated, authorize('designations.delete'), designationController.deleteDesignation);

module.exports = router;
