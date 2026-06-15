const { PrismaClient } = require("@prisma/client");
const { maskUniqueFieldsForSoftDelete, restoreUniqueFieldsForUndelete } = require("../utils/softDeleteUtil");
const { validateSoftDelete } = require("../utils/softDeleteValidation");
const prisma = new PrismaClient();

const roleTagService = {
  // Create new role tag
  createRoleTag: async (data) => {
    const { name, description, category, is_active } = data;

    // Check if role tag with same name already exists
    const existingRoleTag = await prisma.RoleTag.findFirst({
      where: {
        name,
        is_deleted: false
      }
    });

    if (existingRoleTag) {
      throw new Error("Role tag with this name already exists");
    }

    return prisma.RoleTag.create({
      data: {
        name,
        description,
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

  // Get all role tags
  getAllRoleTags: async () => {
    return prisma.RoleTag.findMany({
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
        { name: 'asc' }
      ]
    });
  },

  // Get role tag by ID
  getRoleTagById: async (id) => {
    return prisma.RoleTag.findFirst({
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

  // Update role tag
  updateRoleTag: async (id, data) => {
    const { name, description, category, is_active } = data;

    // Check if role tag with same name already exists (excluding current one)
    if (name) {
      const existingRoleTag = await prisma.RoleTag.findFirst({
        where: {
          name,
          id: { not: parseInt(id) },
          is_deleted: false
        }
      });

      if (existingRoleTag) {
        throw new Error("Role tag with this name already exists");
      }
    }

    return prisma.RoleTag.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
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

  // Delete role tag (soft delete)
  deleteRoleTag: async (id) => {
    const roleTag = await prisma.RoleTag.findUnique({
      where: { id: parseInt(id) },
    });

    if (!roleTag) {
      throw new Error("Role tag not found");
    }

    // Check for active child records
    const validation = await validateSoftDelete('RoleTag', parseInt(id));
    if (!validation.canDelete) {
      throw new Error(validation.message);
    }

    // Mask unique fields to prevent unique constraint violations
    const { masked } = maskUniqueFieldsForSoftDelete('RoleTag', roleTag);

    return prisma.RoleTag.update({
      where: { id: parseInt(id) },
      data: { 
        is_deleted: true,
        ...masked, // Apply masked unique fields
      }
    });
  },

  // Restore role tag
  restoreRoleTag: async (id) => {
    const roleTag = await prisma.RoleTag.findUnique({
      where: { id: parseInt(id) },
    });

    if (!roleTag) {
      throw new Error("Role tag not found");
    }

    if (!roleTag.is_deleted) {
      throw new Error("Role tag is not soft-deleted");
    }

    // Restore unique fields to their original values
    const restored = restoreUniqueFieldsForUndelete('RoleTag', roleTag);

    return prisma.RoleTag.update({
      where: { id: parseInt(id) },
      data: { 
        is_deleted: false,
        ...restored, // Restore original unique field values
      }
    });
  },

  // Get role tag statistics
  getRoleTagStatistics: async () => {
    const totalRoleTags = await prisma.RoleTag.count({
      where: { is_deleted: false }
    });

    const activeRoleTags = await prisma.RoleTag.count({
      where: { 
        is_deleted: false,
        is_active: true
      }
    });

    const roleTagsByCategory = await prisma.RoleTag.groupBy({
      by: ['category'],
      where: { is_deleted: false },
      _count: {
        id: true
      }
    });

    return {
      total: totalRoleTags,
      active: activeRoleTags,
      inactive: totalRoleTags - activeRoleTags,
      byCategory: roleTagsByCategory
    };
  }
};

module.exports = roleTagService;
