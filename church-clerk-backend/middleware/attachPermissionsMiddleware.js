import { resolvePermissions } from "../utils/resolvePermissions.js";


export const attachPermissions = (req, res, next) => {
  req.permissions = req.user?.role
    ? resolvePermissions(req.user.role)
    : {};

  next();
};
