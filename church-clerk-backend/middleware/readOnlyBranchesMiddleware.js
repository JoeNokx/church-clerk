import { isSystemViewer } from "../utils/resolvePermissions.js";

export const readOnlyBranchGuard = (req, res, next) => {
  if (!req.activeChurch || !req.user) {
    return next();
  }

  // System-scope accounts can always edit — their write access is governed
  // by their role's permission matrix, not by this guard.
  if (isSystemViewer(req)) return next();

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
      message: "Branch data is read-only",
      readOnly: true
    });
  }

  next();
};
