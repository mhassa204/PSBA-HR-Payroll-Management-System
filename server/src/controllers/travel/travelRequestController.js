const travelService = require("../../services/travel/travelRequestService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  reportees: async (req, res) => {
    try {
      // Department-based account path: no personal employee_id but has department_id
      const meEmpId = Number(req.session.user?.employee_id || 0);
      const deptId = Number(req.session.user?.department_id || 0);
      if (!meEmpId && deptId) {
        const dept = await prisma.department.findFirst({
          where: { id: deptId, is_deleted: false },
          include: { head: true },
        });
        const hodId = dept?.head?.id || 0;
        const employees = await prisma.employee.findMany({
          where: {
            is_deleted: false,
            employmentRecords: {
              some: {
                is_current: true,
                is_deleted: false,
                department_id: deptId,
              },
            },
            id: { not: hodId },
          },
          orderBy: { full_name: "asc" },
          select: { id: true, full_name: true, cnic: true },
        });
        return res.json({ success: true, employees });
      }

      // Default: personal account path returns self + direct reportees
      const ctx = await travelService.getAuthContext(req);
      if (!ctx.meEmpId) return res.json({ success: true, employees: [] });
      const employees = await travelService.listReporteesPlusSelf(ctx.meEmpId);
      return res.json({ success: true, employees });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },
  listManage: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    // Change semantics: show only requests related to the logged-in user (can act on or has acted on),
    // and exclude those created by the same user (applicant).
    const list = await travelService.listRelated(ctx);
    res.json({ success: true, requests: list });
  },
  listPendingApprovals: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const list = await travelService.listPendingApprovals(ctx);
      res.json({ success: true, requests: list });
    } catch (err) {
      console.error("Pending approvals query error", err);
      res.status(500).json({
        success: false,
        error: "Failed to load pending approvals",
        details: err.message,
      });
    }
  },
  listMine: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    if (!ctx.canCreateOrOwn)
      return res.status(403).json({ success: false, error: "Forbidden" });
    // For personal accounts, show own
    if (ctx.meEmpId) {
      const list = await travelService.listMine(ctx.meEmpId);
      return res.json({ success: true, requests: list });
    }
    // For department accounts, show department's applicants (current employment in same department)
    const deptId = Number(req.session.user?.department_id || 0);
    if (!deptId) return res.json({ success: true, requests: [] });
    const list = await travelService.listDepartmentApplicants(deptId);
    return res.json({ success: true, requests: list });
  },
  create: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const data = req.body || {};
    try {
      if (ctx.meEmpId) {
        if (!ctx.canCreateOrOwn)
          return res.status(403).json({ success: false, error: "Forbidden" });
        if (!data.departure_date)
          return res
            .status(400)
            .json({ success: false, error: "departure_date is required" });
        if (!data.expected_return_date)
          return res.status(400).json({
            success: false,
            error: "expected_return_date is required",
          });
        const computedDays = travelService.computeTotalDays(
          data.departure_date,
          data.departure_time,
          data.expected_return_date
        );
        if (
          data.total_days != null &&
          data.total_days !== "" &&
          Number(data.total_days) !== computedDays
        ) {
          return res.status(400).json({
            success: false,
            error: `total_days (${data.total_days}) does not match date range (${computedDays})`,
          });
        }
        let attendeeIds = Array.isArray(data.employee_ids)
          ? data.employee_ids.map(Number).filter(Boolean)
          : [];
        // Auto-include the current user as an attendee for personal accounts
        if (ctx.meEmpId && !attendeeIds.includes(Number(ctx.meEmpId))) {
          attendeeIds = [...attendeeIds, Number(ctx.meEmpId)];
        }
        const email = String(req.session.user?.email || "");
        const label = email ? `created by ${email}` : null;
        const full = await travelService.createRequest(
          ctx,
          data,
          attendeeIds,
          computedDays,
          label
        );
        return res.json({ success: true, request: full });
      }

      // Department account path (no employee linked)
      if (!ctx.canCreateOrOwn)
        return res.status(403).json({ success: false, error: "Forbidden" });
      let applicant_id = Number(data.applicant_id || 0);
      // Auto-assign to department head if not provided
      if (!applicant_id) {
        const deptId = Number(req.session.user?.department_id || 0);
        if (!deptId)
          return res.status(400).json({
            success: false,
            error:
              "No department linked to account and no applicant_id provided",
          });
        const dept = await prisma.department.findFirst({
          where: { id: deptId, is_deleted: false },
          include: { head: true },
        });
        applicant_id = Number(dept?.head?.id || 0);
        if (!applicant_id)
          return res.status(400).json({
            success: false,
            error:
              "Department head not set. Please assign a head to the department or provide applicant_id.",
          });
      }
      if (!data.departure_date)
        return res
          .status(400)
          .json({ success: false, error: "departure_date is required" });
      if (!data.expected_return_date)
        return res
          .status(400)
          .json({ success: false, error: "expected_return_date is required" });
      const computedDays = travelService.computeTotalDays(
        data.departure_date,
        data.departure_time,
        data.expected_return_date
      );
      const attendeeIds = Array.isArray(data.employee_ids)
        ? data.employee_ids.map(Number).filter(Boolean)
        : [];
      // createdByEmpId should be the department head (manager) so status history shows their name
      const deptId = Number(req.session.user?.department_id || 0);
      const dept = deptId
        ? await prisma.department.findFirst({
            where: { id: deptId, is_deleted: false },
            include: { head: true },
          })
        : null;
      const createdByEmpId = Number(dept?.head?.id || 0) || applicant_id; // fallback to applicant if no HoD
      const email = String(req.session.user?.email || "");
      // Include [DEPT] to mark department-origin robustly, plus the creating user's email
      const createdByLabel = `${
        dept?.name ? `[DEPT] ${dept.name} Department` : "[DEPT] Department"
      }${email ? ` | created by ${email}` : ""}`;
      const full = await travelService.createRequestOnBehalf(
        { ...ctx, meEmpId: applicant_id },
        data,
        attendeeIds,
        computedDays,
        createdByEmpId,
        createdByLabel
      );
      return res.json({ success: true, request: full });
    } catch (e) {
      console.error("Create request error", e);
      return res.status(400).json({ success: false, error: e.message });
    }
  },
  update: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const id = Number(req.params.id);
    const data = req.body || {};
    const hasManage =
      (req.session.user?.permissions || []).includes("travel.manage") ||
      ctx.isSuperAdmin;
    if (!hasManage) {
      const existing = await travelService.getById(id);
      if (!existing || existing.is_deleted)
        return res.status(404).json({ success: false, error: "Not found" });
      if (existing.applicant_id !== ctx.meEmpId)
        return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const existing = await travelService.getById(id);
    if (!existing || existing.is_deleted)
      return res.status(404).json({ success: false, error: "Not found" });
    const depDate = data.departure_date
      ? new Date(data.departure_date)
      : existing.departure_date;
    const depTime =
      "departure_time" in data
        ? data.departure_time || null
        : existing.departure_time;
    const retDate = data.expected_return_date
      ? new Date(data.expected_return_date)
      : existing.expected_return_date;
    const computedDays = travelService.computeTotalDays(
      depDate,
      depTime,
      retDate
    );
    if (
      data.total_days != null &&
      data.total_days !== "" &&
      Number(data.total_days) !== computedDays
    ) {
      return res.status(400).json({
        success: false,
        error: `total_days (${data.total_days}) does not match date range (${computedDays})`,
      });
    }
    const attendeeIds = Array.isArray(data.employee_ids)
      ? data.employee_ids.map(Number).filter(Boolean)
      : undefined;
    const full = await travelService.updateRequest(
      id,
      data,
      attendeeIds,
      computedDays
    );
    res.json({ success: true, request: full });
  },
  remove: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const id = Number(req.params.id);
    const row = await travelService.getById(id);
    if (!row || row.is_deleted)
      return res.status(404).json({ success: false, error: "Not found" });
    const hasManage =
      (req.session.user?.permissions || []).includes("travel.manage") ||
      ctx.isSuperAdmin;
    if (!hasManage) {
      // Personal account can delete own CREATED
      const isOwn = ctx.meEmpId && row.applicant_id === ctx.meEmpId;
      // Department account can delete if applicant is in same department and user has travel.create
      const hasCreate =
        (req.session.user?.permissions || []).includes("travel.create") ||
        (req.session.user?.permissions || []).includes("*");
      let sameDept = false;
      if (!ctx.meEmpId && req.session.user?.department_id) {
        const deptId = Number(req.session.user.department_id);
        sameDept = !!(row.applicant?.employmentRecords || []).some(
          (er) =>
            er.is_current &&
            !er.is_deleted &&
            Number(er.department_id) === deptId
        );
      }
      if (!(isOwn || (hasCreate && sameDept))) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }
    }
    // Default rule: Disallow deletion once any recommendation or decision exists
    // Exception: If the applicant is DG (true DG) deleting their own request, allow deletion
    // as long as no associated claim has been Establishment-verified or beyond.
    const hasActions = (row.statusEntries || []).some((e) =>
      ["RECOMMENDED", "RECOMMENDED_REJECTED", "APPROVED", "REJECTED"].includes(
        e.action
      )
    );
    if (hasActions) {
      const isOwn = ctx.meEmpId && row.applicant_id === ctx.meEmpId;
      if (isOwn && ctx.isDG) {
        // Check for any related claims that are verified or further processed
        const { PrismaClient } = require("@prisma/client");
        const p = new PrismaClient();
        try {
          const blockingClaims = await p.travelClaim.count({
            where: {
              is_deleted: false,
              travel_request_id: row.id,
              status: {
                in: ["VERIFIED", "UNDER_PROCESS", "PROCESSED", "SETTLED"],
              },
            },
          });
          if (blockingClaims > 0) {
            return res.status(400).json({
              success: false,
              error:
                "Cannot delete: related claim has been Establishment-verified or processed",
            });
          }
          // Allow deletion otherwise (e.g., auto-approved by DG, or claims not yet verified)
        } finally {
          await p.$disconnect().catch(() => {});
        }
      } else {
        return res.status(400).json({
          success: false,
          error: "Cannot delete: request has recommendations or decisions",
        });
      }
    }
    // For non-DG or where no actions exist, enforce CREATED status; for DG exception above, allow regardless of status
    if (
      row.status !== "CREATED" &&
      !(ctx.isDG && row.applicant_id === ctx.meEmpId)
    )
      return res.status(400).json({
        success: false,
        error: "Only CREATED requests can be deleted",
      });
    await travelService.softDelete(id);
    res.json({ success: true });
  },
  getOne: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const id = Number(req.params.id);
    const row = await travelService.getById(id);
    if (!row || row.is_deleted)
      return res.status(404).json({ success: false, error: "Not found" });
    if (!ctx.canViewAll) {
      const me = ctx.meEmpId;
      const isApplicant = row.applicant_id === me;
      const isAttendee = (row.attendees || []).some(
        (a) => a.employee_id === me
      );
      // New: allow view if current user has previously acted on this request (recommend/approve/reject)
      const meEmail = String(ctx.userEmail || "")
        .trim()
        .toLowerCase();
      const actedByMe = (row.statusEntries || []).some((e) => {
        if (me && Number(e.actor_employee_id || 0) === Number(me)) return true;
        const actorEmail = String(e?.actor?.user?.email || "").toLowerCase();
        if (meEmail && actorEmail && actorEmail === meEmail) return true;
        if (
          meEmail &&
          e.remarks &&
          String(e.remarks).toLowerCase().includes(meEmail)
        )
          return true;
        return false;
      });
      // Department account access: allow if applicant is currently in same department
      let sameDept = false;
      if (!me && req.session.user?.department_id) {
        const deptId = Number(req.session.user.department_id);
        sameDept = !!(row.applicant?.employmentRecords || []).some(
          (er) =>
            er.is_current &&
            !er.is_deleted &&
            Number(er.department_id) === deptId
        );
      }
      if (!isApplicant && !isAttendee && !sameDept && !actedByMe)
        return res.status(403).json({ success: false, error: "Forbidden" });
    }
    res.json({ success: true, request: row });
  },
  legacyDecision: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const id = Number(req.params.id);
    const action = String(req.body?.action || "").toUpperCase();
    if (!["APPROVE", "REJECT"].includes(action))
      return res.status(400).json({ success: false, error: "Invalid action" });
    const meEmpId = Number(req.session.user?.employee_id);
    if (!meEmpId)
      return res
        .status(400)
        .json({ success: false, error: "User not linked to employee" });
    const request = await travelService.getById(id);
    if (!request || request.is_deleted)
      return res.status(404).json({ success: false, error: "Not found" });
    if (request.status !== "CREATED")
      return res.status(400).json({
        success: false,
        error: "Only CREATED requests can be decided",
      });
    const isDeptOrigin = !!(request.statusEntries || []).some(
      (e) =>
        e.action === "CREATED" &&
        e.remarks &&
        /\[DEPT\]/i.test(String(e.remarks))
    );
    const applicantEmployment = await prisma.employment.findFirst({
      where: {
        employee_id: request.applicant_id,
        is_current: true,
        is_deleted: false,
      },
      include: { location: true },
    });
    const applicantLocType =
      applicantEmployment?.location?.type || "HEAD_OFFICE";
    const approverEmployment = await prisma.employment.findFirst({
      where: { employee_id: meEmpId, is_current: true, is_deleted: false },
      include: { department: true, designation: true },
    });
    const deptName = approverEmployment?.department?.name || "";
    const desigTitle = approverEmployment?.designation?.title || "";
    const isOps = /operations/i.test(deptName);
    const isDG = /^director\s+general$/i.test(desigTitle);
    if (isDeptOrigin) {
      if (!isDG)
        return res.status(403).json({
          success: false,
          error: "Department-originated requests require DG approval",
        });
    } else {
      if (applicantLocType === "BAZAAR") {
        if (!isOps)
          return res.status(403).json({
            success: false,
            error: "Only Operations can approve/reject bazaar requests",
          });
      } else {
        if (!isDG)
          return res.status(403).json({
            success: false,
            error:
              "Only Director General can approve/reject head office requests",
          });
      }
    }
    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const full = await travelService.legacyDecision(
      id,
      newStatus,
      meEmpId,
      ctx.userEmail
    );
    res.json({ success: true, request: full });
  },
  capabilities: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    res.json({
      success: true,
      capabilities: {
        canCreateOrOwn: ctx.canCreateOrOwn || ctx.isSuperAdmin,
        canViewAll: ctx.canViewAll || ctx.isSuperAdmin,
        canManageRequests: ctx.canManageRequests || ctx.isSuperAdmin,
        isOps: ctx.isOps,
        isEstablishment: ctx.isEstablishment,
        isDG: ctx.isDG,
        desigTitle: ctx.desigTitle,
        isAccountsApprover: ctx.isAccountsApprover,
        canApproveClaimOps: ctx.canApproveClaimOps,
        canApproveClaimDG: ctx.canApproveClaimDG,
        isSuperAdmin: ctx.isSuperAdmin,
        locType: ctx.locType,
        isBps17Plus: ctx.isBps17Plus,
      },
    });
  },
  updateStatusFlexible: async (req, res) => {
    const ctx = await travelService.getAuthContext(req);
    const id = Number(req.params.id);
    const targetStatus = String(req.body?.status || "").toUpperCase();
    if (!["CREATED", "APPROVED", "REJECTED"].includes(targetStatus))
      return res.status(400).json({ success: false, error: "Invalid status" });
    const meEmpId = Number(req.session.user?.employee_id);
    if (!meEmpId)
      return res
        .status(400)
        .json({ success: false, error: "User not linked to employee" });
    const request = await travelService.getById(id);
    if (!request || request.is_deleted)
      return res.status(404).json({ success: false, error: "Not found" });
    const isDeptOrigin = !!(request.statusEntries || []).some(
      (e) =>
        e.action === "CREATED" &&
        e.remarks &&
        /\[DEPT\]/i.test(String(e.remarks))
    );
    const applicantEmployment = await prisma.employment.findFirst({
      where: {
        employee_id: request.applicant_id,
        is_current: true,
        is_deleted: false,
      },
      include: { location: true },
    });
    const applicantLocType =
      applicantEmployment?.location?.type || "HEAD_OFFICE";
    const approverEmployment = await prisma.employment.findFirst({
      where: { employee_id: meEmpId, is_current: true, is_deleted: false },
      include: { department: true, designation: true },
    });
    const deptName = approverEmployment?.department?.name || "";
    const desigTitle = approverEmployment?.designation?.title || "";
    const isOps = /operations/i.test(deptName);
    const isDG = /^director\s+general$/i.test(desigTitle);
    const isEstablishment =
      /^hr$/i.test(deptName) ||
      /human\s*resources|establishment/i.test(deptName);
    const isSuperAdmin =
      req.session.user?.role?.name === "Super Admin" ||
      (req.session.user?.permissions || []).includes("*");
    if (isEstablishment && !isSuperAdmin)
      return res
        .status(403)
        .json({ success: false, error: "Establishment cannot modify status" });
    if (!isSuperAdmin) {
      if (isDeptOrigin) {
        if (!isDG)
          return res.status(403).json({
            success: false,
            error: "Department-originated requests require DG to change status",
          });
      } else {
        if (applicantLocType === "BAZAAR" && !isOps)
          return res.status(403).json({
            success: false,
            error: "Only Operations can modify bazaar requests",
          });
        if (applicantLocType === "HEAD_OFFICE" && !isDG)
          return res.status(403).json({
            success: false,
            error: "Only Director General can modify head office requests",
          });
      }
    }
    if (request.status === targetStatus) {
      const full = await travelService.getById(id);
      return res.json({ success: true, request: full });
    }
    const full = await travelService.updateStatusFlexible(
      id,
      targetStatus,
      meEmpId,
      ctx.userEmail
    );
    res.json({ success: true, request: full });
  },
  recommend: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const id = Number(req.params.id);
      const result = await travelService.recommendOrClear(
        id,
        ctx.meEmpId,
        "RECOMMEND",
        ctx
      );
      res.json({ success: true, request: result });
    } catch (e) {
      const msg = String(e.message || "");
      const code = /not\s+found/i.test(msg)
        ? 404
        : /only\s+created/i.test(msg)
        ? 409
        : /not\s+authorized|forbidden/i.test(msg)
        ? 403
        : 400;
      res.status(code).json({ success: false, error: e.message });
    }
  },
  clearRecommendation: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const id = Number(req.params.id);
      const result = await travelService.recommendOrClear(
        id,
        ctx.meEmpId,
        "CLEAR",
        ctx
      );
      res.json({ success: true, request: result });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  recommendDecision: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const id = Number(req.params.id);
      const action = String(req.body?.action || "").toUpperCase();
      if (!["RECOMMEND", "REJECT", "CLEAR"].includes(action))
        return res
          .status(400)
          .json({ success: false, error: "Invalid action" });
      const result = await travelService.recommendOrClear(
        id,
        ctx.meEmpId,
        action,
        ctx
      );
      res.json({ success: true, request: result });
    } catch (e) {
      const msg = String(e.message || "");
      const code = /not\s+found/i.test(msg)
        ? 404
        : /only\s+created/i.test(msg)
        ? 409
        : /not\s+authorized|forbidden/i.test(msg)
        ? 403
        : 400;
      res.status(code).json({ success: false, error: e.message });
    }
  },
  clearLast: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      const id = Number(req.params.id);
      if (!ctx.meEmpId && !ctx.isSuperAdmin)
        return res.status(403).json({ success: false, error: "Forbidden" });
      const full = await travelService.clearLastDecision(id, ctx.meEmpId, ctx);
      res.json({ success: true, request: full });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },

  // For manual entry: list reportees of a selected applicant
  reporteesOfApplicant: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      if (!(ctx.isSuperAdmin || ctx.isAccountsApprover))
        return res.status(403).json({ success: false, error: "Forbidden" });
      const applicantId = Number(req.params.id);
      if (!applicantId)
        return res
          .status(400)
          .json({ success: false, error: "Invalid applicant id" });
      const officerKey = String(applicantId);
      const employments = await prisma.employment.findMany({
        where: {
          is_deleted: false,
          is_current: true,
          reporting_officer_id: officerKey,
        },
        include: { employee: true },
      });
      const reportees = employments
        .map((e) => e.employee)
        .filter(Boolean)
        .map((e) => ({ id: e.id, full_name: e.full_name, cnic: e.cnic || "" }));
      res.json({ success: true, employees: reportees });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },

  // ================= Accounts Manual Entry (TADA) =================
  searchEmployees: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      if (!(ctx.isSuperAdmin || ctx.isAccountsApprover))
        return res.status(403).json({ success: false, error: "Forbidden" });
      const q = String(req.query.q || "").trim();
      const where = q
        ? {
            is_deleted: false,
            OR: [
              { full_name: { contains: q, mode: "insensitive" } },
              { cnic: { contains: q, mode: "insensitive" } },
            ],
          }
        : { is_deleted: false };
      const emps = await prisma.employee.findMany({
        where,
        orderBy: { full_name: "asc" },
        take: 50,
        select: { id: true, full_name: true, cnic: true },
      });
      res.json({ success: true, employees: emps });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },

  manualCreate: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      if (!(ctx.isSuperAdmin || ctx.isAccountsApprover))
        return res.status(403).json({ success: false, error: "Forbidden" });
      const data = req.body || {};
      const applicant_id = Number(data.applicant_id);
      if (!applicant_id)
        return res
          .status(400)
          .json({ success: false, error: "applicant_id is required" });
      if (!data.departure_date)
        return res
          .status(400)
          .json({ success: false, error: "departure_date is required" });
      if (!data.expected_return_date)
        return res
          .status(400)
          .json({ success: false, error: "expected_return_date is required" });
      const computedDays = travelService.computeTotalDays(
        data.departure_date,
        data.departure_time,
        data.expected_return_date
      );
      const attendeeIds = Array.isArray(data.employee_ids)
        ? data.employee_ids.map(Number).filter(Boolean)
        : [];
      const full = await travelService.createRequestOnBehalf(
        { ...ctx, meEmpId: applicant_id },
        data,
        attendeeIds,
        computedDays,
        ctx.meEmpId
      );
      res.json({ success: true, request: full });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },

  manualDecision: async (req, res) => {
    try {
      const ctx = await travelService.getAuthContext(req);
      if (!(ctx.isSuperAdmin || ctx.isAccountsApprover))
        return res.status(403).json({ success: false, error: "Forbidden" });
      const id = Number(req.params.id);
      const { stage, actor_employee_id, action } = req.body || {};
      const actorEmpId = Number(actor_employee_id);
      const act = String(action || "").toUpperCase();
      if (!["RECOMMEND", "REJECT", "APPROVE", "CLEAR"].includes(act))
        return res
          .status(400)
          .json({ success: false, error: "Invalid action" });
      const full = await travelService.manualDecision(
        id,
        { stage, actorEmpId, action: act },
        ctx
      );
      res.json({ success: true, request: full });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
};
