const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Approval routing for duty rosters.
//
// LOCATION scope (bazaars / mobile bazaars / special units): any active user
// with the "Operations" role approves — same convention as
// leaveService.determineInitialApprover. approver_user_id stays NULL so a
// replaced operations account never orphans pending rosters.
//
// HQ_DEPARTMENT scope: the approver is the department's main reporting
// officer HIMSELF — the boss the department's employees actually report to
// (e.g. Operations staff report to Sadam Hussain -> Sadam approves).
// Rosters are submitted by the department's service account, so this is not
// self-approval; if the roster IS being submitted by the main RO's own user
// account, approval escalates one level to the main RO's reporting officer.
// Main RO = the officer most of the department's current employees report to
// (Employment.reporting_officer_id holds the RO's Employee.id as a string).
// If the main RO has no user account the reporting chain is climbed until a
// live account is found. Fallback when reporting lines are missing:
// Department.head_employee_id.
// Unresolvable -> { ok:false, reason } and submission must be blocked.

function parseRoId(value) {
  const s = String(value == null ? "" : value).trim();
  return /^\d+$/.test(s) ? parseInt(s, 10) : null;
}

async function currentEmploymentOf(employeeId, tx) {
  return tx.employment.findFirst({
    where: { employee_id: Number(employeeId), is_current: true, is_deleted: false },
    select: { employee_id: true, reporting_officer_id: true },
  });
}

async function liveUserForEmployee(employeeId, tx) {
  return tx.user.findFirst({
    where: {
      employee_id: Number(employeeId),
      is_deleted: false,
      role: { is: { is_deleted: false, enabled: true } },
    },
    select: { id: true, email: true, employee: { select: { full_name: true } } },
  });
}

async function employeeName(employeeId, tx) {
  const emp = await tx.employee.findFirst({
    where: { id: Number(employeeId) },
    select: { full_name: true },
  });
  return emp?.full_name || `employee #${employeeId}`;
}

/**
 * Most frequent reporting officer among the department's current active
 * employees. Ties: department head first, then the tied candidate who is the
 * RO of another tied candidate (more senior), then lowest employee id.
 */
async function findMainReportingOfficer(departmentId, tx = prisma) {
  const [voters, dept] = await Promise.all([
    tx.employment.findMany({
      where: {
        department_id: Number(departmentId),
        is_current: true,
        is_deleted: false,
        employee: { is_deleted: false, status: "Active" },
      },
      select: { employee_id: true, reporting_officer_id: true },
    }),
    tx.department.findUnique({
      where: { id: Number(departmentId) },
      select: { head_employee_id: true },
    }),
  ]);

  const votes = new Map(); // roEmployeeId -> count
  const roOf = new Map(); // voter employee_id -> roEmployeeId
  for (const v of voters) {
    const roId = parseRoId(v.reporting_officer_id);
    if (!roId || roId === v.employee_id) continue; // blank or self-reporting
    roOf.set(v.employee_id, roId);
    votes.set(roId, (votes.get(roId) || 0) + 1);
  }
  if (!votes.size) return null;

  // Discard ROs whose employee record is deleted
  const roIds = [...votes.keys()];
  const liveRos = await tx.employee.findMany({
    where: { id: { in: roIds }, is_deleted: false },
    select: { id: true },
  });
  const liveSet = new Set(liveRos.map((e) => e.id));
  for (const id of roIds) if (!liveSet.has(id)) votes.delete(id);
  if (!votes.size) return null;

  const max = Math.max(...votes.values());
  const tied = [...votes.entries()].filter(([, c]) => c === max).map(([id]) => id);
  if (tied.length === 1) return tied[0];
  if (dept?.head_employee_id && tied.includes(dept.head_employee_id)) {
    return dept.head_employee_id;
  }
  // Prefer the tied candidate who is themselves the RO of another tied candidate
  const senior = tied.find((id) => tied.some((other) => other !== id && roOf.get(other) === id));
  return senior ?? Math.min(...tied);
}

/**
 * Find a live user account starting from an employee, hopping up the
 * reporting chain when the employee has no account. Cycle-guarded.
 */
