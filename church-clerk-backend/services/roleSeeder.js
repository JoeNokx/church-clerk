import Role from "../models/roleModel.js";
import { ROLE_PERMISSIONS, SYSTEM_ROLES, CHURCH_ROLES } from "../config/roles.js";

const titleCase = (s) => {
  const str = String(s || "").trim();
  if (!str) return "";
  return str
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
};

export const seedDefaultRoles = async () => {
  const seeds = [];

  for (const key of SYSTEM_ROLES || []) {
    seeds.push({
      key: String(key).trim().toLowerCase(),
      scope: "system",
      name: titleCase(key),
      permissions: ROLE_PERMISSIONS?.[String(key).trim().toLowerCase()] || {},
      isActive: true
    });
  }

  for (const key of CHURCH_ROLES || []) {
    seeds.push({
      key: String(key).trim().toLowerCase(),
      scope: "church",
      name: titleCase(key),
      permissions: ROLE_PERMISSIONS?.[String(key).trim().toLowerCase()] || {},
      isActive: true
    });
  }

  for (const seed of seeds) {
    if (!seed.key || !seed.scope) continue;

    const exists = await Role.findOne({ key: seed.key, scope: seed.scope }).select("_id").lean();
    if (exists?._id) continue;

    await Role.create(seed);
  }
};
