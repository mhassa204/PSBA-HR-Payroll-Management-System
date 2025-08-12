// src/routes/employmentRoutes.js
const express = require("express");
const router = express.Router();
const employmentController = require("../controllers/employmentController");
const multer = require("multer");
const { employmentStorage } = require("../config/multer");

// Custom multer configuration for employment document uploads
const employmentUpload = multer({
  storage: employmentStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    // Define allowed field name patterns for employment documents
    // Allow array indices like medical_fitness_report_pdf_0, police_character_certificate_0, etc.
    const allowedPatterns = [
      /^medical_fitness_report_pdf(_\d+)?(_file)?$/,
      /^police_character_certificate(_\d+)?(_file)?$/,
      /^renewal_report(_\d+)?(_file)?$/,
      /^contract_renewal_report(_\d+)?(_file)?$/,
      /^contract_document(_\d+)?(_file)?$/
    ];

    const isAllowed = allowedPatterns.some(pattern => pattern.test(file.fieldname));
    if (isAllowed) {
      console.log(`✅ Accepted employment field: ${file.fieldname} (${file.originalname})`);
      cb(null, true);
    } else {
      console.error(`❌ Rejected employment field: ${file.fieldname} (${file.originalname})`);
      cb(new Error(`Unexpected field: ${file.fieldname}`), false);
    }
  }
});

// Employment CRUD routes with file upload support
router.post("/", employmentUpload.any(), employmentController.createEmployment);
router.get("/", employmentController.getAllEmployments);
router.get("/statistics", employmentController.getEmploymentStatistics);
router.get("/form-options", employmentController.getFormOptions);
router.get("/designations/:departmentId", employmentController.getDesignationsByDepartment);
router.get("/employee/:employeeId", employmentController.getEmploymentsByEmployeeId);
router.get("/:id", employmentController.getEmploymentById);
router.put("/:id", employmentUpload.any(), employmentController.updateEmployment);
router.delete("/:id", employmentController.deleteEmployment);

// Salary management routes
router.post("/:employmentId/salary", employmentController.createSalary);
router.put("/:employmentId/salary", employmentController.updateSalary);
router.delete("/:employmentId/salary", employmentController.deleteSalary);

// Location management routes
router.post("/:employmentId/location", employmentController.createLocation);
router.put("/:employmentId/location", employmentController.updateLocation);
router.delete("/:employmentId/location", employmentController.deleteLocation);

// Contract management routes
router.post("/:employmentId/contract", employmentUpload.any(), employmentController.createContract);
router.put("/:employmentId/contract", employmentUpload.any(), employmentController.updateContract);
router.delete("/:employmentId/contract", employmentController.deleteContract);

module.exports = router;
