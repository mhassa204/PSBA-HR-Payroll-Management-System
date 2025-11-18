const { PrismaClient } = require("@prisma/client");
const { maskUniqueFieldsForSoftDelete, restoreUniqueFieldsForUndelete } = require("../utils/softDeleteUtil");
const { validateSoftDelete } = require("../utils/softDeleteValidation");
const prisma = new PrismaClient();

const scaleGradeService = {
  // Create new scale grade
  createScaleGrade: async (data) => {
    const { name, description, level, category, is_active } = data;

    // Check if scale grade with same name already exists
    const existingScaleGrade = await prisma.ScaleGrade.findFirst({
      where: {
        name,
        is_deleted: false
      }
    });

    if (existingScaleGrade) {
      throw new Error("Scale grade with this name already exists");
    }

    return prisma.ScaleGrade.create({
      data: {
        name,
        description,
        level: level ? parseInt(level) : null,
        category,
        is_active: is_active !== undefined ? is_active : true
      },
      include: {
        _count: {
          select: {
            employmentRecords: true
          }
        }
      }
    });
  },

  // Get all scale grades
  getAllScaleGrades: async () => {
    return prisma.ScaleGrade.findMany({
      where: { is_deleted: false },
      include: {
        _count: {
          select: {
            employmentRecords: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { level: 'asc' },
        { name: 'asc' }
      ]
    });
  },

  // Get scale grade by ID
  getScaleGradeById: async (id) => {
    return prisma.ScaleGrade.findFirst({
      where: { 
        id: parseInt(id),
        is_deleted: false
      },
      include: {
        _count: {
          select: {
            employmentRecords: true
          }
        }
      }
    });
  },

  // Update scale grade
  updateScaleGrade: async (id, data) => {
    const { name, description, level, category, is_active } = data;

    // Check if scale grade with same name already exists (excluding current one)
    if (name) {
      const existingScaleGrade = await prisma.ScaleGrade.findFirst({
        where: {
          name,
          id: { not: parseInt(id) },
          is_deleted: false
        }
      });

      if (existingScaleGrade) {
        throw new Error("Scale grade with this name already exists");
      }
    }

    return prisma.ScaleGrade.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        level: level ? parseInt(level) : null,
        category,
        is_active
      },
      include: {
        _count: {
          select: {
            employmentRecords: true
          }
        }
      }
    });
  },

  // Delete scale grade (soft delete)
  deleteScaleGrade: async (id) => {
    const scaleGrade = await prisma.ScaleGrade.findUnique({
      where: { id: parseInt(id) },
    });

    if (!scaleGrade) {
      throw new Error("Scale grade not found");
    }

    // Check for active child records
    const validation = await validateSoftDelete('ScaleGrade', parseInt(id));
    if (!validation.canDelete) {
      throw new Error(validation.message);
    }

    // Mask unique fields to prevent unique constraint violations
    const { masked } = maskUniqueFieldsForSoftDelete('ScaleGrade', scaleGrade);

    return prisma.ScaleGrade.update({
      where: { id: parseInt(id) },
      data: { 
        is_deleted: true,
        ...masked, // Apply masked unique fields
      }
    });
  },

  // Restore scale grade
  restoreScaleGrade: async (id) => {
    const scaleGrade = await prisma.ScaleGrade.findUnique({
      where: { id: parseInt(id) },
    });

    if (!scaleGrade) {
      throw new Error("Scale grade not found");
    }

    if (!scaleGrade.is_deleted) {
      throw new Error("Scale grade is not soft-deleted");
    }

    // Restore unique fields to their original values
    const restored = restoreUniqueFieldsForUndelete('ScaleGrade', scaleGrade);

    return prisma.ScaleGrade.update({
      where: { id: parseInt(id) },
      data: { 
        is_deleted: false,
        ...restored, // Restore original unique field values
      }
    });
  },

  // Get scale grade statistics
  getScaleGradeStatistics: async () => {
    const totalScaleGrades = await prisma.ScaleGrade.count({
      where: { is_deleted: false }
    });

    const activeScaleGrades = await prisma.ScaleGrade.count({
      where: { 
        is_deleted: false,
        is_active: true
      }
    });

    const scaleGradesByCategory = await prisma.ScaleGrade.groupBy({
      by: ['category'],
      where: { is_deleted: false },
      _count: {
        id: true
      }
    });

    return {
      total: totalScaleGrades,
      active: activeScaleGrades,
      inactive: totalScaleGrades - activeScaleGrades,
      byCategory: scaleGradesByCategory
    };
  }
};

module.exports = scaleGradeService;
