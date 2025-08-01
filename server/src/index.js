const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const employeeRoutes = require("./routes/employeeRoutes");
const employmentRoutes = require("./routes/employmentRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const designationRoutes = require("./routes/designationRoutes");
const multer = require("multer");

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
  origin: ["http://localhost:5173"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/employees", employeeRoutes);
app.use("/api/employment", employmentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);

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

// const express = require("express");
// const cors = require("cors");
// const path = require("path");
// const fs = require("fs");
// const employeeRoutes = require("./routes/employeeRoutes");
// const multer = require("multer");
// const session = require("express-session");
// const FileStore = require("session-file-store")(session);
// const authRoutes = require("./routes/authRoutes");
// const { isAuthenticated, hasRole } = require("./middlewares/authMiddleware");

// const app = express();
// const PORT = process.env.PORT || 3000;
// app.use(session({
//   store: new FileStore({
//     path: path.join(projectRoot, ".sessions"),
//     ttl: 3600, // 1 hour
//   }),
//   secret: process.env.SESSION_SECRET, // Change this for production
//   resave: false,
//   saveUninitialized: false,
//   cookie: { secure: false, httpOnly: true, maxAge: 3600000 },
// }));
// // Use project root for consistent relative paths
// const projectRoot = path.resolve(__dirname, "..");
// const uploadDir = path.join(projectRoot, "uploads");

// // Ensure upload folder exists
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
//   console.log("Upload directory created:", uploadDir);
// }

// // Serve uploads folder
// app.use("/uploads", express.static(uploadDir));

// // CORS config
// const corsOptions = {
//   origin: ["http://localhost:5173"],
//   credentials: true,
//   optionSuccessStatus: 200,
// };
// app.use(cors(corsOptions));
// app.use(express.json());

// // Routes
// app.use("/api/auth", authRoutes);

// // Protect employee routes
// app.use("/api/employees", isAuthenticated, employeeRoutes);

// // Error handling middleware
// app.use((err, req, res, next) => {
//   if (err instanceof multer.MulterError || err) {
//     console.error("Upload error:", err);
//     return res.status(400).json({ success: false, error: err.message });
//   }
//   next();
// });

// // Start server
// app.listen(PORT, "172.16.21.112", () => {
//   console.log(`Server running on http://172.16.21.112:${PORT}`);
// });
