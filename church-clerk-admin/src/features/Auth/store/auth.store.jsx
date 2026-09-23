import { createContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMyProfile, loginUser, logoutUser } from "../services/auth.api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await getMyProfile();
        const payload = res?.data?.data;
        const nextUser = payload?.user || null;

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
      queryClient.clear();
      localStorage.removeItem("cckSystemAdminUserId");
      localStorage.removeItem("systemAdminUserIsActive");
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
