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

  const normalizeModuleKey = (k) =>
    String(k || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  const moduleKeyLookup = {};
  for (const k of Object.keys(permissionObject)) {
    moduleKeyLookup[normalizeModuleKey(k)] = k;
  }

  const resolved = {};
  for (const moduleName of Object.keys(MODULES)) {
    resolved[moduleName] = {};

    const allowed =
      permissionObject[moduleName] ??
      permissionObject[moduleKeyLookup[normalizeModuleKey(moduleName)]];
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

const ensureBoolMatrix = (resolved) => {
  const out = resolved && typeof resolved === "object" ? { ...resolved } : {};

  const hasAllAccess = out?.__all__ === true || out?.super === true;
  for (const moduleKey of Object.keys(MODULES)) {
    out[moduleKey] = out[moduleKey] && typeof out[moduleKey] === "object" ? { ...out[moduleKey] } : {};
    for (const action of MODULES[moduleKey]) {
      out[moduleKey][action] = hasAllAccess ? true : Boolean(out?.[moduleKey]?.[action]);
    }
  }
  return out;
};

const expandLegacyPermissions = (resolved) => {
  const out = ensureBoolMatrix(resolved);

  // Legacy settings -> new sub-modules
  const s = out?.settings || {};
  if (Object.keys(s).length) {
    if (MODULES.settingsMyProfile) {
      if (s.read) out.settingsMyProfile.read = true;
      if (s.update) out.settingsMyProfile.update = true;
    }
    if (MODULES.settingsChurchProfile) {
      if (s.read) out.settingsChurchProfile.read = true;
      if (s.update) out.settingsChurchProfile.update = true;
    }
    if (MODULES.settingsUsersRoles) {
      if (s.read) out.settingsUsersRoles.read = true;
      if (s.create) out.settingsUsersRoles.create = true;
    }
    if (MODULES.settingsAuditLog) {
      if (s.read) out.settingsAuditLog.read = true;
    }
  }

  // New settings sub-modules -> legacy settings (transition compatibility)
  if (MODULES.settings?.length) {
    const legacy = out.settings || {};

    if (out?.settingsMyProfile?.read || out?.settingsChurchProfile?.read || out?.settingsUsersRoles?.read || out?.settingsAuditLog?.read) {
      legacy.read = true;
    }
    if (out?.settingsUsersRoles?.create) {
      legacy.create = true;
    }
    if (out?.settingsMyProfile?.update || out?.settingsChurchProfile?.update || out?.settingsUsersRoles?.deactivate) {
      legacy.update = true;
    }

    out.settings = legacy;
  }

  // System admin actions historically using settings
  if (MODULES.support && out?.support?.read) {
    if (out?.support?.read && MODULES.support.includes("view")) out.support.view = true;
  }

  return out;
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
        if (Object.keys(resolved).length) return expandLegacyPermissions(resolved);
      }
    } else if (scope) {
      const dbRole = await Role.findOne({ key: effectiveRole, scope: String(scope) })
        .select("permissions isActive")
        .lean();

      if (dbRole?._id && dbRole?.isActive === false) return {};
      if (dbRole?.permissions && typeof dbRole.permissions === "object") {
        const resolved = resolveFromPermissionObject(dbRole.permissions);
        if (Object.keys(resolved).length) return expandLegacyPermissions(resolved);
      }
    }
  } catch (e) {
    // fall back to config-based permissions
  }

  const roleConfig = ROLE_PERMISSIONS[effectiveRole];
  return expandLegacyPermissions(resolveFromPermissionObject(roleConfig));
};
