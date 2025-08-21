const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RoleService {
  async getAllRoles() {
    try {
      const roles = await prisma.role.findMany({
        where: {
          is_deleted: false
        },
        include: {
          _count: {
            select: {
              users: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return { roles };
    } catch (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  async getRoleById(id) {
    try {
      const role = await prisma.role.findFirst({
        where: {
          id: parseInt(id),
          is_deleted: false
        }
      });
      
      if (!role) {
        throw new Error('Role not found');
      }
      
      return { role };
    } catch (error) {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }
  }

  async createRole(roleData) {
    try {
      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          type: roleData.type || 'custom',
          allowed_actions: roleData.allowed_actions || [],
          enabled: roleData.enabled !== undefined ? roleData.enabled : true,
          fields: roleData.fields || []
        }
      });
      
      return { role };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Role name already exists');
      }
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  async updateRole(id, roleData) {
    try {
      const existingRole = await prisma.role.findFirst({
        where: {
          id: parseInt(id),
          is_deleted: false
        }
      });

      if (!existingRole) {
        throw new Error('Role not found');
      }

      const role = await prisma.role.update({
        where: { id: parseInt(id) },
        data: {
          name: roleData.name,
          type: roleData.type,
          allowed_actions: roleData.allowed_actions,
          enabled: roleData.enabled,
          fields: roleData.fields
        }
      });
      
      return { role };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Role name already exists');
      }
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  async deleteRole(id) {
    try {
      const existingRole = await prisma.role.findFirst({
        where: {
          id: parseInt(id),
          is_deleted: false
        },
        include: {
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      if (!existingRole) {
        throw new Error('Role not found');
      }

      if (existingRole._count.users > 0) {
        throw new Error(`Cannot delete role. It is assigned to ${existingRole._count.users} users.`);
      }

      await prisma.role.update({
        where: { id: parseInt(id) },
        data: { is_deleted: true }
      });
      
      return { message: 'Role deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }
}

module.exports = new RoleService();
