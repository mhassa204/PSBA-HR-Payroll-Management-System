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
      const claims = await service.listClaims(employee_id, isSuperAdmin);
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
      const canCreateClaim =
        ctx.isSuperAdmin ||
        perms.includes("travel.claim.create") ||
        perms.includes("*");
      // Personal account (linked to employee)
      if (ctx.meEmpId) {
        if (!canCreateClaim)
          return res.status(403).json({ success: false, error: "Forbidden" });
        const claim = await service.createClaim(ctx.meEmpId, data);
        return res.json({ success: true, claim });
      }
      // Department account path: must provide employee_id and it must be BPS < 17
      const employee_id = Number(data.employee_id);
      if (!employee_id)
        return res
          .status(400)
          .json({
            success: false,
            error: "employee_id is required for department account",
          });
      const emp = await prisma.employment.findFirst({
        where: { employee_id, is_current: true, is_deleted: false },
        include: { scale_grade: true },
      });
      const isLowBps = !!(
        emp?.scale_grade &&
        emp.scale_grade.category === "BPS" &&
        Number(emp.scale_grade.level || 0) < 17
      );
      if (!isLowBps)
        return res
          .status(403)
          .json({
            success: false,
            error: "Only BPS < 17 employees are allowed via department account",
          });
      // Call service as if the applicant is the low-BPS employee
      const claim = await service.createClaim(employee_id, data);
      return res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  getOne: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const claim = await service.getClaim(
        Number(req.params.id),
        employee_id,
        isSuperAdmin
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
      const claim = await service.addSegment(
        req.params.id,
        employee_id,
        isSuperAdmin,
        req.body || {}
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  updateSegment: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const claim = await service.updateSegment(
        req.params.id,
        req.params.segmentId,
        employee_id,
        isSuperAdmin,
        req.body || {}
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  deleteSegment: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const claim = await service.deleteSegment(
        req.params.id,
        req.params.segmentId,
        employee_id,
        isSuperAdmin
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
        const claim = await service.addDocuments(
          req.params.id,
          employee_id,
          isSuperAdmin,
          req.files || [],
          req.query.category
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
      const claim = await service.deleteDocument(
        req.params.id,
        req.params.docId,
        employee_id,
        isSuperAdmin
      );
      res.json({ success: true, claim });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  delete: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const result = await service.deleteClaim(
        req.params.id,
        employee_id,
        isSuperAdmin
      );
      res.json(result);
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  },
  submit: async (req, res) => {
    try {
      // Prefer employee_id from context; if missing (department account), use department head as actor
      const ctx =
        await require("../../services/travel/travelRequestService").getAuthContext(
          req
        );
      let actorEmpId = ctx.meEmpId || null;
      if (!actorEmpId && req.session.user?.department_id) {
        const deptId = Number(req.session.user.department_id);
        const dept = await prisma.department.findFirst({
          where: { id: deptId, is_deleted: false },
          include: { head: true },
        });
        actorEmpId = Number(dept?.head?.id || 0) || null;
        if (!actorEmpId)
          return res
            .status(400)
            .json({
              success: false,
              error:
                "Department head not set; cannot record actor for submission",
            });
      }
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
      const claim = await service.submitClaim(
        req.params.id,
        actorEmpId,
        ctx.isSuperAdmin,
        actorLabel
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
