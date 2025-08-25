const permissionService = require('../services/permissionService');

class PermissionController {
  async list(req, res) {
    try {
      const data = await permissionService.listAll();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async upsertMany(req, res) {
    try {
      const { keys } = req.body;
      const data = await permissionService.upsertMany(keys);
      res.json(data);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }

  async create(req, res) {
    try {
      const data = await permissionService.create(req.body);
      res.status(201).json(data);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }

  async deleteByKey(req, res) {
    try {
      const { key } = req.params;
      const data = await permissionService.deleteByKey(key);
      res.json(data);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
}

module.exports = new PermissionController();
