const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ZKLib = require("node-zklib");
const { reduceFirstLastByDay, upsertAttendanceForDevice } = require("../services/attendanceService");

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
function diffMinutes(a,b){ return a!=null && b!=null ? (b-a) : null; }

async function listDevices(req, res) {
  try {
    const devices = await prisma.device.findMany({ 
      where: { is_deleted: false }, 
      include: { location: true },
      orderBy: { createdAt: 'desc' } 
    });
    res.json({ success: true, devices });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function fetchAndSaveForDevice(req, res) {
  const id = Number(req.params.id);
  try {
    const device = await prisma.device.findFirst({ where: { id, is_deleted: false } });
    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });

    const zk = new ZKLib(device.ip_address, device.port_number, 10000, { ip: device.ip_address });
    await zk.createSocket();
    const raw = await zk.getAttendances();
    await zk.disconnect();

    const rows = Array.isArray(raw?.data) ? raw.data : [];

    // Map to a minimal structure and process
    const normalized = rows
      .filter(r => r.deviceUserId && r.recordTime)
      .map(r => ({ deviceUserId: String(r.deviceUserId), recordTime: new Date(r.recordTime), ip: device.ip_address }));

    const reduced = reduceFirstLastByDay(normalized);
    const inserted = await upsertAttendanceForDevice(device.ip_address, device.port_number, reduced, device.id);

    res.json({ success: true, fetched: rows.length, saved: inserted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
}

// Optional: fetch & save for all devices at once
async function fetchAndSaveForAll(req, res) {
  try {
    const devices = await prisma.device.findMany({ where: { is_deleted: false } });
    let totalFetched = 0; let totalSaved = 0;

    for (const device of devices) {
      try {
        const zk = new ZKLib(device.ip_address, device.port_number, 10000, { ip: device.ip_address });
        await zk.createSocket();
        const raw = await zk.getAttendances();
        await zk.disconnect();

        const rows = Array.isArray(raw?.data) ? raw.data : [];
        totalFetched += rows.length;

        const normalized = rows
          .filter(r => r.deviceUserId && r.recordTime)
          .map(r => ({ deviceUserId: String(r.deviceUserId), recordTime: new Date(r.recordTime), ip: device.ip_address }));

        const reduced = reduceFirstLastByDay(normalized);
        const inserted = await upsertAttendanceForDevice(device.ip_address, device.port_number, reduced, device.id);
        totalSaved += inserted;
      } catch (inner) {
        console.error(`Failed device ${device.ip_address}:${device.port_number}`, inner.message);
      }
    }

    res.json({ success: true, totalFetched, totalSaved });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// New: list employees with their deviceUserId (for assignment UI)
async function listEmployeesForDeviceUsers(req, res) {
  try {
    const search = String(req.query.search || '').trim();
    const where = {
      is_deleted: false,
      ...(search ? {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { employee_id: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { cnic: { contains: search, mode: 'insensitive' } },
        ]
      } : {})
    };
    const employees = await prisma.employee.findMany({
      where,
      select: { id: true, employee_id: true, full_name: true, cnic: true, deviceUserId: true },
      orderBy: [
        { full_name: 'asc' },
        { id: 'asc' }
      ]
    });
    res.json({ success: true, employees });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// New: set/update a specific employee's deviceUserId (unique)
async function setEmployeeDeviceUserId(req, res) {
  try {
    const employeeId = Number(req.params.employeeId);
    const { deviceUserId } = req.body || {};

    if (!employeeId || Number.isNaN(employeeId)) {
      return res.status(400).json({ success: false, error: 'Invalid employee id' });
    }

    const employee = await prisma.employee.findFirst({ where: { id: employeeId, is_deleted: false } });
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    const trimmed = (deviceUserId ?? '').toString().trim();
    if (!trimmed) {
      // Allow clearing the mapping
      const updated = await prisma.employee.update({ where: { id: employeeId }, data: { deviceUserId: null } });
      return res.json({ success: true, employee: { id: updated.id, deviceUserId: updated.deviceUserId } });
    }

    // Check uniqueness: if some other employee already has this deviceUserId
    const exists = await prisma.employee.findFirst({
      where: {
        is_deleted: false,
        deviceUserId: trimmed,
        NOT: { id: employeeId }
      },
      select: { id: true, full_name: true }
    });
    if (exists) {
      return res.status(400).json({ success: false, error: `Device User ID already assigned to ${exists.full_name} (ID: ${exists.id})` });
    }

    const updated = await prisma.employee.update({ where: { id: employeeId }, data: { deviceUserId: trimmed } });
    res.json({ success: true, employee: { id: updated.id, deviceUserId: updated.deviceUserId } });
  } catch (e) {
    // Handle unique constraint error from DB as well
    const message = e?.meta?.target?.includes('deviceUserId') ? 'Device User ID must be unique' : e.message;
    res.status(400).json({ success: false, error: message });
  }
}

// Helpers to fetch active rosters overlapping range for a location
async function getRostersForLocation(locationId, start, end) {
  return prisma.dutyRoster.findMany({
    where: {
      is_deleted: false,
      bazaar_id: Number(locationId),
      valid_to: { gte: start },
      valid_from: { lte: end },
      // Only include APPROVED rosters
      status: 'APPROVED',
    },
    include: {
      entries: { include: { employee: true } },
    }
  });
}

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

    // Fetch attendance for this location & range (across all its devices)
    const att = await prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: start, lte: end },
        device: { location_id: locationId }
      },
      select: { deviceUserId: true, attendanceDate: true }
    });

    // Map deviceUserIds to employees
    const duids = Array.from(new Set(att.map(a => a.deviceUserId).filter(Boolean)));
    const employees = duids.length ? await prisma.employee.findMany({
      where: { is_deleted: false, deviceUserId: { in: duids } },
      select: { id: true, full_name: true, cnic: true, deviceUserId: true, employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, role_tag: true } } }
    }) : [];

    // attendance set for quick presence check
    const attMap = new Map(); // key: deviceUserId|date -> true
    for (const a of att) {
      if (!a.deviceUserId) continue;
      const key = `${a.deviceUserId}|${formatYMD(a.attendanceDate)}`;
      attMap.set(key, true);
    }

    // Build rows: P if any mark exists that day for the employee's device user id, else A
    const rows = employees.map((e, idx) => {
      const designation = e.employmentRecords?.[0]?.designation?.title || null;
      const roleTag = e.employmentRecords?.[0]?.role_tag?.name || null;
      let present = 0; let absent = 0; let notMark = 0; // notMark reserved for future
      const marks = days.map(({ date }) => {
        const dm = formatYMD(date);
        const key = `${e.deviceUserId || ''}|${dm}`;
        const isP = e.deviceUserId && attMap.get(key);
        if (isP) present++; else absent++;
        return isP ? 'P' : 'A';
      });
      return {
        sr: idx+1,
        biometricId: e.deviceUserId || null,
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

    // Rosters and employees (only APPROVED via helper)
    const rosters = await getRostersForLocation(locationId, start, end);
    const entryByEmp = new Map(); // employee_id -> array of { roster, entry }
    for (const r of rosters) {
      for (const e of r.entries) {
        if (!entryByEmp.has(e.employee_id)) entryByEmp.set(e.employee_id, []);
        entryByEmp.get(e.employee_id).push({ roster: r, entry: e });
      }
    }
    const empIds = Array.from(entryByEmp.keys());

    const employees = await prisma.employee.findMany({
      where: { id: { in: empIds }, is_deleted: false },
      select: { id: true, full_name: true, cnic: true, deviceUserId: true, employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, role_tag: true } } }
    });

    const deviceUserIds = employees.map(e => e.deviceUserId).filter(Boolean);

    // Attendance logs (all types) for range & location
    const att = deviceUserIds.length ? await prisma.attendance.findMany({
      where: {
        deviceUserId: { in: deviceUserIds },
        attendanceDate: { gte: start, lte: end },
        device: { location_id: locationId }
      },
      select: { deviceUserId: true, attendanceDate: true, type: true, timestamp: true }
    }) : [];

    // Group attendance by user+date, reduce to earliest IN and latest OUT across devices
    const attByUserDate = new Map(); // key: duid|ymd -> { in: Date|null, out: Date|null }
    for (const a of att) {
      const key = `${a.deviceUserId}|${formatYMD(a.attendanceDate)}`;
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
      const entries = entryByEmp.get(emp.id) || [];

      for (const date of days) {
        // Choose an APPROVED roster entry applicable to this date. If multiple overlap, pick the one with latest valid_from (tie-breaker: latest updatedAt)
        const applicableList = entries.filter(x => x.roster.valid_from <= date && x.roster.valid_to >= date);
        if (!applicableList.length) continue; // Skip this date entirely when no approved roster exists
        const applicable = applicableList.reduce((best, curr) => {
          if (!best) return curr;
          if (curr.roster.valid_from > best.roster.valid_from) return curr;
          if (curr.roster.valid_from.getTime() === best.roster.valid_from.getTime()) {
            return (curr.roster.updatedAt > best.roster.updatedAt) ? curr : best;
          }
          return best;
        }, null);

        const sched = applicable?.entry?.day_schedules || {};
        const dayKey = dayName(date); // 'Monday', etc.
        const dayInfo = sched[dayKey] || { type: 'time', time_from: null, time_to: null };

        // Handle collective weekly off range if set
        const cwo = sched._collective_weekly_off || { enabled: false, from: null, to: null };
        const withinCwo = cwo.enabled && cwo.from && cwo.to && (new Date(cwo.from) <= date && new Date(cwo.to) >= date);

        let dutyIn = null, dutyOut = null, weeklyOff = false, offsite = false;
        let offsiteLocationName = null;
        if (withinCwo) {
          weeklyOff = true;
        } else if (dayInfo?.type === 'weekly_off') {
          weeklyOff = true;
        } else if (dayInfo?.type === 'offsite') {
          offsite = true; // treat separately if needed
          // Try to read a friendly location name from the roster day schedule
          offsiteLocationName = dayInfo.location_name || dayInfo.location || dayInfo.offsite_location || dayInfo.site || dayInfo.place || dayInfo.name || null;
        } else if (dayInfo?.type === 'time') {
          dutyIn = dayInfo.time_from || null;
          dutyOut = dayInfo.time_to || null;
        }

        const key = `${emp.deviceUserId || ''}|${formatYMD(date)}`;
        const inOut = attByUserDate.get(key) || { in: null, out: null };
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
          biometricId: emp.deviceUserId || null,
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
          offsiteLocation: offsiteLocationName || ''
        });
      }
    }

    res.json({ success: true, location: { id: loc.id, name: loc.name }, range: { start: formatYMD(start), end: formatYMD(end) }, rows });
  } catch (e) {
    console.error('locationAgainstRoster error', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

// New: list active non-deleted locations
async function listLocations(req, res) {
  try {
    const locations = await prisma.location.findMany({ where: { is_deleted: false, is_active: true }, orderBy: [{ type: 'asc' }, { name: 'asc' }] });
    res.json({ success: true, locations });
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

    // Fetch rosters & map entries by employee
    const rosters = await getRostersForLocation(locationId, cycleStart, cycleEnd);
    const rosterEntriesByEmp = new Map();
    for (const r of rosters) {
      for (const e of r.entries) {
        if (!rosterEntriesByEmp.has(e.employee_id)) rosterEntriesByEmp.set(e.employee_id, []);
        rosterEntriesByEmp.get(e.employee_id).push({ roster: r, entry: e });
      }
    }

    // Employees via roster
    const rosterEmpIds = Array.from(rosterEntriesByEmp.keys());

    // Also current employments at this location
    const employmentsAtLocation = await prisma.employment.findMany({
      where: { is_deleted: false, is_current: true, location_id: locationId, employee: { is_deleted: false } },
      include: { designation: true, role_tag: true, salary: true, employee: true }
    });
    const employmentEmpIds = employmentsAtLocation.map(e => e.employee_id);

    const allEmpIdsSet = new Set([...rosterEmpIds, ...employmentEmpIds]);
    const allEmpIds = Array.from(allEmpIdsSet);

    if (!allEmpIds.length) {
      return res.json({ success: true, location: { id: loc.id, name: loc.name }, cycle: { start: formatYMD(cycleStart), end: formatYMD(cycleEnd), label: cycleLabel }, employees: [] });
    }

    // Load basic employee info + current employment (for designation if not in employmentAtLocation list)
    const employees = await prisma.employee.findMany({
      where: { id: { in: allEmpIds }, is_deleted: false },
      select: { id: true, full_name: true, cnic: true, deviceUserId: true, employmentRecords: { where: { is_current: true, is_deleted: false }, include: { designation: true, role_tag: true, salary: true } } }
    });

    // Attendance for present calculation
    const deviceUserIds = employees.map(e => e.deviceUserId).filter(Boolean);
    const attendanceRows = deviceUserIds.length ? await prisma.attendance.findMany({
      where: { deviceUserId: { in: deviceUserIds }, attendanceDate: { gte: cycleStart, lte: cycleEnd }, device: { location_id: locationId } },
      select: { deviceUserId: true, attendanceDate: true }
    }) : [];
    const presentSet = new Set(attendanceRows.map(a => `${a.deviceUserId}|${formatYMD(a.attendanceDate)}`));

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

    const employeesOutput = [];
    let sr = 1;
    for (const emp of employees) {
      const currentEmployment = emp.employmentRecords?.[0] || null;
      const designation = currentEmployment?.designation?.title || null;
      const salary = currentEmployment?.salary || null;
      const accountHolderName = emp.full_name || null; // no separate holder name in schema
      const branchCode = salary?.bank_branch_code || null;
      const accountNumber = salary?.bank_account_primary || null;

      const rosterEntries = rosterEntriesByEmp.get(emp.id) || [];
      if (!rosterEntries.length) {
        // If not rostered at all during cycle, skip (not part of LSR) per requirement to compare roster & leave bank
        continue;
      }

      // Build a fast list of dates where roster covers employee
      // Determine for each date if covered and if weekly off
      const weeklyOffDates = [];
      const rosterCoveredDates = [];

      for (const date of dayList) {
        // determine if any roster entry valid for date
        const applicable = rosterEntries.find(re => re.roster.valid_from <= date && re.roster.valid_to >= date);
        if (!applicable) continue; // not rostered that date
        rosterCoveredDates.push(date);
        const sched = applicable.entry.day_schedules || {};
        const dayKey = dayName(date);
        const dayInfo = sched[dayKey] || null;
        const cwo = sched._collective_weekly_off || { enabled:false };
        const withinCwo = cwo.enabled && cwo.from && cwo.to && (new Date(cwo.from) <= date && new Date(cwo.to) >= date);
        if (withinCwo || dayInfo?.type === 'weekly_off') {
          weeklyOffDates.push(date);
        }
      }

      const weeklyOffSet = new Set(weeklyOffDates.map(dt => formatYMD(dt)));

      // Present days (attendance mark on roster-covered date excluding weekly offs)
      let presentDays = 0;
      for (const date of rosterCoveredDates) {
        const ymdDate = formatYMD(date);
        if (weeklyOffSet.has(ymdDate)) continue;
        if (emp.deviceUserId && presentSet.has(`${emp.deviceUserId}|${ymdDate}`)) presentDays++;
      }

      const workingDays = rosterCoveredDates.length; // includes weekly offs

      const approvedLeaveDates = (approvedLeaveByEmp.get(emp.id) || []).filter(dt => rosterCoveredDates.some(rc => formatYMD(rc) === formatYMD(dt)));
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

module.exports = { listDevices, fetchAndSaveForDevice, fetchAndSaveForAll, listEmployeesForDeviceUsers, setEmployeeDeviceUserId, locationFMO, locationAgainstRoster, listLocations, locationLSR };
