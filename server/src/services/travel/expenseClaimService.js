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
    const created = await prisma.travelClaim.create({ data: { travel_request_id: request.id, employee_id: attendeeEmpId, from_date: request.departure_date, to_date: request.expected_return_date, per_diem_days: request.total_days||0, rate_per_km: rates.rate_per_km, per_diem_rate: rates.per_diem_rate, toll_tax_total: 0 } });
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
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(id) }, include: { documents: true, segments: true, request: true, employee: true } });
    if(!claim || claim.is_deleted) return null;
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
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
    const claim = await prisma.travelClaim.findUnique({ where: { id: Number(id) }, include: { documents: true, request: true } });
    if(!claim) throw new Error('Not found');
    if(!module.exports._canAccess(claim, employee_id, isSuperAdmin)) throw new Error('Forbidden');
    if(claim.status !== 'DRAFT') throw new Error('Only draft claims can be submitted');
    const hasReport = claim.documents.some(d=>d.category==='REPORT');
    if(!hasReport) throw new Error('Report document required before submission');
    await prisma.travelClaim.update({ where: { id: claim.id }, data: { status: 'SUBMITTED' } });
    return prisma.travelClaim.findUnique({ where: { id: claim.id }, include: { documents: true, segments: true, request: true, employee: true } });
  }
};
