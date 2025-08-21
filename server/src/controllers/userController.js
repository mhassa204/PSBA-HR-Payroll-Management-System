const userService = require('../services/userService');

class UserController {
  async getAllUsers(req, res) {
    try {
      const result = await userService.getAllUsers();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const result = await userService.getUserById(id);
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
      const userData = req.body;
      const result = await userService.createUser(userData);
      res.status(201).json(result);
    } catch (error) {
      if (error.message === 'Email already exists' || error.message === 'Employee is already assigned to another user') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const userData = req.body;
      const result = await userService.updateUser(id, userData);
      res.json(result);
    } catch (error) {
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Email already exists' || error.message === 'Employee is already assigned to another user') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
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
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
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
}

module.exports = new UserController();
