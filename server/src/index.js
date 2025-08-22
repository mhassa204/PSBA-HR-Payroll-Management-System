require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const employeeRoutes = require("./routes/employeeRoutes");
const employmentRoutes = require("./routes/employmentRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const designationRoutes = require("./routes/designationRoutes");
const roleTagRoutes = require("./routes/roleTagRoutes");
const scaleGradeRoutes = require("./routes/scaleGradeRoutes");
const roleRoutes = require("./routes/roleRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const multer = require("multer");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const authRoutes = require("./routes/authRoutes");

const app = express(); 
const PORT = process.env.PORT || 3000;

// Use project root for consistent relative paths
const projectRoot = path.resolve(__dirname, "..");
const uploadDir = path.join(projectRoot, "uploads");

// Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Upload directory created:", uploadDir);
}

// Serve uploads folder
app.use("/uploads", express.static(uploadDir));

// CORS config
const corsOptions = {
  origin: ["http://localhost:5173","http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// Postgres connection pool for session store
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "supersecret", // Change for production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 3600000 },
}));

// Mount auth routes so frontend can call /api/login, /api/logout, /api/me
app.use("/api", authRoutes);

// Routes
app.use("/api/employees", employeeRoutes);
app.use("/api/employment", employmentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/role-tags", roleTagRoutes);
app.use("/api/scale-grades", scaleGradeRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
const { isAuthenticated } = require("./middleware/auth");
app.use("/api/admin", isAuthenticated, adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    console.error("Upload error:", err);
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server also accessible on http://172.16.21.178:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
