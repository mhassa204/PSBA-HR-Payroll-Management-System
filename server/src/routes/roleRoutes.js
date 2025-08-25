const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { isAuthenticated, authorize } = require('../middleware/auth');

// Get all roles
router.get('/', isAuthenticated, authorize('roles.read'), roleController.getAllRoles);

// Get role by ID
router.get('/:id', isAuthenticated, authorize('roles.read'), roleController.getRoleById);

// Create new role - Super Admin only
router.post('/', isAuthenticated, authorize('roles.manage'), roleController.createRole);

// Update role - Super Admin only
router.put('/:id', isAuthenticated, authorize('roles.manage'), roleController.updateRole);

// Delete role - Super Admin only
router.delete('/:id', isAuthenticated, authorize('roles.manage'), roleController.deleteRole);

module.exports = router;
