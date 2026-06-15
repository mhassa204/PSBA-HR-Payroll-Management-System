const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { isAuthenticated, authorize } = require('../middleware/auth');

// Only Super Admin can manage permissions
router.get('/', isAuthenticated, authorize('permissions.read'), permissionController.list);
router.post('/upsert-many', isAuthenticated, authorize('permissions.manage'), permissionController.upsertMany);
router.post('/', isAuthenticated, authorize('permissions.manage'), permissionController.create);
router.delete('/:key', isAuthenticated, authorize('permissions.manage'), permissionController.deleteByKey);

module.exports = router;
