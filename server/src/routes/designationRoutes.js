// src/routes/designationRoutes.js
const express = require("express");
const router = express.Router();
const designationController = require("../controllers/designationController");

// Designation CRUD routes
router.post("/", designationController.createDesignation);
router.get("/", designationController.getAllDesignations);
router.get("/statistics", designationController.getDesignationStatistics);
router.get("/department/:departmentId", designationController.getDesignationsByDepartment);
router.get("/:id", designationController.getDesignationById);
router.put("/:id", designationController.updateDesignation);
router.delete("/:id", designationController.deleteDesignation);

module.exports = router;
