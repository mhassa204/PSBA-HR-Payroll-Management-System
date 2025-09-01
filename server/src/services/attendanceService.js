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
          timestamp: r.timestamp, // already in Pakistan local time (24h)
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

module.exports = { toPakistanDate, normalizeDatePK, reduceFirstLastByDay, upsertAttendanceForDevice };
