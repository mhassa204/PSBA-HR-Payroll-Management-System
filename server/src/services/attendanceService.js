const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toPakistanDate(date) {
  const d = new Date(date);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type) => parts.find(p => p.type === type)?.value;
  // Build a Date using the PK local components as if they are UTC components,
  // so the stored wall clock time equals Pakistan local time (24h)
  return new Date(Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second'))
  ));
}

function normalizeDatePK(date) {
  const pk = toPakistanDate(date);
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate()));
}

function reduceFirstLastByDay(logs) {
  // logs: [{ deviceUserId, recordTime, ip }]
  // group by user + PK day
  const map = new Map();
  for (const l of logs) {
    const day = normalizeDatePK(l.recordTime).toISOString();
    const key = `${l.deviceUserId}__${day}`;
    const current = map.get(key) || { first: null, last: null };
    if (!current.first || l.recordTime < current.first.recordTime) current.first = l;
    if (!current.last || l.recordTime > current.last.recordTime) current.last = l;
    map.set(key, current);
  }
  const result = [];
  for (const [, { first, last }] of map.entries()) {
    if (first) result.push({
      deviceUserId: first.deviceUserId,
      // Save timestamp in Pakistan time (24h components preserved)
      timestamp: toPakistanDate(first.recordTime),
      type: 'IN',
      attendanceDate: normalizeDatePK(first.recordTime)
    });
    if (last && (!first || first.recordTime.getTime() !== last.recordTime.getTime())) {
      result.push({
        deviceUserId: last.deviceUserId,
        timestamp: toPakistanDate(last.recordTime),
        type: 'OUT',
        attendanceDate: normalizeDatePK(last.recordTime)
      });
    }
  }
  return result;
}

async function upsertAttendanceForDevice(ip, port, reduced, deviceId) {
  // Insert mostly-new records, and update existing daily IN/OUT when a newer timestamp arrives
  const devicePort = Number(port);
  if (!Array.isArray(reduced) || !reduced.length) return 0;

  // 1) Device-level last timestamp to gate inserts
  const last = await prisma.attendance.findFirst({
    where: { device_ip: ip, device_port: devicePort },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  });
  const lastTs = last?.timestamp || null;

  // 2) Prepare range and duids to fetch existing rows for the same daily keys
  const duidsSet = new Set();
  let minDate = null, maxDate = null;
  for (const r of reduced) {
    if (r.deviceUserId) duidsSet.add(r.deviceUserId);
    const d = r.attendanceDate;
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  }
  const duids = Array.from(duidsSet);

  const existingRows = duids.length ? await prisma.attendance.findMany({
    where: {
      device_ip: ip,
      device_port: devicePort,
      deviceUserId: { in: duids },
      attendanceDate: { gte: minDate, lte: maxDate },
      type: { in: ['IN', 'OUT'] },
    },
    select: { id: true, deviceUserId: true, attendanceDate: true, type: true, timestamp: true },
  }) : [];

  const existingMap = new Map(); // key: duid|type|dateISO -> row
  for (const row of existingRows) {
    const key = `${row.deviceUserId}|${row.type}|${row.attendanceDate.toISOString()}`;
    existingMap.set(key, row);
  }

  // 3) Decide creates vs updates
  const toCreate = [];
  const toUpdate = [];
  for (const r of reduced) {
    const key = `${r.deviceUserId}|${r.type}|${r.attendanceDate.toISOString()}`;
    const existing = existingMap.get(key);
    if (existing) {
      if (r.timestamp > existing.timestamp) {
        toUpdate.push({ id: existing.id, timestamp: r.timestamp });
      }
    } else {
      // Only insert rows strictly newer than the device's last known timestamp
      if (!lastTs || r.timestamp > lastTs) {
        toCreate.push({
          deviceUserId: r.deviceUserId,
          timestamp: r.timestamp,
          type: r.type,
          attendanceDate: r.attendanceDate,
          device_ip: ip,
          device_port: devicePort,
          device_id: deviceId || null,
        });
      }
    }
  }

  // 4) Perform DB operations efficiently
  let createdCount = 0;
  if (toCreate.length) {
    const result = await prisma.attendance.createMany({ data: toCreate, skipDuplicates: true });
    createdCount = result.count || 0;
  }
  if (toUpdate.length) {
    await prisma.$transaction(
      toUpdate.map(u => prisma.attendance.update({ where: { id: u.id }, data: { timestamp: u.timestamp, updatedAt: new Date() } }))
    );
  }

  return createdCount + toUpdate.length;
}

module.exports = { toPakistanDate, normalizeDatePK, reduceFirstLastByDay, upsertAttendanceForDevice };
