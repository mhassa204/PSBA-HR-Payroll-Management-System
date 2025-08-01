const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { encrypt, decrypt } = require("../utils/cryptoUtil"); // 👈 Add this line

const employeeService = {
  createEmployee: async (data, files, documentRecords) => {
    const {
      full_name,
      past_experiences,
      educations,
      experience_documents,
      education_documents,
      ...rest
    } = data;

    // Generate employee_id if not provided
    const employee_id = data.employee_id || `EMP${new Date().getFullYear()}${String(Date.now()).slice(-3)}`;

    // Process date fields
    const dateFields = [
      "cnic_issue_date",
      "cnic_expire_date",
      "date_of_birth",
    ];

    // Convert date strings to Date objects
    const processedData = { ...rest };
    dateFields.forEach(field => {
      if (processedData[field] && typeof processedData[field] === 'string') {
        processedData[field] = new Date(processedData[field]);
      }
    });

    // Prepare main employee data (only fields that belong in Employee table)
    const employeePayload = {
      employee_id,
      full_name,
      father_husband_name: processedData.father_husband_name,
      relationship_type: processedData.relationship_type,
      mother_name: processedData.mother_name,
      cnic: processedData.cnic,
      cnic_issue_date: processedData.cnic_issue_date,
      cnic_expire_date: processedData.cnic_expire_date,
      date_of_birth: processedData.date_of_birth,
      gender: processedData.gender,
      marital_status: processedData.marital_status,
      nationality: processedData.nationality,
      religion: processedData.religion,
      blood_group: processedData.blood_group,
      domicile_district: processedData.domicile_district,
      mobile_number: processedData.mobile_number,
      whatsapp_number: processedData.whatsapp_number,
      email: processedData.email,
      present_address: processedData.present_address,
      permanent_address: processedData.permanent_address,
      same_address: processedData.same_address === "true" || processedData.same_address === true,
      district: processedData.district,
      city: processedData.city,
      has_disability: processedData.has_disability === "true" || processedData.has_disability === true,
      disability_type: processedData.disability_type,
      disability_description: processedData.disability_description,
      password: data.password ? encrypt(data.password) : null,
      status: processedData.status || "Active",
    };

    // Create employee with related data in a transaction
    return prisma.$transaction(async (tx) => {
      // Create main employee record
      const employee = await tx.employee.create({ data: employeePayload });

      // Create past experiences if provided
      if (past_experiences && Array.isArray(past_experiences)) {
        const experiencesToCreate = past_experiences.map(exp => ({
          employee_id: employee.id,
          company_name: exp.company_name,
          start_date: exp.start_date,
          end_date: exp.end_date,
          description: exp.description || null
        }));

        if (experiencesToCreate.length > 0) {
          await tx.pastExperience.createMany({
            data: experiencesToCreate
          });
        }
      }

      // Create education qualifications if provided
      if (educations && Array.isArray(educations)) {
        const educationsToCreate = educations.map(edu => ({
          employee_id: employee.id,
          education_level: edu.education_level,
          institution_name: edu.institution_name,
          year_of_completion: edu.year_of_completion,
          marks_gpa: edu.marks_gpa || null
        }));

        if (educationsToCreate.length > 0) {
          await tx.educationQualification.createMany({
            data: educationsToCreate
          });
        }
      }

      // Create document records if any
      if (documentRecords && documentRecords.length > 0) {
        const documentsToCreate = documentRecords.map(doc => ({
          ...doc,
          employee_id: employee.id
        }));

        await tx.employeeDocument.createMany({
          data: documentsToCreate
        });
      }

      // Return employee with all related data
      return tx.employee.findUnique({
        where: { id: employee.id },
        include: {
          pastExperiences: true,
          educationQualifications: true,
          documents: true,
          employmentRecords: {
            include: {
              department: true,
              designation: true,
              salary: true,
              location: true
            }
          }
        }
      });
    });
  },

  updateEmployee: async (id, data, files, documentRecords) => {
    console.log("Updating employee with data:", data);

    const {
      past_experiences,
      educations,
      experience_documents,
      education_documents,
      ...rest
    } = data;

    // Process date fields
    const dateFields = [
      "cnic_issue_date",
      "cnic_expire_date",
      "date_of_birth",
    ];

    // Convert date strings to Date objects
    const processedData = { ...rest };
    dateFields.forEach(field => {
      if (processedData[field] && typeof processedData[field] === 'string') {
        processedData[field] = new Date(processedData[field]);
      }
    });

    // Prepare main employee data (only fields that belong in Employee table)
    const employeeUpdateData = {};
    const allowedFields = [
      "employee_id", "full_name", "father_husband_name", "relationship_type",
      "mother_name", "cnic", "cnic_issue_date", "cnic_expire_date", "date_of_birth",
      "gender", "marital_status", "nationality", "religion", "blood_group",
      "domicile_district", "mobile_number", "whatsapp_number", "email",
      "present_address", "permanent_address", "same_address", "district", "city",
      "has_disability", "disability_type", "disability_description", "status"
    ];

    // Process allowed fields
    for (const key of allowedFields) {
      if (processedData[key] !== undefined) {
        if (key === "same_address" || key === "has_disability") {
          employeeUpdateData[key] = processedData[key] === "true" || processedData[key] === true;
        } else {
          employeeUpdateData[key] = processedData[key];
        }
      }
    }

    // Handle password separately
    if (data.password) {
      employeeUpdateData.password = encrypt(data.password);
    }

    // Update employee with related data in a transaction
    return prisma.$transaction(async (tx) => {
      // Update main employee record
      const employee = await tx.employee.update({
        where: { id: parseInt(id) },
        data: employeeUpdateData,
      });

      // Update past experiences if provided
      if (past_experiences && Array.isArray(past_experiences)) {
        // Delete existing experiences
        await tx.pastExperience.deleteMany({
          where: { employee_id: employee.id }
        });

        // Create new experiences
        if (past_experiences.length > 0) {
          const experiencesToCreate = past_experiences.map(exp => ({
            employee_id: employee.id,
            company_name: exp.company_name,
            start_date: exp.start_date,
            end_date: exp.end_date,
            description: exp.description || null
          }));

          await tx.pastExperience.createMany({
            data: experiencesToCreate
          });
        }
      }

      // Update education qualifications if provided
      if (educations && Array.isArray(educations)) {
        // Delete existing educations
        await tx.educationQualification.deleteMany({
          where: { employee_id: employee.id }
        });

        // Create new educations
        if (educations.length > 0) {
          const educationsToCreate = educations.map(edu => ({
            employee_id: employee.id,
            education_level: edu.education_level,
            institution_name: edu.institution_name,
            year_of_completion: edu.year_of_completion,
            marks_gpa: edu.marks_gpa || null
          }));

          await tx.educationQualification.createMany({
            data: educationsToCreate
          });
        }
      }

      // Add new document records if any
      if (documentRecords && documentRecords.length > 0) {
        const documentsToCreate = documentRecords.map(doc => ({
          ...doc,
          employee_id: employee.id
        }));

        await tx.employeeDocument.createMany({
          data: documentsToCreate
        });
      }

      // Return employee with all related data
      return tx.employee.findUnique({
        where: { id: employee.id },
        include: {
          pastExperiences: true,
          educationQualifications: true,
          documents: true,
          employmentRecords: {
            include: {
              department: true,
              designation: true,
              salary: true,
              location: true
            }
          }
        }
      });
    });
  },

  getAllEmployees: async () => {
    try {
      const employees = await prisma.employee.findMany({
        include: {
          pastExperiences: true,
          educationQualifications: true,
          documents: true,
          employmentRecords: {
            include: {
              department: true,
              designation: true,
              salary: true,
              location: true
            }
          }
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
        pastExperiences: true,
        educationQualifications: true,
        documents: true,
        employmentRecords: {
          include: {
            department: true,
            designation: true,
            salary: true,
            location: true
          }
        }
      },
    });

    if (!emp) return null;

    return {
      ...emp,
    //  password: emp.password ? decrypt(emp.password) : null, // 👈 Decrypt password
    };
  },

  deleteEmployee: async (id) => {
    return prisma.employee.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = employeeService;
