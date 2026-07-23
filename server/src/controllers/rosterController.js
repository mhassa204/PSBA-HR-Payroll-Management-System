const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { resolveRosterApprover } = require("../services/rosterApprovalService");
const { toDateOnly, formatYMD } = require("../services/rosterScheduleService");

// Duty roster module.
//
// Creation:
//   LOCATION scope    — the location's own account (User.location_id -> any
//                       active non-HEAD_OFFICE location). MONTHLY only; the
//                       period is derived server-side from a cycle month
//                       (21st of previous month -> 20th of the cycle month).
//   HQ_DEPARTMENT     — the department's account (User.department_id).
//                       MONTHLY (cycle default or custom range) or PERMANENT
//                       (valid_from only, open-ended).
// Approval:
//   LOCATION          — any active Operations-role user.
//   HQ_DEPARTMENT     — Head of Department when set (per-department override,
//                       self-approval escalates one level); otherwise the
//                       reporting officer of the department's main reporting
//                       officer (default, unchanged).
// Approved rosters are immutable for everyone; corrections are made by
// creating a new roster which supersedes (latest approval wins per date —
// see rosterScheduleService).

const HEAD_OFFICE = "HEAD_OFFICE";

function hasPerm(user, key) {
  if (user?.role?.name === "Super Admin") return true;
  const perms = user?.permissions || [];
  return perms.includes("*") || perms.includes(key);
}

// month 'YYYY-MM' names the cycle END month: 2026-07 => 21 Jun - 20 Jul 2026
// (same convention as attendance locationLSR)
function cycleRangeFromMonth(monthParam) {
  if (!/^\d{4}-\d{2}$/.test(String(monthParam || ""))) return null;
  const y = parseInt(monthParam.slice(0, 4), 10);
  const m0 = parseInt(monthParam.slice(5, 7), 10) - 1;
  const startMonth0 = m0 === 0 ? 11 : m0 - 1;
  const startYear = m0 === 0 ? y - 1 : y;
  const start = new Date(Date.UTC(startYear, startMonth0, 21));
  const end = new Date(Date.UTC(y, m0, 20));
  const label = `${end.toLocaleString("en-US", { month: "long", timeZone: "UTC" })} ${end.getUTCFullYear()}`;
  return { start, end, label };
}

