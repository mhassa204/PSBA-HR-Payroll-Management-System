const express = require("express");
const router = express.Router();
const educationLevelController = require("../controllers/educationLevelController");
const { isAuthenticated, authorize } = require('../middleware/auth');

// Education Level CRUD routes
router.post("/", isAuthenticated, authorize('education-levels.create'), educationLevelController.createEducationLevel);
router.get("/", isAuthenticated, authorize('education-levels.read'), educationLevelController.getAllEducationLevels);
router.get("/:id", isAuthenticated, authorize('education-levels.read'), educationLevelController.getEducationLevelById);
router.put("/:id", isAuthenticated, authorize('education-levels.update'), educationLevelController.updateEducationLevel);
router.delete("/:id", isAuthenticated, authorize('education-levels.delete'), educationLevelController.deleteEducationLevel);

module.exports = router;
