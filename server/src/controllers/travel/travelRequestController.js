const travelService = require('../../services/travel/travelRequestService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  reportees: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    if (!ctx.meEmpId) return res.json({ success: true, employees: [] });
    // Relaxed: do not gate by canCreateOrOwn; allow any logged-in employee to fetch self + direct reportees
    try {
      const employees = await travelService.listReporteesPlusSelf(ctx.meEmpId);
      res.json({ success: true, employees });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
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
    const data = req.body || {};
    try {
      if (ctx.meEmpId) {
        if (!ctx.canCreateOrOwn) return res.status(403).json({ success: false, error: 'Forbidden' });
        if (!data.departure_date) return res.status(400).json({ success: false, error: 'departure_date is required' });
        if (!data.expected_return_date) return res.status(400).json({ success: false, error: 'expected_return_date is required' });
        const computedDays = travelService.computeTotalDays(data.departure_date, data.departure_time, data.expected_return_date);
        if (data.total_days != null && data.total_days !== '' && Number(data.total_days) !== computedDays) {
          return res.status(400).json({ success: false, error: `total_days (${data.total_days}) does not match date range (${computedDays})` });
        }
        const attendeeIds = Array.isArray(data.employee_ids) ? data.employee_ids.map(Number).filter(Boolean) : [];
        const full = await travelService.createRequest(ctx, data, attendeeIds, computedDays);
        return res.json({ success: true, request: full });
      }

      // Department account path (no employee linked)
      const applicant_id = Number(data.applicant_id);
      if (!applicant_id) return res.status(400).json({ success:false, error: 'applicant_id is required for department account' });
      if (!data.departure_date) return res.status(400).json({ success:false, error: 'departure_date is required' });
      if (!data.expected_return_date) return res.status(400).json({ success:false, error: 'expected_return_date is required' });
      // Ensure applicant is BPS < 17
      const emp = await prisma.employment.findFirst({ where: { employee_id: applicant_id, is_current: true, is_deleted: false }, include: { scale_grade: true } });
      const isLowBps = !!(emp?.scale_grade && emp.scale_grade.category === 'BPS' && Number(emp.scale_grade.level||0) < 17);
      if (!isLowBps) return res.status(403).json({ success:false, error: 'Only BPS < 17 applicants can be created via department account' });
      const computedDays = travelService.computeTotalDays(data.departure_date, data.departure_time, data.expected_return_date);
      const attendeeIds = Array.isArray(data.employee_ids) ? data.employee_ids.map(Number).filter(Boolean) : [];
      const full = await travelService.createRequestOnBehalf({ ...ctx, meEmpId: applicant_id }, data, attendeeIds, computedDays, null);
      return res.json({ success:true, request: full });
    } catch (e) {
      console.error('Create request error', e);
      return res.status(400).json({ success:false, error: e.message });
    }
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
      isAccountsApprover: ctx.isAccountsApprover,
      canApproveClaimOps: ctx.canApproveClaimOps,
      canApproveClaimDG: ctx.canApproveClaimDG,
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
  },
  recommend: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const id = Number(req.params.id);
      const result = await travelService.recommendOrClear(id, ctx.meEmpId, 'RECOMMEND', ctx);
      res.json({ success: true, request: result });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  clearRecommendation: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const id = Number(req.params.id);
      const result = await travelService.recommendOrClear(id, ctx.meEmpId, 'CLEAR', ctx);
      res.json({ success: true, request: result });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  recommendDecision: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const id = Number(req.params.id);
      const action = String(req.body?.action || '').toUpperCase();
      if (!['RECOMMEND','REJECT','CLEAR'].includes(action)) return res.status(400).json({ success:false, error:'Invalid action' });
      const result = await travelService.recommendOrClear(id, ctx.meEmpId, action, ctx);
      res.json({ success: true, request: result });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },

  // For manual entry: list reportees of a selected applicant
  reporteesOfApplicant: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) return res.status(403).json({ success:false, error:'Forbidden' });
      const applicantId = Number(req.params.id);
      if (!applicantId) return res.status(400).json({ success:false, error:'Invalid applicant id' });
      const officerKey = String(applicantId);
      const employments = await prisma.employment.findMany({ where: { is_deleted: false, is_current: true, reporting_officer_id: officerKey }, include: { employee: true } });
      const reportees = employments.map(e => e.employee).filter(Boolean).map(e => ({ id: e.id, full_name: e.full_name, cnic: e.cnic || '' }));
      res.json({ success:true, employees: reportees });
    } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },

  // ================= Accounts Manual Entry (TADA) =================
  searchEmployees: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) return res.status(403).json({ success:false, error:'Forbidden' });
      const q = String(req.query.q||'').trim();
      const where = q ? {
        is_deleted: false,
        OR: [
          { full_name: { contains: q, mode: 'insensitive' } },
          { cnic: { contains: q, mode: 'insensitive' } }
        ]
      } : { is_deleted: false };
      const emps = await prisma.employee.findMany({ where, orderBy: { full_name: 'asc' }, take: 50, select: { id: true, full_name: true, cnic: true } });
      res.json({ success:true, employees: emps });
    } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },

  manualCreate: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) return res.status(403).json({ success:false, error:'Forbidden' });
      const data = req.body || {};
      const applicant_id = Number(data.applicant_id);
      if (!applicant_id) return res.status(400).json({ success:false, error:'applicant_id is required' });
      if (!data.departure_date) return res.status(400).json({ success:false, error:'departure_date is required' });
      if (!data.expected_return_date) return res.status(400).json({ success:false, error:'expected_return_date is required' });
      const computedDays = travelService.computeTotalDays(data.departure_date, data.departure_time, data.expected_return_date);
      const attendeeIds = Array.isArray(data.employee_ids) ? data.employee_ids.map(Number).filter(Boolean) : [];
      const full = await travelService.createRequestOnBehalf({ ...ctx, meEmpId: applicant_id }, data, attendeeIds, computedDays, ctx.meEmpId);
      res.json({ success:true, request: full });
    } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },

  manualDecision: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) return res.status(403).json({ success:false, error:'Forbidden' });
      const id = Number(req.params.id);
      const { stage, actor_employee_id, action } = req.body || {};
      const actorEmpId = Number(actor_employee_id);
      const act = String(action||'').toUpperCase();
      if (!['RECOMMEND','REJECT','APPROVE','CLEAR'].includes(act)) return res.status(400).json({ success:false, error:'Invalid action' });
      const full = await travelService.manualDecision(id, { stage, actorEmpId, action: act }, ctx);
      res.json({ success:true, request: full });
    } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  }
};
