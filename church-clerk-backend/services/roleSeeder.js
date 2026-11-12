import Role from "../models/roleModel.js";
import User from "../models/userModel.js";
import { MODULES, SYSTEM_MODULES } from "../config/permissions.js";
import {
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  CHURCH_ROLES,
  ROLE_DISPLAY_NAMES,
  LEGACY_ROLE_KEY_MAP,
  REMOVED_ROLE_KEYS
} from "../config/roles.js";

const titleCase = (s) => {
  const str = String(s || "").trim();
  if (!str) return "";
  return str
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
};

const displayName = (key) =>
  ROLE_DISPLAY_NAMES?.[String(key || "").trim().toLowerCase()] || titleCase(key);

// Rename role docs and user.role strings saved under the pre-rename keys so
// existing accounts keep working after the role rename. Only global docs are
// migrated — a church-owned custom role that happens to reuse a legacy key is
// legitimate user data, not a stale built-in.
const migrateLegacyRoleKeys = async () => {
  for (const [oldKey, newKey] of Object.entries(LEGACY_ROLE_KEY_MAP || {})) {
    // Users linked (roleRef) to a church-owned custom role with this key keep
    // it — they were assigned the custom role, not the removed built-in.
    const customDocs = await Role.find({ key: oldKey, church: { $ne: null } }).select("_id").lean().catch(() => []);
    const customIds = (customDocs || []).map((d) => d._id);
    const userFilter = { role: oldKey };
    if (customIds.length) userFilter.roleRef = { $nin: customIds };
    await User.updateMany(userFilter, { $set: { role: newKey } }).catch(() => {});

    const legacyDocs = await Role.find({ key: oldKey, church: null }).catch(() => []);
    for (const doc of legacyDocs || []) {
      const conflict = await Role.findOne({
        key: newKey,
        scope: doc.scope,
        church: doc.church ?? null
      })
        .select("_id")
        .lean()
        .catch(() => null);

      if (conflict?._id) {
        doc.isActive = false;
      } else {
        doc.key = newKey;
        doc.name = displayName(newKey);
      }
      await doc.save().catch(() => {});
    }
  }
};

// Global CHURCH-scope role docs that are not built-ins are leftovers from
// before the church-owned custom-role feature — delete them outright so
// they can no longer appear in role lists or resolve permissions.
// System-scope docs are left alone: they are legitimate DB-backed system
// roles managed through the admin portal (e.g. a support admin role).
// Church-owned custom roles (church != null) are legitimate data too.
const deleteNonDefaultGlobalRoles = async () => {
  const builtinKeys = [...(SYSTEM_ROLES || []), ...(CHURCH_ROLES || [])];
  const doomed = await Role.find({ scope: "church", church: null, key: { $nin: builtinKeys } })
    .select("_id")
    .lean()
    .catch(() => []);
  if (!doomed?.length) return;

  const ids = doomed.map((d) => d._id);
  await Role.deleteMany({ _id: { $in: ids } }).catch(() => {});
  await User.updateMany({ roleRef: { $in: ids } }, { $set: { roleRef: null } }).catch(() => {});
};

// Leftover system-scope docs for built-ins that were removed (e.g.
// "supportadmin") still grant admin-portal access. Delete only docs that
// were never marked with a createdBy — roles created later through the
// admin portal carry createdBy and survive, so the super admin can still
// create a system role that happens to reuse one of these keys.
const deleteRemovedBuiltinSystemRoles = async () => {
  const stale = await Role.find({
    scope: "system",
    key: { $in: REMOVED_ROLE_KEYS || [] },
    createdBy: null
  })
    .select("_id")
    .lean()
    .catch(() => []);
  if (!stale?.length) return;

  const ids = stale.map((d) => d._id);
  await Role.deleteMany({ _id: { $in: ids } }).catch(() => {});
  await User.updateMany({ roleRef: { $in: ids } }, { $set: { roleRef: null } }).catch(() => {});
};

// Church roles saved with the __all__ master key resolve to perms.super,
// which bypasses subscription plan gating. Expand them into the real full
// permission matrix — the users keep every church permission, just without
// the plan bypass. System-scope roles keep __all__ (only the super admin
// manages them anyway).
const expandLegacySuperGrants = async () => {
  const docs = await Role.find({ scope: "church", "permissions.__all__": true }).catch(() => []);
  if (!docs?.length) return;

  const full = {};
  for (const [moduleKey, actions] of Object.entries(MODULES)) {
    if (moduleKey === "settings" || (SYSTEM_MODULES || []).includes(moduleKey)) continue;
    full[moduleKey] = {};
    for (const action of actions) full[moduleKey][action] = true;
  }

  for (const doc of docs) {
    doc.permissions = { ...full };
    await doc.save().catch(() => {});
  }
};

// Users on built-in roles must point their roleRef at the built-in doc for
// their current role — a dangling or legacy doc reference should not strip
// permissions that the built-in config grants.
const repairBuiltinRoleRefs = async () => {
  for (const key of [...(SYSTEM_ROLES || []), ...(CHURCH_ROLES || [])]) {
    const doc = await Role.findOne({ key, church: null }).select("_id").lean().catch(() => null);
    if (!doc?._id) continue;
    await User.updateMany({ role: key, roleRef: { $ne: doc._id } }, { $set: { roleRef: doc._id } }).catch(() => {});
  }
};

export const seedDefaultRoles = async () => {
  // Keep the unique (key, scope, church) index in sync with the schema —
  // older databases only have (key, scope).
  await Role.syncIndexes().catch(() => {});

  await migrateLegacyRoleKeys();

  const seeds = [];

  for (const key of SYSTEM_ROLES || []) {
    seeds.push({
      key: String(key).trim().toLowerCase(),
      scope: "system",
      name: displayName(key),
      permissions: ROLE_PERMISSIONS?.[String(key).trim().toLowerCase()] || {},
      isActive: true
    });
  }

  for (const key of CHURCH_ROLES || []) {
    seeds.push({
      key: String(key).trim().toLowerCase(),
      scope: "church",
      name: displayName(key),
      permissions: ROLE_PERMISSIONS?.[String(key).trim().toLowerCase()] || {},
      isActive: true
    });
  }

  // Upsert so a previously removed-then-restored built-in reactivates its
  // existing doc (preserving _id / roleRef links) instead of staying dead.
  for (const seed of seeds) {
    if (!seed.key || !seed.scope) continue;
    await Role.findOneAndUpdate(
      { key: seed.key, scope: seed.scope, church: null },
      { $set: { name: seed.name, permissions: seed.permissions, isActive: true } },
      { upsert: true, new: true }
    ).catch(() => {});
  }

  await deleteNonDefaultGlobalRoles();
  await deleteRemovedBuiltinSystemRoles();
  await expandLegacySuperGrants();
  await repairBuiltinRoleRefs();
};
