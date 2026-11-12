import { createContext, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMyProfile, loginUser, logoutUser } from "../services/auth.api.js";

const AuthContext = createContext(null);

function NoPermissionModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-semibold text-gray-900">Permission Required</div>
        </div>
        <div className="px-5 py-4">
          <div className="text-sm text-gray-700">
            You don&apos;t have permission to perform this action. Contact a super admin if you believe you should have access.
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noPermModalOpen, setNoPermModalOpen] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await getMyProfile();
        const payload = res?.data?.data;
        const nextUser = payload?.user || null;
        setPermissions(payload?.permissions || null);

        const nextId = nextUser?._id ? String(nextUser._id) : "";
        if (typeof window !== "undefined") {
          if (nextId) localStorage.setItem("cckSystemAdminUserId", nextId);
          else localStorage.removeItem("cckSystemAdminUserId");
        }

        setUser(nextUser);
        queryClient.setQueryData(["user"], nextUser);

        if (nextUser) {
          localStorage.setItem("systemAdminUserIsActive", nextUser?.isActive === false ? "0" : "1");
        } else {
          localStorage.removeItem("systemAdminUserIsActive");
        }
      } catch {
        setUser(null);
        setPermissions(null);
        queryClient.clear();
        localStorage.removeItem("cckSystemAdminUserId");
        localStorage.removeItem("systemAdminUserIsActive");
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
    setPermissions(payload?.permissions || null);

    const nextId = userData?._id ? String(userData._id) : "";
    if (typeof window !== "undefined") {
      if (nextId) localStorage.setItem("cckSystemAdminUserId", nextId);
      else localStorage.removeItem("cckSystemAdminUserId");
    }

    setUser(userData);
    queryClient.setQueryData(["user"], userData);

    if (userData) {
      localStorage.setItem("systemAdminUserIsActive", userData?.isActive === false ? "0" : "1");
    } else {
      localStorage.removeItem("systemAdminUserIsActive");
    }
    return userData;
  };

  const login = async ({ email, password }) => {
    await loginUser({ email, password });
    return await refreshUser();
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setPermissions(null);
      queryClient.clear();
      localStorage.removeItem("cckSystemAdminUserId");
      localStorage.removeItem("systemAdminUserIsActive");
    }
  };

  // Mirror of the backend requirePermission check: perms.super (from an
  // __all__ role matrix) grants everything, otherwise the specific
  // module/action flag decides.
  const hasPermission = (moduleKey, action) =>
    Boolean(permissions?.super || permissions?.[moduleKey]?.[action]);

  /**
   * Click-guard for write actions: runs `action` when the admin has the
   * module/action permission, otherwise pops the no-permission modal
   * immediately instead of letting them fill a form and fail on submit.
   * Returns true when the action ran.
   */
  const guardPermission = useCallback(
    (moduleKey, action, fn) => {
      if (!hasPermission(moduleKey, action)) {
        setNoPermModalOpen(true);
        return false;
      }
      if (typeof fn === "function") fn();
      return true;
    },
    [permissions]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        refreshUser,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        permissions,
        hasPermission,
        guardPermission
      }}
    >
      {children}
      <NoPermissionModal open={noPermModalOpen} onClose={() => setNoPermModalOpen(false)} />
    </AuthContext.Provider>
  );
}

export default AuthContext;
