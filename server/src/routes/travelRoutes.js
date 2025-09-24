const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { isAuthenticated, authorize, authorizeAny } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

// Utility: compute total days between date-time and expected return date using server timezone
function computeTotalDays(departureDate, departureTime, expectedReturnDate) {
  const dep = new Date(departureDate);
  if (departureTime) {
    const [hh, mm] = String(departureTime).split(':');
    if (!Number.isNaN(Number(hh))) dep.setHours(Number(hh), Number(mm||0), 0, 0);
  }
  const ret = new Date(expectedReturnDate);
  const ms = ret.getTime() - dep.getTime();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return Math.max(1, days);
}

// Return reportees + self for logged-in user (for employee selector)
router.get('/employees/reportees', isAuthenticated, authorize('travel.read'), async (req, res) => {
  const currentEmpId = req.session.user?.employee_id;
  if (!currentEmpId) return res.json({ success: true, employees: [] });

  // Fetch self
  const self = await prisma.employee.findUnique({ where: { id: Number(currentEmpId) } });

  // reporting_officer_id stores the numeric employee id as string in Employment
  const officerKey = String(currentEmpId);
  const employments = await prisma.employment.findMany({
    where: { is_deleted: false, is_current: true, reporting_officer_id: officerKey },
    include: { employee: true }
  });
  const reportees = employments.map(e => e.employee).filter(Boolean);

  // Ensure unique and include self
  const map = new Map();
  for (const e of reportees) if (e) map.set(e.id, e);
  if (self) map.set(self.id, self);
  const employees = Array.from(map.values()).map(e => ({ id: e.id, full_name: e.full_name, cnic: e.cnic || '' }));
  res.json({ success: true, employees });
});

// Travel Requests CRUD (simplified fields)
router.get('/requests', isAuthenticated, authorize('travel.manage'), async (req, res) => {
  const list = await prisma.travelRequest.findMany({
    where: { is_deleted: false },
    orderBy: { createdAt: 'desc' },
    include: {
      attendees: { include: { employee: true } },
      statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } },
    }
  });
  res.json({ success: true, requests: list });
});

// List only current user's own requests
router.get('/requests/mine', isAuthenticated, authorize('travel.read'), async (req, res) => {
  const applicant_id = Number(req.session.user?.employee_id);
  if (!applicant_id) return res.json({ success: true, requests: [] });
  const list = await prisma.travelRequest.findMany({
    where: { is_deleted: false, applicant_id },
    orderBy: { createdAt: 'desc' },
    include: {
      attendees: { include: { employee: true } },
      statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } },
    }
  });
  res.json({ success: true, requests: list });
});

