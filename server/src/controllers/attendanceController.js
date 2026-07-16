const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Attendance now comes from the face-recognition Attendance System (droplet),
// mirrored locally into the `Attendance` table and joined to employees by `cnic`.
// Location is derived from the employee's assignment (roster / current employment),
// not from a biometric device.

const norm = (c) => String(c || "").replace(/\D/g, "");

function toDateOnly(d) {
  const dt = new Date(d);
  dt.setUTCHours(0,0,0,0);
  return dt;
}
function addDays(d, n) { const dt = new Date(d); dt.setUTCDate(dt.getUTCDate()+n); return dt; }
function formatYMD(d){ const y=d.getUTCFullYear(); const m=String(d.getUTCMonth()+1).padStart(2,'0'); const dd=String(d.getUTCDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }
function dayName(d){ return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getUTCDay()]; }
function dayShort(d){ return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]; }
function formatHHmmFromUTCDate(d){ if(!d) return null; const h=String(d.getUTCHours()).padStart(2,'0'); const m=String(d.getUTCMinutes()).padStart(2,'0'); return `${h}:${m}`; }
function parseHHmmToMinutes(s){ if(!s) return null; const m=s.match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; return parseInt(m[1],10)*60+parseInt(m[2],10); }

// Fetch face-attendance rows for a set of cnics in a date range.
async function fetchAttendanceByCnics(cnics, start, end) {
  const list = cnics.filter(Boolean);
  if (!list.length) return [];
  return prisma.attendance.findMany({
    where: { cnic: { in: list }, attendanceDate: { gte: start, lte: end } },
    select: { cnic: true, attendanceDate: true, type: true, timestamp: true },
  });
}

// Shared duty-schedule resolution (approved rosters + supersede rule + HQ defaults)
const { buildScheduleResolver, tallySchedule } = require("../services/rosterScheduleService");

// Helpers to get payroll cycle (21st to 20th next month)
function getDefaultPayrollRangeUTC(today=new Date()) {
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let start, end;
  if (t.getUTCDate() >= 21) {
    // current month 21st to next month 20th
    start = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 21));
    end = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth()+1, 20));
  } else {
    // previous month 21st to current month 20th
    start = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth()-1, 21));
    end = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 20));
  }
  return { start, end };
}

