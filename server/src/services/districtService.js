const { PrismaClient } = require("@prisma/client");
const { maskUniqueFieldsForSoftDelete, restoreUniqueFieldsForUndelete } = require("../utils/softDeleteUtil");
const { validateSoftDelete } = require("../utils/softDeleteValidation");
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
    const district = await prisma.district.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!district) {
      throw new Error("District not found");
    }

    // Check for active child records
    const validation = await validateSoftDelete('District', parseInt(id));
    if (!validation.canDelete) {
      throw new Error(validation.message);
    }

    // Mask unique fields to prevent unique constraint violations
    const { masked } = maskUniqueFieldsForSoftDelete('District', district);

    return prisma.district.update({
      where: { id: parseInt(id) },
      data: { 
        is_deleted: true,
        ...masked, // Apply masked unique fields
      },
    });
  },

  // Restore district
  restoreDistrict: async (id) => {
    const district = await prisma.district.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!district) {
      throw new Error("District not found");
    }

    if (!district.is_deleted) {
      throw new Error("District is not soft-deleted");
    }

    // Restore unique fields to their original values
    const restored = restoreUniqueFieldsForUndelete('District', district);

    return prisma.district.update({
      where: { id: parseInt(id) },
      data: { 
        is_deleted: false,
        ...restored, // Restore original unique field values
      },
    });
  },
};

module.exports = districtService;
