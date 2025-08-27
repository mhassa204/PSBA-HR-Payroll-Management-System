const locationService = require("../services/locationService");

const locationController = {
  createLocation: async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Missing required field: name' });
      const location = await locationService.createLocation(req.body);
      res.status(201).json({ success: true, location });
    } catch (error) {
      console.error('Error creating location:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  getAllLocations: async (req, res) => {
    try {
      const locations = await locationService.getAllLocations();
      res.status(200).json({ success: true, locations });
    } catch (error) {
      console.error('Error fetching locations:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  getLocationById: async (req, res) => {
    try {
      const location = await locationService.getLocationById(req.params.id);
      if (!location) return res.status(404).json({ success: false, error: 'Location not found' });
      res.status(200).json({ success: true, location });
    } catch (error) {
      console.error('Error fetching location:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  updateLocation: async (req, res) => {
    try {
      const location = await locationService.updateLocation(req.params.id, req.body);
      res.status(200).json({ success: true, location });
    } catch (error) {
      console.error('Error updating location:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  deleteLocation: async (req, res) => {
    try {
      await locationService.deleteLocation(req.params.id);
      res.status(200).json({ success: true, message: 'Location deleted successfully' });
    } catch (error) {
      console.error('Error deleting location:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  getLocationStatistics: async (req, res) => {
    try {
      const statistics = await locationService.getLocationStatistics();
      res.status(200).json({ success: true, statistics });
    } catch (error) {
      console.error('Error fetching location statistics:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  getBazaars: async (req, res) => {
    try {
      const bazaars = await locationService.getBazaars();
      res.status(200).json({ success: true, bazaars });
    } catch (error) {
      console.error('Error fetching bazaars:', error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = locationController;
