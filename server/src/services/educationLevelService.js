const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const educationLevelService = {
  // Create new education level
  createEducationLevel: async (data) => {
    const { name, order, is_active = true } = data;

    const existing = await prisma.educationLevel.findFirst({
      where: { name: name?.trim(), is_deleted: false },
    });
    if (existing) throw new Error("Education level with this name already exists");

    const createData = {
      name: name?.trim(),
      is_active,
    };
    if (order !== undefined) {
      const parsed = parseInt(order);
      createData.order = Number.isFinite(parsed) ? parsed : null;
    }

    return prisma.educationLevel.create({
      data: createData,
      include: {
        _count: { select: { qualifications: true } },
      },
    });
  },

  // Get all education levels
  getAllEducationLevels: async () => {
    return prisma.educationLevel.findMany({
      where: { is_deleted: false },
      include: { _count: { select: { qualifications: true } } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
  },

  // Get by ID
  getEducationLevelById: async (id) => {
    return prisma.educationLevel.findFirst({
      where: { id: parseInt(id), is_deleted: false },
      include: { _count: { select: { qualifications: true } } },
    });
  },

  // Update
  updateEducationLevel: async (id, data) => {
    const { name, order, is_active } = data;

    if (name) {
      const existing = await prisma.educationLevel.findFirst({
        where: { id: { not: parseInt(id) }, name: name.trim(), is_deleted: false },
      });
      if (existing) throw new Error("Another education level with this name already exists");
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (order !== undefined) {
      const parsed = parseInt(order);
      updateData.order = order !== null ? (Number.isFinite(parsed) ? parsed : null) : null;
    }
    if (is_active !== undefined) updateData.is_active = !!is_active;

    return prisma.educationLevel.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { _count: { select: { qualifications: true } } },
    });
  },

  // Delete (soft)
  deleteEducationLevel: async (id) => {
    return prisma.educationLevel.update({ where: { id: parseInt(id) }, data: { is_deleted: true } });
  },
};

module.exports = educationLevelService;
