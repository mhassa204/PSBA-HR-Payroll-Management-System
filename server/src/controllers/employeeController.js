


const employeeService = require("../services/employeeService");
const path = require("path");
const { DOCUMENT_TYPES } = require("../config/multer");

const validateCNIC = (cnic) => /^\d{13}$/.test(cnic);

// Helper function to process uploaded files
const processUploadedFiles = (files, req) => {
  const processedFiles = {};
  const documentRecords = [];

  if (!files || files.length === 0) {
    console.log('📁 No files uploaded');
    return { processedFiles, documentRecords };
  }

  console.log(`📁 Processing ${files.length} files`);
  console.log(`📁 File path map:`, req.filePathMap || 'none');

  files.forEach(file => {
    const fieldName = file.fieldname;
    let documentType = DOCUMENT_TYPES[fieldName] || 'other';

    if (fieldName.startsWith('education_documents_')) {
      documentType = 'education';
    } else if (fieldName.startsWith('experience_documents_')) {
      documentType = 'experience';
    }

    let relativePath = req.filePathMap?.[file.filename];
    if (!relativePath) {
      console.warn(`⚠️ No filePathMap entry for ${file.filename}, constructing path`);
      const fullPath = file.path.replace(/\\/g, '/');
      const uploadsIndex = fullPath.indexOf('uploads');
      relativePath = uploadsIndex !== -1
        ? fullPath.substring(uploadsIndex)
        : path.join('uploads', file.filename).replace(/\\/g, '/');
    }

    console.log(`📁 Processing file: ${file.originalname}`);
    console.log(`  📄 Fieldname: ${fieldName}`);
    console.log(`  📄 Document type: ${documentType}`);
    console.log(`  🗂️ Relative path: ${relativePath}`);

    if (fieldName === 'profile_picture_file') {
      processedFiles.profile_picture_file = relativePath;
    } else if (fieldName === 'medical_fitness_file') {
      processedFiles.medical_fitness_file = relativePath;
      documentRecords.push({
        file_path: relativePath,
        file_type: 'medical_fitness',
        document_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
      });
    } else {
      let associatedId = null;
      if (fieldName.includes('_') && (documentType === 'education' || documentType === 'experience')) {
        const parts = fieldName.split('_');
        const lastPart = parts[parts.length - 1];
        if (!isNaN(lastPart)) {
          associatedId = parseInt(lastPart);
        }
      }

      documentRecords.push({
        file_path: relativePath,
        file_type: documentType,
        document_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        associated_id: associatedId,
      });
    }
  });

  console.log(`📄 Created ${documentRecords.length} document records`);
  return { processedFiles, documentRecords };
};

