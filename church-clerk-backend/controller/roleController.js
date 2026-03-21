import Role from "../models/roleModel.js";
import { MODULES } from "../config/permissions.js";
import User from "../models/userModel.js";

const normalizeRoleKey = (val) => {
  const key = String(val || "").trim().toLowerCase();
  return key;
};

const sanitizePermissions = (permissions) => {
  const src = permissions && typeof permissions === "object" ? permissions : {};

  if (src.__all__ === true) {
    return { __all__: true };
  }

  const out = {};
  for (const moduleKey of Object.keys(MODULES)) {
    const allowed = src[moduleKey];

    if (Array.isArray(allowed)) {
      out[moduleKey] = allowed.filter((a) => MODULES[moduleKey].includes(a));
      continue;
    }

    if (allowed && typeof allowed === "object") {
      out[moduleKey] = {};
      for (const action of MODULES[moduleKey]) {
        out[moduleKey][action] = Boolean(allowed[action]);
      }
      continue;
    }

    out[moduleKey] = {};
    for (const action of MODULES[moduleKey]) {
      out[moduleKey][action] = false;
    }
  }

  return out;
};

const getPermissionCatalog = async (req, res) => {
  try {
    return res.status(200).json({ modules: MODULES });
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

    const roles = await Role.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ roles });
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

    const exists = await Role.findOne({ key: nextKey, scope: nextScope }).lean();
    if (exists) {
      return res.status(400).json({ message: "Role key already exists" });
    }

    const role = await Role.create({
      name: nextName,
      key: nextKey,
      scope: nextScope,
      permissions: sanitizePermissions(permissions),
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

    const update = {};
    if (name !== undefined) update.name = String(name || "").trim();
    if (permissions !== undefined) update.permissions = sanitizePermissions(permissions);
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const role = await Role.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

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
    return res.status(200).json({ role });
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

    const assigned = await User.countDocuments({ roleRef: role._id });
    const updated = await Role.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).lean();

    return res.status(200).json({ message: "Role deleted", role: updated, assignedUsers: assigned });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export { getPermissionCatalog, listRoles, createRole, updateRole, getRoleById, deleteRole };
