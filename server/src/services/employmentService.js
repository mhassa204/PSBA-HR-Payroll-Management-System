const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const employmentService = {
  // Helper function to check for existing renewal report documents
  checkExistingRenewalReport: async (employmentId) => {
    try {
      // Query the employmentdocument table for renewal report documents
      const allDocuments = await prisma.employmentdocument.findMany({
        where: {
          employment_id: parseInt(employmentId)
        },
        select: {
          id: true,
          file_path: true,
          document_name: true,
          url: true,
          file_type: true
        }
      });
      
      // Look for renewal report documents with various possible file_type values
      const renewalDocuments = allDocuments.filter(doc => 
        doc.file_type === 'renewal_report' 
      );
      
      return renewalDocuments.length > 0 ? renewalDocuments[0] : null;
    } catch (error) {
      console.error(`❌ EmploymentService: Error checking for renewal report documents:`, error);
      return null;
    }
  },

  // Helper function to filter data based on organization rules
   filterDataByOrganization : (data) => {
    const { organization, ...employmentData } = data;
    
    const hiddenFieldsByOrg = {
      MBWO: ['department', 'employment_type', 'role_tag', 'reporting_officer_id', 'office_location', 'scale_grade', 'medical_fitness_report_pdf', 'filer_status', 'filer_active_status', 'employment_status', 'is_current', 'is_on_probation', 'probation_end_date'],
      PMBMC: ['scale_grade', 'reporting_officer_id', 'office_location', 'employment_status'],
      PSBA: ['office_location']
    };
    
    const hiddenFields = hiddenFieldsByOrg[organization] || [];
    
    // Remove hidden fields from the data
    const filteredData = { ...employmentData };
    hiddenFields.forEach(field => {
      if (filteredData[field] !== undefined) {
        delete filteredData[field];
      }
    });
    
    // Add organization back
    filteredData.organization = organization;
    
    return filteredData;
  },

  // Create new employment record with salary and location
  // createEmployment: async (data) => {
  //   // Filter data based on organization rules
  //   const filteredData = employmentService.filterDataByOrganization(data);
    
  //   const { 
  //     user_id,
  //     employee_id,
  //     organization,
  //     department_id,
  //     designation_id,
  //     employment_type = "Regular",
  //     effective_from,
  //     effective_till,
  //     role_tag,
  //     reporting_officer_id,
  //     office_location,
  //     remarks,
  //     // Additional employment fields
  //     scale_grade,
  //     employment_status = "active",
  //     is_current = true,
  //     filer_status = "non_filer",
  //     filer_active_status,
  //     // Document uploads - these come from the controller's processed files
  //     medical_fitness_report_pdf,
  //     police_character_certificate,
  //     // Probation fields
  //     is_on_probation = false,
  //     probation_end_date,
  //     // Related data
  //     salary,
  //     location,
  //     contract,
  //     documentRecords = []
  //   } = filteredData;

  //   // Use the processed file paths from the controller (documentRecords)
  //   // The controller already processes the files and provides the paths
  //   const actualMedicalFitness = medical_fitness_report_pdf;
  //   const actualPoliceCertificate = police_character_certificate;

  //   // Use employee_id or user_id
  //   const actualEmployeeId = employee_id || user_id;

  //   // Validate employee exists
  //   const employee = await prisma.employee.findUnique({
  //     where: { id: parseInt(actualEmployeeId) }
  //   });
  //   if (!employee) throw new Error("Invalid employee_id");

  //   // Validate department if provided
  //   if (department_id) {
  //     const department = await prisma.department.findUnique({
  //       where: { id: parseInt(department_id) }
  //     });
  //     if (!department) throw new Error("Invalid department_id");
  //   }

  //   // Validate designation if provided
  //   if (designation_id) {
  //     const designation = await prisma.designation.findUnique({
  //       where: { id: parseInt(designation_id) }
  //     });
  //     if (!designation) throw new Error("Invalid designation_id");
  //   }

  //   // Helper function to convert string booleans to actual booleans
  //   const toBoolean = (value) => {
  //     if (typeof value === 'boolean') return value;
  //     if (typeof value === 'string') {
  //       return value.toLowerCase() === 'true';
  //     }
  //     return Boolean(value);
  //   };

  //   // Helper function to clean undefined values
  //   const cleanValue = (value) => {
  //     return value === undefined || value === 'undefined' ? null : value;
  //   };

  //   // Create employment record with all related data in transaction
  //   return prisma.$transaction(async (tx) => {
  //     console.log("🔍 Backend createEmployment - Received data:", {
  //       salary: salary,
  //       location: location,
  //       contract: contract
  //     });

  //     // Create main employment record
  //     const employment = await tx.employment.create({
  //       data: {
  //         employee_id: parseInt(actualEmployeeId),
  //         organization,
  //         department_id: department_id ? parseInt(department_id) : null,
  //         designation_id: designation_id ? parseInt(designation_id) : null,
  //         employment_type,
  //         effective_from: effective_from ? new Date(effective_from) : null,
  //         effective_till: effective_till ? new Date(effective_till) : null,
  //         role_tag: cleanValue(role_tag),
  //         reporting_officer_id: cleanValue(reporting_officer_id),
  //         office_location: cleanValue(office_location),
  //         remarks: cleanValue(remarks),
  //         scale_grade: cleanValue(scale_grade),
  //         employment_status,
  //         is_current: toBoolean(is_current),
  //         filer_status,
  //         filer_active_status: cleanValue(filer_active_status),
  //         medical_fitness_report_pdf: cleanValue(actualMedicalFitness),
  //         police_character_certificate: cleanValue(actualPoliceCertificate),
  //         is_on_probation: toBoolean(is_on_probation),
  //         probation_end_date: probation_end_date ? new Date(probation_end_date) : null
  //       }
  //     });

  //     // Create salary record if provided
  //     if (salary) {
  //       console.log("🔍 Backend creating salary record:", salary);
  //       await tx.employmentSalary.create({
  //         data: {
  //           employment_id: employment.id,
  //           basic_salary: salary.basic_salary ? parseFloat(salary.basic_salary) : 0,
  //           gross_salary: salary.gross_salary ? parseFloat(salary.gross_salary) : null,
  //           medical_allowance: salary.medical_allowance ? parseFloat(salary.medical_allowance) : 0,
  //           house_rent: salary.house_rent ? parseFloat(salary.house_rent) : 0,
  //           conveyance_allowance: salary.conveyance_allowance ? parseFloat(salary.conveyance_allowance) : 0,
  //           other_allowances: salary.other_allowances ? parseFloat(salary.other_allowances) : 0,
  //           daily_wage_rate: salary.daily_wage_rate ? parseFloat(salary.daily_wage_rate) : null,
  //           bank_account_primary: salary.bank_account_primary || null,
  //           bank_name_primary: salary.bank_name_primary || null,
  //           bank_branch_code: salary.bank_branch_code || null,
  //           payment_mode: salary.payment_mode || "Bank Transfer",
  //           salary_effective_from: salary.salary_effective_from ? new Date(salary.salary_effective_from) : null,
  //           salary_effective_till: salary.salary_effective_till ? new Date(salary.salary_effective_till) : null,
  //           payroll_status: salary.payroll_status || "Active"
  //         }
  //       });
  //       console.log("✅ Backend salary record created successfully");
  //     }

  //     // Create location record if provided
  //     if (location) {
  //       console.log("🔍 Backend creating location record:", location);
  //       await tx.employmentLocation.create({
  //         data: {
  //           employment_id: employment.id,
  //           district: location.district || null,
  //           city: location.city || null,
  //           bazaar_name: location.bazaar_name || null,
  //           type: location.type || "HEAD_OFFICE",
  //           full_address: location.full_address || null
  //         }
  //       });
  //       console.log("✅ Backend location record created successfully");
  //     }

  //     // Create contract record if provided
  //     if (contract) {
  //       console.log("🔍 Backend creating contract record:", contract);
  //       await tx.employmentContract.create({
  //         data: {
  //           employment_id: employment.id,
  //           contract_type: cleanValue(contract.contract_type),
  //           contract_number: cleanValue(contract.contract_number),
  //           start_date: contract.start_date ? new Date(contract.start_date) : null,
  //           end_date: contract.end_date ? new Date(contract.end_date) : null,
  //           renewal_count: contract.renewal_count ? parseInt(contract.renewal_count) : 0,
  //           probation_start: contract.probation_start ? new Date(contract.probation_start) : null,
  //           probation_end: contract.probation_end ? new Date(contract.probation_end) : null,
  //           confirmation_status: cleanValue(contract.confirmation_status),
  //           confirmation_date: contract.confirmation_date ? new Date(contract.confirmation_date) : null,
  //           is_renewed: toBoolean(contract.is_renewed),
  //           renewal_report: cleanValue(contract.renewal_report)
  //         }
  //       });
  //       console.log("✅ Backend contract record created successfully");
  //     }

  //     // Create document records if provided
  //     if (documentRecords && documentRecords.length > 0) {
  //       for (const doc of documentRecords) {
  //         await tx.employmentDocument.create({
  //           data: {
  //             employment_id: employment.id,
  //             file_path: doc.file_path,
  //             file_type: doc.file_type,
  //             document_name: doc.document_name,
  //             file_size: doc.file_size,
  //             mime_type: doc.mime_type,
  //             associated_id: doc.associated_id
  //           }
  //         });
  //       }
  //     }

  //     // Return complete employment record
  //     return tx.employment.findUnique({
  //       where: { id: employment.id },
  //       include: {
  //         employee: true,
  //         department: true,
  //         designation: true,
  //         salary: true,
  //         location: true,
  //         contract: true,
  //         documents: true
  //       }
  //     });
  //   });
  // },


// src/services/employmentService.js
createEmployment: async (data) => {
  const filteredData = employmentService.filterDataByOrganization(data);
  
  const { 
    user_id,
    employee_id,
    organization,
    department_id,
    designation_id,
    employment_type = "Regular",
    effective_from,
    effective_till,
    role_tag,
    reporting_officer_id,
    office_location,
    remarks,
    scale_grade,
    employment_status = "active",
    is_current = true,
    filer_status = "non_filer",
    filer_active_status,
    is_on_probation = false,
    probation_end_date,
    salary,
    location,
    contract,
    documentRecords = []
  } = filteredData;

  // Remove direct references to document fields
  // const actualMedicalFitness = medical_fitness_report_pdf;
  // const actualPoliceCertificate = police_character_certificate;

  // Use employee_id or user_id
  const actualEmployeeId = employee_id || user_id;

  // Validate employee exists
  const employee = await prisma.employee.findUnique({
    where: { id: parseInt(actualEmployeeId) }
  });
  if (!employee) throw new Error("Invalid employee_id");

  // Validate department if provided
  if (department_id) {
    const department = await prisma.department.findUnique({
      where: { id: parseInt(department_id) }
    });
    if (!department) throw new Error("Invalid department_id");
  }

  // Validate designation if provided
  if (designation_id) {
    const designation = await prisma.designation.findUnique({
      where: { id: parseInt(designation_id) }
    });
    if (!designation) throw new Error("Invalid designation_id");
  }

  const toBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  };

  const cleanValue = (value) => {
    return value === undefined || value === 'undefined' ? null : value;
  };

  return prisma.$transaction(async (tx) => {


    // Create main employment record without document paths
    const employment = await tx.employment.create({
      data: {
        employee_id: parseInt(actualEmployeeId),
        organization,
        department_id: department_id ? parseInt(department_id) : null,
        designation_id: designation_id ? parseInt(designation_id) : null,
        employment_type,
        effective_from: effective_from ? new Date(effective_from) : null,
        effective_till: effective_till ? new Date(effective_till) : null,
        role_tag: cleanValue(role_tag),
        reporting_officer_id: cleanValue(reporting_officer_id),
        office_location: cleanValue(office_location),
        remarks: cleanValue(remarks),
        scale_grade: cleanValue(scale_grade),
        employment_status,
        is_current: toBoolean(is_current),
        filer_status,
        filer_active_status: cleanValue(filer_active_status),
        is_on_probation: toBoolean(is_on_probation),
        probation_end_date: probation_end_date ? new Date(probation_end_date) : null
      }
    });

    // Create salary, location, contract, and document records as before
    if (salary) {
      await tx.employmentSalary.create({
        data: {
          employment_id: employment.id,
          basic_salary: salary.basic_salary ? parseFloat(salary.basic_salary) : 0,
          gross_salary: salary.gross_salary ? parseFloat(salary.gross_salary) : null,
          medical_allowance: salary.medical_allowance ? parseFloat(salary.medical_allowance) : 0,
          house_rent: salary.house_rent ? parseFloat(salary.house_rent) : 0,
          conveyance_allowance: salary.conveyance_allowance ? parseFloat(salary.conveyance_allowance) : 0,
          other_allowances: salary.other_allowances ? parseFloat(salary.other_allowances) : 0,
          daily_wage_rate: salary.daily_wage_rate ? parseFloat(salary.daily_wage_rate) : null,
          bank_account_primary: salary.bank_account_primary || null,
          bank_name_primary: salary.bank_name_primary || null,
          bank_branch_code: salary.bank_branch_code || null,
          payment_mode: salary.payment_mode || "Bank Transfer",
          salary_effective_from: salary.salary_effective_from ? new Date(salary.salary_effective_from) : null,
          salary_effective_till: salary.salary_effective_till ? new Date(salary.salary_effective_till) : null,
          payroll_status: salary.payroll_status || "Active"
        }
      });
    }

    if (location) {
      await tx.employmentLocation.create({
        data: {
          employment_id: employment.id,
          district: location.district || null,
          city: location.city || null,
          bazaar_name: location.bazaar_name || null,
          type: location.type || "HEAD_OFFICE",
          full_address: location.full_address || null
        }
      });
    }

    if (contract) {
      await tx.employmentContract.create({
        data: {
          employment_id: employment.id,
          contract_type: cleanValue(contract.contract_type),
          contract_number: cleanValue(contract.contract_number),
          start_date: contract.start_date ? new Date(contract.start_date) : null,
          end_date: contract.end_date ? new Date(contract.end_date) : null,
          renewal_count: contract.renewal_count ? parseInt(contract.renewal_count) : 0,
          probation_start: contract.probation_start ? new Date(contract.probation_start) : null,
          probation_end: contract.probation_end ? new Date(contract.probation_end) : null,
          confirmation_status: cleanValue(contract.confirmation_status),
          confirmation_date: contract.confirmation_date ? new Date(contract.confirmation_date) : null,
          is_renewed: toBoolean(contract.is_renewed),
         
        }
      });
    }

    if (documentRecords && documentRecords.length > 0) {
      for (const doc of documentRecords) {
        await tx.employmentDocument.create({
          data: {
            employment_id: employment.id,
            file_path: doc.file_path,
            file_type: doc.file_type,
            document_name: doc.document_name,
            file_size: doc.file_size,
            mime_type: doc.mime_type,
            associated_id: doc.associated_id
          }
        });
      }
    }

    return tx.employment.findUnique({
      where: { id: employment.id },
      include: {
        employee: true,
        department: true,
        designation: true,
        salary: true,
        location: true,
        contract: true,
        documents: true
      }
    });
  });
},



  // Get all employment records with pagination
  getAllEmployments: async (page = 1, limit = 10, filters = {}) => {
    const skip = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (filters.employee_id) {
      where.employee_id = parseInt(filters.employee_id);
    }
    if (filters.organization) {
      where.organization = filters.organization;
    }
    if (filters.department_id) {
      where.department_id = parseInt(filters.department_id);
    }
    if (filters.employment_type) {
      where.employment_type = filters.employment_type;
    }
    if (filters.is_current !== undefined) {
      where.is_current = filters.is_current === 'true';
    }

    const [employments, total] = await Promise.all([
      prisma.employment.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: true,
          department: true,
          designation: true,
          salary: true,
          location: true,
          contract: true,
          documents: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employment.count({ where })
    ]);

    return {
      data: employments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  // Get employment record by ID
  getEmploymentById: async (id) => {
    const employment = await prisma.employment.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: true,
        department: true,
        designation: true,
        salary: true,
        location: true,
        contract: true,
        documents: true
      }
    });

    if (!employment) return null;

    // Process documents to add URL and metadata
    const processedDocuments = employment.documents.map(doc => {
      const normalizedPath = doc.file_path.replace(/\\/g, '/');
      const cleanPath = normalizedPath.startsWith('uploads/') ? normalizedPath.substring(8) : normalizedPath;
      return {
        ...doc,
        url: `/uploads/${cleanPath}`,
        isImage: /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.file_path),
        isPdf: /\.pdf$/i.test(doc.file_path),
        fileExtension: doc.file_path.substring(doc.file_path.lastIndexOf('.') + 1).toLowerCase()
      };
    });

    return {
      ...employment,
      documents: processedDocuments
    };
  },

  // Get employment records by employee ID
  getEmploymentsByEmployeeId: async (employeeId) => {
    const employments = await prisma.employment.findMany({
      where: { employee_id: parseInt(employeeId) },
      include: {
        department: true,
        designation: true,
        salary: true,
        location: true,
        contract: true,
        documents: true
      },
      orderBy: { effective_from: 'asc' }
    });

    // Process documents for each employment record
    return employments.map(employment => {
      const processedDocuments = employment.documents.map(doc => {
        const normalizedPath = doc.file_path.replace(/\\/g, '/');
        const cleanPath = normalizedPath.startsWith('uploads/') ? normalizedPath.substring(8) : normalizedPath;
        return {
          ...doc,
          url: `/uploads/${cleanPath}`,
          isImage: /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.file_path),
          isPdf: /\.pdf$/i.test(doc.file_path),
          fileExtension: doc.file_path.substring(doc.file_path.lastIndexOf('.') + 1).toLowerCase()
        };
      });

      return {
        ...employment,
        documents: processedDocuments
      };
    });
  },

  // Update employment record with salary and location
  // updateEmployment: async (id, data) => {
  //   // Filter data based on organization rules
  //   const filteredData = employmentService.filterDataByOrganization(data);
    
  //   const {
  //     organization,
  //     department_id,
  //     designation_id,
  //     employment_type,
  //     effective_from,
  //     effective_till,
  //     role_tag,
  //     reporting_officer_id,
  //     office_location,
  //     remarks,
  //     scale_grade,
  //     employment_status,
  //     is_current,
  //     filer_status,
  //     filer_active_status,
  //     medical_fitness_report_pdf,
  //     police_character_certificate,
  //     // Files object from frontend
  //     files,
  //     is_on_probation,
  //     probation_end_date,
  //     salary,
  //     location,
  //     contract,
  //     documentRecords = []
  //   } = filteredData;

  //   // Use the processed file paths from the controller (documentRecords)
  //   const actualMedicalFitness = medical_fitness_report_pdf;
  //   const actualPoliceCertificate = police_character_certificate;

  //   // Validate department if provided
  //   if (department_id) {
  //     const department = await prisma.department.findUnique({
  //       where: { id: parseInt(department_id) }
  //     });
  //     if (!department) throw new Error("Invalid department_id");
  //   }

  //   // Validate designation if provided
  //   if (designation_id) {
  //     const designation = await prisma.designation.findUnique({
  //       where: { id: parseInt(designation_id) }
  //     });
  //     if (!designation) throw new Error("Invalid designation_id");
  //   }

  //   // Get current employment record
  //   const currentEmployment = await prisma.employment.findUnique({
  //     where: { id: parseInt(id) }
  //   });
  //   if (!currentEmployment) throw new Error("Employment record not found");

  //   // Helper function to convert string booleans to actual booleans
  //   const toBoolean = (value) => {
  //     if (typeof value === 'boolean') return value;
  //     if (typeof value === 'string') {
  //       return value.toLowerCase() === 'true';
  //     }
  //     return Boolean(value);
  //   };

  //   // Helper function to clean undefined values
  //   const cleanValue = (value) => {
  //     return value === undefined || value === 'undefined' ? null : value;
  //   };

  //   // Update employment record with all related data in transaction
  //   return prisma.$transaction(async (tx) => {
  //     // Update main employment record
  //     const employmentUpdateData = {};
  //     if (organization !== undefined) employmentUpdateData.organization = organization;
  //     if (department_id !== undefined) employmentUpdateData.department_id = department_id ? parseInt(department_id) : null;
  //     if (designation_id !== undefined) employmentUpdateData.designation_id = designation_id ? parseInt(designation_id) : null;
  //     if (employment_type !== undefined) employmentUpdateData.employment_type = employment_type;
  //     if (effective_from !== undefined) employmentUpdateData.effective_from = effective_from ? new Date(effective_from) : null;
  //     if (effective_till !== undefined) employmentUpdateData.effective_till = effective_till ? new Date(effective_till) : null;
  //     if (role_tag !== undefined) employmentUpdateData.role_tag = cleanValue(role_tag);
  //     if (reporting_officer_id !== undefined) employmentUpdateData.reporting_officer_id = cleanValue(reporting_officer_id);
  //     if (office_location !== undefined) employmentUpdateData.office_location = cleanValue(office_location);
  //     if (remarks !== undefined) employmentUpdateData.remarks = cleanValue(remarks);
  //     if (scale_grade !== undefined) employmentUpdateData.scale_grade = cleanValue(scale_grade);
  //     if (employment_status !== undefined) employmentUpdateData.employment_status = employment_status;
  //     if (is_current !== undefined) employmentUpdateData.is_current = toBoolean(is_current);
  //     if (filer_status !== undefined) employmentUpdateData.filer_status = filer_status;
  //     if (filer_active_status !== undefined) employmentUpdateData.filer_active_status = cleanValue(filer_active_status);
  //     if (actualMedicalFitness !== undefined) employmentUpdateData.medical_fitness_report_pdf = cleanValue(actualMedicalFitness);
  //     if (actualPoliceCertificate !== undefined) employmentUpdateData.police_character_certificate = cleanValue(actualPoliceCertificate);
  //     if (is_on_probation !== undefined) employmentUpdateData.is_on_probation = toBoolean(is_on_probation);
  //     if (probation_end_date !== undefined) employmentUpdateData.probation_end_date = probation_end_date ? new Date(probation_end_date) : null;

  //     const employment = await tx.employment.update({
  //       where: { id: parseInt(id) },
  //       data: employmentUpdateData
  //     });

  //     // Update or create salary record if provided
  //     if (salary) {
  //       const salaryData = {
  //         basic_salary: salary.basic_salary ? parseFloat(salary.basic_salary) : 0,
  //         gross_salary: salary.gross_salary ? parseFloat(salary.gross_salary) : null,
  //         medical_allowance: salary.medical_allowance ? parseFloat(salary.medical_allowance) : 0,
  //         house_rent: salary.house_rent ? parseFloat(salary.house_rent) : 0,
  //         conveyance_allowance: salary.conveyance_allowance ? parseFloat(salary.conveyance_allowance) : 0,
  //         other_allowances: salary.other_allowances ? parseFloat(salary.other_allowances) : 0,
  //         daily_wage_rate: salary.daily_wage_rate ? parseFloat(salary.daily_wage_rate) : null,
  //         bank_account_primary: salary.bank_account_primary || null,
  //         bank_name_primary: salary.bank_name_primary || null,
  //         bank_branch_code: salary.bank_branch_code || null,
  //         payment_mode: salary.payment_mode || "Bank Transfer",
  //         salary_effective_from: salary.salary_effective_from ? new Date(salary.salary_effective_from) : null,
  //         salary_effective_till: salary.salary_effective_till ? new Date(salary.salary_effective_till) : null,
  //         payroll_status: salary.payroll_status || "Active"
  //       };

  //       await tx.employmentSalary.upsert({
  //         where: { employment_id: employment.id },
  //         update: salaryData,
  //         create: {
  //           employment_id: employment.id,
  //           ...salaryData
  //         }
  //       });
  //     }

  //     // Update or create location record if provided
  //     if (location) {
  //       const locationData = {
  //         district: location.district || null,
  //         city: location.city || null,
  //         bazaar_name: location.bazaar_name || null,
  //         type: location.type || "HEAD_OFFICE",
  //         full_address: location.full_address || null
  //       };

  //       await tx.employmentLocation.upsert({
  //         where: { employment_id: employment.id },
  //         update: locationData,
  //         create: {
  //           employment_id: employment.id,
  //           ...locationData
  //         }
  //       });
  //     }

  //     // Update or create contract record if provided
  //     if (contract) {
  //       const contractData = {
  //         contract_type: cleanValue(contract.contract_type),
  //         contract_number: cleanValue(contract.contract_number),
  //         start_date: contract.start_date ? new Date(contract.start_date) : null,
  //         end_date: contract.end_date ? new Date(contract.end_date) : null,
  //         renewal_count: contract.renewal_count ? parseInt(contract.renewal_count) : 0,
  //         probation_start: contract.probation_start ? new Date(contract.probation_start) : null,
  //         probation_end: contract.probation_end ? new Date(contract.probation_end) : null,
  //         confirmation_status: cleanValue(contract.confirmation_status),
  //         confirmation_date: contract.confirmation_date ? new Date(contract.confirmation_date) : null,
  //         is_renewed: toBoolean(contract.is_renewed),
  //         renewal_report: cleanValue(contract.renewal_report)
  //       };

  //       await tx.employmentContract.upsert({
  //         where: { employment_id: employment.id },
  //         update: contractData,
  //         create: {
  //           employment_id: employment.id,
  //           ...contractData
  //         }
  //       });
  //     }

  //     // Document records are already created by the controller
  //     // No need to create them again here to avoid duplicates
  //     console.log("📄 Skipping document record creation in updateEmployment (already handled by controller)");

  //     // Return complete employment record
  //     return tx.employment.findUnique({
  //       where: { id: employment.id },
  //       include: {
  //         employee: true,
  //         department: true,
  //         designation: true,
  //         salary: true,
  //         location: true,
  //         contract: true,
  //         documents: true
  //       }
  //     });
  //   });
  // },


