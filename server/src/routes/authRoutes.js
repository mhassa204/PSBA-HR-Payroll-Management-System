const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middleware/auth");

router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.me);
router.get("/me/permissions", isAuthenticated, (req, res) => {
  res.json({ success: true, permissions: req.session.user?.permissions || [] });
});

module.exports = router;
