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
  ]),
  employeeController.updateEmployee
);

router.delete("/:id", employeeController.deleteEmployee);

module.exports = router;
