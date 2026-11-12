import Role from "../models/roleModel.js";
import { MODULES, SYSTEM_MODULES } from "../config/permissions.js";
import { CHURCH_ROLES, SYSTEM_ROLES, LEGACY_ROLE_KEY_MAP, REMOVED_ROLE_KEYS } from "../config/roles.js";
import User from "../models/userModel.js";

const normalizeRoleKey = (val) => {
  const key = String(val || "").trim().toLowerCase();
  return key;
};

const actorIsSuperAdmin = (req) =>
  String(req?.user?.role || "").trim().toLowerCase() === "superadmin";

// __all__ resolves to perms.super, which bypasses every permission AND
// subscription-plan check. Only system-scope roles may hold it. For church
// roles, "grant all" expands into the real module matrix instead — the
// user still gets every church permission, but plan gating keeps working.
const fullChurchMatrix = () => {
  const full = {};
  for (const [moduleKey, actions] of Object.entries(MODULES)) {
    // The legacy "settings" umbrella and the system-scope modules don't
    // belong on a church role.
    if (moduleKey === "settings" || SYSTEM_MODULES.includes(moduleKey)) continue;
    full[moduleKey] = {};
    for (const action of actions) full[moduleKey][action] = true;
  }
  return full;
};

const resolveSuperGrant = (sanitized, scope) => {
  if (scope === "system") return sanitized;
  const out = { ...(sanitized && typeof sanitized === "object" ? sanitized : {}) };
  if (out.__all__ === true) return fullChurchMatrix();
  delete out.__all__;
  return out;
};

const normalizeActionKey = (val) => {
  const a = String(val || "").trim().toLowerCase();
  if (a === "edit") return "update";
  return a;
};

const getAllowedActionList = (allowed, moduleKey) => {
  if (Array.isArray(allowed)) {
    return allowed
      .map(normalizeActionKey)
      .filter((a) => MODULES[moduleKey].includes(a));
  }

  if (allowed && typeof allowed === "object") {
    return Object.keys(allowed)
      .filter((k) => Boolean(allowed[k]))
      .map(normalizeActionKey)
      .filter((a) => MODULES[moduleKey].includes(a));
  }

  return [];
};

const applyAllowedActionList = (out, moduleKey, actionList) => {
  out[moduleKey] = out[moduleKey] && typeof out[moduleKey] === "object" ? out[moduleKey] : {};
  for (const action of MODULES[moduleKey]) {
    out[moduleKey][action] = actionList.includes(action);
  }
};

const sanitizePermissions = (permissions) => {
  const src = permissions && typeof permissions === "object" ? permissions : {};

  if (src.__all__ === true) {
    return { __all__: true };
  }

  const out = {};

  // Allow legacy settings to populate the new settings sub-modules.
  const legacySettingsActions = MODULES.settings ? getAllowedActionList(src.settings, "settings") : [];
  if (legacySettingsActions.length) {
    if (MODULES.settingsMyProfile) {
      const list = [];
      if (legacySettingsActions.includes("read")) list.push("read");
      if (legacySettingsActions.includes("update")) list.push("update");
      applyAllowedActionList(out, "settingsMyProfile", list);
    }
    if (MODULES.settingsChurchProfile) {
      const list = [];
      if (legacySettingsActions.includes("read")) list.push("read");
      if (legacySettingsActions.includes("update")) list.push("update");
      applyAllowedActionList(out, "settingsChurchProfile", list);
    }
    if (MODULES.settingsUsersRoles) {
      const list = [];
      if (legacySettingsActions.includes("read")) list.push("read");
      if (legacySettingsActions.includes("create")) list.push("create");
      applyAllowedActionList(out, "settingsUsersRoles", list);
    }
    if (MODULES.settingsAuditLog) {
      const list = [];
      if (legacySettingsActions.includes("read")) list.push("read");
      applyAllowedActionList(out, "settingsAuditLog", list);
    }
  }

  for (const moduleKey of Object.keys(MODULES)) {
    // If already set (from legacy settings expansion), respect it unless explicit permissions are provided for the same module.
    const allowed = src[moduleKey];
    const actionList = getAllowedActionList(allowed, moduleKey);
    if (actionList.length) {
      applyAllowedActionList(out, moduleKey, actionList);
      continue;
    }

    if (out[moduleKey] && typeof out[moduleKey] === "object" && Object.keys(out[moduleKey]).length) {
      continue;
    }

    applyAllowedActionList(out, moduleKey, []);
  }

  return out;
};

