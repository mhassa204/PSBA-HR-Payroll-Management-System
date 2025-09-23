const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const upload = require('../config/multer');
const { isAuthenticated, authorize, authorizeAny } = require('../middleware/auth');
const workflowService = require('../services/workflowService');
const { uploadTravelRequest, uploadTravelClaim, uploadTravelClaimItem } = require('../config/multer');
const fs = require('fs').promises;
const path = require('path');

// Travel Requests CRUD
router.get('/requests', isAuthenticated, authorize('travel.read'), async (req, res) => {
  const list = await prisma.travelRequest.findMany({ where: { is_deleted: false }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, requests: list });
});

router.post('/requests', isAuthenticated, authorize('travel.create'), async (req, res) => {
  const data = req.body || {};
  const applicant_id = Number(data.applicant_id || req.session.user?.employee_id);
  const payload = {
    purpose: data.purpose || null,
    destination: data.destination || null,
    departure_date: data.departure_date ? new Date(data.departure_date) : null,
    departure_time: data.departure_time || null,
    return_date: data.return_date ? new Date(data.return_date) : null,
    return_time: data.return_time || null,
    total_days: data.total_days != null && data.total_days !== '' ? Number(data.total_days) : null,
    transport_mode: data.transport_mode || null,
    estimated_cost: data.estimated_cost != null && data.estimated_cost !== '' ? Number(data.estimated_cost) : null,
    cost_center: data.cost_center || null,
    applicant_id,
  };
  const created = await prisma.travelRequest.create({ data: payload });
  res.json({ success: true, request: created });
});

router.put('/requests/:id', isAuthenticated, authorize('travel.update'), async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body || {};
  const updateData = {};
  if ('purpose' in data) updateData.purpose = data.purpose || null;
  if ('destination' in data) updateData.destination = data.destination || null;
  if ('departure_date' in data) updateData.departure_date = data.departure_date ? new Date(data.departure_date) : null;
  if ('departure_time' in data) updateData.departure_time = data.departure_time || null;
  if ('return_date' in data) updateData.return_date = data.return_date ? new Date(data.return_date) : null;
  if ('return_time' in data) updateData.return_time = data.return_time || null;
  if ('total_days' in data) updateData.total_days = data.total_days != null && data.total_days !== '' ? Number(data.total_days) : null;
  if ('transport_mode' in data) updateData.transport_mode = data.transport_mode || null;
  if ('estimated_cost' in data) updateData.estimated_cost = data.estimated_cost != null && data.estimated_cost !== '' ? Number(data.estimated_cost) : null;
  if ('cost_center' in data) updateData.cost_center = data.cost_center || null;

  const updated = await prisma.travelRequest.update({ where: { id }, data: updateData });
  res.json({ success: true, request: updated });
});

router.delete('/requests/:id', isAuthenticated, authorize('travel.delete'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.travelRequest.update({ where: { id }, data: { is_deleted: true } });
  res.json({ success: true });
});

router.post('/requests/:id/submit', isAuthenticated, authorize('travel.submit'), async (req, res) => {
  const id = Number(req.params.id);
  const reqRow = await prisma.travelRequest.update({ where: { id }, data: { status: 'SUBMITTED' } });
  const inst = await workflowService.createInstanceFor('TravelRequest', id, 'travel.request');
  await prisma.travelRequest.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
  res.json({ success: true, request: await prisma.travelRequest.findUnique({ where: { id } }), workflow: inst });
});

router.get('/requests/:id', isAuthenticated, authorize('travel.read'), async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.travelRequest.findUnique({ where: { id }, include: { documents: true } });
  if (!row || row.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  const withUrls = { ...row, estimated_cost: row.estimated_cost ?? 0, documents: (row.documents||[]).map(d => ({ ...d, url: toUrl(d.file_path) })) };
  res.json({ success: true, request: withUrls });
});

// List documents for a request
router.get('/requests/:id/documents', isAuthenticated, authorize('travel.read'), async (req, res) => {
  const id = Number(req.params.id);
  const docs = await prisma.travelRequestDocument.findMany({ where: { request_id: id } });
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  res.json({ success: true, documents: docs.map(d => ({ ...d, url: toUrl(d.file_path) })) });
});

// Delete a document for a request
router.delete('/requests/:id/documents/:docId', isAuthenticated, authorize('travel.update'), async (req, res) => {
  const id = Number(req.params.id);
  const docId = Number(req.params.docId);
  const doc = await prisma.travelRequestDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.request_id !== id) return res.status(404).json({ success: false, error: 'Document not found' });
  // best-effort file delete
  try {
    const abs = path.resolve(__dirname, '../../', doc.file_path);
    await fs.unlink(abs).catch(()=>{});
  } catch (_) {}
  await prisma.travelRequestDocument.delete({ where: { id: docId } });
  res.json({ success: true });
});

