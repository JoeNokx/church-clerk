import { createContext, useContext, useEffect, useState } from "react";
import { loginUser, logoutUser, getMyProfile } from "./services/auth.api.js";
import PermissionContext from "../permissions/permission.store.js";
import ChurchContext from "../church/church.store.js";


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const permissionCtx = useContext(PermissionContext);
  const churchCtx = useContext(ChurchContext);

  /**
   * Restore session on app load
   * Backend (/user/me) is the source of truth
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await getMyProfile();
        const payload = res?.data?.data;
        setUser(payload?.user);
        permissionCtx?.setPermissions?.(payload?.permissions);
        churchCtx?.setActiveChurch?.(payload?.activeChurch);
      } catch {
        setUser(null);
        permissionCtx?.clearPermissions?.();
        churchCtx?.clearActiveChurch?.();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const refreshUser = async () => {
    const res = await getMyProfile();
    const payload = res?.data?.data;
    const userData = payload?.user;
    setUser(userData);
    permissionCtx?.setPermissions?.(payload?.permissions);
    churchCtx?.setActiveChurch?.(payload?.activeChurch);
    return userData;
  };

  /**
   * Login
   */
  const login = async ({ email, password }) => {
    await loginUser({ email, password });

    const userData = await refreshUser();
    return userData;
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      permissionCtx?.clearPermissions?.();
      churchCtx?.clearActiveChurch?.();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        refreshUser,
        login,
        logout,
        loading,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
