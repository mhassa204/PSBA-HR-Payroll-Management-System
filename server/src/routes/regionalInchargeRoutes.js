const express = require("express");
const router = express.Router();
const regionalInchargeController = require("../controllers/regionalInchargeController");
const { isAuthenticated, authorize } = require("../middleware/auth");

// Regional Incharge module: who oversees which bazaars.
// Read is broad (other modules show the incharge alongside a bazaar);
// changing coverage needs regional_incharge.manage.

// Literal paths before "/:id"
router.get(
  "/helpers/bazaars",
  isAuthenticated,
  authorize("regional_incharge.read"),
  regionalInchargeController.bazaars
);

// Set (or clear) the incharge on one bazaar — the "from the bazaar" direction
router.patch(
  "/bazaar/:locationId",
  isAuthenticated,
  authorize("regional_incharge.manage"),
  regionalInchargeController.setBazaarIncharge
);

router.get("/", isAuthenticated, authorize("regional_incharge.read"), regionalInchargeController.list);
router.post("/", isAuthenticated, authorize("regional_incharge.manage"), regionalInchargeController.create);
router.get("/:id", isAuthenticated, authorize("regional_incharge.read"), regionalInchargeController.getById);
router.put("/:id", isAuthenticated, authorize("regional_incharge.manage"), regionalInchargeController.update);
router.delete("/:id", isAuthenticated, authorize("regional_incharge.manage"), regionalInchargeController.remove);

// Replace an incharge's whole bazaar list — the "from the incharge" direction
router.put(
  "/:id/bazaars",
  isAuthenticated,
  authorize("regional_incharge.manage"),
  regionalInchargeController.setBazaars
);

module.exports = router;