// GET /attendance/locations/:id/fmo
async function locationFMO(req, res) {
  try {
    const locationId = Number(req.params.id);
    const loc = await prisma.location.findFirst({ where: { id: locationId, is_deleted: false, is_active: true } });
    if (!loc) return res.status(404).json({ success: false, error: 'Location not found' });

    const startParam = req.query.start; const endParam = req.query.end;
    let start, end;
    if (startParam && endParam) {
      start = toDateOnly(startParam); end = toDateOnly(endParam);
    } else {
      const r = getDefaultPayrollRangeUTC(new Date());
      start = r.start; end = r.end;
    }

    // Build calendar days for header
    const days = []; let d = start; while (d <= end) { days.push({ date: new Date(d), label: String(d.getUTCDate()).padStart(2,'0'), dow: dayShort(d) }); d = addDays(d,1); }

    // Employees assigned to this location (via current employment)
    const employees = await prisma.employee.findMany({
      where: {
        is_deleted: false,
        employmentRecords: { some: { is_current: true, is_deleted: false, location_id: locationId } },
      },
      select: { id: true, full_name: true, cnic: true, employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, role_tag: true } } }
    });

    // Attendance for these employees in range, presence keyed by cnic|date
    const cnics = employees.map(e => norm(e.cnic)).filter(Boolean);
    const att = await fetchAttendanceByCnics(cnics, start, end);
    const attMap = new Map(); // key: cnic|date -> true
    for (const a of att) {
      if (!a.cnic) continue;
      attMap.set(`${norm(a.cnic)}|${formatYMD(a.attendanceDate)}`, true);
    }

    const rows = employees.map((e, idx) => {
      const designation = e.employmentRecords?.[0]?.designation?.title || null;
      const roleTag = e.employmentRecords?.[0]?.role_tag?.name || null;
      const ecnic = norm(e.cnic);
      let present = 0; let absent = 0; let notMark = 0;
      const marks = days.map(({ date }) => {
        const isP = ecnic && attMap.get(`${ecnic}|${formatYMD(date)}`);
        if (isP) present++; else absent++;
        return isP ? 'P' : 'A';
      });
      return {
        sr: idx+1,
        cnic: e.cnic || null,
        name: e.full_name,
        designation,
        roleTag,
        marks,
        totals: { totalDays: days.length, present, notMark, absent }
      };
    });

    res.json({ success: true, location: { id: loc.id, name: loc.name }, range: { start: formatYMD(start), end: formatYMD(end) }, days, rows });
  } catch (e) {
    console.error('locationFMO error', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

// GET /attendance/locations/:id/roster
async function locationAgainstRoster(req, res) {
  try {
    const locationId = Number(req.params.id);
    const loc = await prisma.location.findFirst({ where: { id: locationId, is_deleted: false, is_active: true } });
    if (!loc) return res.status(404).json({ success: false, error: 'Location not found' });

    const startParam = req.query.start; const endParam = req.query.end;
    let start, end;
    if (startParam && endParam) {
      start = toDateOnly(startParam); end = toDateOnly(endParam);
    } else {
      const r = getDefaultPayrollRangeUTC(new Date());
      start = r.start; end = r.end;
    }

    // Build calendar days
    const days = []; let d = start; while (d <= end) { days.push(new Date(d)); d = addDays(d,1); }

    // Current employees at this location; schedules come from the shared
    // resolver (approved rosters via entries + HQ default hours)
    const employees = await prisma.employee.findMany({
      where: {
        is_deleted: false,
        employmentRecords: { some: { is_current: true, is_deleted: false, location_id: locationId } },
      },
      select: { id: true, full_name: true, cnic: true, employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, role_tag: true } } }
    });

    const resolver = await buildScheduleResolver(employees.map(e => e.id), start, end);

    const cnics = employees.map(e => norm(e.cnic)).filter(Boolean);

    // Attendance logs (all types) for range, by cnic
    const att = await fetchAttendanceByCnics(cnics, start, end);

    // Group attendance by cnic+date, reduce to earliest IN and latest OUT
    const attByUserDate = new Map(); // key: cnic|ymd -> { in: Date|null, out: Date|null }
    for (const a of att) {
      const key = `${norm(a.cnic)}|${formatYMD(a.attendanceDate)}`;
      const curr = attByUserDate.get(key) || { in: null, out: null };
      if (a.type === 'IN') {
        if (!curr.in || a.timestamp < curr.in) curr.in = a.timestamp;
      } else if (a.type === 'OUT') {
        if (!curr.out || a.timestamp > curr.out) curr.out = a.timestamp;
      }
      attByUserDate.set(key, curr);
    }

    // Build response rows
    const rows = [];
    for (const emp of employees) {
      const designation = emp.employmentRecords?.[0]?.designation?.title || null;
      const roleTag = emp.employmentRecords?.[0]?.role_tag?.name || null;
      const ecnic = norm(emp.cnic);

      for (const date of days) {
        // Shared resolution: latest-approved roster entry wins; HQ employees
        // fall back to the default 09:15-17:00 Mon-Fri schedule
        const day = resolver.resolveDay(emp.id, date);
        if (day.source === 'NONE') continue; // Skip dates with no applicable schedule

        const weeklyOff = day.kind === 'weekly_off';
        const offsite = day.kind === 'offsite';
        const offsiteLocationName = day.offsite_location;
        const dutyIn = day.kind === 'time' ? day.time_from : null;
        const dutyOut = day.kind === 'time' ? day.time_to : null;

        const inOut = attByUserDate.get(`${ecnic}|${formatYMD(date)}`) || { in: null, out: null };
        const time1 = formatHHmmFromUTCDate(inOut.in) || '';
        const time2 = formatHHmmFromUTCDate(inOut.out) || '';

        const dutyMinutes = (parseHHmmToMinutes(dutyIn) != null && parseHHmmToMinutes(dutyOut) != null)
          ? (parseHHmmToMinutes(dutyOut) - parseHHmmToMinutes(dutyIn))
          : null;
        const actualMinutes = (inOut.in && inOut.out)
          ? ((inOut.out.getTime() - inOut.in.getTime())/60000|0)
          : null;

        let performedStatus = '';
        if (weeklyOff) {
          performedStatus = 'Weekly Off';
        } else if (offsite) {
          performedStatus = offsiteLocationName ? `At "${offsiteLocationName}"` : 'At Offsite';
        } else if (dutyMinutes != null && actualMinutes != null) {
          performedStatus = actualMinutes >= dutyMinutes ? 'Over-Time' : 'Less-Time';
        } else if ((inOut.in && !inOut.out) || (!inOut.in && inOut.out)) {
          performedStatus = 'Single Mark';
        } else {
          performedStatus = '';
        }

        const timeInLateMin = (parseHHmmToMinutes(dutyIn) != null && inOut.in) ? ( (inOut.in.getUTCHours()*60+inOut.in.getUTCMinutes()) - parseHHmmToMinutes(dutyIn) ) : null;
        const timeInStatus = (timeInLateMin != null && timeInLateMin > 0) ? 'Late' : (timeInLateMin != null ? 'Early' : '');

        const timeOutDiffMin = (parseHHmmToMinutes(dutyOut) != null && inOut.out) ? ( (inOut.out.getUTCHours()*60+inOut.out.getUTCMinutes()) - parseHHmmToMinutes(dutyOut) ) : null;
        const timeOutStatus = (timeOutDiffMin != null && timeOutDiffMin < 0) ? 'Early' : (timeOutDiffMin != null && timeOutDiffMin > 0 ? 'Late-Sitting' : '');

        rows.push({
          employeeId: emp.id,
          cnic: emp.cnic || null,
          name: emp.full_name,
          designation,
          actualCostCenter: roleTag,
          biometricCostCenter: loc.name,
          date: formatYMD(date),
          dateLabel: `${dayName(date)}, ${date.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`,
          time1,
          time2,
          dutyIn: dutyIn || '',
          dutyOut: dutyOut || '',
          dutyTimings: (dutyMinutes!=null) ? `${Math.floor(dutyMinutes/60)}:${String(dutyMinutes%60).padStart(2,'0')}` : '',
          actualPerformed: (actualMinutes!=null) ? `${Math.floor(actualMinutes/60)}:${String(actualMinutes%60).padStart(2,'0')}` : '',
          performedStatus,
          timeInLate: (timeInLateMin!=null) ? `${Math.abs(Math.floor(timeInLateMin/60))}:${String(Math.abs(timeInLateMin%60)).padStart(2,'0')}` : '',
          timeInStatus,
          singleMark: (inOut.in && !inOut.out) || (!inOut.in && inOut.out),
          timeOutEarlyLate: (timeOutDiffMin!=null) ? `${Math.abs(Math.floor(timeOutDiffMin/60))}:${String(Math.abs(timeOutDiffMin%60)).padStart(2,'0')}` : '',
          timeOutStatus,
          weeklyOff,
          offsite,
          offsiteLocation: offsiteLocationName || '',
          scheduleSource: day.source // ROSTER | HQ_DEFAULT
        });
      }
    }

    res.json({ success: true, location: { id: loc.id, name: loc.name }, range: { start: formatYMD(start), end: formatYMD(end) }, rows });
  } catch (e) {
    console.error('locationAgainstRoster error', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

// New: list active non-deleted locations (with district/city names and
// current active-employee counts for the landing page)
async function listLocations(req, res) {
  try {
    const [locations, counts] = await Promise.all([
      prisma.location.findMany({
        where: { is_deleted: false, is_active: true },
        include: { district: { select: { name: true } }, city: { select: { name: true } } },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      prisma.employment.groupBy({
        by: ['location_id'],
        where: { is_current: true, is_deleted: false, employee: { is_deleted: false, status: 'Active' } },
        _count: { _all: true },
      }),
    ]);
    const countByLoc = new Map(counts.map((c) => [c.location_id, c._count._all]));
    res.json({
      success: true,
      locations: locations.map((l) => ({ ...l, active_employees: countByLoc.get(l.id) || 0 })),
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// New: Location Salary Summary Report (LSR)
async function locationLSR(req, res) {
  try {
    const locationId = Number(req.params.id);
    const loc = await prisma.location.findFirst({ where: { id: locationId, is_deleted: false, is_active: true } });
    if (!loc) return res.status(404).json({ success: false, error: 'Location not found' });

    // Parse month=YYYY-MM (month represents cycle END month e.g. 2025-07 => 21 Jun - 20 Jul)
    const monthParam = String(req.query.month || '').trim();
    let cycleStart, cycleEnd, cycleLabel;
    if (/^\d{4}-\d{2}$/.test(monthParam)) {
      const y = parseInt(monthParam.slice(0,4),10);
      const m0 = parseInt(monthParam.slice(5,7),10)-1; // 0-based end month
      const startMonth0 = m0 === 0 ? 11 : m0-1;
      const startYear = m0 === 0 ? y-1 : y;
      cycleStart = new Date(Date.UTC(startYear, startMonth0, 21));
      cycleEnd = new Date(Date.UTC(y, m0, 20));
      const endMonthName = cycleEnd.toLocaleString('en-US',{ month:'long', timeZone:'UTC' });
      cycleLabel = `${endMonthName} ${cycleEnd.getUTCFullYear()}`;
    } else {
      // fallback to default payroll logic
      const r = getDefaultPayrollRangeUTC(new Date());
      cycleStart = r.start; cycleEnd = r.end;
      const endMonthName = cycleEnd.toLocaleString('en-US',{ month:'long', timeZone:'UTC' });
      cycleLabel = `${endMonthName} ${cycleEnd.getUTCFullYear()}`;
    }

    // Current employments at this location; schedules resolved via the shared
    // resolver (approved rosters + HQ default hours)
    const employmentsAtLocation = await prisma.employment.findMany({
      where: { is_deleted: false, is_current: true, location_id: locationId, employee: { is_deleted: false } },
      include: { designation: true, role_tag: true, salary: true, employee: true }
    });
    const allEmpIds = employmentsAtLocation.map(e => e.employee_id);

    if (!allEmpIds.length) {
      return res.json({ success: true, location: { id: loc.id, name: loc.name }, cycle: { start: formatYMD(cycleStart), end: formatYMD(cycleEnd), label: cycleLabel }, employees: [] });
    }

    // Load basic employee info + current employment (for designation if not in employmentAtLocation list)
    const employees = await prisma.employee.findMany({
      where: { id: { in: allEmpIds }, is_deleted: false },
      select: { id: true, full_name: true, cnic: true, employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, role_tag: true, salary: true } } }
    });

    // Attendance for present calculation (by cnic)
    const cnics = employees.map(e => norm(e.cnic)).filter(Boolean);
    const attendanceRows = await fetchAttendanceByCnics(cnics, cycleStart, cycleEnd);
    const presentSet = new Set(attendanceRows.map(a => `${norm(a.cnic)}|${formatYMD(a.attendanceDate)}`));

    // Leaves in range (all statuses)
    const leaveRows = await prisma.leave.findMany({
      where: { employee_id: { in: allEmpIds }, is_deleted: false, date: { gte: cycleStart, lte: cycleEnd } },
      select: { employee_id: true, date: true, status: true, type: true }
    });
    const approvedLeaveByEmp = new Map();
    const unapprovedLeaveByEmp = new Map(); // pending + rejected counts
    for (const l of leaveRows) {
      const key = l.employee_id;
      if (l.status === 'APPROVED') {
        if (!approvedLeaveByEmp.has(key)) approvedLeaveByEmp.set(key, []);
        approvedLeaveByEmp.get(key).push(l.date);
      } else if (l.status === 'PENDING' || l.status === 'REJECTED') {
        unapprovedLeaveByEmp.set(key, (unapprovedLeaveByEmp.get(key) || 0) + 1);
      }
    }

    // Active leave bank (reuse logic from leave module simplified)
    const activeBank = await prisma.leaveBank.findFirst({ where: { is_deleted: false, period_start: { lte: cycleEnd }, period_end: { gte: cycleStart } }, include: { defaults: true } });
    let leaveTypes = [];
    let bankAllocations = [];
    let leavesInBankPeriod = [];
    if (activeBank) {
      leaveTypes = await prisma.leaveType.findMany({ where: { is_deleted: false, is_active: true } });
      bankAllocations = await prisma.leaveBankAllocation.findMany({ where: { leave_bank_id: activeBank.id, employee_id: { in: allEmpIds } } });
      leavesInBankPeriod = await prisma.leave.findMany({ where: { is_deleted: false, employee_id: { in: allEmpIds }, date: { gte: activeBank.period_start, lte: activeBank.period_end } }, select: { employee_id: true, type: true, status: true } });
    }
    // Build bank summary per employee
    const defaultsMap = new Map();
    for (const d of (activeBank?.defaults || [])) defaultsMap.set(d.leave_type_id, d.days);
    const allocByEmp = new Map();
    for (const a of bankAllocations) {
      if (!allocByEmp.has(a.employee_id)) allocByEmp.set(a.employee_id, new Map());
      allocByEmp.get(a.employee_id).set(a.leave_type_id, a.days);
    }
    const usedApproved = new Map();
    const usedPending = new Map();
    for (const l of leavesInBankPeriod) {
      const typeName = l.type || '';
      const type = leaveTypes.find(t => t.name === typeName);
      if (!type) continue;
      const key = `${l.employee_id}|${type.id}`;
      if (l.status === 'APPROVED') usedApproved.set(key, (usedApproved.get(key)||0)+1);
      else if (l.status === 'PENDING') usedPending.set(key, (usedPending.get(key)||0)+1);
    }

    function bankSummaryFor(empId) {
      if (!activeBank) return null;
      const rows = leaveTypes.map(t => {
        const alloc = (allocByEmp.get(empId)?.get(t.id)) ?? defaultsMap.get(t.id) ?? 0;
        const approved = usedApproved.get(`${empId}|${t.id}`) || 0;
        const pending = usedPending.get(`${empId}|${t.id}`) || 0;
        return { typeName: t.name, allocated: alloc, approvedUsed: approved, pending, available: Math.max(0, alloc - approved) };
      });
      return { bankId: activeBank.id, title: activeBank.title, period_start: activeBank.period_start, period_end: activeBank.period_end, items: rows };
    }

    // Build date array for cycle (for presence & weekly off detection)
    const dayList = []; let d = cycleStart; while (d <= cycleEnd) { dayList.push(new Date(d)); d = addDays(d,1); }

    const resolver = await buildScheduleResolver(allEmpIds, cycleStart, cycleEnd);

    const employeesOutput = [];
    let sr = 1;
    for (const emp of employees) {
      const currentEmployment = emp.employmentRecords?.[0] || null;
      const designation = currentEmployment?.designation?.title || null;
      const salary = currentEmployment?.salary || null;
      const accountHolderName = emp.full_name || null; // no separate holder name in schema
      const branchCode = salary?.bank_branch_code || null;
      const accountNumber = salary?.bank_account_primary || null;
      const ecnic = norm(emp.cnic);

      // Schedule-covered dates via the shared resolver (rosters + HQ defaults)
      const { coveredDates, weeklyOffDates, dutyDates } = tallySchedule(resolver, emp.id, dayList);
      if (!coveredDates.length) {
        // No schedule at all during cycle: skip (not part of LSR)
        continue;
      }

      const dutyDateSet = new Set(dutyDates.map(dt => formatYMD(dt)));

      // Present days (attendance mark on covered non-weekly-off dates)
      let presentDays = 0;
      for (const ymdDate of dutyDateSet) {
        if (ecnic && presentSet.has(`${ecnic}|${ymdDate}`)) presentDays++;
      }

      const workingDays = coveredDates.length; // includes weekly offs

      // Approved leaves count only on duty dates (leave on a weekly off must
      // not be subtracted twice in the absents formula)
      const approvedLeaveDates = (approvedLeaveByEmp.get(emp.id) || []).filter(dt => dutyDateSet.has(formatYMD(dt)));
      const approvedFullDayLeaves = approvedLeaveDates.length; // short leave skipped per instruction

      const weeklyOffCount = weeklyOffDates.length;

      const absents = Math.max(0, workingDays - weeklyOffCount - approvedFullDayLeaves - presentDays);
      const unapprovedLeaves = unapprovedLeaveByEmp.get(emp.id) || 0;

      // Weekly off display simple formatting (dd-MM-YYYY separated by space)
      const weeklyOffDisplay = weeklyOffDates.map(dt => {
        const dd = String(dt.getUTCDate()).padStart(2,'0');
        const mm = String(dt.getUTCMonth()+1).padStart(2,'0');
        const yyyy = dt.getUTCFullYear();
        return `${dd}-${mm}-${yyyy}`;
      }).join(' ');

      const approvedLeaveDisplay = approvedLeaveDates.map(dt => {
        const dd = String(dt.getUTCDate()).padStart(2,'0');
        const mm = String(dt.getUTCMonth()+1).padStart(2,'0');
        const yyyy = dt.getUTCFullYear();
        return `${dd}-${mm}-${yyyy}`;
      }).join(',');

      employeesOutput.push({
        sr: sr++,
        employeeId: emp.id,
        bazaarName: loc.name,
        name: emp.full_name,
        designation,
        cnic: emp.cnic || null,
        bank: { accountHolderName, branchCode, accountNumber },
        totals: {
          workingDays,
          presentDays,
            absents: absents || undefined,
          holidays: weeklyOffCount, // per clarification holidays = weekly offs
          weeklyOffCount,
          fullDayLeaves: approvedFullDayLeaves,
          unapprovedLeaves
        },
        weeklyOffDates: weeklyOffDates.map(d=>formatYMD(d)),
        weeklyOffDisplay,
        approvedFullDayLeaveDates: approvedLeaveDates.map(d=>formatYMD(d)),
        approvedLeaveDisplay,
        leaveBankSummary: bankSummaryFor(emp.id),
        remarks: currentEmployment?.remarks || ''
      });
    }

    res.json({ success: true, location: { id: loc.id, name: loc.name }, cycle: { start: formatYMD(cycleStart), end: formatYMD(cycleEnd), label: cycleLabel }, generatedAt: new Date().toISOString(), employees: employeesOutput });
  } catch (e) {
    console.error('locationLSR error', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = { locationFMO, locationAgainstRoster, listLocations, locationLSR };
