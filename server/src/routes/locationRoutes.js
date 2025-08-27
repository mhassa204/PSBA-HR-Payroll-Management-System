const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");
const { isAuthenticated, authorize } = require('../middleware/auth');

// Location CRUD routes
router.post("/", isAuthenticated, authorize('locations.create'), locationController.createLocation);
router.get("/", isAuthenticated, authorize('locations.read'), locationController.getAllLocations);
router.get("/bazaars", isAuthenticated, authorize('locations.read'), locationController.getBazaars);
router.get("/statistics", isAuthenticated, authorize('locations.read'), locationController.getLocationStatistics);
router.get("/:id", isAuthenticated, authorize('locations.read'), locationController.getLocationById);
router.put("/:id", isAuthenticated, authorize('locations.update'), locationController.updateLocation);
router.delete("/:id", isAuthenticated, authorize('locations.delete'), locationController.deleteLocation);

module.exports = router;
