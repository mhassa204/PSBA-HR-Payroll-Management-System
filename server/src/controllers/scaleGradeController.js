const scaleGradeService = require("../services/scaleGradeService");

const scaleGradeController = {
  // Create new scale grade
  createScaleGrade: async (req, res) => {
    try {
      const { name } = req.body;

      // Basic required field validation
      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: name",
        });
      }

      const scaleGrade = await scaleGradeService.createScaleGrade(req.body);
      res.status(201).json({ success: true, scaleGrade });
    } catch (error) {
      console.error("Error creating scale grade:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get all scale grades
  getAllScaleGrades: async (req, res) => {
    try {
      const scaleGrades = await scaleGradeService.getAllScaleGrades();
      res.status(200).json({ success: true, scaleGrades });
    } catch (error) {
      console.error("Error fetching scale grades:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get scale grade by ID
  getScaleGradeById: async (req, res) => {
    try {
      const scaleGrade = await scaleGradeService.getScaleGradeById(req.params.id);
      if (!scaleGrade) {
        return res.status(404).json({
          success: false,
          error: "Scale grade not found"
        });
      }
      res.status(200).json({ success: true, scaleGrade });
    } catch (error) {
      console.error("Error fetching scale grade:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update scale grade
  updateScaleGrade: async (req, res) => {
    try {
      const scaleGrade = await scaleGradeService.updateScaleGrade(req.params.id, req.body);
      res.status(200).json({ success: true, scaleGrade });
    } catch (error) {
      console.error("Error updating scale grade:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete scale grade
  deleteScaleGrade: async (req, res) => {
    try {
      await scaleGradeService.deleteScaleGrade(req.params.id);
      res.status(200).json({
        success: true,
        message: "Scale grade deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting scale grade:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get scale grade statistics
  getScaleGradeStatistics: async (req, res) => {
    try {
      const statistics = await scaleGradeService.getScaleGradeStatistics();
      res.status(200).json({ success: true, statistics });
    } catch (error) {
      console.error("Error fetching scale grade statistics:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = scaleGradeController;
