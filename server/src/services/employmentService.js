const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const employmentService = {
  // Create new employment record with salary and location
  createEmployment: async (data) => {
    const {
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
      is_on_probation = false,
      probation_end_date,
      // Salary data
      salary,
      // Location data
      location
    } = data;

    // Validate employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employee_id) }
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

    // Create employment record with salary and location in transaction
    return prisma.$transaction(async (tx) => {
      // Create main employment record
      const employment = await tx.employment.create({
        data: {
          employee_id: parseInt(employee_id),
          organization,
          department_id: department_id ? parseInt(department_id) : null,
          designation_id: designation_id ? parseInt(designation_id) : null,
          employment_type,
          effective_from: effective_from ? new Date(effective_from) : null,
          effective_till: effective_till ? new Date(effective_till) : null,
          role_tag,
          reporting_officer_id,
          office_location,
          remarks,
          is_on_probation,
          probation_end_date: probation_end_date ? new Date(probation_end_date) : null
        }
      });

      // Create salary record if provided
      if (salary) {
        await tx.employmentSalary.create({
          data: {
            employment_id: employment.id,
            basic_salary: salary.basic_salary ? parseFloat(salary.basic_salary) : 0,
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

      // Create location record if provided
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

      // Return complete employment record
      return tx.employment.findUnique({
        where: { id: employment.id },
        include: {
          employee: true,
          department: true,
          designation: true,
          salary: true,
          location: true
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
          location: true
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
    return prisma.employment.findUnique({
      where: { id: parseInt(id) },
      include: {
        employee: true,
        department: true,
        designation: true,
        salary: true,
        location: true
      }
    });
  },

  // Get employment records by employee ID
  getEmploymentsByEmployeeId: async (employeeId) => {
    return prisma.employment.findMany({
      where: { employee_id: parseInt(employeeId) },
      include: {
        department: true,
        designation: true,
        salary: true,
        location: true
      },
      orderBy: { effective_from: 'asc' }
    });
  },

  // Update employment record with salary and location
  updateEmployment: async (id, data) => {
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
      is_on_probation,
      probation_end_date,
      // Salary data
      salary,
      // Location data
      location
    } = data;

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

    // Get current employment record
    const currentEmployment = await prisma.employment.findUnique({
      where: { id: parseInt(id) }
    });
    if (!currentEmployment) throw new Error("Employment record not found");

    // Update employment record with salary and location in transaction
    return prisma.$transaction(async (tx) => {
      // Update main employment record
      const employmentUpdateData = {};
      if (organization !== undefined) employmentUpdateData.organization = organization;
      if (department_id !== undefined) employmentUpdateData.department_id = department_id ? parseInt(department_id) : null;
      if (designation_id !== undefined) employmentUpdateData.designation_id = designation_id ? parseInt(designation_id) : null;
      if (employment_type !== undefined) employmentUpdateData.employment_type = employment_type;
      if (effective_from !== undefined) employmentUpdateData.effective_from = effective_from ? new Date(effective_from) : null;
      if (effective_till !== undefined) employmentUpdateData.effective_till = effective_till ? new Date(effective_till) : null;
      if (role_tag !== undefined) employmentUpdateData.role_tag = role_tag;
      if (reporting_officer_id !== undefined) employmentUpdateData.reporting_officer_id = reporting_officer_id;
      if (office_location !== undefined) employmentUpdateData.office_location = office_location;
      if (remarks !== undefined) employmentUpdateData.remarks = remarks;
      if (is_on_probation !== undefined) employmentUpdateData.is_on_probation = is_on_probation;
      if (probation_end_date !== undefined) employmentUpdateData.probation_end_date = probation_end_date ? new Date(probation_end_date) : null;

      const employment = await tx.employment.update({
        where: { id: parseInt(id) },
        data: employmentUpdateData
      });

      // Update or create salary record if provided
      if (salary) {
        const salaryData = {
          basic_salary: salary.basic_salary ? parseFloat(salary.basic_salary) : 0,
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

      // Update or create location record if provided
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

      // Return complete employment record
      return tx.employment.findUnique({
        where: { id: employment.id },
        include: {
          employee: true,
          department: true,
          designation: true,
          salary: true,
          location: true
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
