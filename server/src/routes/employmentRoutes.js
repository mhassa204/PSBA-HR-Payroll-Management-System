// src/routes/employmentRoutes.js
const express = require("express");
const router = express.Router();
const employmentController = require("../controllers/employmentController");
const multer = require("multer");
const { employmentStorage } = require("../config/multer");
const { isAuthenticated, authorize } = require("../middleware/auth");
const { validateBody } = require("../middleware/sharedValidate");

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
      /^contract_document(_\d+)?(_file)?$/,
      /^appointment_letter(_\d+)?(_file)?$/,
    ];

    const isAllowed = allowedPatterns.some((pattern) =>
      pattern.test(file.fieldname)
    );
    if (isAllowed) {
      console.log(
        `✅ Accepted employment field: ${file.fieldname} (${file.originalname})`
      );
      cb(null, true);
    } else {
      console.error(
        `❌ Rejected employment field: ${file.fieldname} (${file.originalname})`
      );
      cb(new Error(`Unexpected field: ${file.fieldname}`), false);
    }
  },
});

// Employment CRUD routes with file upload support
router.post(
  "/",
  isAuthenticated,
  authorize("employment.create"),
  employmentUpload.any(),
  validateBody("employment"),
  employmentController.createEmployment
);
router.get(
  "/",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getAllEmployments
);
router.get(
  "/statistics",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getEmploymentStatistics
);
router.get(
  "/form-options",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getFormOptions
);
router.get(
  "/employees-for-reporting-officer",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getEmployeesForReportingOfficer
);
router.get(
  "/designations/:departmentId",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getDesignationsByDepartment
);
router.get(
  "/employee/:employeeId",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getEmploymentsByEmployeeId
);
router.get(
  "/:id",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getEmploymentById
);
router.put(
  "/:id",
  isAuthenticated,
  authorize("employment.update"),
  employmentUpload.any(),
  validateBody("employment", { partial: true }),
  employmentController.updateEmployment
);
router.delete(
  "/:id",
  isAuthenticated,
  authorize("employment.delete"),
  employmentController.deleteEmployment
);

// Salary management routes
router.post(
  "/:employmentId/salary",
  isAuthenticated,
  authorize("employment.salary.create"),
  employmentController.createSalary
);
router.put(
  "/:employmentId/salary",
  isAuthenticated,
  authorize("employment.salary.update"),
  employmentController.updateSalary
);
router.delete(
  "/:employmentId/salary",
  isAuthenticated,
  authorize("employment.salary.delete"),
  employmentController.deleteSalary
);

// Location management routes
router.post(
  "/:employmentId/location",
  isAuthenticated,
  authorize("employment.location.create"),
  employmentController.createLocation
);
router.put(
  "/:employmentId/location",
  isAuthenticated,
  authorize("employment.location.update"),
  employmentController.updateLocation
);
router.delete(
  "/:employmentId/location",
  isAuthenticated,
  authorize("employment.location.delete"),
  employmentController.deleteLocation
);

// Contract management routes
router.post(
  "/:employmentId/contract",
  isAuthenticated,
  authorize("employment.contract.create"),
  employmentUpload.any(),
  employmentController.createContract
);
router.put(
  "/:employmentId/contract",
  isAuthenticated,
  authorize("employment.contract.update"),
  employmentUpload.any(),
  employmentController.updateContract
);
router.delete(
  "/:employmentId/contract",
  isAuthenticated,
  authorize("employment.contract.delete"),
  employmentController.deleteContract
);

// Transfer routes: read history + perform/record transfers
router.get(
  "/:id/transfers",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getTransferHistory
);
router.post(
  "/:id/transfer",
  isAuthenticated,
  authorize("employment.location.update"),
  employmentController.transferEmployment
);

// Employment history routes
router.get(
  "/:id/history",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getEmploymentHistory
);
router.get(
  "/:id/history/grouped",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getEmploymentHistoryGrouped
);
router.get(
  "/:id/history/stats",
  isAuthenticated,
  authorize("employment.read"),
  employmentController.getEmploymentHistoryStats
);

// Manual history create
router.post(
  "/:id/history",
  isAuthenticated,
  authorize("employment.update"),
  employmentController.createHistoryEntry
);

// Manual history update
router.put(
  "/history/:historyId",
  isAuthenticated,
  authorize("employment.update"),
  employmentController.updateHistoryEntry
);

// Delete history routes
router.delete(
  "/history/:historyId",
  isAuthenticated,
  authorize("employment.delete"),
  employmentController.deleteHistoryRecord
);

router.delete(
  "/:id/history",
  isAuthenticated,
  authorize("employment.delete"),
  employmentController.deleteAllHistory
);

module.exports = router;
