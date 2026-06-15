const express = require("express");
const router = express.Router();
const cityController = require("../controllers/cityController");
const { isAuthenticated, authorize } = require('../middleware/auth');

// City CRUD routes
router.post("/", isAuthenticated, authorize('cities.create'), cityController.createCity);
router.get("/", isAuthenticated, authorize('cities.read'), cityController.getAllCities);
router.get("/:id", isAuthenticated, authorize('cities.read'), cityController.getCityById);
router.put("/:id", isAuthenticated, authorize('cities.update'), cityController.updateCity);
router.delete("/:id", isAuthenticated, authorize('cities.delete'), cityController.deleteCity);

module.exports = router;