async function findApproverUserViaChain(startEmployeeId, tx = prisma, maxHops = 3) {
  const visited = new Set();
  let currentId = Number(startEmployeeId);
  for (let hop = 0; hop <= maxHops && currentId && !visited.has(currentId); hop++) {
    visited.add(currentId);
    const user = await liveUserForEmployee(currentId, tx);
    if (user) return { user, employeeId: currentId, hops: hop };
    const emp = await currentEmploymentOf(currentId, tx);
    const nextId = parseRoId(emp?.reporting_officer_id);
    currentId = nextId && nextId !== currentId ? nextId : null;
  }
  return null;
}

/**
 * Resolve the approver for a roster being submitted.
 * roster: { scope, department_id?, created_by_user_id? }
 * created_by_user_id (when provided) triggers the self-approval escalation.
 */
async function resolveRosterApprover(roster, tx = prisma) {
  if (roster.scope !== "HQ_DEPARTMENT") {
    const operationsUser = await tx.user.findFirst({
      where: {
        is_deleted: false,
        role: { is: { name: "Operations", is_deleted: false, enabled: true } },
      },
      select: { id: true, email: true },
    });
    if (!operationsUser) {
      return {
        ok: false,
        reason: "Cannot route roster for approval: no active Operations user exists.",
      };
    }
    return { ok: true, mode: "ROLE", role: "Operations" };
  }

  const departmentId = roster.department_id;
  if (!departmentId) {
    return { ok: false, reason: "Cannot route roster for approval: department missing." };
  }
  const dept = await tx.department.findUnique({
    where: { id: Number(departmentId) },
    select: { id: true, name: true, head_employee_id: true },
  });
  if (!dept) {
    return { ok: false, reason: "Cannot route roster for approval: department not found." };
  }

  // Attempt 1: reporting lines. Attempt 2: department head as main RO.
  const attempts = [];
  const mainRoFromLines = await findMainReportingOfficer(dept.id, tx);
  if (mainRoFromLines) attempts.push({ mainRo: mainRoFromLines, via: "reporting-lines" });
  if (dept.head_employee_id && dept.head_employee_id !== mainRoFromLines) {
    attempts.push({ mainRo: dept.head_employee_id, via: "department-head" });
  }

  if (!attempts.length) {
    return {
      ok: false,
      reason:
        `Cannot route roster for approval: no reporting lines found for ${dept.name} ` +
        `and no Head of Department is set. Ask HR to set reporting officers or a department head.`,
    };
  }

  let lastGap = null;
  for (const attempt of attempts) {
    // The department's own boss (main RO) approves; the department service
    // account submits the roster, so this is not self-approval. When the
    // main RO has no user account the chain is climbed to the next boss up.
    let found = await findApproverUserViaChain(attempt.mainRo, tx);
    if (!found) {
      lastGap = `${await employeeName(attempt.mainRo, tx)} has no user account (nor anyone up their reporting chain)`;
    }
    // If the roster is being submitted by the resolved approver's own user
    // account, escalate one level so nobody approves their own roster.
    if (found && roster.created_by_user_id && found.user.id === roster.created_by_user_id) {
      const selfEmp = await currentEmploymentOf(found.employeeId, tx);
      const upId = parseRoId(selfEmp?.reporting_officer_id);
      const selfName = await employeeName(found.employeeId, tx);
      found = upId && upId !== found.employeeId ? await findApproverUserViaChain(upId, tx) : null;
      if (!found) {
        lastGap = `${selfName} cannot approve their own roster and has no reporting officer with a user account`;
      }
    }
    if (found) {
      return {
        ok: true,
        mode: "USER",
        approver_user_id: found.user.id,
        approver_email: found.user.email,
        approver_name: found.user.employee?.full_name || null,
        trail: { mainRoEmployeeId: attempt.mainRo, approverEmployeeId: found.employeeId, via: attempt.via },
      };
    }
  }

  return {
    ok: false,
    reason: `Cannot route roster for approval (${dept.name}): ${lastGap || "no approver user found"}. Ask HR to fix reporting lines or user accounts.`,
  };
}

module.exports = {
  resolveRosterApprover,
  findMainReportingOfficer,
  findApproverUserViaChain,
};
