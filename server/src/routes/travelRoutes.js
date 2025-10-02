const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize, authorizeAny } = require('../middleware/auth');
const travelRequestController = require('../controllers/travel/travelRequestController');
const expenseClaimController = require('../controllers/travel/expenseClaimController');

// Return reportees + self for logged-in user (for employee selector)
router.get('/employees/reportees', isAuthenticated, travelRequestController.reportees);
router.get('/employees/search', isAuthenticated, travelRequestController.searchEmployees); // New route for employee search
// New: reportees of a specific employee (used by manual entry after selecting applicant)
router.get('/employees/:id/reportees', isAuthenticated, travelRequestController.reporteesOfApplicant);

// Travel Requests CRUD (simplified fields)
router.get('/requests', isAuthenticated, travelRequestController.listManage);

// List pending approvals eligible for current user (placed before /requests/:id to avoid param capture)
router.get('/requests/pending-approvals', isAuthenticated, travelRequestController.listPendingApprovals);

// Recommender actions
router.post('/requests/:id/recommend', isAuthenticated, travelRequestController.recommend);
router.post('/requests/:id/recommend/clear', isAuthenticated, travelRequestController.clearRecommendation);
router.post('/requests/:id/recommend/decision', isAuthenticated, travelRequestController.recommendDecision);

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

// ================= Accounts Manual Entry (TADA) =================
// Create a request on behalf of any employee
router.post('/requests/manual', isAuthenticated, travelRequestController.manualCreate);
// Record recommendation/approval with selected actor identity
router.post('/requests/:id/manual/decision', isAuthenticated, travelRequestController.manualDecision);

// Expense Claims
router.get('/expense-claims/eligible', isAuthenticated, expenseClaimController.eligible);
router.get('/expense-claims/pending-approvals', isAuthenticated, expenseClaimController.listPendingApprovals);
router.get('/expense-claims/all', isAuthenticated, expenseClaimController.listAll);
// Accounts processing: filter verified claims and create tranches (place BEFORE dynamic :id routes)
router.get('/expense-claims/accounts', isAuthenticated, expenseClaimController.listForAccounts);
router.post('/expense-claims/tranches', isAuthenticated, expenseClaimController.createTranche);
router.get('/expense-claims/tranches', isAuthenticated, expenseClaimController.listTranches);
router.get('/expense-claims/tranches/:id/export', isAuthenticated, expenseClaimController.exportTranche);
// Proxy documents for claims
router.get('/expense-claims/document', isAuthenticated, expenseClaimController.docProxy);
// Relax permissions: rely on service._canAccess and business rules
router.get('/expense-claims', isAuthenticated, expenseClaimController.list);
router.post('/expense-claims', isAuthenticated, expenseClaimController.create);
router.get('/expense-claims/:id', isAuthenticated, expenseClaimController.getOne);
router.put('/expense-claims/:id', isAuthenticated, expenseClaimController.update);
router.delete('/expense-claims/:id', isAuthenticated, authorizeAny(['travel.manage','travel.delete']), expenseClaimController.delete);

// Segments
router.post('/expense-claims/:id/segments', isAuthenticated, expenseClaimController.addSegment);
router.put('/expense-claims/:id/segments/:segmentId', isAuthenticated, expenseClaimController.updateSegment);
router.delete('/expense-claims/:id/segments/:segmentId', isAuthenticated, expenseClaimController.deleteSegment);

// Documents upload: allow any category (FUEL, TOLL, PICTURE, REPORT, OTHER); supports multi-file upload
router.post('/expense-claims/:id/documents', isAuthenticated, expenseClaimController.uploadDocuments);
router.delete('/expense-claims/:id/documents/:docId', isAuthenticated, expenseClaimController.deleteDocument);

// Submit Expense Claim
router.post('/expense-claims/:id/submit', isAuthenticated, expenseClaimController.submit);

// Expense Claim Approvals
router.post('/expense-claims/:id/decision', isAuthenticated, expenseClaimController.decide);

module.exports = router;
