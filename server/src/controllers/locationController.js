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

  // PATCH /locations/:id/timing — bazaar operational hours only.
  //
  // Deliberately narrow: Operations needs to keep trading hours correct (they
  // are printed on every duty roster form) without being able to rename,
  // relocate or delete a bazaar. Only these two columns are ever written.
  updateOperationalTiming: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, error: "Invalid location id." });
      }

      // "" clears an override and puts the bazaar back on the default hours
      const clean = (value) => {
        if (value === null || value === undefined || String(value).trim() === "") return null;
        const m = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return undefined; // signals invalid
        const h = Number(m[1]);
        const min = Number(m[2]);
        if (h > 23 || min > 59) return undefined;
        return `${String(h).padStart(2, "0")}:${m[2]}`;
      };

      const opening = clean(req.body?.opening_time);
      const closing = clean(req.body?.closing_time);
      if (opening === undefined || closing === undefined) {
        return res
          .status(400)
          .json({ success: false, error: "Times must be in HH:mm form, or blank to clear." });
      }
      if (opening && closing && opening >= closing) {
        return res
          .status(400)
          .json({ success: false, error: "Opening time must be before closing time." });
      }

      const location = await locationService.updateOperationalTiming(id, {
        opening_time: opening,
        closing_time: closing,
      });
      res.status(200).json({ success: true, location });
    } catch (error) {
      console.error("Error updating operational timing:", error.message);
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
