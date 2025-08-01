// src/routes/employmentRoutes.js
const express = require("express");
const router = express.Router();
const employmentController = require("../controllers/employmentController");

// Employment CRUD routes
router.post("/", employmentController.createEmployment);
router.get("/", employmentController.getAllEmployments);
router.get("/statistics", employmentController.getEmploymentStatistics);
router.get("/form-options", employmentController.getFormOptions);
router.get("/designations/:departmentId", employmentController.getDesignationsByDepartment);
router.get("/employee/:employeeId", employmentController.getEmploymentsByEmployeeId);
router.get("/:id", employmentController.getEmploymentById);
router.put("/:id", employmentController.updateEmployment);
router.delete("/:id", employmentController.deleteEmployment);

module.exports = router;