// src/services/employmentService.js
updateEmployment: async (id, data) => {
  const filteredData = employmentService.filterDataByOrganization(data);
  
  const {
    organization,
    department_id,
    designation_id,
    employment_type,
    effective_from,
    effective_till,
    role_tag,
    reporting_officer_id,
    office_location,
    remarks,
    scale_grade,
    employment_status,
    is_current,
    filer_status,
    filer_active_status,
    is_on_probation,
    probation_end_date,
    salary,
    location,
    contract,
    documentRecords = []
  } = filteredData;

  // Remove direct references to document fields
  // const actualMedicalFitness = medical_fitness_report_pdf;
  // const actualPoliceCertificate = police_character_certificate;

  if (department_id) {
    const department = await prisma.department.findUnique({
      where: { id: parseInt(department_id) }
    });
    if (!department) throw new Error("Invalid department_id");
  }

  if (designation_id) {
    const designation = await prisma.designation.findUnique({
      where: { id: parseInt(designation_id) }
    });
    if (!designation) throw new Error("Invalid designation_id");
  }

  const currentEmployment = await prisma.employment.findUnique({
    where: { id: parseInt(id) }
  });
  if (!currentEmployment) throw new Error("Employment record not found");

  const toBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  };

  const cleanValue = (value) => {
    return value === undefined || value === 'undefined' ? null : value;
  };

  return prisma.$transaction(async (tx) => {
    const employmentUpdateData = {};
    if (organization !== undefined) employmentUpdateData.organization = organization;
    if (department_id !== undefined) employmentUpdateData.department_id = department_id ? parseInt(department_id) : null;
    if (designation_id !== undefined) employmentUpdateData.designation_id = designation_id ? parseInt(designation_id) : null;
    if (employment_type !== undefined) employmentUpdateData.employment_type = employment_type;
    if (effective_from !== undefined) employmentUpdateData.effective_from = effective_from ? new Date(effective_from) : null;
    if (effective_till !== undefined) employmentUpdateData.effective_till = effective_till ? new Date(effective_till) : null;
    if (role_tag !== undefined) employmentUpdateData.role_tag = cleanValue(role_tag);
    if (reporting_officer_id !== undefined) employmentUpdateData.reporting_officer_id = cleanValue(reporting_officer_id);
    if (office_location !== undefined) employmentUpdateData.office_location = cleanValue(office_location);
    if (remarks !== undefined) employmentUpdateData.remarks = cleanValue(remarks);
    if (scale_grade !== undefined) employmentUpdateData.scale_grade = cleanValue(scale_grade);
    if (employment_status !== undefined) employmentUpdateData.employment_status = employment_status;
    if (is_current !== undefined) employmentUpdateData.is_current = toBoolean(is_current);
    if (filer_status !== undefined) employmentUpdateData.filer_status = filer_status;
    if (filer_active_status !== undefined) employmentUpdateData.filer_active_status = cleanValue(filer_active_status);
    if (is_on_probation !== undefined) employmentUpdateData.is_on_probation = toBoolean(is_on_probation);
    if (probation_end_date !== undefined) employmentUpdateData.probation_end_date = probation_end_date ? new Date(probation_end_date) : null;

    const employment = await tx.employment.update({
      where: { id: parseInt(id) },
      data: employmentUpdateData
    });

    if (salary) {
      const salaryData = {
        basic_salary: salary.basic_salary ? parseFloat(salary.basic_salary) : 0,
        gross_salary: salary.gross_salary ? parseFloat(salary.gross_salary) : null,
        medical_allowance: salary.medical_allowance ? parseFloat(salary.medical_allowance) : 0,
        house_rent: salary.house_rent ? parseFloat(salary.house_rent) : 0,
        conveyance_allowance: salary.conveyance_allowance ? parseFloat(salary.conveyance_allowance) : 0,
        other_allowances: salary.other_allowances ? parseFloat(salary.other_allowances) : 0,
        daily_wage_rate: salary.daily_wage_rate ? parseFloat(salary.daily_wage_rate) : null,
        bank_account_primary: salary.bank_account_primary || null,
        bank_name_primary: salary.bank_name_primary || null,
        bank_branch_code: salary.bank_branch_code || null,
        payment_mode: salary.payment_mode || "Bank Transfer",
        salary_effective_from: salary.salary_effective_from ? new Date(salary.salary_effective_from) : null,
        salary_effective_till: salary.salary_effective_till ? new Date(salary.salary_effective_till) : null,
        payroll_status: salary.payroll_status || "Active"
      };

      await tx.employmentSalary.upsert({
        where: { employment_id: employment.id },
        update: salaryData,
        create: {
          employment_id: employment.id,
          ...salaryData
        }
      });
    }

    if (location) {
      const locationData = {
        district: location.district || null,
        city: location.city || null,
        bazaar_name: location.bazaar_name || null,
        type: location.type || "HEAD_OFFICE",
        full_address: location.full_address || null
      };

      await tx.employmentLocation.upsert({
        where: { employment_id: employment.id },
        update: locationData,
        create: {
          employment_id: employment.id,
          ...locationData
        }
      });
    }

    if (contract) {

      
      const contractData = {
        contract_type: cleanValue(contract.contract_type),
        contract_number: cleanValue(contract.contract_number),
        start_date: contract.start_date ? new Date(contract.start_date) : null,
        end_date: contract.end_date ? new Date(contract.end_date) : null,
        renewal_count: contract.renewal_count ? parseInt(contract.renewal_count) : 0,
        probation_start: contract.probation_start ? new Date(contract.probation_start) : null,
        probation_end: contract.probation_end ? new Date(contract.probation_end) : null,
        confirmation_status: cleanValue(contract.confirmation_status),
        confirmation_date: contract.confirmation_date ? new Date(contract.confirmation_date) : null,
        is_renewed: toBoolean(contract.is_renewed),
      };
      


      await tx.employmentContract.upsert({
        where: { employment_id: employment.id },
        update: contractData,
        create: {
          employment_id: employment.id,
          ...contractData
        }
      });
    }

    // Handle document updates (add new, remove old)
    if (data.documents_to_remove && data.documents_to_remove.length > 0) {
      // Delete document records specified in documents_to_remove
      await tx.employmentDocument.deleteMany({
        where: {
          id: { in: data.documents_to_remove.map(id => parseInt(id)) },
          employment_id: employment.id,
        },
      });
    }

    if (documentRecords && documentRecords.length > 0) {
      for (const doc of documentRecords) {
        // Check if a document of this type already exists for this employment
        const existingDoc = await tx.employmentDocument.findFirst({
          where: {
            employment_id: employment.id,
            file_type: doc.file_type,
          },
        });

        if (existingDoc) {
          // Update existing document
          await tx.employmentDocument.update({
            where: { id: existingDoc.id },
            data: {
              file_path: doc.file_path,
              document_name: doc.document_name,
              file_size: doc.file_size,
              mime_type: doc.mime_type,
            },
          });
          // Document updated
        } else {
          // Create new document
          await tx.employmentDocument.create({
            data: {
              employment_id: employment.id,
              file_path: doc.file_path,
              file_type: doc.file_type,
              document_name: doc.document_name,
              file_size: doc.file_size,
              mime_type: doc.mime_type,
              associated_id: doc.associated_id,
            },
          });
        }
      }
    }

    return tx.employment.findUnique({
      where: { id: employment.id },
      include: {
        employee: true,
        department: true,
        designation: true,
        salary: true,
        location: true,
        contract: true,
        documents: true
      }
    });
  });
},


  // Delete employment record
  deleteEmployment: async (id) => {
    return prisma.employment.delete({
      where: { id: parseInt(id) }
    });
  },

  // Create salary record
  createSalary: async (employmentId, salaryData) => {
    const employment = await prisma.employment.findUnique({
      where: { id: parseInt(employmentId) }
    });
    if (!employment) throw new Error("Employment record not found");

    return prisma.employmentSalary.create({
      data: {
        employment_id: parseInt(employmentId),
        basic_salary: salaryData.basic_salary ? parseFloat(salaryData.basic_salary) : 0,
        medical_allowance: salaryData.medical_allowance ? parseFloat(salaryData.medical_allowance) : 0,
        house_rent: salaryData.house_rent ? parseFloat(salaryData.house_rent) : 0,
        conveyance_allowance: salaryData.conveyance_allowance ? parseFloat(salaryData.conveyance_allowance) : 0,
        other_allowances: salaryData.other_allowances ? parseFloat(salaryData.other_allowances) : 0,
        daily_wage_rate: salaryData.daily_wage_rate ? parseFloat(salaryData.daily_wage_rate) : null,
        bank_account_primary: salaryData.bank_account_primary || null,
        bank_name_primary: salaryData.bank_name_primary || null,
        bank_branch_code: salaryData.bank_branch_code || null,
        payment_mode: salaryData.payment_mode || "Bank Transfer",
        salary_effective_from: salaryData.salary_effective_from ? new Date(salaryData.salary_effective_from) : null,
        salary_effective_till: salaryData.salary_effective_till ? new Date(salaryData.salary_effective_till) : null,
        payroll_status: salaryData.payroll_status || "Active"
      }
    });
  },

  // Update salary record
  updateSalary: async (employmentId, salaryData) => {
    const employment = await prisma.employment.findUnique({
      where: { id: parseInt(employmentId) }
    });
    if (!employment) throw new Error("Employment record not found");

    return prisma.employmentSalary.update({
      where: { employment_id: parseInt(employmentId) },
      data: {
        basic_salary: salaryData.basic_salary ? parseFloat(salaryData.basic_salary) : 0,
        medical_allowance: salaryData.medical_allowance ? parseFloat(salaryData.medical_allowance) : 0,
        house_rent: salaryData.house_rent ? parseFloat(salaryData.house_rent) : 0,
        conveyance_allowance: salaryData.conveyance_allowance ? parseFloat(salaryData.conveyance_allowance) : 0,
        other_allowances: salaryData.other_allowances ? parseFloat(salaryData.other_allowances) : 0,
        daily_wage_rate: salaryData.daily_wage_rate ? parseFloat(salaryData.daily_wage_rate) : null,
        bank_account_primary: salaryData.bank_account_primary || null,
        bank_name_primary: salaryData.bank_name_primary || null,
        bank_branch_code: salaryData.bank_branch_code || null,
        payment_mode: salaryData.payment_mode || "Bank Transfer",
        salary_effective_from: salaryData.salary_effective_from ? new Date(salaryData.salary_effective_from) : null,
        salary_effective_till: salaryData.salary_effective_till ? new Date(salaryData.salary_effective_till) : null,
        payroll_status: salaryData.payroll_status || "Active"
      }
    });
  },

  // Delete salary record
  deleteSalary: async (employmentId) => {
    return prisma.employmentSalary.delete({
      where: { employment_id: parseInt(employmentId) }
    });
  },

  // Create location record
  createLocation: async (employmentId, locationData) => {
    const employment = await prisma.employment.findUnique({
      where: { id: parseInt(employmentId) }
    });
    if (!employment) throw new Error("Employment record not found");

    return prisma.employmentLocation.create({
      data: {
        employment_id: parseInt(employmentId),
        district: locationData.district || null,
        city: locationData.city || null,
        bazaar_name: locationData.bazaar_name || null,
        type: locationData.type || "HEAD_OFFICE",
        full_address: locationData.full_address || null
      }
    });
  },

  // Update location record
  updateLocation: async (employmentId, locationData) => {
    const employment = await prisma.employment.findUnique({
      where: { id: parseInt(employmentId) }
    });
    if (!employment) throw new Error("Employment record not found");

    return prisma.employmentLocation.update({
      where: { employment_id: parseInt(employmentId) },
      data: {
        district: locationData.district || null,
        city: locationData.city || null,
        bazaar_name: locationData.bazaar_name || null,
        type: locationData.type || "HEAD_OFFICE",
        full_address: locationData.full_address || null
      }
    });
  },

  // Delete location record
  deleteLocation: async (employmentId) => {
    return prisma.employmentLocation.delete({
      where: { employment_id: parseInt(employmentId) }
    });
  },

  // Create contract record
  createContract: async (employmentId, contractData) => {
    const employment = await prisma.employment.findUnique({
      where: { id: parseInt(employmentId) }
    });
    if (!employment) throw new Error("Employment record not found");

    const { documentRecords = [], ...contractFields } = contractData;

    return prisma.$transaction(async (tx) => {
      const contract = await tx.employmentContract.create({
        data: {
          employment_id: parseInt(employmentId),
          contract_type: contractFields.contract_type || null,
          contract_number: contractFields.contract_number || null,
          start_date: contractFields.start_date ? new Date(contractFields.start_date) : null,
          end_date: contractFields.end_date ? new Date(contractFields.end_date) : null,
          renewal_count: contractFields.renewal_count || 0,
          probation_start: contractFields.probation_start ? new Date(contractFields.probation_start) : null,
          probation_end: contractFields.probation_end ? new Date(contractFields.probation_end) : null,
          confirmation_status: contractFields.confirmation_status || null,
          confirmation_date: contractFields.confirmation_date ? new Date(contractFields.confirmation_date) : null,
          is_renewed: contractFields.is_renewed || false,
          renewal_report: contractFields.renewal_report || null
        }
      });

      // Document records are already created by createEmployment/updateEmployment
      // No need to create them again here to avoid duplicates


      return contract;
    });
  },

  // Update contract record
  updateContract: async (employmentId, contractData) => {
    const employment = await prisma.employment.findUnique({
      where: { id: parseInt(employmentId) }
    });
    if (!employment) throw new Error("Employment record not found");

    const { documentRecords = [], ...contractFields } = contractData;

    return prisma.$transaction(async (tx) => {
      const contract = await tx.employmentContract.update({
        where: { employment_id: parseInt(employmentId) },
        data: {
          contract_type: contractFields.contract_type || null,
          contract_number: contractFields.contract_number || null,
          start_date: contractFields.start_date ? new Date(contractFields.start_date) : null,
          end_date: contractFields.end_date ? new Date(contractFields.end_date) : null,
          renewal_count: contractFields.renewal_count || 0,
          probation_start: contractFields.probation_start ? new Date(contractFields.probation_start) : null,
          probation_end: contractFields.probation_end ? new Date(contractFields.probation_end) : null,
          confirmation_status: contractFields.confirmation_status || null,
          confirmation_date: contractFields.confirmation_date ? new Date(contractFields.confirmation_date) : null,
          is_renewed: contractFields.is_renewed || false,
          renewal_report: contractFields.renewal_report || null
        }
      });

      // Document records are already created by createEmployment/updateEmployment
      // No need to create them again here to avoid duplicates


      return contract;
    });
  },

  // Delete contract record
  deleteContract: async (employmentId) => {
    return prisma.employmentContract.delete({
      where: { employment_id: parseInt(employmentId) }
    });
  },

  // Get employment statistics
  getEmploymentStatistics: async () => {
    const [
      totalRecords,
      currentEmployees,
      byOrganization,
      byDepartment
    ] = await Promise.all([
      prisma.employment.count(),
      prisma.employment.count({ where: { is_current: true } }),
      prisma.employment.groupBy({
        by: ['organization'],
        _count: { id: true }
      }),
      prisma.employment.groupBy({
        by: ['department_id'],
        _count: { id: true },
        where: { department_id: { not: null } }
      })
    ]);

    return {
      total_records: totalRecords,
      current_employees: currentEmployees,
      by_organization: byOrganization.reduce((acc, item) => {
        acc[item.organization] = item._count.id;
        return acc;
      }, {}),
      by_department: byDepartment.reduce((acc, item) => {
        acc[item.department_id] = item._count.id;
        return acc;
      }, {})
    };
  }
};

module.exports = employmentService;
