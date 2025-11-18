const { PrismaClient } = require("@prisma/client");
const { maskUniqueFieldsForSoftDelete, restoreUniqueFieldsForUndelete } = require("../utils/softDeleteUtil");
const { validateSoftDelete } = require("../utils/softDeleteValidation");
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
    const educationLevel = await prisma.educationLevel.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!educationLevel) {
      throw new Error("Education level not found");
    }

    // Check for active child records
    const validation = await validateSoftDelete('EducationLevel', parseInt(id));
    if (!validation.canDelete) {
      throw new Error(validation.message);
    }

    // Mask unique fields to prevent unique constraint violations
    const { masked } = maskUniqueFieldsForSoftDelete('EducationLevel', educationLevel);

    return prisma.educationLevel.update({ 
      where: { id: parseInt(id) }, 
      data: { 
        is_deleted: true,
        ...masked, // Apply masked unique fields
      } 
    });
  },

  // Restore education level
  restoreEducationLevel: async (id) => {
    const educationLevel = await prisma.educationLevel.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!educationLevel) {
      throw new Error("Education level not found");
    }

    if (!educationLevel.is_deleted) {
      throw new Error("Education level is not soft-deleted");
    }

    // Restore unique fields to their original values
    const restored = restoreUniqueFieldsForUndelete('EducationLevel', educationLevel);

    return prisma.educationLevel.update({
      where: { id: parseInt(id) },
      data: { 
        is_deleted: false,
        ...restored, // Restore original unique field values
      },
    });
  },
};

module.exports = educationLevelService;
