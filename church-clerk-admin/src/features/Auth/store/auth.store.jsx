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

        setUser(nextUser);

        if (nextUser) {
          localStorage.setItem("userIsActive", nextUser?.isActive === false ? "0" : "1");
        } else {
          localStorage.removeItem("userIsActive");
        }

        churchCtx?.setActiveChurch?.(payload?.activeChurch);
      } catch {
        setUser(null);
        localStorage.removeItem("userIsActive");
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

    if (userData) {
      localStorage.setItem("userIsActive", userData?.isActive === false ? "0" : "1");
    } else {
      localStorage.removeItem("userIsActive");
    }

    churchCtx?.setActiveChurch?.(payload?.activeChurch);
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
      localStorage.removeItem("userIsActive");
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
