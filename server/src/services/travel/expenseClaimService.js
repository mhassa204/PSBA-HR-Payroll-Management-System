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
        ...(isSuperAdmin ? {} : {
          OR: [
            { employee_id },
            { request: { applicant_id: employee_id } },
            // New: allow reporting officer to view their reportees' claims (within-city as well)
            { employee: { employmentRecords: { some: { is_current: true, is_deleted: false, reporting_officer_id: String(employee_id) } } } }
          ]
        })
      },
      include: {
        documents: true, segments: true,
        employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, department: true, location: true } } } },
        request: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return claims;
  },
  createClaim: async (employee_id, data) => {
    // Support two modes:
    // 1) Request-linked (existing)
    // 2) Within-city (no travel_request_id) for a reportee of the current user; multiple allowed
    if(!data.employee_id) throw new Error('employee_id required');
    const attendeeEmpId = Number(data.employee_id);

    if (data.travel_request_id) {
      // ...existing request-linked creation path...
      const request = await prisma.travelRequest.findUnique({ where: { id: Number(data.travel_request_id) }, include: { attendees: true } });
      if(!request || request.applicant_id !== employee_id) throw new Error('Forbidden');
      if(request.status !== 'APPROVED') throw new Error('Request not approved');
      const isAttendee = request.attendees.some(a=>a.employee_id===attendeeEmpId);
      if(!isAttendee) throw new Error('Employee not attendee');
      const existing = await prisma.travelClaim.findFirst({ where: { travel_request_id: request.id, employee_id: attendeeEmpId, is_deleted: false } });
      if(existing) throw new Error('Claim already exists');
      const rates = await getRatesForEmployee(attendeeEmpId);
      const created = await prisma.travelClaim.create({ data: { travel_request_id: request.id, employee_id: attendeeEmpId, from_date: request.departure_date, to_date: request.expected_return_date, per_diem_days: 0, rate_per_km: rates.rate_per_km, per_diem_rate: rates.per_diem_rate, toll_tax_total: 0, transport_mode: 'OWN', fuel_total: 0, fare_total: 0 } });
      return prisma.travelClaim.findUnique({ where: { id: created.id }, include: { documents: true, segments: true, request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } });
    }

    // New: Within-city creation (no travel request)
    // Validate that the selected employee is either self or reports to the current user
    if (attendeeEmpId !== employee_id) {
      const reporteeEmployment = await prisma.employment.findFirst({ where: { employee_id: attendeeEmpId, is_current: true, is_deleted: false, reporting_officer_id: String(employee_id) }, include: { location: true } });
      if(!reporteeEmployment) throw new Error('Employee is not your reportee');
    }
    const rates = await getRatesForEmployee(attendeeEmpId);
    const created = await prisma.travelClaim.create({ data: {
      travel_request_id: null,
      employee_id: attendeeEmpId,
      from_date: null,
      to_date: null,
      per_diem_days: 0,
      rate_per_km: rates.rate_per_km,
      per_diem_rate: rates.per_diem_rate,
      toll_tax_total: 0,
      transport_mode: 'OWN', fuel_total: 0, fare_total: 0
    } });
    return prisma.travelClaim.findUnique({ where: { id: created.id }, include: { documents: true, segments: true, request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } });
  },
  _canAccess(claim, employee_id, isSuperAdmin) {
    if(isSuperAdmin) return true;
    if(!claim) return false;
    if(claim.employee_id === employee_id) return true;
    if(claim.request && claim.request.applicant_id === employee_id) return true;
    // New: reporting officer of the employee can access
    if (claim.employee && claim.employee.employmentRecords) {
      const isRO = claim.employee.employmentRecords.some(er => er.is_current && !er.is_deleted && String(er.reporting_officer_id||'') === String(employee_id));
      if (isRO) return true;
    }
    return false;
  },
  getClaim: async (id, employee_id, isSuperAdmin) => {
    const parsedId = Number(id);
    if(!Number.isInteger(parsedId) || parsedId <= 0){
      throw new Error('Invalid claim id');
    }
    const claim = await prisma.travelClaim.findUnique({ where: { id: parsedId }, include: { documents: true, segments: true, request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } });
    if(!claim || claim.is_deleted) return null;
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    // If draft and rates missing/zero, pull latest rates
    if(claim.status === 'DRAFT' && (!claim.rate_per_km || !claim.per_diem_rate)) {
      const rates = await getRatesForEmployee(claim.employee_id);
      const upd = await prisma.travelClaim.update({ where: { id: claim.id }, data: { rate_per_km: rates.rate_per_km, per_diem_rate: rates.per_diem_rate } });
      return prisma.travelClaim.findUnique({ where: { id: upd.id }, include: { documents: true, segments: true, request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } });
    }
    return claim;
  },
  updateClaim: async (id, employee_id, isSuperAdmin, data, ctx) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(id) }, include: { request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } }, statusEntries: true } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    const editableByAccounts = (ctx && (ctx.isSuperAdmin || ctx.isAccountsApprover)) && !claim.statusEntries.some(e=>e.action==='ACCOUNTS_APPROVED');
    const canAccess = module.exports._canAccess(claim, employee_id, isSuperAdmin) || editableByAccounts;
    if(!canAccess) throw new Error('Forbidden');

    if(!editableByAccounts){
      if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    }

    const updateData = {};

    // Accounts approver can adjust these even post-APPROVED/VERIFIED but before Accounts approval
    if (editableByAccounts) {
      if('total_distance_km' in data) updateData.total_distance_km = Number(data.total_distance_km||0);
      if('rate_per_km' in data) updateData.rate_per_km = Number(data.rate_per_km||0);
      if('per_diem_days' in data) updateData.per_diem_days = Number(data.per_diem_days||0);
      if('per_diem_rate' in data) updateData.per_diem_rate = Number(data.per_diem_rate||0);
      if('distance_amount' in data) updateData.distance_amount = Number(data.distance_amount||0);
      if('travel_total' in data) updateData.travel_total = Number(data.travel_total||0);
      if('per_diem_amount' in data) updateData.per_diem_amount = Number(data.per_diem_amount||0);
      if('grand_total' in data) updateData.grand_total = Number(data.grand_total||0);
    }

    // Regular editable fields in DRAFT
    if(!editableByAccounts){
      ['from_date','to_date'].forEach(f=>{ if(data[f]) updateData[f] = new Date(data[f]); });
      if('overnight_stay' in data) updateData.overnight_stay = !!data.overnight_stay;
      if('toll_tax_total' in data) updateData.toll_tax_total = Number(data.toll_tax_total||0);
      if('per_diem_days' in data) updateData.per_diem_days = Number(data.per_diem_days||0);
      if('transport_mode' in data) updateData.transport_mode = String(data.transport_mode||'OWN').toUpperCase();
      if('fuel_total' in data) updateData.fuel_total = Number(data.fuel_total||0);
      if('fare_total' in data) updateData.fare_total = Number(data.fare_total||0);
      if('rate_per_km' in data) updateData.rate_per_km = Number(data.rate_per_km||0);
      if('per_diem_rate' in data) updateData.per_diem_rate = Number(data.per_diem_rate||0);
    }

    const updated = await prisma.travelClaim.update({ where: { id: claim.id }, data: updateData });

    // Recompute totals if Accounts didn't explicitly pass dependent totals
    if(!editableByAccounts){
      return module.exports.recomputeTotals(claim.id);
    } else {
      // Ensure totals are consistent even if some fields missing
      const A = ('total_distance_km' in updateData) ? updateData.total_distance_km : (updated.total_distance_km||0);
      const B = ('rate_per_km' in updateData) ? updateData.rate_per_km : (updated.rate_per_km||0);
      const D = updated.toll_tax_total||0;
      const C = ('distance_amount' in updateData) ? updateData.distance_amount : (A * B);
      const E = ('travel_total' in updateData) ? updateData.travel_total : (C + D);
      const pdDays = ('per_diem_days' in updateData) ? updateData.per_diem_days : (updated.per_diem_days||0);
      const pdRate = ('per_diem_rate' in updateData) ? updateData.per_diem_rate : (updated.per_diem_rate||0);
      const F = ('per_diem_amount' in updateData) ? updateData.per_diem_amount : (pdDays * pdRate);
      const G = ('grand_total' in updateData) ? updateData.grand_total : (E + F);
      await prisma.travelClaim.update({ where: { id: claim.id }, data: { total_distance_km: A, distance_amount: C, travel_total: E, per_diem_amount: F, grand_total: G, rate_per_km: B, per_diem_rate: pdRate } });
      return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: true, employee: true, statusEntries: { orderBy: { createdAt: 'asc' } } } });
    }
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
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } } } });
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
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } } } });
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
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } } } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    await prisma.travelClaimSegment.deleteMany({ where: { id: Number(segmentId), claim_id: claim.id } });
    return module.exports.recomputeTotals(claim.id);
  },
  addDocuments: async (claimId, employee_id, isSuperAdmin, files, category) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { documents: true, request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } } } });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims editable');
    const cat = String(category||'OTHER').toUpperCase();
    // Allow multiple REPORT uploads; submission will ensure at least one exists
    const createMany = files.map(f => ({ claim_id: claim.id, category: cat, file_path: f._savedRelPath || f.path.replace(/.*uploads[\\/]/,'uploads/'), mime_type: f.mimetype, file_size: f.size }));
    await prisma.travelClaimDocument.createMany({ data: createMany });
    return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: true, employee: true } });
  },
  deleteDocument: async (claimId, docId, employee_id, isSuperAdmin) => {
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(claimId) }, include: { request: true, documents: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } } } });
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
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: {
        request: true,
        documents: true,
        segments: true,
        employee: {
          include: {
            employmentRecords: { where: { is_current: true, is_deleted: false } }
          }
        }
      }
    });
    if(!claim || claim.is_deleted) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims deletable');
    await prisma.travelClaim.delete({ where: { id: claim.id } });
    return { success: true };
  },
  submitClaim: async (id, employee_id, isSuperAdmin) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: { documents: true, request: true, employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false } } } } }
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
    // Adjusted to support recommender stage for within-city (no request)
    const stageFilters = [];

    // Recommendation stage for immediate in-charge
    // Skip assigning recommender tasks to DG; DG’s direct reports bypass recommendation entirely
    if (ctx.meEmpId && !ctx.isDG) {
      stageFilters.push({
        status: 'SUBMITTED',
        // Existing: request applicant's in-charge
        request: {
          applicant: {
            employmentRecords: {
              some: { is_current: true, is_deleted: false, reporting_officer_id: String(ctx.meEmpId) }
            }
          }
        },
        statusEntries: { none: { action: 'RECOMMENDED' } }
      });
      // New: within-city — employee's in-charge
      stageFilters.push({
        status: 'SUBMITTED',
        employee: { employmentRecords: { some: { is_current: true, is_deleted: false, reporting_officer_id: String(ctx.meEmpId) } } },
        request: null,
        statusEntries: { none: { action: 'RECOMMENDED' } }
      });
    }

    // First stage (OPS/DG) requires recommendation
    const firstStageNone = { action: { in: ['OPS_APPROVED','OPS_REJECTED','DG_APPROVED','DG_REJECTED'] } };
    if (ctx.isOps || ctx.canApproveClaimOps) {
      stageFilters.push({
        status: 'SUBMITTED',
        employee: { employmentRecords: { some: { is_current: true, location: { type: 'BAZAAR' } } } },
        statusEntries: { none: firstStageNone, some: { action: 'RECOMMENDED' } }
      });
    }
    if (ctx.isDG || ctx.canApproveClaimDG) {
      // Standard DG path (requires recommendation)
      stageFilters.push({
        status: 'SUBMITTED',
        employee: { employmentRecords: { some: { is_current: true, location: { type: 'HEAD_OFFICE' } } } },
        statusEntries: { none: firstStageNone, some: { action: 'RECOMMENDED' } }
      });
      // Fast-track for DG direct reports (skip recommendation)
      if (ctx.meEmpId) {
        stageFilters.push({
          status: 'SUBMITTED',
          employee: { employmentRecords: { some: { is_current: true, is_deleted: false, location: { type: 'HEAD_OFFICE' }, reporting_officer_id: String(ctx.meEmpId) } } },
          statusEntries: { none: firstStageNone }
        });
      }
    }

    // HR stage
    if (ctx.isHR) {
      stageFilters.push({
        status: 'APPROVED',
        statusEntries: {
          some: { action: { in: ['OPS_APPROVED','DG_APPROVED'] } },
          none: { action: { in: ['HR_APPROVED','HR_REJECTED'] } }
        }
      });
    }

    // Accounts stage
    if (ctx.isAccountsApprover) {
      stageFilters.push({
        status: 'VERIFIED',
        statusEntries: {
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
        request: { include: { applicant: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { location: true, designation: true, department: true } } } } } },
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

    const rejectionMap = { OPS: 'OPS_REJECTED', DG: 'DG_REJECTED', HR: 'HR_REJECTED', ACCOUNTS: 'ACCOUNTS_REJECTED', RECOMMENDER: 'RECOMMENDER_REJECTED' };
    const canActStage = (stageKey) => {
      if (ctx.isSuperAdmin) return true;
      if (stageKey === 'RECOMMENDER') {
        // Allow recommendation by immediate in-charge of applicant (request-linked) or the employee (within-city)
        const applicantEmps = claim.request?.applicant?.employmentRecords || [];
        const employeeEmps = claim.employee?.employmentRecords || [];
        const me = String(ctx.meEmpId||'');
        return applicantEmps.some(er => er.is_current && !er.is_deleted && String(er.reporting_officer_id||'') === me)
            || employeeEmps.some(er => er.is_current && !er.is_deleted && String(er.reporting_officer_id||'') === me);
      }
      if (stageKey === 'OPS') return (ctx.isOps || ctx.canApproveClaimOps);
      if (stageKey === 'DG') return (ctx.isDG || ctx.canApproveClaimDG);
      if (stageKey === 'HR') return ctx.isHR;
      if (stageKey === 'ACCOUNTS') return ctx.isAccountsApprover;
      return false;
    };
    const currentStatus = claim.status;
    const hasRecommended = claim.statusEntries.some(e => e.action === 'RECOMMENDED');
    const isDirectReportToDG = () => ctx.isDG && (claim.employee?.employmentRecords||[]).some(er => er.is_current && !er.is_deleted && String(er.reporting_officer_id||'') === String(ctx.meEmpId||''));
    const determineNextStage = () => {
      if (currentStatus === 'SUBMITTED') return (hasRecommended || isDirectReportToDG()) ? FIRST_STAGE_ACTOR : 'RECOMMENDER'; // bypass recommender for DG direct reports
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
    const mapActionToStage = (act) => act.startsWith('OPS_') ? 'OPS' : act.startsWith('DG_') ? 'DG' : act.startsWith('HR_') ? 'HR' : act.startsWith('ACCOUNTS_') ? 'ACCOUNTS' : (act==='RECOMMENDED' ? 'RECOMMENDER' : (act==='RECOMMENDER_REJECTED' ? 'RECOMMENDER' : null));

    const assertAuthorized = (stage, intent) => {
      const userIsLastApprover = lastEntry && lastEntry.actor_employee_id === actorEmpId && (isApprovalAction(lastEntry.action) || lastEntry.action==='RECOMMENDED' || lastEntry.action==='RECOMMENDER_REJECTED') && (isApprovalAction(lastEntry.action) ? approvalStatusMap[lastEntry.action].includes(claim.status) : (lastEntry.action==='RECOMMENDED' ? claim.status==='SUBMITTED' : REJECTION_STATUSES.has(claim.status)));
      if (!canActStage(stage)) {
        if (userIsLastApprover) {
          if (intent === 'APPROVE' || intent==='RECOMMEND') throw { __idempotentReturn: true };
          if (intent === 'REJECT') throw new Error('Already decided. Use CLEAR first to undo your decision, then reject.');
        }
        throw new Error(`Not authorized for stage ${stage}`);
      }
    };

    try {
      if (actionUpper === 'RECOMMEND') {
        if (currentStatus !== 'SUBMITTED') throw new Error('Only SUBMITTED claims can be recommended');
        if (hasRecommended) return claim;
        // If DG’s direct report, bypass recommender entirely
        if (isDirectReportToDG()) return claim;
        assertAuthorized('RECOMMENDER', 'RECOMMEND');
        await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: 'RECOMMENDED', actor_employee_id: actorEmpId, remarks: remarks || null } });
        return reload();
      } else if (actionUpper === 'APPROVE') {
        if (REJECTION_STATUSES.has(currentStatus)) throw new Error('Cannot approve rejected claim. Clear rejection first.');
        if (['PROCESSED','SETTLED'].includes(currentStatus)) return claim; // already final
        const stage = determineNextStage();
        if (!stage) throw new Error('No further approvals allowed');
        // If the same user approved the previous stage, they cannot act on the next stage without CLEAR
        if (lastEntry && (isApprovalAction(lastEntry.action) || lastEntry.action==='RECOMMENDED' || lastEntry.action==='RECOMMENDER_REJECTED') && lastEntry.actor_employee_id === actorEmpId) {
          const lastStage = mapActionToStage(lastEntry.action);
          if (stage !== lastStage) {
            throw new Error('You already decided the previous stage. Use CLEAR to undo your decision; you cannot act on the next stage.');
          }
        }
        assertAuthorized(stage, 'APPROVE');
        if (stage === 'RECOMMENDER') {
          // Recommendation does not change status; only insert a status entry
          if (lastEntry && lastEntry.action === 'RECOMMENDED' && claim.status==='SUBMITTED') return claim; // idempotent
          await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: 'RECOMMENDED', actor_employee_id: actorEmpId, remarks: remarks || null } });
          return reload();
        }
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
        if (lastEntry && (isApprovalAction(lastEntry.action) || lastEntry.action==='RECOMMENDED' || lastEntry.action==='RECOMMENDER_REJECTED') && lastEntry.actor_employee_id === actorEmpId) {
          const lastStage = mapActionToStage(lastEntry.action);
          if (stage !== lastStage) throw new Error('You already decided the previous stage. Use CLEAR to undo your decision before rejecting.');
        }
        if (stage === 'RECOMMENDER') {
          assertAuthorized('RECOMMENDER', 'REJECT');
          await updateStatusSafe('REJECTED');
          await prisma.travelClaimStatusEntry.create({ data: { claim_id: claim.id, action: 'RECOMMENDER_REJECTED', actor_employee_id: actorEmpId, remarks: remarks || null } });
          return reload();
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
        const isRejection = ['OPS_REJECTED','DG_REJECTED','HR_REJECTED','ACCOUNTS_REJECTED','RECOMMENDER_REJECTED'].includes(lastEntry.action);
        const isRecommendation = lastEntry.action === 'RECOMMENDED';
        const lastStage = mapActionToStage(lastEntry.action);
        if (lastEntry.actor_employee_id !== actorEmpId && !ctx.isSuperAdmin) throw new Error('Cannot clear another user\'s decision');
        assertAuthorized(lastStage, 'CLEAR');
        if (isRecommendation) {
          if (claim.status !== 'SUBMITTED') throw new Error('Cannot clear, workflow advanced');
          await prisma.travelClaimStatusEntry.delete({ where: { id: lastEntry.id } });
          return reload();
        }
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
  },
  listForAccounts: async (ctx, filters) => {
    if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) return [];
    const where = { is_deleted: false, status: 'VERIFIED' };
    if (filters) {
      if (filters.employee_cnic) where.employee = { ...where.employee, cnic: { contains: String(filters.employee_cnic), mode: 'insensitive' } };
      if (filters.employee_name) where.employee = { ...where.employee, full_name: { contains: String(filters.employee_name), mode: 'insensitive' } };
      if (filters.statuses?.length) where.status = { in: filters.statuses };
      if (filters.from_date || filters.to_date) where.claim_date = {
        gte: filters.from_date ? new Date(filters.from_date) : undefined,
        lte: filters.to_date ? new Date(filters.to_date) : undefined,
      };
      if (filters.claim_from || filters.claim_to) where.AND = [
        ...(where.AND||[]),
        { OR: [
          { from_date: { gte: filters.claim_from ? new Date(filters.claim_from) : undefined } },
          { to_date: { lte: filters.claim_to ? new Date(filters.claim_to) : undefined } },
        ]}
      ];
    }
    return prisma.travelClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { department: true, designation: true, location: true, salary: true } } } },
        request: true,
        documents: true,
        segments: true,
        statusEntries: { orderBy: { createdAt: 'asc' }, include: { actor: true } }
      }
    });
  },
  createTranche: async (ctx, title, notes, claimIds) => {
    if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) throw new Error('Forbidden');
    const meUserId = ctx.meUserId || Number(ctx.req?.session?.user?.id);
    if (!Array.isArray(claimIds) || claimIds.length===0) throw new Error('No claims selected');
    const claims = await prisma.travelClaim.findMany({ where: { id: { in: claimIds.map(Number) }, status: 'VERIFIED', is_deleted: false } });
    if (claims.length !== claimIds.length) throw new Error('Some claims are not eligible');
    const code = `TR-${Date.now()}`;
    const tranche = await prisma.travelClaimTranche.create({ data: { code, title: title||code, notes: notes||null, created_by_user_id: meUserId } });
    await prisma.travelClaimTrancheItem.createMany({ data: claims.map(c => ({ tranche_id: tranche.id, claim_id: c.id })) });
    // Mark all to processed
    await prisma.travelClaim.updateMany({ where: { id: { in: claims.map(c=>c.id) } }, data: { status: 'PROCESSED' } });
    for (const c of claims) {
      await prisma.travelClaimStatusEntry.create({ data: { claim_id: c.id, action: 'ACCOUNTS_APPROVED', actor_employee_id: ctx.meEmpId } });
    }
    return prisma.travelClaimTranche.findUnique({ where: { id: tranche.id }, include: { items: { include: { claim: { include: { employee: true, request: true } } } } } });
  },
  listTranches: async (ctx) => {
    if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) return [];
    return prisma.travelClaimTranche.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { claim: { include: { employee: true, request: true } } } }, createdBy: true }
    });
  },
  exportTrancheCsv: async (trancheId) => {
    const t = await prisma.travelClaimTranche.findUnique({ where: { id: Number(trancheId) }, include: { items: { include: { claim: { include: { employee: { include: { employmentRecords: { where: { is_current: true, is_deleted: false }, include: { salary: true, department: true, designation: true } } } }, request: true } } } } } });
    if (!t) throw new Error('Not found');
    const header = ['tranche_code','claim_id','request_id','employee_id','employee_name','cnic','dept','designation','bank_name','account_no','from_date','to_date','grand_total'];
    const rows = [];
    for (const it of t.items) {
      const c = it.claim; const emp = c.employee; const empJob = emp?.employmentRecords?.[0]; const sal = empJob?.salary;
      rows.push([
        t.code,
        c.id,
        c.travel_request_id || '',
        c.employee_id,
        emp?.full_name || '',
        emp?.cnic || '',
        empJob?.department?.name || '',
        empJob?.designation?.title || '',
        sal?.bank_name_primary || '',
        sal?.bank_account_primary || '',
        c.from_date ? new Date(c.from_date).toISOString().slice(0,10) : '',
        c.to_date ? new Date(c.to_date).toISOString().slice(0,10) : '',
        c.grand_total || 0
      ]);
    }
    const csv = [header.join(','), ...rows.map(r=>r.join(','))].join('\n');
    return { code: t.code, csv };
  },
  // ...existing code...
};
