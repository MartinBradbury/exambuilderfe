import { Link, useLocation } from "react-router-dom";
import "../styles/RouteStatus.css";

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="route-status-root">
      <div className="container route-status-shell">
        <section
          className="route-status-card"
          aria-labelledby="not-found-title"
        >
          <p className="route-status-eyebrow">Oops</p>
          <h1 id="not-found-title">
            You have navigated to a page that does not exist.
          </h1>
          <p className="route-status-copy">
            The page <strong>{location.pathname}</strong> could not be found.
            Check the address or head back to the homepage.
          </p>

          <div className="route-status-actions">
            <Link to="/" className="btn btn--primary">
              Back to Home
            </Link>
            <Link to="/login" className="btn btn--ghost">
              Log in
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
