export const readOnlyBranchGuard = (req, res, next) => {
  if (!req.activeChurch || !req.user) {
    return next();
  }

 //  System admins can always edit
  if (req.user.role === "superadmin" || req.user.role === "supportadmin") return next();

  
  // Support admin: read-only in finance modules only
  if (req.user.role === "supportadmin") {
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (!isWrite) return next();

    const url = String(req.originalUrl || "");
    const financeBases = [
      "/api/v1/tithe",
      "/api/v1/church-project",
      "/api/v1/special-fund",
      "/api/v1/offering",
      "/api/v1/welfare",
      "/api/v1/pledge",
      "/api/v1/business-ventures",
      "/api/v1/general-expenses",
      "/api/v1/income",
      "/api/v1/expense",
      "/api/v1/financial-statement"
    ];

    const isFinance = financeBases.some((b) => url.includes(b));
    if (isFinance) {
      return res.status(403).json({ message: "Finance modules are read-only" });
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
