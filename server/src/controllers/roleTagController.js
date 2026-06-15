const roleTagService = require("../services/roleTagService");

const roleTagController = {
  // Create new role tag
  createRoleTag: async (req, res) => {
    try {
      const { name } = req.body;

      // Basic required field validation
      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: name",
        });
      }

      const roleTag = await roleTagService.createRoleTag(req.body);
      res.status(201).json({ success: true, roleTag });
    } catch (error) {
      console.error("Error creating role tag:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get all role tags
  getAllRoleTags: async (req, res) => {
    try {
      const roleTags = await roleTagService.getAllRoleTags();
      res.status(200).json({ success: true, roleTags });
    } catch (error) {
      console.error("Error fetching role tags:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get role tag by ID
  getRoleTagById: async (req, res) => {
    try {
      const roleTag = await roleTagService.getRoleTagById(req.params.id);
      if (!roleTag) {
        return res.status(404).json({
          success: false,
          error: "Role tag not found"
        });
      }
      res.status(200).json({ success: true, roleTag });
    } catch (error) {
      console.error("Error fetching role tag:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update role tag
  updateRoleTag: async (req, res) => {
    try {
      const roleTag = await roleTagService.updateRoleTag(req.params.id, req.body);
      res.status(200).json({ success: true, roleTag });
    } catch (error) {
      console.error("Error updating role tag:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete role tag
  deleteRoleTag: async (req, res) => {
    try {
      await roleTagService.deleteRoleTag(req.params.id);
      res.status(200).json({
        success: true,
        message: "Role tag deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting role tag:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get role tag statistics
  getRoleTagStatistics: async (req, res) => {
    try {
      const statistics = await roleTagService.getRoleTagStatistics();
      res.status(200).json({ success: true, statistics });
    } catch (error) {
      console.error("Error fetching role tag statistics:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = roleTagController;
