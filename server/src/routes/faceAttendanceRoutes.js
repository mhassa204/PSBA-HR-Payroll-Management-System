/**
 * Read access to the locally-mirrored face-recognition attendance (FaceAttendance),
 * plus manual triggers for the droplet sync jobs. Mounted at /api/face-attendance.
 */
const express = require("express");
const router = express.Router();
const { isAuthenticated, authorize } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const { pushEmployees, pullAttendance, pruneBackup } = require("../jobs/attendanceSync");

// GET /api/face-attendance?cnic=&from=&to=&type=&limit=&offset=
// Reads the face-sourced rows from the shared Attendance table.
router.get("/", isAuthenticated, authorize("attendance.read"), async (req, res) => {
  try {
    const { cnic, from, to, type } = req.query;
    const limit = Math.min(Number(req.query.limit) || 200, 2000);
    const offset = Number(req.query.offset) || 0;
    const where = {};
    if (cnic) where.cnic = String(cnic).replace(/\D/g, "");
    if (type) where.type = String(type).toUpperCase(); // IN | OUT
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }
    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.attendance.count({ where }),
    ]);
    res.json({ success: true, total, count: records.length, records });
  } catch (e) {
    console.error("face-attendance list", e);
    res.status(500).json({ success: false, error: "Failed to list attendance" });
  }
});

// GET /api/face-attendance/status — sync health
router.get("/status", isAuthenticated, authorize("attendance.read"), async (_req, res) => {
  try {
    const [count, latest, cursor, pushAt] = await Promise.all([
      prisma.attendance.count(),
      prisma.attendance.findFirst({ orderBy: { timestamp: "desc" }, select: { timestamp: true } }),
      prisma.systemSetting.findUnique({ where: { key: "attendance_sync.cursor" } }),
      prisma.systemSetting.findUnique({ where: { key: "attendance_sync.employee_push_at" } }),
    ]);
    res.json({
      success: true,
      backupRecords: count,
      latestPunch: latest?.timestamp || null,
      attendanceCursor: cursor?.value || null,
      lastEmployeePushAt: pushAt?.value || null,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to read sync status" });
  }
});

// POST /api/face-attendance/sync/:job  job = employees | attendance | prune | all
router.post("/sync/:job", isAuthenticated, authorize("attendance.read"), async (req, res) => {
  try {
    const job = req.params.job;
    const out = {};
    if (job === "employees" || job === "all") out.employees = await pushEmployees({ full: true });
    if (job === "attendance" || job === "all") out.attendance = await pullAttendance();
    if (job === "prune" || job === "all") out.prune = await pruneBackup();
    if (!Object.keys(out).length) {
      return res.status(400).json({ success: false, error: "Unknown job (employees|attendance|prune|all)" });
    }
    res.json({ success: true, ...out });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
