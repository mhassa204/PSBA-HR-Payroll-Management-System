require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const multer = require("multer");

// Routes
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const employmentRoutes = require("./routes/employmentRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const designationRoutes = require("./routes/designationRoutes");
const roleTagRoutes = require("./routes/roleTagRoutes");
const scaleGradeRoutes = require("./routes/scaleGradeRoutes");
const roleRoutes = require("./routes/roleRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const systemSettingsRoutes = require("./routes/systemSettingsRoutes");
const locationRoutes = require("./routes/locationRoutes");
const rosterRoutes = require("./routes/rosterRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const leaveBankRoutes = require("./routes/leaveBankRoutes");
const districtRoutes = require("./routes/districtRoutes");
const cityRoutes = require("./routes/cityRoutes");
const educationLevelRoutes = require("./routes/educationLevelRoutes");
const travelRoutes = require("./routes/travelRoutes");
const travelRateRoutes = require("./routes/travelRateRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const payrollTranchRoutes = require("./routes/payrollTranchRoutes");
const { isAuthenticated } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ CORS must come before everything else
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://175.107.30.178:5175",
    "http://192.168.1.115:5175",
  ],
  credentials: true,
  optionsSuccessStatus: 200, // ✅ fixed spelling
};
app.use(cors(corsOptions));

// ✅ Ensure body parsing is before routes
app.use(express.json());

// ✅ Handle uploads
const projectRoot = path.resolve(__dirname, "..");
const uploadDir = path.join(projectRoot, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Upload directory created:", uploadDir);
}
app.use("/uploads", express.static(uploadDir));
app.use("/api/uploads", express.static(uploadDir));
app.use("/uploads/leaves", express.static(path.join(uploadDir, "leaves")));

// ✅ Sessions
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // use HTTPS + true in production
      httpOnly: true,
      sameSite: "lax", // ✅ use lax instead of none for dev (browser safe)
      maxAge: 3600000,
    },
  })
);

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/settings", systemSettingsRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/employment", employmentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/role-tags", roleTagRoutes);
app.use("/api/scale-grades", scaleGradeRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/rosters", rosterRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/leave-banks", leaveBankRoutes);
app.use("/api/districts", districtRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/education-levels", educationLevelRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api", travelRateRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/payroll-tranches", payrollTranchRoutes);
app.use("/api/admin", isAuthenticated, adminRoutes);

// ✅ Error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    console.error("Upload error:", err);
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

// ✅ Start server
const server = app.listen(PORT, '0.0.0.0',  () => {
  console.log(`✅ Server running on:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://192.168.1.115:${PORT}`);
});

server.on("error", (err) =>
   {
  console.error("Server error:", err);
});
