import { createContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode"; // note the named import

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // On mount, check for a token in localStorage
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check expiry
        if (decoded.exp * 1000 < Date.now()) {
          console.log("Token expired");
          localStorage.removeItem("accessToken");
          setUser(null);
        } else {
          setUser(decoded);
        }
      } catch (err) {
        console.error("Error decoding token", err);
        setUser(null);
      }
    }
  }, []);

  const login = (token) => {
    localStorage.setItem("accessToken", token);
    const decoded = jwtDecode(token);
    setUser(decoded);
  };

  // Logout function to clear tokens and user state
  // This function will also blacklist the refresh token on the backend
  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const accessToken = localStorage.getItem("accessToken");

    if (refreshToken && accessToken) {
      try {
        await fetch(
          "https://exambuilder-efae14d59f03.herokuapp.com/accounts/logout/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ refresh: refreshToken }),
          }
        );
      } catch (err) {
        console.error("Error blacklisting token:", err);
        // even if it fails, we still clear local state for safety
      }
    }

    // Clear tokens and user state
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
