const { PrismaClient } = require("@prisma/client");
const { maskUniqueFieldsForSoftDelete, restoreUniqueFieldsForUndelete } = require("../utils/softDeleteUtil");
const { validateSoftDelete } = require("../utils/softDeleteValidation");
const prisma = new PrismaClient();

const departmentService = {
  // Create new department
  createDepartment: async (data) => {
    const { name, code, description, head_employee_id } = data;

    // Check if department with same name or code already exists
    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [
          { name },
          { code: code || undefined }
        ],
        is_deleted: false
      }
    });

    if (existingDepartment) {
      throw new Error("Department with this name or code already exists");
    }

    return prisma.department.create({
      data: {
        name,
        code,
        description,
        head_employee_id: head_employee_id ? Number(head_employee_id) : null
      },
      include: {
        designations: true,
        head: { select: { id: true, full_name: true } },
        _count: {
          select: {
            designations: true,
            employmentRecords: true
          }
        }
      }
    });
  },

  // Get all departments
  getAllDepartments: async () => {
    return prisma.department.findMany({
      where: { is_deleted: false },
      include: {
        designations: {
          orderBy: { level: 'asc' }
        },
        head: { select: { id: true, full_name: true } },
        _count: {
          select: {
            designations: true,
            employmentRecords: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  },

  // Get department by ID
  getDepartmentById: async (id) => {
    return prisma.department.findFirst({
      where: { 
        id: parseInt(id),
        is_deleted: false
      },
      include: {
        designations: {
          orderBy: { level: 'asc' }
        },
        head: { select: { id: true, full_name: true } },
        _count: {
          select: {
            designations: true,
            employmentRecords: true
          }
        }
      }
    });
  },

  // Update department
  updateDepartment: async (id, data) => {
    const { name, code, description, head_employee_id } = data;

    // Check if another department with same name or code exists
    if (name || code) {
      const existingDepartment = await prisma.department.findFirst({
        where: {
          AND: [
            { id: { not: parseInt(id) } },
            {
              OR: [
                { name },
                { code: code || undefined }
              ]
            },
            { is_deleted: false }
          ]
        }
      });

      if (existingDepartment) {
        throw new Error("Another department with this name or code already exists");
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (head_employee_id !== undefined) updateData.head_employee_id = head_employee_id ? Number(head_employee_id) : null;

    return prisma.department.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        designations: {
          orderBy: { level: 'asc' }
        },
        head: { select: { id: true, full_name: true } },
        _count: {
          select: {
            designations: true,
            employmentRecords: true
          }
        }
      }
    });
  },

  // Delete department
  deleteDepartment: async (id) => {
    return await prisma.$transaction(async (tx) => {
      // Get department data first
      const department = await tx.department.findUnique({
        where: { id: parseInt(id) },
      });

      if (!department) {
        throw new Error("Department not found");
      }

      // Check for active child records (using regular prisma client for validation)
      const validation = await validateSoftDelete('Department', parseInt(id));
      if (!validation.canDelete) {
        throw new Error(validation.message);
      }

      // Mask unique fields (Department has no unique constraints, but keeping for consistency)
      const { masked } = maskUniqueFieldsForSoftDelete('Department', department);
      
      // Soft delete the department and all related records
      
      // 1. Soft delete designations in this department
      await tx.designation.updateMany({
        where: { department_id: parseInt(id) },
        data: { is_deleted: true }
      });

      // 2. Soft delete employment records in this department
      await tx.employment.updateMany({
        where: { department_id: parseInt(id) },
        data: { is_deleted: true }
      });

      // 3. Finally soft delete the department
      const deletedDepartment = await tx.department.update({
        where: { id: parseInt(id) },
        data: { 
          is_deleted: true,
          ...masked, // Apply masked unique fields (if any)
        }
      });

      return {
        success: true,
        message: `Department ${deletedDepartment.name} and all related records soft deleted successfully`,
        deletedDepartment
      };
    });
  },

  // Restore a soft-deleted department
  restoreDepartment: async (id) => {
    return await prisma.$transaction(async (tx) => {
      // Get department data first
      const department = await tx.department.findUnique({
        where: { id: parseInt(id) },
      });

      if (!department) {
        throw new Error("Department not found");
      }

      if (!department.is_deleted) {
        throw new Error("Department is not soft-deleted");
      }

      // Restore unique fields (Department has no unique constraints, but keeping for consistency)
      const restored = restoreUniqueFieldsForUndelete('Department', department);
      
      // Restore the department and all related records
      
      // 1. Restore the department
      const restoredDepartment = await tx.department.update({
        where: { id: parseInt(id) },
        data: { 
          is_deleted: false,
          ...restored, // Restore original unique field values (if any)
        }
      });

      // 2. Restore designations in this department
      await tx.designation.updateMany({
        where: { department_id: parseInt(id) },
        data: { is_deleted: false }
      });

      // 3. Restore employment records in this department
      await tx.employment.updateMany({
        where: { department_id: parseInt(id) },
        data: { is_deleted: false }
      });

      return {
        success: true,
        message: `Department ${restoredDepartment.name} and all related records restored successfully`,
        restoredDepartment
      };
    });
  },

  // Get department statistics
  getDepartmentStatistics: async () => {
    const departments = await prisma.department.findMany({
      where: { is_deleted: false },
      include: {
        _count: {
          select: {
            designations: true,
            employmentRecords: true
          }
        }
      }
    });

    return {
      total_departments: departments.length,
      departments: departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        designation_count: dept._count.designations,
        employment_count: dept._count.employmentRecords
      }))
    };
  }
};

module.exports = departmentService;
