const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  listLeaveTypes: async (_req, res) => {
    try { const types = await prisma.leaveType.findMany({ where:{ is_deleted:false }, orderBy:{ name:'asc' } }); res.json({ success:true, types }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  createLeaveType: async (req, res) => {
    try { const { name, code, description } = req.body || {}; if(!name||!code) return res.status(400).json({ success:false, error:'name and code required'}); const exists = await prisma.leaveType.findFirst({ where:{ OR:[{ name }, { code }], is_deleted:false } }); if(exists) return res.status(400).json({ success:false, error:'Duplicate name or code'}); const type = await prisma.leaveType.create({ data:{ name, code, description: description||null } }); res.status(201).json({ success:true, type }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  updateLeaveType: async (req, res) => {
    try { const id = Number(req.params.id); const { name, code, description } = req.body || {}; const type = await prisma.leaveType.update({ where:{ id }, data:{ name, code, description } }); res.json({ success:true, type }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  deleteLeaveType: async (req, res) => {
    try { const id = Number(req.params.id); const type = await prisma.leaveType.update({ where:{ id }, data:{ is_deleted:true } }); res.json({ success:true, type }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  listLeaveBanks: async (_req, res) => {
    try { const banks = await prisma.leaveBank.findMany({ where:{ is_deleted:false }, orderBy:{ start_date:'desc' }, include:{ defaults:true, allocations:true } }); res.json({ success:true, banks }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  createLeaveBank: async (req, res) => {
    try { const { name, start_date, end_date } = req.body || {}; if(!name||!start_date||!end_date) return res.status(400).json({ success:false, error:'name, start_date, end_date required'}); const bank = await prisma.leaveBank.create({ data:{ name, start_date:new Date(start_date), end_date:new Date(end_date) } }); res.status(201).json({ success:true, bank }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  updateLeaveBank: async (req, res) => {
    try { const id = Number(req.params.id); const { name, start_date, end_date } = req.body || {}; const bank = await prisma.leaveBank.update({ where:{ id }, data:{ name, start_date: start_date?new Date(start_date):undefined, end_date:end_date?new Date(end_date):undefined } }); res.json({ success:true, bank }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  deleteLeaveBank: async (req, res) => {
    try { const id = Number(req.params.id); const bank = await prisma.leaveBank.update({ where:{ id }, data:{ is_deleted:true } }); res.json({ success:true, bank }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  listDefaults: async (req, res) => {
    try { const bankId = Number(req.params.bankId); const defaults = await prisma.leaveBankDefault.findMany({ where:{ leave_bank_id:bankId }, include:{ type:true } }); res.json({ success:true, defaults }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  upsertDefault: async (req, res) => {
    try { const bankId = Number(req.params.bankId); const { leave_type_id, days } = req.body || {}; if(!leave_type_id||days==null) return res.status(400).json({ success:false, error:'leave_type_id and days required'}); const existing = await prisma.leaveBankDefault.findFirst({ where:{ leave_bank_id:bankId, leave_type_id:Number(leave_type_id) } }); let record; if(existing){ record = await prisma.leaveBankDefault.update({ where:{ id:existing.id }, data:{ days:Number(days) } }); } else { record = await prisma.leaveBankDefault.create({ data:{ leave_bank_id:bankId, leave_type_id:Number(leave_type_id), days:Number(days) } }); } res.json({ success:true, record }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  deleteDefault: async (req, res) => {
    try { const id = Number(req.params.id); await prisma.leaveBankDefault.delete({ where:{ id } }); res.json({ success:true }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  listAllocations: async (req, res) => {
    try { const bankId = Number(req.params.bankId); const allocations = await prisma.leaveBankAllocation.findMany({ where:{ leave_bank_id:bankId }, include:{ employee:true, type:true } }); res.json({ success:true, allocations }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  upsertAllocation: async (req, res) => {
    try { const bankId = Number(req.params.bankId); const { employee_id, leave_type_id, days } = req.body || {}; if(!employee_id||!leave_type_id||days==null) return res.status(400).json({ success:false, error:'employee_id, leave_type_id, days required'}); const existing = await prisma.leaveBankAllocation.findFirst({ where:{ leave_bank_id:bankId, employee_id:Number(employee_id), leave_type_id:Number(leave_type_id) } }); let record; if(existing){ record = await prisma.leaveBankAllocation.update({ where:{ id:existing.id }, data:{ days:Number(days) } }); } else { record = await prisma.leaveBankAllocation.create({ data:{ leave_bank_id:bankId, employee_id:Number(employee_id), leave_type_id:Number(leave_type_id), days:Number(days) } }); } res.json({ success:true, record }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  deleteAllocation: async (req, res) => {
    try { const id = Number(req.params.id); await prisma.leaveBankAllocation.delete({ where:{ id } }); res.json({ success:true }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  }
};