const getPermissionCatalog = async (req, res) => {
  try {
    const modules = { ...MODULES };
    delete modules.settings;
    // systemModules marks which keys only apply to system-scope roles so
    // editors can hide them when a church-scope role is being edited.
    return res.status(200).json({ modules, systemModules: SYSTEM_MODULES });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const listRoles = async (req, res) => {
  try {
    const { scope = "", includeInactive = "" } = req.query;
    const filter = {};
    if (scope) filter.scope = String(scope);

    const include = String(includeInactive || "").trim().toLowerCase() === "true";
    if (!include) filter.isActive = true;

    const roles = await Role.find(filter)
      .populate("church", "name")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 })
      .lean();
    const normalized = (roles || []).map((r) => ({
      ...r,
      permissions: sanitizePermissions(r?.permissions)
    }));
    return res.status(200).json({ roles: normalized });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, key, scope, permissions } = req.body || {};

    const nextName = String(name || "").trim();
    const nextKey = normalizeRoleKey(key || name);
    const nextScope = String(scope || "").trim();

    if (!nextName || !nextKey || !nextScope) {
      return res.status(400).json({ message: "name, key and scope are required" });
    }

    if (nextScope !== "system" && nextScope !== "church") {
      return res.status(400).json({ message: "Invalid scope" });
    }

    // System-scope roles decide who can log in to the admin portal and how
    // much of it they can touch — only the super admin manages them.
    if (nextScope === "system" && !actorIsSuperAdmin(req)) {
      return res.status(403).json({ message: "Only the super admin can manage system roles" });
    }

    // A DB role must never reuse a built-in key in either scope — e.g. a
    // system doc keyed "churchclerkadmin" would unlock the admin portal for
    // a church role name.
    const builtinKeys = [...(SYSTEM_ROLES || []), ...(CHURCH_ROLES || [])];
    if (builtinKeys.includes(nextKey)) {
      return res.status(400).json({ message: "A built-in role already uses this key" });
    }

    // Removed/legacy keys are reserved for church-scope roles — the seeder's
    // legacy-key migration would rename or delete them on restart. System
    // scope may reuse them on purpose (e.g. recreating "supportadmin").
    if (nextScope === "church") {
      const reservedKeys = [...(REMOVED_ROLE_KEYS || []), ...Object.keys(LEGACY_ROLE_KEY_MAP || {})];
      if (reservedKeys.includes(nextKey)) {
        return res.status(400).json({ message: "This role name is reserved — choose a different name" });
      }
    }

    const exists = await Role.findOne({ key: nextKey, scope: nextScope }).lean();
    if (exists) {
      return res.status(400).json({ message: "Role key already exists" });
    }

    const role = await Role.create({
      name: nextName,
      key: nextKey,
      scope: nextScope,
      permissions: resolveSuperGrant(sanitizePermissions(permissions), nextScope),
      createdBy: req.user?._id || null,
      isActive: true
    });

    return res.status(201).json({ message: "Role created", role });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions, isActive } = req.body || {};

    const existing = await Role.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (existing.scope === "system" && !actorIsSuperAdmin(req)) {
      return res.status(403).json({ message: "Only the super admin can manage system roles" });
    }

    // Built-in role docs are seeded config — deactivating them through the
    // API would persist a broken state until the next restart.
    const isBuiltin = !existing.church &&
      [...SYSTEM_ROLES, ...CHURCH_ROLES].includes(String(existing.key || "").trim().toLowerCase());
    if (isBuiltin && isActive === false) {
      return res.status(400).json({ message: "Built-in roles cannot be deactivated" });
    }

    // Same safeguard as the church-side endpoints — don't deactivate a role
    // while users still hold it.
    if (isActive === false) {
      const key = String(existing.key || "").trim().toLowerCase();
      const assigned = await User.countDocuments({ $or: [{ role: key }, { roleRef: existing._id }] });
      if (assigned > 0) {
        return res.status(409).json({
          message: `Cannot deactivate: ${assigned} user(s) are assigned to this role. Reassign them to a different role first.`,
          assignedUsers: assigned
        });
      }
    }

    const update = {};
    if (name !== undefined) update.name = String(name || "").trim();
    if (permissions !== undefined) update.permissions = resolveSuperGrant(sanitizePermissions(permissions), existing.scope);
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const role = await Role.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();

    return res.status(200).json({ message: "Role updated", role });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id).lean();
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    return res.status(200).json({ role: { ...role, permissions: sanitizePermissions(role?.permissions) } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id).lean();
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.scope === "system" && !actorIsSuperAdmin(req)) {
      return res.status(403).json({ message: "Only the super admin can manage system roles" });
    }

    const isBuiltin = !role.church &&
      [...SYSTEM_ROLES, ...CHURCH_ROLES].includes(String(role.key || "").trim().toLowerCase());
    if (isBuiltin) {
      return res.status(400).json({ message: "Built-in roles cannot be deleted" });
    }

    const key = String(role.key || "").trim().toLowerCase();
    const assigned = await User.countDocuments({ $or: [{ role: key }, { roleRef: role._id }] });
    if (assigned > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${assigned} user(s) are assigned to this role. Reassign them to a different role first.`,
        assignedUsers: assigned
      });
    }

    const updated = await Role.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).lean();

    return res.status(200).json({ message: "Role deleted", role: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ── Church-scoped custom roles ──────────────────────────────────────────
// Same logic as the system admin custom-role endpoints, except the scope is
// forced to "church", created roles belong to the caller's active church, and
// write access is enforced at the route level via requireUserRole
// ("churchclerkadmin"). Global church roles (church: null — built-ins and
// system-admin-managed) are readable here but cannot be modified.

const roleVisibleToChurch = (roleDoc, churchId) => {
  if (!roleDoc || roleDoc.scope !== "church") return false;
  if (!roleDoc.church) return true;
  return String(roleDoc.church) === String(churchId);
};

const listChurchCustomRoles = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const roles = await Role.find({
      scope: "church",
      $or: [{ church: churchId }, { church: null }]
    })
      .sort({ createdAt: -1 })
      .lean();

    const normalized = [];
    for (const r of roles || []) {
      // A church-owned doc duplicating a built-in key is a stale artifact —
      // the global built-in doc is the canonical row.
      const k = String(r?.key || "").trim().toLowerCase();
      if ((CHURCH_ROLES || []).includes(k) && r?.church) continue;
      const key = k;
      const userCount = await User.countDocuments({
        church: churchId,
        $or: [{ role: key }, { roleRef: r._id }]
      }).catch(() => 0);
      normalized.push({
        ...r,
        permissions: sanitizePermissions(r?.permissions),
        isBuiltin: (CHURCH_ROLES || []).includes(key),
        userCount
      });
    }
    return res.status(200).json({ roles: normalized });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createChurchRole = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { name, key, permissions } = req.body || {};

    const nextName = String(name || "").trim();
    const nextKey = normalizeRoleKey(key || name);

    if (!nextName || !nextKey) {
      return res.status(400).json({ message: "name and key are required" });
    }

    const builtinKeys = [...(SYSTEM_ROLES || []), ...(CHURCH_ROLES || [])];
    if (builtinKeys.includes(nextKey)) {
      return res.status(400).json({ message: "A built-in role already uses this key" });
    }

    // Keys that once belonged to removed built-ins are reserved — reusing them
    // would collide with the legacy-role migration and confuse role history.
    const reservedKeys = [...(REMOVED_ROLE_KEYS || []), ...Object.keys(LEGACY_ROLE_KEY_MAP || {})];
    if (reservedKeys.includes(nextKey)) {
      return res.status(400).json({ message: "This role name is reserved — choose a different name" });
    }

    const exists = await Role.findOne({ key: nextKey, scope: "church", church: churchId }).lean();
    if (exists) {
      return res.status(400).json({ message: "Role key already exists" });
    }

    const role = await Role.create({
      name: nextName,
      key: nextKey,
      scope: "church",
      church: churchId,
      permissions: resolveSuperGrant(sanitizePermissions(permissions), "church"),
      createdBy: req.user?._id || null,
      isActive: true
    });

    return res.status(201).json({ message: "Role created", role });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getChurchRoleById = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const role = await Role.findById(req.params.id).lean();
    if (!role || !roleVisibleToChurch(role, churchId)) {
      return res.status(404).json({ message: "Role not found" });
    }
    return res.status(200).json({ role: { ...role, permissions: sanitizePermissions(role?.permissions) } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateChurchRole = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const existing = await Role.findById(req.params.id).lean();
    if (!existing || !existing.church || String(existing.church) !== String(churchId)) {
      return res.status(404).json({ message: "Role not found" });
    }

    const { name, permissions, isActive } = req.body || {};

    // Toggling a role's active state is a "deactivate" capability, not a
    // plain update — enforce it here since both hit the same PATCH route.
    if (isActive !== undefined && Boolean(isActive) !== Boolean(existing.isActive)) {
      const canDeactivate = Boolean(req.permissions?.super || req.permissions?.settingsUsersRoles?.deactivate);
      if (!canDeactivate) {
        return res.status(403).json({ message: "You do not have permission to deactivate roles" });
      }
    }

    if (isActive === false) {
      const key = String(existing.key || "").trim().toLowerCase();
      const assigned = await User.countDocuments({
        church: churchId,
        $or: [{ role: key }, { roleRef: existing._id }]
      });
      if (assigned > 0) {
        return res.status(409).json({
          message: `Cannot deactivate: ${assigned} user(s) are assigned to this role. Reassign them to a different role first.`,
          assignedUsers: assigned
        });
      }
    }

    const update = {};
    if (name !== undefined) update.name = String(name || "").trim();
    if (permissions !== undefined) update.permissions = resolveSuperGrant(sanitizePermissions(permissions), "church");
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const role = await Role.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();

    return res.status(200).json({ message: "Role updated", role });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteChurchRole = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const role = await Role.findById(req.params.id).lean();
    if (!role || !role.church || String(role.church) !== String(churchId)) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Same rule as deactivating via edit — refuse while users are assigned
    // so delete can't bypass the safeguard.
    const key = String(role.key || "").trim().toLowerCase();
    const assigned = await User.countDocuments({
      church: churchId,
      $or: [{ role: key }, { roleRef: role._id }]
    });
    if (assigned > 0) {
      return res.status(409).json({
        message: `Cannot delete: ${assigned} user(s) are assigned to this role. Reassign them to a different role first.`,
        assignedUsers: assigned
      });
    }

    const updated = await Role.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).lean();

    return res.status(200).json({ message: "Role deleted", role: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  getPermissionCatalog,
  listRoles,
  createRole,
  updateRole,
  getRoleById,
  deleteRole,
  listChurchCustomRoles,
  createChurchRole,
  getChurchRoleById,
  updateChurchRole,
  deleteChurchRole
};
