const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function toDateOnly(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}
function addDays(d, n) {
  const dt = new Date(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt;
}
function ymd(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function getActiveLeaveBank() {
  const today = toDateOnly(new Date());
  if (!today) return null;
  return prisma.leaveBank.findFirst({
    where: {
      is_deleted: false,
      period_start: { lte: today },
      period_end: { gte: today },
    },
    orderBy: { period_start: "desc" },
    include: { defaults: true },
  });
}
async function isSubordinateOfLoggedIn(employeeId, req) {
  const userEmpId = req.session?.user?.employee_id || null;
  if (!userEmpId) return false;
  const emp = await prisma.employment.findFirst({
    where: {
      employee_id: Number(employeeId),
      is_current: true,
      is_deleted: false,
      reporting_officer_id: String(userEmpId),
      employee: { is_deleted: false, status: "Active" },
    },
  });
  return !!emp;
}
function buildSummaryForEmployees({
  employees,
  leaveTypes,
  bank,
  allocations,
  leavesInPeriod,
}) {
  const defaultsMap = new Map();
  for (const d of bank?.defaults || [])
    defaultsMap.set(d.leave_type_id, d.days);
  const allocMap = new Map();
  for (const a of allocations) {
    const byEmp = allocMap.get(a.employee_id) || new Map();
    byEmp.set(a.leave_type_id, a.days);
    allocMap.set(a.employee_id, byEmp);
  }
  const usedApproved = new Map();
  const usedPending = new Map();
  for (const l of leavesInPeriod) {
    const key = `${l.employee_id}|${l.type || ""}`;
    if (l.status === "APPROVED")
      usedApproved.set(key, (usedApproved.get(key) || 0) + 1);
    else if (l.status === "PENDING")
      usedPending.set(key, (usedPending.get(key) || 0) + 1);
  }
  const types = leaveTypes || [];
  const itemsByEmp = new Map();
  for (const emp of employees) {
    const rows = [];
    for (const t of types) {
      const allocDays =
        allocMap.get(emp.id)?.get(t.id) ?? defaultsMap.get(t.id) ?? 0;
      const approved = usedApproved.get(`${emp.id}|${t.name}`) || 0;
      const pending = usedPending.get(`${emp.id}|${t.name}`) || 0;
      rows.push({
        typeId: t.id,
        typeName: t.name,
        allocated: allocDays,
        approvedUsed: approved,
        pending,
        available: Math.max(0, allocDays - approved),
      });
    }
    itemsByEmp.set(emp.id, rows);
  }
  return itemsByEmp;
}

module.exports = {
  helpers: {
    toDateOnly,
    addDays,
    ymd,
    getActiveLeaveBank,
    isSubordinateOfLoggedIn,
    buildSummaryForEmployees,
  },
  listApplyEmployees: async (req, search) => {
    const user = req.session?.user;
    if (!user) return [];

    // Try to get employee_id from user session
    let userEmpId = user.employee_id;

    // If no employee_id in session, try to resolve it from user record
    if (!userEmpId && user.id) {
      try {
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { employee_id: true },
        });
        userEmpId = userRecord?.employee_id;
      } catch (error) {
        console.error("Error resolving user employee_id:", error);
      }
    }

    const deptId = Number(user.department_id || 0);
    const locId = Number(user.location_id || 0);

    let employees = [];

    // Location-based account path: user account directly linked with locations table
    if (!userEmpId && !deptId && locId) {
      employees = await prisma.employee.findMany({
        where: {
          is_deleted: false,
          status: "Active",
          employmentRecords: {
            some: { is_current: true, is_deleted: false, location_id: locId },
          },
          ...(search
            ? {
                OR: [
                  { full_name: { contains: search, mode: "insensitive" } },
                  { employee_id: { contains: search, mode: "insensitive" } },
                  { cnic: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          employmentRecords: {
            where: { is_current: true, is_deleted: false },
            include: { designation: true, role_tag: true },
          },
        },
        orderBy: { full_name: "asc" },
      });
    }
    // Department-based account path: no personal employee_id but has department_id
    else if (!userEmpId && deptId) {
      const dept = await prisma.department.findFirst({
        where: { id: deptId, is_deleted: false },
        include: { head: true },
      });
      const hodId = dept?.head?.id || 0;
      employees = await prisma.employee.findMany({
        where: {
          is_deleted: false,
          status: "Active",
          employmentRecords: {
            some: {
              is_current: true,
              is_deleted: false,
              department_id: deptId,
            },
          },
          id: { not: hodId },
          ...(search
            ? {
                OR: [
                  { full_name: { contains: search, mode: "insensitive" } },
                  { employee_id: { contains: search, mode: "insensitive" } },
                  { cnic: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          employmentRecords: {
            where: { is_current: true, is_deleted: false },
            include: { designation: true, role_tag: true },
          },
        },
        orderBy: { full_name: "asc" },
      });
    }
    // Employee-based account path: has employee_id
    else if (userEmpId) {
      // Get subordinates
      const subs = await prisma.employment.findMany({
        where: {
          is_deleted: false,
          is_current: true,
          organization: "PSBA",
          reporting_officer_id: String(userEmpId),
          employee: {
            is_deleted: false,
            status: "Active",
            ...(search
              ? {
                  OR: [
                    { full_name: { contains: search, mode: "insensitive" } },
                    { employee_id: { contains: search, mode: "insensitive" } },
                    { cnic: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
        },
        include: { employee: true, designation: true, role_tag: true },
        orderBy: { employee_id: "asc" },
      });

      const seen = new Set();
      const list = [];
      for (const r of subs) {
        if (seen.has(r.employee_id)) continue;
        seen.add(r.employee_id);
        list.push({
          id: r.employee.id,
          employee_id: r.employee.employee_id,
          full_name: r.employee.full_name,
          cnic: r.employee.cnic,
          employmentRecords: [
            { designation: r.designation, role_tag: r.role_tag },
          ],
        });
      }

      // Add self
      const selfEmp = await prisma.employee.findFirst({
        where: {
          id: Number(userEmpId),
          is_deleted: false,
          status: "Active",
          ...(search
            ? {
                OR: [
                  { full_name: { contains: search, mode: "insensitive" } },
                  { employee_id: { contains: search, mode: "insensitive" } },
                  { cnic: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          employmentRecords: {
            where: { is_current: true, is_deleted: false },
            include: { designation: true, role_tag: true },
          },
        },
      });
      if (selfEmp && !seen.has(selfEmp.employee_id)) {
        list.unshift({
          id: selfEmp.id,
          employee_id: selfEmp.employee_id,
          full_name: selfEmp.full_name,
          cnic: selfEmp.cnic,
          employmentRecords: [
            {
              designation: selfEmp.employmentRecords?.[0]?.designation || null,
              role_tag: selfEmp.employmentRecords?.[0]?.role_tag || null,
            },
          ],
        });
        seen.add(selfEmp.employee_id);
      }

      employees = list;
    }
    // recent leaves
    const empIds = employees.map((e) => e.id);
    const leaves = empIds.length
      ? await prisma.leave.findMany({
          where: { employee_id: { in: empIds }, is_deleted: false },
          orderBy: { date: "desc" },
        })
      : [];
    const leavesByEmp = new Map();
    for (const l of leaves) {
      const arr = leavesByEmp.get(l.employee_id) || [];
      arr.push({
        id: l.id,
        date: l.date,
        type: l.type,
        status: l.status,
        remarks: l.remarks,
      });
      leavesByEmp.set(l.employee_id, arr);
    }
    return employees.map((e) => ({
      ...e,
      leaves: leavesByEmp.get(e.id) || [],
    }));
  },
  listEmployeesWithSummary: async (search) => {
    const whereEmp = {
      is_deleted: false,
      ...(search
        ? {
            OR: [
              { full_name: { contains: search, mode: "insensitive" } },
              { employee_id: { contains: search, mode: "insensitive" } },
              { cnic: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const employees = await prisma.employee.findMany({
      where: whereEmp,
      select: {
        id: true,
        employee_id: true,
        full_name: true,
        cnic: true,
        employmentRecords: {
          where: { is_current: true, is_deleted: false },
          include: { designation: true, role_tag: true },
        },
        leaves: { where: { is_deleted: false }, orderBy: { date: "desc" } },
      },
      orderBy: [{ full_name: "asc" }, { id: "asc" }],
    });
    const activeBank = await getActiveLeaveBank();
    let enriched = employees;
    let summaryByEmp = new Map();
    let leaveTypes = [];
    if (activeBank) {
      leaveTypes = await prisma.leaveType.findMany({
        where: { is_deleted: false, is_active: true },
        orderBy: { name: "asc" },
      });
      const empIds = employees.map((e) => e.id);
      const allocations = await prisma.leaveBankAllocation.findMany({
        where: { leave_bank_id: activeBank.id, employee_id: { in: empIds } },
      });
      const leavesInPeriod = await prisma.leave.findMany({
        where: {
          is_deleted: false,
          employee_id: { in: empIds },
          date: {
            gte: toDateOnly(activeBank.period_start),
            lte: toDateOnly(activeBank.period_end),
          },
        },
        select: { employee_id: true, type: true, status: true },
      });
      summaryByEmp = buildSummaryForEmployees({
        employees,
        leaveTypes,
        bank: activeBank,
        allocations,
        leavesInPeriod,
      });
      enriched = employees.map((e) => ({
        ...e,
        currentLeaveBankSummary: {
          bankId: activeBank.id,
          title: activeBank.title,
          period_start: activeBank.period_start,
          period_end: activeBank.period_end,
          items: summaryByEmp.get(e.id) || [],
        },
      }));
    }
    return {
      employees: enriched,
      activeBank: activeBank
        ? {
            id: activeBank.id,
            title: activeBank.title,
            period_start: activeBank.period_start,
            period_end: activeBank.period_end,
          }
        : null,
    };
  },
  getEmployeeLeavesWithSummary: async (employeeId) => {
    const leaves = await prisma.leave.findMany({
      where: { employee_id: employeeId, is_deleted: false },
      orderBy: { date: "desc" },
      include: {
        backup_employee: {
          select: {
            id: true,
            full_name: true,
            employee_id: true,
          },
        },
        routes: {
          include: {
            approver_user: {
              select: {
                id: true,
                email: true,
                employee: {
                  select: { id: true, full_name: true, employee_id: true },
                },
              },
            },
          },
        },
      },
    });
    const activeBank = await getActiveLeaveBank();
    let summary = null;
    if (activeBank) {
      const leaveTypes = await prisma.leaveType.findMany({
        where: { is_deleted: false, is_active: true },
        orderBy: { name: "asc" },
      });
      const allocations = await prisma.leaveBankAllocation.findMany({
        where: { leave_bank_id: activeBank.id, employee_id: employeeId },
      });
      const leavesInPeriod = await prisma.leave.findMany({
        where: {
          is_deleted: false,
          employee_id: employeeId,
          date: {
            gte: toDateOnly(activeBank.period_start),
            lte: toDateOnly(activeBank.period_end),
          },
        },
        select: { employee_id: true, type: true, status: true },
      });
      const itemsMap = buildSummaryForEmployees({
        employees: [{ id: employeeId }],
        leaveTypes,
        bank: activeBank,
        allocations,
        leavesInPeriod,
      });
      summary = {
        bankId: activeBank.id,
        title: activeBank.title,
        period_start: activeBank.period_start,
        period_end: activeBank.period_end,
        items: itemsMap.get(employeeId) || [],
      };
    }
    return { leaves, summary };
  },
  createLeaves: async ({
    employeeId,
    type,
    remarks,
    date,
    start,
    end,
    dates,
    duty_from,
    duty_to,
    // New fields
    submission_time,
    custom_type,
    backup_employee_id,
    backup_duty_from,
    backup_duty_to,
    documents,
    routes,
  }) => {
    const toInsert = new Set();
    if (Array.isArray(dates) && dates.length) {
      for (const d of dates) {
        const dt = toDateOnly(d);
        if (dt) toInsert.add(ymd(dt));
      }
    } else if (start && end) {
      const s = toDateOnly(start);
      const e = toDateOnly(end);
      if (!s || !e || s > e) throw new Error("Invalid start/end");
      let cur = s;
      while (cur <= e) {
        toInsert.add(ymd(cur));
        cur = addDays(cur, 1);
      }
    } else if (date) {
      const dt = toDateOnly(date);
      if (!dt) throw new Error("Invalid date");
      toInsert.add(ymd(dt));
    } else {
      throw new Error("Provide date or start/end or dates[]");
    }
    const list = Array.from(toInsert);
    if (!list.length) throw new Error("No valid dates to insert");
    const existing = await prisma.leave.findMany({
      where: {
        employee_id: employeeId,
        is_deleted: false,
        date: { in: list.map((d) => new Date(d)) },
      },
      select: { date: true },
    });
    const existSet = new Set(existing.map((x) => ymd(toDateOnly(x.date))));
    const fmt = (t) => {
      if (!t) return null;
      const s = String(t).trim();
      const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
      return m ? `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}` : null;
    };
    const df = fmt(duty_from);
    const dt = fmt(duty_to);
    const enrichRemarks = (base) => {
      // Don't append duty time to remarks since we have separate fields now
      return base || null;
    };
    // Format backup duty times
    const fmtBackup = (t) => {
      if (!t) return null;
      const s = String(t).trim();
      const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
      return m ? `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}` : null;
    };
    const backupDutyFrom = fmtBackup(backup_duty_from);
    const backupDutyTo = fmtBackup(backup_duty_to);

    const payload = list
      .filter((d) => !existSet.has(d))
      .map((d) => ({
        employee_id: employeeId,
        date: new Date(d),
        type: String(type),
        remarks: enrichRemarks(remarks || null),
        // New fields
        submission_time: submission_time
          ? new Date(submission_time)
          : new Date(new Date().getTime() + 5 * 60 * 60 * 1000), // UTC+5
        custom_type: custom_type || null,
        backup_employee_id: backup_employee_id
          ? Number(backup_employee_id)
          : null,
        backup_duty_from: backupDutyFrom,
        backup_duty_to: backupDutyTo,
        duty_from: df,
        duty_to: dt,
        documents: documents ? JSON.stringify(documents) : null,
      }));
    let created = 0;
    let skipped = list.length - payload.length;
    const createdLeaveIds = [];
    if (payload.length) {
      await prisma.$transaction(async (tx) => {
        for (const record of payload) {
          const createdLeave = await tx.leave.create({ data: record });
          createdLeaveIds.push(createdLeave.id);
        }
        // Persist manual routing if provided: routes = [{ type: 'RECOMMEND'|'ALLOW', approver_user_id }]
        const validRoutes = Array.isArray(routes)
          ? routes
              .map((r) => ({
                type: String(r.type || "").toUpperCase(),
                approver_user_id: Number(
                  r.approver_user_id || r.user_id || r.id
                ),
              }))
              .filter(
                (r) =>
                  (r.type === "RECOMMEND" || r.type === "ALLOW") &&
                  Number.isFinite(r.approver_user_id)
              )
          : [];
        if (validRoutes.length) {
          const routeRows = [];
          for (const leaveId of createdLeaveIds) {
            for (const r of validRoutes) {
              routeRows.push({
                leave_id: leaveId,
                type: r.type,
                approver_user_id: r.approver_user_id,
              });
            }
          }
          if (routeRows.length) {
            await tx.leaveApprovalRoute.createMany({ data: routeRows });
          }
        }
        created = createdLeaveIds.length;
      });
    }
    const leaves = await prisma.leave.findMany({
      where: { employee_id: employeeId, is_deleted: false },
      orderBy: { date: "desc" },
      include: {
        backup_employee: {
          select: {
            id: true,
            full_name: true,
            employee_id: true,
          },
        },
        routes: {
          include: {
            approver_user: {
              select: {
                id: true,
                email: true,
                employee: {
                  select: { id: true, full_name: true, employee_id: true },
                },
              },
            },
          },
        },
      },
    });
    return { created, skipped, leaves };
  },
  // Search approver users excluding Establishment role users, Super Admins, specific emails, and BAZAAR location users
  searchApproverUsers: async (search) => {
    const baseWhere = {
      is_deleted: false,
      role: { name: { notIn: ["Super Admin", "Establishment"] } },
      email: {
        notIn: [
          "establishment@psba.gop.pk",
          "ad.est@psba.gop.pk",
          "admin@psba.gop.pk",
        ],
      },
      // Exclude users linked to BAZAAR locations (include users with no location or non-BAZAAR locations)
      OR: [{ location: null }, { location: { type: { not: "BAZAAR" } } }],
    };

    const where = search
      ? {
          ...baseWhere,
          AND: [
            {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                {
                  employee: {
                    full_name: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  employee: {
                    employee_id: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            },
          ],
        }
      : baseWhere;
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        employee: {
          select: {
            id: true,
            full_name: true,
            employee_id: true,
          },
        },
      },
      orderBy: [{ email: "asc" }],
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      employee: u.employee,
    }));
  },
  updateLeave: (id, data) => prisma.leave.update({ where: { id }, data }),
  updateStatus: (id, status) =>
    prisma.leave.update({ where: { id }, data: { status } }),
  softDeleteFull: (id) =>
    prisma.leave.update({ where: { id }, data: { is_deleted: true } }),
  getLeaveById: (id) => prisma.leave.findUnique({ where: { id } }),
  markDeletedConditional: async (leave) =>
    prisma.leave.update({
      where: { id: leave.id },
      data: { is_deleted: true },
    }),
  checkSubordinate: isSubordinateOfLoggedIn,
  getBackupEmployees: async (user, applicantId) => {
    try {
      let employees = [];

      if (applicantId) {
        // Get backup employees based on the applicant's context
        const applicantEmployment = await prisma.employment.findFirst({
          where: { employee_id: Number(applicantId), is_current: true },
          include: { employee: true },
        });

        if (applicantEmployment) {
          const { employee_id, department_id, location_id } =
            applicantEmployment;

          if (employee_id) {
            // Employee-based applicant: get subordinates
            const subordinates = await prisma.employment.findMany({
              where: {
                reporting_officer_id: String(employee_id),
                is_current: true,
                is_deleted: false,
              },
              include: { employee: true },
            });
            employees = subordinates.map((emp) => emp.employee);
          } else if (department_id) {
            // Department-based applicant: get all employees in the department
            const deptEmployees = await prisma.employment.findMany({
              where: {
                department_id,
                is_current: true,
                is_deleted: false,
              },
              include: { employee: true },
            });
            employees = deptEmployees.map((emp) => emp.employee);
          } else if (location_id) {
            // Location-based applicant: get all employees in the location
            const locationEmployees = await prisma.employment.findMany({
              where: {
                location_id,
                is_current: true,
                is_deleted: false,
              },
              include: { employee: true },
            });
            employees = locationEmployees.map((emp) => emp.employee);
          }
        }
      } else {
        // Fallback to logged-in user's context
        // First, get the user's current employment record to determine their context
        if (!user.employee_id) {
          // If user has no employee_id, return empty array
          return [];
        }

        const userEmployment = await prisma.employment.findFirst({
          where: {
            employee_id: user.employee_id,
            is_current: true,
            is_deleted: false,
          },
          include: { employee: true },
        });

        if (userEmployment) {
          const { employee_id, department_id, location_id } = userEmployment;

          if (employee_id) {
            // Employee-based user: get subordinates
            const subordinates = await prisma.employment.findMany({
              where: {
                reporting_officer_id: String(employee_id),
                is_current: true,
                is_deleted: false,
              },
              include: { employee: true },
            });
            employees = subordinates.map((emp) => emp.employee);
          } else if (department_id) {
            // Department-based user: get all employees in the department
            const deptEmployees = await prisma.employment.findMany({
              where: {
                department_id,
                is_current: true,
                is_deleted: false,
              },
              include: { employee: true },
            });
            employees = deptEmployees.map((emp) => emp.employee);
          } else if (location_id) {
            // Location-based user: get all employees in the location
            const locationEmployees = await prisma.employment.findMany({
              where: {
                location_id,
                is_current: true,
                is_deleted: false,
              },
              include: { employee: true },
            });
            employees = locationEmployees.map((emp) => emp.employee);
          }
        } else {
          // Fallback: try using user's direct department_id and location_id from session
          const department_id = user.department_id;
          const location_id = user.location_id;

          if (department_id) {
            // Department-based user: get all employees in the department
            const deptEmployees = await prisma.employment.findMany({
              where: {
                department_id,
                is_current: true,
                is_deleted: false,
              },
              include: { employee: true },
            });
            employees = deptEmployees.map((emp) => emp.employee);
          } else if (location_id) {
            // Location-based user: get all employees in the location
            const locationEmployees = await prisma.employment.findMany({
              where: {
                location_id,
                is_current: true,
                is_deleted: false,
              },
              include: { employee: true },
            });
            employees = locationEmployees.map((emp) => emp.employee);
          }
        }
      }

      // Filter out deleted employees and format for frontend
      return employees
        .filter((emp) => !emp.is_deleted)
        .map((emp) => ({
          id: emp.id,
          full_name: emp.full_name,
          employee_id: emp.employee_id,
          email: emp.email,
        }));
    } catch (error) {
      console.error("Error getting backup employees:", error);
      return [];
    }
  },
};