router.post('/requests', isAuthenticated, authorize('travel.create'), async (req, res) => {
  const data = req.body || {};
  const applicant_id = Number(req.session.user?.employee_id);
  if (!applicant_id) return res.status(400).json({ success: false, error: 'Applicant not linked to user' });

  // required fields
  if (!data.departure_date) return res.status(400).json({ success: false, error: 'departure_date is required' });
  if (!data.expected_return_date) return res.status(400).json({ success: false, error: 'expected_return_date is required' });

  // Validate total_days if provided
  const computedDays = computeTotalDays(data.departure_date, data.departure_time, data.expected_return_date);
  if (data.total_days != null && data.total_days !== '' && Number(data.total_days) !== computedDays) {
    return res.status(400).json({ success: false, error: `total_days (${data.total_days}) does not match date range (${computedDays})` });
  }

  const attendeeIds = Array.isArray(data.employee_ids) ? data.employee_ids.map(Number).filter(Boolean) : [];

  const created = await prisma.travelRequest.create({
    data: {
      applicant_id,
      departure_date: new Date(data.departure_date),
      departure_time: data.departure_time || null,
      expected_return_date: new Date(data.expected_return_date),
      purpose: data.purpose || null,
      destination: data.destination || null,
      total_days: computedDays,
      status: 'CREATED',
    }
  });

  if (attendeeIds.length) {
    await prisma.travelRequestEmployee.createMany({ data: attendeeIds.map(eid => ({ request_id: created.id, employee_id: eid })) });
  }

  // Status history: CREATED
  await prisma.travelRequestStatusEntry.create({
    data: { request_id: created.id, action: 'CREATED', actor_employee_id: applicant_id }
  });

  const full = await prisma.travelRequest.findUnique({ where: { id: created.id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
  res.json({ success: true, request: full });
});

router.put('/requests/:id', isAuthenticated, authorizeAny(['travel.manage','travel.update']), async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body || {};
  // scope: if lacks manage, must be applicant
  const hasManage = (req.session.user?.permissions || []).includes('travel.manage') || req.session.user?.role?.name === 'Super Admin' || (req.session.user?.permissions||[]).includes('*');
  if (!hasManage) {
    const existing = await prisma.travelRequest.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
    if (existing.applicant_id !== Number(req.session.user?.employee_id)) return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  const updateData = {};
  if ('purpose' in data) updateData.purpose = data.purpose || null;
  if ('destination' in data) updateData.destination = data.destination || null;
  if ('departure_date' in data && data.departure_date) updateData.departure_date = new Date(data.departure_date);
  if ('departure_time' in data) updateData.departure_time = data.departure_time || null;
  if ('expected_return_date' in data && data.expected_return_date) updateData.expected_return_date = new Date(data.expected_return_date);

  // Recompute total_days if dates/time provided, else keep existing
  const existing = await prisma.travelRequest.findUnique({ where: { id } });
  if (!existing || existing.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
  const depDate = updateData.departure_date || existing.departure_date;
  const depTime = ('departure_time' in updateData) ? updateData.departure_time : existing.departure_time;
  const retDate = updateData.expected_return_date || existing.expected_return_date;
  const computedDays = computeTotalDays(depDate, depTime, retDate);
  if (data.total_days != null && data.total_days !== '' && Number(data.total_days) !== computedDays) {
    return res.status(400).json({ success: false, error: `total_days (${data.total_days}) does not match date range (${computedDays})` });
  }
  updateData.total_days = computedDays;

  const updated = await prisma.travelRequest.update({ where: { id }, data: updateData });

  // Update attendees if provided
  if (Array.isArray(data.employee_ids)) {
    await prisma.travelRequestEmployee.deleteMany({ where: { request_id: id } });
    const attendeeIds = data.employee_ids.map(Number).filter(Boolean);
    if (attendeeIds.length) {
      await prisma.travelRequestEmployee.createMany({ data: attendeeIds.map(eid => ({ request_id: id, employee_id: eid })) });
    }
  }

  const full = await prisma.travelRequest.findUnique({ where: { id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
  res.json({ success: true, request: full });
});

router.delete('/requests/:id', isAuthenticated, authorizeAny(['travel.manage','travel.delete']), async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.travelRequest.findUnique({ where: { id } });
  if (!row || row.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
  // scope: if lacks manage, only applicant can delete
  const hasManage = (req.session.user?.permissions || []).includes('travel.manage') || req.session.user?.role?.name === 'Super Admin' || (req.session.user?.permissions||[]).includes('*');
  if (!hasManage && row.applicant_id !== Number(req.session.user?.employee_id)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  if (row.status !== 'CREATED') return res.status(400).json({ success: false, error: 'Only CREATED requests can be deleted' });
  await prisma.travelRequest.update({ where: { id }, data: { is_deleted: true } });
  res.json({ success: true });
});

router.get('/requests/:id', isAuthenticated, authorizeAny(['travel.manage','travel.read']), async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.travelRequest.findUnique({ where: { id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
  if (!row || row.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
  // Scope check: if user lacks travel.manage, they must be the applicant or an attendee
  const hasManage = (req.session.user?.permissions || []).includes('travel.manage') || req.session.user?.role?.name === 'Super Admin' || (req.session.user?.permissions||[]).includes('*');
  if (!hasManage) {
    const me = Number(req.session.user?.employee_id);
    const isApplicant = row.applicant_id === me;
    const isAttendee = (row.attendees || []).some(a => a.employee_id === me);
    if (!isApplicant && !isAttendee) return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  res.json({ success: true, request: row });
});

// Travel Claims CRUD (unchanged)
router.get('/claims', isAuthenticated, authorize('travel.claim.read'), async (req, res) => {
  const list = await prisma.travelClaim.findMany({ where: { is_deleted: false }, orderBy: { createdAt: 'desc' }, include: { items: { include: { receipts: true } } } });
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  const withUrls = list.map(c => ({ ...c, items: (c.items||[]).map(i => ({ ...i, url: i.receipt_path ? toUrl(i.receipt_path) : null, receipts: (i.receipts||[]).map(r => ({ ...r, url: toUrl(r.file_path) })) })) }));
  res.json({ success: true, claims: withUrls });
});

router.post('/claims', isAuthenticated, authorize('travel.claim.create'), async (req, res) => {
  const data = req.body || {};
  const employee_id = Number(data.employee_id || req.session.user?.employee_id);
  const items = Array.isArray(data.items) ? data.items : [];
  const created = await prisma.travelClaim.create({ data: { employee_id, travel_request_id: data.travel_request_id ? Number(data.travel_request_id) : null, notes: data.notes || null } });
  let total = 0;
  const createdItems = [];
  for (const it of items) {
    const newItem = await prisma.travelClaimItem.create({ data: { claim_id: created.id, date: new Date(it.date), category: it.category, description: it.description || null, amount: Number(it.amount||0), receipt_path: it.receipt_path || null, mime_type: it.mime_type || null, file_size: it.file_size || null } });
    createdItems.push(newItem);
    total += Number(it.amount || 0);
  }
  await prisma.travelClaim.update({ where: { id: created.id }, data: { total_claimed: total } });
  const full = await prisma.travelClaim.findUnique({ where: { id: created.id }, include: { items: { include: { receipts: true } } } });
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  const mapped = { ...full, items: (full.items||[]).map(it => ({ ...it, url: it.receipt_path ? toUrl(it.receipt_path) : null, receipts: (it.receipts||[]).map(r => ({ ...r, url: toUrl(r.file_path) })) })) };
  res.json({ success: true, claim: mapped });
});

router.put('/claims/:id', isAuthenticated, authorize('travel.claim.update'), async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body || {};
  if (Array.isArray(data.items)) {
    // Simple replace strategy
    await prisma.travelClaimItem.deleteMany({ where: { claim_id: id } });
    await prisma.travelClaimItem.createMany({ data: data.items.map(it => ({ claim_id: id, date: new Date(it.date), category: it.category, description: it.description || null, amount: Number(it.amount||0), receipt_path: it.receipt_path || null })) });
    const total = data.items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
    await prisma.travelClaim.update({ where: { id }, data: { total_claimed: total } });
  }
  const updated = await prisma.travelClaim.update({ where: { id }, data: { notes: data.notes || null } });
  const full = await prisma.travelClaim.findUnique({ where: { id }, include: { items: true } });
  res.json({ success: true, claim: full });
});

router.delete('/claims/:id', isAuthenticated, authorize('travel.claim.delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.travelClaim.update({ where: { id }, data: { is_deleted: true } });
  res.json({ success: true });
});

router.get('/claims/:id', isAuthenticated, authorize('travel.claim.read'), async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.travelClaim.findUnique({ where: { id }, include: { items: { include: { receipts: true } } } });
  if (!row || row.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  const withUrls = { ...row, items: (row.items||[]).map(i => ({ ...i, url: i.receipt_path ? toUrl(i.receipt_path) : null, receipts: (i.receipts||[]).map(r => ({ ...r, url: toUrl(r.file_path) })) })) };
  res.json({ success: true, claim: withUrls });
});

// Update a single claim item
router.put('/claims/:id/items/:itemId', isAuthenticated, authorize('travel.claim.update'), async (req, res) => {
  const claimId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const data = req.body || {};
  await prisma.travelClaimItem.update({ where: { id: itemId }, data: {
    date: data.date ? new Date(data.date) : undefined,
    category: data.category,
    description: data.description ?? null,
    amount: data.amount != null ? Number(data.amount) : undefined,
  }});
  // recompute total
  const agg = await prisma.travelClaimItem.aggregate({ where: { claim_id: claimId }, _sum: { amount: true } });
  await prisma.travelClaim.update({ where: { id: claimId }, data: { total_claimed: agg._sum.amount || 0 } });
  const full = await prisma.travelClaim.findUnique({ where: { id: claimId }, include: { items: true } });
  res.json({ success: true, claim: full });
});

// Delete a single claim item
router.delete('/claims/:id/items/:itemId', isAuthenticated, authorize('travel.claim.update'), async (req, res) => {
  const claimId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const item = await prisma.travelClaimItem.findUnique({ where: { id: itemId } });
  if (!item || item.claim_id !== claimId) return res.status(404).json({ success: false, error: 'Item not found' });
  // best-effort delete file if receipt exists
  if (item.receipt_path) {
    try {
      const abs = path.resolve(__dirname, '../../', item.receipt_path);
      await fs.unlink(abs).catch(()=>{});
    } catch(_) {}
  }
  await prisma.travelClaimItem.delete({ where: { id: itemId } });
  const agg = await prisma.travelClaimItem.aggregate({ where: { claim_id: claimId }, _sum: { amount: true } });
  await prisma.travelClaim.update({ where: { id: claimId }, data: { total_claimed: agg._sum.amount || 0 } });
  const full = await prisma.travelClaim.findUnique({ where: { id: claimId }, include: { items: true } });
  res.json({ success: true, claim: full });
});

// Upload receipts for a claim as new items (category based on query or default Misc)
const { uploadTravelClaim, uploadTravelClaimItem } = require('../config/multer');
router.post('/claims/:id/receipts', isAuthenticated, authorize('travel.claim.update'), uploadTravelClaim.array('files', 10), async (req, res) => {
  const id = Number(req.params.id);
  const category = (req.query.category || 'Misc').toString();
  if (!req.files?.length) return res.status(400).json({ success: false, error: 'No files uploaded' });
  const items = await prisma.$transaction(
    req.files.map(f => prisma.travelClaimItem.create({ data: { claim_id: id, date: new Date(), category, description: f.originalname, amount: 0, receipt_path: f._savedRelPath || '', mime_type: f.mimetype, file_size: f.size } }))
  );
  // recompute total
  const agg = await prisma.travelClaimItem.aggregate({ where: { claim_id: id }, _sum: { amount: true } });
  await prisma.travelClaim.update({ where: { id }, data: { total_claimed: agg._sum.amount || 0 } });
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  res.json({ success: true, items: items.map(i => ({ ...i, url: toUrl(i.receipt_path) })) });
});

// Upload receipts specifically for a claim item
router.post('/claims/:id/items/:itemId/receipts', isAuthenticated, authorize('travel.claim.update'), uploadTravelClaimItem.array('files', 10), async (req, res) => {
  const claimId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  if (!req.files?.length) return res.status(400).json({ success: false, error: 'No files uploaded' });
  await prisma.$transaction(
    req.files.map(f => prisma.travelClaimReceipt.create({ data: { item_id: itemId, file_path: f._savedRelPath || '', document_name: f.originalname, mime_type: f.mimetype, file_size: f.size } }))
  );
  // return updated claim
  const full = await prisma.travelClaim.findUnique({ where: { id: claimId }, include: { items: { include: { receipts: true } } } });
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  const mapped = { ...full, items: (full.items||[]).map(it => ({ ...it, url: it.receipt_path ? toUrl(it.receipt_path) : null, receipts: (it.receipts||[]).map(r => ({ ...r, url: toUrl(r.file_path) })) })) };
  res.json({ success: true, claim: mapped });
});

// Delete a specific receipt from a claim item
router.delete('/claims/:id/items/:itemId/receipts/:receiptId', isAuthenticated, authorize('travel.claim.update'), async (req, res) => {
  const claimId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const receiptId = Number(req.params.receiptId);
  const receipt = await prisma.travelClaimReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt || receipt.item_id !== itemId) return res.status(404).json({ success: false, error: 'Receipt not found' });
  try {
    const abs = path.resolve(__dirname, '../../', receipt.file_path);
    await fs.unlink(abs).catch(()=>{});
  } catch(_) {}
  await prisma.travelClaimReceipt.delete({ where: { id: receiptId } });
  const full = await prisma.travelClaim.findUnique({ where: { id: claimId }, include: { items: { include: { receipts: true } } } });
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  const mapped = { ...full, items: (full.items||[]).map(it => ({ ...it, url: it.receipt_path ? toUrl(it.receipt_path) : null, receipts: (it.receipts||[]).map(r => ({ ...r, url: toUrl(r.file_path) })) })) };
  res.json({ success: true, claim: mapped });
});

// Approve/Reject a travel request based on location/role rules
router.post('/requests/:id/decision', isAuthenticated, async (req, res) => {
  const id = Number(req.params.id);
  const action = String((req.body?.action || '')).toUpperCase(); // APPROVE | REJECT
  if (!['APPROVE','REJECT'].includes(action)) return res.status(400).json({ success: false, error: 'Invalid action' });

  const meEmpId = Number(req.session.user?.employee_id);
  if (!meEmpId) return res.status(400).json({ success: false, error: 'User not linked to employee' });

  const request = await prisma.travelRequest.findUnique({ where: { id }, include: { attendees: true } });
  if (!request || request.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
  if (request.status !== 'CREATED') return res.status(400).json({ success: false, error: 'Only CREATED requests can be decided' });

  // Applicant current employment with location
  const applicantEmployment = await prisma.employment.findFirst({
    where: { employee_id: request.applicant_id, is_current: true, is_deleted: false },
    include: { location: true }
  });
  const applicantLocType = applicantEmployment?.location?.type || 'HEAD_OFFICE';

  // Approver current employment with dept/designation
  const approverEmployment = await prisma.employment.findFirst({
    where: { employee_id: meEmpId, is_current: true, is_deleted: false },
    include: { department: true, designation: true }
  });
  const deptName = approverEmployment?.department?.name || '';
  const desigTitle = approverEmployment?.designation?.title || '';

  const isOps = /operations/i.test(deptName);
  const isDG = /^director\s+general$/i.test(desigTitle);

  // Authorization rules
  if (applicantLocType === 'BAZAAR') {
    if (!isOps) return res.status(403).json({ success: false, error: 'Only Operations can approve/reject bazaar requests' });
  } else {
    // HEAD_OFFICE (or default)
    if (!isDG) return res.status(403).json({ success: false, error: 'Only Director General can approve/reject head office requests' });
  }

  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  await prisma.travelRequest.update({ where: { id }, data: { status: newStatus } });
  await prisma.travelRequestStatusEntry.create({ data: { request_id: id, action: newStatus, actor_employee_id: meEmpId } });

  const full = await prisma.travelRequest.findUnique({ where: { id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
  res.json({ success: true, request: full });
});

// List pending approvals eligible for current user
router.get('/requests/pending-approvals', isAuthenticated, authorize('travel.read'), async (req, res) => {
  const meEmpId = Number(req.session.user?.employee_id);
  if (!meEmpId) return res.json({ success: true, requests: [] });

  // Determine approver role (Ops or DG)
  const approverEmployment = await prisma.employment.findFirst({
    where: { employee_id: meEmpId, is_current: true, is_deleted: false },
    include: { department: true, designation: true }
  });
  const deptName = approverEmployment?.department?.name || '';
  const desigTitle = approverEmployment?.designation?.title || '';
  const isOps = /operations/i.test(deptName);
  const isDG = /^director\s+general$/i.test(desigTitle);

  const allowedTypes = [];
  if (isOps) allowedTypes.push('BAZAAR');
  if (isDG) allowedTypes.push('HEAD_OFFICE');
  if (allowedTypes.length === 0) return res.json({ success: true, requests: [] });

  const list = await prisma.travelRequest.findMany({
    where: {
      is_deleted: false,
      status: 'CREATED',
      applicant: {
        employmentRecords: {
          some: {
            is_current: true,
            is_deleted: false,
            location: { is: { type: { in: allowedTypes } } }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      attendees: { include: { employee: true } },
      statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } },
    }
  });

  res.json({ success: true, requests: list });
});

module.exports = router;
