const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const cityService = {
  // Create new city
  createCity: async (data) => {
    const { name, district_id, is_active = true } = data;

    if (!district_id) throw new Error("district_id is required");

    // Ensure district exists and not deleted
    const district = await prisma.district.findFirst({
      where: { id: parseInt(district_id), is_deleted: false },
    });
    if (!district) throw new Error("Invalid district_id");

    // Unique per district
    const existing = await prisma.city.findFirst({
      where: { name: name?.trim(), district_id: parseInt(district_id), is_deleted: false },
    });
    if (existing) throw new Error("City with this name already exists in selected district");

    return prisma.city.create({
      data: { name: name?.trim(), district_id: parseInt(district_id), is_active },
      include: {
        district: true,
        _count: { select: { employees: true } },
      },
    });
  },

  // Get all cities (optionally filter by district_id)
  getAllCities: async (filters = {}) => {
    const { district_id } = filters;
    return prisma.city.findMany({
      where: {
        is_deleted: false,
        ...(district_id ? { district_id: parseInt(district_id) } : {}),
      },
      include: { district: true, _count: { select: { employees: true } } },
      orderBy: [{ district_id: "asc" }, { name: "asc" }],
    });
  },

  // Get city by ID
  getCityById: async (id) => {
    return prisma.city.findFirst({
      where: { id: parseInt(id), is_deleted: false },
      include: { district: true, _count: { select: { employees: true } } },
    });
  },

  // Update city
  updateCity: async (id, data) => {
    const { name, district_id, is_active } = data;

    // If changing district or name, ensure uniqueness within district
    if (name || district_id) {
      const city = await prisma.city.findFirst({ where: { id: parseInt(id), is_deleted: false } });
      if (!city) throw new Error("City not found");
      const newDistrictId = district_id ? parseInt(district_id) : city.district_id;

      if (district_id) {
        const district = await prisma.district.findFirst({ where: { id: newDistrictId, is_deleted: false } });
        if (!district) throw new Error("Invalid district_id");
      }

      if (name) {
        const existing = await prisma.city.findFirst({
          where: {
            id: { not: parseInt(id) },
            name: name.trim(),
            district_id: newDistrictId,
            is_deleted: false,
          },
        });
        if (existing) throw new Error("Another city with this name exists in that district");
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (district_id !== undefined) updateData.district_id = parseInt(district_id);
    if (is_active !== undefined) updateData.is_active = !!is_active;

    return prisma.city.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { district: true, _count: { select: { employees: true } } },
    });
  },

  // Soft delete city
  deleteCity: async (id) => {
    return prisma.city.update({ where: { id: parseInt(id) }, data: { is_deleted: true } });
  },
};

module.exports = cityService;
