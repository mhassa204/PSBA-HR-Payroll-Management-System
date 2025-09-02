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

// New: employee-device user id management
router.get('/employees', isAuthenticated, authorize('attendance.read'), ctrl.listEmployeesForDeviceUsers);
router.put('/employees/:employeeId/device-user', isAuthenticated, authorize('attendance.map'), ctrl.setEmployeeDeviceUserId);

module.exports = router;
