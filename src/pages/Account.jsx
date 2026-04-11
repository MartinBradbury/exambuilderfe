import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmailVerificationNotice from "../components/EmailVerificationNotice";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import {
  ALEVEL_QUALIFICATION,
  GCSE_QUALIFICATION,
  getAccessPlanLabel,
  getMissingUpgradeQualifications,
  getQualificationLabel,
  getQualificationAccessState,
  hasAccessToQualification,
} from "../lib/access";
import {
  buildPerformanceSummary,
  isSessionOnOrAfterDate,
} from "../lib/performance";
import "../styles/Account.modern.css";

const RETRY_DELAYS_MS = [1500, 3000];
const PENDING_CHECKOUT_KEY = "pendingCheckoutQualification";

const formatTrackingDate = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatMetricValue = (value, suffix = "") =>
  value == null ? "--" : `${value}${suffix}`;

const SectionTitle = ({ title }) => (
  <div className="account-sectionTitle">
    <h2>{title}</h2>
  </div>
);

export default function Account() {
  const {
    user,
    authReady,
    refreshCurrentUser,
    logout,
    planType,
    emailVerified,
    hasGcseAccess,
    hasALevelAccess,
    hasAnyPaidAccess,
    hasFullAccess,
    questionsRemainingToday,
  } = useContext(UserContext) || {};
  const [searchParams] = useSearchParams();
  const checkoutState = searchParams.get("checkout");
  const retryTimeoutsRef = useRef([]);

  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [statusBanner, setStatusBanner] = useState("");
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [hasAcceptedPurchaseTerms, setHasAcceptedPurchaseTerms] =
    useState(false);
  const [selectedCheckoutQualification, setSelectedCheckoutQualification] =
    useState(ALEVEL_QUALIFICATION);
  const [performanceSessions, setPerformanceSessions] = useState([]);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(true);
  const [performanceError, setPerformanceError] = useState("");
  const [trackingResetError, setTrackingResetError] = useState("");
  const [isTrackingResetModalOpen, setIsTrackingResetModalOpen] =
    useState(false);
  const [isStartingNewTrackingPeriod, setIsStartingNewTrackingPeriod] =
    useState(false);

  const isLoggedIn = Boolean(user);
  const planLabel = useMemo(() => getAccessPlanLabel(user), [user]);
  const needsEmailVerification = isLoggedIn && !emailVerified;
  const missingUpgradeQualifications = useMemo(
    () => getMissingUpgradeQualifications(user),
    [user],
  );
  const canUpgrade =
    Boolean(user) && missingUpgradeQualifications.length > 0 && emailVerified;
  const numericRemaining =
    questionsRemainingToday == null ? null : Number(questionsRemainingToday);
  const performanceTrackingStartDate =
    user?.performance_tracking_start_date || user?.stats_reset_at || null;
  const selectedCheckoutLabel = getQualificationLabel(
    selectedCheckoutQualification,
  );
  const checkoutStatus = useMemo(
    () => getQualificationAccessState(user),
    [user],
  );

  useEffect(() => {
    if (
      missingUpgradeQualifications.length > 0 &&
      !missingUpgradeQualifications.includes(selectedCheckoutQualification)
    ) {
      setSelectedCheckoutQualification(missingUpgradeQualifications[0]);
    }
  }, [missingUpgradeQualifications, selectedCheckoutQualification]);

  useEffect(() => {
    return () => {
      retryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      retryTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!authReady || !isLoggedIn) {
      return;
    }

    retryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    retryTimeoutsRef.current = [];

    if (checkoutState === "cancelled") {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      setStatusBanner("Checkout was cancelled. Your access has not changed.");
      return;
    }

    if (checkoutState !== "success") {
      setStatusBanner("");
      return;
    }

    let isActive = true;
    const pendingQualification =
      window.sessionStorage.getItem(PENDING_CHECKOUT_KEY) || null;

    const checkStatus = async () => {
      if (!refreshCurrentUser) {
        return;
      }

      setIsRefreshingStatus(true);
      try {
        const refreshedUser = await refreshCurrentUser();
        const accessActivated = pendingQualification
          ? hasAccessToQualification(refreshedUser, pendingQualification)
          : getQualificationAccessState(refreshedUser).hasAnyPaidAccess;

        if (!isActive) {
          return;
        }

        if (accessActivated) {
          window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
          setStatusBanner(
            pendingQualification
              ? `Payment received. ${getQualificationLabel(pendingQualification)} access is now active.`
              : "Payment received. Your access has been updated.",
          );
          return;
        }

        setStatusBanner(
          "Your payment is still being processed. Please refresh in a moment if your plan has not updated yet.",
        );

        RETRY_DELAYS_MS.forEach((delayMs) => {
          const timeoutId = window.setTimeout(async () => {
            if (!isActive || !refreshCurrentUser) {
              return;
            }

            try {
              const retriedUser = await refreshCurrentUser();
              const accessActivatedAfterRetry = pendingQualification
                ? hasAccessToQualification(retriedUser, pendingQualification)
                : getQualificationAccessState(retriedUser).hasAnyPaidAccess;

              if (accessActivatedAfterRetry && isActive) {
                window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
                setStatusBanner(
                  pendingQualification
                    ? `Payment received. ${getQualificationLabel(pendingQualification)} access is now active.`
                    : "Payment received. Your access has been updated.",
                );
              }
            } catch (error) {
              console.error("Unable to refresh billing status", error);
            }
          }, delayMs);

          retryTimeoutsRef.current.push(timeoutId);
        });
      } catch (error) {
        console.error("Unable to refresh billing status", error);
        if (isActive) {
          setStatusBanner(
            "We could not confirm your payment yet. Please refresh your account in a moment.",
          );
        }
      } finally {
        if (isActive) {
          setIsRefreshingStatus(false);
        }
      }
    };

    checkStatus();

    return () => {
      isActive = false;
    };
  }, [authReady, checkoutState, isLoggedIn, refreshCurrentUser]);

  useEffect(() => {
    if (!authReady || !isLoggedIn) {
      setPerformanceSessions([]);
      setIsLoadingPerformance(false);
      return;
    }

    let isActive = true;

    const fetchPerformanceSessions = async () => {
      setIsLoadingPerformance(true);
      setPerformanceError("");

      try {
        const response = await api.get("/api/user-sessions/");

        if (!isActive) {
          return;
        }

        setPerformanceSessions(
          Array.isArray(response.data) ? response.data : [],
        );
      } catch (error) {
        console.error("Unable to load performance sessions", error);

        if (isActive) {
          setPerformanceError(
            "Unable to load your performance summary right now.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingPerformance(false);
        }
      }
    };

    fetchPerformanceSessions();

    return () => {
      isActive = false;
    };
  }, [authReady, isLoggedIn]);

  const trackedPerformanceSessions = useMemo(
    () =>
      performanceSessions.filter((session) =>
        isSessionOnOrAfterDate(session, performanceTrackingStartDate),
      ),
    [performanceSessions, performanceTrackingStartDate],
  );

  const performanceSummary = useMemo(
    () => buildPerformanceSummary(trackedPerformanceSessions),
    [trackedPerformanceSessions],
  );

  const summaryItems = useMemo(
    () => [
      {
        label: "Average score",
        value: formatMetricValue(performanceSummary.averageScore, "%"),
      },
      {
        label: "Questions answered",
        value: formatMetricValue(performanceSummary.totalQuestionsAnswered),
      },
      {
        label: "Strongest topic",
        value: performanceSummary.strongestTopic || "--",
      },
      {
        label: "Weakest topic",
        value: performanceSummary.weakestTopic || "--",
      },
      {
        label: "Last score",
        value: formatMetricValue(performanceSummary.lastScore, "%"),
      },
    ],
    [performanceSummary],
  );

  const handleRefreshStatus = async () => {
    if (!refreshCurrentUser) {
      return;
    }

    setIsRefreshingStatus(true);
    setCheckoutError("");
    try {
      await refreshCurrentUser();
    } catch (error) {
      console.error("Unable to refresh account status", error);
      setCheckoutError("Unable to refresh your account status right now.");
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleUpgrade = async () => {
    if (isCreatingCheckout || !canUpgrade || !hasAcceptedPurchaseTerms) {
      if (needsEmailVerification) {
        setCheckoutError("Please verify your email before starting checkout.");
      } else if (!hasAcceptedPurchaseTerms) {
        setCheckoutError(
          "You must accept the purchase terms before continuing.",
        );
      } else if (!canUpgrade) {
        setCheckoutError("This account already has access to both qualifications.");
      }
      return;
    }

    setIsCreatingCheckout(true);
    setCheckoutError("");

    const successUrl = `${window.location.origin}/account?checkout=success`;
    const cancelUrl = `${window.location.origin}/account?checkout=cancelled`;

    try {
      window.sessionStorage.setItem(
        PENDING_CHECKOUT_KEY,
        selectedCheckoutQualification,
      );

      const { data } = await api.post(
        "/accounts/billing/create-checkout-session/",
        {
          qualification: selectedCheckoutQualification,
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      );

      if (!data?.checkout_url) {
        throw new Error("Unable to start checkout.");
      }

      window.location.assign(data.checkout_url);
    } catch (error) {
      console.error("Unable to create checkout session", error);
      if (error.response?.status === 409) {
        window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
        setCheckoutError(
          error.response?.data?.detail ||
            `This account already has ${selectedCheckoutLabel.toLowerCase()} access.`,
        );

        try {
          await refreshCurrentUser?.();
        } catch (refreshError) {
          console.error(
            "Unable to refresh account after checkout conflict",
            refreshError,
          );
        }

        setIsCreatingCheckout(false);
        return;
      }

      if (error.response?.status === 403) {
        window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
        setCheckoutError(
          error.response?.data?.detail ||
            "Please verify your email before starting checkout.",
        );

        try {
          await refreshCurrentUser?.();
        } catch (refreshError) {
          console.error(
            "Unable to refresh account after checkout verification block",
            refreshError,
          );
        }

        setIsCreatingCheckout(false);
        return;
      }

      window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      setCheckoutError(
        error.response?.data?.detail ||
          "Unable to start payment setup right now. Please try again.",
      );
      setIsCreatingCheckout(false);
    }
  };

  const handleConfirmTrackingReset = async () => {
    if (isStartingNewTrackingPeriod) {
      return;
    }

    setTrackingResetError("");
    setIsStartingNewTrackingPeriod(true);

    try {
      await api.post("/accounts/reset-performance-tracking/");
      await refreshCurrentUser?.();
      setIsTrackingResetModalOpen(false);
    } catch (error) {
      console.error("Unable to start a new tracking period", error);
      setTrackingResetError(
        "Unable to start a new tracking period right now. Please try again.",
      );
    } finally {
      setIsStartingNewTrackingPeriod(false);
    }
  };

  if (!authReady) {
    return (
      <div className="account-root">
        <div className="account-shell container">
          <section className="account-card">
            <h1>Account</h1>
            <p className="account-muted">Loading your account details…</p>
          </section>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="account-root">
        <div className="account-shell container">
          <section className="account-card account-card--centered">
            <h1>Account</h1>
            <p className="account-muted">
              Sign in to manage your plan and performance.
            </p>
            <div className="account-actions">
              <Link to="/login" className="btn btn--primary">
                Log in
              </Link>
              <Link to="/register" className="btn btn--ghost">
                Create account
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="account-root">
      <div className="account-shell container">
        <header className="account-header">
          <div>
            <p className="account-eyebrow">Account</p>
            <h1>Your plan and performance</h1>
            <p className="account-muted">
              Review your access, summary stats, and tracking settings at a
              glance.
            </p>
          </div>
          <div className="account-plan-chip">{planLabel}</div>
        </header>

        {statusBanner && (
          <section
            className={`account-banner ${
              hasAnyPaidAccess
                ? "account-banner--success"
                : "account-banner--info"
            }`}
            aria-live="polite"
          >
            {statusBanner}
          </section>
        )}

        {needsEmailVerification && (
          <EmailVerificationNotice className="account-verification-notice" />
        )}

        {checkoutError && (
          <section
            className="account-banner account-banner--error"
            aria-live="assertive"
          >
            {checkoutError}
          </section>
        )}

        {trackingResetError && (
          <section
            className="account-banner account-banner--error"
            aria-live="assertive"
          >
            {trackingResetError}
          </section>
        )}

        <section className="row g-3">
          <div className="col-12 col-lg-6">
            <article className="account-card h-100">
              <SectionTitle title="Profile / Plan" />
              <dl className="account-details">
                <div>
                  <dt>Email</dt>
                  <dd>{user?.email || "Not available"}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{planLabel}</dd>
                </div>
                <div>
                  <dt>A-level access</dt>
                  <dd>{hasALevelAccess ? "Enabled" : "Not yet"}</dd>
                </div>
                <div>
                  <dt>GCSE access</dt>
                  <dd>{hasGcseAccess ? "Enabled" : "Not yet"}</dd>
                </div>
                <div>
                  <dt>Email verification</dt>
                  <dd>{emailVerified ? "Verified" : "Pending"}</dd>
                </div>
                <div>
                  <dt>Free daily quota</dt>
                  <dd>
                    {numericRemaining == null
                      ? "Not available"
                      : `${numericRemaining} question${numericRemaining === 1 ? "" : "s"} remaining today`}
                  </dd>
                </div>
              </dl>
            </article>
          </div>

          <div className="col-12 col-lg-6">
            <Link
              to="/progress"
              className="account-card account-card--interactive account-summaryLink h-100"
            >
              <SectionTitle title="Performance Summary" />

              {isLoadingPerformance ? (
                <p className="account-muted">Loading summary…</p>
              ) : performanceError ? (
                <p className="account-muted">{performanceError}</p>
              ) : performanceSummary.trackedTestsCount === 0 ? (
                <p className="account-muted account-summaryEmpty">
                  Complete a test to start building your summary.
                </p>
              ) : (
                <div className="account-summaryMetrics">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="account-summaryMetric">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="account-summaryFooter">
                <span className="account-summaryCta">
                  View detailed progress -&gt;
                </span>
              </div>
            </Link>
          </div>

          <div className="col-12 col-lg-6">
            <article className="account-card h-100">
              <SectionTitle title="Performance Tracking" />
              <div className="account-trackingMeta">
                <p className="account-muted">Tracking start date</p>
                <strong>
                  {performanceTrackingStartDate
                    ? formatTrackingDate(performanceTrackingStartDate)
                    : "Tracking all saved results"}
                </strong>
              </div>
              <div className="account-trackingMeta">
                <p className="account-muted">Tracked tests</p>
                <strong>{performanceSummary.trackedTestsCount}</strong>
              </div>
              <div className="account-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setIsTrackingResetModalOpen(true)}
                >
                  Start New Tracking Period
                </button>
              </div>
              <p className="account-note">
                Past results stay saved. New averages start from today.
              </p>
            </article>
          </div>

          <div className="col-12 col-lg-6">
            <article className="account-card account-card--accent h-100">
              <SectionTitle title="Upgrade Plan" />
              <p className="account-muted">
                {needsEmailVerification
                  ? "Verify your email to unlock checkout."
                  : hasFullAccess
                    ? "GCSE and A-level access are already active on this account."
                    : "Secure checkout powered by Stripe. Unlock the qualification access you need instantly."}
              </p>

              {!hasFullAccess ? (
                <>
                  <p className="account-price">Per qualification: £1.99</p>
                  <div className="account-upgradeOptions" role="radiogroup" aria-label="Select qualification to unlock">
                    {missingUpgradeQualifications.map((option) => (
                      <label
                        key={option}
                        className={`account-upgradeOption ${
                          selectedCheckoutQualification === option
                            ? "account-upgradeOption--active"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="checkoutQualification"
                          value={option}
                          checked={selectedCheckoutQualification === option}
                          onChange={(event) => {
                            setSelectedCheckoutQualification(event.target.value);
                            setCheckoutError("");
                          }}
                        />
                        <span>
                          <strong>{getQualificationLabel(option)}</strong>
                          <small>
                            Unlock unlimited question generation for this qualification.
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <ul className="account-benefits">
                    <li>Unlimited questions for {selectedCheckoutLabel}</li>
                    <li>Full AI feedback</li>
                    <li>Advanced performance tracking</li>
                  </ul>
                  {checkoutStatus.hasAnyPaidAccess && !checkoutStatus.hasFullAccess ? (
                    <p className="account-note">
                      You already have {hasGcseAccess ? "GCSE" : "A-level"} access. Buy the other qualification here if you want both.
                    </p>
                  ) : null}
                </>
              ) : null}

              {canUpgrade ? (
                <>
                  <label className="account-checkbox">
                    <input
                      type="checkbox"
                      checked={hasAcceptedPurchaseTerms}
                      onChange={(event) => {
                        setHasAcceptedPurchaseTerms(event.target.checked);
                        if (event.target.checked) {
                          setCheckoutError("");
                        }
                      }}
                    />
                    <span>
                      I agree to the <Link to="/terms">Terms of Service</Link>,{" "}
                      <Link to="/privacy-policy">Privacy Policy</Link>,{" "}
                      <Link to="/paid-plan-terms">Paid Plan Terms</Link>, and{" "}
                      <Link to="/refund-policy">Refund Policy</Link>.
                    </span>
                  </label>

                  <div className="account-actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleUpgrade}
                      disabled={isCreatingCheckout || !hasAcceptedPurchaseTerms}
                    >
                      {isCreatingCheckout
                        ? "Redirecting..."
                        : `Unlock ${selectedCheckoutLabel}`}
                    </button>
                  </div>
                </>
              ) : needsEmailVerification ? (
                <p className="account-note">
                  Verify your email first, then come back to upgrade.
                </p>
              ) : hasFullAccess ? (
                <p className="account-note">
                  No upgrade needed. Your plan already includes both qualifications.
                </p>
              ) : (
                <p className="account-note">
                  Refresh your account if your plan changed recently.
                </p>
              )}
            </article>
          </div>

          <div className="col-12">
            <article className="account-card">
              <SectionTitle title="Account Settings" />
              <p className="account-muted">
                Refresh account data, review terms, or sign out.
              </p>
              <div className="account-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleRefreshStatus}
                  disabled={isRefreshingStatus}
                >
                  {isRefreshingStatus
                    ? "Refreshing…"
                    : "Refresh account status"}
                </button>
                <Link to="/terms" className="btn btn--ghost">
                  Terms of Service
                </Link>
                <Link to="/privacy-policy" className="btn btn--ghost">
                  Privacy Policy
                </Link>
                <Link to="/refund-policy" className="btn btn--ghost">
                  Refund Policy
                </Link>
                <button
                  type="button"
                  className="btn btn--subtle"
                  onClick={() => logout?.()}
                >
                  Log out
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>

      {isTrackingResetModalOpen ? (
        <div
          className="account-modalOverlay"
          role="presentation"
          onClick={() => {
            if (!isStartingNewTrackingPeriod) {
              setIsTrackingResetModalOpen(false);
            }
          }}
        >
          <div
            className="account-modalCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tracking-reset-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="account-eyebrow">Performance Tracking</p>
            <h2 id="tracking-reset-title">Start a new tracking period?</h2>
            <p className="account-muted">
              Your past results will still be saved, but your averages and
              performance insights will restart from today.
            </p>
            <div className="account-modalActions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setIsTrackingResetModalOpen(false)}
                disabled={isStartingNewTrackingPeriod}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleConfirmTrackingReset}
                disabled={isStartingNewTrackingPeriod}
              >
                {isStartingNewTrackingPeriod
                  ? "Starting…"
                  : "Start New Tracking Period"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
