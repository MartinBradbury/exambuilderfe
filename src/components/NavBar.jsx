import { useState, useContext, useMemo } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../styles/NavBar.modern.css";
import { UserContext } from "../context/UserContextObject";
import {
  getAccessPlanLabel,
  getMissingUpgradeQualifications,
} from "../lib/access";

export default function Navbar() {
  const { user, logout } = useContext(UserContext) || {};
  const navigate = useNavigate();
  const showUpgradeCta =
    Boolean(user) && getMissingUpgradeQualifications(user).length > 0;
  const membershipLabel = getAccessPlanLabel(user);

  const displayName = useMemo(() => {
    if (user?.username) return user.username;
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  }, [user]);

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

  const handleLogout = async () => {
    closeMenu();
    navigate("/", { replace: true });
    await logout?.();
  };

  return (
    <header className={`site-navbarV2 ${open ? "is-open" : ""}`}>
      <div className="container nav-inner">
        {user ? (
          <Link
            to="/account"
            className="mobile-accountButton"
            aria-label="Go to account"
            onClick={closeMenu}
          >
            <span className="avatar">{initials}</span>
          </Link>
        ) : null}

        {/* Brand */}
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-dot" aria-hidden="true" />
          Exam Builder
        </Link>

        {/* Desktop nav */}
        <nav className="nav-links" aria-label="Primary">
          {user && (
            <>
              <NavLink
                to="/question-generator"
                className={({ isActive }) =>
                  isActive ? "nav-link is-active" : "nav-link"
                }
              >
                Start Practicing
              </NavLink>
              <NavLink
                to="/progress"
                className={({ isActive }) =>
                  isActive ? "nav-link is-active" : "nav-link"
                }
              >
                Progress
              </NavLink>
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  isActive ? "nav-link is-active" : "nav-link"
                }
              >
                Account
              </NavLink>
            </>
          )}
        </nav>

        {/* Right side actions */}
        <div className="nav-actions">
          {user ? (
            <div className="user-cluster">
              <div className="user-info" title={displayName}>
                <div className="avatar">{initials}</div>
                <div className="user-meta">
                  <span className="username">{displayName}</span>
                  <span className="membership-badge">{membershipLabel}</span>
                </div>
              </div>
              <div className="user-actions">
                {showUpgradeCta && (
                  <NavLink
                    to="/account"
                    className="btn btn--primary nav-upgrade"
                  >
                    Unlock Access
                  </NavLink>
                )}
                <button
                  className="btn btn--subtle logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
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
          {user && (
            <>
              <NavLink
                to="/question-generator"
                className="mobile-link"
                onClick={closeMenu}
              >
                Start Practicing
              </NavLink>
              <NavLink
                to="/progress"
                className="mobile-link"
                onClick={closeMenu}
              >
                Progress
              </NavLink>
              <NavLink
                to="/account"
                className="mobile-link"
                onClick={closeMenu}
              >
                Account
              </NavLink>
            </>
          )}

          <div className="mobile-actions">
            {user ? (
              <>
                <div className="mobile-user">
                  <div className="avatar">{initials}</div>
                  <div className="mobile-identity">
                    <span className="mobile-username">{displayName}</span>
                    <span className="mobile-membership">{membershipLabel}</span>
                  </div>
                </div>
                {showUpgradeCta && (
                  <NavLink
                    to="/account"
                    className="btn btn--primary"
                    onClick={closeMenu}
                  >
                    Unlock Access
                  </NavLink>
                )}
                <button
                  className="btn btn--subtle logout"
                  onClick={handleLogout}
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
