import { Link } from "react-router-dom";
import "../styles/Legal.css";

export default function LegalPageLayout({
  title,
  intro,
  lastUpdated,
  children,
}) {
  return (
    <div className="legal-root">
      <div className="container legal-shell">
        <header className="legal-hero">
          <p className="legal-eyebrow">Legal</p>
          <h1>{title}</h1>
          <p className="legal-intro">{intro}</p>
          <p className="legal-meta">Last updated: {lastUpdated}</p>
        </header>

        <article className="legal-card">{children}</article>

        <nav className="legal-links" aria-label="Legal pages">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/paid-plan-terms">Paid Plan Terms</Link>
          <Link to="/refund-policy">Refund Policy</Link>
        </nav>
      </div>
    </div>
  );
}
