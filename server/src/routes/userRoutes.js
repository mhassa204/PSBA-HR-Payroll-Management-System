const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, authorize } = require('../middleware/auth');

// Get all users
router.get('/', isAuthenticated, authorize('users.read'), userController.getAllUsers);

// Get combined form options (roles + available employees)
router.get('/form-options', isAuthenticated, authorize('users.manage'), userController.getFormOptions);

// Get available employees for user assignment
router.get('/available/employees', isAuthenticated, authorize('users.manage'), userController.getAvailableEmployees);
router.get('/debug/employees', isAuthenticated, authorize('users.manage'), userController.debugEmployees);

// Get user by ID
router.get('/:id', isAuthenticated, authorize('users.read'), userController.getUserById);

// Create new user
router.post('/', isAuthenticated, authorize('users.manage'), userController.createUser);

// Update user
router.put('/:id', isAuthenticated, authorize('users.manage'), userController.updateUser);

// Delete user
router.delete('/:id', isAuthenticated, authorize('users.manage'), userController.deleteUser);

module.exports = router;
