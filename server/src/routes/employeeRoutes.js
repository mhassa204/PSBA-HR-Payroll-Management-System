// // const { hasRole } = require("../middlewares/authMiddleware");
// //
// // router.delete("/:id", hasRole(["admin", "superadmin"]), employeeController.deleteEmployee);
// //
// // src/routes/employeeRoutes.js
// const express = require("express");
// const router = express.Router();
// const employeeController = require("../controllers/employeeController");
// const upload = require("../config/multer");
// const multer = require("multer");
// const { storage } = require("../config/multer");

// // Custom multer configuration that accepts dynamic field names
// const dynamicUpload = multer({
//   storage: storage,
//   limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
//   fileFilter: (req, file, cb) => {
//     // Allow all field names that match our patterns
//     const allowedPatterns = [
//       /^profile_picture(_file)?$/,
//       /^cnic_(front|back)(_file)?$/,
//       /^disability_document(_file)?$/,
//       /^certificates(_file)?$/,
//       /^(matric|fsc)_certificate(_file)?$/,
//       /^education_documents(_\d+)?(_file)?$/,
//       /^experience_documents(_\d+)?(_file)?$/,
//       /^other_documents(_file)?$/,
//       /^medical_fitness(_file)?$/,
//       /^domicile_certificate(_file)?$/
//     ];

//     const isAllowed = allowedPatterns.some(pattern => pattern.test(file.fieldname));
//     if (isAllowed) {
//       cb(null, true);
//     } else {
//       cb(new Error(`Unexpected field: ${file.fieldname}`), false);
//     }
//   }
// });

// router.post(
//   "/",
//   dynamicUpload.any(), // Accept any field names that pass the filter
//   employeeController.createEmployee
// );

// router.get("/", employeeController.getAllEmployees);
// router.get("/:id", employeeController.getEmployeeById);

// router.put(
//   "/:id",
//   dynamicUpload.any(), // Accept any field names that pass the filter
//   employeeController.updateEmployee
// );

// router.delete("/:id", employeeController.deleteEmployee);

// module.exports = router;





const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employeeController");
const upload = require("../config/multer");
const { isAuthenticated, authorize, authorizeOwnEmployeeOrEmployeesRead } = require('../middleware/auth');

// Routes
router.post(
  "/",
  isAuthenticated,
  authorize('employees.create'),
  upload.any(), // Accept files with allowed types; no strict field-name filter
  employeeController.createEmployee
);

router.get("/", isAuthenticated, authorize('employees.read'), employeeController.getAllEmployees);

router.get("/:id", isAuthenticated, authorizeOwnEmployeeOrEmployeesRead(), employeeController.getEmployeeById);

router.put(
  "/:id",
  isAuthenticated,
  authorize('employees.update'),
  upload.any(), // Accept files with allowed types; no strict field-name filter
  employeeController.updateEmployee
);

router.delete(
  "/:id",
  isAuthenticated,
  authorize('employees.delete'),
  employeeController.deleteEmployee
);

module.exports = router;