function defaultCycleMonth(today = new Date()) {
  let y = today.getUTCFullYear();
  let m0 = today.getUTCMonth();
  if (today.getUTCDate() >= 21) m0 += 1;
  if (m0 > 11) {
    m0 = 0;
    y += 1;
  }
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

// Resolve what the logged-in account is allowed to create rosters for
async function resolveCreatorScope(user) {
  if (user.location_id) {
    const location = await prisma.location.findFirst({
      where: { id: user.location_id, is_deleted: false, is_active: true },
      select: { id: true, name: true, type: true },
    });
    if (location && location.type !== HEAD_OFFICE) {
      return { scope: "LOCATION", location };
    }
  }
  if (user.department_id) {
    const department = await prisma.department.findFirst({
      where: { id: user.department_id, is_deleted: false },
      select: { id: true, name: true },
    });
    if (department) return { scope: "HQ_DEPARTMENT", department };
  }
  return null;
}

async function eligibleEmployeesFor(scopeInfo) {
  const where = {
    is_current: true,
    is_deleted: false,
    employee: { is_deleted: false, status: "Active" },
  };
  if (scopeInfo.scope === "LOCATION") where.location_id = scopeInfo.location.id;
  else where.department_id = scopeInfo.department.id;

  const employments = await prisma.employment.findMany({
    where,
    include: { employee: true, designation: true, role_tag: true },
    orderBy: { employee: { full_name: "asc" } },
  });
  return employments.map((r) => ({
    id: r.employee.id,
    full_name: r.employee.full_name,
    designation: r.designation?.title || null,
    cnic: r.employee.cnic || null,
    mobile_number: r.employee.mobile_number || null,
    role_tag_id: r.role_tag?.id || null,
    role_tag_name: r.role_tag?.name || "Unassigned",
  }));
}

// Validate + normalize the requested period for a new/updated roster
function resolvePeriod(scope, body) {
  const rosterType =
    scope === "LOCATION" ? "MONTHLY" : body.roster_type === "PERMANENT" ? "PERMANENT" : "MONTHLY";

  if (rosterType === "PERMANENT") {
    if (!body.valid_from) return { error: "valid_from is required for a permanent roster" };
    return { roster_type: "PERMANENT", valid_from: toDateOnly(body.valid_from), valid_to: null };
  }

  // MONTHLY: cycle month, or (HQ only) a custom range
  const cycle = cycleRangeFromMonth(body.month);
  if (cycle) return { roster_type: "MONTHLY", valid_from: cycle.start, valid_to: cycle.end };

  if (scope === "HQ_DEPARTMENT" && body.valid_from && body.valid_to) {
    const from = toDateOnly(body.valid_from);
    const to = toDateOnly(body.valid_to);
    if (from > to) return { error: "valid_from must be on or before valid_to" };
    return { roster_type: "MONTHLY", valid_from: from, valid_to: to };
  }

  return {
    error:
      scope === "LOCATION"
        ? "month (YYYY-MM cycle month) is required"
        : "Provide month (YYYY-MM) or a custom valid_from/valid_to range",
  };
}

// Normalize + validate entries against the eligible employee set
function normalizeEntries(entries, eligibleIds) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) return { error: "At least one employee entry is required" };
  const seen = new Set();
  const normalized = [];
  for (const e of list) {
    const employeeId = Number(e.employee_id);
    if (!employeeId || !eligibleIds.has(employeeId)) {
      return { error: `Employee ${e.employee_id} is not part of your location/department` };
    }
    if (seen.has(employeeId)) continue;
    seen.add(employeeId);
    normalized.push({
      employee_id: employeeId,
      day_schedules: e.day_schedules || {},
      remarks: e.remarks || null,
    });
  }
  return { entries: normalized };
}

// ---- Visibility -------------------------------------------------------

function buildListWhere(user) {
  const base = { is_deleted: false };
  if (hasPerm(user, "roster.read.all")) return base;
  const or = [{ created_by_user_id: user.id }, { approver_user_id: user.id }];
  if (user.location_id) or.push({ scope: "LOCATION", bazaar_id: user.location_id });
  if (user.department_id) or.push({ scope: "HQ_DEPARTMENT", department_id: user.department_id });
  if (user.role?.name === "Operations") or.push({ scope: "LOCATION" });
  return { ...base, OR: or };
}

function canViewRoster(user, roster) {
  if (hasPerm(user, "roster.read.all")) return true;
  if (roster.created_by_user_id === user.id) return true;
  if (roster.approver_user_id === user.id) return true;
  if (user.location_id && roster.scope === "LOCATION" && roster.bazaar_id === user.location_id) return true;
  if (
    user.department_id &&
    roster.scope === "HQ_DEPARTMENT" &&
    roster.department_id === user.department_id
  )
    return true;
  if (user.role?.name === "Operations" && roster.scope === "LOCATION") return true;
  return false;
}

function canActOnApproval(user, roster) {
  if (roster.is_deleted || roster.status !== "PENDING") return false;
  if (user?.role?.name === "Super Admin") return true; // break-glass
  if (roster.scope === "HQ_DEPARTMENT") return roster.approver_user_id === user.id;
  return user?.role?.name === "Operations";
}

const listInclude = {
  location: { select: { id: true, name: true, type: true } },
  department: { select: { id: true, name: true } },
  createdBy: { select: { id: true, email: true } },
  approver: { select: { id: true, email: true, employee: { select: { full_name: true } } } },
  approvedBy: { select: { id: true, email: true, employee: { select: { full_name: true } } } },
  rejectedBy: { select: { id: true, email: true, employee: { select: { full_name: true } } } },
  _count: { select: { entries: true } },
};

