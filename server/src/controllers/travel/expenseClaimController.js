const service = require("../../services/travel/expenseClaimService");
const { uploadTravelExpenseClaimDocs } = require("../../config/multer");
const path = require("path");
const fs = require("fs");
const travelReqService = require("../../services/travel/travelRequestService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  eligible: async (req, res) => {
    try {
      const { employee_id } = await service.getAuthContext(req);
      const { userEmail } =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      const list = await service.listEligibleRequests(employee_id, userEmail);
      res.json({ success: true, requests: list });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  list: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const deptId = Number(req.session.user?.department_id || 0);
      let claims;
      if (employee_id) {
        claims = await service.listClaims(employee_id, isSuperAdmin);
      } else if (deptId) {
        claims = await service.listClaimsForDepartment(deptId);
      } else {
        claims = [];
      }
      res.json({ success: true, claims });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  create: async (req, res) => {
    try {
      const ctx = await travelReqService.getAuthContext(req);
      const data = req.body || {};
      const perms = Array.isArray(req.session.user?.permissions)
        ? req.session.user.permissions
        : [];
      // Allow claim creation if:
      // - Super Admin
      // - Explicit claim-create permission
      // - Wildcard
      // - Or user can create travel requests (covers Management role), via ctx.canCreateOrOwn
      const canCreateClaim =
        ctx.isSuperAdmin ||
        perms.includes("*") ||
        perms.includes("travel.claim.create") ||
        ctx.canCreateOrOwn;
      // Personal account (linked to employee)
      if (ctx.meEmpId) {
        if (!canCreateClaim)
          return res.status(403).json({ success: false, error: "Forbidden" });
        const claim = await service.createClaim(ctx.meEmpId, data);
        return res.json({ success: true, claim });
      }
      // Department account path
      // For within-city claims (no travel_request_id): allow only for low-BPS employees (BPS < 17)
      // For request-linked claims: act on behalf of the request applicant to satisfy service checks
      const selectedEmpId = Number(data.employee_id);
      if (!selectedEmpId)
        return res.status(400).json({
          success: false,
          error: "employee_id is required for department account",
        });

      let actorEmpIdForService = selectedEmpId; // default for within-city

      if (data.travel_request_id) {
        // Request-linked: fetch the request and use its applicant as the acting employee
        const reqRow = await prisma.travelRequest.findUnique({
          where: { id: Number(data.travel_request_id) },
          select: { id: true, applicant_id: true, status: true },
        });
        if (!reqRow)
          return res
            .status(404)
            .json({ success: false, error: "Travel request not found" });
        if (reqRow.status !== "APPROVED")
          return res
            .status(400)
            .json({ success: false, error: "Request not approved" });
        actorEmpIdForService = Number(reqRow.applicant_id);
        // Note: BPS rule does NOT apply to request-linked claims here; applicant may be BPS 17+
      } else {
        // Within-city path: enforce low-grade (non-management) and same-department
        const deptIdAcc = Number(req.session.user?.department_id || 0);
        const emp = await prisma.employment.findFirst({
          where: {
            employee_id: selectedEmpId,
            is_current: true,
            is_deleted: false,
          },
          include: { scale_grade: true, department: true },
        });
        if (!emp)
          return res.status(404).json({
            success: false,
            error: "Employee not found or not active",
          });
        const cat = String(emp.scale_grade?.category || "").toUpperCase();
        const lvl = Number(emp.scale_grade?.level || 0);
        const isLowGrade = cat === "BPS" ? lvl < 17 : true; // Treat non-BPS categories (Level/Grade) as low-grade
        if (!isLowGrade)
          return res.status(403).json({
            success: false,
            error:
              "Only non-management employees (BPS < 17 or non-BPS) can be claimed within-city via department account",
          });
        // Note: Do not enforce same-department; reportee/ownership will be enforced in later stages
      }

      // Call service with computed actor (applicant for request-linked; selected employee for within-city)
      const claim = await service.createClaim(actorEmpIdForService, data);
      return res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  getOne: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const department_id = Number(req.session.user?.department_id || 0);
      const claim = await service.getClaim(
        Number(req.params.id),
        employee_id,
        isSuperAdmin,
        department_id
      );
      if (!claim)
        return res.status(404).json({ success: false, error: "Not found" });
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  update: async (req, res) => {
    try {
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      const claim = await service.updateClaim(
        Number(req.params.id),
        ctx.meEmpId,
        ctx.isSuperAdmin,
        req.body || {},
        ctx
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  addSegment: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const department_id = Number(req.session.user?.department_id || 0);
      const claim = await service.addSegment(
        req.params.id,
        employee_id,
        isSuperAdmin,
        req.body || {},
        department_id
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  updateSegment: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const department_id = Number(req.session.user?.department_id || 0);
      const claim = await service.updateSegment(
        req.params.id,
        req.params.segmentId,
        employee_id,
        isSuperAdmin,
        req.body || {},
        department_id
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  deleteSegment: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const department_id = Number(req.session.user?.department_id || 0);
      const claim = await service.deleteSegment(
        req.params.id,
        req.params.segmentId,
        employee_id,
        isSuperAdmin,
        department_id
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  uploadDocuments: [
    uploadTravelExpenseClaimDocs.array("files"),
    async (req, res) => {
      try {
        const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
        const department_id = Number(req.session.user?.department_id || 0);
        const claim = await service.addDocuments(
          req.params.id,
          employee_id,
          isSuperAdmin,
          req.files || [],
          req.query.category,
          department_id
        );
        res.json({ success: true, claim });
      } catch (e) {
        res.status(400).json({ success: false, error: e.message });
      }
    },
  ],
  deleteDocument: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const department_id = Number(req.session.user?.department_id || 0);
      const claim = await service.deleteDocument(
        req.params.id,
        req.params.docId,
        employee_id,
        isSuperAdmin,
        department_id
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  delete: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const department_id = Number(req.session.user?.department_id || 0);
      const result = await service.deleteClaim(
        req.params.id,
        employee_id,
        isSuperAdmin,
        department_id
      );
      res.json(result);
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  submit: async (req, res) => {
    try {
      // Prefer employee_id from context; for department accounts, do NOT force a head actor
      // so that service can authorize via same-department fallback. Actor label will still record
      // department origin and submitting email.
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      // If user is linked to an employee, record them; else keep null for dept account
      const actorEmpId = ctx.meEmpId || null;
      const deptName = (
        req.session.user?.department_id &&
        (await prisma.department.findFirst({
          where: {
            id: Number(req.session.user.department_id),
            is_deleted: false,
          },
        }))
      )?.name;
      const email = String(req.session.user?.email || "");
      // Include [DEPT] when department account submits; always include email
      const actorLabel =
        `${deptName ? `[DEPT] ${deptName} Department` : ""}${
          email ? `${deptName ? " | " : ""}submitted by ${email}` : ""
        }` || null;
      const department_id = Number(req.session.user?.department_id || 0);
      const claim = await service.submitClaim(
        req.params.id,
        actorEmpId,
        ctx.isSuperAdmin,
        actorLabel,
        department_id
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  listPendingApprovals: async (req, res) => {
    try {
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      const claims = await service.listPendingApprovals(ctx);
      res.json({ success: true, claims });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  decide: async (req, res) => {
    try {
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      const meEmpId = ctx.meEmpId;
      if (!meEmpId)
        return res
          .status(400)
          .json({ success: false, error: "User not linked" });
      const { action, remarks } = req.body || {};
      const claim = await service.decideClaim(
        req.params.id,
        meEmpId,
        ctx,
        action,
        remarks
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  listAll: async (req, res) => {
    try {
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      const claims = await service.listAllForApprovers({
        ...ctx,
        query: req.query || {},
      });
      res.json({ success: true, claims });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  listForAccounts: async (req, res) => {
    try {
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      const claims = await service.listForAccounts(ctx, req.query || {});
      res.json({ success: true, claims });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  createTranche: async (req, res) => {
    try {
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      const { title, notes, claimIds } = req.body || {};
      const tranche = await service.createTranche(
        ctx,
        title,
        notes,
        Array.isArray(claimIds) ? claimIds : []
      );
      res.json({ success: true, tranche });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  listTranches: async (req, res) => {
    try {
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      const tranches = await service.listTranches(ctx);
      res.json({ success: true, tranches });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  exportTranche: async (req, res) => {
    try {
      const { csv, code } = await service.exportTrancheCsv(req.params.id);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="tranche-${code}.csv"`
      );
      res.send(csv);
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  // Proxy to stream claim documents (images/PDFs) via API (CORS/auth safe)
  docProxy: async (req, res) => {
    try {
      let p = String(req.query.path || "");
      if (!p || !/^uploads[\\\/]/i.test(p))
        return res.status(400).json({ success: false, error: "Invalid path" });
      // Normalize and map to actual Uploads directory (case-insensitive)
      p = p.replace(/^uploads[\\\/]/i, "Uploads/");
      const projectRoot = path.resolve(__dirname, "../../..");
      const uploadsRoot = path.resolve(projectRoot, "Uploads");
      const fullPath = path.resolve(projectRoot, p);
      if (!fullPath.startsWith(uploadsRoot))
        return res
          .status(400)
          .json({ success: false, error: "Path traversal blocked" });
      if (!fs.existsSync(fullPath))
        return res
          .status(404)
          .json({ success: false, error: "File not found" });
      res.setHeader("Cache-Control", "private, max-age=60");
      res.setHeader("Content-Disposition", "inline");
      return res.sendFile(fullPath);
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  },
};
