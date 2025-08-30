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

module.exports = { listDevices, fetchAndSaveForDevice, fetchAndSaveForAll };
