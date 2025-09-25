const express = require('express');
const router = express.Router();
const { isAuthenticated, authorizeAny } = require('../middleware/auth');
const leaveBankController = require('../controllers/leaveBankController');

// Permissions: leave-banks.read/create/update/delete, leave-types.read/create/update/delete
const canReadBanks = authorizeAny(['leave-banks.read', 'leaves.read']);
const canManageBanks = authorizeAny(['leave-banks.create', 'leave-banks.update', 'leave-banks.delete']);
const canReadTypes = authorizeAny(['leave-types.read', 'leaves.read', 'leaves.apply']);
const canManageTypes = authorizeAny(['leave-types.create', 'leave-types.update', 'leave-types.delete']);

// Leave Types
router.get('/types', isAuthenticated, canReadTypes, leaveBankController.listLeaveTypes);
router.post('/types', isAuthenticated, canManageTypes, leaveBankController.createLeaveType);
router.put('/types/:id', isAuthenticated, canManageTypes, leaveBankController.updateLeaveType);
router.delete('/types/:id', isAuthenticated, canManageTypes, leaveBankController.deleteLeaveType);

// Leave Banks
router.get('/', isAuthenticated, canReadBanks, leaveBankController.listLeaveBanks);
router.post('/', isAuthenticated, canManageBanks, leaveBankController.createLeaveBank);
router.put('/:id', isAuthenticated, canManageBanks, leaveBankController.updateLeaveBank);
router.delete('/:id', isAuthenticated, canManageBanks, leaveBankController.deleteLeaveBank);

// Manage defaults (days per type) for a bank
router.get('/:id/defaults', isAuthenticated, canReadBanks, leaveBankController.listDefaults);
router.post('/:id/defaults', isAuthenticated, canManageBanks, leaveBankController.upsertDefault);
router.delete('/defaults/:id', isAuthenticated, canManageBanks, leaveBankController.deleteDefault);

// Per-employee allocations for a bank
router.get('/:id/allocations', isAuthenticated, canReadBanks, leaveBankController.listAllocations);
router.post('/:id/allocations', isAuthenticated, canManageBanks, leaveBankController.upsertAllocation);
router.delete('/allocations/:id', isAuthenticated, canManageBanks, leaveBankController.deleteAllocation);

module.exports = router;
