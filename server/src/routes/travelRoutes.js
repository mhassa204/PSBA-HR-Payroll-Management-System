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

// Recommender actions
router.post('/requests/:id/recommend', isAuthenticated, travelRequestController.recommend);
router.post('/requests/:id/recommend/clear', isAuthenticated, travelRequestController.clearRecommendation);

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
router.get('/expense-claims/pending-approvals', isAuthenticated, expenseClaimController.listPendingApprovals);
router.get('/expense-claims/all', isAuthenticated, expenseClaimController.listAll);
router.get('/expense-claims', isAuthenticated, authorizeAny(['travel.claim.read','travel.claim.create']), expenseClaimController.list);
router.post('/expense-claims', isAuthenticated, authorizeAny(['travel.claim.create','travel.claim.read']), expenseClaimController.create);
router.get('/expense-claims/:id', isAuthenticated, authorizeAny(['travel.claim.read','travel.claim.create']), expenseClaimController.getOne);
router.put('/expense-claims/:id', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.update);
router.delete('/expense-claims/:id', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.delete);

// Segments
router.post('/expense-claims/:id/segments', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.addSegment);
router.put('/expense-claims/:id/segments/:segmentId', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.updateSegment);
router.delete('/expense-claims/:id/segments/:segmentId', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.deleteSegment);

// Documents now exclude TICKET category
router.post('/expense-claims/:id/documents', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.uploadDocuments);
router.delete('/expense-claims/:id/documents/:docId', isAuthenticated, authorizeAny(['travel.claim.update','travel.claim.create']), expenseClaimController.deleteDocument);

// Submit Expense Claim
router.post('/expense-claims/:id/submit', isAuthenticated, authorizeAny(['travel.claim.submit','travel.claim.update','travel.claim.create']), expenseClaimController.submit);

// Expense Claim Approvals
router.post('/expense-claims/:id/decision', isAuthenticated, expenseClaimController.decide);

module.exports = router;
