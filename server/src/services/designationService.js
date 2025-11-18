const { PrismaClient } = require("@prisma/client");
const { maskUniqueFieldsForSoftDelete, restoreUniqueFieldsForUndelete } = require("../utils/softDeleteUtil");
const { validateSoftDelete } = require("../utils/softDeleteValidation");
const prisma = new PrismaClient();

const designationService = {
  // Create new designation
  createDesignation: async (data) => {
    const { title, department_id, level } = data;

    // Validate department exists if provided
    if (department_id) {
      const department = await prisma.department.findFirst({
        where: { 
          id: parseInt(department_id),
          is_deleted: false
        }
      });
      if (!department) {
        throw new Error("Invalid department_id");
      }
    }

    // Check if designation with same title already exists in the department
    const existingDesignation = await prisma.designation.findFirst({
      where: {
        title,
        department_id: department_id ? parseInt(department_id) : null,
        is_deleted: false
      }
    });

    if (existingDesignation) {
      throw new Error("Designation with this title already exists in the department");
    }

    return prisma.designation.create({
      data: {
        title,
        department_id: department_id ? parseInt(department_id) : null,
        level: level ? parseInt(level) : null
      },
      include: {
        department: true,
        _count: {
          select: {
            employmentRecords: true
          }
        }
      }
    });
  },

  // Get all designations
  getAllDesignations: async (departmentId = null) => {
    const where = { is_deleted: false };
    if (departmentId) {
      where.department_id = parseInt(departmentId);
    }

    return prisma.designation.findMany({
      where,
      include: {
        department: true,
        _count: {
          select: {
            employmentRecords: true
          }
        }
      },
      orderBy: [
        { department_id: 'asc' },
        { level: 'asc' },
        { title: 'asc' }
      ]
    });
  },

  // Get designation by ID
  getDesignationById: async (id) => {
    return prisma.designation.findFirst({
      where: { 
        id: parseInt(id),
        is_deleted: false
      },
      include: {
        department: true,
        _count: {
          select: {
            employmentRecords: true
          }
        }
      }
    });
  },

  // Get designations by department
  getDesignationsByDepartment: async (departmentId) => {
    return prisma.designation.findMany({
      where: { 
        department_id: parseInt(departmentId),
        is_deleted: false
      },
      include: {
        department: true,
        _count: {
          select: {
            employmentRecords: true
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { title: 'asc' }
      ]
    });
  },

  // Update designation
  updateDesignation: async (id, data) => {
    const { title, department_id, level } = data;

    // Validate department exists if provided
    if (department_id) {
      const department = await prisma.department.findFirst({
        where: { 
          id: parseInt(department_id),
          is_deleted: false
        }
      });
      if (!department) {
        throw new Error("Invalid department_id");
      }
    }

    // Check if another designation with same title exists in the department
    if (title || department_id) {
      const currentDesignation = await prisma.designation.findFirst({
        where: { 
          id: parseInt(id),
          is_deleted: false
        }
      });

      const checkTitle = title || currentDesignation.title;
      const checkDepartmentId = department_id !== undefined ? 
        (department_id ? parseInt(department_id) : null) : 
        currentDesignation.department_id;

      const existingDesignation = await prisma.designation.findFirst({
        where: {
          AND: [
            { id: { not: parseInt(id) } },
            { title: checkTitle },
            { department_id: checkDepartmentId },
            { is_deleted: false }
          ]
        }
      });

      if (existingDesignation) {
        throw new Error("Another designation with this title already exists in the department");
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (department_id !== undefined) updateData.department_id = department_id ? parseInt(department_id) : null;
    if (level !== undefined) updateData.level = level ? parseInt(level) : null;

    return prisma.designation.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        department: true,
        _count: {
          select: {
            employmentRecords: true
          }
        }
      }
    });
  },

  // Delete designation
  deleteDesignation: async (id) => {
    return await prisma.$transaction(async (tx) => {
      // Get designation data first
      const designation = await tx.designation.findUnique({
        where: { id: parseInt(id) },
      });

      if (!designation) {
        throw new Error("Designation not found");
      }

      // Check for active child records (using regular prisma client for validation)
      const validation = await validateSoftDelete('Designation', parseInt(id));
      if (!validation.canDelete) {
        throw new Error(validation.message);
      }

      // Mask unique fields (title is part of composite unique constraint)
      const { masked } = maskUniqueFieldsForSoftDelete('Designation', designation);
      
      // Soft delete the designation and all related records
      
      // 1. Soft delete employment records with this designation
      await tx.employment.updateMany({
        where: { designation_id: parseInt(id) },
        data: { is_deleted: true }
      });

      // 2. Finally soft delete the designation
      const deletedDesignation = await tx.designation.update({
        where: { id: parseInt(id) },
        data: { 
          is_deleted: true,
          ...masked, // Apply masked unique fields
        }
      });

      return {
        success: true,
        message: `Designation ${deletedDesignation.title} and all related records soft deleted successfully`,
        deletedDesignation
      };
    });
  },

  // Restore a soft-deleted designation
  restoreDesignation: async (id) => {
    return await prisma.$transaction(async (tx) => {
      // Get designation data first
      const designation = await tx.designation.findUnique({
        where: { id: parseInt(id) },
      });

      if (!designation) {
        throw new Error("Designation not found");
      }

      if (!designation.is_deleted) {
        throw new Error("Designation is not soft-deleted");
      }

      // Restore unique fields (title is part of composite unique constraint)
      const restored = restoreUniqueFieldsForUndelete('Designation', designation);
      
      // Restore the designation and all related records
      
      // 1. Restore the designation
      const restoredDesignation = await tx.designation.update({
        where: { id: parseInt(id) },
        data: { 
          is_deleted: false,
          ...restored, // Restore original unique field values
        }
      });

      // 2. Restore employment records with this designation
      await tx.employment.updateMany({
        where: { designation_id: parseInt(id) },
        data: { is_deleted: false }
      });

      return {
        success: true,
        message: `Designation ${restoredDesignation.title} and all related records restored successfully`,
        restoredDesignation
      };
    });
  },

  // Get designation statistics
  getDesignationStatistics: async () => {
    const designations = await prisma.designation.findMany({
      where: { is_deleted: false },
      include: {
        department: true,
        _count: {
          select: {
            employmentRecords: true
          }
        }
      }
    });

    const byDepartment = designations.reduce((acc, designation) => {
      const deptName = designation.department?.name || 'No Department';
      if (!acc[deptName]) {
        acc[deptName] = 0;
      }
      acc[deptName]++;
      return acc;
    }, {});

    return {
      total_designations: designations.length,
      by_department: byDepartment,
      designations: designations.map(des => ({
        id: des.id,
        title: des.title,
        department: des.department?.name || 'No Department',
        level: des.level,
        employment_count: des._count.employmentRecords
      }))
    };
  }
};

module.exports = designationService;
