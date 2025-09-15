const districtService = require("../services/districtService");

const districtController = {
  createDistrict: async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Missing required field: name" });
      const district = await districtService.createDistrict(req.body);
      return res.status(201).json({ success: true, district });
    } catch (error) {
      console.error("Error creating district:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  getAllDistricts: async (_req, res) => {
    try {
      const districts = await districtService.getAllDistricts();
      return res.status(200).json({ success: true, districts });
    } catch (error) {
      console.error("Error fetching districts:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  getDistrictById: async (req, res) => {
    try {
      const district = await districtService.getDistrictById(req.params.id);
      if (!district) return res.status(404).json({ success: false, error: "District not found" });
      return res.status(200).json({ success: true, district });
    } catch (error) {
      console.error("Error fetching district:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  updateDistrict: async (req, res) => {
    try {
      const district = await districtService.updateDistrict(req.params.id, req.body);
      return res.status(200).json({ success: true, district });
    } catch (error) {
      console.error("Error updating district:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  deleteDistrict: async (req, res) => {
    try {
      await districtService.deleteDistrict(req.params.id);
      return res.status(200).json({ success: true, message: "District deleted successfully" });
    } catch (error) {
      console.error("Error deleting district:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },
};

module.exports = districtController;
