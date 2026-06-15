const educationLevelService = require("../services/educationLevelService");

const educationLevelController = {
  createEducationLevel: async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Missing required field: name" });
      const level = await educationLevelService.createEducationLevel(req.body);
      return res.status(201).json({ success: true, educationLevel: level });
    } catch (error) {
      console.error("Error creating education level:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  getAllEducationLevels: async (_req, res) => {
    try {
      const educationLevels = await educationLevelService.getAllEducationLevels();
      return res.status(200).json({ success: true, educationLevels });
    } catch (error) {
      console.error("Error fetching education levels:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  getEducationLevelById: async (req, res) => {
    try {
      const educationLevel = await educationLevelService.getEducationLevelById(req.params.id);
      if (!educationLevel) return res.status(404).json({ success: false, error: "Education level not found" });
      return res.status(200).json({ success: true, educationLevel });
    } catch (error) {
      console.error("Error fetching education level:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  updateEducationLevel: async (req, res) => {
    try {
      const educationLevel = await educationLevelService.updateEducationLevel(req.params.id, req.body);
      return res.status(200).json({ success: true, educationLevel });
    } catch (error) {
      console.error("Error updating education level:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  deleteEducationLevel: async (req, res) => {
    try {
      await educationLevelService.deleteEducationLevel(req.params.id);
      return res.status(200).json({ success: true, message: "Education level deleted successfully" });
    } catch (error) {
      console.error("Error deleting education level:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },
};

module.exports = educationLevelController;
