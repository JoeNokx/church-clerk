import { ROLE_PERMISSIONS } from "../config/roles.js";
import { MODULES } from "../config/permissions.js";

export const resolvePermissions = (role) => {
  const roleConfig = ROLE_PERMISSIONS[role];

  if (!roleConfig) return {};

  // Super / wildcard access
  if (roleConfig.__all__) {
    return { super: true };
  }

  const resolved = {};

  for (const moduleName of Object.keys(MODULES)) {
    resolved[moduleName] = {};

    const allowedActions = roleConfig[moduleName] || [];

    MODULES[moduleName].forEach(action => {
      resolved[moduleName][action] = allowedActions.includes(action);
    });
  }

  return resolved;
};
