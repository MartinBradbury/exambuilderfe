import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserContext } from "../context/UserContextObject";
import "../styles/RouteStatus.css";

export default function AccessDenied() {
  const { user } = useContext(UserContext) || {};
  const location = useLocation();
  const attemptedPath = location.state?.from?.pathname || null;

  return (
    <div className="route-status-root">
      <div className="container route-status-shell">
        <section className="route-status-card" aria-labelledby="access-title">
          <p className="route-status-eyebrow">Access restricted</p>
          <h1 id="access-title">You cannot access this page right now.</h1>
          <p className="route-status-copy">
            {user
              ? "This page is not available to your current session. Return home and continue from an allowed page."
              : "Please log in to continue to this part of Exam Builder."}
          </p>
          {attemptedPath && (
            <p className="route-status-path">
              Requested page: <strong>{attemptedPath}</strong>
            </p>
          )}

          <div className="route-status-actions">
            <Link to="/" className="btn btn--primary">
              Go to Home
            </Link>
            {!user && (
              <Link to="/login" className="btn btn--ghost">
                Log in
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
