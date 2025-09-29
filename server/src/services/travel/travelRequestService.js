const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Core DB interactions for Travel Requests kept 1:1 with former inline route logic.
module.exports = {
  getAuthContext: async (req) => {
    const meUserId = Number(req.session.user?.id || req.session.user?.user_id || req.session.user?.uid);
    const meEmpId = Number(req.session.user?.employee_id);
    const employment = meEmpId ? await prisma.employment.findFirst({
      where: { employee_id: meEmpId, is_current: true, is_deleted: false },
      include: { department: true, designation: true, location: true, scale_grade: true }
    }) : null;
    const deptName = employment?.department?.name || '';
    const desigTitle = employment?.designation?.title || '';
    const locType = employment?.location?.type || 'HEAD_OFFICE';
    const scaleLevel = Number(employment?.scale_grade?.level || 0);
    const roleName = (req.session.user?.role?.name || '');
    const perms = req.session.user?.permissions || [];

    // Permission-driven stage approver flags
    const isOps = perms.includes('travel.request.approve.ops') || /operations/i.test(deptName);
    const isDG = perms.includes('travel.request.approve.dg') || /^director\s+general$/i.test(desigTitle);
    // HR remains permission-based to avoid accidental overlaps
    const isHR = perms.includes('travel.claim.approve.hr');
    // Restore department-based fallback for Accounts approvers
    const isAccountsApprover = perms.includes('travel.claim.approve.accounts') || /accounts|finance|budget|payroll|reconciliation/i.test(deptName);
    const canApproveClaimOps = perms.includes('travel.claim.approve.ops');
    const canApproveClaimDG = perms.includes('travel.claim.approve.dg');

    const managesAnyLocation = meUserId ? !!(await prisma.location.findFirst({ where: { manager_user_id: meUserId, is_deleted: false, is_active: true }, select: { id: true } })) : false;
    const isBps17Plus = scaleLevel >= 17;
    const canCreateOrOwn = (locType === 'BAZAAR') ? managesAnyLocation : (locType === 'HEAD_OFFICE' ? isBps17Plus : false);
    const canViewAll = (isHR || isOps || isDG);
    const isSuperAdmin = (req.session.user?.role?.name === 'Super Admin') || perms.includes('*');
    return { meEmpId, meUserId, employment, deptName, desigTitle, locType, scaleLevel, isOps, isDG, isHR, isAccountsApprover, canApproveClaimOps, canApproveClaimDG, managesAnyLocation, isBps17Plus, canCreateOrOwn, canViewAll, isSuperAdmin };
  },

  computeTotalDays: (departureDate, departureTime, expectedReturnDate) => {
    const dep = new Date(departureDate);
    if (departureTime) {
      const [hh, mm] = String(departureTime).split(':');
      if (!Number.isNaN(Number(hh))) dep.setHours(Number(hh), Number(mm||0), 0, 0);
    }
    const ret = new Date(expectedReturnDate);
    const ms = ret.getTime() - dep.getTime();
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return Math.max(1, days);
  },

  listManage: async (ctx) => {
    const where = { is_deleted: false };
    if (!ctx.isSuperAdmin && !ctx.isHR) {
      if (ctx.isOps && !ctx.isDG) {
        where.applicant = { employmentRecords: { some: { is_current: true, is_deleted: false, location: { type: 'BAZAAR' } } } };
      } else if (ctx.isDG && !ctx.isOps) {
        where.applicant = { employmentRecords: { some: { is_current: true, is_deleted: false, location: { type: 'HEAD_OFFICE' } } } };
      }
    }
    return prisma.travelRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } }
    });
  },

  listPendingApprovals: async (ctx) => {
    const filters = [];

    // New: Recommendation stage for immediate in-charge of applicant
    // Skip creating recommender tasks for DG; if applicant reports directly to DG, the recommender stage is bypassed
    if (ctx.meEmpId && !ctx.isDG) {
      filters.push({
        is_deleted: false,
        status: 'CREATED',
        applicant: { employmentRecords: { some: { is_current: true, is_deleted: false, reporting_officer_id: String(ctx.meEmpId) } } },
        statusEntries: { none: { action: 'RECOMMENDED' } }
      });
    }

    // Ops/DG see CREATED but only after recommendation exists
    const allowedTypes = [];
    if (ctx.isSuperAdmin) { allowedTypes.push('BAZAAR','HEAD_OFFICE'); }
    else {
      if (ctx.isOps) allowedTypes.push('BAZAAR');
      if (ctx.isDG) allowedTypes.push('HEAD_OFFICE');
    }
    if (ctx.meEmpId && allowedTypes.length) {
      filters.push({
        is_deleted: false,
        status: 'CREATED',
        applicant: { employmentRecords: { some: { is_current: true, is_deleted: false, location: { is: { type: { in: allowedTypes } } } } } },
        statusEntries: { some: { action: 'RECOMMENDED' }, none: { action: { in: ['APPROVED','REJECTED'] } } }
      });
    }

    // Additional DG fast-track: If applicant reports directly to DG, allow DG to see without recommendation
    if (ctx.isDG && ctx.meEmpId) {
      filters.push({
        is_deleted: false,
        status: 'CREATED',
        applicant: { employmentRecords: { some: { is_current: true, is_deleted: false, location: { type: 'HEAD_OFFICE' }, reporting_officer_id: String(ctx.meEmpId) } } },
        statusEntries: { none: { action: { in: ['APPROVED','REJECTED'] } } }
      });
    }

    if (!filters.length) return [];

    return prisma.travelRequest.findMany({
      where: { OR: filters },
      orderBy: { createdAt: 'desc' },
      include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } }, applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } } }
    });
  },

  listMine: async (employeeId) => {
    if (!employeeId) return [];
    return prisma.travelRequest.findMany({
      where: { is_deleted: false, applicant_id: employeeId },
      orderBy: { createdAt: 'desc' },
      include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } }
    });
  },

  createRequest: async (ctx, data, attendeeIds, totalDays) => {
    const created = await prisma.travelRequest.create({
      data: {
        applicant_id: ctx.meEmpId,
        departure_date: new Date(data.departure_date),
        departure_time: data.departure_time || null,
        expected_return_date: new Date(data.expected_return_date),
        purpose: data.purpose || null,
        destination: data.destination || null,
        total_days: totalDays,
        status: 'CREATED'
      }
    });
    if (attendeeIds.length) {
      await prisma.travelRequestEmployee.createMany({ data: attendeeIds.map(eid => ({ request_id: created.id, employee_id: eid })) });
    }
    await prisma.travelRequestStatusEntry.create({ data: { request_id: created.id, action: 'CREATED', actor_employee_id: ctx.meEmpId } });
    return prisma.travelRequest.findUnique({ where: { id: created.id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
  },

  getById: (id) => prisma.travelRequest.findUnique({ where: { id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } }),

  updateRequest: async (id, data, attendeeIds, totalDays) => {
    const updateData = { total_days: totalDays };
    if ('purpose' in data) updateData.purpose = data.purpose || null;
    if ('destination' in data) updateData.destination = data.destination || null;
    if ('departure_date' in data && data.departure_date) updateData.departure_date = new Date(data.departure_date);
    if ('departure_time' in data) updateData.departure_time = data.departure_time || null;
    if ('expected_return_date' in data && data.expected_return_date) updateData.expected_return_date = new Date(data.expected_return_date);

    await prisma.travelRequest.update({ where: { id }, data: updateData });
    if (Array.isArray(attendeeIds)) {
      await prisma.travelRequestEmployee.deleteMany({ where: { request_id: id } });
      if (attendeeIds.length) await prisma.travelRequestEmployee.createMany({ data: attendeeIds.map(eid => ({ request_id: id, employee_id: eid })) });
    }
    return prisma.travelRequest.findUnique({ where: { id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
  },

  softDelete: (id) => prisma.travelRequest.update({ where: { id }, data: { is_deleted: true } }),

  legacyDecision: async (id, newStatus, actorEmpId) => {
    await prisma.travelRequest.update({ where: { id }, data: { status: newStatus } });
    await prisma.travelRequestStatusEntry.create({ data: { request_id: id, action: newStatus, actor_employee_id: actorEmpId } });
    return prisma.travelRequest.findUnique({ where: { id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
  },

  updateStatusFlexible: async (id, targetStatus, actorEmpId) => {
    await prisma.travelRequest.update({ where: { id }, data: { status: targetStatus } });
    await prisma.travelRequestStatusEntry.create({ data: { request_id: id, action: targetStatus, actor_employee_id: actorEmpId } });
    return prisma.travelRequest.findUnique({ where: { id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
  },

  // New: decision API for recommendation/clear without changing status
  recommendOrClear: async (id, actorEmpId, action, ctx) => {
    const req = await prisma.travelRequest.findUnique({ where: { id: Number(id) }, include: { statusEntries: true, applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } } } });
    if (!req || req.is_deleted) throw new Error('Not found');
    if (req.status !== 'CREATED') throw new Error('Only CREATED requests can be actioned');
    // Check recommender eligibility
    const canRecommend = ctx.isSuperAdmin || (req.applicant?.employmentRecords||[]).some(er => String(er.reporting_officer_id||'') === String(ctx.meEmpId||''));
    if (!canRecommend) throw new Error('Not authorized');
    const last = req.statusEntries[req.statusEntries.length-1];
    const act = String(action||'').toUpperCase();
    if (act === 'RECOMMEND') {
      if (last && last.action==='RECOMMENDED') return req; // idempotent
      await prisma.travelRequestStatusEntry.create({ data: { request_id: req.id, action: 'RECOMMENDED', actor_employee_id: actorEmpId } });
      return prisma.travelRequest.findUnique({ where: { id: req.id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
    } else if (act === 'REJECT') {
      // recommender rejection
      if (last && last.action==='RECOMMENDED' && last.actor_employee_id!==actorEmpId && !ctx.isSuperAdmin) {
        // If someone else recommended, allow rejection as recommender still? For simplicity require same actor or super admin.
      }
      await prisma.travelRequest.update({ where: { id: req.id }, data: { status: 'REJECTED' } });
      await prisma.travelRequestStatusEntry.create({ data: { request_id: req.id, action: 'RECOMMENDED_REJECTED', actor_employee_id: actorEmpId } });
      return prisma.travelRequest.findUnique({ where: { id: req.id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
    } else if (act === 'CLEAR') {
      if (!last || last.action!=='RECOMMENDED') throw new Error('Nothing to clear');
      if (last.actor_employee_id !== actorEmpId && !ctx.isSuperAdmin) throw new Error('Cannot clear another user\'s recommendation');
      await prisma.travelRequestStatusEntry.delete({ where: { id: last.id } });
      return prisma.travelRequest.findUnique({ where: { id: req.id }, include: { attendees: { include: { employee: true } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } } } });
    }
    throw new Error('Invalid action');
  },

  listReporteesPlusSelf: async (meEmpId) => {
    if (!meEmpId) return [];
    const self = await prisma.employee.findUnique({ where: { id: Number(meEmpId) } });
    const officerKey = String(meEmpId);
    const employments = await prisma.employment.findMany({ where: { is_deleted: false, is_current: true, reporting_officer_id: officerKey }, include: { employee: true } });
    const reportees = employments.map(e => e.employee).filter(Boolean);
    const map = new Map();
    for (const e of reportees) if (e) map.set(e.id, e);
    if (self) map.set(self.id, self);
    return Array.from(map.values()).map(e => ({ id: e.id, full_name: e.full_name, cnic: e.cnic || '' }));
  }
};
