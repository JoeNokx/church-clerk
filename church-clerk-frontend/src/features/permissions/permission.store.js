import { createContext, useContext, useState, createElement } from "react";
import ChurchContext from "../church/church.store.js";

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const [permissions, setPermissionsState] = useState({});

  const churchCtx = useContext(ChurchContext);
  const activeChurch = churchCtx?.activeChurch;

  const setPermissions = (permissionObject) => {
    setPermissionsState(permissionObject || {});
  };

  const clearPermissions = () => {
    setPermissionsState({});
  };

  const can = (moduleName, action) => {
    if (!permissions || Object.keys(permissions).length === 0) return false;

    if (permissions.super === true) return true;

    const isWriteAction = action === "create" || action === "update" || action === "delete";
    if (isWriteAction) {
      const activeFlag = typeof window !== "undefined" ? localStorage.getItem("userIsActive") : "1";
      if (activeFlag === "0") {
        return false;
      }
    }
    if (isWriteAction && activeChurch?._id && activeChurch?.canEdit === false) {
      return false;
    }

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
