const { PrismaClient } = require("@prisma/client");
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
    // Check if scale grade is being used in employment records
    const employmentCount = await prisma.Employment.count({
      where: {
        scale_grade_id: parseInt(id),
        is_deleted: false
      }
    });

    if (employmentCount > 0) {
      throw new Error(`Cannot delete scale grade. It is being used by ${employmentCount} employment record(s).`);
    }

    return prisma.ScaleGrade.update({
      where: { id: parseInt(id) },
      data: { is_deleted: true }
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
