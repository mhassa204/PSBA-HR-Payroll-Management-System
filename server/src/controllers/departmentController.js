// src/controllers/departmentController.js
const departmentService = require("../services/departmentService");

const departmentController = {
  // Create new department
  createDepartment: async (req, res) => {
    try {
      const { name } = req.body;

      // Basic required field validation
      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: name",
        });
      }

      const department = await departmentService.createDepartment(req.body);
      res.status(201).json({ success: true, department });
    } catch (error) {
      console.error("Error creating department:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get all departments
  getAllDepartments: async (req, res) => {
    try {
      const departments = await departmentService.getAllDepartments();
      res.status(200).json({ success: true, departments });
    } catch (error) {
      console.error("Error fetching departments:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get department by ID
  getDepartmentById: async (req, res) => {
    try {
      const department = await departmentService.getDepartmentById(req.params.id);
      if (!department) {
        return res.status(404).json({
          success: false,
          error: "Department not found"
        });
      }
      res.status(200).json({ success: true, department });
    } catch (error) {
      console.error("Error fetching department:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update department
  updateDepartment: async (req, res) => {
    try {
      const department = await departmentService.updateDepartment(req.params.id, req.body);
      res.status(200).json({ success: true, department });
    } catch (error) {
      console.error("Error updating department:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete department
  deleteDepartment: async (req, res) => {
    try {
      await departmentService.deleteDepartment(req.params.id);
      res.status(200).json({
        success: true,
        message: "Department deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting department:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get department statistics
  getDepartmentStatistics: async (req, res) => {
    try {
      const statistics = await departmentService.getDepartmentStatistics();
      res.status(200).json({ success: true, statistics });
    } catch (error) {
      console.error("Error fetching department statistics:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = departmentController;
