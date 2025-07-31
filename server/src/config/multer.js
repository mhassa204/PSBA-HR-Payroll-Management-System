const multer = require("multer");
const path = require("path");
const fs = require("fs");

try {
  // Absolute upload path
  const uploadDir = path.join(__dirname, "../../uploads");

  // Ensure the directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Upload directory created at:", uploadDir);
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir); // Absolute path
    },
    filename: (req, file, cb) => {
      try {
        const cnic = req.body.cnic || "unknown";
        const name = req.body.full_name?.replace(/\s+/g, "_") || "noname";
        const ext = path.extname(file.originalname);
        const filename = `employee_${cnic}_${name}${ext}`;

        // Set the relative path for access later
        req.savedRelativePath = path.join("uploads", filename);

        cb(null, filename);
      } catch (err) {
        console.error("Error in generating filename:", err);
        cb(err);
      }
    },
  });

  const fileFilter = (req, file, cb) => {
    try {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extValid = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      const mimeValid = allowedTypes.test(file.mimetype.toLowerCase());

      if (extValid && mimeValid) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG, JPG, PNG, or PDF files are allowed"));
      }
    } catch (err) {
      console.error("Error in file filter:", err);
      cb(err);
    }
  };

  const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    fileFilter,
  });

  module.exports = upload;
} catch (err) {
  console.error("Error in multer setup:", err);
  module.exports = (req, res, next) => {
    res.status(500).json({ error: "File upload setup failed." });
  };
}
