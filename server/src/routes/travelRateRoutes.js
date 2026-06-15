const express = require('express');
const router = express.Router();
const { isAuthenticated, authorizeAny } = require('../middleware/auth');
const controller = require('../controllers/travelRateController');

// RBAC: limit to Accounts roles by requiring explicit travel.rates.* permissions only
router.get('/travel-rates', isAuthenticated, authorizeAny(['travel.rates.read']), controller.list);
router.get('/travel-rates/:id', isAuthenticated, authorizeAny(['travel.rates.read']), controller.getOne);
router.post('/travel-rates/upsert', isAuthenticated, authorizeAny(['travel.rates.manage']), controller.upsertByScale);
router.delete('/travel-rates/:id', isAuthenticated, authorizeAny(['travel.rates.manage']), controller.delete);

module.exports = router;
