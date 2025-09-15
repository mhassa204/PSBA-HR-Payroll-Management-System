const express = require("express");
const router = express.Router();
const districtController = require("../controllers/districtController");
const { isAuthenticated, authorize } = require('../middleware/auth');

// District CRUD routes
router.post("/", isAuthenticated, authorize('districts.create'), districtController.createDistrict);
router.get("/", isAuthenticated, authorize('districts.read'), districtController.getAllDistricts);
router.get("/:id", isAuthenticated, authorize('districts.read'), districtController.getDistrictById);
router.put("/:id", isAuthenticated, authorize('districts.update'), districtController.updateDistrict);
router.delete("/:id", isAuthenticated, authorize('districts.delete'), districtController.deleteDistrict);

module.exports = router;
