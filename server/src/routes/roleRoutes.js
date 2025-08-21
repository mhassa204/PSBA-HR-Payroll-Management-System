const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

// Get all roles
router.get('/', roleController.getAllRoles);

// Get role by ID
router.get('/:id', roleController.getRoleById);

// Create new role
router.post('/', roleController.createRole);

// Update role
router.put('/:id', roleController.updateRole);

// Delete role
router.delete('/:id', roleController.deleteRole);

module.exports = router;
