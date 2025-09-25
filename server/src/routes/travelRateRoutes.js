const express = require('express');
const router = express.Router();
const { isAuthenticated, authorizeAny } = require('../middleware/auth');
const controller = require('../controllers/travelRateController');

// RBAC keys: travel.rates.read, travel.rates.manage
router.get('/travel-rates', isAuthenticated, authorizeAny(['travel.rates.read','travel.manage','travel.claim.manage']), controller.list);
router.get('/travel-rates/:id', isAuthenticated, authorizeAny(['travel.rates.read','travel.manage']), controller.getOne);
router.post('/travel-rates/upsert', isAuthenticated, authorizeAny(['travel.rates.manage','travel.manage']), controller.upsertByScale);
router.delete('/travel-rates/:id', isAuthenticated, authorizeAny(['travel.rates.manage','travel.manage']), controller.delete);

module.exports = router;
