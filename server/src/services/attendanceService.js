const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toPakistanDate(date) {
  const d = new Date(date);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  // Build a Date using the PK local components as if they are UTC components,
  // so the stored wall clock time equals Pakistan local time (24h)
  return new Date(
    Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")),
      Number(get("minute")),
      Number(get("second"))
    )
  );
}

function normalizeDatePK(date) {
  const pk = toPakistanDate(date);
  return new Date(
    Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate())
  );
}

function reduceFirstLastByDay(logs) {
  // logs: [{ deviceUserId, recordTime, ip }]
  // group by user + PK day
  const map = new Map();
  for (const l of logs) {
    const day = normalizeDatePK(l.recordTime).toISOString();
    const key = `${l.deviceUserId}__${day}`;
    const current = map.get(key) || { first: null, last: null };
    if (!current.first || l.recordTime < current.first.recordTime)
      current.first = l;
    if (!current.last || l.recordTime > current.last.recordTime)
      current.last = l;
    map.set(key, current);
  }
  const result = [];
  for (const [, { first, last }] of map.entries()) {
    if (first)
      result.push({
        deviceUserId: first.deviceUserId,
        // Save timestamp in Pakistan time (24h components preserved)
        timestamp: toPakistanDate(first.recordTime),
        type: "IN",
        attendanceDate: normalizeDatePK(first.recordTime),
      });
    if (
      last &&
      (!first || first.recordTime.getTime() !== last.recordTime.getTime())
    ) {
      result.push({
        deviceUserId: last.deviceUserId,
        timestamp: toPakistanDate(last.recordTime),
        type: "OUT",
        attendanceDate: normalizeDatePK(last.recordTime),
      });
    }
  }
  return result;
}

async function upsertAttendanceForDevice(ip, port, reduced, deviceId) {
  // Insert mostly-new records, and update existing daily IN/OUT when a newer timestamp arrives
  const devicePort = Number(port);
  if (!Array.isArray(reduced) || !reduced.length) return 0;

  // Note: Do NOT gate inserts by device-last-timestamp.
  // We reconcile globally per user+day, so cross-device sequences (IN on A, OUT on B)
  // must be allowed even if one device has a newer lastTs. Rely on existingMap below
  // to prevent duplicates and keep earliest IN and latest OUT for the day.

  // 2) Prepare range and duids to fetch existing rows for the same daily keys
  const duidsSet = new Set();
  let minDate = null,
    maxDate = null;
  for (const r of reduced) {
    if (r.deviceUserId) duidsSet.add(r.deviceUserId);
    const d = r.attendanceDate;
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  }
  const duids = Array.from(duidsSet);

  // Fetch existing IN/OUT records for deviceUserId and attendanceDate globally (not per device)
  const existingRows = duids.length
    ? await prisma.attendance.findMany({
        where: {
          deviceUserId: { in: duids },
          attendanceDate: { gte: minDate, lte: maxDate },
          type: { in: ["IN", "OUT"] },
        },
        select: {
          id: true,
          deviceUserId: true,
          attendanceDate: true,
          type: true,
          timestamp: true,
        },
      })
    : [];

  const existingMap = new Map(); // key: duid|type|dateISO -> row
  for (const row of existingRows) {
    const key = `${row.deviceUserId}|${
      row.type
    }|${row.attendanceDate.toISOString()}`;
    existingMap.set(key, row);
  }

  // 3) Decide creates vs updates
  const toCreate = [];
  const toUpdate = [];
  for (const r of reduced) {
    const key = `${r.deviceUserId}|${r.type}|${r.attendanceDate.toISOString()}`;
    const existing = existingMap.get(key);
    // Also fetch existing counterparts for cross-type reconciliation
    const inKey = `${r.deviceUserId}|IN|${r.attendanceDate.toISOString()}`;
    const outKey = `${r.deviceUserId}|OUT|${r.attendanceDate.toISOString()}`;
    const existingIN = existingMap.get(inKey);
    const existingOUT = existingMap.get(outKey);
    if (existing) {
      if (r.type === "IN") {
        // Only update if new timestamp is earlier (want earliest IN)
        if (r.timestamp < existing.timestamp) {
          toUpdate.push({ id: existing.id, timestamp: r.timestamp });
        }
      } else if (r.type === "OUT") {
        // Only update if new timestamp is later (want latest OUT)
        if (r.timestamp > existing.timestamp) {
          toUpdate.push({ id: existing.id, timestamp: r.timestamp });
        }
      }
    } else {
      // Insert if no existing record for this user+day+type; global reconciliation will maintain canonical earliest IN and latest OUT.
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

    // Cross-device pairing: if we have an IN (either existing or being inserted/updated),
    // treat any later punch the same day as a candidate OUT to ensure we get a combined pair
    if (r.type === "IN" && existingIN) {
      if (!existingOUT) {
        // Create OUT if this punch is after the day's IN
        if (r.timestamp > existingIN.timestamp) {
          toCreate.push({
            deviceUserId: r.deviceUserId,
            timestamp: r.timestamp,
            type: "OUT",
            attendanceDate: r.attendanceDate,
            device_ip: ip,
            device_port: devicePort,
            device_id: deviceId || null,
          });
          // Track in map to avoid duplicate create within same loop
          existingMap.set(outKey, {
            id: null,
            deviceUserId: r.deviceUserId,
            attendanceDate: r.attendanceDate,
            type: "OUT",
            timestamp: r.timestamp,
          });
        }
      } else if (r.timestamp > existingOUT.timestamp) {
        // Update OUT to latest if this punch is even later
        toUpdate.push({ id: existingOUT.id, timestamp: r.timestamp });
        existingOUT.timestamp = r.timestamp;
      }
    } else if (r.type === "OUT" && existingIN) {
      // If OUT arrives and is later than any existing OUT, update handled above.
      // If no OUT exists, the insert above covers creation; ensure OUT >= IN
      if (!existingOUT && r.timestamp < existingIN.timestamp) {
        // Guard: if OUT earlier than IN (clock issues), skip creating invalid OUT
        // Alternatively, clamp to IN timestamp if policy requires
      }
    }
  }

  // 4) Perform DB operations efficiently
  let createdCount = 0;
  if (toCreate.length) {
    const result = await prisma.attendance.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    createdCount = result.count || 0;
  }
  if (toUpdate.length) {
    await prisma.$transaction(
      toUpdate.map((u) =>
        prisma.attendance.update({
          where: { id: u.id },
          data: { timestamp: u.timestamp, updatedAt: new Date() },
        })
      )
    );
  }

  return createdCount + toUpdate.length;
}

module.exports = {
  toPakistanDate,
  normalizeDatePK,
  reduceFirstLastByDay,
  upsertAttendanceForDevice,
};
