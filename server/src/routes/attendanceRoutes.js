const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/attendanceController');

// Locations list for attendance module
router.get('/locations', isAuthenticated, authorize('attendance.read'), ctrl.listLocations);

// Location-based attendance views
router.get('/locations/:id/fmo', isAuthenticated, authorize('attendance.read'), ctrl.locationFMO);
router.get('/locations/:id/roster', isAuthenticated, authorize('attendance.read'), ctrl.locationAgainstRoster);
router.get('/locations/:id/lsr', isAuthenticated, authorize('attendance.read'), ctrl.locationLSR);

module.exports = router;
