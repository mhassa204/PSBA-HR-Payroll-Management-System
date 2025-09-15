const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const districtService = {
  // Create new district
  createDistrict: async (data) => {
    const { name, is_active = true } = data;

    // Uniqueness check (name unique)
    const existing = await prisma.district.findFirst({
      where: { name: name?.trim(), is_deleted: false },
    });
    if (existing) {
      throw new Error("District with this name already exists");
    }

    return prisma.district.create({
      data: { name: name?.trim(), is_active },
      include: {
        _count: { select: { cities: true, employees: true } },
      },
    });
  },

  // Get all districts
  getAllDistricts: async () => {
    return prisma.district.findMany({
      where: { is_deleted: false },
      include: {
        _count: { select: { cities: true, employees: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  // Get district by ID
  getDistrictById: async (id) => {
    return prisma.district.findFirst({
      where: { id: parseInt(id), is_deleted: false },
      include: {
        cities: {
          where: { is_deleted: false },
          orderBy: { name: "asc" },
        },
        _count: { select: { cities: true, employees: true } },
      },
    });
  },

  // Update district
  updateDistrict: async (id, data) => {
    const { name, is_active } = data;

    if (name) {
      const existing = await prisma.district.findFirst({
        where: {
          id: { not: parseInt(id) },
          name: name.trim(),
          is_deleted: false,
        },
      });
      if (existing) {
        throw new Error("Another district with this name already exists");
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (is_active !== undefined) updateData.is_active = !!is_active;

    return prisma.district.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        _count: { select: { cities: true, employees: true } },
      },
    });
  },

  // Soft delete district
  deleteDistrict: async (id) => {
    return prisma.district.update({
      where: { id: parseInt(id) },
      data: { is_deleted: true },
    });
  },
};

module.exports = districtService;
