import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { loginUser, logoutUser, getMyProfile } from "./services/auth.api.js";
import PermissionContext from "../permissions/permission.store.js";
import ChurchContext from "../church/church.store.js";
import { getDashboardAnalytics, getDashboardKPI, getDashboardWidgets } from "../dashboard/services/dashboard.api.js";


const AuthContext = createContext(null);

const AUTH_TOKEN_KEY = "cckAuthToken";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();

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
        const nextUser = payload?.user || null;

        const nextId = nextUser?._id ? String(nextUser._id) : "";
        const prevId = typeof window !== "undefined" ? String(localStorage.getItem("cckUserId") || "") : "";
        if (typeof window !== "undefined" && prevId && nextId && prevId !== nextId) {
          localStorage.removeItem("activeChurch");
          localStorage.removeItem("subscriptionReadOnly");
          localStorage.removeItem("userIsActive");
          permissionCtx?.clearPermissions?.();
          churchCtx?.clearActiveChurch?.();
        }
        if (typeof window !== "undefined") {
          if (nextId) localStorage.setItem("cckUserId", nextId);
          else localStorage.removeItem("cckUserId");
        }

        setUser(nextUser);
        queryClient.setQueryData(["user"], nextUser);
        if (nextUser) {
          localStorage.setItem("userIsActive", nextUser?.isActive === false ? "0" : "1");
        } else {
          localStorage.removeItem("userIsActive");
        }
        permissionCtx?.setPermissions?.(payload?.permissions);
        churchCtx?.setActiveChurch?.(payload?.activeChurch);

        if (nextUser) {
          const year = new Date().getFullYear();
          const churchId = payload?.activeChurch?._id || null;
          void Promise.allSettled([
            queryClient.prefetchQuery({
              queryKey: ["dashboard", "kpi", churchId],
              staleTime: 0,
              queryFn: async () => {
                const res = await getDashboardKPI();
                return res?.data?.kpis || null;
              }
            }),
            queryClient.prefetchQuery({
              queryKey: ["dashboard", "widgets", churchId],
              staleTime: 0,
              queryFn: async () => {
                const res = await getDashboardWidgets();
                return res?.data?.dashboardWidget || null;
              }
            }),
            queryClient.prefetchQuery({
              queryKey: ["dashboard", "analytics", churchId, year],
              staleTime: 0,
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
        localStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem("cckUserId");
        localStorage.removeItem("userIsActive");
        localStorage.removeItem("subscriptionReadOnly");
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

    const nextId = userData?._id ? String(userData._id) : "";
    const prevId = typeof window !== "undefined" ? String(localStorage.getItem("cckUserId") || "") : "";
    if (typeof window !== "undefined" && prevId && nextId && prevId !== nextId) {
      localStorage.removeItem("activeChurch");
      localStorage.removeItem("subscriptionReadOnly");
      localStorage.removeItem("userIsActive");
      permissionCtx?.clearPermissions?.();
      churchCtx?.clearActiveChurch?.();
    }
    if (typeof window !== "undefined") {
      if (nextId) localStorage.setItem("cckUserId", nextId);
      else localStorage.removeItem("cckUserId");
    }

    setUser(userData);
    queryClient.setQueryData(["user"], userData);
    if (userData) {
      localStorage.setItem("userIsActive", userData?.isActive === false ? "0" : "1");
    } else {
      localStorage.removeItem("userIsActive");
    }
    permissionCtx?.setPermissions?.(payload?.permissions);
    churchCtx?.setActiveChurch?.(payload?.activeChurch);
    return userData;
  };

  /**
   * Login
   */
  const login = async ({ email, password, rememberMe }) => {
    const res = await loginUser({ email, password, rememberMe });

    const token = res?.data?.token;
    if (token) {
      if (rememberMe) {
        localStorage.setItem(AUTH_TOKEN_KEY, String(token));
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      } else {
        sessionStorage.setItem(AUTH_TOKEN_KEY, String(token));
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }

    const userData = await refreshUser();

    if (userData) {
      const year = new Date().getFullYear();
      const churchId = userData?.church?._id || (typeof userData?.church === "string" ? userData.church : null);
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "kpi", churchId],
          staleTime: 0,
          queryFn: async () => {
            const res = await getDashboardKPI();
            return res?.data?.kpis || null;
          }
        }),
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "widgets", churchId],
          staleTime: 0,
          queryFn: async () => {
            const res = await getDashboardWidgets();
            return res?.data?.dashboardWidget || null;
          }
        }),
        queryClient.prefetchQuery({
          queryKey: ["dashboard", "analytics", churchId, year],
          staleTime: 0,
          queryFn: async () => {
            const res = await getDashboardAnalytics({ year });
            return res?.data?.analyticsDashboard || null;
          }
        })
      ]);
    }
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
      queryClient.clear();
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("cckUserId");
      localStorage.removeItem("userIsActive");
      localStorage.removeItem("subscriptionReadOnly");
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
