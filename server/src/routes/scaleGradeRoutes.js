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
  authorize("scale-grades.read"),
  scaleGradeController.getAllScaleGrades
);
router.get(
  "/statistics",
  isAuthenticated,
  authorize("scale-grades.read"),
  scaleGradeController.getScaleGradeStatistics
);
router.get(
  "/:id",
  isAuthenticated,
  authorize("scale-grades.read"),
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
