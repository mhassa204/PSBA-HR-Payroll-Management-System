const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function toDateOnly(d) { const dt = new Date(d); if (isNaN(dt)) return null; dt.setUTCHours(0,0,0,0); return dt; }
function addDays(d,n){ const dt=new Date(d); dt.setUTCDate(dt.getUTCDate()+n); return dt; }
function ymd(d){ const y=d.getUTCFullYear(); const m=String(d.getUTCMonth()+1).padStart(2,'0'); const dd=String(d.getUTCDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }

async function getActiveLeaveBank(){
  const today = toDateOnly(new Date());
  if (!today) return null;
  return prisma.leaveBank.findFirst({ where:{ is_deleted:false, period_start:{ lte: today }, period_end:{ gte: today } }, orderBy:{ period_start:'desc' }, include:{ defaults:true } });
}
async function isSubordinateOfLoggedIn(employeeId, req){
  const userEmpId = req.session?.user?.employee_id || null;
  if (!userEmpId) return false;
  const emp = await prisma.employment.findFirst({ where:{ employee_id:Number(employeeId), is_current:true, is_deleted:false, reporting_officer_id:String(userEmpId), employee:{ is_deleted:false, status:'Active' } } });
  return !!emp;
}
function buildSummaryForEmployees({ employees, leaveTypes, bank, allocations, leavesInPeriod }) {
  const defaultsMap = new Map();
  for (const d of (bank?.defaults||[])) defaultsMap.set(d.leave_type_id, d.days);
  const allocMap = new Map();
  for (const a of allocations){ const byEmp = allocMap.get(a.employee_id)||new Map(); byEmp.set(a.leave_type_id, a.days); allocMap.set(a.employee_id, byEmp); }
  const usedApproved=new Map(); const usedPending=new Map();
  for (const l of leavesInPeriod){ const key=`${l.employee_id}|${l.type||''}`; if(l.status==='APPROVED') usedApproved.set(key,(usedApproved.get(key)||0)+1); else if(l.status==='PENDING') usedPending.set(key,(usedPending.get(key)||0)+1); }
  const types = leaveTypes||[]; const itemsByEmp=new Map();
  for (const emp of employees){ const rows=[]; for (const t of types){ const allocDays = (allocMap.get(emp.id)?.get(t.id)) ?? defaultsMap.get(t.id) ?? 0; const approved = usedApproved.get(`${emp.id}|${t.name}`)||0; const pending = usedPending.get(`${emp.id}|${t.name}`)||0; rows.push({ typeId:t.id, typeName:t.name, allocated:allocDays, approvedUsed:approved, pending, available: Math.max(0, allocDays - approved) }); } itemsByEmp.set(emp.id, rows); }
  return itemsByEmp;
}

module.exports = {
  helpers: { toDateOnly, addDays, ymd, getActiveLeaveBank, isSubordinateOfLoggedIn, buildSummaryForEmployees },
  listApplyEmployees: async (req, search) => {
    const userEmpId = req.session?.user?.employee_id || null;
    if (!userEmpId) return [];
    const subs = await prisma.employment.findMany({ where:{ is_deleted:false, is_current:true, organization:'PSBA', reporting_officer_id:String(userEmpId), employee:{ is_deleted:false, status:'Active', ...(search?{ OR:[ { full_name:{ contains:search, mode:'insensitive'} }, { employee_id:{ contains:search, mode:'insensitive'} }, { cnic:{ contains:search, mode:'insensitive'} }, { email:{ contains:search, mode:'insensitive'} } ] }: {}) } }, include:{ employee:true, designation:true, role_tag:true }, orderBy:{ employee_id:'asc' } });
    const seen=new Set(); const list=[]; for (const r of subs){ if(seen.has(r.employee_id)) continue; seen.add(r.employee_id); list.push({ id:r.employee.id, employee_id:r.employee.employee_id, full_name:r.employee.full_name, cnic:r.employee.cnic, employmentRecords:[{ designation:r.designation, role_tag:r.role_tag }]}); }
    const selfEmp = await prisma.employee.findFirst({ where:{ id:Number(userEmpId), is_deleted:false, status:'Active', ...(search?{ OR:[ { full_name:{ contains:search, mode:'insensitive'} }, { employee_id:{ contains:search, mode:'insensitive'} }, { cnic:{ contains:search, mode:'insensitive'} }, { email:{ contains:search, mode:'insensitive'} } ] }: {}) }, include:{ employmentRecords:{ where:{ is_current:true, is_deleted:false }, include:{ designation:true, role_tag:true } } } });
    if (selfEmp && !seen.has(selfEmp.employee_id)) { list.unshift({ id:selfEmp.id, employee_id:selfEmp.employee_id, full_name:selfEmp.full_name, cnic:selfEmp.cnic, employmentRecords:[{ designation:selfEmp.employmentRecords?.[0]?.designation||null, role_tag:selfEmp.employmentRecords?.[0]?.role_tag||null }] }); seen.add(selfEmp.employee_id); }
    // recent leaves
    const empIds = list.map(e=>e.id); const leaves = empIds.length ? await prisma.leave.findMany({ where:{ employee_id:{ in: empIds }, is_deleted:false }, orderBy:{ date:'desc' } }) : [];
    const leavesByEmp=new Map(); for (const l of leaves){ const arr=leavesByEmp.get(l.employee_id)||[]; arr.push({ id:l.id, date:l.date, type:l.type, status:l.status, remarks:l.remarks }); leavesByEmp.set(l.employee_id, arr); }
    return list.map(e=>({ ...e, leaves: leavesByEmp.get(e.id)||[] }));
  },
  listEmployeesWithSummary: async (search) => {
    const whereEmp = { is_deleted:false, ...(search?{ OR:[ { full_name:{ contains:search, mode:'insensitive'} }, { employee_id:{ contains:search, mode:'insensitive'} }, { cnic:{ contains:search, mode:'insensitive'} }, { email:{ contains:search, mode:'insensitive'} } ] }: {}) };
    const employees = await prisma.employee.findMany({ where: whereEmp, select:{ id:true, employee_id:true, full_name:true, cnic:true, employmentRecords:{ where:{ is_current:true, is_deleted:false }, include:{ designation:true, role_tag:true } }, leaves:{ where:{ is_deleted:false }, orderBy:{ date:'desc' } } }, orderBy:[ { full_name:'asc' }, { id:'asc' } ] });
    const activeBank = await getActiveLeaveBank();
    let enriched = employees; let summaryByEmp = new Map(); let leaveTypes=[];
    if (activeBank){ leaveTypes = await prisma.leaveType.findMany({ where:{ is_deleted:false, is_active:true }, orderBy:{ name:'asc' } }); const empIds=employees.map(e=>e.id); const allocations= await prisma.leaveBankAllocation.findMany({ where:{ leave_bank_id: activeBank.id, employee_id:{ in: empIds } } }); const leavesInPeriod = await prisma.leave.findMany({ where:{ is_deleted:false, employee_id:{ in: empIds }, date:{ gte: toDateOnly(activeBank.period_start), lte: toDateOnly(activeBank.period_end) } }, select:{ employee_id:true, type:true, status:true } }); summaryByEmp = buildSummaryForEmployees({ employees, leaveTypes, bank: activeBank, allocations, leavesInPeriod }); enriched = employees.map(e=>({ ...e, currentLeaveBankSummary:{ bankId: activeBank.id, title: activeBank.title, period_start: activeBank.period_start, period_end: activeBank.period_end, items: summaryByEmp.get(e.id)||[] } })); }
    return { employees: enriched, activeBank: activeBank ? { id: activeBank.id, title: activeBank.title, period_start: activeBank.period_start, period_end: activeBank.period_end } : null };
  },
  getEmployeeLeavesWithSummary: async (employeeId) => {
    const leaves = await prisma.leave.findMany({ where:{ employee_id, is_deleted:false }, orderBy:{ date:'desc' } });
    const activeBank = await getActiveLeaveBank();
    let summary=null; if (activeBank){ const leaveTypes= await prisma.leaveType.findMany({ where:{ is_deleted:false, is_active:true }, orderBy:{ name:'asc' } }); const allocations = await prisma.leaveBankAllocation.findMany({ where:{ leave_bank_id: activeBank.id, employee_id } }); const leavesInPeriod = await prisma.leave.findMany({ where:{ is_deleted:false, employee_id, date:{ gte: toDateOnly(activeBank.period_start), lte: toDateOnly(activeBank.period_end) } }, select:{ employee_id:true, type:true, status:true } }); const itemsMap = buildSummaryForEmployees({ employees:[{ id:employeeId }], leaveTypes, bank: activeBank, allocations, leavesInPeriod }); summary={ bankId: activeBank.id, title: activeBank.title, period_start: activeBank.period_start, period_end: activeBank.period_end, items: itemsMap.get(employeeId)||[] }; }
    return { leaves, summary };
  },
  createLeaves: async ({ employeeId, type, remarks, date, start, end, dates }) => {
    const toInsert=new Set(); if (Array.isArray(dates)&&dates.length){ for (const d of dates){ const dt=toDateOnly(d); if(dt) toInsert.add(ymd(dt)); } } else if (start && end){ const s=toDateOnly(start); const e=toDateOnly(end); if (!s||!e||s>e) throw new Error('Invalid start/end'); let cur=s; while(cur<=e){ toInsert.add(ymd(cur)); cur=addDays(cur,1);} } else if (date){ const dt=toDateOnly(date); if(!dt) throw new Error('Invalid date'); toInsert.add(ymd(dt)); } else { throw new Error('Provide date or start/end or dates[]'); }
    const list=Array.from(toInsert); if(!list.length) throw new Error('No valid dates to insert');
    const existing = await prisma.leave.findMany({ where:{ employee_id:employeeId, is_deleted:false, date:{ in: list.map(d=> new Date(d)) } }, select:{ date:true } });
    const existSet=new Set(existing.map(x=> ymd(toDateOnly(x.date))));
    const payload = list.filter(d=> !existSet.has(d)).map(d=> ({ employee_id: employeeId, date: new Date(d), type:String(type), remarks: remarks || null }));
    let created=0; let skipped=list.length - payload.length; if (payload.length){ const result = await prisma.leave.createMany({ data: payload }); created = result.count || payload.length; }
    const leaves = await prisma.leave.findMany({ where:{ employee_id:employeeId, is_deleted:false }, orderBy:{ date:'desc' } });
    return { created, skipped, leaves };
  },
  updateLeave: (id, data) => prisma.leave.update({ where:{ id }, data }),
  updateStatus: (id, status) => prisma.leave.update({ where:{ id }, data:{ status } }),
  softDeleteFull: (id) => prisma.leave.update({ where:{ id }, data:{ is_deleted:true } }),
  getLeaveById: (id) => prisma.leave.findUnique({ where:{ id } }),
  markDeletedConditional: async (leave) => prisma.leave.update({ where:{ id:leave.id }, data:{ is_deleted:true } }),
  checkSubordinate: isSubordinateOfLoggedIn
};
