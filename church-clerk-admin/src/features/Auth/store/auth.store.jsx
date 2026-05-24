import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMyProfile, loginUser, logoutUser } from "../services/auth.api.js";
import ChurchContext from "../../Church/church.store.js";
import PermissionContext from "../../Permissions/permission.store.js";
import { getDashboardAnalytics, getDashboardKPI, getDashboardWidgets } from "../../Dashboard/services/dashboard.api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();

  const churchCtx = useContext(ChurchContext);
  const permCtx = useContext(PermissionContext);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await getMyProfile();
        const payload = res?.data?.data;
        const nextUser = payload?.user || null;

        const nextId = nextUser?._id ? String(nextUser._id) : "";
        const prevId = typeof window !== "undefined" ? String(localStorage.getItem("cckSystemAdminUserId") || "") : "";
        if (typeof window !== "undefined" && prevId && nextId && prevId !== nextId) {
          localStorage.removeItem("systemAdminActiveChurch");
          localStorage.removeItem("systemAdminViewChurch");
          localStorage.removeItem("adminViewChurch");
          localStorage.removeItem("systemAdminUserIsActive");
          churchCtx?.clearActiveChurch?.();
        }
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

        const inViewMode = typeof window !== "undefined" && localStorage.getItem("systemAdminViewChurch") === "1";
        const activeChurchId = typeof window !== "undefined" ? localStorage.getItem("systemAdminActiveChurch") : null;

        if (inViewMode && activeChurchId && typeof churchCtx?.enterChurchView === "function") {
          try {
            const viewPayload = await churchCtx.enterChurchView(activeChurchId);
            permCtx?.setPermissions?.(viewPayload?.permissions || { super: true });
          } catch {
            permCtx?.clearPermissions?.();
          }
        } else {
          permCtx?.clearPermissions?.();
          churchCtx?.clearActiveChurch?.();
        }

        if (nextUser) {
          const year = new Date().getFullYear();
          await Promise.allSettled([
            queryClient.prefetchQuery({
              queryKey: ["dashboard", "kpi"],
              queryFn: async () => {
                const res = await getDashboardKPI();
                return res?.data?.kpis || null;
              }
            }),
            queryClient.prefetchQuery({
              queryKey: ["dashboard", "widgets"],
              queryFn: async () => {
                const res = await getDashboardWidgets();
                return res?.data?.dashboardWidget || null;
              }
            }),
            queryClient.prefetchQuery({
              queryKey: ["dashboard", "analytics", year],
              queryFn: async () => {
                const res = await getDashboardAnalytics({ year });
                return res?.data?.analyticsDashboard || null;
              }
            })
          ]);
        }
      } catch {
        setUser(null);
        queryClient.clear();
        localStorage.removeItem("cckSystemAdminUserId");
        localStorage.removeItem("systemAdminUserIsActive");
        churchCtx?.clearActiveChurch?.();
        permCtx?.clearPermissions?.();
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

    const nextId = userData?._id ? String(userData._id) : "";
    const prevId = typeof window !== "undefined" ? String(localStorage.getItem("cckSystemAdminUserId") || "") : "";
    if (typeof window !== "undefined" && prevId && nextId && prevId !== nextId) {
      localStorage.removeItem("systemAdminActiveChurch");
      localStorage.removeItem("systemAdminViewChurch");
      localStorage.removeItem("adminViewChurch");
      localStorage.removeItem("systemAdminUserIsActive");
      churchCtx?.clearActiveChurch?.();
    }
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

    const inViewMode = typeof window !== "undefined" && localStorage.getItem("systemAdminViewChurch") === "1";
    const activeChurchId = typeof window !== "undefined" ? localStorage.getItem("systemAdminActiveChurch") : null;

    if (inViewMode && activeChurchId && typeof churchCtx?.enterChurchView === "function") {
      try {
        const viewPayload = await churchCtx.enterChurchView(activeChurchId);
        permCtx?.setPermissions?.(viewPayload?.permissions || { super: true });
      } catch {
        permCtx?.clearPermissions?.();
      }
    } else {
      permCtx?.clearPermissions?.();
      churchCtx?.clearActiveChurch?.();
    }
    return userData;
  };

  const login = async ({ email, password }) => {
    await loginUser({ email, password });
    const userData = await refreshUser();

    if (userData) {
      const year = new Date().getFullYear();
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "kpi"],
          queryFn: async () => {
            const res = await getDashboardKPI();
            return res?.data?.kpis || null;
          }
        }),
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "widgets"],
          queryFn: async () => {
            const res = await getDashboardWidgets();
            return res?.data?.dashboardWidget || null;
          }
        }),
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "analytics", year],
          queryFn: async () => {
            const res = await getDashboardAnalytics({ year });
            return res?.data?.analyticsDashboard || null;
          }
        })
      ]);
    }
    return userData;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      queryClient.clear();
      localStorage.removeItem("cckSystemAdminUserId");
      localStorage.removeItem("systemAdminUserIsActive");
      churchCtx?.clearActiveChurch?.();
      permCtx?.clearPermissions?.();
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
