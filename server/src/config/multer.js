const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Leave documents storage
const leaveStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, "../../uploads/leaves");
      // Ensure the directory exists before saving
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      console.error("❌ Failed to ensure leaves upload dir:", err);
      cb(err);
    }
  },
  filename: async (req, file, cb) => {
    try {
      // Get applicant CNIC from request body or query
      const applicantCnic = req.body.applicant_cnic || req.query.applicant_cnic;

      if (!applicantCnic) {
        return cb(
          new Error("Applicant CNIC is required for leave document upload")
        );
      }

      // Get file extension
      const ext = path.extname(file.originalname);

      // Generate filename with CNIC and timestamp, no original name
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      const filename = `leave_${applicantCnic}_${timestamp}_${randomSuffix}${ext}`;

      console.log(
        `📄 Leave document filename: ${filename} (CNIC: ${applicantCnic})`
      );
      cb(null, filename);
    } catch (err) {
      console.error("❌ Error generating leave filename:", err);
      cb(err);
    }
  },
});

const leaveUpload = multer({
  storage: leaveStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10, // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG, GIF"
        ),
        false
      );
    }
  },
});

// Define document types mapping (Frontend field name -> Backend storage type)
const DOCUMENT_TYPES = {
  // Profile and medical
  profile_picture_file: "profile_picture",
  profile_picture: "profile_picture",
  medical_fitness_file: "medical_fitness",
  medical_fitness: "medical_fitness",

  // CNIC documents
  cnic_front: "cnic_front",
  cnic_front_file: "cnic_front",
  cnic_back: "cnic_back",
  cnic_back_file: "cnic_back",
  cnic_documents: "cnic_documents",
  cnic_documents_file: "cnic_front", // Map to cnic_front for consistency

  // Other official documents
  domicile_certificate: "domicile",
  domicile_certificate_file: "domicile",
  domicile: "domicile",
  // Move medical fitness and police character to employee-level optional docs
  medical_fitness_file: "medical_fitness",
  medical_fitness: "medical_fitness",
  police_character: "police_character",
  police_character_certificate: "police_character",
  police_character_certificate_file: "police_character",
  disability_document: "disability",
  disability_document_file: "disability",
  disability: "disability",

  // Education and experience
  education_documents: "education",
  education_documents_file: "education",
  education: "education",
  experience_documents: "experience",
  experience_documents_file: "experience",
  experience: "experience",

  // Employment documents
  // removed: medical_fitness_report_pdf (moved to employee module)
  renewal_report: "renewal_report",
  renewal_report_file: "renewal_report",
  contract_renewal_report: "renewal_report",
  contract_renewal_report_file: "renewal_report",

  // Other documents
  other_documents: "other",
  other_documents_file: "other",
  other: "other",

  // Legacy support
  certificates: "domicile", // Map certificates to domicile type
  certificates_file: "domicile", // Map certificates_file to domicile type
  matric_certificate: "education",
  fsc_certificate: "education",
};

// Helper function to sanitize folder names
const sanitizeFolderName = (name) => {
  if (!name) return "unknown";
  return name
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid filesystem characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_{2,}/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, "") // Remove leading/trailing underscores
    .substring(0, 50); // Limit length to 50 characters
};

// Helper function to determine if file is an image
const isImageFile = (filename) => {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
};

// Helper function to create hierarchical directory structure with Employees layer
const createEmployeeDirectory = async (baseDir, fullName, cnic) => {
  try {
    const sanitizedName = sanitizeFolderName(fullName);
    const sanitizedCnic = sanitizeFolderName(cnic);
    const employeeDirName = `${sanitizedName}_${sanitizedCnic}`;

    // Create the Employees directory layer
    const employeesDir = path.join(baseDir, "Employees");
    const employeeDir = path.join(employeesDir, employeeDirName);
    const imagesDir = path.join(employeeDir, "images");
    const documentsDir = path.join(employeeDir, "documents");

    // Create directories if they don't exist
    await fs.mkdir(employeesDir, { recursive: true });
    await fs.mkdir(employeeDir, { recursive: true });
    await fs.mkdir(imagesDir, { recursive: true });
    await fs.mkdir(documentsDir, { recursive: true });

    console.log(`📁 Directory structure created: ${employeeDir}`);
    return {
      employeesDir,
      employeeDir,
      imagesDir,
      documentsDir,
      employeeDirName,
    };
  } catch (error) {
    console.error("❌ Error creating employee directory structure:", error);
    throw error;
  }
};

