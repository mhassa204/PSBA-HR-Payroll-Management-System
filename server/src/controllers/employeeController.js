// src/controllers/employeeController.js
const employeeService = require("../services/employeeService");
const path = require("path");

const validateCNIC = (cnic) => /^\d{5}-\d{7}-\d{1}$/.test(cnic);

const employeeController = {
  createEmployee: async (req, res) => {
    try {
      const { full_name, department_id, designation_id, cnic, password } =
        req.body;
      // console.log(req.body);
      console.log("Hello file");
      console.log(req.file);
      console.log(req.files);
      // Basic required field validation
      const missingFields = [];
      if (!full_name) missingFields.push("full_name");
      if (!department_id) missingFields.push("department_id");
      if (!designation_id) missingFields.push("designation_id");
      if (!password) missingFields.push("password");

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      if (cnic && !validateCNIC(cnic)) {
        console.log("After cninc")
        return res.status(400).json({
          success: false,
          error: "Invalid CNIC format. Must be like 35201-XXXXXXX-X",
        });
      }

      const files = {
        medical_fitness_file: req.files?.medical_fitness_file?.[0]
          ? path.join("uploads", req.files.medical_fitness_file[0].filename)
          : null,
        profile_picture_file: req.files?.profile_picture_file?.[0]
          ? path.join("uploads", req.files.profile_picture_file[0].filename)
          : null,
      };

      // Pass relative paths instead of full system paths

      const employee = await employeeService.createEmployee(req.body, files);
      console.log(employee);
      res.status(201).json({ success: true, employee });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({ success: false, error: error.message });
    }
  },

  updateEmployee: async (req, res) => {
    try {
      const { cnic,full_name, department_id, designation_id } = req.body;
      console.log(req.body);
      // console.log(req.params.id)


       const missingFields = [];
      if (!full_name) missingFields.push("full_name");
      if (!department_id) missingFields.push("department_id");
      if (!designation_id) missingFields.push("designation_id");
      

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

      

      const files = {
        medical_fitness_file: req.files?.medical_fitness_file?.[0]
          ? path.join("uploads", req.files.medical_fitness_file[0].filename)
          : null,
        profile_picture_file: req.files?.profile_picture_file?.[0]
          ? path.join("uploads", req.files.profile_picture_file[0].filename)
          : null,
      };
      const id = String(req.params.id);
      const employee = await employeeService.updateEmployee(
        id,
        req.body,
        files
      );
      res.status(200).json({ success: true, employee });
    } catch (error) {
      console.log(error.message);
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
