const { PrismaClient } = require('@prisma/client');
const { authorize } = require('../middleware/auth');
const prisma = new PrismaClient();

function maskDbEnv(url) {
  try {
    const u = new URL(url.replace('postgresql://', 'http://'));
    const host = u.hostname;
    const db = u.pathname.replace('/', '');
    return { driver: 'postgresql', host, database: db };
  } catch (e) {
    return { driver: 'postgresql' };
  }
}

class SystemSettingsController {
  // Database page (read-only, masked)
  async getDatabase(req, res) {
    const masked = maskDbEnv(process.env.DATABASE_URL || '');
    res.json({ database: masked });
  }

  // Security
  async getSecurity(req, res) {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'security' } });
    const value = row?.value || {
      passwordPolicy: { minLength: 8, requireNumber: true, requireUppercase: true, requireSymbol: false },
      sessionMaxAgeMinutes: 60,
      lockoutThreshold: 5,
      twoFactorEnabled: false
    };
    res.json({ security: value });
  }
  async updateSecurity(req, res) {
    const payload = req.body || {};
    const updated = await prisma.systemSetting.upsert({
      where: { key: 'security' },
      update: { value: payload, updatedBy: req.session.user.id },
      create: { key: 'security', category: 'security', value: payload, updatedBy: req.session.user.id }
    });
    res.json({ security: updated.value });
  }

  // Themes
  async getThemes(req, res) {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'ui' } });
    const value = row?.value || { theme: 'default', custom: {} };
    res.json({ ui: value });
  }
  async updateThemes(req, res) {
    const incoming = req.body || {};
    const theme = typeof incoming.theme === 'string' ? incoming.theme : 'default';
    const custom = incoming.custom && typeof incoming.custom === 'object' ? incoming.custom : {};

    const payload = { theme, custom };

    const updated = await prisma.systemSetting.upsert({
      where: { key: 'ui' },
      update: { value: payload, updatedBy: req.session.user.id },
      create: { key: 'ui', category: 'ui', value: payload, updatedBy: req.session.user.id }
    });
    res.json({ ui: updated.value });
  }
}

module.exports = new SystemSettingsController();
