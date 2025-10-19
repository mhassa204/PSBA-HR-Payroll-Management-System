const express = require("express");
const router = express.Router();
const scaleGradeController = require("../controllers/scaleGradeController");
const { isAuthenticated, authorize } = require("../middleware/auth");

// Scale Grade CRUD routes
router.post(
  "/",
  isAuthenticated,
  authorize("scale-grades.create"),
  scaleGradeController.createScaleGrade
);
router.get(
  "/",
  isAuthenticated,
  // Allow either explicit scale-grades.read or travel.rates.read (for Accounts using Travel Rates page)
  require("../middleware/auth").authorizeAny([
    "scale-grades.read",
    "travel.rates.read",
  ]),
  scaleGradeController.getAllScaleGrades
);
router.get(
  "/statistics",
  isAuthenticated,
  require("../middleware/auth").authorizeAny([
    "scale-grades.read",
    "travel.rates.read",
  ]),
  scaleGradeController.getScaleGradeStatistics
);
router.get(
  "/:id",
  isAuthenticated,
  require("../middleware/auth").authorizeAny([
    "scale-grades.read",
    "travel.rates.read",
  ]),
  scaleGradeController.getScaleGradeById
);
router.put(
  "/:id",
  isAuthenticated,
  authorize("scale-grades.update"),
  scaleGradeController.updateScaleGrade
);
router.delete(
  "/:id",
  isAuthenticated,
  authorize("scale-grades.delete"),
  scaleGradeController.deleteScaleGrade
);

module.exports = router;
