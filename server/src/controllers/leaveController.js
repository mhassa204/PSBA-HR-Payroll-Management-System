const leaveService = require('../services/leaveService');

module.exports = {
  listApplyEmployees: async (req, res) => {
    try { const search = String(req.query.search||'').trim(); const employees = await leaveService.listApplyEmployees(req, search); res.json({ success:true, employees }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  listEmployees: async (req, res) => {
    try { const search = String(req.query.search||'').trim(); const data = await leaveService.listEmployeesWithSummary(search); res.json({ success:true, employees: data.employees, activeBank: data.activeBank }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  getEmployeeLeaves: async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      const perms = req.session?.user?.permissions || [];
      const userEmpId = req.session?.user?.employee_id || null;
      const hasGlobalRead = perms.includes('*') || perms.includes('leaves.read') || perms.includes('employees.read');
      if (!hasGlobalRead && perms.includes('leaves.apply')) {
        const isSelf = userEmpId && Number(employeeId) === Number(userEmpId);
        const ok = isSelf ? true : await leaveService.checkSubordinate(employeeId, req);
        if (!ok) return res.status(403).json({ success:false, error:'Forbidden' });
      }
      const data = await leaveService.getEmployeeLeavesWithSummary(employeeId);
      res.json({ success:true, leaves: data.leaves, summary: data.summary });
    } catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  createLeaves: async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
  const { date, type, remarks, start, end, dates, duty_from, duty_to } = req.body || {};
      const perms = req.session?.user?.permissions || [];
      const userEmpId = req.session?.user?.employee_id || null;
      const hasCreate = perms.includes('*') || perms.includes('leaves.create');
      const hasApply = perms.includes('leaves.apply');
      if (!hasCreate && hasApply) {
        const isSelf = userEmpId && Number(employeeId) === Number(userEmpId);
        const ok = isSelf ? true : await leaveService.checkSubordinate(employeeId, req);
        if (!ok) return res.status(403).json({ success:false, error:'Forbidden' });
      }
      if (!type) return res.status(400).json({ success:false, error:'type is required' });
  const result = await leaveService.createLeaves({ employeeId, type, remarks, date, start, end, dates, duty_from, duty_to });
      res.status(201).json({ success:true, ...result });
    } catch(e){
      const clientErrors = ['Invalid start/end','Invalid date','Provide date or start/end or dates[]','No valid dates to insert'];
      if (clientErrors.includes(e.message)) return res.status(400).json({ success:false, error:e.message });
      console.error('Create leaves error:', e);
      res.status(500).json({ success:false, error:e.message });
    }
  },
  updateLeave: async (req, res) => {
    try { const id = Number(req.params.id); const { date, type, remarks, duty_from, duty_to } = req.body || {}; const data = {}; if (date) data.date = new Date(date); if (type) data.type=String(type); if (remarks!==undefined) data.remarks=remarks; // duty_from/to are not stored separately in DB yet
      const updated = await leaveService.updateLeave(id, data); res.json({ success:true, leave: updated }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  updateStatus: async (req, res) => {
    try { const id = Number(req.params.id); const { status } = req.body || {}; const allowed=['PENDING','APPROVED','REJECTED']; if(!allowed.includes(String(status))) return res.status(400).json({ success:false, error:'Invalid status' }); const updated = await leaveService.updateStatus(id, status); res.json({ success:true, leave: updated }); }
    catch(e){ res.status(500).json({ success:false, error:e.message }); }
  },
  deleteLeave: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const perms = req.session?.user?.permissions || [];
      const userEmpId = req.session?.user?.employee_id || null;
      const hasFullDelete = perms.includes('*') || perms.includes('leaves.delete');
      if (hasFullDelete){ const updated = await leaveService.softDeleteFull(id); return res.json({ success:true, leave: updated }); }
      if (perms.includes('leaves.apply')){
        const leave = await leaveService.getLeaveById(id);
        if (!leave || leave.is_deleted) return res.status(404).json({ success:false, error:'Not found' });
        if (leave.status !== 'PENDING') return res.status(400).json({ success:false, error:'Only pending leaves can be deleted' });
        const isSelf = userEmpId && Number(leave.employee_id) === Number(userEmpId);
        const ok = isSelf ? true : await leaveService.checkSubordinate(leave.employee_id, req);
        if (!ok) return res.status(403).json({ success:false, error:'Forbidden' });
        const updated = await leaveService.softDeleteFull(id); return res.json({ success:true, leave: updated });
      }
      return res.status(403).json({ success:false, error:'Forbidden' });
    } catch(e){ res.status(500).json({ success:false, error:e.message }); }
  }
};
