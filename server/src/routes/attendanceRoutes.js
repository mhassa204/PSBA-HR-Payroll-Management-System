const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/attendanceController');

// List devices to pull from
router.get('/devices', isAuthenticated, authorize('attendance.read'), ctrl.listDevices);
// Pull for one device
router.post('/devices/:id/fetch', isAuthenticated, authorize('attendance.fetch'), ctrl.fetchAndSaveForDevice);
// Pull for all devices
router.post('/fetch-all', isAuthenticated, authorize('attendance.fetch'), ctrl.fetchAndSaveForAll);

// Locations list for attendance module
router.get('/locations', isAuthenticated, authorize('attendance.read'), ctrl.listLocations);

// New: employee-device user id management
router.get('/employees', isAuthenticated, authorize('attendance.read'), ctrl.listEmployeesForDeviceUsers);
router.put('/employees/:employeeId/device-user', isAuthenticated, authorize('attendance.map'), ctrl.setEmployeeDeviceUserId);

// New: location-based attendance views
router.get('/locations/:id/fmo', isAuthenticated, authorize('attendance.read'), ctrl.locationFMO);
router.get('/locations/:id/roster', isAuthenticated, authorize('attendance.read'), ctrl.locationAgainstRoster);
router.get('/locations/:id/lsr', isAuthenticated, authorize('attendance.read'), ctrl.locationLSR);

module.exports = router;
