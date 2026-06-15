const adminService = require('../services/adminService');

module.exports = {
  deletedSummary: async (req, res) => {
    try {
      const data = await adminService.getDeletedSummary();
      res.json({ success: true, data });
    } catch (e) { console.error(e); res.status(500).json({ success:false, error:'Failed to fetch deleted records summary' }); }
  },
  deletedEmployees: async (req, res) => {
    try {
      const data = await adminService.getDeletedEmployees(req.query);
      res.json({ success: true, data });
    } catch(e){ console.error(e); res.status(500).json({ success:false, error:'Failed to fetch deleted employees' }); }
  },
  restoreEmployee: async (req, res) => {
    try {
      const { id } = req.params;
      const record = await adminService.ensureSoftDeleted('employee', id);
      if (!record) return res.status(404).json({ success:false, error:'Soft-deleted employee not found' });
      const result = await adminService.restoreEmployee(id);
      res.json({ success:true, message: result.message, data: result.restoredEmployee });
    } catch(e){ console.error(e); res.status(500).json({ success:false, error:'Failed to restore employee' }); }
  },
  deletedDepartments: async (req, res) => {
    try { const data = await adminService.getDeletedDepartments(); res.json({ success:true, data }); }
    catch(e){ console.error(e); res.status(500).json({ success:false, error:'Failed to fetch deleted departments' }); }
  },
  restoreDepartment: async (req, res) => {
    try {
      const { id } = req.params;
      const record = await adminService.ensureSoftDeleted('department', id);
      if (!record) return res.status(404).json({ success:false, error:'Soft-deleted department not found' });
      const result = await adminService.restoreDepartment(id);
      res.json({ success:true, message: result.message, data: result.restoredDepartment });
    } catch(e){ console.error(e); res.status(500).json({ success:false, error:'Failed to restore department' }); }
  },
  deletedDesignations: async (req, res) => {
    try { const data = await adminService.getDeletedDesignations(); res.json({ success:true, data }); }
    catch(e){ console.error(e); res.status(500).json({ success:false, error:'Failed to fetch deleted designations' }); }
  },
  restoreDesignation: async (req, res) => {
    try {
      const { id } = req.params;
      const record = await adminService.ensureSoftDeleted('designation', id);
      if (!record) return res.status(404).json({ success:false, error:'Soft-deleted designation not found' });
      const result = await adminService.restoreDesignation(id);
      res.json({ success:true, message: result.message, data: result.restoredDesignation });
    } catch(e){ console.error(e); res.status(500).json({ success:false, error:'Failed to restore designation' }); }
  },
  manualCleanup: async (req, res) => {
    try {
      const { daysOld = 90 } = req.body;
      if (daysOld < 1 || daysOld > 365) return res.status(400).json({ success:false, error:'daysOld must be between 1 and 365' });
      const result = await adminService.manualCleanup(daysOld);
      res.json({ success:true, message: result.message, data: result.results });
    } catch(e){ console.error(e); res.status(500).json({ success:false, error:'Failed to perform cleanup' }); }
  },
  hardDelete: async (req, res) => {
    try {
      const { model, id } = req.params;
      const validModels = ['employee','employment','department','designation'];
      if (!validModels.includes(model)) return res.status(400).json({ success:false, error:'Invalid model specified' });
      const record = await adminService.ensureSoftDeleted(model, id);
      if (!record) return res.status(404).json({ success:false, error:`Soft-deleted ${model} not found` });
      const result = await adminService.hardDelete(model, id);
      if (result.success) res.json({ success:true, message: result.message, data: result.deletedRecord || result });
      else res.status(500).json({ success:false, error: result.message });
    } catch(e){ console.error(e); res.status(500).json({ success:false, error:'Failed to perform hard delete' }); }
  }
};
