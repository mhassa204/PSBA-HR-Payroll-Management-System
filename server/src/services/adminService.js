const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const HardDeleteUtil = require('../utils/hardDeleteUtil');
const { manualCleanup } = require('../jobs/cleanupJob');
const employeeService = require('./employeeService');
const departmentService = require('./departmentService');
const designationService = require('./designationService');

module.exports = {
  getDeletedSummary: async () => {
    const [employees, employments, departments, designations, documents] = await Promise.all([
      prisma.employee.count({ where: { is_deleted: true } }),
      prisma.employment.count({ where: { is_deleted: true } }),
      prisma.department.count({ where: { is_deleted: true } }),
      prisma.designation.count({ where: { is_deleted: true } }),
      prisma.employeeDocument.count({ where: { is_deleted: true } })
    ]);
    return { employees, employments, departments, designations, documents };
  },
  getDeletedEmployees: async ({ page = 1, limit = 10, search = '' }) => {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      is_deleted: true,
      ...(search && { OR: [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ] })
    };
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: offset,
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' },
        select: { id: true, full_name: true, email: true, cnic: true, status: true, updatedAt: true }
      }),
      prisma.employee.count({ where })
    ]);
    return { employees, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  },
  ensureSoftDeleted: async (model, id) => {
    const record = await prisma[model].findFirst({ where: { id: parseInt(id), is_deleted: true } });
    return record;
  },
  getDeletedDepartments: () => prisma.department.findMany({ where: { is_deleted: true }, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, code: true, updatedAt: true } }),
  getDeletedDesignations: () => prisma.designation.findMany({ where: { is_deleted: true }, orderBy: { updatedAt: 'desc' }, include: { department: { select: { name: true } } } }),
  restoreEmployee: (id) => employeeService.restoreEmployee(id),
  restoreDepartment: (id) => departmentService.restoreDepartment(id),
  restoreDesignation: (id) => designationService.restoreDesignation(id),
  manualCleanup: (daysOld) => manualCleanup(daysOld),
  hardDelete: async (model, id) => {
    switch(model) {
      case 'employee': return HardDeleteUtil.hardDeleteEmployee(parseInt(id));
      case 'employment': return HardDeleteUtil.hardDeleteEmployment(parseInt(id));
      case 'department': return HardDeleteUtil.hardDeleteDepartment(parseInt(id));
      case 'designation': return HardDeleteUtil.hardDeleteDesignation(parseInt(id));
      default: return HardDeleteUtil.hardDeleteRecord(model, parseInt(id));
    }
  }
};
