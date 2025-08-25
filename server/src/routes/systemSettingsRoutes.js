const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/systemSettingsController');
const { isAuthenticated, authorize } = require('../middleware/auth');

// Database (read-only)
router.get('/database', isAuthenticated, authorize('system.database.read'), ctrl.getDatabase);

// Security
router.get('/security', isAuthenticated, authorize('system.security.read'), ctrl.getSecurity);
router.put('/security', isAuthenticated, authorize('system.security.update'), ctrl.updateSecurity);

// Themes
router.get('/themes', isAuthenticated, authorize('system.themes.read'), ctrl.getThemes);
router.put('/themes', isAuthenticated, authorize('system.themes.update'), ctrl.updateThemes);

module.exports = router;
