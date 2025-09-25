const express = require('express');
const router = express.Router();
const { isAuthenticated: auth, authorize } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// Require admin tools permission for all admin routes
router.use(auth, authorize('admin.tools'));

// Get all soft-deleted records summary
router.get('/deleted-records', adminController.deletedSummary);

// Get soft-deleted employees with pagination
router.get('/deleted-employees', adminController.deletedEmployees);

// Restore a soft-deleted employee
router.post('/restore-employee/:id', adminController.restoreEmployee);

// Get soft-deleted departments
router.get('/deleted-departments', adminController.deletedDepartments);

// Restore a soft-deleted department
router.post('/restore-department/:id', adminController.restoreDepartment);

// Get soft-deleted designations
router.get('/deleted-designations', adminController.deletedDesignations);

// Restore a soft-deleted designation
router.post('/restore-designation/:id', adminController.restoreDesignation);

// Manual cleanup of soft-deleted records
router.post('/cleanup', adminController.manualCleanup);

// Hard delete a specific record (irreversible)
router.delete('/hard-delete/:model/:id', adminController.hardDelete);

module.exports = router;
