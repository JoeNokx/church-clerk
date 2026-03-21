export const requirePermission = (moduleKey, actionKey) => {
  const mod = String(moduleKey || "").trim();
  const action = String(actionKey || "").trim();

  return (req, res, next) => {
    const perms = req.permissions || {};

    if (perms?.super) return next();

    if (!mod || !action) {
      return res.status(500).json({ message: "Permission middleware misconfigured" });
    }

    const allowed = Boolean(perms?.[mod]?.[action]);
    if (!allowed) {
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }

    return next();
  };
};