// Helper function to create hierarchical directory structure with Employment layer
const createEmploymentDirectory = async (baseDir, fullName, cnic) => {
  try {
    const sanitizedName = sanitizeFolderName(fullName);
    const sanitizedCnic = sanitizeFolderName(cnic);
    const employmentDirName = `${sanitizedName}_${sanitizedCnic}`;

    // Create the Employment directory layer
    const employmentDir = path.join(baseDir, "Employment");
    const employeeDir = path.join(employmentDir, employmentDirName);

    // Create directories if they don't exist
    await fs.mkdir(employmentDir, { recursive: true });
    await fs.mkdir(employeeDir, { recursive: true });

    console.log(`📁 Employment directory structure created: ${employeeDir}`);
    return { employmentDir, employeeDir, employmentDirName };
  } catch (error) {
    console.error("❌ Error creating employment directory structure:", error);
    throw error;
  }
};

// Helper: create Travel directories
const createTravelDirectory = async (baseDir, kind, id) => {
  const root = path.join(baseDir, "Travel");
  const folder =
    kind === "request"
      ? path.join(root, "Requests", String(id))
      : path.join(root, "Claims", String(id));
  await fs.mkdir(folder, { recursive: true });
  return folder;
};

// Absolute upload path
const uploadDir = path.join(__dirname, "../../uploads");

// Ensure the base directory exists
fs.mkdir(uploadDir, { recursive: true })
  .then(() => console.log(`📁 Upload directory ensured: ${uploadDir}`))
  .catch((err) => console.error(`❌ Error creating upload directory: ${err}`));

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let fullName = req.body.full_name;
      let cnic = req.body.cnic;

      // For updates, fetch employee data if full_name or cnic is missing
      if (
        (!fullName || !cnic) &&
        req.params.id &&
        req.originalUrl.includes("/employees/")
      ) {
        const employee = await prisma.employee.findUnique({
          where: { id: parseInt(req.params.id) },
          select: { full_name: true, cnic: true },
        });
        if (employee) {
          fullName = fullName || employee.full_name;
          cnic = cnic || employee.cnic;
        } else {
          console.warn(
            `⚠️ Employee not found for ID: ${req.params.id}, using fallback`
          );
        }
      }

      if (fullName && cnic) {
        // Use hierarchical structure
        const { imagesDir, documentsDir, employeeDirName } =
          await createEmployeeDirectory(uploadDir, fullName, cnic);
        const isImage = isImageFile(file.originalname);
        const destinationDir = isImage ? imagesDir : documentsDir;
        const subDir = isImage ? "images" : "documents";

        console.log(
          `📁 Processing file: ${file.originalname} (fieldname: ${file.fieldname})`
        );
        console.log(`📁 Base structure: uploads/Employees/`);
        console.log(`📁 Employee directory: ${employeeDirName}`);
        console.log(`📁 File type: ${isImage ? "image" : "document"}`);
        console.log(`📁 Subdirectory: ${subDir}`);
        console.log(`📁 Full destination: ${destinationDir}`);

        cb(null, destinationDir);
      } else {
        // Fallback to flat structure
        console.log(`📁 Using flat structure for file: ${file.originalname}`);
        cb(null, uploadDir);
      }
    } catch (error) {
      console.error("❌ Error in destination function:", error);
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    try {
      const cnic = req.body.cnic || "unknown";
      const fullName = req.body.full_name || "noname";
      const ext = path.extname(file.originalname);
      const originalName = path.basename(file.originalname, ext);

      // Determine document type
      let documentType = DOCUMENT_TYPES[file.fieldname];

      // Handle dynamic field names with IDs (e.g., education_documents_123)
      if (!documentType) {
        if (file.fieldname.startsWith("education_documents_")) {
          documentType = "education";
        } else if (file.fieldname.startsWith("experience_documents_")) {
          documentType = "experience";
        } else {
          documentType = "other";
        }
      }

      console.log(
        `📋 Document type mapping: ${file.fieldname} → ${documentType}`
      );

      const timestamp = Date.now();

      if (fullName !== "noname" && cnic !== "unknown") {
        // CREATE employee workflow - use hierarchical structure with correct naming
        const sanitizedName = sanitizeFolderName(fullName);
        const sanitizedCnic = sanitizeFolderName(cnic);
        const employeeDirName = `${sanitizedName}_${sanitizedCnic}`;

        // CORRECTED naming pattern: {employeeCnic}_{documentType}_{timestamp}.{extension}
        const filename = `${cnic}_${documentType}_${timestamp}${ext}`;

        // Determine subdirectory based on file type
        const isImage = isImageFile(file.originalname);
        const subDir = isImage ? "images" : "documents";

        // UPDATED: Set the complete hierarchical relative path with Employees directory
        // Store the path in a way that can be accessed per file
        const fullRelativePath = path.join(
          "uploads",
          "Employees",
          employeeDirName,
          subDir,
          filename
        );

        // Store path info that can be used by the controller
        if (!req.filePathMap) req.filePathMap = {};
        req.filePathMap[filename] = fullRelativePath.replace(/\\/g, "/");

        console.log(`📁 CREATE workflow detected:`);
        console.log(`  📋 Employee: ${fullName} (${cnic})`);
        console.log(`  📂 Base structure: uploads/Employees/`);
        console.log(`  📂 Employee directory: ${employeeDirName}`);
        console.log(
          `  📁 Subdirectory: ${subDir} (${isImage ? "image" : "document"})`
        );
        console.log(`  📄 Filename: ${filename}`);
        console.log(`  🗂️ Complete relative path: ${fullRelativePath}`);

        cb(null, filename);
      } else {
        // UPDATE employee workflow or missing data - use original naming pattern
        const sanitizedName = sanitizeFolderName(fullName);
        const random = Math.floor(Math.random() * 1000);
        const filename = `employee_${cnic}_${sanitizedName}_${documentType}_${timestamp}_${random}${ext}`;

        // Set the relative path for access later
        req.savedRelativePath = filename; // Assuming filename is the relative path for updates

        console.log(`📁 UPDATE filename: ${filename}`);
        console.log(`📁 UPDATE relative path: ${req.savedRelativePath}`);

        cb(null, filename);
      }
    } catch (err) {
      console.error("❌ Error in generating filename:", err);
      cb(err);
    }
  },
});

