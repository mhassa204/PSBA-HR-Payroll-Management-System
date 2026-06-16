const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helper functions for date operations
function toDateOnly(d) {
  const dt = new Date(d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

function addDays(d, n) {
  const dt = new Date(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt;
}

function formatYMD(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dayName(d) {
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][d.getUTCDay()];
}

// Get payroll range for a given month (21st of previous month to 20th of current month)
function getPayrollRangeForMonth(year, month) {
  // month is 1-based (1 = January, 12 = December)
  let start, end;

  if (month === 1) {
    // January: Dec 21 of previous year to Jan 20
    start = new Date(Date.UTC(year - 1, 11, 21)); // Dec = month 11
    end = new Date(Date.UTC(year, 0, 20)); // Jan = month 0
  } else {
    // Other months: 21st of previous month to 20th of current month
    start = new Date(Date.UTC(year, month - 2, 21)); // previous month (month-2 because month is 1-based)
    end = new Date(Date.UTC(year, month - 1, 20)); // current month (month-1 because month is 1-based)
  }

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  return { start, end };
}

// Get rosters for location
async function getRostersForLocation(locationId, start, end) {
  return prisma.dutyRoster.findMany({
    where: {
      is_deleted: false,
      bazaar_id: Number(locationId),
      status: "APPROVED",
      valid_to: { gte: start },
      valid_from: { lte: end },
    },
    include: {
      entries: {
        include: { employee: true },
      },
    },
    orderBy: { valid_from: "asc" },
  });
}

const payrollService = {
  // Get employee payroll details for a specific month
  getEmployeePayrollDetails: async (employeeId, year, month) => {
    try {
      // Get employee with current employment
      const employee = await prisma.employee.findFirst({
        where: {
          id: parseInt(employeeId),
          is_deleted: false,
        },
        include: {
          employmentRecords: {
            where: {
              is_current: true,
              is_deleted: false,
            },
            include: {
              department: true,
              designation: true,
              location: true,
              salary: true,
            },
          },
        },
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      const currentEmployment =
        employee.employmentRecords?.[0] || employee.employmentRecords?.[0];
      if (!currentEmployment) {
        throw new Error("No current employment record found");
      }

      const locationId = currentEmployment.location_id;
      if (!locationId) {
        throw new Error("Employee location not assigned");
      }

      // Get payroll range for the selected month
      const { start, end } = getPayrollRangeForMonth(year, month);

      // Build list of all dates in the range
      const dayList = [];
      let d = new Date(start);
      while (d <= end) {
        dayList.push(new Date(d));
        d = addDays(d, 1);
      }

      // Get roster entries for this employee at the location
      const rosters = await getRostersForLocation(locationId, start, end);
      const rosterEntries = [];

      for (const roster of rosters) {
        for (const entry of roster.entries || []) {
          if (entry.employee_id === employee.id) {
            rosterEntries.push({ roster, entry });
          }
        }
      }

      // Get approved leaves for the employee in this period
      const approvedLeaves = await prisma.leave.findMany({
        where: {
          employee_id: employee.id,
          date: { gte: start, lte: end },
          status: "APPROVED",
          is_deleted: false,
        },
      });

      // Build sets for quick lookup
      const approvedLeaveSet = new Set(
        approvedLeaves.map((l) => formatYMD(l.date))
      );

      // Get attendance records for this employee (face system, keyed by cnic)
      const empCnic = String(employee.cnic || "").replace(/\D/g, "");
      const attendanceRecords = empCnic
        ? await prisma.attendance.findMany({
            where: {
              cnic: empCnic,
              attendanceDate: { gte: start, lte: end },
            },
            select: {
              cnic: true,
              attendanceDate: true,
              type: true,
              timestamp: true,
            },
            orderBy: { attendanceDate: "asc" },
          })
        : [];

      // Group attendance by date (presence = has at least IN or OUT). Key: cnic|YMD
      const presentSet = new Set();
      for (const att of attendanceRecords) {
        const key = `${String(att.cnic || "").replace(/\D/g, "")}|${formatYMD(att.attendanceDate)}`;
        presentSet.add(key);
      }

      // Calculate roster-covered dates and weekly offs
      const rosterCoveredDates = [];
      const weeklyOffDates = [];

      for (const date of dayList) {
        // Find applicable roster entry for this date
        const applicable = rosterEntries.find(
          (re) => re.roster.valid_from <= date && re.roster.valid_to >= date
        );

        if (!applicable) continue;

        rosterCoveredDates.push(date);
        const sched = applicable.entry.day_schedules || {};
        const dayKey = dayName(date);
        const dayInfo = sched[dayKey] || null;
        const cwo = sched._collective_weekly_off || { enabled: false };

        const withinCwo =
          cwo.enabled &&
          cwo.from &&
          cwo.to &&
          new Date(cwo.from) <= date &&
          new Date(cwo.to) >= date;

        if (withinCwo || dayInfo?.type === "weekly_off") {
          weeklyOffDates.push(date);
        }
      }

      const weeklyOffSet = new Set(weeklyOffDates.map((dt) => formatYMD(dt)));

      // Calculate present days (attendance mark on roster-covered date excluding weekly offs)
      let presentDays = 0;
      for (const date of rosterCoveredDates) {
        const ymdDate = formatYMD(date);
        if (weeklyOffSet.has(ymdDate)) continue;
        if (empCnic && presentSet.has(`${empCnic}|${ymdDate}`)) {
          presentDays++;
        }
      }

      const workingDays = rosterCoveredDates.length; // includes weekly offs
      const weeklyOffCount = weeklyOffDates.length;
      const approvedFullDayLeaves = approvedLeaves.filter((l) => {
        const leaveDate = formatYMD(l.date);
        return rosterCoveredDates.some((rc) => formatYMD(rc) === leaveDate);
      }).length;

      // Calculate absents
      const absents = Math.max(
        0,
        workingDays - weeklyOffCount - approvedFullDayLeaves - presentDays
      );

      // Get total month days (21st previous month to 20th current month)
      const totalMonthDays = dayList.length;

      // Salary calculations
      const salary = currentEmployment.salary;
      const basicSalary = salary?.basic_salary || 0;
      const medicalAllowance = salary?.medical_allowance || 0;
      const houseRent = salary?.house_rent || 0;
      const conveyanceAllowance = salary?.conveyance_allowance || 0;
      const otherAllowances = salary?.other_allowances || 0;

      // Calculate total salary
      const totalSalary =
        basicSalary +
        medicalAllowance +
        houseRent +
        conveyanceAllowance +
        otherAllowances;

      // Calculate salary days (Total month days - absents)
      const salaryDays = totalMonthDays - absents;

      // Calculate adjusted total salary (basic salary prorated + all allowances)
      const adjustedBasicSalary =
        totalMonthDays > 0 ? (basicSalary / totalMonthDays) * salaryDays : 0;

      // Adjusted total includes prorated basic + all allowances (allowances are not prorated)
      const adjustedTotalSalary =
        adjustedBasicSalary +
        medicalAllowance +
        houseRent +
        conveyanceAllowance +
        otherAllowances;

      return {
        success: true,
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          employee_id: employee.employee_id,
          cnic: employee.cnic,
        },
        employment: {
          designation: currentEmployment.designation?.title || null,
          department: currentEmployment.department?.name || null,
          location: currentEmployment.location?.name || null,
        },
        salary: {
          basic_salary: basicSalary,
          medical_allowance: medicalAllowance,
          house_rent: houseRent,
          conveyance_allowance: conveyanceAllowance,
          other_allowances: otherAllowances,
          total_salary: totalSalary,
          bank_name_primary: salary?.bank_name_primary || null,
          bank_account_primary: salary?.bank_account_primary || null,
          bank_branch_code: salary?.bank_branch_code || null,
        },
        attendance: {
          total_month_days: totalMonthDays,
          working_days: workingDays,
          weekly_off_count: weeklyOffCount,
          approved_leaves: approvedFullDayLeaves,
          present_days: presentDays,
          absents: absents,
          salary_days: salaryDays,
        },
        payroll: {
          adjusted_basic_salary: adjustedBasicSalary,
          adjusted_total_salary: adjustedTotalSalary,
          arrears: 0, // Placeholder
          other_deductions: 0, // Placeholder
        },
        period: {
          start: formatYMD(start),
          end: formatYMD(end),
          year,
          month,
        },
      };
    } catch (error) {
      console.error("Error in getEmployeePayrollDetails:", error);
      throw error;
    }
  },

  // Create a payroll record
  createPayroll: async (employeeId, year, month, payrollData) => {
    try {
      // Check if payroll already exists for this employee, year, and month
      const existing = await prisma.payroll.findFirst({
        where: {
          employee_id: parseInt(employeeId),
          year: parseInt(year),
          month: parseInt(month),
          is_deleted: false,
        },
      });

      if (existing) {
        throw new Error(
          `Payroll already exists for this employee for ${year}-${String(
            month
          ).padStart(2, "0")}`
        );
      }

      // Get payroll range for the month
      const { start, end } = getPayrollRangeForMonth(
        parseInt(year),
        parseInt(month)
      );

      // Calculate net payable
      const netPayable =
        (payrollData.adjusted_total_salary || 0) +
        (payrollData.arrears || 0) -
        (payrollData.other_deductions || 0);

      // Create payroll record
      const payroll = await prisma.payroll.create({
        data: {
          employee_id: parseInt(employeeId),
          year: parseInt(year),
          month: parseInt(month),
          period_start: start,
          period_end: end,
          employee_name: payrollData.employee_name,
          employee_cnic: payrollData.employee_cnic || null,
          designation: payrollData.designation || null,
          department: payrollData.department || null,
          location: payrollData.location || null,
          bank_name: payrollData.bank_name || null,
          account_number: payrollData.account_number || null,
          branch_code: payrollData.branch_code || null,
          basic_salary: payrollData.basic_salary || 0,
          medical_allowance: payrollData.medical_allowance || 0,
          house_rent: payrollData.house_rent || 0,
          conveyance_allowance: payrollData.conveyance_allowance || 0,
          other_allowances: payrollData.other_allowances || 0,
          total_salary: payrollData.total_salary || 0,
          total_month_days: payrollData.total_month_days || 0,
          working_days: payrollData.working_days || 0,
          weekly_off_count: payrollData.weekly_off_count || 0,
          approved_leaves: payrollData.approved_leaves || 0,
          present_days: payrollData.present_days || 0,
          absents: payrollData.absents || 0,
          salary_days: payrollData.salary_days || 0,
          adjusted_basic_salary: payrollData.adjusted_basic_salary || 0,
          adjusted_total_salary: payrollData.adjusted_total_salary || 0,
          arrears: parseFloat(payrollData.arrears || 0),
          other_deductions: parseFloat(payrollData.other_deductions || 0),
          net_payable: netPayable,
          status: "CREATED",
        },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      return {
        success: true,
        payroll,
      };
    } catch (error) {
      console.error("Error in createPayroll:", error);
      throw error;
    }
  },

  // Get all payrolls for an employee
  getPayrollsByEmployee: async (employeeId) => {
    try {
      const payrolls = await prisma.payroll.findMany({
        where: {
          employee_id: parseInt(employeeId),
          is_deleted: false,
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        include: {
          processedBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        payrolls,
      };
    } catch (error) {
      console.error("Error in getPayrollsByEmployee:", error);
      throw error;
    }
  },

  // Start processing a payroll (mark as UNDER_PROCESS)
  startProcessPayroll: async (payrollId, userId) => {
    try {
      const payroll = await prisma.payroll.findFirst({
        where: {
          id: parseInt(payrollId),
          is_deleted: false,
        },
      });

      if (!payroll) {
        throw new Error("Payroll not found");
      }

      if (payroll.status === "PROCESSED") {
        throw new Error("Payroll is already processed");
      }

      if (payroll.status === "UNDER_PROCESS") {
        throw new Error("Payroll is already under process");
      }

      const updated = await prisma.payroll.update({
        where: {
          id: parseInt(payrollId),
        },
        data: {
          status: "UNDER_PROCESS",
        },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      return {
        success: true,
        payroll: updated,
      };
    } catch (error) {
      console.error("Error in startProcessPayroll:", error);
      throw error;
    }
  },

  // Undo start process (revert UNDER_PROCESS to CREATED)
  undoStartProcess: async (payrollId) => {
    try {
      const payroll = await prisma.payroll.findFirst({
        where: {
          id: parseInt(payrollId),
          is_deleted: false,
        },
      });

      if (!payroll) {
        throw new Error("Payroll not found");
      }

      if (payroll.status !== "UNDER_PROCESS") {
        throw new Error("Payroll is not under process, cannot undo");
      }

      const updated = await prisma.payroll.update({
        where: {
          id: parseInt(payrollId),
        },
        data: {
          status: "CREATED",
        },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      return {
        success: true,
        payroll: updated,
      };
    } catch (error) {
      console.error("Error in undoStartProcess:", error);
      throw error;
    }
  },

  // Mark payrolls as PROCESSED (called when tranch is created)
  markPayrollsAsProcessed: async (payrollIds, userId) => {
    try {
      const payrollIdsInt = Array.isArray(payrollIds)
        ? payrollIds.map((id) => parseInt(id))
        : [parseInt(payrollIds)];

      const updated = await prisma.payroll.updateMany({
        where: {
          id: { in: payrollIdsInt },
          is_deleted: false,
          status: "UNDER_PROCESS",
        },
        data: {
          status: "PROCESSED",
          processed_at: new Date(),
          processed_by_user_id: userId ? parseInt(userId) : null,
        },
      });

      return {
        success: true,
        count: updated.count,
      };
    } catch (error) {
      console.error("Error in markPayrollsAsProcessed:", error);
      throw error;
    }
  },

  // Get a single payroll by ID
  getPayrollById: async (payrollId) => {
    try {
      const payroll = await prisma.payroll.findFirst({
        where: {
          id: parseInt(payrollId),
          is_deleted: false,
        },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
              cnic: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!payroll) {
        throw new Error("Payroll not found");
      }

      return {
        success: true,
        payroll,
      };
    } catch (error) {
      console.error("Error in getPayrollById:", error);
      throw error;
    }
  },

  // Update a payroll (only arrears and other_deductions can be updated)
  updatePayroll: async (payrollId, updateData) => {
    try {
      const payroll = await prisma.payroll.findFirst({
        where: {
          id: parseInt(payrollId),
          is_deleted: false,
        },
      });

      if (!payroll) {
        throw new Error("Payroll not found");
      }

      if (payroll.status === "PROCESSED") {
        throw new Error("Cannot update a processed payroll");
      }

      // Allow updates for CREATED and UNDER_PROCESS status
      if (payroll.status !== "CREATED" && payroll.status !== "UNDER_PROCESS") {
        throw new Error("Cannot update payroll with current status");
      }

      // Only allow updating arrears and other_deductions
      const arrears = parseFloat(updateData.arrears || 0);
      const otherDeductions = parseFloat(updateData.other_deductions || 0);

      // Recalculate net payable
      const netPayable =
        (payroll.adjusted_total_salary || 0) + arrears - otherDeductions;

      const updated = await prisma.payroll.update({
        where: {
          id: parseInt(payrollId),
        },
        data: {
          arrears,
          other_deductions: otherDeductions,
          net_payable: netPayable,
        },
        include: {
          employee: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      return {
        success: true,
        payroll: updated,
      };
    } catch (error) {
      console.error("Error in updatePayroll:", error);
      throw error;
    }
  },

  // Delete a payroll (soft delete - only for CREATED status)
  deletePayroll: async (payrollId) => {
    try {
      const payroll = await prisma.payroll.findFirst({
        where: {
          id: parseInt(payrollId),
          is_deleted: false,
        },
      });

      if (!payroll) {
        throw new Error("Payroll not found");
      }

      if (payroll.status === "PROCESSED") {
        throw new Error("Cannot delete a processed payroll");
      }

      if (payroll.status === "UNDER_PROCESS") {
        throw new Error("Cannot delete a payroll that is under process");
      }

      const deleted = await prisma.payroll.update({
        where: {
          id: parseInt(payrollId),
        },
        data: {
          is_deleted: true,
        },
      });

      return {
        success: true,
        payroll: deleted,
      };
    } catch (error) {
      console.error("Error in deletePayroll:", error);
      throw error;
    }
  },

  // Get under-process payrolls with filters
  getUnderProcessPayrolls: async (filters = {}, page = 1, limit = 50) => {
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {
        is_deleted: false,
        status: "UNDER_PROCESS",
      };

      // Build employee filter object (merging multiple conditions)
      const employeeWhere = {
        is_deleted: false,
      };

      // Filter by employee name
      if (filters.name) {
        employeeWhere.full_name = {
          contains: filters.name,
          mode: "insensitive",
        };
      }

      // Filter by mobile (needs join with employee)
      if (filters.mobile) {
        employeeWhere.mobile_number = {
          contains: filters.mobile,
          mode: "insensitive",
        };
      }

      // Filter by scale grade (if provided)
      if (filters.scaleGrade) {
        employeeWhere.employmentRecords = {
          some: {
            is_current: true,
            is_deleted: false,
            scale_grade_id: parseInt(filters.scaleGrade),
          },
        };
      }

      // Add employee filter if any employee conditions exist
      if (Object.keys(employeeWhere).length > 1) {
        where.employee = employeeWhere;
      }

      // Filter by CNIC
      if (filters.cnic) {
        where.employee_cnic = {
          contains: filters.cnic,
          mode: "insensitive",
        };
      }

      // Filter by designation (payroll stores designation as string)
      if (filters.designation) {
        where.designation = {
          contains: filters.designation,
          mode: "insensitive",
        };
      }

      // Filter by department (payroll stores department as string)
      if (filters.department) {
        where.department = {
          contains: filters.department,
          mode: "insensitive",
        };
      }

      // Filter by location (payroll stores location as string)
      if (filters.location) {
        where.location = {
          contains: filters.location,
          mode: "insensitive",
        };
      }

      // Filter by net_payable amount
      if (filters.amountOperator && filters.amountValue) {
        const amountValue = parseFloat(filters.amountValue);
        if (filters.amountOperator === "greater_than") {
          where.net_payable = { gt: amountValue };
        } else if (filters.amountOperator === "less_than") {
          where.net_payable = { lt: amountValue };
        } else if (filters.amountOperator === "equal") {
          where.net_payable = { equals: amountValue };
        }
      }

      const [payrolls, total] = await Promise.all([
        prisma.payroll.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            employee: {
              select: {
                id: true,
                full_name: true,
                cnic: true,
                mobile_number: true,
              },
            },
          },
          orderBy: [
            { year: "desc" },
            { month: "desc" },
            { employee_name: "asc" },
          ],
        }),
        prisma.payroll.count({ where }),
      ]);

      return {
        success: true,
        payrolls,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      console.error("Error in getUnderProcessPayrolls:", error);
      throw error;
    }
  },
};

module.exports = payrollService;
