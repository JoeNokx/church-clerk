import { resolvePermissions } from "../utils/resolvePermissions.js";


export const attachPermissions = async (req, res, next) => {
  try {
    const clientApp = String(req.headers?.["x-client-app"] || "").trim().toLowerCase();
    const scope = clientApp === "system-admin" ? "system" : "church";

    req.permissions = req.user?.role
      ? await resolvePermissions(req.user.role, req.user?.roleRef, scope)
      : {};
  } catch (e) {
    req.permissions = {};
  }

  next();
};
