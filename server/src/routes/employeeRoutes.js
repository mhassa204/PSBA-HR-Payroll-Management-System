// const { hasRole } = require("../middlewares/authMiddleware");

// router.delete("/:id", hasRole(["admin", "superadmin"]), employeeController.deleteEmployee);

// src/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const upload = require("../config/multer");

router.post(
  "/",
  upload.fields([
    { name: "medical_fitness_file", maxCount: 1 },
    { name: "profile_picture_file", maxCount: 1 },
    { name: "cnic_front", maxCount: 1 },
    { name: "cnic_back", maxCount: 1 },
    { name: "cnic_documents", maxCount: 2 }, // For both front and back
    { name: "domicile_certificate", maxCount: 1 },
    { name: "disability_document", maxCount: 1 },
    { name: "certificates", maxCount: 5 }, // Multiple certificates
    { name: "matric_certificate", maxCount: 1 },
    { name: "fsc_certificate", maxCount: 1 },
    { name: "education_documents", maxCount: 10 }, // Multiple education docs
    { name: "experience_documents", maxCount: 10 }, // Multiple experience docs
    { name: "other_documents", maxCount: 20 }, // Multiple other documents
  ]),
  employeeController.createEmployee
);

router.get("/", employeeController.getAllEmployees);
router.get("/:id", employeeController.getEmployeeById);

router.put(
  "/:id",
  upload.fields([
    { name: "medical_fitness_file", maxCount: 1 },
    { name: "profile_picture_file", maxCount: 1 },
    { name: "cnic_front", maxCount: 1 },
    { name: "cnic_back", maxCount: 1 },
    { name: "cnic_documents", maxCount: 2 }, // For both front and back
    { name: "domicile_certificate", maxCount: 1 },
    { name: "disability_document", maxCount: 1 },
    { name: "certificates", maxCount: 5 }, // Multiple certificates
    { name: "matric_certificate", maxCount: 1 },
    { name: "fsc_certificate", maxCount: 1 },
    { name: "education_documents", maxCount: 10 }, // Multiple education docs
    { name: "experience_documents", maxCount: 10 }, // Multiple experience docs
    { name: "other_documents", maxCount: 20 }, // Multiple other documents
  ]),
  employeeController.updateEmployee
);

router.delete("/:id", employeeController.deleteEmployee);

module.exports = router;
