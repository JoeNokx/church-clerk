const normalizeRole = (role) => {
  const r = String(role || "").trim().toLowerCase();
  if (r === "super_admin") return "superadmin";
  if (r === "support_admin") return "supportadmin";
  return r;
};

const authorizeRoles = (...roles) => {
  const allowed = roles.map(normalizeRole);
  return (req, res, next) => {
    if (req.permissions != null) {
      return next();
    }

    const userRole = normalizeRole(req.user?.role);
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }
    next();
  };
};

// Hard role check — unlike authorizeRoles this is NOT bypassed when
// req.permissions is attached. Use it for actions restricted to a specific
// role regardless of any custom-permission matrix (e.g. role management is
// reserved for the ChurchClerk admin).
export const requireUserRole = (...roles) => {
  const allowed = roles.map(normalizeRole);
  return (req, res, next) => {
    const userRole = normalizeRole(req.user?.role);
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }
    next();
  };
};

export { normalizeRole };

export default authorizeRoles