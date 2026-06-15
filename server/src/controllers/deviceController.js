const deviceService = require("../services/deviceService");

const deviceController = {
  create: async (req, res) => {
    try {
      const { ip_address, port_number } = req.body;
      if (!ip_address || !port_number) return res.status(400).json({ success: false, error: 'ip_address and port_number are required' });
      const device = await deviceService.createDevice(req.body);
      res.status(201).json({ success: true, device });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  list: async (req, res) => {
    try {
      const devices = await deviceService.getAllDevices();
      res.json({ success: true, devices });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  getById: async (req, res) => {
    try {
      const device = await deviceService.getDeviceById(req.params.id);
      if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
      res.json({ success: true, device });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  update: async (req, res) => {
    try {
      const device = await deviceService.updateDevice(req.params.id, req.body);
      res.json({ success: true, device });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
  remove: async (req, res) => {
    try {
      await deviceService.deleteDevice(req.params.id);
      res.json({ success: true, message: 'Device deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = deviceController;
