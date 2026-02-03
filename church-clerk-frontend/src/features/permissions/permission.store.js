import { createContext, useState, createElement } from "react";

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const [permissions, setPermissionsState] = useState({});

  const setPermissions = (permissionObject) => {
    setPermissionsState(permissionObject || {});
  };

  const clearPermissions = () => {
    setPermissionsState({});
  };

  const can = (moduleName, action) => {
    if (!permissions || Object.keys(permissions).length === 0) return false;

    if (permissions.super === true) return true;

    const modulePermissions = permissions[moduleName];
    if (!modulePermissions) return false;

    if (modulePermissions[action] !== true) return false;

    return true;
  };

  return createElement(
    PermissionContext.Provider,
    {
      value: {
        permissions,
        setPermissions,
        clearPermissions,
        can
      }
    },
    children
  );
}

export default PermissionContext;
