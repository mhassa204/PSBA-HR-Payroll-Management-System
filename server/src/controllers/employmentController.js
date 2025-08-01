// src/controllers/employmentController.js
const employmentService = require("../services/employmentService");

const employmentController = {
  // Create new employment record
  createEmployment: async (req, res) => {
    try {
      const {
        employee_id,
        organization,
        department_id,
        designation_id,
        effective_from
      } = req.body;

      // Basic required field validation
      const missingFields = [];
      if (!employee_id) missingFields.push("employee_id");
      if (!organization) missingFields.push("organization");
      // effective_from is optional for employment records

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      const employment = await employmentService.createEmployment(req.body);
      res.status(201).json({ success: true, employment });
    } catch (error) {
      console.error("Error creating employment:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get all employment records with pagination and filters
  getAllEmployments: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {
        employee_id: req.query.employee_id,
        organization: req.query.organization,
        department_id: req.query.department_id,
        is_current: req.query.is_current
      };

      const result = await employmentService.getAllEmployments(page, limit, filters);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Error fetching employments:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get employment record by ID
  getEmploymentById: async (req, res) => {
    try {
      const employment = await employmentService.getEmploymentById(req.params.id);
      if (!employment) {
        return res.status(404).json({
          success: false,
          error: "Employment record not found"
        });
      }
      res.status(200).json({ success: true, employment });
    } catch (error) {
      console.error("Error fetching employment:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get employment records by employee ID
  getEmploymentsByEmployeeId: async (req, res) => {
    try {
      const employments = await employmentService.getEmploymentsByEmployeeId(req.params.employeeId);
      res.status(200).json({ success: true, employments });
    } catch (error) {
      console.error("Error fetching employee employments:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Update employment record
  updateEmployment: async (req, res) => {
    try {
      const employment = await employmentService.updateEmployment(req.params.id, req.body);
      res.status(200).json({ success: true, employment });
    } catch (error) {
      console.error("Error updating employment:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Delete employment record
  deleteEmployment: async (req, res) => {
    try {
      const employment = await employmentService.deleteEmployment(req.params.id);
      res.status(200).json({
        success: true,
        message: "Employment record deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting employment:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get employment statistics
  getEmploymentStatistics: async (req, res) => {
    try {
      const statistics = await employmentService.getEmploymentStatistics();
      res.status(200).json({ success: true, statistics });
    } catch (error) {
      console.error("Error fetching employment statistics:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get form options (departments, designations, etc.)
  getFormOptions: async (req, res) => {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      const [departments, designations] = await Promise.all([
        prisma.department.findMany({
          orderBy: { name: 'asc' }
        }),
        prisma.designation.findMany({
          include: { department: true },
          orderBy: { title: 'asc' }
        })
      ]);

      const organizations = [
        { id: 1, code: "MBWO", name: "Model Bazaar Welfare Organization" },
        { id: 2, code: "PMBMC", name: "Punjab Model Bazaars Management Company" },
        { id: 3, code: "PSBA", name: "Punjab Sahulat Bazaars Authority" }
      ];

      const employmentTypes = [
        { id: 1, type: "Regular", description: "Permanent employment" },
        { id: 2, type: "Contract", description: "Fixed-term contract" },
        { id: 3, type: "Probation", description: "Probationary period" },
        { id: 4, type: "Internship", description: "Training position" }
      ];

      res.status(200).json({
        success: true,
        options: {
          departments: departments.map(dept => ({
            value: dept.id,
            label: dept.name,
            code: dept.code
          })),
          designations: designations.map(des => ({
            value: des.id,
            label: des.title,
            department_id: des.department_id,
            level: des.level
          })),
          organizations: organizations.map(org => ({
            value: org.code,
            label: org.name
          })),
          employmentTypes: employmentTypes.map(type => ({
            value: type.type,
            label: type.type,
            description: type.description
          }))
        }
      });
    } catch (error) {
      console.error("Error fetching form options:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  // Get designations by department
  getDesignationsByDepartment: async (req, res) => {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      const departmentId = parseInt(req.params.departmentId);
      const designations = await prisma.designation.findMany({
        where: { department_id: departmentId },
        orderBy: { level: 'asc' }
      });

      res.status(200).json({
        success: true,
        designations: designations.map(des => ({
          value: des.id,
          label: des.title,
          id: des.id,
          level: des.level,
          department_id: des.department_id
        }))
      });
    } catch (error) {
      console.error("Error fetching designations:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  }
};

module.exports = employmentController;
