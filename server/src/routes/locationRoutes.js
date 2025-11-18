const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");
const { isAuthenticated, authorize, authorizeAny } = require('../middleware/auth');

// Location CRUD routes
// Accept any of create/update/delete for create & update to mitigate stale session mismatches
router.post("/", isAuthenticated, authorizeAny(['locations.create','locations.update','locations.delete']), locationController.createLocation);
router.get("/", isAuthenticated, authorize('locations.read'), locationController.getAllLocations);
router.get("/bazaars", isAuthenticated, authorize('locations.read'), locationController.getBazaars);
router.get("/statistics", isAuthenticated, authorize('locations.read'), locationController.getLocationStatistics);
router.get("/:id", isAuthenticated, authorize('locations.read'), locationController.getLocationById);
router.put("/:id", isAuthenticated, authorizeAny(['locations.update','locations.create','locations.delete']), locationController.updateLocation);
router.delete("/:id", isAuthenticated, authorize('locations.delete'), locationController.deleteLocation);

module.exports = router;
