const leaveService = require("../services/leaveService");

module.exports = {
  listApplyEmployees: async (req, res) => {
    try {
      const search = String(req.query.search || "").trim();
      const employees = await leaveService.listApplyEmployees(req, search);
      res.json({ success: true, employees });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  listEmployees: async (req, res) => {
    try {
      const search = String(req.query.search || "").trim();
      const data = await leaveService.listEmployeesWithSummary(search);
      res.json({
        success: true,
        employees: data.employees,
        activeBank: data.activeBank,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  getEmployeeLeaves: async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      const perms = req.session?.user?.permissions || [];
      const userEmpId = req.session?.user?.employee_id || null;
      const hasGlobalRead =
        perms.includes("*") ||
        perms.includes("leaves.read") ||
        perms.includes("employees.read");
      if (!hasGlobalRead && perms.includes("leaves.apply")) {
        const isSelf = userEmpId && Number(employeeId) === Number(userEmpId);
        const ok = isSelf
          ? true
          : (await leaveService.checkSubordinate(employeeId, req)) ||
            (await leaveService.checkDeptOrLocation(employeeId, req));
        if (!ok)
          return res.status(403).json({ success: false, error: "Forbidden" });
      }
      const data = await leaveService.getEmployeeLeavesWithSummary(employeeId);
      res.json({ success: true, leaves: data.leaves, summary: data.summary });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  listApprovals: async (req, res) => {
    try {
      const items = await leaveService.listApprovalsForUser(req);
      res.json({ success: true, approvals: items });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  listAllApprovals: async (req, res) => {
    try {
      const items = await leaveService.listAllApprovalsForUser(req);
      res.json({ success: true, approvals: items });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  actOnLeave: async (req, res) => {
    try {
      const leaveId = Number(req.params.id);
      const userId = req.session?.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, error: "Unauthorized" });
      const { action, comments } = req.body || {};
      const updated = await leaveService.actOnLeave(
        {
          leaveId,
          userId,
          action,
          comments,
        },
        req
      );
      res.json({ success: true, leave: updated });
    } catch (e) {
      const client = [
        "Invalid action",
        "Not found",
        "Leave already finalized",
        "Not authorized for this stage",
      ];
      if (client.includes(e.message))
        return res.status(400).json({ success: false, error: e.message });
      res.status(500).json({ success: false, error: e.message });
    }
  },
  undoAction: async (req, res) => {
    try {
      const leaveId = Number(req.params.id);
      const userId = req.session?.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, error: "Unauthorized" });
      const result = await leaveService.undoLastAction({ leaveId, userId });
      res.json({ success: true, ...result });
    } catch (e) {
      const client = [
        "Not found",
        "Nothing to undo",
        "Not authorized to undo",
        "Cannot undo finalized",
      ];
      if (client.includes(e.message))
        return res.status(400).json({ success: false, error: e.message });
      res.status(500).json({ success: false, error: e.message });
    }
  },
  createLeaves: async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      const {
        date,
        type,
        remarks,
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
      } = req.body || {};
      const perms = req.session?.user?.permissions || [];
      const userEmpId = req.session?.user?.employee_id || null;
      const hasCreate = perms.includes("*") || perms.includes("leaves.create");
      const hasApply = perms.includes("leaves.apply");
      if (!hasCreate && hasApply) {
        const isSelf = userEmpId && Number(employeeId) === Number(userEmpId);
        const ok = isSelf
          ? true
          : (await leaveService.checkSubordinate(employeeId, req)) ||
            (await leaveService.checkDeptOrLocation(employeeId, req));
        if (!ok)
          return res.status(403).json({ success: false, error: "Forbidden" });
      }
      if (!type)
        return res
          .status(400)
          .json({ success: false, error: "type is required" });
      const result = await leaveService.createLeaves(
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
          submission_time,
          custom_type,
          backup_employee_id,
          backup_duty_from,
          backup_duty_to,
          documents,
          routes,
        },
        req
      );
      res.status(201).json({ success: true, ...result });
    } catch (e) {
      const clientErrors = [
        "Invalid start/end",
        "Invalid date",
        "Provide date or start/end or dates[]",
        "No valid dates to insert",
      ];
      if (clientErrors.includes(e.message))
        return res.status(400).json({ success: false, error: e.message });
      console.error("Create leaves error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  },
  // Search approver users excluding Establishment and Super Admin
  searchApproverUsers: async (req, res) => {
    try {
      const search = String(req.query.search || "").trim();
      const users = await leaveService.searchApproverUsers(search);
      res.json({ success: true, users });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  updateLeave: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const {
        date,
        type,
        remarks,
        duty_from,
        duty_to,
        // New fields
        submission_time,
        custom_type,
        backup_employee_id,
        backup_duty_from,
        backup_duty_to,
        documents,
      } = req.body || {};
      const data = {};
      if (date) data.date = new Date(date);
      if (type) data.type = String(type);
      if (remarks !== undefined) data.remarks = remarks;
      // New fields
      if (submission_time) data.submission_time = new Date(submission_time);
      if (custom_type !== undefined) data.custom_type = custom_type;
      if (backup_employee_id !== undefined)
        data.backup_employee_id = backup_employee_id;
      if (backup_duty_from !== undefined)
        data.backup_duty_from = backup_duty_from;
      if (backup_duty_to !== undefined) data.backup_duty_to = backup_duty_to;
      if (documents !== undefined)
        data.documents = documents ? JSON.stringify(documents) : null;
      const updated = await leaveService.updateLeave(id, data);
      res.json({ success: true, leave: updated });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  updateStatus: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body || {};
      const userId = req.session?.user?.id;
      const allowed = ["PENDING", "APPROVED", "REJECTED"];
      if (!allowed.includes(String(status)))
        return res
          .status(400)
          .json({ success: false, error: "Invalid status" });
      const updated = await leaveService.updateStatus(id, status, userId);
      res.json({ success: true, leave: updated });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  deleteLeave: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const perms = req.session?.user?.permissions || [];
      const userEmpId = req.session?.user?.employee_id || null;
      const hasFullDelete =
        perms.includes("*") || perms.includes("leaves.delete");
      if (hasFullDelete) {
        const updated = await leaveService.softDeleteFull(id);
        return res.json({ success: true, leave: updated });
      }
      if (perms.includes("leaves.apply")) {
        const leave = await leaveService.getLeaveById(id);
        if (!leave || leave.is_deleted)
          return res.status(404).json({ success: false, error: "Not found" });
        if (leave.status !== "PENDING")
          return res.status(400).json({
            success: false,
            error: "Only pending leaves can be deleted",
          });
        const isSelf =
          userEmpId && Number(leave.employee_id) === Number(userEmpId);
        const ok = isSelf
          ? true
          : await leaveService.checkSubordinate(leave.employee_id, req);
        if (!ok)
          return res.status(403).json({ success: false, error: "Forbidden" });
        const updated = await leaveService.softDeleteFull(id);
        return res.json({ success: true, leave: updated });
      }
      return res.status(403).json({ success: false, error: "Forbidden" });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  },
  getBackupEmployees: async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { applicantId } = req.query;
      const employees = await leaveService.getBackupEmployees(
        user,
        applicantId
      );
      res.json({ success: true, employees });
    } catch (e) {
      console.error("Get backup employees error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  },
  uploadDocuments: async (req, res) => {
    try {
      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "No files uploaded" });
      }

      const uploadedFiles = [];
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB

      for (const file of req.files) {
        // Validate file type
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            error: `Invalid file type: ${file.originalname}. Allowed types: PDF, DOC, DOCX, JPG, PNG, GIF`,
          });
        }

        // Validate file size
        if (file.size > maxSize) {
          return res.status(400).json({
            success: false,
            error: `File too large: ${file.originalname}. Maximum size: 10MB`,
          });
        }

        uploadedFiles.push({
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: `/uploads/leaves/${file.filename}`,
        });
      }

      res.json({ success: true, files: uploadedFiles });
    } catch (e) {
      console.error("Upload documents error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  },
};
