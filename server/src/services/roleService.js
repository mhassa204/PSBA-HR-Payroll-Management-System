const { PrismaClient } = require('@prisma/client');
const { maskUniqueFieldsForSoftDelete, restoreUniqueFieldsForUndelete } = require('../utils/softDeleteUtil');
const { validateSoftDelete } = require('../utils/softDeleteValidation');
const prisma = new PrismaClient();

class RoleService {
  async getAllRoles() {
    try {
      const roles = await prisma.role.findMany({
        where: { is_deleted: false },
        include: {
          _count: { select: { users: true } },
          rolePermissions: { include: { permission: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const data = roles.map((r) => ({
        ...r,
        allowed_actions: r.rolePermissions?.map((rp) => rp.permission.key) || [],
      }));
      return { roles: data };
    } catch (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  async getRoleById(id) {
    try {
      const role = await prisma.role.findFirst({
        where: { id: parseInt(id), is_deleted: false },
        include: { rolePermissions: { include: { permission: true } } },
      });
      if (!role) throw new Error('Role not found');
      const data = { ...role, allowed_actions: role.rolePermissions?.map((rp) => rp.permission.key) || [] };
      return { role: data };
    } catch (error) {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }
  }

  async createRole(roleData) {
    try {
      const { name, type = 'custom', enabled = true, fields = [], allowed_actions = [] } = roleData;

      const ensurePerm = async (key) =>
        prisma.permission.upsert({
          where: { key },
          update: {},
          create: { key, resource: key.split('.')[0] || 'custom', action: key.split('.')[1] || 'custom' },
        });

      const uniqueKeys = Array.from(new Set(allowed_actions));
      const perms = await prisma.$transaction(uniqueKeys.map(ensurePerm));

      const role = await prisma.role.create({
        data: {
          name,
          type,
          enabled,
          fields,
          rolePermissions: { create: perms.map((p) => ({ permission_id: p.id })) },
        },
        include: { rolePermissions: { include: { permission: true } } },
      });

      const data = { ...role, allowed_actions: role.rolePermissions?.map((rp) => rp.permission.key) || [] };
      return { role: data };
    } catch (error) {
      if (error.code === 'P2002') throw new Error('Role name already exists');
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  async updateRole(id, roleData) {
    try {
      const existingRole = await prisma.role.findFirst({
        where: { id: parseInt(id), is_deleted: false },
        include: { rolePermissions: true },
      });
      if (!existingRole) throw new Error('Role not found');

      const { name, type, enabled, fields, allowed_actions = [] } = roleData;

      const uniqueKeys = Array.from(new Set(allowed_actions));
      const perms = await prisma.$transaction(
        uniqueKeys.map((key) =>
          prisma.permission.upsert({
            where: { key },
            update: {},
            create: { key, resource: key.split('.')[0] || 'custom', action: key.split('.')[1] || 'custom' },
          })
        )
      );

      const updated = await prisma.role.update({
        where: { id: existingRole.id },
        data: {
          name,
          type,
          enabled,
          fields,
          rolePermissions: { deleteMany: {}, create: perms.map((p) => ({ permission_id: p.id })) },
        },
        include: { rolePermissions: { include: { permission: true } } },
      });

      const data = { ...updated, allowed_actions: updated.rolePermissions?.map((rp) => rp.permission.key) || [] };
      return { role: data };
    } catch (error) {
      if (error.code === 'P2002') throw new Error('Role name already exists');
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  async deleteRole(id) {
    try {
      const existingRole = await prisma.role.findFirst({
        where: { id: parseInt(id), is_deleted: false },
      });
      if (!existingRole) throw new Error('Role not found');

      // Check for active child records
      const validation = await validateSoftDelete('Role', parseInt(id));
      if (!validation.canDelete) {
        throw new Error(validation.message);
      }

      // Mask unique fields to prevent unique constraint violations
      const { masked } = maskUniqueFieldsForSoftDelete('Role', existingRole);

      await prisma.role.update({ 
        where: { id: parseInt(id) }, 
        data: { 
          is_deleted: true,
          ...masked, // Apply masked unique fields
        } 
      });
      return { message: 'Role deleted successfully' };
    } catch (error) {
      throw new Error(error.message || `Failed to delete role: ${error.message}`);
    }
  }

  async restoreRole(id) {
    try {
      const role = await prisma.role.findUnique({
        where: { id: parseInt(id) },
      });

      if (!role) {
        throw new Error('Role not found');
      }

      if (!role.is_deleted) {
        throw new Error('Role is not soft-deleted');
      }

      // Restore unique fields to their original values
      const restored = restoreUniqueFieldsForUndelete('Role', role);

      const restoredRole = await prisma.role.update({
        where: { id: parseInt(id) },
        data: { 
          is_deleted: false,
          ...restored, // Restore original unique field values
        }
      });

      return { message: 'Role restored successfully', role: restoredRole };
    } catch (error) {
      throw new Error(`Failed to restore role: ${error.message}`);
    }
  }
}

module.exports = new RoleService();
