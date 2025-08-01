// src/controllers/employeeController.js
const employeeService = require("../services/employeeService");
const path = require("path");
const { DOCUMENT_TYPES } = require("../config/multer");

const validateCNIC = (cnic) => /^\d{5}-\d{7}-\d{1}$/.test(cnic);

// Helper function to process uploaded files
const processUploadedFiles = (files) => {
  const processedFiles = {};
  const documentRecords = [];

  if (!files) return { processedFiles, documentRecords };

  // Process each file type
  Object.keys(files).forEach(fieldName => {
    const fileArray = files[fieldName];
    const documentType = DOCUMENT_TYPES[fieldName] || 'other';

    fileArray.forEach(file => {
      const relativePath = path.join("uploads", file.filename);

      // For profile and medical files, store in main employee record
      if (fieldName === 'profile_picture_file') {
        processedFiles.profile_picture_file = relativePath;
      } else if (fieldName === 'medical_fitness_file') {
        processedFiles.medical_fitness_file = relativePath;
      } else {
        // For all other files, create document records
        documentRecords.push({
          file_path: relativePath,
          file_type: documentType,
          document_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype
        });
      }
    });
  });

  return { processedFiles, documentRecords };
};

const employeeController = {
  createEmployee: async (req, res) => {
    try {
      const { full_name, cnic, password } = req.body;

      console.log("Creating employee with files:", req.files);

      // Basic required field validation
      const missingFields = [];
      if (!full_name) missingFields.push("full_name");
      if (!password) missingFields.push("password");

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      if (cnic && !validateCNIC(cnic)) {
        return res.status(400).json({
          success: false,
          error: "Invalid CNIC format. Must be like 35201-XXXXXXX-X",
        });
      }

      // Process uploaded files
      const { processedFiles, documentRecords } = processUploadedFiles(req.files);

      // Create employee with processed files and document records
      const employee = await employeeService.createEmployee(req.body, processedFiles, documentRecords);

      res.status(201).json({ success: true, employee });
    } catch (error) {
      console.error("Error creating employee:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const { cnic, full_name } = req.body;
      console.log("Updating employee with data:", req.body);
      console.log("Updating employee with files:", req.files);

      const missingFields = [];
      if (!full_name) missingFields.push("full_name");

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      if (cnic && !validateCNIC(cnic)) {
        return res.status(400).json({
          success: false,
          error: "Invalid CNIC format. Must be like 35201-XXXXXXX-X",
        });
      }

      // Process uploaded files
      const { processedFiles, documentRecords } = processUploadedFiles(req.files);

      const id = String(req.params.id);
      const employee = await employeeService.updateEmployee(
        id,
        req.body,
        processedFiles,
        documentRecords
      );

      res.status(200).json({ success: true, employee });
    } catch (error) {
      console.error("Error updating employee:", error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },


 


getAllEmployees: async (_req, res) => {
    try {
      const employees = await employeeService.getAllEmployees();
      res.status(200).json({ success: true, employees });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  getEmployeeById: async (req, res) => {
    try {
      const employee = await employeeService.getEmployeeById(req.params.id);
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, error: "Employee not found" });
      }
      res.status(200).json({ success: true, employee });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  deleteEmployee: async (req, res) => {
    try {
      const employee = await employeeService.deleteEmployee(req.params.id);
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, error: "Employee not found" });
      }
      res
        .status(200)
        .json({ success: true, message: "Employee deleted successfully" });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};

module.exports = employeeController;