const employeeController = {
  createEmployee: async (req, res) => {
    try {
      console.log(`📋 Starting create employee`);
      console.log(`📋 Request body keys:`, Object.keys(req.body));
      console.log(`📋 Files received:`, req.files ? req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })) : 'none');

      const { full_name, cnic, password } = req.body;

      // Validate required fields
      const missingFields = [];
      if (!full_name) missingFields.push("full_name");

      if (missingFields.length > 0) {
        console.error(`❌ Missing fields: ${missingFields.join(", ")}`);
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      if (cnic && !validateCNIC(cnic)) {
        console.error(`❌ Invalid CNIC format`);
        return res.status(400).json({
          success: false,
          error: "Invalid CNIC format. Must be 13 digits without dashes",
        });
      }

      // Process uploaded files
      console.log('📁 Processing uploaded files');
      const { processedFiles, documentRecords } = processUploadedFiles(req.files, req);
      console.log('📁 Processed files:', processedFiles);
      console.log('📁 Document records:', documentRecords);

      // Parse JSON fields
      const processedData = { ...req.body };

      if (processedData.past_experiences && typeof processedData.past_experiences === 'string') {
        try {
          processedData.past_experiences = JSON.parse(processedData.past_experiences);
        } catch (error) {
          console.error('❌ Error parsing past_experiences:', error.message);
          processedData.past_experiences = [];
        }
      }

      if (processedData.educations && typeof processedData.educations === 'string') {
        try {
          processedData.educations = JSON.parse(processedData.educations);
        } catch (error) {
          console.error('❌ Error parsing educations:', error.message);
          processedData.educations = [];
        }
      }

      console.log('📋 Calling employeeService.createEmployee');
      console.log(`📋 Input data:`, {
        processedDataKeys: Object.keys(processedData),
        processedFilesKeys: Object.keys(processedFiles),
        documentRecordsCount: documentRecords.length,
      });

      const employee = await employeeService.createEmployee(processedData, processedFiles, documentRecords);

      console.log(`✅ Employee created successfully: ID ${employee?.id || 'unknown'}`);
      return res.status(201).json({ success: true, employee });
    } catch (error) {
      console.error('❌ Error creating employee:', error.message);
      console.error('❌ Stack trace:', error.stack);
      return res.status(400).json({ success: false, error: error.message });
    }
  },

  // Other controller methods (unchanged)
  updateEmployee: async (req, res) => {
    try {
      console.log(`📋 Starting update for employee ID: ${req.params.id}`);
      console.log(`📋 Request body keys:`, Object.keys(req.body));
      console.log(`📋 Files received:`, req.files ? req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })) : 'none');
      console.log(`📋 Documents to remove:`, req.body.documents_to_remove);

      const { cnic, full_name, documents_to_remove } = req.body;

      const missingFields = [];
      if (!full_name) missingFields.push('full_name');

      if (missingFields.length > 0) {
        console.error(`❌ Missing fields: ${missingFields.join(', ')}`);
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
      }

      if (cnic && !validateCNIC(cnic)) {
        console.error('❌ Invalid CNIC format');
        return res.status(400).json({
          success: false,
          error: 'Invalid CNIC format. Must be 13 digits without dashes',
        });
      }

      console.log('📁 Processing uploaded files');
      const { processedFiles, documentRecords } = processUploadedFiles(req.files, req);
      console.log('📁 Processed files:', processedFiles);
      console.log('📁 Document records:', documentRecords);

      const processedData = { ...req.body };

      if (documents_to_remove) {
        try {
          processedData.documents_to_remove = Array.isArray(documents_to_remove)
            ? documents_to_remove
            : JSON.parse(documents_to_remove);
        } catch (error) {
          console.warn('⚠️ Failed to parse documents_to_remove:', error.message);
          processedData.documents_to_remove = [];
        }
      } else {
        processedData.documents_to_remove = [];
      }

      if (processedData.past_experiences && typeof processedData.past_experiences === 'string') {
        try {
          processedData.past_experiences = JSON.parse(processedData.past_experiences);
        } catch (error) {
          console.error('❌ Error parsing past_experiences:', error.message);
          processedData.past_experiences = [];
        }
      }

      if (processedData.educations && typeof processedData.educations === 'string') {
        try {
          processedData.educations = JSON.parse(processedData.educations);
        } catch (error) {
          console.error('❌ Error parsing educations:', error.message);
          processedData.educations = [];
        }
      }

      console.log('📋 Calling employeeService.updateEmployee');
      const employee = await employeeService.updateEmployee(
        req.params.id,
        processedData,
        processedFiles,
        documentRecords
      );

      console.log(`✅ Employee updated successfully: ID ${req.params.id}`);
      return res.status(200).json({ success: true, employee });
    } catch (error) {
      console.error('❌ Error updating employee:', error.message);
      console.error('❌ Stack trace:', error.stack);
      return res.status(400).json({ success: false, error: error.message });
    }
  },
  getAllEmployees: async (_req, res) => {
    try {
      const employees = await employeeService.getAllEmployees();
      return res.status(200).json({ success: true, employees });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },
  getEmployeeById: async (req, res) => {
    try {
      const employee = await employeeService.getEmployeeById(req.params.id);
      if (!employee) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }
      return res.status(200).json({ success: true, employee });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },
  deleteEmployee: async (req, res) => {
    try {
      const employee = await employeeService.deleteEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }
      return res.status(200).json({ success: true, message: "Employee deleted successfully" });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  },
};

module.exports = employeeController;