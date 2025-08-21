const roleService = require('../services/roleService');

class RoleController {
  async getAllRoles(req, res) {
    try {
      const result = await roleService.getAllRoles();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRoleById(req, res) {
    try {
      const { id } = req.params;
      const result = await roleService.getRoleById(id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Role not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async createRole(req, res) {
    try {
      const roleData = req.body;
      const result = await roleService.createRole(roleData);
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'Role name already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const roleData = req.body;
      const result = await roleService.updateRole(id, roleData);
      res.json(result);
    } catch (error) {
      if (error.message === 'Role not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Role name already exists') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      const result = await roleService.deleteRole(id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Role not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Cannot delete role')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
}

module.exports = new RoleController();
