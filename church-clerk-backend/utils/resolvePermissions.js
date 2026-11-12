import { ROLE_PERMISSIONS, SYSTEM_ROLES, CHURCH_ROLES } from "../config/roles.js";
import { MODULES } from "../config/permissions.js";
import Role from "../models/roleModel.js";

const normalizeRoleKey = (role) => {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole === "super_admin") return "superadmin";
  if (normalizedRole === "support_admin") return "supportadmin";
  return normalizedRole;
};

// Role docs saved before the rename store permissions under "events" — map
// them onto the current "programs" module key.
const LEGACY_MODULE_KEYS = { programs: ["events"] };

// True when a role key belongs to the system side: the built-in
// superadmin, or any active DB-backed role in the "system" scope (e.g. a
// support role the super admin created). Used anywhere the codebase needs
// to know "is this a system admin account" without hardcoding role names.
export const isSystemRole = async (role) => {
  const key = normalizeRoleKey(role);
  if (!key) return false;
  if (SYSTEM_ROLES.includes(key)) return true;
  try {
    const doc = await Role.findOne({ key, scope: "system", isActive: true })
      .select("_id")
      .lean();
    return Boolean(doc?._id);
  } catch {
    return false;
  }
};

// A "system viewer" is a system-scope account (no home church) looking at
// church-scoped data. Replaces the old `role === "superadmin" ||
// "supportadmin"` checks so ANY system role — including custom ones the
// super admin creates — is recognised. Delegate sessions are excluded:
// they intentionally behave like church users scoped to the delegated church.
export const isSystemViewer = (req) =>
  Boolean(req?.user) && !req.user?.church && !req?.isDelegate;

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

    const aliases = [moduleName, ...(LEGACY_MODULE_KEYS[moduleName] || [])];
    const allowed = aliases
      .map((k) => permissionObject[k] ?? permissionObject[moduleKeyLookup[normalizeModuleKey(k)]])
      .find((v) => v !== undefined);
    for (const action of MODULES[moduleName]) {
      // Stored "view" grants count as "read" — the two were merged.
      const legacyView = action === "read";
      if (Array.isArray(allowed)) {
        resolved[moduleName][action] = allowed.includes(action) || (legacyView && allowed.includes("view"));
      } else if (allowed && typeof allowed === "object") {
        resolved[moduleName][action] = Boolean(allowed[action]) || (legacyView && Boolean(allowed["view"]));
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
      if (s.delete) out.settingsChurchProfile.delete = true;
    }
    if (MODULES.settingsUsersRoles) {
      if (s.read) out.settingsUsersRoles.read = true;
      if (s.create) out.settingsUsersRoles.create = true;
      if (s.update) out.settingsUsersRoles.update = true;
      if (s.delete) out.settingsUsersRoles.deactivate = true;
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

const deepMergePermissions = (configDefaults, dbPermissions) => {
  if (!configDefaults) return dbPermissions;
  if (!dbPermissions || typeof dbPermissions !== "object") return configDefaults;

  if (dbPermissions.__all__) return dbPermissions;

  const result = { ...configDefaults };

  for (const moduleKey of Object.keys(MODULES)) {
    const dbModule =
      [moduleKey, ...(LEGACY_MODULE_KEYS[moduleKey] || [])]
        .map((k) => dbPermissions[k])
        .find((v) => v && typeof v === "object");
    if (!dbModule || typeof dbModule !== "object") continue;

    const hasAnyTrue = Object.values(dbModule).some(Boolean);
    if (hasAnyTrue) {
      result[moduleKey] = dbModule;
    }
  }

  return result;
};

export const resolvePermissions = async (role, roleRef = null, scope = "", churchId = null) => {
  const effectiveRole = normalizeRoleKey(role);
  if (!effectiveRole) return {};

  // A role belonging to the other scope must never resolve permissions in
  // this context — e.g. a "superadmin" assigned to a church user grants
  // nothing inside the church app, and a church role grants nothing on
  // the system admin side.
  const effectiveScope = String(scope || "").trim().toLowerCase();
  if (effectiveScope === "church" && SYSTEM_ROLES.includes(effectiveRole)) return {};
  if (effectiveScope === "system" && CHURCH_ROLES.includes(effectiveRole)) return {};

  const roleDefaults = ROLE_PERMISSIONS?.[effectiveRole] && typeof ROLE_PERMISSIONS[effectiveRole] === "object" ? ROLE_PERMISSIONS[effectiveRole] : null;

  try {
    if (roleRef) {
      const dbRole = await Role.findOne({ _id: roleRef, ...(effectiveScope ? { scope: effectiveScope } : {}) }).select("permissions isActive church").lean();
      // A role owned by a different church grants nothing in this church.
      if (dbRole?.church && churchId && String(dbRole.church) !== String(churchId)) return {};
      // A stale roleRef must not lock a built-in role out of its config
      // defaults — only non-built-in roles die with their doc.
      if (dbRole?._id && dbRole?.isActive === false && !roleDefaults) return {};
      if (dbRole?.permissions && dbRole?.isActive !== false && typeof dbRole.permissions === "object") {
        const merged = deepMergePermissions(roleDefaults, dbRole.permissions);
        const resolved = resolveFromPermissionObject(merged);
        if (Object.keys(resolved).length) return expandLegacyPermissions(resolved);
      }
    } else if (scope) {
      // Church-owned custom roles shadow global ones with the same key.
      let dbRole = null;
      if (churchId) {
        dbRole = await Role.findOne({ key: effectiveRole, scope: String(scope), church: churchId })
          .select("permissions isActive")
          .lean();
      }
      if (!dbRole?._id) {
        dbRole = await Role.findOne({ key: effectiveRole, scope: String(scope), church: null })
          .select("permissions isActive")
          .lean();
      }

      if (dbRole?._id && dbRole?.isActive === false && !roleDefaults) return {};
      if (dbRole?.permissions && dbRole?.isActive !== false && typeof dbRole.permissions === "object") {
        const merged = deepMergePermissions(roleDefaults, dbRole.permissions);
        const resolved = resolveFromPermissionObject(merged);
        if (Object.keys(resolved).length) return expandLegacyPermissions(resolved);
      }
    }
  } catch (e) {
    // fall back to config-based permissions
  }

  const roleConfig = ROLE_PERMISSIONS[effectiveRole];
  return expandLegacyPermissions(resolveFromPermissionObject(roleConfig));
};
