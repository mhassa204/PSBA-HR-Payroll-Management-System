const roleService = require('../services/roleService');

class RoleController {
  async getAllRoles(req, res) {
    try {
      const result = await roleService.getAllRoles();
      const isSuper = req.session?.user?.role?.name === 'Super Admin';
      const roles = isSuper ? result.roles : (result.roles || []).filter(r => r.name !== 'Super Admin');
      res.json({ roles });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRoleById(req, res) {
    try {
      const { id } = req.params;
      const result = await roleService.getRoleById(id);
      const isSuper = req.session?.user?.role?.name === 'Super Admin';
      if (!isSuper && result.role?.name === 'Super Admin') {
        return res.status(404).json({ error: 'Role not found' });
      }
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
