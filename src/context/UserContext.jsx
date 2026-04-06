import { useCallback, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { AUTH_LOGOUT_EVENT, api } from "../lib/api";
import { UserContext } from "./UserContextObject";

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      setUser(null);
      return null;
    }

    const { data } = await api.get("/accounts/user/");
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    return data;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeUser = async () => {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        if (isMounted) setAuthReady(true);
        return;
      }

      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          clearAuthState();
          return;
        }

        if (isMounted) {
          setUser(decoded);
        }

        await refreshCurrentUser();
      } catch (err) {
        console.error("Error restoring session", err);
        clearAuthState();
      } finally {
        if (isMounted) setAuthReady(true);
      }
    };

    const handleForcedLogout = () => {
      clearAuthState();
      if (isMounted) setAuthReady(true);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
    initializeUser();

    return () => {
      isMounted = false;
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
    };
  }, [clearAuthState, refreshCurrentUser]);

  const login = useCallback(
    async (accessToken, refreshToken) => {
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      try {
        const decoded = jwtDecode(accessToken);
        setUser(decoded);
      } catch (err) {
        console.error("Error decoding token", err);
      }

      setAuthReady(false);
      try {
        return await refreshCurrentUser();
      } finally {
        setAuthReady(true);
      }
    },
    [refreshCurrentUser],
  );

  const updateEntitlement = useCallback((updates) => {
    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    setUser((currentUser) => ({
      ...(currentUser || {}),
      ...updates,
    }));
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    if (refreshToken) {
      try {
        await api.post("/accounts/logout/", { refresh: refreshToken });
      } catch (err) {
        console.error("Error blacklisting token:", err);
      }
    }

    clearAuthState();
  }, [clearAuthState]);

  const contextValue = useMemo(() => {
    const planType = user?.plan_type ?? null;
    const hasUnlimitedAccess = Boolean(
      user?.has_unlimited_access ||
      user?.lifetime_unlocked ||
      planType === "lifetime",
    );

    return {
      user,
      login,
      logout,
      authReady,
      refreshCurrentUser,
      updateEntitlement,
      planType,
      hasUnlimitedAccess,
      questionsRemainingToday: user?.questions_remaining_today ?? null,
    };
  }, [authReady, login, logout, refreshCurrentUser, updateEntitlement, user]);

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
};
