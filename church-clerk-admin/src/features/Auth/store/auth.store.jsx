import { createContext, useContext, useEffect, useState } from "react";
import { getMyProfile, loginUser, logoutUser } from "../Services/auth.api.js";
import ChurchContext from "../../Church/church.store.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const churchCtx = useContext(ChurchContext);

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

        if (nextUser) {
          localStorage.setItem("systemAdminUserIsActive", nextUser?.isActive === false ? "0" : "1");
        } else {
          localStorage.removeItem("systemAdminUserIsActive");
        }

        const inViewMode = typeof window !== "undefined" && localStorage.getItem("systemAdminViewChurch") === "1";
        if (inViewMode) {
          churchCtx?.setActiveChurch?.(payload?.activeChurch);
        } else {
          churchCtx?.clearActiveChurch?.();
        }
      } catch {
        setUser(null);
        localStorage.removeItem("cckSystemAdminUserId");
        localStorage.removeItem("systemAdminUserIsActive");
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

    if (userData) {
      localStorage.setItem("systemAdminUserIsActive", userData?.isActive === false ? "0" : "1");
    } else {
      localStorage.removeItem("systemAdminUserIsActive");
    }

    const inViewMode = typeof window !== "undefined" && localStorage.getItem("systemAdminViewChurch") === "1";
    if (inViewMode) {
      churchCtx?.setActiveChurch?.(payload?.activeChurch);
    } else {
      churchCtx?.clearActiveChurch?.();
    }
    return userData;
  };

  const login = async ({ email, password }) => {
    await loginUser({ email, password });
    const userData = await refreshUser();
    return userData;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      localStorage.removeItem("cckSystemAdminUserId");
      localStorage.removeItem("systemAdminUserIsActive");
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