const rosterController = {
  // GET /rosters — scoped list
  async list(req, res) {
    try {
      const user = req.session.user;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      const where = buildListWhere(user);
      if (req.query.status && ["PENDING", "APPROVED", "REJECTED"].includes(req.query.status)) {
        where.status = req.query.status;
      }
      if (req.query.scope && ["LOCATION", "HQ_DEPARTMENT"].includes(req.query.scope)) {
        where.scope = req.query.scope;
      }

      const [total, rosters] = await Promise.all([
        prisma.dutyRoster.count({ where }),
        prisma.dutyRoster.findMany({
          where,
          include: listInclude,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
      ]);

      res.json({ success: true, page, limit, total, rosters });
    } catch (e) {
      console.error("Error listing rosters", e);
      res.status(500).json({ success: false, error: "Failed to list rosters" });
    }
  },

  // GET /rosters/:id
  async getById(req, res) {
    try {
      const user = req.session.user;
      const id = parseInt(req.params.id);
      const roster = await prisma.dutyRoster.findUnique({
        where: { id },
        include: {
          ...listInclude,
          entries: {
            include: {
              employee: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                    include: { designation: true, role_tag: true },
                  },
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { id: true, email: true, employee: { select: { full_name: true } } } },
            },
          },
        },
      });
      if (!roster || roster.is_deleted || !canViewRoster(user, roster)) {
        return res.status(404).json({ success: false, error: "Roster not found" });
      }
      res.json({ success: true, roster });
    } catch (e) {
      console.error("Error fetching roster", e);
      res.status(500).json({ success: false, error: "Failed to fetch roster" });
    }
  },

  // GET /rosters/helpers/context — everything the create page needs
  async context(req, res) {
    try {
      const user = req.session.user;
      const scopeInfo = await resolveCreatorScope(user);
      if (!scopeInfo) {
        return res.status(403).json({
          success: false,
          error:
            "Only a location account or an HQ department account can create rosters.",
        });
      }

      const month = defaultCycleMonth();
      const cycle = cycleRangeFromMonth(month);

      const [employees, approval, lastRoster] = await Promise.all([
        eligibleEmployeesFor(scopeInfo),
        resolveRosterApprover({
          scope: scopeInfo.scope,
          department_id: scopeInfo.department?.id,
          created_by_user_id: user.id,
        }),
        prisma.dutyRoster.findFirst({
          where: { is_deleted: false, created_by_user_id: user.id },
          orderBy: { createdAt: "desc" },
          include: { entries: true },
        }),
      ]);

      res.json({
        success: true,
        scope: scopeInfo.scope,
        location: scopeInfo.location || null,
        department: scopeInfo.department || null,
        roster_types: scopeInfo.scope === "LOCATION" ? ["MONTHLY"] : ["MONTHLY", "PERMANENT"],
        cycle: cycle
          ? { month, start: formatYMD(cycle.start), end: formatYMD(cycle.end), label: cycle.label }
          : null,
        approver: approval.ok
          ? {
              mode: approval.mode,
              email: approval.approver_email || null,
              name: approval.approver_name || null,
              role: approval.role || null,
            }
          : { error: approval.reason },
        employees,
        lastRoster,
      });
    } catch (e) {
      console.error("Error building roster context", e);
      res.status(500).json({ success: false, error: "Failed to load roster context" });
    }
  },

  // POST /rosters — create + submit for approval
  async create(req, res) {
    try {
      const user = req.session.user;
      const scopeInfo = await resolveCreatorScope(user);
      if (!scopeInfo) {
        return res.status(403).json({
          success: false,
          error:
            "Only a location account or an HQ department account can create rosters.",
        });
      }

      const period = resolvePeriod(scopeInfo.scope, req.body || {});
      if (period.error) return res.status(400).json({ success: false, error: period.error });

      const eligible = await eligibleEmployeesFor(scopeInfo);
      const eligibleIds = new Set(eligible.map((e) => e.id));
      const normalized = normalizeEntries(req.body?.entries, eligibleIds);
      if (normalized.error)
        return res.status(400).json({ success: false, error: normalized.error });

      const approval = await resolveRosterApprover({
        scope: scopeInfo.scope,
        department_id: scopeInfo.department?.id,
        created_by_user_id: user.id,
      });
      if (!approval.ok) {
        return res.status(422).json({ success: false, error: approval.reason });
      }
      const approverUserId = approval.mode === "USER" ? approval.approver_user_id : null;
      if (approverUserId && approverUserId === user.id) {
        return res.status(422).json({
          success: false,
          error: "Roster cannot be routed to its own creator for approval.",
        });
      }

      const now = new Date();
      const created = await prisma.dutyRoster.create({
        data: {
          title: req.body?.title || null,
          scope: scopeInfo.scope,
          roster_type: period.roster_type,
          bazaar_id: scopeInfo.scope === "LOCATION" ? scopeInfo.location.id : null,
          department_id: scopeInfo.scope === "HQ_DEPARTMENT" ? scopeInfo.department.id : null,
          valid_from: period.valid_from,
          valid_to: period.valid_to,
          created_by_user_id: user.id,
          approver_user_id: approverUserId,
          submitted_at: now,
          status: "PENDING",
          entries: { create: normalized.entries },
          statusHistory: { create: { action: "SUBMITTED", user_id: user.id } },
        },
        include: listInclude,
      });

      res.status(201).json({ success: true, roster: created });
    } catch (e) {
      console.error("Error creating roster", e);
      res.status(500).json({ success: false, error: "Failed to create roster" });
    }
  },

  // PUT /rosters/:id — creator edits own PENDING/REJECTED roster (resubmits)
  async update(req, res) {
    try {
      const user = req.session.user;
      const id = Number(req.params.id);
      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster || roster.is_deleted) {
        return res.status(404).json({ success: false, error: "Roster not found" });
      }
      if (roster.status === "APPROVED") {
        return res.status(409).json({
          success: false,
          error:
            "Approved rosters cannot be edited. Create a new roster for the same period to supersede it.",
        });
      }
      if (roster.created_by_user_id !== user.id) {
        return res
          .status(403)
          .json({ success: false, error: "Only the creator can edit this roster" });
      }

      const scopeInfo = await resolveCreatorScope(user);
      if (!scopeInfo || scopeInfo.scope !== roster.scope) {
        return res
          .status(403)
          .json({ success: false, error: "Your account can no longer edit this roster" });
      }

      const period = resolvePeriod(scopeInfo.scope, req.body || {});
      if (period.error) return res.status(400).json({ success: false, error: period.error });

      const eligible = await eligibleEmployeesFor(scopeInfo);
      const eligibleIds = new Set(eligible.map((e) => e.id));
      const normalized = normalizeEntries(req.body?.entries, eligibleIds);
      if (normalized.error)
        return res.status(400).json({ success: false, error: normalized.error });

      const approval = await resolveRosterApprover({
        scope: scopeInfo.scope,
        department_id: scopeInfo.department?.id,
        created_by_user_id: user.id,
      });
      if (!approval.ok) {
        return res.status(422).json({ success: false, error: approval.reason });
      }
      const approverUserId = approval.mode === "USER" ? approval.approver_user_id : null;

      const wasRejected = roster.status === "REJECTED";
      const updated = await prisma.$transaction(async (tx) => {
        await tx.dutyRosterEntry.deleteMany({ where: { roster_id: id } });
        return tx.dutyRoster.update({
          where: { id },
          data: {
            title: req.body?.title !== undefined ? req.body.title || null : roster.title,
            roster_type: period.roster_type,
            valid_from: period.valid_from,
            valid_to: period.valid_to,
            approver_user_id: approverUserId,
            status: "PENDING",
            submitted_at: new Date(),
            entries: { create: normalized.entries },
            ...(wasRejected
              ? { statusHistory: { create: { action: "RESUBMITTED", user_id: user.id } } }
              : {}),
          },
          include: listInclude,
        });
      });

      res.json({ success: true, roster: updated });
    } catch (e) {
      console.error("Error updating roster", e);
      res.status(500).json({ success: false, error: "Failed to update roster" });
    }
  },

  // DELETE /rosters/:id — creator deletes own non-approved roster
  async remove(req, res) {
    try {
      const user = req.session.user;
      const id = Number(req.params.id);
      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster || roster.is_deleted) {
        return res.status(404).json({ success: false, error: "Roster not found" });
      }
      if (roster.status === "APPROVED") {
        return res.status(409).json({
          success: false,
          error:
            "Approved rosters cannot be deleted. Create a new roster for the same period to supersede it.",
        });
      }
      const isSuperAdmin = user?.role?.name === "Super Admin";
      if (roster.created_by_user_id !== user.id && !isSuperAdmin) {
        return res
          .status(403)
          .json({ success: false, error: "Only the creator can delete this roster" });
      }

      await prisma.dutyRoster.update({ where: { id }, data: { is_deleted: true } });
      res.json({ success: true, message: "Roster deleted" });
    } catch (e) {
      console.error("Error deleting roster", e);
      res.status(500).json({ success: false, error: "Failed to delete roster" });
    }
  },

  // GET /rosters/pending-approvals — the logged-in approver's queue
  async pendingApprovals(req, res) {
    try {
      const user = req.session.user;
      const or = [{ approver_user_id: user.id }];
      if (user.role?.name === "Operations") or.push({ scope: "LOCATION" });
      const where =
        user.role?.name === "Super Admin"
          ? { is_deleted: false, status: "PENDING" }
          : { is_deleted: false, status: "PENDING", OR: or };

      const rosters = await prisma.dutyRoster.findMany({
        where,
        include: listInclude,
        orderBy: { submitted_at: "asc" },
      });
      res.json({ success: true, count: rosters.length, rosters });
    } catch (e) {
      console.error("Error listing pending approvals", e);
      res.status(500).json({ success: false, error: "Failed to list pending approvals" });
    }
  },

  // POST /rosters/:id/approve
  async approve(req, res) {
    try {
      const user = req.session.user;
      const id = Number(req.params.id);
      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster || roster.is_deleted) {
        return res.status(404).json({ success: false, error: "Roster not found" });
      }
      if (roster.status !== "PENDING") {
        return res
          .status(409)
          .json({ success: false, error: `Roster is already ${roster.status}` });
      }
      if (!canActOnApproval(user, roster)) {
        return res
          .status(403)
          .json({ success: false, error: "You are not the assigned approver for this roster" });
      }

      const updated = await prisma.dutyRoster.update({
        where: { id },
        data: {
          status: "APPROVED",
          approved_by_user_id: user.id,
          approved_at: new Date(),
          statusHistory: { create: { action: "APPROVED", user_id: user.id } },
        },
        include: listInclude,
      });
      res.json({ success: true, roster: updated });

      // Fire-and-forget: push the newly-approved schedule to the attendance
      // system so the dashboard reflects it without waiting for the next cron.
      try {
        const { pushRosters, CONFIG } = require("../jobs/attendanceSync");
        if (CONFIG.enabled) {
          pushRosters({ force: true }).catch((e) =>
            console.warn("roster approve: attendance push failed (cron will retry):", e.message)
          );
        }
      } catch (e) {
        console.warn("roster approve: attendance push unavailable:", e.message);
      }
    } catch (e) {
      console.error("Error approving roster", e);
      res.status(500).json({ success: false, error: "Failed to approve roster" });
    }
  },

  // POST /rosters/:id/reject — reason required
  async reject(req, res) {
    try {
      const user = req.session.user;
      const id = Number(req.params.id);
      const reason = String(req.body?.reason || "").trim();
      if (!reason) {
        return res
          .status(400)
          .json({ success: false, error: "A rejection reason is required" });
      }

      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster || roster.is_deleted) {
        return res.status(404).json({ success: false, error: "Roster not found" });
      }
      if (roster.status !== "PENDING") {
        return res
          .status(409)
          .json({ success: false, error: `Roster is already ${roster.status}` });
      }
      if (!canActOnApproval(user, roster)) {
        return res
          .status(403)
          .json({ success: false, error: "You are not the assigned approver for this roster" });
      }

      const updated = await prisma.dutyRoster.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejected_by_user_id: user.id,
          rejected_at: new Date(),
          rejection_reason: reason,
          statusHistory: { create: { action: "REJECTED", user_id: user.id, reason } },
        },
        include: listInclude,
      });
      res.json({ success: true, roster: updated });
    } catch (e) {
      console.error("Error rejecting roster", e);
      res.status(500).json({ success: false, error: "Failed to reject roster" });
    }
  },
};

module.exports = rosterController;
