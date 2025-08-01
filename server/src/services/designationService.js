const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const designationService = {
  // Create new designation
  createDesignation: async (data) => {
    const { title, department_id, level } = data;

    // Validate department exists if provided
    if (department_id) {
      const department = await prisma.department.findUnique({
        where: { id: parseInt(department_id) }
      });
      if (!department) {
        throw new Error("Invalid department_id");
      }
    }

    // Check if designation with same title already exists in the department
    const existingDesignation = await prisma.designation.findFirst({
      where: {
        title,
        department_id: department_id ? parseInt(department_id) : null
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
    const where = {};
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
    return prisma.designation.findUnique({
      where: { id: parseInt(id) },
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
      where: { department_id: parseInt(departmentId) },
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
      const department = await prisma.department.findUnique({
        where: { id: parseInt(department_id) }
      });
      if (!department) {
        throw new Error("Invalid department_id");
      }
    }

    // Check if another designation with same title exists in the department
    if (title || department_id) {
      const currentDesignation = await prisma.designation.findUnique({
        where: { id: parseInt(id) }
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
            { department_id: checkDepartmentId }
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
    // Check if designation has any employment records
    const employmentCount = await prisma.employment.count({
      where: { designation_id: parseInt(id) }
    });

    if (employmentCount > 0) {
      throw new Error("Cannot delete designation with existing employment records");
    }

    return prisma.designation.delete({
      where: { id: parseInt(id) }
    });
  },

  // Get designation statistics
  getDesignationStatistics: async () => {
    const designations = await prisma.designation.findMany({
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
