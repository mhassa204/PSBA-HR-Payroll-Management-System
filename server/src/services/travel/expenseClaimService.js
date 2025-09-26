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
    const created = await prisma.travelClaim.create({ data: { travel_request_id: request.id, employee_id: attendeeEmpId, from_date: request.departure_date, to_date: request.expected_return_date, per_diem_days: 0, rate_per_km: rates.rate_per_km, per_diem_rate: rates.per_diem_rate, toll_tax_total: 0 } });
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
    await prisma.travelClaimSegment.create({ data: { claim_id: claim.id, departure_from: payload.departure_from || '', departure_to: payload.departure_to||'', depart_time: payload.depart_time||null, arrive_time: payload.arrive_time||null, mode: payload.mode||null, distance_km: Number(payload.distance_km||0) } });
    return module.exports.recomputeTotals(claim.id);
  },
  updateSegment: async (claimId, segmentId, employee_id, isSuperAdmin, payload) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    const seg = await prisma.travelClaimSegment.findUnique({ where: { id: Number(segmentId) } });
    if(!seg || seg.claim_id !== claim.id) throw new Error('Not found');
    await prisma.travelClaimSegment.update({ where: { id: seg.id }, data: { departure_from: payload.departure_from || '', departure_to: payload.departure_to||'', depart_time: payload.depart_time||null, arrive_time: payload.arrive_time||null, mode: payload.mode||null, distance_km: Number(payload.distance_km||0) } });
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
    if(cat==='REPORT' && claim.documents.some(d=>d.category==='REPORT')) throw new Error('REPORT already uploaded');
    const createMany = files.map(f => ({ claim_id: claim.id, category: cat, file_path: f._savedRelPath || f.path.replace(/.*uploads[\\\/]/,'uploads/'), mime_type: f.mimetype, file_size: f.size }));
    await prisma.travelClaimDocument.createMany({ data: createMany });
    return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: true, employee: true } });
  },
  deleteDocument: async (claimId, docId, employee_id, isSuperAdmin) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    const doc = await prisma.travelClaimDocument.findUnique({ where: { id: Number(docId) } });
    if(!doc || doc.claim_id !== claim.id) throw new Error('Not found');
    if(doc.category === 'REPORT') throw new Error('Cannot delete report');
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
    // Refactored formatting to avoid any hidden characters / syntax issues
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: {
        documents: true,
        request: {
          include: {
            applicant: {
              include: {
                employmentRecords: {
                  where: { is_current: true, is_deleted: false },
                  include: { location: true, designation: true, department: true }
                }
              }
            }
          }
        }
      }
    });
    if(!claim) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims can be submitted');
    const hasReport = claim.documents.some(d=>d.category==='REPORT');
    if(!hasReport) throw new Error('Report document required before submission');
    await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: 'SUBMITTED' } });
    await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: 'SUBMITTED', actor_employee_id: employee_id } });
    return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: { include: { applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } }, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } } } } } });
  },
  listPendingApprovals: async (ctx) => {
    // Determine which stage user can act on using permission-based flags
    const stageFilters = [];
    if(ctx.isOps || ctx.canApproveClaimOps){ stageFilters.push({ status: 'SUBMITTED', request: { applicant: { employmentRecords: { some: { is_current: true, location: { type: 'BAZAAR' } } } } } }); }
    if(ctx.isDG || ctx.canApproveClaimDG){ stageFilters.push({ status: 'SUBMITTED', request: { applicant: { employmentRecords: { some: { is_current: true, location: { type: 'HEAD_OFFICE' } } } } } }); }
    if(ctx.isHR){ stageFilters.push({ status: 'PENDING_APPROVAL', statusEntries: { some: { action: { in: ['OPS_APPROVED','DG_APPROVED'] } } } }); }
    if(ctx.isAccountsApprover){
      stageFilters.push({ status: 'VERIFIED', statusEntries: { some: { action: 'HR_APPROVED' } } });
    }
    if(stageFilters.length===0) return [];
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
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(id) }, include: { request: { include: { applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } }, statusEntries: { orderBy: { createdAt: 'asc' } }, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } } } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    const locType = claim.request?.applicant?.employmentRecords?.[0]?.location?.type || 'HEAD_OFFICE';
    const isAccounts = ctx.isAccountsApprover;
    const nowStatus = claim.status;
    const act = action.toUpperCase();
    const next = {};

    // Helper derivations
    const approvalsOrder = ['OPS_APPROVED','DG_APPROVED','HR_APPROVED','ACCOUNTS_APPROVED'];
    const lastApproval = [...claim.statusEntries].reverse().find(e=>approvalsOrder.includes(e.action));
    const hasHRAppr = claim.statusEntries.some(e=>e.action==='HR_APPROVED');
    const hasAccountsAppr = claim.statusEntries.some(e=>e.action==='ACCOUNTS_APPROVED');

    const isLastStageActor = (stageAction) => {
      if(stageAction==='OPS_APPROVED') return (ctx.isOps || ctx.canApproveClaimOps);
      if(stageAction==='DG_APPROVED') return (ctx.isDG || ctx.canApproveClaimDG);
      if(stageAction==='HR_APPROVED') return ctx.isHR;
      if(stageAction==='ACCOUNTS_APPROVED') return isAccounts;
      return false;
    };
    const nextStageHasActed = () => {
      if(!lastApproval) return false;
      if(lastApproval.action==='OPS_APPROVED' || lastApproval.action==='DG_APPROVED') return hasHRAppr || hasAccountsAppr; // any later stage
      if(lastApproval.action==='HR_APPROVED') return hasAccountsAppr; // only accounts after HR
      if(lastApproval.action==='ACCOUNTS_APPROVED') return false; // final stage
      return false;
    };

    if(act==='APPROVE'){
      // Idempotent re-approve: if actor is last approver and next stage not yet acted, just return claim (no error)
      if(lastApproval && isLastStageActor(lastApproval.action) && !nextStageHasActed()) {
        return claim; // no change
      }
      if(nowStatus==='SUBMITTED'){
        if(locType==='BAZAAR' && (ctx.isOps || ctx.canApproveClaimOps)){ next.status='PENDING_APPROVAL'; next.entry='OPS_APPROVED'; }
        else if(locType==='HEAD_OFFICE' && (ctx.isDG || ctx.canApproveClaimDG)){ next.status='PENDING_APPROVAL'; next.entry='DG_APPROVED'; }
        else throw new Error('Not authorized for first approval stage');
      } else if(nowStatus==='PENDING_APPROVAL'){
        if(ctx.isHR){ next.status='VERIFIED'; next.entry='HR_APPROVED'; }
        else throw new Error('Not authorized for HR stage');
      } else if(nowStatus==='VERIFIED'){
        if(isAccounts){ next.status='APPROVED'; next.entry='ACCOUNTS_APPROVED'; }
        else throw new Error('Not authorized for Accounts stage');
      } else {
        throw new Error('No further approvals allowed');
      }
      await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: next.status } });
      await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: next.entry, actor_employee_id: actorEmpId, remarks: remarks||null } });
    } else if(act==='REJECT'){
      // Generic previous-stage modification: if actor owns last approval & next stage not acted -> change to REJECTED
      let handledChange = false;
      if(lastApproval && isLastStageActor(lastApproval.action) && !nextStageHasActed()){
        await prisma.travelClaimStatusEntry.delete({ where: { id: lastApproval.id } });
        const map = { OPS_APPROVED:'OPS_REJECTED', DG_APPROVED:'DG_REJECTED', HR_APPROVED:'HR_REJECTED', ACCOUNTS_APPROVED:'ACCOUNTS_REJECTED' };
        next.status='REJECTED'; next.entry = map[lastApproval.action] || 'REJECTED';
        handledChange = true;
      }
      if(!handledChange){
        next.status='REJECTED';
        next.entry = (nowStatus==='SUBMITTED'?(locType==='BAZAAR'?'OPS_REJECTED':'DG_REJECTED'):(nowStatus==='PENDING_APPROVAL'?'HR_REJECTED':'ACCOUNTS_REJECTED'));
      }
      await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: next.status } });
      await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: next.entry, actor_employee_id: actorEmpId, remarks: remarks||null } });
    } else if(act==='CLEAR'){
      // Support undo of last approval OR last rejection (if user was actor and no later stage acted)
      const entriesDesc = claim.statusEntries.slice().reverse();
      const approvalsOrder = ['OPS_APPROVED','DG_APPROVED','HR_APPROVED','ACCOUNTS_APPROVED'];
      const rejectionActions = ['OPS_REJECTED','DG_REJECTED','HR_REJECTED','ACCOUNTS_REJECTED'];
      const lastEntry = entriesDesc[0];
      if(!lastEntry) throw new Error('No decision to clear');

      const stageFromAction = (action) => {
        if(action.startsWith('OPS_')) return 'OPS';
        if(action.startsWith('DG_')) return 'DG';
        if(action.startsWith('HR_')) return 'HR';
        if(action.startsWith('ACCOUNTS_')) return 'ACCOUNTS';
        return null;
      };
      const actorStage = stageFromAction(lastEntry.action);
      const isActorAuthorized = () => {
        if(actorStage==='OPS') return (ctx.isOps || ctx.canApproveClaimOps);
        if(actorStage==='DG') return (ctx.isDG || ctx.canApproveClaimDG);
        if(actorStage==='HR') return ctx.isHR;
        if(actorStage==='ACCOUNTS') return ctx.isAccountsApprover;
        return false;
      };
      if(lastEntry.actor_employee_id !== actorEmpId) throw new Error('Cannot clear another user\'s decision');
      if(!isActorAuthorized()) throw new Error('Not authorized to clear this decision');

      if(approvalsOrder.includes(lastEntry.action)) {
        // Approval undo (existing logic adapted)
        const lastAppr = lastEntry; // alias
        const hasHRAppr = claim.statusEntries.some(e=>e.action==='HR_APPROVED');
        const hasAccountsAppr = claim.statusEntries.some(e=>e.action==='ACCOUNTS_APPROVED');
        const nextStageHasActed = () => {
          if(!lastAppr) return false;
            if(lastAppr.action==='OPS_APPROVED' || lastAppr.action==='DG_APPROVED') return hasHRAppr || hasAccountsAppr;
            if(lastAppr.action==='HR_APPROVED') return hasAccountsAppr;
            if(lastAppr.action==='ACCOUNTS_APPROVED') return false;
            return false;
        };
        if(nextStageHasActed()) throw new Error('Cannot clear, next stage already acted');
        if(lastAppr.action==='OPS_APPROVED' || lastAppr.action==='DG_APPROVED'){
          if(nowStatus!=='PENDING_APPROVAL') throw new Error('Cannot clear at this stage');
          await prisma.travelClaimStatusEntry.delete({ where: { id: lastAppr.id } });
          await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: 'SUBMITTED' } });
        } else if(lastAppr.action==='HR_APPROVED') {
          if(nowStatus!=='VERIFIED') throw new Error('Cannot clear HR approval now');
          await prisma.travelClaimStatusEntry.delete({ where: { id: lastAppr.id } });
          await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: 'PENDING_APPROVAL' } });
        } else if(lastAppr.action==='ACCOUNTS_APPROVED') {
          if(nowStatus!=='APPROVED') throw new Error('Cannot clear Accounts approval now');
          await prisma.travelClaimStatusEntry.delete({ where: { id: lastAppr.id } });
          await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: 'VERIFIED' } });
        }
      } else if(rejectionActions.includes(lastEntry.action)) {
        // Rejection undo: only if overall status currently REJECTED
        if(claim.status !== 'REJECTED') throw new Error('Cannot clear rejection after further changes');
        // Remove last rejection entry and revert status to prior workflow stage
        await prisma.travelClaimStatusEntry.delete({ where: { id: lastEntry.id } });
        let revertStatus = 'SUBMITTED';
        if(lastEntry.action==='HR_REJECTED') revertStatus = 'PENDING_APPROVAL';
        else if(lastEntry.action==='ACCOUNTS_REJECTED') revertStatus = 'VERIFIED';
        // OPS/DG rejected revert stays SUBMITTED
        await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: revertStatus } });
      } else {
        throw new Error('Unsupported decision type to clear');
      }
    } else {
      throw new Error('Invalid action');
    }

    return prisma.travelClaim.findUnique({ where: { id: Number(id) }, include: { documents: true, segments: true, request: { include: { applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } }, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } }, statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } } } } } });
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