// Employment-specific storage configuration
const employmentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Get employee information from request body
      const employeeId = req.body.employee_id || req.body.user_id;
      let fullName = req.body.employee_name || "noname";
      let cnic = req.body.employee_cnic || "unknown";

      // If we have employee_id, try to get employee details from database
      if (employeeId) {
        try {
          const employee = await prisma.employee.findUnique({
            where: { id: parseInt(employeeId) },
            select: { full_name: true, cnic: true },
          });
          if (employee) {
            fullName = employee.full_name || fullName;
            cnic = employee.cnic || cnic;
          }
        } catch (dbError) {
          console.warn(
            "⚠️ Could not fetch employee details from DB:",
            dbError.message
          );
        }
      }

      const { employeeDir, employmentDirName } =
        await createEmploymentDirectory(uploadDir, fullName, cnic);

      // Store the employment directory name in request for filename generation
      req.employmentDirName = employmentDirName;

      console.log(`📁 Employment storage destination:`, {
        employeeId: employeeId,
        fullName: fullName,
        cnic: cnic,
        employmentDirName: employmentDirName,
        employeeDir: employeeDir,
      });

      cb(null, employeeDir);
    } catch (error) {
      console.error("❌ Error in employment storage destination:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname);
      const originalName = path.basename(file.originalname, ext);

      // Determine document type for employment files
      let documentType = "employment_doc";
      if (file.fieldname.includes("medical_fitness_report_pdf")) {
        documentType = "medical_fitness";
      } else if (file.fieldname.includes("police_character_certificate")) {
        documentType = "police_character";
      } else if (
        file.fieldname.includes("renewal_report") ||
        file.fieldname.includes("contract_renewal_report")
      ) {
        documentType = "renewal_report";
      }

      const timestamp = Date.now();
      const filename = `${documentType}_${timestamp}${ext}`;

      // Store the complete relative path for database storage
      const employmentDirName = req.employmentDirName || "unknown_unknown";
      const fullRelativePath = path.join(
        "uploads",
        "Employment",
        employmentDirName,
        filename
      );

      // Store path info that can be used by the controller
      if (!req.filePathMap) req.filePathMap = {};
      req.filePathMap[filename] = fullRelativePath.replace(/\\/g, "/");

      console.log(`📄 Employment filename: ${filename}`);
      console.log(`📄 Employment full relative path: ${fullRelativePath}`);
      console.log(`📄 Employment filePathMap:`, req.filePathMap);
      cb(null, filename);
    } catch (err) {
      console.error("❌ Error in generating employment filename:", err);
      cb(err);
    }
  },
});

// Travel Request documents storage
const travelRequestStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const id = req.params.id || req.body.request_id;
      if (!id) return cb(new Error("Missing request id"));
      const dest = await createTravelDirectory(uploadDir, "request", id);
      cb(null, dest);
    } catch (e) {
      console.error(e);
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_\-]/gi, "_")
      .slice(0, 40);
    const ts = Date.now();
    const name = `${base}_${ts}${ext}`;
    // save relative path for controllers
    const rel = path
      .join(
        "uploads",
        "Travel",
        "Requests",
        String(req.params.id || req.body.request_id),
        name
      )
      .replace(/\\/g, "/");
    file._savedRelPath = rel;
    cb(null, name);
  },
});

