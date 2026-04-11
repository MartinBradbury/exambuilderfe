import { Link } from "react-router-dom";
import ResultsHistory from "../components/ResultsHistory";
import "../styles/Account.modern.css";

export default function Progress() {
  return (
    <div className="account-root">
      <div className="account-shell container">
        <header className="account-header">
          <div>
            <p className="account-eyebrow">Progress</p>
            <h1>Performance and history</h1>
            <p className="account-muted">
              Review saved sessions, track trends over time, and compare module
              and subtopic performance across your completed tests.
            </p>
          </div>
          <div className="account-actions">
            <Link to="/question-generator" className="btn btn--primary">
              Start another test
            </Link>
            <Link to="/account" className="btn btn--ghost">
              Back to account
            </Link>
          </div>
        </header>

        <ResultsHistory showHeader={false} />
      </div>
    </div>
  );
}
