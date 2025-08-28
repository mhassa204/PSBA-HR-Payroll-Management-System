const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { isAuthenticated, authorize } = require('../middleware/auth');

router.get('/', isAuthenticated, authorize('roster.read'), rosterController.list);

// Helper endpoints for roster creation under roster permissions
router.get('/helpers/officer-employees/list', isAuthenticated, authorize('roster.create'), rosterController.employeesForLoggedInOfficer);
router.get('/helpers/bazaars', isAuthenticated, authorize('roster.create'), rosterController.bazaarsForRoster);

router.get('/:id', isAuthenticated, authorize('roster.read'), rosterController.getById);
router.post('/', isAuthenticated, authorize('roster.create'), rosterController.create);
router.put('/:id', isAuthenticated, authorize('roster.update'), rosterController.update);
router.delete('/:id', isAuthenticated, authorize('roster.delete'), rosterController.remove);

// Approval actions (system role only + permission)
router.post('/:id/approve', isAuthenticated, authorize('roster.approve'), rosterController.approve);
router.post('/:id/reject', isAuthenticated, authorize('roster.approve'), rosterController.reject);

module.exports = router;
