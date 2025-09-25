const travelService = require('../../services/travel/travelRequestService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  reportees: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    if (!ctx.meEmpId) return res.json({ success: true, employees: [] });
    if (!ctx.canCreateOrOwn) return res.status(403).json({ success: false, error: 'Forbidden' });
    const employees = await travelService.listReporteesPlusSelf(ctx.meEmpId);
    res.json({ success: true, employees });
  },
  listManage: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    if (!ctx.canViewAll && !ctx.isSuperAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    const list = await travelService.listManage(ctx);
    res.json({ success: true, requests: list });
  },
  listPendingApprovals: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const list = await travelService.listPendingApprovals(ctx);
      res.json({ success: true, requests: list });
    } catch (err) {
      console.error('Pending approvals query error', err);
      res.status(500).json({ success: false, error: 'Failed to load pending approvals', details: err.message });
    }
  },
  listMine: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    if (!ctx.meEmpId) return res.json({ success: true, requests: [] });
    if (!ctx.canCreateOrOwn) return res.status(403).json({ success: false, error: 'Forbidden' });
    const list = await travelService.listMine(ctx.meEmpId);
    res.json({ success: true, requests: list });
  },
  create: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    if (!ctx.meEmpId) return res.status(400).json({ success: false, error: 'Applicant not linked to user' });
    if (!ctx.canCreateOrOwn) return res.status(403).json({ success: false, error: 'Forbidden' });
    const data = req.body || {};
    if (!data.departure_date) return res.status(400).json({ success: false, error: 'departure_date is required' });
    if (!data.expected_return_date) return res.status(400).json({ success: false, error: 'expected_return_date is required' });
    const computedDays = travelService.computeTotalDays(data.departure_date, data.departure_time, data.expected_return_date);
    if (data.total_days != null && data.total_days !== '' && Number(data.total_days) !== computedDays) {
      return res.status(400).json({ success: false, error: `total_days (${data.total_days}) does not match date range (${computedDays})` });
    }
    const attendeeIds = Array.isArray(data.employee_ids) ? data.employee_ids.map(Number).filter(Boolean) : [];
    const full = await travelService.createRequest(ctx, data, attendeeIds, computedDays);
    res.json({ success: true, request: full });
  },
  update: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const id = Number(req.params.id);
    const data = req.body || {};
    const hasManage = (req.session.user?.permissions || []).includes('travel.manage') || ctx.isSuperAdmin;
    if (!hasManage) {
      const existing = await travelService.getById(id);
      if (!existing || existing.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
      if (existing.applicant_id !== ctx.meEmpId) return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const existing = await travelService.getById(id);
    if (!existing || existing.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
    const depDate = data.departure_date ? new Date(data.departure_date) : existing.departure_date;
    const depTime = ('departure_time' in data) ? (data.departure_time || null) : existing.departure_time;
    const retDate = data.expected_return_date ? new Date(data.expected_return_date) : existing.expected_return_date;
    const computedDays = travelService.computeTotalDays(depDate, depTime, retDate);
    if (data.total_days != null && data.total_days !== '' && Number(data.total_days) !== computedDays) {
      return res.status(400).json({ success: false, error: `total_days (${data.total_days}) does not match date range (${computedDays})` });
    }
    const attendeeIds = Array.isArray(data.employee_ids) ? data.employee_ids.map(Number).filter(Boolean) : undefined;
    const full = await travelService.updateRequest(id, data, attendeeIds, computedDays);
    res.json({ success: true, request: full });
  },
  remove: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const id = Number(req.params.id);
    const row = await travelService.getById(id);
    if (!row || row.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
    const hasManage = (req.session.user?.permissions || []).includes('travel.manage') || ctx.isSuperAdmin;
    if (!hasManage && row.applicant_id !== ctx.meEmpId) return res.status(403).json({ success: false, error: 'Forbidden' });
    if (row.status !== 'CREATED') return res.status(400).json({ success: false, error: 'Only CREATED requests can be deleted' });
    await travelService.softDelete(id);
    res.json({ success: true });
  },
  getOne: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const id = Number(req.params.id);
    const row = await travelService.getById(id);
    if (!row || row.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
    if (!ctx.canViewAll) {
      const me = ctx.meEmpId;
      const isApplicant = row.applicant_id === me;
      const isAttendee = (row.attendees || []).some(a => a.employee_id === me);
      if (!isApplicant && !isAttendee) return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    res.json({ success: true, request: row });
  },
  legacyDecision: async (req, res) => {
    const id = Number(req.params.id);
    const action = String((req.body?.action || '')).toUpperCase();
    if (!['APPROVE','REJECT'].includes(action)) return res.status(400).json({ success: false, error: 'Invalid action' });
    const meEmpId = Number(req.session.user?.employee_id);
    if (!meEmpId) return res.status(400).json({ success: false, error: 'User not linked to employee' });
    const request = await travelService.getById(id);
    if (!request || request.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
    if (request.status !== 'CREATED') return res.status(400).json({ success: false, error: 'Only CREATED requests can be decided' });
    const applicantEmployment = await prisma.employment.findFirst({ where: { employee_id: request.applicant_id, is_current: true, is_deleted: false }, include: { location: true } });
    const applicantLocType = applicantEmployment?.location?.type || 'HEAD_OFFICE';
    const approverEmployment = await prisma.employment.findFirst({ where: { employee_id: meEmpId, is_current: true, is_deleted: false }, include: { department: true, designation: true } });
    const deptName = approverEmployment?.department?.name || '';
    const desigTitle = approverEmployment?.designation?.title || '';
    const isOps = /operations/i.test(deptName);
    const isDG = /^director\s+general$/i.test(desigTitle);
    if (applicantLocType === 'BAZAAR') { if (!isOps) return res.status(403).json({ success: false, error: 'Only Operations can approve/reject bazaar requests' }); }
    else { if (!isDG) return res.status(403).json({ success: false, error: 'Only Director General can approve/reject head office requests' }); }
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const full = await travelService.legacyDecision(id, newStatus, meEmpId);
    res.json({ success: true, request: full });
  },
  capabilities: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    res.json({ success: true, capabilities: {
      canCreateOrOwn: ctx.canCreateOrOwn || ctx.isSuperAdmin,
      canViewAll: ctx.canViewAll || ctx.isSuperAdmin,
      isOps: ctx.isOps,
      isHR: ctx.isHR,
      isDG: ctx.isDG,
      isSuperAdmin: ctx.isSuperAdmin,
      locType: ctx.locType,
      isBps17Plus: ctx.isBps17Plus,
    }});
  },
  updateStatusFlexible: async (req, res) => {
    const id = Number(req.params.id);
    const targetStatus = String(req.body?.status || '').toUpperCase();
    if (!['CREATED','APPROVED','REJECTED'].includes(targetStatus)) return res.status(400).json({ success: false, error: 'Invalid status' });
    const meEmpId = Number(req.session.user?.employee_id);
    if (!meEmpId) return res.status(400).json({ success: false, error: 'User not linked to employee' });
    const request = await travelService.getById(id);
    if (!request || request.is_deleted) return res.status(404).json({ success: false, error: 'Not found' });
    const applicantEmployment = await prisma.employment.findFirst({ where: { employee_id: request.applicant_id, is_current: true, is_deleted: false }, include: { location: true } });
    const applicantLocType = applicantEmployment?.location?.type || 'HEAD_OFFICE';
    const approverEmployment = await prisma.employment.findFirst({ where: { employee_id: meEmpId, is_current: true, is_deleted: false }, include: { department: true, designation: true } });
    const deptName = approverEmployment?.department?.name || '';
    const desigTitle = approverEmployment?.designation?.title || '';
    const isOps = /operations/i.test(deptName);
    const isDG = /^director\s+general$/i.test(desigTitle);
    const isHR = /^hr$/i.test(deptName) || /human\s*resources/i.test(deptName);
    const isSuperAdmin = (req.session.user?.role?.name === 'Super Admin') || (req.session.user?.permissions||[]).includes('*');
    if (isHR && !isSuperAdmin) return res.status(403).json({ success: false, error: 'HR cannot modify status' });
    if (!isSuperAdmin) {
      if (applicantLocType === 'BAZAAR' && !isOps) return res.status(403).json({ success: false, error: 'Only Operations can modify bazaar requests' });
      if (applicantLocType === 'HEAD_OFFICE' && !isDG) return res.status(403).json({ success: false, error: 'Only Director General can modify head office requests' });
    }
    if (request.status === targetStatus) {
      const full = await travelService.getById(id);
      return res.json({ success: true, request: full });
    }
    const full = await travelService.updateStatusFlexible(id, targetStatus, meEmpId);
    res.json({ success: true, request: full });
  }
};
