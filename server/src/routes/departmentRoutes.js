// src/routes/departmentRoutes.js
const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");

// Department CRUD routes
router.post("/", departmentController.createDepartment);
router.get("/", departmentController.getAllDepartments);
router.get("/statistics", departmentController.getDepartmentStatistics);
router.get("/:id", departmentController.getDepartmentById);
router.put("/:id", departmentController.updateDepartment);
router.delete("/:id", departmentController.deleteDepartment);

module.exports = router;
