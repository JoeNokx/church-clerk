import { ROLE_PERMISSIONS } from "../config/roles.js";
import { MODULES } from "../config/permissions.js";
import Role from "../models/roleModel.js";

const normalizeRoleKey = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "super_admin") return "superadmin";
  if (normalizedRole === "support_admin") return "supportadmin";
  return normalizedRole;
};

const resolveFromPermissionObject = (permissionObject) => {
  if (!permissionObject || typeof permissionObject !== "object") return {};

  if (permissionObject.__all__) {
    return { super: true };
  }

  const resolved = {};
  for (const moduleName of Object.keys(MODULES)) {
    resolved[moduleName] = {};

    const allowed = permissionObject[moduleName];
    for (const action of MODULES[moduleName]) {
      if (Array.isArray(allowed)) {
        resolved[moduleName][action] = allowed.includes(action);
      } else if (allowed && typeof allowed === "object") {
        resolved[moduleName][action] = Boolean(allowed[action]);
      } else {
        resolved[moduleName][action] = false;
      }
    }
  }

  return resolved;
};

export const resolvePermissions = async (role, roleRef = null, scope = "") => {
  const effectiveRole = normalizeRoleKey(role);
  if (!effectiveRole) return {};

  try {
    if (roleRef) {
      const dbRole = await Role.findOne({ _id: roleRef }).select("permissions isActive").lean();
      if (dbRole?._id && dbRole?.isActive === false) return {};
      if (dbRole?.permissions && typeof dbRole.permissions === "object") {
        const resolved = resolveFromPermissionObject(dbRole.permissions);
        if (Object.keys(resolved).length) return resolved;
      }
    } else if (scope) {
      const dbRole = await Role.findOne({ key: effectiveRole, scope: String(scope) })
        .select("permissions isActive")
        .lean();

      if (dbRole?._id && dbRole?.isActive === false) return {};
      if (dbRole?.permissions && typeof dbRole.permissions === "object") {
        const resolved = resolveFromPermissionObject(dbRole.permissions);
        if (Object.keys(resolved).length) return resolved;
      }
    }
  } catch (e) {
    // fall back to config-based permissions
  }

  const roleConfig = ROLE_PERMISSIONS[effectiveRole];
  return resolveFromPermissionObject(roleConfig);
};
