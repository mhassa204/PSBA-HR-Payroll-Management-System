const service = require('../../services/travel/expenseClaimService');
const { uploadTravelExpenseClaimDocs } = require('../../config/multer');

module.exports = {
  eligible: async (req, res) => {
    try {
      const { employee_id } = await service.getAuthContext(req);
      const list = await service.listEligibleRequests(employee_id);
      res.json({ success: true, requests: list });
    } catch (e) { res.status(500).json({ success:false, error: e.message }); }
  },
  list: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const claims = await service.listClaims(employee_id, isSuperAdmin);
      res.json({ success: true, claims });
    } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },
  create: async (req, res) => {
    try {
      const { employee_id } = await service.getAuthContext(req);
      const claim = await service.createClaim(employee_id, req.body||{});
      res.json({ success: true, claim });
    } catch (e) { res.status(400).json({ success:false, error: e.message }); }
  },
  getOne: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const claim = await service.getClaim(Number(req.params.id), employee_id, isSuperAdmin);
      if(!claim) return res.status(404).json({ success:false, error: 'Not found' });
      res.json({ success:true, claim });
    } catch (e){ res.status(400).json({ success:false, error: e.message }); }
  },
  update: async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const claim = await service.updateClaim(Number(req.params.id), employee_id, isSuperAdmin, req.body||{});
      res.json({ success:true, claim });
    } catch (e){ res.status(400).json({ success:false, error: e.message }); }
  },
  addSegment: async (req, res) => {
    try { const { employee_id, isSuperAdmin } = await service.getAuthContext(req); const claim = await service.addSegment(req.params.id, employee_id, isSuperAdmin, req.body||{}); res.json({ success:true, claim }); } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },
  updateSegment: async (req, res) => {
    try { const { employee_id, isSuperAdmin } = await service.getAuthContext(req); const claim = await service.updateSegment(req.params.id, req.params.segmentId, employee_id, isSuperAdmin, req.body||{}); res.json({ success:true, claim }); } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },
  deleteSegment: async (req, res) => {
    try { const { employee_id, isSuperAdmin } = await service.getAuthContext(req); const claim = await service.deleteSegment(req.params.id, req.params.segmentId, employee_id, isSuperAdmin); res.json({ success:true, claim }); } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },
  uploadDocuments: [uploadTravelExpenseClaimDocs.array('files'), async (req, res) => {
    try {
      const { employee_id, isSuperAdmin } = await service.getAuthContext(req);
      const claim = await service.addDocuments(req.params.id, employee_id, isSuperAdmin, req.files||[], req.query.category);
      res.json({ success:true, claim });
    } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  }],
  deleteDocument: async (req, res) => {
    try { const { employee_id, isSuperAdmin } = await service.getAuthContext(req); const claim = await service.deleteDocument(req.params.id, req.params.docId, employee_id, isSuperAdmin); res.json({ success:true, claim }); } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },
  delete: async (req, res) => {
    try { const { employee_id, isSuperAdmin } = await service.getAuthContext(req); const result = await service.deleteClaim(req.params.id, employee_id, isSuperAdmin); res.json(result); } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  },
  submit: async (req, res) => {
    try { const { employee_id, isSuperAdmin } = await service.getAuthContext(req); const claim = await service.submitClaim(req.params.id, employee_id, isSuperAdmin); res.json({ success:true, claim }); } catch(e){ res.status(400).json({ success:false, error: e.message }); }
  }
};
