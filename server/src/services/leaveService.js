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

function isWithoutPayType(type) {
  return /without\s*pay/i.test(String(type || ""));
}

// Hard balance guard (HR policy): when the active leave bank's balance for
// the chosen type is exhausted, only "Leave Without Pay" may be submitted.
// Skipped when no active bank exists, the type is not tracked in the bank
// (custom/"Other" types), or no allocation/default is configured — there is
// no balance to enforce then. Counts APPROVED leaves only, matching the
// "available" figure shown across the UI (pending requests are judged by
// the approvers, per the workflow's "leave balance check" duty).
async function checkLeaveBalanceOrThrow(employeeId, typeName, requestedYmdDates) {
  if (isWithoutPayType(typeName)) return;
  const bank = await getActiveLeaveBank();
  if (!bank) return;
  // Only the requested dates inside the bank period consume this balance
  const inPeriod = (requestedYmdDates || []).filter((d) => {
    const dt = toDateOnly(d);
    return dt && dt >= bank.period_start && dt <= bank.period_end;
  });
  if (!inPeriod.length) return;
  const type = await prisma.leaveType.findFirst({
    where: { name: typeName, is_deleted: false, is_active: true },
  });
  if (!type) return;
  const alloc = await prisma.leaveBankAllocation.findFirst({
    where: { leave_bank_id: bank.id, employee_id: Number(employeeId), leave_type_id: type.id },
  });
  const defaultRow = (bank.defaults || []).find((d) => d.leave_type_id === type.id);
  // No allocation for this employee and no bank default for this type =>
  // the balance simply is not configured yet. Allow the application; once
  // the bank/allocation is created the leaves in its period automatically
  // count against it (balances are computed live from leave rows).
  if (!alloc && !defaultRow) return;
  const allocated = alloc?.days ?? defaultRow?.days ?? 0;
  const used = await prisma.leave.count({
    where: {
      employee_id: Number(employeeId),
      type: typeName,
      is_deleted: false,
      status: "APPROVED",
      date: { gte: bank.period_start, lte: bank.period_end },
    },
  });
  const remaining = allocated - used;
  if (inPeriod.length > remaining) {
    throw new Error(
      `Leave balance exhausted for "${typeName}" (${Math.max(0, remaining)} of ${allocated} day(s) remaining, ${inPeriod.length} requested). Only "Leave Without Pay" can be submitted.`
    );
  }
}

