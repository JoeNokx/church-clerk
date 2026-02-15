const normalizeRole = (role) => {
  const r = String(role || "").trim().toLowerCase();
  if (r === "super_admin") return "superadmin";
  if (r === "support_admin") return "supportadmin";
  return r;
};

const authorizeRoles = (...roles) => {
  const allowed = roles.map(normalizeRole);
  return (req, res, next) => {
    let userRole = normalizeRole(req.user?.role);

    const clientApp = String(req.headers?.["x-client-app"] || "").trim().toLowerCase();
    if (clientApp === "system-admin" && userRole === "supportadmin") {
      userRole = "superadmin";
    }
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }
    next();
  };
};



export default authorizeRoles