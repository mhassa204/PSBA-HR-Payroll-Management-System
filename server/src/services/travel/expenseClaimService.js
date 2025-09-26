const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const withinLastNDays = (date, days) => {
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / (1000*60*60*24);
  return diff <= days;
};

async function getEmployeeScaleGrade(employeeId){
  const emp = await prisma.employment.findFirst({ where: { employee_id: employeeId, is_current: true }, include: { scale_grade: true } });
  return emp?.scale_grade_id ? { id: emp.scale_grade_id, grade: emp.scale_grade } : null;
}
async function getRatesForEmployee(employeeId){
  const sg = await getEmployeeScaleGrade(employeeId);
  if(!sg) return { rate_per_km: 0, per_diem_rate: 0 };
  const rate = await prisma.travelRate.findFirst({ where: { scale_grade_id: sg.id, is_active: true } });
  return { rate_per_km: rate?.rate_per_km || 0, per_diem_rate: rate?.per_diem_rate || 0 };
}

module.exports = {
  getAuthContext: async (req) => {
    const employee_id = Number(req.session.user?.employee_id);
    const isSuperAdmin = (req.session.user?.role?.name === 'Super Admin') || (req.session.user?.permissions||[]).includes('*');
    return { employee_id, isSuperAdmin };
  },
  listEligibleRequests: async (employee_id) => {
    if(!employee_id) return [];
    const requests = await prisma.travelRequest.findMany({
      where: { applicant_id: employee_id, status: 'APPROVED', is_deleted: false },
      include: { attendees: { include: { employee: true } }, claims: true }
    });
    return requests.filter(r => withinLastNDays(r.expected_return_date, 15));
  },
  listClaims: async (employee_id, isSuperAdmin) => {
    if(!employee_id) return [];
    const claims = await prisma.travelClaim.findMany({
      where: {
        is_deleted: false,
        ...(isSuperAdmin ? {} : { OR: [ { employee_id }, { request: { applicant_id: employee_id } } ] })
      },
      include: { documents: true, segments: true, employee: true, request: true },
      orderBy: { createdAt: 'desc' }
    });
    return claims;
  },
  createClaim: async (employee_id, data) => {
    if(!data.travel_request_id) throw new Error('travel_request_id required');
    if(!data.employee_id) throw new Error('employee_id required');
    const request = await prisma.travelRequest.findUnique({ where: { id: Number(data.travel_request_id) }, include: { attendees: true } });
    if(!request || request.applicant_id !== employee_id) throw new Error('Forbidden');
    if(request.status !== 'APPROVED') throw new Error('Request not approved');
    const attendeeEmpId = Number(data.employee_id);
    const isAttendee = request.attendees.some(a=>a.employee_id===attendeeEmpId);
    if(!isAttendee) throw new Error('Employee not attendee');
    const existing = await prisma.travelClaim.findFirst({ where: { travel_request_id: request.id, employee_id: attendeeEmpId, is_deleted: false } });
    if(existing) throw new Error('Claim already exists');
    const rates = await getRatesForEmployee(attendeeEmpId);
    const created = await prisma.travelClaim.create({ data: { travel_request_id: request.id, employee_id: attendeeEmpId, from_date: request.departure_date, to_date: request.expected_return_date, per_diem_days: 0, rate_per_km: rates.rate_per_km, per_diem_rate: rates.per_diem_rate, toll_tax_total: 0, transport_mode: 'OWN', fuel_total: 0, fare_total: 0 } });
    return prisma.travelClaim.findUnique({ where: { id: created.id }, include: { documents: true, segments: true, request: true, employee: true } });
  },
  _canAccess(claim, employee_id, isSuperAdmin) {
    if(isSuperAdmin) return true;
    if(!claim) return false;
    if(claim.employee_id === employee_id) return true;
    if(claim.request && claim.request.applicant_id === employee_id) return true;
    return false;
  },
  getClaim: async (id, employee_id, isSuperAdmin) => {
    const parsedId = Number(id);
    if(!Number.isInteger(parsedId) || parsedId <= 0){
      throw new Error('Invalid claim id');
    }
    const claim = await prisma.travelClaim.findUnique({ where: { id: parsedId }, include: { documents: true, segments: true, request: true, employee: true } });
    if(!claim || claim.is_deleted) return null;
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    // If draft and rates missing/zero, pull latest rates
    if(claim.status === 'DRAFT' && (!claim.rate_per_km || !claim.per_diem_rate)) {
      const rates = await getRatesForEmployee(claim.employee_id);
      const upd = await prisma.travelClaim.update({ where: { id: claim.id }, data: { rate_per_km: rates.rate_per_km, per_diem_rate: rates.per_diem_rate } });
      return prisma.travelClaim.findUnique({ where: { id: upd.id }, include: { documents: true, segments: true, request: true, employee: true } });
    }
    return claim;
  },
  updateClaim: async (id, employee_id, isSuperAdmin, data) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(id) }, include: { request: true, employee: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    const updateData = {};
    ['from_date','to_date'].forEach(f=>{ if(data[f]) updateData[f] = new Date(data[f]); });
    if('overnight_stay' in data) updateData.overnight_stay = !!data.overnight_stay;
    if('toll_tax_total' in data) updateData.toll_tax_total = Number(data.toll_tax_total||0);
    if('per_diem_days' in data) updateData.per_diem_days = Number(data.per_diem_days||0);
    // New fields
    if('transport_mode' in data) updateData.transport_mode = String(data.transport_mode||'OWN').toUpperCase();
    if('fuel_total' in data) updateData.fuel_total = Number(data.fuel_total||0);
    if('fare_total' in data) updateData.fare_total = Number(data.fare_total||0);
    // rates ignored if sent; always ensure populated
    if(!claim.rate_per_km || !claim.per_diem_rate){
      const rates = await getRatesForEmployee(claim.employee_id);
      if(!claim.rate_per_km) updateData.rate_per_km = rates.rate_per_km;
      if(!claim.per_diem_rate) updateData.per_diem_rate = rates.per_diem_rate;
    }
    await prisma.travelClaim.update({ where: { id: claim.id }, data: updateData });
    return module.exports.recomputeTotals(claim.id);
  },
  recomputeTotals: async (claimId) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { segments: true, documents: true, request: true, employee: true } });
    if(!claim) return null;
    const total_distance_km = (claim.segments||[]).reduce((s,a)=> s + Number(a.distance_km||0),0);
    const A = total_distance_km;
    const B = Number(claim.rate_per_km||0);
    const C = A * B;
    const D = Number(claim.toll_tax_total||0);
    const E = C + D;
    const per_diem_days = Number(claim.per_diem_days||0);
    const per_diem_rate = Number(claim.per_diem_rate||0);
    const F = per_diem_days * per_diem_rate;
    const G = E + F;
    await prisma.travelClaim.update({ where: { id: claim.id }, data: { total_distance_km: A, distance_amount: C, travel_total: E, per_diem_amount: F, grand_total: G } });
    return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: true, employee: true } });
  },
  addSegment: async (claimId, employee_id, isSuperAdmin, payload) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    await prisma.travelClaimSegment.create({ data: { 
      claim_id: claim.id,
      departure_from: payload.departure_from || '',
      departure_to: payload.departure_to||'',
      depart_date: payload.depart_date ? new Date(payload.depart_date) : null,
      depart_time: payload.depart_time||null,
      arrive_date: payload.arrive_date ? new Date(payload.arrive_date) : null,
      arrive_time: payload.arrive_time||null,
      mode: payload.mode||null,
      distance_km: Number(payload.distance_km||0)
    } });
    return module.exports.recomputeTotals(claim.id);
  },
  updateSegment: async (claimId, segmentId, employee_id, isSuperAdmin, payload) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    const seg = await prisma.travelClaimSegment.findUnique({ where: { id: Number(segmentId) } });
    if(!seg || seg.claim_id !== claim.id) throw new Error('Not found');
    await prisma.travelClaimSegment.update({ where: { id: seg.id }, data: { 
      departure_from: payload.departure_from || '',
      departure_to: payload.departure_to||'',
      depart_date: payload.depart_date ? new Date(payload.depart_date) : seg.depart_date,
      depart_time: payload.depart_time||null,
      arrive_date: payload.arrive_date ? new Date(payload.arrive_date) : seg.arrive_date,
      arrive_time: payload.arrive_time||null,
      mode: payload.mode||null,
      distance_km: Number(payload.distance_km||0)
    } });
    return module.exports.recomputeTotals(claim.id);
  },
  deleteSegment: async (claimId, segmentId, employee_id, isSuperAdmin) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    await prisma.travelClaimSegment.deleteMany({ where: { id: Number(segmentId), claim_id: claim.id } });
    return module.exports.recomputeTotals(claim.id);
  },
  addDocuments: async (claimId, employee_id, isSuperAdmin, files, category) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { documents: true, request: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    const cat = String(category||'OTHER').toUpperCase();
    // Allow multiple REPORT uploads; submission will ensure at least one exists
    const createMany = files.map(f => ({ claim_id: claim.id, category: cat, file_path: f._savedRelPath || f.path.replace(/.*uploads[\\\\/]/,'uploads/'), mime_type: f.mimetype, file_size: f.size }));
    await prisma.travelClaimDocument.createMany({ data: createMany });
    return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: true, employee: true } });
  },
  deleteDocument: async (claimId, docId, employee_id, isSuperAdmin) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true, documents: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    const doc = await prisma.travelClaimDocument.findUnique({ where: { id: Number(docId) } });
    if(!doc || doc.claim_id !== claim.id) throw new Error('Not found');
    // Allow deleting REPORT too; submission requires at least one remaining
    await prisma.travelClaimDocument.delete({ where: { id: doc.id } });
    return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: true, employee: true } });
  },
  deleteClaim: async (id, employee_id, isSuperAdmin) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(id) }, include: { request: true, documents: true, segments: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims deletable');
    await prisma.travelClaim.delete({ where: { id: claim.id } });
    return { success: true };
  },
  submitClaim: async (id, employee_id, isSuperAdmin) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: { documents: true, request: true, employee: true }
    });
    if(!claim) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims can be submitted');
    const hasReport = (claim.documents||[]).some(d=>d.category==='REPORT');
    if(!hasReport) throw new Error('Report document required before submission');
    await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: 'SUBMITTED' } });
    await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: 'SUBMITTED', actor_employee_id: employee_id } });
    return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: true, employee: true, statusEntries: { orderBy: { createdAt: 'asc' } } } });
  },
  listPendingApprovals: async (ctx) => {
    // Adjusted to new fixed statuses with strict stage guards
    const stageFilters = [];

    // First stage pending -> SUBMITTED (no prior OPS/DG decision)
    const firstStageNone = { action: { in: ['OPS_APPROVED','OPS_REJECTED','DG_APPROVED','DG_REJECTED'] } };
    if (ctx.isOps || ctx.canApproveClaimOps) {
      stageFilters.push({
        status: 'SUBMITTED',
        employee: { employmentRecords: { some: { is_current: true, location: { type: 'BAZAAR' } } } },
        statusEntries: { none: firstStageNone }
      });
    }
    if (ctx.isDG || ctx.canApproveClaimDG) {
      stageFilters.push({
        status: 'SUBMITTED',
        employee: { employmentRecords: { some: { is_current: true, location: { type: 'HEAD_OFFICE' } } } },
        statusEntries: { none: firstStageNone }
      });
    }

    // HR after first-stage approval -> status APPROVED
    // Must have an OPS/DG approval and NO HR decision yet
    if (ctx.isHR) {
      stageFilters.push({
        status: 'APPROVED',
        statusEntries: {
          some: { action: { in: ['OPS_APPROVED','DG_APPROVED'] } },
          none: { action: { in: ['HR_APPROVED','HR_REJECTED'] } }
        }
      });
    }

    // Accounts after HR -> status VERIFIED
    // Must have HR approval and NO Accounts decision yet
    // Additionally, if the current user was the HR approver, exclude it from their pending list
    if (ctx.isAccountsApprover) {
      stageFilters.push({
        status: 'VERIFIED',
        statusEntries: {
          // ensure HR approval exists by someone other than the current user
          some: { AND: [ { action: 'HR_APPROVED' }, { NOT: { actor_employee_id: ctx.meEmpId } } ] },
          none: { action: { in: ['ACCOUNTS_APPROVED','ACCOUNTS_REJECTED'] } }
        }
      });
    }

    if (stageFilters.length === 0) return [];

    const claims = await prisma.travelClaim.findMany({
      where: { OR: stageFilters },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } },
        request: { include: { applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true } } } } } },
        documents: true,
        segments: true,
        statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } } } }
      }
    });
    return claims;
  },
  decideClaim: async (id, actorEmpId, ctx, action, remarks) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: {
        request: { include: { applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } },
        statusEntries: { orderBy: { createdAt: 'asc' } },
        employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } }
      }
    });
    if (!claim || claim.is_deleted) throw new Error('Not found');

    const getClaimerLocationType = () => claim.employee?.employmentRecords?.[0]?.location?.type || 'HEAD_OFFICE';
    const deriveFirstStage = () => {
      const hasOpsDecision = claim.statusEntries.some(e => e.action.startsWith('OPS_'));
      const hasDgDecision = claim.statusEntries.some(e => e.action.startsWith('DG_'));
      if (hasOpsDecision && !hasDgDecision) return 'OPS';
      if (hasDgDecision && !hasOpsDecision) return 'DG';
      if (hasOpsDecision && hasDgDecision) {
        const firstRelevant = claim.statusEntries.find(e => ['OPS_APPROVED','OPS_REJECTED','DG_APPROVED','DG_REJECTED'].includes(e.action));
        if (firstRelevant) return firstRelevant.action.startsWith('OPS_') ? 'OPS' : 'DG';
      }
      return getClaimerLocationType() === 'BAZAAR' ? 'OPS' : 'DG';
    };
    const FIRST_STAGE_ACTOR = deriveFirstStage();

    const rejectionMap = { OPS: 'OPS_REJECTED', DG: 'DG_REJECTED', HR: 'HR_REJECTED', ACCOUNTS: 'ACCOUNTS_REJECTED' };
    const canActStage = (stageKey) => {
      if (ctx.isSuperAdmin) return true;
      if (stageKey === 'OPS') return (ctx.isOps || ctx.canApproveClaimOps);
      if (stageKey === 'DG') return (ctx.isDG || ctx.canApproveClaimDG);
      if (stageKey === 'HR') return ctx.isHR;
      if (stageKey === 'ACCOUNTS') return ctx.isAccountsApprover;
      return false;
    };
    const currentStatus = claim.status;
    const determineNextStage = () => {
      if (currentStatus === 'SUBMITTED') return FIRST_STAGE_ACTOR; // leads to APPROVED
      if (currentStatus === 'APPROVED') return 'HR';               // leads to VERIFIED
      if (currentStatus === 'VERIFIED') return 'ACCOUNTS';         // leads to PROCESSED
      return null;
    };
    const lastEntry = claim.statusEntries[claim.statusEntries.length - 1];
    const actionUpper = action.toUpperCase();

    const reload = async () => prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: {
        documents: true,
        segments: true,
        request: { include: { applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } },
        employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } },
        statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } } } }
      }
    });

    // Fallback-safe status updater for enum compatibility
    const updateStatusSafe = async (target, fallbacks = []) => {
      try {
        await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: target } });
      } catch (e) {
        for (const fb of fallbacks) {
          try {
            await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: fb } });
            return;
          } catch (_) {}
        }
        throw e;
      }
    };

    const approvalStatusMap = {
      OPS_APPROVED: ['APPROVED'],
      DG_APPROVED: ['APPROVED'],
      HR_APPROVED: ['VERIFIED'],
      ACCOUNTS_APPROVED: ['PROCESSED','SETTLED','APPROVED'] // accept any of these as final depending on schema
    };
    const isApprovalAction = (a) => ['OPS_APPROVED','DG_APPROVED','HR_APPROVED','ACCOUNTS_APPROVED'].includes(a);
    const REJECTION_STATUSES = new Set(['REJECTED','REJECTED_OPS','REJECTED_DG','REJECTED_HR','REJECTED_ACCOUNTS']);
    // Map a status entry action to its stage key
    const mapActionToStage = (act) => act.startsWith('OPS_') ? 'OPS' : act.startsWith('DG_') ? 'DG' : act.startsWith('HR_') ? 'HR' : act.startsWith('ACCOUNTS_') ? 'ACCOUNTS' : null;

    const assertAuthorized = (stage, intent) => {
      const userIsLastApprover = lastEntry && lastEntry.actor_employee_id === actorEmpId && isApprovalAction(lastEntry.action) && approvalStatusMap[lastEntry.action].includes(claim.status);
      if (!canActStage(stage)) {
        if (userIsLastApprover) {
          if (intent === 'APPROVE') throw { __idempotentReturn: true };
          if (intent === 'REJECT') throw new Error('Already approved. Use CLEAR first to undo your approval, then reject.');
        }
        throw new Error(`Not authorized for stage ${stage}`);
      }
    };

    try {
      if (actionUpper === 'APPROVE') {
        if (REJECTION_STATUSES.has(currentStatus)) throw new Error('Cannot approve rejected claim. Clear rejection first.');
        if (['PROCESSED','SETTLED'].includes(currentStatus)) return claim; // already final
        const stage = determineNextStage();
        if (!stage) throw new Error('No further approvals allowed');
        // If the same user approved the previous stage, they cannot act on the next stage without CLEAR
        if (lastEntry && isApprovalAction(lastEntry.action) && lastEntry.actor_employee_id === actorEmpId) {
          const lastStage = mapActionToStage(lastEntry.action);
          if (stage !== lastStage) {
            throw new Error('You already approved the previous stage. Use CLEAR to undo your approval; you cannot act on the next stage.');
          }
        }
        assertAuthorized(stage, 'APPROVE');
        let approvalAction; let targetStatus; let fallbacks = [];
        if (stage === 'OPS') { approvalAction = 'OPS_APPROVED'; targetStatus = 'APPROVED'; }
        else if (stage === 'DG') { approvalAction = 'DG_APPROVED'; targetStatus = 'APPROVED'; }
        else if (stage === 'HR') { approvalAction = 'HR_APPROVED'; targetStatus = 'VERIFIED'; }
        else if (stage === 'ACCOUNTS') { approvalAction = 'ACCOUNTS_APPROVED'; targetStatus = 'PROCESSED'; fallbacks = ['SETTLED','APPROVED']; }
        if (lastEntry && lastEntry.action === approvalAction && approvalStatusMap[approvalAction].includes(claim.status)) return claim; // idempotent
        await updateStatusSafe(targetStatus, fallbacks);
        await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: approvalAction, actor_employee_id: actorEmpId, remarks: remarks || null } });
        return reload();
      } else if (actionUpper === 'REJECT') {
        if (['PROCESSED','SETTLED'].includes(currentStatus)) throw new Error('Cannot reject after final approval');
        if (REJECTION_STATUSES.has(currentStatus)) return claim;
        const stage = determineNextStage();
        if (!stage) throw new Error('No active stage to reject');
        // Block cross-stage re-decision by the same actor without CLEAR
        if (lastEntry && isApprovalAction(lastEntry.action) && lastEntry.actor_employee_id === actorEmpId) {
          const lastStage = mapActionToStage(lastEntry.action);
          // If the computed next stage differs from the user's last approval stage, require CLEAR first
          if (stage !== lastStage) throw new Error('You already approved the previous stage. Use CLEAR to undo your approval before rejecting.');
        }
        assertAuthorized(stage, 'REJECT');
        const rejectionAction = rejectionMap[stage];
        let rejectedStatus = stage === 'OPS' ? 'REJECTED_OPS' : stage === 'DG' ? 'REJECTED_DG' : stage === 'HR' ? 'REJECTED_HR' : 'REJECTED_ACCOUNTS';
        await updateStatusSafe(rejectedStatus, ['REJECTED']);
        await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: rejectionAction, actor_employee_id: actorEmpId, remarks: remarks || null } });
        return reload();
      } else if (actionUpper === 'CLEAR') {
        if (!lastEntry) throw new Error('No decision to clear');
        const isApproval = isApprovalAction(lastEntry.action);
        const isRejection = ['OPS_REJECTED','DG_REJECTED','HR_REJECTED','ACCOUNTS_REJECTED'].includes(lastEntry.action);
        const lastStage = mapActionToStage(lastEntry.action);
        if (lastEntry.actor_employee_id !== actorEmpId && !ctx.isSuperAdmin) throw new Error('Cannot clear another user\'s decision');
        assertAuthorized(lastStage, 'CLEAR');
        if (isApproval) {
          const expectedStatuses = approvalStatusMap[lastEntry.action];
          if (!expectedStatuses.includes(claim.status)) throw new Error('Cannot clear, workflow advanced');
          await prisma.travelClaimStatusEntry.delete({ where: { id: lastEntry.id } });
          let revertStatus = 'SUBMITTED';
          if (lastEntry.action === 'HR_APPROVED') revertStatus = 'APPROVED';
          else if (lastEntry.action === 'ACCOUNTS_APPROVED') revertStatus = 'VERIFIED';
          await updateStatusSafe(revertStatus, ['APPROVED','VERIFIED','SUBMITTED']);
          return reload();
        } else if (isRejection) {
          const rejectionStatuses = ['REJECTED','REJECTED_OPS','REJECTED_DG','REJECTED_HR','REJECTED_ACCOUNTS'];
          if (!rejectionStatuses.includes(claim.status)) throw new Error('Cannot clear rejection after further changes');
          await prisma.travelClaimStatusEntry.delete({ where: { id: lastEntry.id } });
          let revertStatus = 'SUBMITTED';
          if (lastEntry.action === 'HR_REJECTED') revertStatus = 'APPROVED';
          else if (lastEntry.action === 'ACCOUNTS_REJECTED') revertStatus = 'VERIFIED';
          await updateStatusSafe(revertStatus, ['APPROVED','VERIFIED','SUBMITTED']);
          return reload();
        }
        throw new Error('Unsupported decision type to clear');
      } else {
        throw new Error('Invalid action');
      }
    } catch (err) {
      if (err && err.__idempotentReturn) return claim; // silent idempotent success
      throw err;
    }
  },
  listAllForApprovers: async (ctx) => {
    // For approvers (any stage permission) return all non-deleted claims with enriched includes
    if(!(ctx.isSuperAdmin || ctx.isHR || ctx.isDG || ctx.isOps || ctx.isAccountsApprover || ctx.canApproveClaimOps || ctx.canApproveClaimDG)) return [];
    return prisma.travelClaim.findMany({
      where: { is_deleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } },
        request: { include: { applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } },
        documents: true,
        segments: true,
        statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } } } }
      }
    });
  }
};
