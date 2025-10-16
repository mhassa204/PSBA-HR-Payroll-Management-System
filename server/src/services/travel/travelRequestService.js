const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Core DB interactions for Travel Requests kept 1:1 with former inline route logic.
module.exports = {
  getAuthContext: async (req) => {
    const meUserId = Number(
      req.session.user?.id || req.session.user?.user_id || req.session.user?.uid
    );
    let meEmpId = Number(req.session.user?.employee_id);
    if (!Number.isFinite(meEmpId) || meEmpId <= 0) {
      // Fallback: resolve via User relation if available
      if (Number.isFinite(meUserId) && meUserId > 0) {
        try {
          const userRow = await prisma.user.findUnique({
            where: { id: meUserId },
            select: { employee: { select: { id: true } } },
          });
          if (userRow?.employee?.id) meEmpId = Number(userRow.employee.id);
        } catch (_) {}
      }
    }
    const employment = meEmpId
      ? await prisma.employment.findFirst({
          where: { employee_id: meEmpId, is_current: true, is_deleted: false },
          include: {
            department: true,
            designation: true,
            location: true,
            scale_grade: true,
          },
        })
      : null;
    // Fallback: department-based user (no employee mapping)
    let deptName = employment?.department?.name || "";
    if (!deptName && req.session.user?.department_id) {
      const dept = await prisma.department.findFirst({
        where: {
          id: Number(req.session.user.department_id),
          is_deleted: false,
        },
      });
      deptName = dept?.name || "";
    }
    const desigTitle = employment?.designation?.title || "";
    const locType = employment?.location?.type || "HEAD_OFFICE";
    const scaleLevel = Number(employment?.scale_grade?.level || 0);
    const roleName = req.session.user?.role?.name || "";
    const perms = req.session.user?.permissions || [];
    const userEmail = req.session.user?.email || null;

    // Permission-driven stage approver flags
    // Ops/DG must be derived from org role, not permissions, to avoid over-exposing Approve actions
    const isOps = /operations/i.test(deptName);
    // Robust DG detection: match on either Role name or current Designation title
    // Accept common variants/abbreviation (e.g., "Director General", "DG") case-insensitively.
    const roleNameRaw = (req.session.user?.role?.name || "").trim();
    const isDGByRole = /(^|\b)(director\s*general|dg)(\b|$)/i.test(roleNameRaw);
    const isDGByDesignation = /(^|\b)(director\s*general|dg)(\b|$)/i.test(
      (desigTitle || "").trim()
    );
    const isDG = isDGByRole || isDGByDesignation;
    // Establishment: department-based (Establishment) or permission-based
    // Role-driven flags: prefer role name prefixes, then explicit permissions, then department fallbacks
    const isEstablishment =
      /^\s*establishment/i.test(roleNameRaw) ||
      perms.includes("travel.claim.verify.establishment") ||
      /(^|\b)(Establishment)(\b|$)/i.test(deptName);
    // Accounts approver: role name starts with Accounts OR explicit permission OR department keywords
    const isAccountsApprover =
      /^\s*accounts/i.test(roleNameRaw) ||
      perms.includes("travel.claim.process.start") ||
      /accounts|finance|budget|payroll|reconciliation/i.test(deptName);
    const canApproveClaimOps = perms.includes("travel.claim.approve.ops");
  const canApproveClaimDG = perms.includes("travel.claim.approve.dg");

    const managesAnyLocation = meUserId
      ? !!(await prisma.location.findFirst({
          where: {
            manager_user_id: meUserId,
            is_deleted: false,
            is_active: true,
          },
          select: { id: true },
        }))
      : false;
    const isBps17Plus = scaleLevel >= 17;
    // Updated rule: permission-driven create/own, supports department accounts without employee mapping
    const canCreateOrOwn =
      perms.includes("travel.create") || perms.includes("*");
  const canViewAll = isEstablishment || isOps || isDG;
    const isSuperAdmin =
      req.session.user?.role?.name === "Super Admin" || perms.includes("*");
    return {
      meEmpId,
      meUserId,
      employment,
      deptName,
      desigTitle,
      roleName,
      locType,
      scaleLevel,
      isOps,
      isDG,
  isEstablishment,
      isAccountsApprover,
      canApproveClaimOps,
      canApproveClaimDG,
      managesAnyLocation,
      isBps17Plus,
      canCreateOrOwn,
      canViewAll,
      isSuperAdmin,
      userEmail,
    };
  },

  // New: list only requests related to the logged-in user (can or did act), excluding own-created
  listRelated: async (ctx) => {
    const me = Number(ctx.meEmpId || 0);
    if (!me && !ctx.userEmail) return [];
    const includeShape = {
      attendees: { include: { employee: true } },
      statusEntries: {
        orderBy: { createdAt: "asc" },
        include: { actor: { include: { user: true } } },
      },
      applicant: {
        include: {
          employmentRecords: {
            where: { is_current: true, is_deleted: false },
            include: {
              department: {
                include: {
                  head: {
                    include: {
                      employmentRecords: {
                        where: { is_current: true, is_deleted: false },
                      },
                    },
                  },
                },
              },
              location: true,
            },
          },
        },
      },
    };
    // Stage-based candidates: only CREATED (pre-terminal) requests
    const candidates = await prisma.travelRequest.findMany({
      where: { is_deleted: false, status: "CREATED" },
      include: includeShape,
      orderBy: { createdAt: "desc" },
    });
    // Also include any requests user has already acted on (any status), excluding self-created
    const actedDbWhere = {
      is_deleted: false,
      OR: [
        { statusEntries: { some: { actor_employee_id: me } } },
        ...(ctx.userEmail
          ? [
              {
                statusEntries: {
                  some: {
                    actor: {
                      is: {
                        user: {
                          is: {
                            email: {
                              equals: String(ctx.userEmail),
                              mode: "insensitive",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ]
          : []),
        ...(ctx.userEmail
          ? [
              {
                statusEntries: {
                  some: {
                    remarks: {
                      contains: String(ctx.userEmail),
                      mode: "insensitive",
                    },
                  },
                },
              },
            ]
          : []),
      ],
    };
    const actedDb = await prisma.travelRequest.findMany({
      where: actedDbWhere,
      include: includeShape,
      orderBy: { createdAt: "desc" },
    });

    const isDeptOrigin = (req) =>
      (req.statusEntries || []).some(
        (e) =>
          e.action === "CREATED" &&
          e.remarks &&
          /\[DEPT\]/i.test(String(e.remarks))
      );
    const recCount = (req) =>
      (req.statusEntries || []).filter((e) => e.action === "RECOMMENDED")
        .length;
    const actedByMe = (req) => {
      const email = String(ctx.userEmail || "").trim();
      return (req.statusEntries || []).some((e) => {
        if (me && Number(e.actor_employee_id || 0) === me) return true;
        const actorEmail = e.actor?.user?.email || null;
        if (
          email &&
          actorEmail &&
          actorEmail.toLowerCase() === email.toLowerCase()
        )
          return true;
        if (
          email &&
          e.remarks &&
          String(e.remarks).toLowerCase().includes(email.toLowerCase())
        )
          return true;
        return false;
      });
    };
    const applicantER = (req) =>
      (req.applicant?.employmentRecords || []).find(
        (er) => er.is_current && !er.is_deleted
      ) || null;
    const isDirectReportTo = (req, empId) =>
      (req.applicant?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          String(er.reporting_officer_id || "") === String(empId || "")
      );
    const headOfDeptId = (req) =>
      Number(applicantER(req)?.department?.head?.id || 0);
    const hodROId = (req) => {
      const hod = applicantER(req)?.department?.head;
      const hodER =
        (hod?.employmentRecords || []).find(
          (er) => er.is_current && !er.is_deleted
        ) || null;
      return hodER?.reporting_officer_id
        ? Number(hodER.reporting_officer_id)
        : null;
    };
    const locTypeOf = (req) =>
      applicantER(req)?.location?.type || "HEAD_OFFICE";

    const out = [...actedDb];
    // Helper: exclude requests the current user created (not just where they are applicant)
    const createdByMe = (req) => {
      const ce = (req.statusEntries || []).find((e) => e.action === "CREATED");
      if (!ce) return false;
      const email = String(ctx.userEmail || "").trim();
      const isDept = !!(ce.remarks && /\[DEPT\]/i.test(String(ce.remarks)));
      // If department-originated, don't treat HoD-as-actor as "created by me".
      // Only exclude if the remarks explicitly include my email (i.e., I used my own account to create it).
      if (isDept) {
        return !!(
          email &&
          ce.remarks &&
          String(ce.remarks).toLowerCase().includes(email.toLowerCase())
        );
      }
      // Non-department: exclude if actor is me, or actor's linked user email matches, or remarks include my email
      if (me && Number(ce.actor_employee_id || 0) === me) return true;
      const actorEmail = ce.actor?.user?.email || null;
      if (
        email &&
        actorEmail &&
        actorEmail.toLowerCase() === email.toLowerCase()
      )
        return true;
      if (
        email &&
        ce.remarks &&
        String(ce.remarks).toLowerCase().includes(email.toLowerCase())
      )
        return true;
      return false;
    };

    for (const r of candidates) {
      if (createdByMe(r)) continue; // exclude requests actually created by me
      if (actedByMe(r)) {
        out.push(r);
        continue;
      }
      if (r.status === "CREATED") {
        const deptOrigin = isDeptOrigin(r);
        const recs = recCount(r);
        // Recommender eligibility
        if (!deptOrigin && recs === 0 && isDirectReportTo(r, me)) {
          out.push(r);
          continue;
        }
        if (deptOrigin) {
          if (recs === 0 && headOfDeptId(r) === me) {
            out.push(r);
            continue;
          }
          const hodRO = hodROId(r);
          if (recs === 1 && hodRO && hodRO === me) {
            out.push(r);
            continue;
          }
        }
        // Approval eligibility
        const lt = locTypeOf(r);
        let neededRecs = 1;
        if (deptOrigin) {
          const hodRO = hodROId(r);
          neededRecs = hodRO ? 2 : 1;
        }
        if (recs >= neededRecs) {
          if (ctx.isOps && lt === "BAZAAR" && !deptOrigin) {
            out.push(r);
            continue;
          }
          if (ctx.isDG && lt === "HEAD_OFFICE") {
            out.push(r);
            continue;
          }
        }
        // DG fast-track: direct report at head office
        if (ctx.isDG && lt === "HEAD_OFFICE" && isDirectReportTo(r, me)) {
          out.push(r);
          continue;
        }
      }
    }
    const map = new Map();
    for (const r of out) {
      if (!createdByMe(r)) map.set(r.id, r);
    }
    return Array.from(map.values());
  },

  computeTotalDays: (departureDate, departureTime, expectedReturnDate) => {
    const dep = new Date(departureDate);
    if (departureTime) {
      const [hh, mm] = String(departureTime).split(":");
      if (!Number.isNaN(Number(hh)))
        dep.setHours(Number(hh), Number(mm || 0), 0, 0);
    }
    const ret = new Date(expectedReturnDate);
    const ms = ret.getTime() - dep.getTime();
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return Math.max(1, days);
  },

  listManage: async (ctx) => {
    const me = String(ctx.meEmpId || "");
    const base = { is_deleted: false };
    let where = { ...base };
  if (!ctx.isSuperAdmin && !ctx.isEstablishment) {
      if (ctx.isOps && !ctx.isDG) {
        where = {
          ...where,
          applicant: {
            employmentRecords: {
              some: {
                is_current: true,
                is_deleted: false,
                location: { type: "BAZAAR" },
              },
            },
          },
        };
      } else if (ctx.isDG && !ctx.isOps) {
        where = {
          ...where,
          applicant: {
            employmentRecords: {
              some: {
                is_current: true,
                is_deleted: false,
                location: { type: "HEAD_OFFICE" },
              },
            },
          },
        };
      } else if (me) {
        // Reporting Officer view: show requests from employees who report to me
        // and also employees whose department head reports to me (HoD's RO coverage)
        where = {
          ...where,
          applicant: {
            employmentRecords: {
              some: {
                is_current: true,
                is_deleted: false,
                OR: [
                  { reporting_officer_id: me },
                  {
                    department: {
                      head: {
                        employmentRecords: {
                          some: {
                            is_current: true,
                            is_deleted: false,
                            reporting_officer_id: me,
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        };
      }
    }
    return prisma.travelRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    });
  },

  listPendingApprovals: async (ctx) => {
    // Strategy: fetch a safe superset of CREATED requests without terminal decisions, then filter in JS per role/stage.
    const includeShape = {
      attendees: { include: { employee: true } },
      statusEntries: {
        orderBy: { createdAt: "asc" },
        include: { actor: true },
      },
      applicant: {
        include: {
          employmentRecords: {
            where: { is_current: true, is_deleted: false },
            include: {
              department: {
                include: {
                  head: {
                    include: {
                      user: true,
                      employmentRecords: {
                        where: { is_current: true, is_deleted: false },
                      },
                    },
                  },
                },
              },
              location: true,
            },
          },
        },
      },
    };
    const candidates = await prisma.travelRequest.findMany({
      where: {
        is_deleted: false,
        status: "CREATED",
        statusEntries: { none: { action: { in: ["APPROVED", "REJECTED"] } } },
      },
      include: includeShape,
      orderBy: { createdAt: "desc" },
    });

    const me = Number(ctx.meEmpId || 0);
    const allowedTypes = [];
    if (ctx.isSuperAdmin) {
      allowedTypes.push("BAZAAR", "HEAD_OFFICE");
    } else {
      if (ctx.isOps) allowedTypes.push("BAZAAR");
      if (ctx.isDG) allowedTypes.push("HEAD_OFFICE");
    }

    const isDeptOrigin = (req) =>
      (req.statusEntries || []).some(
        (e) =>
          e.action === "CREATED" &&
          e.remarks &&
          /\[DEPT\]/i.test(String(e.remarks))
      );
    const recCount = (req) =>
      (req.statusEntries || []).filter((e) => e.action === "RECOMMENDED")
        .length;
    const applicantER = (req) =>
      (req.applicant?.employmentRecords || []).find(
        (er) => er.is_current && !er.is_deleted
      ) || null;
    const isDirectReportTo = (req, empId) =>
      (req.applicant?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          String(er.reporting_officer_id || "") === String(empId || "")
      );
    const headOfDeptId = (req) =>
      Number(applicantER(req)?.department?.head?.id || 0);
    const headOfDeptEmail = (req) =>
      String(
        applicantER(req)?.department?.head?.user?.email || ""
      ).toLowerCase();
    const hodROId = (req) => {
      const hod = applicantER(req)?.department?.head;
      const hodER =
        (hod?.employmentRecords || []).find(
          (er) => er.is_current && !er.is_deleted
        ) || null;
      return hodER?.reporting_officer_id
        ? Number(hodER.reporting_officer_id)
        : null;
    };

    const out = [];

    for (const r of candidates) {
      const deptOrigin = isDeptOrigin(r);
      const recs = recCount(r);
      const locType = applicantER(r)?.location?.type || "HEAD_OFFICE";

      // Recommender stage: allow if eligible regardless of DG permission.
      // Some HoDs have broad permissions (including DG approve), but they should still see their pending recommendations.
      if (me || ctx.userEmail) {
        if (!deptOrigin && recs === 0 && isDirectReportTo(r, me)) {
          out.push(r);
          continue;
        }
        if (deptOrigin) {
          const hodId = headOfDeptId(r);
          const hodEmail = headOfDeptEmail(r);
          const meEmail = String(ctx.userEmail || "").toLowerCase();
          const isHoDById = me && hodId === me;
          const isHoDByEmail = meEmail && hodEmail && meEmail === hodEmail;
          if (recs === 0 && (isHoDById || isHoDByEmail)) {
            out.push(r);
            continue;
          }
          const hodRO = hodROId(r);
          if (recs === 1 && hodRO && hodRO === me) {
            out.push(r);
            continue;
          }
        }
      }

      // Ops/DG approvals after recommendation
      // For department-originated requests, if HoD has a Reporting Officer, require two recommendations
      let neededRecs = 1;
      if (deptOrigin) {
        const hodRO = hodROId(r);
        neededRecs = hodRO ? 2 : 1;
      }
      if (me && allowedTypes.includes(locType) && recs >= neededRecs) {
        if (ctx.isOps && deptOrigin) {
          // Ops must not see department-originated
          // skip
        } else {
          out.push(r);
          continue;
        }
      }

      // DG fast-track for direct reports at head office (no prior recommendation required)
      if (
        ctx.isDG &&
        me &&
        locType === "HEAD_OFFICE" &&
        isDirectReportTo(r, me)
      ) {
        out.push(r);
        continue;
      }
    }

    // Dedupe by id to be safe, then sort by createdAt desc
    const map = new Map();
    for (const r of out) map.set(r.id, r);
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  },

  listMine: async (employeeId) => {
    if (!employeeId) return [];
    return prisma.travelRequest.findMany({
      where: { is_deleted: false, applicant_id: employeeId },
      orderBy: { createdAt: "desc" },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    });
  },

  // For department accounts: list requests whose applicant currently belongs to the department
  listDepartmentApplicants: async (departmentId) => {
    if (!departmentId) return [];
    return prisma.travelRequest.findMany({
      where: {
        is_deleted: false,
        applicant: {
          employmentRecords: {
            some: {
              is_current: true,
              is_deleted: false,
              department_id: departmentId,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
        applicant: true,
      },
    });
  },

  createRequest: async (ctx, data, attendeeIds, totalDays, actorLabel) => {
    const created = await prisma.travelRequest.create({
      data: {
        applicant_id: ctx.meEmpId,
        departure_date: new Date(data.departure_date),
        departure_time: data.departure_time || null,
        expected_return_date: new Date(data.expected_return_date),
        purpose: data.purpose || null,
        destination: data.destination || null,
        total_days: totalDays,
        status: "CREATED",
      },
    });
    if (attendeeIds.length) {
      await prisma.travelRequestEmployee.createMany({
        data: attendeeIds.map((eid) => ({
          request_id: created.id,
          employee_id: eid,
        })),
      });
    }
    await prisma.travelRequestStatusEntry.create({
      data: {
        request_id: created.id,
        action: "CREATED",
        actor_employee_id: ctx.meEmpId,
        remarks: actorLabel || null,
      },
    });
    return prisma.travelRequest.findUnique({
      where: { id: created.id },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    });
  },

  // New: on-behalf request creation
  createRequestOnBehalf: async (
    ctx,
    data,
    attendeeIds,
    totalDays,
    createdByEmpId,
    createdByLabel
  ) => {
    // ctx.meEmpId is replaced with applicant_id so created request belongs to that employee
    const submissionDateTime = (() => {
      try {
        if (data.submission_date) {
          const date = String(data.submission_date);
          const time = String(data.submission_time || "00:00");
          return new Date(`${date}T${time}:00`);
        }
      } catch (_) {}
      return undefined;
    })();
    const created = await prisma.travelRequest.create({
      data: {
        applicant_id: Number(ctx.meEmpId),
        departure_date: new Date(data.departure_date),
        departure_time: data.departure_time || null,
        expected_return_date: new Date(data.expected_return_date),
        purpose: data.purpose || null,
        destination: data.destination || null,
        total_days: totalDays,
        status: "CREATED",
        ...(submissionDateTime ? { submission_date: submissionDateTime } : {}),
      },
    });
    if (attendeeIds.length) {
      await prisma.travelRequestEmployee.createMany({
        data: attendeeIds.map((eid) => ({
          request_id: created.id,
          employee_id: eid,
        })),
      });
    }
    // Record CREATED by actor: prefer creator if provided (e.g., HoD for department account), else applicant
    const actorId = Number(createdByEmpId || ctx.meEmpId);
    await prisma.travelRequestStatusEntry.create({
      data: {
        request_id: created.id,
        action: "CREATED",
        actor_employee_id: actorId,
        remarks: createdByLabel || null,
      },
    });
    return prisma.travelRequest.findUnique({
      where: { id: created.id },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    });
  },

  getById: (id) =>
    prisma.travelRequest.findUnique({
      where: { id },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
        applicant: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: {
                location: true,
                department: { include: { head: true } },
              },
            },
          },
        },
      },
    }),

  updateRequest: async (id, data, attendeeIds, totalDays) => {
    const updateData = { total_days: totalDays };
    if ("purpose" in data) updateData.purpose = data.purpose || null;
    if ("destination" in data)
      updateData.destination = data.destination || null;
    if ("departure_date" in data && data.departure_date)
      updateData.departure_date = new Date(data.departure_date);
    if ("departure_time" in data)
      updateData.departure_time = data.departure_time || null;
    if ("expected_return_date" in data && data.expected_return_date)
      updateData.expected_return_date = new Date(data.expected_return_date);

    await prisma.travelRequest.update({ where: { id }, data: updateData });
    if (Array.isArray(attendeeIds)) {
      await prisma.travelRequestEmployee.deleteMany({
        where: { request_id: id },
      });
      if (attendeeIds.length)
        await prisma.travelRequestEmployee.createMany({
          data: attendeeIds.map((eid) => ({
            request_id: id,
            employee_id: eid,
          })),
        });
    }
    return prisma.travelRequest.findUnique({
      where: { id },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    });
  },

  softDelete: (id) =>
    prisma.travelRequest.update({ where: { id }, data: { is_deleted: true } }),

  legacyDecision: async (id, newStatus, actorEmpId, actorEmail) => {
    await prisma.travelRequest.update({
      where: { id },
      data: { status: newStatus },
    });
    await prisma.travelRequestStatusEntry.create({
      data: {
        request_id: id,
        action: newStatus,
        actor_employee_id: actorEmpId,
        remarks: actorEmail || null,
      },
    });
    return prisma.travelRequest.findUnique({
      where: { id },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    });
  },

  updateStatusFlexible: async (id, targetStatus, actorEmpId, actorEmail) => {
    await prisma.travelRequest.update({
      where: { id },
      data: { status: targetStatus },
    });
    await prisma.travelRequestStatusEntry.create({
      data: {
        request_id: id,
        action: targetStatus,
        actor_employee_id: actorEmpId,
        remarks: actorEmail || null,
      },
    });
    return prisma.travelRequest.findUnique({
      where: { id },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    });
  },

  // New: decision API for recommendation/clear without changing status
  recommendOrClear: async (id, actorEmpId, action, ctx) => {
    const req = await prisma.travelRequest.findUnique({
      where: { id: Number(id) },
      include: {
        statusEntries: { orderBy: { createdAt: "asc" } },
        applicant: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: {
                department: {
                  include: {
                    head: {
                      include: {
                        employmentRecords: {
                          where: { is_current: true, is_deleted: false },
                        },
                      },
                    },
                  },
                },
                location: true,
                scale_grade: true,
              },
            },
          },
        },
      },
    });
    if (!req || req.is_deleted) throw new Error("Not found");
    if (req.status !== "CREATED")
      throw new Error("Only CREATED requests can be actioned");
    if (!ctx.meEmpId)
      throw new Error(
        "Not authorized: your account is not linked to an employee"
      );
    const applicantER = req.applicant?.employmentRecords?.[0];
    const isDeptOrigin = !!(req.statusEntries || []).some(
      (e) =>
        e.action === "CREATED" &&
        e.remarks &&
        /\[DEPT\]/i.test(String(e.remarks))
    );
    const last = req.statusEntries[req.statusEntries.length - 1];
    const act = String(action || "").toUpperCase();

    // CLEAR should be allowed by the original recommender (or SuperAdmin) regardless of current recommender eligibility
    if (act === "CLEAR") {
      if (!last || last.action !== "RECOMMENDED")
        throw new Error("Nothing to clear");
      if (last.actor_employee_id !== actorEmpId && !ctx.isSuperAdmin)
        throw new Error("Cannot clear another user's recommendation");
      await prisma.travelRequestStatusEntry.delete({ where: { id: last.id } });
      return prisma.travelRequest.findUnique({
        where: { id: req.id },
        include: {
          attendees: { include: { employee: true } },
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: { actor: true },
          },
        },
      });
    }

    // Check recommender eligibility (applies to RECOMMEND and REJECT)
    let canRecommend = false;
    // Department-originated: only HoD first then HoD's RO
    if (isDeptOrigin) {
      const hodId = Number(applicantER?.department?.head?.id || 0);
      const hodRO =
        Number(
          (applicantER?.department?.head?.employmentRecords || []).find(
            (er) => er.is_current && !er.is_deleted
          )?.reporting_officer_id || 0
        ) || null;
      const alreadyRecs = (req.statusEntries || []).filter(
        (e) => e.action === "RECOMMENDED"
      ).length;
      const me = Number(ctx.meEmpId || 0);
      if (alreadyRecs === 0) canRecommend = me === hodId;
      else if (alreadyRecs === 1)
        canRecommend = hodRO ? me === Number(hodRO) : false;
      else canRecommend = false; // no further recommendations
    } else {
      // Legacy: immediate in-charge can recommend
      canRecommend =
        canRecommend ||
        (req.applicant?.employmentRecords || []).some(
          (er) =>
            String(er.reporting_officer_id || "") === String(ctx.meEmpId || "")
        );
    }
    if (!canRecommend && !ctx.isSuperAdmin) {
      if (isDeptOrigin) {
        throw new Error(
          "Not authorized: department-origin request can only be recommended by HoD first, then HoD's Reporting Officer"
        );
      } else {
        throw new Error(
          "Not authorized: only the applicant's immediate in-charge (reporting officer) can recommend"
        );
      }
    }
    if (act === "RECOMMEND") {
      // Idempotent only if the same actor is trying to recommend twice consecutively
      if (
        last &&
        last.action === "RECOMMENDED" &&
        Number(last.actor_employee_id || 0) === Number(actorEmpId || 0)
      )
        return req;
      await prisma.travelRequestStatusEntry.create({
        data: {
          request_id: req.id,
          action: "RECOMMENDED",
          actor_employee_id: actorEmpId,
          remarks: ctx.userEmail || null,
        },
      });
      return prisma.travelRequest.findUnique({
        where: { id: req.id },
        include: {
          attendees: { include: { employee: true } },
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: { actor: true },
          },
        },
      });
    } else if (act === "REJECT") {
      await prisma.travelRequest.update({
        where: { id: req.id },
        data: { status: "REJECTED" },
      });
      await prisma.travelRequestStatusEntry.create({
        data: {
          request_id: req.id,
          action: "RECOMMENDED_REJECTED",
          actor_employee_id: actorEmpId,
          remarks: ctx.userEmail || null,
        },
      });
      return prisma.travelRequest.findUnique({
        where: { id: req.id },
        include: {
          attendees: { include: { employee: true } },
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: { actor: true },
          },
        },
      });
    }
    throw new Error("Invalid action");
  },

  manualDecision: async (id, { stage, actorEmpId, action }, ctx) => {
    // Mirror normal flow but attribute actor to the selected employee
    const req = await prisma.travelRequest.findUnique({
      where: { id: Number(id) },
      include: {
        applicant: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: {
                location: true,
                department: { include: { head: true } },
              },
            },
          },
        },
        statusEntries: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!req || req.is_deleted) throw new Error("Not found");
    if (!(ctx.isSuperAdmin || ctx.isAccountsApprover))
      throw new Error("Forbidden");

    const act = String(action || "").toUpperCase();
    if (act === "RECOMMEND") {
      if (req.status !== "CREATED")
        throw new Error("Only CREATED can be recommended");
      const last = req.statusEntries[req.statusEntries.length - 1];
      if (last && last.action === "RECOMMENDED")
        return prisma.travelRequest.findUnique({
          where: { id: req.id },
          include: {
            attendees: { include: { employee: true } },
            statusEntries: {
              orderBy: { createdAt: "asc" },
              include: { actor: true },
            },
          },
        });
      await prisma.travelRequestStatusEntry.create({
        data: {
          request_id: req.id,
          action: "RECOMMENDED",
          actor_employee_id: actorEmpId,
          remarks: ctx.userEmail || null,
        },
      });
      return prisma.travelRequest.findUnique({
        where: { id: req.id },
        include: {
          attendees: { include: { employee: true } },
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: { actor: true },
          },
        },
      });
    }

    // Approval/Reject: DG or OPS depending on location type; department-originated requires DG
    const locType =
      req.applicant?.employmentRecords?.[0]?.location?.type || "HEAD_OFFICE";
    const isDeptOrigin = !!(req.statusEntries || []).some(
      (e) =>
        e.action === "CREATED" &&
        e.remarks &&
        /department|\[DEPT\]/i.test(String(e.remarks))
    );
    if (act === "APPROVE" || act === "REJECT") {
      if (req.status !== "CREATED") throw new Error("Already decided");
      const isBazaar = locType === "BAZAAR";
      const actionKey = act === "APPROVE" ? "APPROVED" : "REJECTED";
      if (isDeptOrigin) {
        // Enforce DG-only approval for department-originated
        const approverEmployment = await prisma.employment.findFirst({
          where: {
            employee_id: actorEmpId,
            is_current: true,
            is_deleted: false,
          },
          include: { designation: true },
        });
        const isDG = /^director\s+general$/i.test(
          approverEmployment?.designation?.title || ""
        );
        if (!isDG && !ctx.isSuperAdmin)
          throw new Error("Department-originated requests require DG approval");
        // Require two recommendations when HoD has a reporting officer
        const er =
          (req.applicant?.employmentRecords || []).find(
            (e) => e.is_current && !e.is_deleted
          ) || null;
        const hodER = er?.department?.head
          ? await prisma.employment.findFirst({
              where: {
                employee_id: Number(er.department.head.id),
                is_current: true,
                is_deleted: false,
              },
            })
          : null;
        const hodHasRO = !!hodER?.reporting_officer_id;
        const currentRecs = (req.statusEntries || []).filter(
          (se) => se.action === "RECOMMENDED"
        ).length;
        if (hodHasRO && currentRecs < 2)
          throw new Error(
            "Requires HoD and HoD’s RO recommendations before DG approval"
          );
      }
      // Update request status and record status entry with selected actor
      await prisma.travelRequest.update({
        where: { id: req.id },
        data: { status: actionKey },
      });
      await prisma.travelRequestStatusEntry.create({
        data: {
          request_id: req.id,
          action: actionKey,
          actor_employee_id: actorEmpId,
          remarks: ctx.userEmail || null,
        },
      });
      return prisma.travelRequest.findUnique({
        where: { id: req.id },
        include: {
          attendees: { include: { employee: true } },
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: { actor: true },
          },
        },
      });
    }

    if (act === "CLEAR") {
      const last = req.statusEntries[req.statusEntries.length - 1];
      if (!last) throw new Error("Nothing to clear");
      // Allow Accounts/SuperAdmin to clear last decision regardless of actor
      await prisma.travelRequestStatusEntry.delete({ where: { id: last.id } });
      // If cleared action was terminal, revert status
      if (["APPROVED", "REJECTED"].includes(last.action)) {
        await prisma.travelRequest.update({
          where: { id: req.id },
          data: { status: "CREATED" },
        });
      }
      return prisma.travelRequest.findUnique({
        where: { id: req.id },
        include: {
          attendees: { include: { employee: true } },
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: { actor: true },
          },
        },
      });
    }

    throw new Error("Invalid action");
  },

  // New: clear the last decision (including APPROVED/REJECTED) by the same actor; revert status if terminal
  clearLastDecision: async (id, actorEmpId, ctx) => {
    const req = await prisma.travelRequest.findUnique({
      where: { id: Number(id) },
      include: { statusEntries: { orderBy: { createdAt: "asc" } } },
    });
    if (!req || req.is_deleted) throw new Error("Not found");
    const last = (req.statusEntries || [])[
      (req.statusEntries || []).length - 1
    ];
    if (!last) throw new Error("Nothing to clear");
    if (
      Number(last.actor_employee_id || 0) !== Number(actorEmpId || 0) &&
      !ctx.isSuperAdmin
    )
      throw new Error("Cannot clear another user's decision");
    await prisma.travelRequestStatusEntry.delete({ where: { id: last.id } });
    if (["APPROVED", "REJECTED"].includes(last.action)) {
      await prisma.travelRequest.update({
        where: { id: Number(id) },
        data: { status: "CREATED" },
      });
    }
    return prisma.travelRequest.findUnique({
      where: { id: Number(id) },
      include: {
        attendees: { include: { employee: true } },
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
        applicant: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: {
                location: true,
                department: { include: { head: true } },
              },
            },
          },
        },
      },
    });
  },

  listReporteesPlusSelf: async (meEmpId) => {
    if (!meEmpId) return [];
    const self = await prisma.employee.findUnique({
      where: { id: Number(meEmpId) },
    });
    const officerKey = String(meEmpId);
    const employments = await prisma.employment.findMany({
      where: {
        is_deleted: false,
        is_current: true,
        reporting_officer_id: officerKey,
      },
      include: { employee: true },
    });
    const reportees = employments.map((e) => e.employee).filter(Boolean);
    const map = new Map();
    for (const e of reportees) if (e) map.set(e.id, e);
    if (self) map.set(self.id, self);
    return Array.from(map.values()).map((e) => ({
      id: e.id,
      full_name: e.full_name,
      cnic: e.cnic || "",
    }));
  },
};
