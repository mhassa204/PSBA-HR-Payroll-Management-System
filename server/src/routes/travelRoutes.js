const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize, authorizeAny } = require('../middleware/auth');
const travelRequestController = require('../controllers/travel/travelRequestController');
const expenseClaimController = require('../controllers/travel/expenseClaimController');

// Return reportees + self for logged-in user (for employee selector)
router.get('/employees/reportees', isAuthenticated, travelRequestController.reportees);

// Travel Requests CRUD (simplified fields)
router.get('/requests', isAuthenticated, travelRequestController.listManage);

// List pending approvals eligible for current user (placed before /requests/:id to avoid param capture)
router.get('/requests/pending-approvals', isAuthenticated, travelRequestController.listPendingApprovals);

// List only current user's own requests (allowed based on location/grade rules)
router.get('/requests/mine', isAuthenticated, travelRequestController.listMine);
router.post('/requests', isAuthenticated, travelRequestController.create);
router.put('/requests/:id', isAuthenticated, authorizeAny(['travel.manage','travel.update']), travelRequestController.update);
router.delete('/requests/:id', isAuthenticated, authorizeAny(['travel.manage','travel.delete']), travelRequestController.remove);
router.get('/requests/:id', isAuthenticated, travelRequestController.getOne);
router.post('/requests/:id/decision', isAuthenticated, travelRequestController.legacyDecision);

// Capabilities for current user (frontend can use this to gate UI)
router.get('/me/capabilities', isAuthenticated, travelRequestController.capabilities);

// Flexible status update (dropdown driven) allowing Ops/DG to toggle CREATED/APPROVED/REJECTED within their scope
router.patch('/requests/:id/status', isAuthenticated, travelRequestController.updateStatusFlexible);

// Expense Claims
router.get('/expense-claims/eligible', isAuthenticated, expenseClaimController.eligible);
router.post('/expense-claims', isAuthenticated, authorizeAny(['travel.claim.create','travel.claim.read']), expenseClaimController.create);
router.get('/expense-claims/:id', isAuthenticated, authorizeAny(['travel.claim.read','travel.claim.create']), expenseClaimController.getOne);
router.put('/expense-claims/:id', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.update);

// Segments
router.post('/expense-claims/:id/segments', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.addSegment);
router.put('/expense-claims/:id/segments/:segmentId', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.updateSegment);
router.delete('/expense-claims/:id/segments/:segmentId', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.deleteSegment);

// Documents
router.post('/expense-claims/:id/documents', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.uploadDocuments);
router.delete('/expense-claims/:id/documents/:docId', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.deleteDocument);

module.exports = router;
