// src/controllers/designationController.js
const designationService = require("../services/designationService");

const designationController = {
  // Create new designation
  createDesignation: async (req, res) => {
    try {
      const { title } = req.body;

      // Basic required field validation
      if (!title) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: title",
        });
      }

      const designation = await designationService.createDesignation(req.body);
      res.status(201).json({ success: true, designation });
    } catch (error) {
      console.error("Error creating designation:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get all designations
  getAllDesignations: async (req, res) => {
    try {
      const departmentId = req.query.department_id;
      const designations = await designationService.getAllDesignations(departmentId);
      res.status(200).json({ success: true, designations });
    } catch (error) {
      console.error("Error fetching designations:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get designation by ID
  getDesignationById: async (req, res) => {
    try {
      const designation = await designationService.getDesignationById(req.params.id);
      if (!designation) {
        return res.status(404).json({
          success: false,
          error: "Designation not found"
        });
      }
      res.status(200).json({ success: true, designation });
    } catch (error) {
      console.error("Error fetching designation:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get designations by department
  getDesignationsByDepartment: async (req, res) => {
    try {
      const designations = await designationService.getDesignationsByDepartment(req.params.departmentId);
      res.status(200).json({ success: true, designations });
    } catch (error) {
      console.error("Error fetching designations by department:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update designation
  updateDesignation: async (req, res) => {
    try {
      const designation = await designationService.updateDesignation(req.params.id, req.body);
      res.status(200).json({ success: true, designation });
    } catch (error) {
      console.error("Error updating designation:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete designation
  deleteDesignation: async (req, res) => {
    try {
      await designationService.deleteDesignation(req.params.id);
      res.status(200).json({
        success: true,
        message: "Designation deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting designation:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get designation statistics
  getDesignationStatistics: async (req, res) => {
    try {
      const statistics = await designationService.getDesignationStatistics();
      res.status(200).json({ success: true, statistics });
    } catch (error) {
      console.error("Error fetching designation statistics:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = designationController;
