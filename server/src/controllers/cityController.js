const cityService = require("../services/cityService");

const cityController = {
  createCity: async (req, res) => {
    try {
      const { name, district_id } = req.body;
      if (!name || !district_id) return res.status(400).json({ success: false, error: "Missing required fields: name, district_id" });
      const city = await cityService.createCity(req.body);
      return res.status(201).json({ success: true, city });
    } catch (error) {
      console.error("Error creating city:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  getAllCities: async (req, res) => {
    try {
      const { district_id } = req.query;
      const cities = await cityService.getAllCities({ district_id });
      return res.status(200).json({ success: true, cities });
    } catch (error) {
      console.error("Error fetching cities:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  getCityById: async (req, res) => {
    try {
      const city = await cityService.getCityById(req.params.id);
      if (!city) return res.status(404).json({ success: false, error: "City not found" });
      return res.status(200).json({ success: true, city });
    } catch (error) {
      console.error("Error fetching city:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  updateCity: async (req, res) => {
    try {
      const city = await cityService.updateCity(req.params.id, req.body);
      return res.status(200).json({ success: true, city });
    } catch (error) {
      console.error("Error updating city:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  deleteCity: async (req, res) => {
    try {
      await cityService.deleteCity(req.params.id);
      return res.status(200).json({ success: true, message: "City deleted successfully" });
    } catch (error) {
      console.error("Error deleting city:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  },
};

module.exports = cityController;
