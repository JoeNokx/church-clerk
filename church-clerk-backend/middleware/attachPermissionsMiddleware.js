import { resolvePermissions } from "../utils/resolvePermissions.js";


export const attachPermissions = async (req, res, next) => {
  try {
    const clientApp = String(req.headers?.["x-client-app"] || "").trim().toLowerCase();
    // Delegated sessions resolve the system admin's real (system-scoped)
    // role, so they must be evaluated in the system scope — otherwise the
    // cross-scope block in resolvePermissions would zero their permissions.
    const scope = clientApp === "system-admin" || req.isDelegate ? "system" : "church";

    req.permissions = req.user?.role
      ? await resolvePermissions(req.user.role, req.user?.roleRef, scope)
      : {};

    // Delegated sessions: the system admin is viewing as a specific church.
    // Keep the resolved super permissions (so requirePermission still passes
    // via perms.super), but override the role to a church-level role so that
    // every controller's `if (req.user.role !== "superadmin")` church-scoping
    // check naturally applies and scopes queries to req.activeChurch._id.
    if (req.isDelegate && req.user?.role) {
      req.user.role = "churchadmin";
    }
  } catch (e) {
    req.permissions = {};
  }

  next();
};
