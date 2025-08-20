const express = require("express");
const router = express.Router();
const scaleGradeController = require("../controllers/scaleGradeController");

// Scale Grade CRUD routes
router.post("/", scaleGradeController.createScaleGrade);
router.get("/", scaleGradeController.getAllScaleGrades);
router.get("/statistics", scaleGradeController.getScaleGradeStatistics);
router.get("/:id", scaleGradeController.getScaleGradeById);
router.put("/:id", scaleGradeController.updateScaleGrade);
router.delete("/:id", scaleGradeController.deleteScaleGrade);

module.exports = router;
