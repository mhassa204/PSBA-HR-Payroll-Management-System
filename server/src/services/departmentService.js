const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const departmentService = {
  // Create new department
  createDepartment: async (data) => {
    const { name, code, description } = data;

    // Check if department with same name or code already exists
    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [
          { name },
          { code: code || undefined }
        ]
      }
    });

    if (existingDepartment) {
      throw new Error("Department with this name or code already exists");
    }

    return prisma.department.create({
      data: {
        name,
        code,
        description
      },
      include: {
        designations: true,
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
      include: {
        designations: {
          orderBy: { level: 'asc' }
        },
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
    return prisma.department.findUnique({
      where: { id: parseInt(id) },
      include: {
        designations: {
          orderBy: { level: 'asc' }
        },
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
    const { name, code, description } = data;

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
            }
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

    return prisma.department.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        designations: {
          orderBy: { level: 'asc' }
        },
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
    // Check if department has any employment records
    const employmentCount = await prisma.employment.count({
      where: { department_id: parseInt(id) }
    });

    if (employmentCount > 0) {
      throw new Error("Cannot delete department with existing employment records");
    }

    // Check if department has designations
    const designationCount = await prisma.designation.count({
      where: { department_id: parseInt(id) }
    });

    if (designationCount > 0) {
      throw new Error("Cannot delete department with existing designations. Delete designations first.");
    }

    return prisma.department.delete({
      where: { id: parseInt(id) }
    });
  },

  // Get department statistics
  getDepartmentStatistics: async () => {
    const departments = await prisma.department.findMany({
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
