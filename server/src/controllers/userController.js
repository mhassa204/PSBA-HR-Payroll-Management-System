const userService = require('../services/userService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserController {
  async getAllUsers(req, res) {
    try {
      const result = await userService.getAllUsers();
      const isSuper = req.session?.user?.role?.name === 'Super Admin';
      const users = isSuper ? result.users : (result.users || []).filter(u => u.role?.name !== 'Super Admin');
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const result = await userService.getUserById(id);
      const isSuper = req.session?.user?.role?.name === 'Super Admin';
      if (!isSuper && result.user?.role?.name === 'Super Admin') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(result);
    } catch (error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async createUser(req, res) {
    try {
      const isSuper = req.session?.user?.role?.name === 'Super Admin';
      const { role_id } = req.body || {};

      // Block assigning Super Admin role by non-super users
      if (!isSuper && role_id) {
        const role = await prisma.role.findUnique({ where: { id: parseInt(role_id) } });
        if (role?.name === 'Super Admin') {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      const userData = req.body;
      const result = await userService.createUser(userData);
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'Email already exists' || error.message === 'Employee is already assigned to another user' || error.message === 'Department not found' || error.message === 'Invalid department') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const isSuper = req.session?.user?.role?.name === 'Super Admin';

      // Fetch target user to enforce Super Admin protection
      const target = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: { role: { select: { name: true } } }
      });
      if (!target || target.is_deleted) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (!isSuper && target.role?.name === 'Super Admin') {
        // Hide existence
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent promoting to Super Admin by non-super
      const { role_id } = req.body || {};
      if (!isSuper && role_id) {
        const role = await prisma.role.findUnique({ where: { id: parseInt(role_id) } });
        if (role?.name === 'Super Admin') {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      const userData = req.body;
      const result = await userService.updateUser(id, userData);
      res.json(result);
    } catch (error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Email already exists' || error.message === 'Employee is already assigned to another user' || error.message === 'Department not found' || error.message === 'Invalid department') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const isSuper = req.session?.user?.role?.name === 'Super Admin';

      // Fetch target user to enforce Super Admin protection
      const target = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: { role: { select: { name: true } } }
      });
      if (!target || target.is_deleted) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (!isSuper && target.role?.name === 'Super Admin') {
        return res.status(404).json({ error: 'User not found' });
      }

      const result = await userService.deleteUser(id);
      res.json(result);
    } catch (error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getAvailableEmployees(req, res) {
    try {
      const result = await userService.getAvailableEmployees();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async debugEmployees(req, res) {
    try {
      // Get all employees
      const allEmployees = await prisma.employee.findMany({
        where: { is_deleted: false },
        select: { id: true, full_name: true, employee_id: true, cnic: true }
      });
      
      // Get all users with employee assignments
      const usersWithEmployees = await prisma.user.findMany({
        where: { is_deleted: false, employee_id: { not: null } },
        select: { id: true, email: true, employee_id: true }
      });
      
      // Get employees with user relations
      const employeesWithUsers = await prisma.employee.findMany({
        where: { is_deleted: false },
        include: { user: { select: { id: true, email: true } } }
      });
      
      await prisma.$disconnect();
      
      res.json({
        totalEmployees: allEmployees.length,
        allEmployees,
        usersWithEmployees,
        employeesWithUsers: employeesWithUsers.map(emp => ({
          id: emp.id,
          full_name: emp.full_name,
          employee_id: emp.employee_id,
          cnic: emp.cnic,
          hasUser: !!emp.user
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getFormOptions(req, res) {
    try {
      const isSuper = req.session?.user?.role?.name === 'Super Admin';

      // Roles: enabled, non-deleted; exclude Super Admin for non-super
      const roles = await prisma.role.findMany({
        where: {
          is_deleted: false,
          enabled: true,
          ...(isSuper ? {} : { name: { not: 'Super Admin' } })
        },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' }
      });

      // Available employees (no assigned user)
      const availableEmployees = await prisma.employee.findMany({
        where: { is_deleted: false, user: null },
        select: { id: true, full_name: true, employee_id: true, email: true, cnic: true },
        orderBy: { full_name: 'asc' }
      });

      // New: departments dropdown options
      const departments = await prisma.department.findMany({
        where: { is_deleted: false },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      });

      res.json({ roles, employees: availableEmployees, departments });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
