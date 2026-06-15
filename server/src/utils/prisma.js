// Shared Prisma singleton to avoid exhausting DB connections in dev/hot-reload
const { PrismaClient } = require("@prisma/client");

// Reuse Prisma instance across hot reloads (dev/test)
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__PRISMA__ || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__PRISMA__ = prisma;
}

module.exports = prisma;
