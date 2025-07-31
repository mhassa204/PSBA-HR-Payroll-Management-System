function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

function hasRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.session.user || !allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    next();
  };
}

module.exports = { isAuthenticated, hasRole };
