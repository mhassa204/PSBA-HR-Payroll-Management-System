const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PermissionService {
  async listAll() {
    const permissions = await prisma.permission.findMany({ orderBy: { key: 'asc' } });
    return { permissions };
  }

  async upsertMany(keys = []) {
    if (!Array.isArray(keys)) throw new Error('keys must be an array');
    const operations = keys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, resource: key.split('.')[0] || 'custom', action: key.split('.')[1] || 'custom' },
      })
    );
    const result = await prisma.$transaction(operations);
    return { permissions: result };
  }

  async create({ key, resource, action, description }) {
    const perm = await prisma.permission.create({ data: { key, resource, action, description } });
    return { permission: perm };
  }

  async deleteByKey(key) {
    await prisma.permission.delete({ where: { key } });
    return { message: 'Permission deleted' };
  }
}

module.exports = new PermissionService();