// Travel Claims CRUD
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

router.post('/claims/:id/submit', isAuthenticated, authorize('travel.claim.submit'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.travelClaim.update({ where: { id }, data: { status: 'SUBMITTED' } });
  const inst = await workflowService.createInstanceFor('TravelClaim', id, 'travel.claim');
  await prisma.travelClaim.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
  res.json({ success: true, claim: await prisma.travelClaim.findUnique({ where: { id }, include: { items: true } }), workflow: inst });
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

// Upload documents for a travel request
router.post('/requests/:id/documents', isAuthenticated, authorize('travel.update'), uploadTravelRequest.array('files', 10), async (req, res) => {
  const id = Number(req.params.id);
  if (!req.files?.length) return res.status(400).json({ success: false, error: 'No files uploaded' });
  const created = await prisma.$transaction(
    req.files.map(f => prisma.travelRequestDocument.create({ data: { request_id: id, file_path: f._savedRelPath || '', document_name: f.originalname, mime_type: f.mimetype, file_size: f.size } }))
  );
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  res.json({ success: true, documents: created.map(d => ({ ...d, url: toUrl(d.file_path) })) });
});

// Upload receipts for a claim as new items (category based on query or default Misc)
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
  const items = await prisma.$transaction(
    req.files.map(f => prisma.travelClaimReceipt.create({ data: { item_id: itemId, file_path: f._savedRelPath || '', document_name: f.originalname, mime_type: f.mimetype, file_size: f.size } }))
  );
  const toUrl = (p) => (p ? `${req.protocol}://${req.get('host')}/${String(p).replace(/^\//,'')}` : null);
  const recs = items.map(i => ({ ...i, url: toUrl(i.file_path) }));
  // return updated claim
  const full = await prisma.travelClaim.findUnique({ where: { id: claimId }, include: { items: { include: { receipts: true } } } });
  const mapped = { ...full, items: (full.items||[]).map(it => ({ ...it, url: it.receipt_path ? toUrl(it.receipt_path) : null, receipts: (it.receipts||[]).map(r => ({ ...r, url: toUrl(r.file_path) })) })) };
  res.json({ success: true, claim: mapped, receipts: recs });
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

// Workflow Settings: read definition
router.get('/settings/workflows/:key', isAuthenticated, authorize('travel.settings.read'), async (req, res) => {
  const key = req.params.key;
  const def = await prisma.workflowDefinition.findUnique({ where: { key }, include: { steps: { orderBy: { order: 'asc' } } } });
  if (!def) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ success: true, workflow: def });
});

// Workflow Settings: update definition steps wholesale (replace)
router.put('/settings/workflows/:key', isAuthenticated, authorize('travel.settings.update'), async (req, res) => {
  const key = req.params.key;
  const { name, is_active, steps } = req.body || {};
  const def = await prisma.workflowDefinition.upsert({ where: { key }, update: { name, is_active }, create: { key, name: name || key, is_active: !!is_active } });
  if (Array.isArray(steps)) {
    await prisma.workflowStepDefinition.deleteMany({ where: { workflow_definition_id: def.id } });
    for (const s of steps) {
      await prisma.workflowStepDefinition.create({ data: { workflow_definition_id: def.id, order: Number(s.order), name: s.name, approval_mode: s.approval_mode || 'ALL', required_count: s.required_count || null, dynamic_assignees: s.dynamic_assignees || [] } });
    }
  }
  const full = await prisma.workflowDefinition.findUnique({ where: { key }, include: { steps: { orderBy: { order: 'asc' } } } });
  res.json({ success: true, workflow: full });
});

// Approvals
router.get('/approvals/my', isAuthenticated, authorizeAny(['travel.approval','travel.claim.verify','travel.claim.approval']), async (req, res) => {
  const userId = req.session.user.id;
  const steps = await workflowService.getPendingForUser(userId);
  res.json({ success: true, steps });
});

router.post('/approvals/:instanceId/act', isAuthenticated, authorizeAny(['travel.approval','travel.claim.verify','travel.claim.approval']), async (req, res) => {
  const instanceId = Number(req.params.instanceId);
  const { decision, comment } = req.body || {};
  const result = await workflowService.actOnInstance(instanceId, req.session.user.id, decision, comment);
  res.json({ success: true, result });
});

module.exports = router;
