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

// Permission-based authorization
function hasPermission(user, perm) {
  if (!user) return false;
  // Super Admin shortcut
  if (user.role?.name === 'Super Admin') return true;
  const list = user.permissions || [];
  if (list.includes('*')) return true;
  return list.includes(perm);
}

function authorize(permission) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!hasPermission(req.session.user, permission)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

function authorizeAny(permissions = []) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const ok = permissions.some((p) => hasPermission(req.session.user, p));
    if (!ok) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { isAuthenticated, hasRole, authorize, authorizeAny };
