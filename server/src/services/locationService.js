const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const locationService = {
  // Create new location
  createLocation: async (data) => {
    const { name, type = 'BAZAAR', district, city, full_address, is_active = true, manager_user_id } = data;

    // Unique name among non-deleted
    const existing = await prisma.location.findFirst({
      where: { name, is_deleted: false }
    });
    if (existing) {
      throw new Error("Location with this name already exists");
    }

    const payload = {
      name,
      type,
      district: district || null,
      city: city || null,
      full_address: full_address || null,
      is_active,
      manager_user_id: manager_user_id ? Number(manager_user_id) : null
    };

    return prisma.location.create({
      data: payload,
      include: { manager: { select: { id: true, email: true, employee: { select: { full_name: true } } } } }
    });
  },

  // Get all locations
  getAllLocations: async () => {
    return prisma.location.findMany({
      where: { is_deleted: false },
      include: { manager: { select: { id: true, email: true, employee: { select: { full_name: true } } } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });
  },

  // Get location by ID
  getLocationById: async (id) => {
    return prisma.location.findFirst({
      where: { id: Number(id), is_deleted: false },
      include: { manager: { select: { id: true, email: true, employee: { select: { full_name: true } } } } }
    });
  },

  // Update location
  updateLocation: async (id, data) => {
    const { name, type, district, city, full_address, is_active, manager_user_id } = data;

    // Uniqueness check for name
    if (name) {
      const existing = await prisma.location.findFirst({
        where: { id: { not: Number(id) }, name, is_deleted: false }
      });
      if (existing) throw new Error("Another location with this name already exists");
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (district !== undefined) updateData.district = district;
    if (city !== undefined) updateData.city = city;
    if (full_address !== undefined) updateData.full_address = full_address;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (manager_user_id !== undefined) updateData.manager_user_id = manager_user_id ? Number(manager_user_id) : null;

    return prisma.location.update({
      where: { id: Number(id) },
      data: updateData,
      include: { manager: { select: { id: true, email: true, employee: { select: { full_name: true } } } } }
    });
  },

  // Soft delete
  deleteLocation: async (id) => {
    return prisma.location.update({ where: { id: Number(id) }, data: { is_deleted: true, is_active: false } });
  },

  // Statistics
  getLocationStatistics: async () => {
    const total = await prisma.location.count({ where: { is_deleted: false } });
    const active = await prisma.location.count({ where: { is_deleted: false, is_active: true } });
    const byType = await prisma.location.groupBy({ by: ['type'], where: { is_deleted: false }, _count: { id: true } });
    return { total, active, inactive: total - active, byType };
  }
};

module.exports = locationService;