// Travel Claim receipts storage
const travelClaimStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const id = req.params.id || req.body.claim_id;
      if (!id) return cb(new Error("Missing claim id"));
      const dest = await createTravelDirectory(uploadDir, "claim", id);
      cb(null, dest);
    } catch (e) {
      console.error(e);
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_\-]/gi, "_")
      .slice(0, 40);
    const ts = Date.now();
    const name = `${base}_${ts}${ext}`;
    const rel = path
      .join(
        "uploads",
        "Travel",
        "Claims",
        String(req.params.id || req.body.claim_id),
        name
      )
      .replace(/\\/g, "/");
    file._savedRelPath = rel;
    cb(null, name);
  },
});

// Travel Claim receipts storage (item-level, supports multiple receipts per item)
const travelClaimItemStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const claimId = req.params.id || req.body.claim_id;
      const itemId = req.params.itemId || req.body.item_id;
      if (!claimId || !itemId) return cb(new Error("Missing claim or item id"));
      const base = path.join(
        uploadDir,
        "Travel",
        "Claims",
        String(claimId),
        "Items",
        String(itemId)
      );
      await fs.mkdir(base, { recursive: true });
      cb(null, base);
    } catch (e) {
      console.error(e);
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_\-]/gi, "_")
      .slice(0, 40);
    const ts = Date.now();
    const name = `${base}_${ts}${ext}`;
    const rel = path
      .join(
        "uploads",
        "Travel",
        "Claims",
        String(req.params.id || req.body.claim_id),
        "Items",
        String(req.params.itemId || req.body.item_id),
        name
      )
      .replace(/\\/g, "/");
    file._savedRelPath = rel;
    cb(null, name);
  },
});

// New: Travel Expense Claim Documents storage by category
const travelExpenseClaimDocStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const claimId = req.params.claimId || req.params.id || req.body.claim_id;
      const category = (req.query.category || req.body.category || "OTHER")
        .toString()
        .toUpperCase();
      if (!claimId) return cb(new Error("Missing claim id"));
      const catSafe = category.replace(/[^A-Z0-9_]/g, "");
      const base = path.join(
        uploadDir,
        "Travel",
        "Claims",
        String(claimId),
        "Documents",
        catSafe
      );
      await fs.mkdir(base, { recursive: true });
      cb(null, base);
    } catch (e) {
      console.error(e);
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_\-]/gi, "_")
      .slice(0, 40);
    const ts = Date.now();
    const name = `${base}_${ts}${ext}`;
    const category = (req.query.category || req.body.category || "OTHER")
      .toString()
      .toUpperCase();
    file._savedRelPath = path
      .join(
        "uploads",
        "Travel",
        "Claims",
        String(req.params.claimId || req.params.id || req.body.claim_id),
        "Documents",
        category.replace(/[^A-Z0-9_]/g, ""),
        name
      )
      .replace(/\\/g, "/");
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  try {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedDocumentTypes = /pdf|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase();
    const isImageExt = allowedImageTypes.test(ext);
    const isDocumentExt = allowedDocumentTypes.test(ext);
    const extValid = isImageExt || isDocumentExt;

    const allowedImageMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const allowedDocumentMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const isImageMime = allowedImageMimeTypes.includes(
      file.mimetype.toLowerCase()
    );
    const isDocumentMime = allowedDocumentMimeTypes.includes(
      file.mimetype.toLowerCase()
    );
    const mimeValid = isImageMime || isDocumentMime;

    if (extValid && mimeValid) {
      console.log(`✅ File accepted: ${file.originalname} (${file.mimetype})`);
      cb(null, true);
    } else {
      const errorMsg = `File type not allowed: ${file.originalname} (${file.mimetype}). Allowed: Images (JPG, PNG, GIF, WEBP) and Documents (PDF, DOC, DOCX)`;
      console.log(`❌ ${errorMsg}`);
      cb(new Error(errorMsg));
    }
  } catch (err) {
    console.error("❌ Error in file filter:", err);
    cb(err);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter,
});

const uploadTravelRequest = multer({
  storage: travelRequestStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});
const uploadTravelClaim = multer({
  storage: travelClaimStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});
const uploadTravelClaimItem = multer({
  storage: travelClaimItemStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});
const uploadTravelExpenseClaimDocs = multer({
  storage: travelExpenseClaimDocStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

// Export for use in routes and controllers
module.exports = upload;
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
module.exports.storage = storage;
module.exports.employmentStorage = employmentStorage;
module.exports.uploadTravelRequest = uploadTravelRequest;
module.exports.uploadTravelClaim = uploadTravelClaim;
module.exports.uploadTravelClaimItem = uploadTravelClaimItem;
module.exports.uploadTravelExpenseClaimDocs = uploadTravelExpenseClaimDocs;
module.exports.leaveUpload = leaveUpload;
