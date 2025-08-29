const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");
const { isAuthenticated, authorize } = require('../middleware/auth');

// Devices CRUD with RBAC; Super Admin bypass is handled in authorize()
router.post('/', isAuthenticated, authorize('devices.create'), deviceController.create);
router.get('/', isAuthenticated, authorize('devices.read'), deviceController.list);
router.get('/:id', isAuthenticated, authorize('devices.read'), deviceController.getById);
router.put('/:id', isAuthenticated, authorize('devices.update'), deviceController.update);
router.delete('/:id', isAuthenticated, authorize('devices.delete'), deviceController.remove);

module.exports = router;
