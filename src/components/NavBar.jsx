import { useState, useContext, useEffect, useMemo } from "react";
import { Link, NavLink } from "react-router-dom";
import axios from "axios";
import "../styles/Navbar.modern.css";
import { UserContext } from "../context/UserContext";

export default function Navbar() {
  const { user, logout } = useContext(UserContext) || {};
  const [username, setUsername] = useState("");

  // === Pull username the same way your old navbar did ===
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setUsername("");
        return;
      }
      try {
        const { data } = await axios.get(
          "http://127.0.0.1:8000/accounts/user/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsername(data?.username || "");
      } catch (err) {
        console.error("Error fetching user:", err);
        setUsername("");
      }
    };
    fetchUser();
  }, [user]); // re-fetch if context user changes (login/logout)

  // Fallbacks if username is empty for any reason
  const displayName = useMemo(() => {
    if (username) return username;
    if (user?.username) return user.username;
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  }, [username, user]);

  const initials = useMemo(() => {
    const src = displayName || "U";
    return src
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  }, [displayName]);

  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <header className={`site-navbarV2 ${open ? "is-open" : ""}`}>
      <div className="container nav-inner">
        {/* Brand */}
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-dot" aria-hidden="true" />
          A-Level Bio
        </Link>

        {/* Desktop nav */}
        <nav className="nav-links" aria-label="Primary">
          <NavLink
            to="/question-generator"
            className={({ isActive }) =>
              isActive ? "nav-link is-active" : "nav-link"
            }
          >
            Generator
          </NavLink>
          <NavLink
            to="/my-results"
            className={({ isActive }) =>
              isActive ? "nav-link is-active" : "nav-link"
            }
          >
            Results
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              isActive ? "nav-link is-active" : "nav-link"
            }
          >
            About
          </NavLink>
        </nav>

        {/* Right side actions */}
        <div className="nav-actions">
          {user ? (
            <>
              <div className="user-info" title={displayName}>
                <div className="avatar">{initials}</div>
                <span className="username">{displayName}</span>
              </div>
              <button className="btn btn--ghost logout" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn--ghost">
                Log in
              </NavLink>
              <NavLink to="/register" className="btn btn--primary">
                Sign up
              </NavLink>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="hamburger"
          aria-label="Toggle menu"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className="mobile-drawer" aria-hidden={!open}>
        <nav className="mobile-links" aria-label="Mobile">
          <NavLink
            to="/question-generator"
            className="mobile-link"
            onClick={closeMenu}
          >
            Generator
          </NavLink>
          <NavLink to="/my-results" className="mobile-link" onClick={closeMenu}>
            Results
          </NavLink>
          <NavLink to="/about" className="mobile-link" onClick={closeMenu}>
            About
          </NavLink>

          <div className="mobile-actions">
            {user ? (
              <>
                <div className="mobile-user">
                  <div className="avatar">{initials}</div>
                  <div className="mobile-identity">
                    <strong>{displayName}</strong>
                    {/* If you also want email here: <small className="muted">{user?.email}</small> */}
                  </div>
                </div>
                <button
                  className="btn btn--ghost logout"
                  onClick={() => {
                    logout?.();
                    closeMenu();
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="btn btn--ghost"
                  onClick={closeMenu}
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  className="btn btn--primary"
                  onClick={closeMenu}
                >
                  Sign up
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
