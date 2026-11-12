import { isSystemRole } from "../utils/resolvePermissions.js";

// Hard gate for system admin routes: the caller must hold a system-scope
// role — the built-in superadmin or any active DB-backed system role
// (e.g. a support role created by the super admin). Unlike authorizeRoles
// this is NOT bypassed by req.permissions.
const requireSystemRole = async (req, res, next) => {
  try {
    // A suspended admin account must lose access entirely — protect() only
    // blocks their writes, so reject reads here too. An account with a home
    // church is never a system account, whatever its role string says.
    if (req?.user?.isActive === false || req?.user?.church) {
      return res.status(403).json({ message: "Access denied" });
    }
    const ok = await isSystemRole(req?.user?.role);
    if (!ok) {
      return res.status(403).json({ message: "Access denied" });
    }
    return next();
  } catch {
    return res.status(403).json({ message: "Access denied" });
  }
};

export default requireSystemRole;
