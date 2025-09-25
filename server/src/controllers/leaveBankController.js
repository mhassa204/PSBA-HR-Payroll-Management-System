const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  // Leave Types (mirror original behavior)
  listLeaveTypes: async (_req, res) => {
    try {
      const types = await prisma.leaveType.findMany({ where: { is_deleted: false }, orderBy: { name: 'asc' } });
      res.json({ success: true, types });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  },
  createLeaveType: async (req, res) => {
    try {
      const { name, code, is_active = true } = req.body || {};
      if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
      const created = await prisma.leaveType.create({ data: { name, code: code || null, is_active } });
      res.json({ success: true, type: created });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },
  updateLeaveType: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, code, is_active } = req.body || {};
      const updated = await prisma.leaveType.update({ where: { id }, data: { ...(name != null ? { name } : {}), ...(code !== undefined ? { code } : {}), ...(is_active != null ? { is_active } : {}) } });
      res.json({ success: true, type: updated });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },
  deleteLeaveType: async (req, res) => {
    try { const id = Number(req.params.id); await prisma.leaveType.update({ where: { id }, data: { is_deleted: true } }); res.json({ success: true }); }
    catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },

  // Leave Banks
  listLeaveBanks: async (_req, res) => {
    try {
      const banks = await prisma.leaveBank.findMany({ where: { is_deleted: false }, orderBy: { createdAt: 'desc' }, include: { defaults: { include: { leaveType: true } } } });
      res.json({ success: true, banks });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  },
  createLeaveBank: async (req, res) => {
    try {
      const { title, period_start, period_end, defaults } = req.body || {};
      if (!period_start || !period_end) return res.status(400).json({ success: false, error: 'Period start/end required' });
      const created = await prisma.leaveBank.create({ data: { title: title || null, period_start: new Date(period_start), period_end: new Date(period_end), createdByUserId: req.session.user?.id || null } });

      // Create defaults if provided: [{ leave_type_id, days }]
      if (Array.isArray(defaults) && defaults.length) {
        await prisma.leaveBankDefault.createMany({ data: defaults.map(d => ({ leave_bank_id: created.id, leave_type_id: Number(d.leave_type_id), days: Number(d.days || 0) })) });
      }
      // Assign allocations for all employees based on defaults
      const employees = await prisma.employee.findMany({ where: { is_deleted: false }, select: { id: true } });
      const defaultsList = await prisma.leaveBankDefault.findMany({ where: { leave_bank_id: created.id } });
      const allocRows = [];
      for (const emp of employees) {
        for (const def of defaultsList) {
          allocRows.push({ leave_bank_id: created.id, employee_id: emp.id, leave_type_id: def.leave_type_id, days: def.days });
        }
      }
      if (allocRows.length) await prisma.leaveBankAllocation.createMany({ data: allocRows, skipDuplicates: true });

      const full = await prisma.leaveBank.findFirst({ where: { id: created.id }, include: { defaults: { include: { leaveType: true } } } });
      res.json({ success: true, bank: full });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },
  updateLeaveBank: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, period_start, period_end } = req.body || {};
      const updated = await prisma.leaveBank.update({ where: { id }, data: { ...(title !== undefined ? { title } : {}), ...(period_start ? { period_start: new Date(period_start) } : {}), ...(period_end ? { period_end: new Date(period_end) } : {}) } });
      res.json({ success: true, bank: updated });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },
  deleteLeaveBank: async (req, res) => {
    try { const id = Number(req.params.id); await prisma.leaveBank.update({ where: { id }, data: { is_deleted: true } }); res.json({ success: true }); }
    catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },

  // Defaults (days per type for a bank)
  listDefaults: async (req, res) => {
    try { const id = Number(req.params.id); const defaults = await prisma.leaveBankDefault.findMany({ where: { leave_bank_id: id }, include: { leaveType: true } }); res.json({ success: true, defaults }); }
    catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },
  upsertDefault: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!items.length) return res.status(400).json({ success: false, error: 'No items' });
      await prisma.$transaction(items.map(it => prisma.leaveBankDefault.upsert({
        where: { leave_bank_type_unique: { leave_bank_id: id, leave_type_id: Number(it.leave_type_id) } },
        create: { leave_bank_id: id, leave_type_id: Number(it.leave_type_id), days: Number(it.days || 0) },
        update: { days: Number(it.days || 0) }
      })));
      res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },
  deleteDefault: async (req, res) => { // optional endpoint; not in original but keep safe
    try { const id = Number(req.params.id); await prisma.leaveBankDefault.delete({ where: { id } }); res.json({ success: true }); }
    catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },

  // Allocations per employee
  listAllocations: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { search = '' } = req.query;
      const term = String(search).trim();
      const employees = await prisma.employee.findMany({
        where: { is_deleted: false, ...(term ? { OR: [ { full_name: { contains: term, mode: 'insensitive' } }, { employee_id: { contains: term, mode: 'insensitive' } }, { cnic: { contains: term, mode: 'insensitive' } } ] } : {}) },
        select: { id: true, employee_id: true, full_name: true, cnic: true }
      });
      const allocs = await prisma.leaveBankAllocation.findMany({ where: { leave_bank_id: id }, include: { leaveType: true } });
      res.json({ success: true, employees, allocations: allocs });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },
  upsertAllocation: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (!items.length) return res.status(400).json({ success: false, error: 'No items' });
      await prisma.$transaction(items.map(it => prisma.leaveBankAllocation.upsert({
        where: { leave_bank_employee_type_unique: { leave_bank_id: id, employee_id: Number(it.employee_id), leave_type_id: Number(it.leave_type_id) } },
        create: { leave_bank_id: id, employee_id: Number(it.employee_id), leave_type_id: Number(it.leave_type_id), days: Number(it.days || 0) },
        update: { days: Number(it.days || 0) }
      })));
      res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
  },
  deleteAllocation: async (req, res) => { // optional endpoint
    try { const id = Number(req.params.id); await prisma.leaveBankAllocation.delete({ where: { id } }); res.json({ success: true }); }
    catch (e) { res.status(400).json({ success: false, error: e.message }); }
  }
};
