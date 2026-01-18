export const readOnlyBranchGuard = (req, res, next) => {
  if (!req.activeChurch || !req.user?.church) {
    return next();
  }

 //  Superadmin can always edit
  if (req.user.role === "superadmin") return next();

  
  // Support admin: read-only everywhere
  if (req.user.role === "supportadmin") {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      return res.status(403).json({
        message: "Read-only access"
      });
    }
    return next();
  }

  // Church admin: read-only when viewing branches
  if (!req.user.church) {
    return next();
  }

  const isBranchView =
    req.activeChurch._id.toString() !== req.user.church.toString();

  if (
    isBranchView &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
  ) {
    return res.status(403).json({
      message: "Branch data is read-only"
    });
  }

  next();
};
