const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizeDateUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function reduceFirstLastByDay(logs) {
  // logs: [{ deviceUserId, recordTime, ip }]
  // group by user + day
  const map = new Map();
  for (const l of logs) {
    const day = normalizeDateUTC(l.recordTime).toISOString();
    const key = `${l.deviceUserId}__${day}`;
    const current = map.get(key) || { first: null, last: null };
    if (!current.first || l.recordTime < current.first.recordTime) current.first = l;
    if (!current.last || l.recordTime > current.last.recordTime) current.last = l;
    map.set(key, current);
  }
  const result = [];
  for (const [key, { first, last }] of map.entries()) {
    if (first) result.push({ deviceUserId: first.deviceUserId, timestamp: new Date(first.recordTime), type: 'IN', attendanceDate: normalizeDateUTC(first.recordTime) });
    if (last && (!first || first.recordTime.getTime() !== last.recordTime.getTime())) {
      result.push({ deviceUserId: last.deviceUserId, timestamp: new Date(last.recordTime), type: 'OUT', attendanceDate: normalizeDateUTC(last.recordTime) });
    }
  }
  return result;
}

async function upsertAttendanceForDevice(ip, port, reduced, deviceId) {
  // reduced: [{ deviceUserId, timestamp, type, attendanceDate }]
  const writes = [];
  for (const r of reduced) {
    writes.push(
      prisma.attendance.upsert({
        where: {
          unique_daily_type_per_device_user: {
            deviceUserId: r.deviceUserId,
            device_ip: ip,
            device_port: Number(port),
            type: r.type,
            attendanceDate: r.attendanceDate,
          },
        },
        create: {
          deviceUserId: r.deviceUserId,
          timestamp: r.timestamp,
          type: r.type,
          attendanceDate: r.attendanceDate,
          device_ip: ip,
          device_port: Number(port),
          device_id: deviceId || null,
        },
        update: {
          timestamp: r.timestamp,
          updatedAt: new Date(),
        },
      })
    );
  }
  await prisma.$transaction(writes);
}

module.exports = { normalizeDateUTC, reduceFirstLastByDay, upsertAttendanceForDevice };
