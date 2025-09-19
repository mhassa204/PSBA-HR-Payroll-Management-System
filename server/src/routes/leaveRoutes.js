const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { isAuthenticated, authorizeAny } = require('../middleware/auth');

// Permissions: leaves.read, leaves.create, leaves.update, leaves.delete, leaves.status, leaves.apply
const canAnyRead = authorizeAny(['*','leaves.read','employees.read','leaves.apply']);
const canCreate = authorizeAny(['*','leaves.create','leaves.apply']);
const canUpdate = authorizeAny(['*','leaves.update']);
const canDelete = authorizeAny(['*','leaves.delete']);
const canStatus = authorizeAny(['*','leaves.status']);

router.use(isAuthenticated);

function toDateOnly(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  dt.setUTCHours(0,0,0,0);
  return dt;
}
function addDays(d, n) { const dt = new Date(d); dt.setUTCDate(dt.getUTCDate()+n); return dt; }
function ymd(d){ const y=d.getUTCFullYear(); const m=String(d.getUTCMonth()+1).padStart(2,'0'); const dd=String(d.getUTCDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }

async function getActiveLeaveBank() {
  const today = toDateOnly(new Date());
  if (!today) return null;
  const bank = await prisma.leaveBank.findFirst({
    where: { is_deleted: false, period_start: { lte: today }, period_end: { gte: today } },
    orderBy: { period_start: 'desc' },
    include: { defaults: true }
  });
  return bank;
}

async function isSubordinateOfLoggedIn(employeeId, req) {
  const userEmpId = req.session?.user?.employee_id || null; // numeric Employee.id
  if (!userEmpId) return false;
  const emp = await prisma.employment.findFirst({
    where: {
      employee_id: Number(employeeId),
      is_current: true,
      is_deleted: false,
      // match reporting officer to logged-in user's employee.id as string (as used in roster module)
      reporting_officer_id: String(userEmpId),
      employee: { is_deleted: false, status: 'Active' }
    }
  });
  return !!emp;
}

function buildSummaryForEmployees({ employees, leaveTypes, bank, allocations, leavesInPeriod }) {
  const defaultsMap = new Map(); // typeId -> days
  for (const d of (bank?.defaults || [])) defaultsMap.set(d.leave_type_id, d.days);

  // allocMap: empId -> (typeId -> days)
  const allocMap = new Map();
  for (const a of allocations) {
    const byEmp = allocMap.get(a.employee_id) || new Map();
    byEmp.set(a.leave_type_id, a.days);
    allocMap.set(a.employee_id, byEmp);
  }

  // usage maps by employeeId + typeName
  const usedApproved = new Map(); // key: empId|typeName -> count
  const usedPending = new Map();
  for (const l of leavesInPeriod) {
    const key = `${l.employee_id}|${l.type || ''}`;
    if (l.status === 'APPROVED') {
      usedApproved.set(key, (usedApproved.get(key) || 0) + 1);
    } else if (l.status === 'PENDING') {
      usedPending.set(key, (usedPending.get(key) || 0) + 1);
    }
  }

  const types = leaveTypes || [];
  const itemsByEmp = new Map();
  for (const emp of employees) {
    const rows = [];
    for (const t of types) {
      const allocDays = (allocMap.get(emp.id)?.get(t.id)) ?? defaultsMap.get(t.id) ?? 0;
      const approved = usedApproved.get(`${emp.id}|${t.name}`) || 0;
      const pending = usedPending.get(`${emp.id}|${t.name}`) || 0;
      rows.push({ typeId: t.id, typeName: t.name, allocated: allocDays, approvedUsed: approved, pending, available: Math.max(0, allocDays - approved) });
    }
    itemsByEmp.set(emp.id, rows);
  }

  return itemsByEmp;
}

// New: GET /api/leaves/apply/employees -> list employees under current user's reporting (current employment) plus the officer themself
router.get('/apply/employees', authorizeAny(['*','leaves.apply','leaves.read','roster.create']), async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const userEmpId = req.session?.user?.employee_id || null;
    if (!userEmpId) {
      return res.json({ success: true, employees: [] });
    }

    // Fetch subordinate employments like roster helper (no manager location guard here)
    const subs = await prisma.employment.findMany({
      where: {
        is_deleted: false,
        is_current: true,
        organization: 'PSBA',
        reporting_officer_id: String(userEmpId),
        employee: {
          is_deleted: false,
          status: 'Active',
          ...(search ? {
            OR: [
              { full_name: { contains: search, mode: 'insensitive' } },
              { employee_id: { contains: search, mode: 'insensitive' } },
              { cnic: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
          } : {})
        }
      },
      include: {
        employee: true,
        designation: true,
        role_tag: true,
      },
      orderBy: { employee_id: 'asc' }
    });

    // Unique employees
    const seen = new Set();
    const list = [];
    for (const r of subs) {
      if (seen.has(r.employee_id)) continue;
      seen.add(r.employee_id);
      list.push({
        id: r.employee.id,
        employee_id: r.employee.employee_id,
        full_name: r.employee.full_name,
        cnic: r.employee.cnic,
        employmentRecords: [{ designation: r.designation, role_tag: r.role_tag }],
      });
    }

    // Include the reporting officer themself (self) if active and matches search (or no search)
    const selfEmp = await prisma.employee.findFirst({
      where: {
        id: Number(userEmpId),
        is_deleted: false,
        status: 'Active',
        ...(search ? {
          OR: [
            { full_name: { contains: search, mode: 'insensitive' } },
            { employee_id: { contains: search, mode: 'insensitive' } },
            { cnic: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ]
        } : {})
      },
      include: {
        employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, role_tag: true } }
      }
    });
    if (selfEmp && !seen.has(selfEmp.employee_id)) {
      list.unshift({
        id: selfEmp.id,
        employee_id: selfEmp.employee_id,
        full_name: selfEmp.full_name,
        cnic: selfEmp.cnic,
        employmentRecords: [{ designation: selfEmp.employmentRecords?.[0]?.designation || null, role_tag: selfEmp.employmentRecords?.[0]?.role_tag || null }],
      });
      seen.add(selfEmp.employee_id);
    }

    // Load recent leaves for these employees
    const empIds = list.map(e => e.id);
    const leaves = empIds.length ? await prisma.leave.findMany({ where: { employee_id: { in: empIds }, is_deleted: false }, orderBy: { date: 'desc' } }) : [];
    const leavesByEmp = new Map();
    for (const l of leaves) {
      const arr = leavesByEmp.get(l.employee_id) || []; arr.push({ id: l.id, date: l.date, type: l.type, status: l.status, remarks: l.remarks }); leavesByEmp.set(l.employee_id, arr);
    }
    const employees = list.map(e => ({ ...e, leaves: leavesByEmp.get(e.id) || [] }));

    res.json({ success: true, employees });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/leaves/employees?search=... -> list employees with aggregated leaves and current bank summary
router.get('/employees', canAnyRead, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const whereEmp = {
      is_deleted: false,
      ...(search ? {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { employee_id: { contains: search, mode: 'insensitive' } },
          { cnic: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      } : {})
    };
    const employees = await prisma.employee.findMany({
      where: whereEmp,
      select: {
        id: true,
        employee_id: true,
        full_name: true,
        cnic: true,
        employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, role_tag: true } },
        leaves: { where: { is_deleted: false }, orderBy: { date: 'desc' } }
      },
      orderBy: [{ full_name: 'asc' }, { id: 'asc' }]
    });

    const activeBank = await getActiveLeaveBank();
    let leaveTypes = [];
    let summaryByEmp = new Map();
    if (activeBank) {
      leaveTypes = await prisma.leaveType.findMany({ where: { is_deleted: false, is_active: true }, orderBy: { name: 'asc' } });
      const empIds = employees.map(e => e.id);
      const allocations = await prisma.leaveBankAllocation.findMany({ where: { leave_bank_id: activeBank.id, employee_id: { in: empIds } } });
      const leavesInPeriod = await prisma.leave.findMany({
        where: { is_deleted: false, employee_id: { in: empIds }, date: { gte: toDateOnly(activeBank.period_start), lte: toDateOnly(activeBank.period_end) } },
        select: { employee_id: true, type: true, status: true }
      });
      summaryByEmp = buildSummaryForEmployees({ employees, leaveTypes, bank: activeBank, allocations, leavesInPeriod });
    }

    const enriched = employees.map(e => ({
      ...e,
      currentLeaveBankSummary: activeBank ? {
        bankId: activeBank.id,
        title: activeBank.title,
        period_start: activeBank.period_start,
        period_end: activeBank.period_end,
        items: summaryByEmp.get(e.id) || []
      } : null
    }));

    res.json({ success: true, employees: enriched, activeBank: activeBank ? { id: activeBank.id, title: activeBank.title, period_start: activeBank.period_start, period_end: activeBank.period_end } : null });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/leaves/:employeeId -> leaves for one employee plus current bank summary
router.get('/:employeeId', canAnyRead, async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    // If caller only has leaves.apply (not leaves.read/employees.read), enforce subordinate constraint or allow self
    const perms = req.session?.user?.permissions || [];
    const userEmpId = req.session?.user?.employee_id || null;
    const hasGlobalRead = perms.includes('*') || perms.includes('leaves.read') || perms.includes('employees.read');
    if (!hasGlobalRead && perms.includes('leaves.apply')) {
      const isSelf = userEmpId && Number(employeeId) === Number(userEmpId);
      const ok = isSelf ? true : await isSubordinateOfLoggedIn(employeeId, req);
      if (!ok) return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const leaves = await prisma.leave.findMany({ where: { employee_id: employeeId, is_deleted: false }, orderBy: { date: 'desc' } });

    const activeBank = await getActiveLeaveBank();
    let summary = null;
    if (activeBank) {
      const leaveTypes = await prisma.leaveType.findMany({ where: { is_deleted: false, is_active: true }, orderBy: { name: 'asc' } });
      const allocations = await prisma.leaveBankAllocation.findMany({ where: { leave_bank_id: activeBank.id, employee_id: employeeId } });
      const leavesInPeriod = await prisma.leave.findMany({
        where: { is_deleted: false, employee_id: employeeId, date: { gte: toDateOnly(activeBank.period_start), lte: toDateOnly(activeBank.period_end) } },
        select: { employee_id: true, type: true, status: true }
      });
      const itemsMap = buildSummaryForEmployees({ employees: [{ id: employeeId }], leaveTypes, bank: activeBank, allocations, leavesInPeriod });
      summary = {
        bankId: activeBank.id,
        title: activeBank.title,
        period_start: activeBank.period_start,
        period_end: activeBank.period_end,
        items: itemsMap.get(employeeId) || []
      };
    }

    res.json({ success: true, leaves, summary });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/leaves/:employeeId -> create leaves: single {date}, range {start,end}, or list {dates: []}
router.post('/:employeeId', canCreate, async (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const { date, type, remarks, start, end, dates } = req.body || {};

    // If caller does not have leaves.create, but has leaves.apply, restrict to subordinates or self
    const perms = req.session?.user?.permissions || [];
    const userEmpId = req.session?.user?.employee_id || null;
    const hasCreate = perms.includes('*') || perms.includes('leaves.create');
    const hasApply = perms.includes('leaves.apply');
    if (!hasCreate && hasApply) {
      const isSelf = userEmpId && Number(employeeId) === Number(userEmpId);
      const ok = isSelf ? true : await isSubordinateOfLoggedIn(employeeId, req);
      if (!ok) return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    if (!type) return res.status(400).json({ success: false, error: 'type is required' });

    // Build a set of date-only UTC values to insert
    const toInsert = new Set();
    if (Array.isArray(dates) && dates.length) {
      for (const d of dates) {
        const dt = toDateOnly(d);
        if (dt) toInsert.add(ymd(dt));
      }
    } else if (start && end) {
      const s = toDateOnly(start); const e = toDateOnly(end);
      if (!s || !e || s > e) return res.status(400).json({ success: false, error: 'Invalid start/end' });
      let cur = s;
      while (cur <= e) { toInsert.add(ymd(cur)); cur = addDays(cur, 1); }
    } else if (date) {
      const dt = toDateOnly(date);
      if (!dt) return res.status(400).json({ success: false, error: 'Invalid date' });
      toInsert.add(ymd(dt));
    } else {
      return res.status(400).json({ success: false, error: 'Provide date or start/end or dates[]' });
    }

    const list = Array.from(toInsert);
    if (!list.length) return res.status(400).json({ success: false, error: 'No valid dates to insert' });

    // Find existing leaves for these dates to avoid duplicates
    const existing = await prisma.leave.findMany({
      where: { employee_id: employeeId, is_deleted: false, date: { in: list.map(d => new Date(d)) } },
      select: { date: true }
    });
    const existSet = new Set(existing.map(x => ymd(toDateOnly(x.date))));

    const payload = list
      .filter(d => !existSet.has(d))
      .map(d => ({ employee_id: employeeId, date: new Date(d), type: String(type), remarks: remarks || null }));

    let created = 0; let skipped = list.length - payload.length;
    if (payload.length) {
      const result = await prisma.leave.createMany({ data: payload });
      created = result.count || payload.length;
    }

    const leaves = await prisma.leave.findMany({ where: { employee_id: employeeId, is_deleted: false }, orderBy: { date: 'desc' } });
    res.status(201).json({ success: true, created, skipped, leaves });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/leaves/:id -> update leave (date/type/remarks)
router.put('/:id', canUpdate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { date, type, remarks } = req.body || {};
    const data = {};
    if (date) data.date = toDateOnly(date);
    if (type) data.type = String(type);
    if (remarks !== undefined) data.remarks = remarks;
    const updated = await prisma.leave.update({ where: { id }, data });
    res.json({ success: true, leave: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/leaves/:id/status -> change status (requires leaves.status)
router.patch('/:id/status', canStatus, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    const allowed = ['PENDING','APPROVED','REJECTED'];
    if (!allowed.includes(String(status))) return res.status(400).json({ success: false, error: 'Invalid status' });
    const updated = await prisma.leave.update({ where: { id }, data: { status: status } });
    res.json({ success: true, leave: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/leaves/:id -> soft delete
// Behavior:
// - Users with leaves.delete or * can delete any leave (soft delete)
// - Users with only leaves.apply can delete PENDING leaves for their subordinates or themself
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const perms = req.session?.user?.permissions || [];
    const userEmpId = req.session?.user?.employee_id || null;
    const hasFullDelete = perms.includes('*') || perms.includes('leaves.delete');

    if (hasFullDelete) {
      const updated = await prisma.leave.update({ where: { id }, data: { is_deleted: true } });
      return res.json({ success: true, leave: updated });
    }

    if (perms.includes('leaves.apply')) {
      const leave = await prisma.leave.findUnique({ where: { id } });
      if (!leave || leave.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
      if (leave.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Only pending leaves can be deleted' });
      const isSelf = userEmpId && Number(leave.employee_id) === Number(userEmpId);
      const ok = isSelf ? true : await isSubordinateOfLoggedIn(leave.employee_id, req);
      if (!ok) return res.status(403).json({ success: false, error: 'Forbidden' });
      const updated = await prisma.leave.update({ where: { id }, data: { is_deleted: true } });
      return res.json({ success: true, leave: updated });
    }

    return res.status(403).json({ success: false, error: 'Forbidden' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
