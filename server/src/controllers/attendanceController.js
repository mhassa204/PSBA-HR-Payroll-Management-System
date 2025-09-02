const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ZKLib = require("node-zklib");
const { reduceFirstLastByDay, upsertAttendanceForDevice } = require("../services/attendanceService");

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
    await upsertAttendanceForDevice(device.ip_address, device.port_number, reduced, device.id);

    res.json({ success: true, fetched: rows.length, saved: reduced.length });
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
        await upsertAttendanceForDevice(device.ip_address, device.port_number, reduced, device.id);
        totalSaved += reduced.length;
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

module.exports = { listDevices, fetchAndSaveForDevice, fetchAndSaveForAll, listEmployeesForDeviceUsers, setEmployeeDeviceUserId };
