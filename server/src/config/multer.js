const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define document types mapping
const DOCUMENT_TYPES = {
  'profile_picture_file': 'profile',
  'medical_fitness_file': 'medical',
  'cnic_front': 'cnicfront',
  'cnic_back': 'cnicback',
  'cnic_documents': 'cnic', // Generic CNIC documents
  'domicile_certificate': 'domicile',
  'disability_document': 'disability',
  'certificates': 'certificate',
  'matric_certificate': 'matric',
  'fsc_certificate': 'fsc',
  'education_documents': 'education',
  'experience_documents': 'experience',
  'other_documents': 'other'
};

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

        // Determine document type from fieldname
        const documentType = DOCUMENT_TYPES[file.fieldname] || 'other';

        // Enhanced naming pattern: employee_cnic_fullname_[documentType]
        const filename = `employee_${cnic}_${name}_${documentType}${ext}`;

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
      // Extended file type support for different document types
      const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
      const extValid = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
      );

      // Extended MIME type support
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      const mimeValid = allowedMimeTypes.includes(file.mimetype.toLowerCase());

      if (extValid && mimeValid) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG, JPG, PNG, PDF, DOC, DOCX, or TXT files are allowed"));
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

  // Export both the upload instance and document types for use in controllers
  module.exports = upload;
  module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
} catch (err) {
  console.error("Error in multer setup:", err);
  module.exports = (req, res, next) => {
    res.status(500).json({ error: "File upload setup failed." });
  };
}