// Dynamic Director General stage rules (no hardcoded policy). Stored in
// SystemSetting key "leave_dg_rules": { enabled, rules: [{ leave_types:[],
// min_days:null|n, without_pay:null|bool }] }. A rule matches when ALL of
// its set conditions match; any matching rule => DG stage required.
const DG_RULES_KEY = "leave_dg_rules";
async function getDgRules(tx = prisma) {
  const row = await tx.systemSetting.findUnique({ where: { key: DG_RULES_KEY } });
  const v = row?.value;
  if (!v || typeof v !== "object") return { enabled: false, rules: [] };
  return { enabled: !!v.enabled, rules: Array.isArray(v.rules) ? v.rules : [] };
}
async function dgStageRequired(leave, tx = prisma) {
  const cfg = await getDgRules(tx);
  if (!cfg.enabled || !cfg.rules.length) return false;
  // Day count = sibling rows of the same submission (one Leave row per date)
  const days = await tx.leave.count({
    where: {
      employee_id: leave.employee_id,
      type: leave.type,
      submission_time: leave.submission_time,
      is_deleted: false,
    },
  });
  const lwp = isWithoutPayType(leave.type);
  return cfg.rules.some((r) => {
    if (Array.isArray(r.leave_types) && r.leave_types.length && !r.leave_types.includes(leave.type)) return false;
    if (r.min_days != null && !(days >= Number(r.min_days))) return false;
    if (r.without_pay != null && Boolean(r.without_pay) !== lwp) return false;
    return true;
  });
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
    // Per the HR-approved workflow, incharges search employees by CNIC only.
    if (!userEmpId && !deptId && locId) {
      employees = await prisma.employee.findMany({
        where: {
          is_deleted: false,
          status: "Active",
          employmentRecords: {
            some: { is_current: true, is_deleted: false, location_id: locId },
          },
          ...(search ? { cnic: { contains: search, mode: "insensitive" } } : {}),
        },
        include: {
          employmentRecords: {
            where: { is_current: true, is_deleted: false },
            include: { designation: true, role_tag: true, location: true },
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
                  { cnic: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          employmentRecords: {
            where: { is_current: true, is_deleted: false },
            include: { designation: true, role_tag: true, location: true },
          },
        },
        orderBy: { full_name: "asc" },
      });
    }
    // Employee-based account path: has employee_id
    // Employee-based users can ONLY see their own employment record
    else if (userEmpId) {
      const selfEmp = await prisma.employee.findFirst({
        where: {
          id: Number(userEmpId),
          is_deleted: false,
          status: "Active",
          ...(search
            ? {
                OR: [
                  { full_name: { contains: search, mode: "insensitive" } },
                  { cnic: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          employmentRecords: {
            where: { is_current: true, is_deleted: false },
            include: { designation: true, role_tag: true, location: true },
          },
        },
      });

      if (selfEmp) {
        employees = [
          {
            id: selfEmp.id,
            employee_id: selfEmp.employee_id,
            full_name: selfEmp.full_name,
            cnic: selfEmp.cnic,
            employmentRecords: selfEmp.employmentRecords.map((er) => ({
              designation: er.designation,
              role_tag: er.role_tag,
              location: er.location,
            })),
          },
        ];
      } else {
        employees = [];
      }
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
        full_name: true,
        cnic: true,
        employmentRecords: {
          where: { is_current: true, is_deleted: false },
          include: {
            department: true,
            designation: true,
            role_tag: true,
            location: true,
          },
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
    if (!employeeId || isNaN(Number(employeeId))) {
      throw new Error("Valid employee ID is required");
    }
    const leaves = await prisma.leave.findMany({
      where: { employee_id: employeeId, is_deleted: false },
      orderBy: { date: "desc" },
      include: {
        backup_employee: {
          select: {
            id: true,
            full_name: true,
            cnic: true,
            email: true,
          },
        },
        statusHistory: {
          orderBy: { action_time: "asc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                employee: {
                  select: { id: true, full_name: true, cnic: true },
                },
              },
            },
          },
        },
        routes: {
          include: {
            approver_user: {
              select: {
                id: true,
                email: true,
                employee: {
                  select: { id: true, full_name: true, cnic: true },
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
  // Helper function to determine initial approver based on applicant type
  determineInitialApprover: async (employeeId, tx) => {
    // Get applicant's current employment record
    const applicantEmp = await tx.employment.findFirst({
      where: {
        employee_id: Number(employeeId),
        is_current: true,
        is_deleted: false,
      },
      include: {
        location: true,
        department: {
          include: {
            head: {
              include: {
                user: {
                  select: { id: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!applicantEmp) return null;

    // Case 1: location-based employee at any non-Head-Office location
    // (bazaars, mobile bazaars, special units). Per the HR-approved
    // workflow: Regional Incharge (recommendation) -> Operations Wing.
    // Regional Incharges are users with the "Regional Incharge" role whose
    // RegionalAssignment rows cover the applicant's location; if none is
    // assigned the leave goes straight to Operations.
    if (applicantEmp.location && applicantEmp.location.type !== "HEAD_OFFICE") {
      const regionalUsers = await tx.user.findMany({
        where: {
          is_deleted: false,
          role: { name: "Regional Incharge", is_deleted: false, enabled: true },
          regionalAssignments: { some: { location_id: applicantEmp.location.id } },
        },
        select: { id: true, email: true },
      });
      const operationsUsers = await tx.user.findMany({
        where: {
          is_deleted: false,
          role: { name: "Operations" },
        },
        select: { id: true, email: true },
      });
      const chain = [
        ...regionalUsers.map((u) => ({
          type: "RECOMMEND",
          approver_user_id: u.id,
          approver_email: u.email,
        })),
        ...operationsUsers.map((u) => ({
          type: "ALLOW",
          approver_user_id: u.id,
          approver_email: u.email,
        })),
      ];
      return chain.length > 0 ? chain : null;
    }

    // Case 2: Headquarter user
    // Priority: Employee-based (reporting officer) > Department-based (HOD)

    // Check if employee-based (has reporting officer)
    if (applicantEmp.reporting_officer_id) {
      const roEmpId = Number(applicantEmp.reporting_officer_id);
      const roUser = await tx.user.findFirst({
        where: {
          employee_id: roEmpId,
          is_deleted: false,
        },
        select: { id: true, email: true },
      });
      if (roUser) {
        return [
          {
            type: "ALLOW",
            approver_user_id: roUser.id,
            approver_email: roUser.email,
          },
        ];
      }
    }

    // Case 3: Department-based (Head of Department)
    if (applicantEmp.department) {
      const hod = applicantEmp.department.head;
      if (hod && hod.user) {
        return [
          {
            type: "ALLOW",
            approver_user_id: hod.user.id,
            approver_email: hod.user.email,
          },
        ];
      }
    }

    return null;
  },

  createLeaves: async (
    {
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
      custom_type,
      backup_employee_id,
      backup_duty_from,
      backup_duty_to,
      documents,
    },
    req
  ) => {
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
        // New fields - submission_time auto-saved on creation
        submission_time: new Date(new Date().getTime() + 5 * 60 * 60 * 1000), // UTC+5
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
      // HR policy: balance exhausted => only Leave Without Pay is accepted
      await checkLeaveBalanceOrThrow(
        employeeId,
        String(type),
        payload.map((p) => ymd(toDateOnly(p.date)))
      );
      await prisma.$transaction(async (tx) => {
        for (const record of payload) {
          const createdLeave = await tx.leave.create({ data: record });
          createdLeaveIds.push(createdLeave.id);
        }

        // Determine initial approver based on applicant type
        const initialApprovers = await module.exports.determineInitialApprover(
          employeeId,
          tx
        );

        let routeRows = [];

        if (initialApprovers && initialApprovers.length > 0) {
          // Create routes for initial approvers
          for (const leaveId of createdLeaveIds) {
            initialApprovers.forEach((approver, idx) => {
              routeRows.push({
                leave_id: leaveId,
                type: approver.type,
                approver_user_id: approver.approver_user_id,
                sequence: idx + 1,
              });
            });
          }
        }

        if (routeRows.length) {
          await tx.leaveApprovalRoute.createMany({ data: routeRows });
        }
        // Create SUBMITTED status history for each created leave
        const submittedBy = req?.session?.user?.id || null;
        for (const leaveId of createdLeaveIds) {
          await tx.leaveStatusHistory.create({
            data: {
              leave_id: leaveId,
              user_id: submittedBy || 0,
              action_type: "SUBMITTED",
              comments: null,
            },
          });
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
            cnic: true,
            email: true,
          },
        },
        routes: {
          include: {
            approver_user: {
              select: {
                id: true,
                email: true,
                employee: {
                  select: { id: true, full_name: true, cnic: true },
                },
              },
            },
          },
        },
      },
    });
    return { created, skipped, leaves };
  },
  // Search all users for forwarding (includes all users except deleted ones)
  searchUsersForForward: async (search) => {
    const baseWhere = {
      is_deleted: false,
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
                    cnic: { contains: search, mode: "insensitive" },
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
          },
        },
      },
      orderBy: [{ email: "asc" }],
      take: 50, // Limit results
    });

    // Filter out users whose current employment is linked to BAZAAR locations
    if (users.length === 0) return [];

    const employeeIds = users
      .map((u) => u.employee?.id)
      .filter((id) => id !== null && id !== undefined);

    // Fetch all current employments for these employees in one query
    const employments =
      employeeIds.length > 0
        ? await prisma.employment.findMany({
            where: {
              employee_id: { in: employeeIds },
              is_current: true,
              is_deleted: false,
            },
            select: {
              employee_id: true,
              location: {
                select: {
                  type: true,
                },
              },
            },
          })
        : [];

    // Create a set of employee IDs that are linked to BAZAAR locations
    const bazaarEmployeeIds = new Set(
      employments
        .filter((emp) => emp.location?.type === "BAZAAR")
        .map((emp) => emp.employee_id)
    );

    // Filter out users whose employee is linked to BAZAAR location
    const filteredUsers = users.filter(
      (user) => !user.employee?.id || !bazaarEmployeeIds.has(user.employee.id)
    );

    return filteredUsers.map((u) => ({
      id: u.id,
      email: u.email,
      employee: u.employee,
    }));
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
                    cnic: { contains: search, mode: "insensitive" },
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
  // List all leaves for Establishment role users
  listAllLeavesForEstablishment: async (req) => {
    const userId = req.session?.user?.id;
    const roleName = req.session?.user?.role?.name || "";
    if (!userId) return [];

    const isEstablishment = /^\s*establishment/i.test(roleName);
    if (!isEstablishment) return [];

    const leaves = await prisma.leave.findMany({
      where: {
        is_deleted: false,
      },
      include: {
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { designation: true, location: true },
            },
          },
        },
        backup_employee: {
          select: {
            id: true,
            full_name: true,
            cnic: true,
            email: true,
          },
        },
        routes: {
          orderBy: { sequence: "asc" },
          include: {
            approver_user: {
              select: {
                id: true,
                email: true,
                employee: { select: { full_name: true, cnic: true } },
                role: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { action_time: "asc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                employee: { select: { full_name: true, cnic: true } },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });
    return leaves;
  },
  // List approvals visible to the current user based on manual routing and stage
  listApprovalsForUser: async (req) => {
    const userId = req.session?.user?.id;
    const roleName = req.session?.user?.role?.name || "";
    if (!userId) return [];

    // Leaves not deleted and not finalized; include those with any routes
    const awaitingMe = await prisma.leave.findMany({
      where: {
        is_deleted: false,
        current_status: { notIn: ["APPROVED", "REJECTED"] },
        routes: { some: {} },
      },
      include: { routes: { orderBy: { sequence: "asc" } } },
      orderBy: { date: "desc" },
    });
    const mine = awaitingMe.filter((lv) => {
      const orderedRoutes = (lv.routes || [])
        .slice()
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      const nextSeq = (lv.current_stage || 0) + 1;
      const nextRoute =
        orderedRoutes.find((r) => (r.sequence || 0) === nextSeq) ||
        orderedRoutes[nextSeq - 1] ||
        null;
      return nextRoute && Number(nextRoute.approver_user_id) === Number(userId);
    });

    // Establishment role final approvals: when all routes completed but not finalized
    let establishmentItems = [];
    const looksEstablishment = /^\s*establishment/i.test(roleName);
    if (looksEstablishment) {
      establishmentItems = awaitingMe.filter((lv) => {
        const orderedRoutes = (lv.routes || [])
          .slice()
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        const maxSeq =
          orderedRoutes.length > 0
            ? Math.max(...orderedRoutes.map((r) => r.sequence || 0), 0)
            : 0;
        // Check if current user is in the routes and all previous routes are completed
        const userRoute = orderedRoutes.find(
          (r) => Number(r.approver_user_id) === Number(userId)
        );
        return (
          maxSeq > 0 &&
          userRoute &&
          (lv.current_stage || 0) >= userRoute.sequence - 1 &&
          lv.current_status !== "APPROVED" &&
          lv.current_status !== "REJECTED"
        );
      });
    }

    const combined = [...mine, ...establishmentItems];
    const leaveIds = Array.from(new Set(combined.map((x) => x.id)));
    if (!leaveIds.length) return [];

    const leaves = await prisma.leave.findMany({
      where: { id: { in: leaveIds } },
      include: {
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { designation: true, location: true },
            },
          },
        },
        backup_employee: {
          select: {
            id: true,
            full_name: true,
            cnic: true,
            email: true,
          },
        },
        routes: {
          orderBy: { sequence: "asc" },
          include: {
            approver_user: {
              select: {
                id: true,
                email: true,
                employee: { select: { full_name: true, cnic: true } },
                role: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { action_time: "asc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                employee: { select: { full_name: true, cnic: true } },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });
    return leaves;
  },
  // List all approvals involving the current user (appears anywhere in routing)
  listAllApprovalsForUser: async (req) => {
    const userId = req.session?.user?.id;
    if (!userId) return [];
    const leaves = await prisma.leave.findMany({
      where: {
        is_deleted: false,
        OR: [
          { routes: { some: { approver_user_id: Number(userId) } } },
          { statusHistory: { some: { user_id: Number(userId) } } },
        ],
      },
      include: {
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { designation: true, location: true },
            },
          },
        },
        backup_employee: {
          select: {
            id: true,
            full_name: true,
            cnic: true,
            email: true,
          },
        },
        routes: {
          orderBy: { sequence: "asc" },
          include: {
            approver_user: {
              select: {
                id: true,
                email: true,
                employee: { select: { full_name: true, cnic: true } },
                role: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { action_time: "asc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                employee: { select: { full_name: true, cnic: true } },
              },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });
    return leaves;
  },
  // Undo last action by current user if no subsequent actions exist
  undoLastAction: async ({ leaveId, userId }) => {
    return await prisma.$transaction(async (tx) => {
      const leave = await tx.leave.findUnique({
        where: { id: leaveId },
        include: {
          statusHistory: { orderBy: { action_time: "asc" } },
          routes: { orderBy: { sequence: "asc" } },
        },
      });
      if (!leave || leave.is_deleted) throw new Error("Not found");
      const hist = leave.statusHistory || [];
      if (!hist.length) throw new Error("Nothing to undo");
      const last = hist[hist.length - 1];
      if (Number(last.user_id) !== Number(userId))
        throw new Error("Not authorized to undo");
      // Allow undo even if finalized (including APPROVED) as long as this user authored the last action

      // Delete last history entry
      await tx.leaveStatusHistory.delete({ where: { id: last.id } });

      // Recompute workflow from remaining history
      const remaining = await tx.leaveStatusHistory.findMany({
        where: { leave_id: leaveId },
        orderBy: { action_time: "asc" },
      });
      let newStatus = "PENDING";
      let newStage = 0;
      for (const h of remaining) {
        if (h.action_type === "REJECTED") {
          newStatus = "REJECTED";
          break;
        }
        if (h.action_type === "RECOMMENDED") {
          newStatus = "RECOMMENDED";
          newStage += 1;
        }
        if (h.action_type === "ALLOWED") {
          newStatus = "ALLOWED";
          newStage += 1;
        }
        if (h.action_type === "APPROVED") {
          newStatus = "APPROVED";
        }
        if (h.action_type === "RETURNED") {
          newStatus = "RETURNED";
          newStage = 0;
        }
        if (h.action_type === "RESUBMITTED") {
          newStatus = "PENDING";
          newStage = 0;
        }
      }
      // Sync legacy status when finalized
      const updateData = { current_status: newStatus, current_stage: newStage };
      if (newStatus === "APPROVED") updateData["status"] = "APPROVED";
      if (newStatus === "REJECTED") updateData["status"] = "REJECTED";
      await tx.leave.update({ where: { id: leaveId }, data: updateData });
      // A RETURN deletes the routing; if the undo brought the leave back
      // into the live workflow with no routes, rebuild the initial routing.
      if (newStatus !== "RETURNED") {
        const routeCount = await tx.leaveApprovalRoute.count({ where: { leave_id: leaveId } });
        if (!routeCount) {
          const approvers = await module.exports.determineInitialApprover(leave.employee_id, tx);
          if (approvers?.length) {
            await tx.leaveApprovalRoute.createMany({
              data: approvers.map((a, idx) => ({
                leave_id: leaveId,
                type: a.type === "RECOMMEND" ? "RECOMMEND" : "ALLOW",
                approver_user_id: a.approver_user_id,
                sequence: idx + 1,
              })),
            });
          }
        }
      }
      return { success: true };
    });
  },
  // Perform action on a leave with history and progression
  actOnLeave: async (
    { leaveId, userId, action, comments, forwardToUserId },
    req
  ) => {
    const allowed = new Set([
      "RECOMMEND",
      "ALLOW",
      "APPROVE",
      "REJECT",
      "FORWARD",
      "RETURN",
    ]);
    const upper = String(action || "").toUpperCase();
    if (!allowed.has(upper)) throw new Error("Invalid action");

    return await prisma.$transaction(async (tx) => {
      const leave = await tx.leave.findUnique({
        where: { id: leaveId },
        include: { routes: { orderBy: { sequence: "asc" } } },
      });
      if (!leave || leave.is_deleted) throw new Error("Not found");
      if (
        leave.current_status === "APPROVED" ||
        leave.current_status === "REJECTED"
      ) {
        throw new Error("Leave already finalized");
      }

      // Get current user info for forward history / DG detection
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: { select: { name: true } } },
      });
      const currentUserEmail = currentUser?.email || `user${userId}`;

      // Determine next route strictly by ordered sequence
      const orderedRoutes = (leave.routes || [])
        .slice()
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      const nextSeq = (leave.current_stage || 0) + 1;
      const nextRoute =
        orderedRoutes.find((r) => (r.sequence || 0) === nextSeq) ||
        orderedRoutes[nextSeq - 1] ||
        null;

      // Handle FORWARD action
      if (upper === "FORWARD") {
        if (!forwardToUserId) throw new Error("Forward target user required");
        const forwardToUser = await tx.user.findUnique({
          where: { id: Number(forwardToUserId) },
          select: { id: true, email: true },
        });
        if (!forwardToUser) throw new Error("Forward target user not found");

        // Validate that current user is authorized (must be next approver)
        if (
          !nextRoute ||
          Number(nextRoute.approver_user_id) !== Number(userId)
        ) {
          throw new Error("Not authorized for this stage");
        }

        // Add new route entry for forwarded user
        // When forwarding, we replace the current route with the forwarded user
        await tx.leaveApprovalRoute.deleteMany({
          where: {
            leave_id: leaveId,
            sequence: nextSeq,
            approver_user_id: userId, // Remove current user's route
          },
        });

        await tx.leaveApprovalRoute.create({
          data: {
            leave_id: leaveId,
            type: "ALLOW",
            approver_user_id: forwardToUser.id,
            sequence: nextSeq, // Forwarded user takes over at same sequence
          },
        });

        // Create forward history entry with proper format
        const now = new Date();
        // Format as dd/mm/yyyy, hh:mm:ss am/pm (Asia/Karachi timezone)
        const utc5Time = new Date(now.getTime() + 5 * 60 * 60 * 1000); // UTC+5
        const day = String(utc5Time.getUTCDate()).padStart(2, "0");
        const month = String(utc5Time.getUTCMonth() + 1).padStart(2, "0");
        const year = utc5Time.getUTCFullYear();
        const hours = utc5Time.getUTCHours();
        const minutes = String(utc5Time.getUTCMinutes()).padStart(2, "0");
        const seconds = String(utc5Time.getUTCSeconds()).padStart(2, "0");
        const ampm = hours >= 12 ? "pm" : "am";
        const displayHours = hours % 12 || 12;
        const timestamp = `${day}/${month}/${year}, ${String(
          displayHours
        ).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
        const forwardComment = `${currentUserEmail} forwarded to ${forwardToUser.email} at ${timestamp}`;
        await tx.leaveStatusHistory.create({
          data: {
            leave_id: leaveId,
            user_id: userId,
            action_type: "FORWARDED",
            comments: forwardComment,
          },
        });

        // Keep current stage - forwarded user will handle at nextSeq
        const updated = await tx.leave.update({
          where: { id: leaveId },
          data: {
            // Stage remains the same - forwarded user is at nextSeq
          },
        });
        return updated;
      }

      // Handle RETURN (for correction) — the current approver (or a
      // leaves.status holder) sends the application back to the submitter,
      // who edits and resubmits it (PUT /leaves/:id rebuilds the routing).
      if (upper === "RETURN") {
        const sessUser = req?.session?.user;
        const perms = sessUser?.permissions || [];
        const isPrivileged =
          perms.includes("*") ||
          perms.includes("leaves.status") ||
          sessUser?.role?.name === "Super Admin";
        const isNextApprover =
          nextRoute && Number(nextRoute.approver_user_id) === Number(userId);
        if (!isPrivileged && !isNextApprover) {
          throw new Error("Not authorized for this stage");
        }
        await tx.leaveApprovalRoute.deleteMany({ where: { leave_id: leaveId } });
        await tx.leaveStatusHistory.create({
          data: {
            leave_id: leaveId,
            user_id: userId,
            action_type: "RETURNED",
            comments: comments || null,
          },
        });
        return tx.leave.update({
          where: { id: leaveId },
          data: { current_status: "RETURNED", current_stage: 0 },
        });
      }

      // Validate actor.
      // RECOMMEND/ALLOW: must be exactly the next routed approver.
      // APPROVE/REJECT: must hold leaves.status (Establishment/Admin) or be
      // one of the remaining routed approvers — merely being able to view or
      // apply for leaves must not allow finalizing one.
      if (upper !== "APPROVE" && upper !== "REJECT") {
        if (
          !nextRoute ||
          Number(nextRoute.approver_user_id) !== Number(userId)
        ) {
          throw new Error("Not authorized for this stage");
        }
      } else {
        const sessUser = req?.session?.user;
        const perms = sessUser?.permissions || [];
        const isPrivileged =
          perms.includes("*") ||
          perms.includes("leaves.status") ||
          sessUser?.role?.name === "Super Admin";
        const isRoutedApprover = orderedRoutes.some(
          (r) =>
            (r.sequence || 0) >= nextSeq &&
            Number(r.approver_user_id) === Number(userId)
        );
        if (!isPrivileged && !isRoutedApprover) {
          throw new Error("Not authorized for this stage");
        }
      }

      // Map to workflow status and history action
      let historyAction = null;
      let newWorkflow = leave.current_status;
      let newStage = leave.current_stage || 0;

      if (upper === "REJECT") {
        historyAction = "REJECTED";
        newWorkflow = "REJECTED";
      } else if (upper === "RECOMMEND") {
        historyAction = "RECOMMENDED";
        newWorkflow = "RECOMMENDED";
        newStage = nextSeq;
      } else if (upper === "ALLOW") {
        historyAction = "ALLOWED";
        newWorkflow = "ALLOWED";
        newStage = nextSeq;

        // After ALLOW the leave moves on. Next stage is the Director
        // General IF a dynamic DG rule matches (SystemSetting
        // leave_dg_rules) and the DG has not already allowed it;
        // otherwise the Establishment (HR) role for final processing.
        const actorIsDg = currentUser?.role?.name === "Director General";
        let nextUsers = [];
        if (!actorIsDg && (await dgStageRequired(leave, tx))) {
          const dgAlreadyActed = await tx.leaveStatusHistory.findFirst({
            where: {
              leave_id: leaveId,
              action_type: "ALLOWED",
              user: { role: { name: "Director General" } },
            },
          });
          if (!dgAlreadyActed) {
            nextUsers = await tx.user.findMany({
              where: { is_deleted: false, role: { name: "Director General" } },
              select: { id: true },
            });
          }
        }
        if (!nextUsers.length) {
          nextUsers = await tx.user.findMany({
            where: { is_deleted: false, role: { name: "Establishment" } },
            select: { id: true },
          });
        }

        if (nextUsers.length > 0) {
          // Remove existing routes after current stage (nextSeq)
          await tx.leaveApprovalRoute.deleteMany({
            where: {
              leave_id: leaveId,
              sequence: { gt: nextSeq },
            },
          });

          const nextRoutes = nextUsers.map((user, idx) => ({
            leave_id: leaveId,
            type: "ALLOW",
            approver_user_id: user.id,
            sequence: nextSeq + 1 + idx,
          }));
          await tx.leaveApprovalRoute.createMany({ data: nextRoutes });
        }
      } else if (upper === "APPROVE") {
        historyAction = "APPROVED";
        newWorkflow = "APPROVED";
      }

      // Create history
      await tx.leaveStatusHistory.create({
        data: {
          leave_id: leave.id,
          user_id: userId,
          action_type: historyAction,
          comments: comments || null,
        },
      });

      // Update leave
      const updateData = {
        current_status: newWorkflow,
        current_stage: newStage,
      };
      // Keep legacy status in sync on final approve/reject
      if (newWorkflow === "APPROVED") updateData["status"] = "APPROVED";
      if (newWorkflow === "REJECTED") updateData["status"] = "REJECTED";

      const updated = await tx.leave.update({
        where: { id: leave.id },
        data: updateData,
      });
      return updated;
    });
  },
  // ---- Workflow administration -------------------------------------
  listRegionalAssignments: async () => {
    const users = await prisma.user.findMany({
      where: { is_deleted: false, role: { name: "Regional Incharge", is_deleted: false } },
      select: {
        id: true,
        email: true,
        employee: { select: { full_name: true } },
        regionalAssignments: { select: { location: { select: { id: true, name: true, type: true } } } },
      },
      orderBy: { email: "asc" },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.employee?.full_name || null,
      locations: u.regionalAssignments.map((a) => a.location),
    }));
  },
  setRegionalAssignments: async (userId, locationIds) => {
    const user = await prisma.user.findFirst({
      where: { id: Number(userId), is_deleted: false },
      include: { role: true },
    });
    if (!user) throw new Error("User not found");
    if (user.role?.name !== "Regional Incharge") throw new Error("User is not a Regional Incharge");
    const ids = [...new Set((locationIds || []).map(Number).filter(Boolean))];
    await prisma.$transaction([
      prisma.regionalAssignment.deleteMany({ where: { user_id: user.id } }),
      ...(ids.length
        ? [prisma.regionalAssignment.createMany({ data: ids.map((l) => ({ user_id: user.id, location_id: l })) })]
        : []),
    ]);
    return { count: ids.length };
  },
  getDgRulesSetting: () => getDgRules(),
  saveDgRulesSetting: async (value, userId) => {
    const v = {
      enabled: !!value?.enabled,
      rules: Array.isArray(value?.rules)
        ? value.rules.map((r) => ({
            leave_types: Array.isArray(r.leave_types) ? r.leave_types.map(String) : [],
            min_days: r.min_days != null && r.min_days !== "" ? Number(r.min_days) : null,
            without_pay: r.without_pay == null ? null : !!r.without_pay,
          }))
        : [],
    };
    await prisma.systemSetting.upsert({
      where: { key: DG_RULES_KEY },
      update: { value: v, updatedBy: userId || null },
      create: { key: DG_RULES_KEY, category: "leaves", value: v, updatedBy: userId || null },
    });
    return v;
  },
  updateLeave: (id, data) => prisma.leave.update({ where: { id }, data }),
  // Resubmit a RETURNED leave: apply the edits, reset the workflow and
  // rebuild the initial routing so it re-enters the approval flow.
  resubmitLeave: async (id, data, userId) => {
    return await prisma.$transaction(async (tx) => {
      const leave = await tx.leave.findUnique({ where: { id } });
      if (!leave || leave.is_deleted) throw new Error("Not found");
      if (leave.current_status !== "RETURNED") {
        throw new Error("Only a returned leave can be resubmitted");
      }
      const updated = await tx.leave.update({
        where: { id },
        data: { ...data, current_status: "PENDING", current_stage: 0, status: "PENDING" },
      });
      await tx.leaveApprovalRoute.deleteMany({ where: { leave_id: id } });
      const approvers = await module.exports.determineInitialApprover(updated.employee_id, tx);
      if (approvers?.length) {
        await tx.leaveApprovalRoute.createMany({
          data: approvers.map((a, idx) => ({
            leave_id: id,
            type: a.type === "RECOMMEND" ? "RECOMMEND" : "ALLOW",
            approver_user_id: a.approver_user_id,
            sequence: idx + 1,
          })),
        });
      }
      await tx.leaveStatusHistory.create({
        data: { leave_id: id, user_id: userId || 0, action_type: "RESUBMITTED", comments: null },
      });
      return updated;
    });
  },
  updateStatus: async (id, status, userId) => {
    const allowed = ["PENDING", "APPROVED", "REJECTED"];
    if (!allowed.includes(String(status))) {
      throw new Error("Invalid status");
    }

    return await prisma.$transaction(async (tx) => {
      // Create status history entry
      await tx.leaveStatusHistory.create({
        data: {
          leave_id: id,
          user_id: userId || 0,
          action_type: status,
          comments: null,
        },
      });

      // Update both legacy and new workflow fields
      const updateData = { status };
      if (status === "APPROVED") {
        updateData.current_status = "APPROVED";
        updateData.current_stage = 999; // High number to indicate final approval
      } else if (status === "REJECTED") {
        updateData.current_status = "REJECTED";
        updateData.current_stage = 0;
      } else if (status === "PENDING") {
        updateData.current_status = "PENDING";
        updateData.current_stage = 0;
      }

      return await tx.leave.update({ where: { id }, data: updateData });
    });
  },
  softDeleteFull: (id) =>
    prisma.leave.update({ where: { id }, data: { is_deleted: true } }),
  getLeaveById: (id) => prisma.leave.findUnique({ where: { id } }),
  markDeletedConditional: async (leave) =>
    prisma.leave.update({
      where: { id: leave.id },
      data: { is_deleted: true },
    }),
  checkSubordinate: isSubordinateOfLoggedIn,
  checkDeptOrLocation: async (employeeId, req) => {
    try {
      const deptId = Number(req.session?.user?.department_id || 0);
      const locId = Number(req.session?.user?.location_id || 0);
      if (!deptId && !locId) return false;
      const emp = await prisma.employment.findFirst({
        where: {
          is_current: true,
          is_deleted: false,
          employee_id: Number(employeeId),
          OR: [
            deptId ? { department_id: deptId } : undefined,
            locId ? { location_id: locId } : undefined,
          ].filter(Boolean),
        },
        select: { id: true },
      });
      return !!emp;
    } catch (_) {
      return false;
    }
  },
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
          cnic: emp.cnic || null,
          email: emp.email,
        }));
    } catch (error) {
      console.error("Error getting backup employees:", error);
      return [];
    }
  },
};
