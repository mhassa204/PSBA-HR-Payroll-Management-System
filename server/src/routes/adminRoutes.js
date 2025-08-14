const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const HardDeleteUtil = require('../utils/hardDeleteUtil');
const { manualCleanup } = require('../jobs/cleanupJob');
const { isAuthenticated: auth } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all soft-deleted records summary
router.get('/deleted-records', auth, async (req, res) => {
  try {
    const [
      deletedEmployees,
      deletedEmployments,
      deletedDepartments,
      deletedDesignations,
      deletedDocuments
    ] = await Promise.all([
      prisma.employee.count({ where: { is_deleted: true } }),
      prisma.employment.count({ where: { is_deleted: true } }),
      prisma.department.count({ where: { is_deleted: true } }),
      prisma.designation.count({ where: { is_deleted: true } }),
      prisma.employeeDocument.count({ where: { is_deleted: true } })
    ]);

    res.json({
      success: true,
      data: {
        employees: deletedEmployees,
        employments: deletedEmployments,
        departments: deletedDepartments,
        designations: deletedDesignations,
        documents: deletedDocuments
      }
    });
  } catch (error) {
    console.error('Error fetching deleted records summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deleted records summary' });
  }
});

// Get soft-deleted employees with pagination
router.get('/deleted-employees', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      is_deleted: true,
      ...(search && {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { employee_id: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        skip: offset,
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          employee_id: true,
          full_name: true,
          email: true,
          cnic: true,
          status: true,
          updatedAt: true
        }
      }),
      prisma.employee.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching deleted employees:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deleted employees' });
  }
});

// Restore a soft-deleted employee
router.post('/restore-employee/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if employee exists and is soft-deleted
    const employee = await prisma.employee.findFirst({
      where: { id: parseInt(id), is_deleted: true }
    });

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Soft-deleted employee not found' });
    }

    // Restore the employee using the service
    const employeeService = require('../services/employeeService');
    const result = await employeeService.restoreEmployee(id);

    res.json({
      success: true,
      message: result.message,
      data: result.restoredEmployee
    });
  } catch (error) {
    console.error('Error restoring employee:', error);
    res.status(500).json({ success: false, error: 'Failed to restore employee' });
  }
});

// Get soft-deleted departments
router.get('/deleted-departments', auth, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: { is_deleted: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching deleted departments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deleted departments' });
  }
});

// Restore a soft-deleted department
router.post('/restore-department/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if department exists and is soft-deleted
    const department = await prisma.department.findFirst({
      where: { id: parseInt(id), is_deleted: true }
    });

    if (!department) {
      return res.status(404).json({ success: false, error: 'Soft-deleted department not found' });
    }

    // Restore the department using the service
    const departmentService = require('../services/departmentService');
    const result = await departmentService.restoreDepartment(id);

    res.json({
      success: true,
      message: result.message,
      data: result.restoredDepartment
    });
  } catch (error) {
    console.error('Error restoring department:', error);
    res.status(500).json({ success: false, error: 'Failed to restore department' });
  }
});

// Get soft-deleted designations
router.get('/deleted-designations', auth, async (req, res) => {
  try {
    const designations = await prisma.designation.findMany({
      where: { is_deleted: true },
      orderBy: { updatedAt: 'desc' },
      include: {
        department: {
          select: { name: true }
        }
      }
    });

    res.json({
      success: true,
      data: designations
    });
  } catch (error) {
    console.error('Error fetching deleted designations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deleted designations' });
  }
});

// Restore a soft-deleted designation
router.post('/restore-designation/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if designation exists and is soft-deleted
    const designation = await prisma.designation.findFirst({
      where: { id: parseInt(id), is_deleted: true }
    });

    if (!designation) {
      return res.status(404).json({ success: false, error: 'Soft-deleted designation not found' });
    }

    // Restore the designation using the service
    const designationService = require('../services/designationService');
    const result = await designationService.restoreDesignation(id);

    res.json({
      success: true,
      message: result.message,
      data: result.restoredDesignation
    });
  } catch (error) {
    console.error('Error restoring designation:', error);
    res.status(500).json({ success: false, error: 'Failed to restore designation' });
  }
});

// Manual cleanup of soft-deleted records
router.post('/cleanup', auth, async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;
    
    // Validate daysOld parameter
    if (daysOld < 1 || daysOld > 365) {
      return res.status(400).json({ 
        success: false, 
        error: 'daysOld must be between 1 and 365' 
      });
    }

    const result = await manualCleanup(daysOld);

    res.json({
      success: true,
      message: result.message,
      data: result.results
    });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({ success: false, error: 'Failed to perform cleanup' });
  }
});

// Hard delete a specific record (irreversible)
router.delete('/hard-delete/:model/:id', auth, async (req, res) => {
  try {
    const { model, id } = req.params;
    
    // Validate model parameter
    const validModels = ['employee', 'employment', 'department', 'designation'];
    if (!validModels.includes(model)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid model specified' 
      });
    }

    // Check if record exists and is soft-deleted
    const record = await prisma[model].findFirst({
      where: { id: parseInt(id), is_deleted: true }
    });

    if (!record) {
      return res.status(404).json({ 
        success: false, 
        error: `Soft-deleted ${model} not found` 
      });
    }

    let result;
    
    // Use appropriate hard delete method based on model
    switch (model) {
      case 'employee':
        result = await HardDeleteUtil.hardDeleteEmployee(parseInt(id));
        break;
      case 'employment':
        result = await HardDeleteUtil.hardDeleteEmployment(parseInt(id));
        break;
      case 'department':
        result = await HardDeleteUtil.hardDeleteDepartment(parseInt(id));
        break;
      case 'designation':
        result = await HardDeleteUtil.hardDeleteDesignation(parseInt(id));
        break;
      default:
        result = await HardDeleteUtil.hardDeleteRecord(model, parseInt(id));
    }

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.deletedRecord || result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error during hard delete:', error);
    res.status(500).json({ success: false, error: 'Failed to perform hard delete' });
  }
});

module.exports = router;
