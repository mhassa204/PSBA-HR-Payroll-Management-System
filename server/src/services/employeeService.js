const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { encrypt, decrypt } = require("../utils/cryptoUtil"); // 👈 Add this line

const employeeService = {
  createEmployee: async (data, files) => {
    const { full_name, department_id, designation_id, ...rest } = data;

    // Validate foreign keys
    const [department, designation] = await Promise.all([
      prisma.department.findUnique({ where: { id: department_id } }),
      prisma.designation.findUnique({
        where: { id: designation_id },
      }),
    ]);
    if (!department) throw new Error("Invalid department_id");
    if (!designation) throw new Error("Invalid designation_id");

    const dateFields = [
      "cnic_issue_date",
      "cnic_expiry_date",
      "date_of_birth",
      "joining_date_mwo",
      "joining_date_pmbmc",
      "joining_date_psba",
      "termination_or_suspend_date",
    ];

    const payload = {
      ...rest,
      full_name,
      password: data.password ? encrypt(data.password) : null, // 👈 Encrypt password
      disability_status:
        data.disability_status === "true" || data.disability_status === true,
      medical_fitness_status:
        data.medical_fitness_status === "true" ||
        data.medical_fitness_status === true,

      medical_fitness_file: files.medical_fitness_file || null,
      profile_picture_file: files.profile_picture_file || null,

      department: { connect: { id: department_id } },
      designation: { connect: { id: designation_id } },
    };

    return prisma.employee.create({ data: payload });
  },

  updateEmployee: async (id, data, files) => {
    const updateData = {};
console.log(data);
    // Validate and set department
    if (data.department_id) {
      const department = await prisma.department.findUnique({
        where: { id: data.department_id },
      });
      if (!department) throw new Error("Invalid department_id");
      updateData.department = { connect: { id: data.department_id } };
    }

    // Validate and set designation
    if (data.designation_id) {
      const designation = await prisma.designation.findUnique({
        where: { id: (data.designation_id) },
      });
      if (!designation) throw new Error("Invalid designation_id");
      updateData.designation = {
        connect: { id: (data.designation_id) },
      };
    }

    const allowedFields = [
      "full_name",
      "father_or_husband_name",
      "mother_name",
      "cnic",
      "cnic_issue_date",
      "cnic_expiry_date",
      "date_of_birth",
      "joining_date_mwo",
      "joining_date_pmbmc",
      "joining_date_psba",
      "termination_or_suspend_date",
      "gender",
      "marital_status",
      "address",
      "contact_number",
      "emergency_contact_number",
      "email",
      "password",
    ];
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = key === "password" ? encrypt(data[key]) : data[key]; // 👈 Encrypt password
      }
    }

    if (data.medical_fitness_status != null) {
      updateData.medical_fitness_status =
        data.medical_fitness_status === "true" ||
        data.medical_fitness_status === true;
    }

    if (data.disability_status != null) {
      updateData.disability_status =
        data.disability_status === "true" || data.disability_status === true;
    }

    if (files.medical_fitness_file) {
      updateData.medical_fitness_file = files.medical_fitness_file;
    }

    if (files.profile_picture_file) {
      updateData.profile_picture_file = files.profile_picture_file;
    }

    return prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
    }); 
  },

  getAllEmployees: async () => {
    try {
      const employees = await prisma.employee.findMany({
        include: {
          department: true,
          designation: true,
          documents: true,
        },
      });

      return employees;
    } catch (error) {
      console.log("Error in getAllEmployees:", error);
      return []; // or throw error if you want it handled upstream
    }
  },

  getEmployeeById: async (id) => {
    const emp = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: true,
        designation: true,
        documents: true,
      },
    });

    if (!emp) return null;

    return {
      ...emp,
      password: emp.password ? decrypt(emp.password) : null, // 👈 Decrypt password
    };
  },

  deleteEmployee: async (id) => {
    return prisma.employee.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = employeeService;
