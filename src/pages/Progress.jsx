import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import ResultsHistory from "../components/ResultsHistory";
import { UserContext } from "../context/UserContextObject";
import "../styles/Account.modern.css";

export default function Progress() {
  const { hasAnyPaidAccess } = useContext(UserContext) || {};
  const location = useLocation();
  const initialOverviewLevel = location.state?.initialOverviewLevel || null;

  const handleScrollToTop = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="account-root">
      <div className="account-shell container">
        <header className="account-header">
          <div>
            <h3 className="account-eyebrow">Performance and history</h3>
          </div>
        </header>

        <ResultsHistory
          showHeader={false}
          analyticsLocked={!hasAnyPaidAccess}
          upgradePath="/account"
          initialOverviewLevel={initialOverviewLevel}
          afterOverviewAction={
            <div className="account-actions account-actions--progressInline">
              <Link to="/question-generator" className="btn btn--primary">
                Start another test
              </Link>
            </div>
          }
        />

        <div className="account-actions account-actions--progressFooter">
          <Link to="/account" className="btn btn--ghost">
            Return to account
          </Link>
        </div>

        <div className="account-progressTopControl">
          <button
            type="button"
            className="account-progressTopButton"
            onClick={handleScrollToTop}
            aria-label="Back to top"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
