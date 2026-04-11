import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmailVerificationNotice from "../components/EmailVerificationNotice";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import {
  buildPerformanceSummary,
  isSessionOnOrAfterDate,
} from "../lib/performance";
import "../styles/Account.modern.css";

const RETRY_DELAYS_MS = [1500, 3000];

const getPlanLabel = (planType, hasUnlimitedAccess) => {
  if (hasUnlimitedAccess && planType === "lifetime") {
    return "Lifetime plan";
  }

  if (hasUnlimitedAccess && planType === "paid") {
    return "Paid plan";
  }

  if (hasUnlimitedAccess) {
    return "Paid plan";
  }

  if (!planType) {
    return "Free plan";
  }

  return `${planType.charAt(0).toUpperCase() + planType.slice(1)} plan`;
};

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

const SectionTitle = ({ icon, title }) => (
  <div className="account-sectionTitle">
    <span className="account-sectionIcon" aria-hidden="true">
      {icon}
    </span>
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
    hasUnlimitedAccess,
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
  const [performanceSessions, setPerformanceSessions] = useState([]);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(true);
  const [performanceError, setPerformanceError] = useState("");
  const [trackingResetError, setTrackingResetError] = useState("");
  const [isTrackingResetModalOpen, setIsTrackingResetModalOpen] =
    useState(false);
  const [isStartingNewTrackingPeriod, setIsStartingNewTrackingPeriod] =
    useState(false);

  const isLoggedIn = Boolean(user);
  const planLabel = useMemo(
    () => getPlanLabel(planType, hasUnlimitedAccess),
    [hasUnlimitedAccess, planType],
  );
  const needsEmailVerification = isLoggedIn && !emailVerified;
  const canUpgrade = Boolean(user) && !hasUnlimitedAccess && emailVerified;
  const numericRemaining =
    questionsRemainingToday == null ? null : Number(questionsRemainingToday);
  const performanceTrackingStartDate =
    user?.performance_tracking_start_date || user?.stats_reset_at || null;

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
      setStatusBanner(
        "Checkout was cancelled. Your account is still on the free plan.",
      );
      return;
    }

    if (checkoutState !== "success") {
      setStatusBanner("");
      return;
    }

    let isActive = true;

    const checkStatus = async () => {
      if (!refreshCurrentUser) {
        return;
      }

      setIsRefreshingStatus(true);
      try {
        const refreshedUser = await refreshCurrentUser();
        const paidAfterRefresh = Boolean(
          refreshedUser?.has_unlimited_access ||
            refreshedUser?.lifetime_unlocked ||
            refreshedUser?.plan_type === "paid" ||
            refreshedUser?.plan_type === "lifetime",
        );

        if (!isActive) {
          return;
        }

        if (paidAfterRefresh) {
          setStatusBanner(
            "Payment received. Your account has been upgraded to the paid plan and unlimited access is now active.",
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
              const paidAfterRetry = Boolean(
                retriedUser?.has_unlimited_access ||
                  retriedUser?.lifetime_unlocked ||
                  retriedUser?.plan_type === "paid" ||
                  retriedUser?.plan_type === "lifetime",
              );

              if (paidAfterRetry && isActive) {
                setStatusBanner(
                  "Payment received. Your account has been upgraded to the paid plan and unlimited access is now active.",
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

        setPerformanceSessions(Array.isArray(response.data) ? response.data : []);
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
        setCheckoutError("This account already has unlimited access.");
      }
      return;
    }

    setIsCreatingCheckout(true);
    setCheckoutError("");

    const successUrl = `${window.location.origin}/account?checkout=success`;
    const cancelUrl = `${window.location.origin}/account?checkout=cancelled`;

    try {
      const { data } = await api.post(
        "/accounts/billing/create-checkout-session/",
        {
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
        setCheckoutError(
          error.response?.data?.detail ||
            "This account already has unlimited access.",
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
              hasUnlimitedAccess
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
              <SectionTitle icon="PL" title="Profile / Plan" />
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
                  <dt>Unlimited access</dt>
                  <dd>{hasUnlimitedAccess ? "Enabled" : "Not yet"}</dd>
                </div>
                <div>
                  <dt>Email verification</dt>
                  <dd>{emailVerified ? "Verified" : "Pending"}</dd>
                </div>
                <div>
                  <dt>Daily quota</dt>
                  <dd>
                    {hasUnlimitedAccess || numericRemaining == null
                      ? "Unlimited on current plan"
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
              <SectionTitle icon="PF" title="Performance Summary" />

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
                <span className="account-summaryCta">View detailed progress -&gt;</span>
              </div>
            </Link>
          </div>

          <div className="col-12 col-lg-6">
            <article className="account-card h-100">
              <SectionTitle icon="TR" title="Performance Tracking" />
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
              <SectionTitle icon="UP" title="Upgrade Plan" />
              <p className="account-muted">
                {needsEmailVerification
                  ? "Verify your email to unlock checkout."
                  : hasUnlimitedAccess
                    ? "Unlimited access is already active on this account."
                    : "Secure checkout powered by Stripe. Upgrade instantly to unlock full access."}
              </p>

              {!hasUnlimitedAccess ? (
                <>
                  <p className="account-price">Pro plan: £1.99</p>
                  <ul className="account-benefits">
                    <li>Unlimited questions</li>
                    <li>Full AI feedback</li>
                    <li>Advanced performance tracking</li>
                  </ul>
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
                      {isCreatingCheckout ? "Redirecting…" : "Upgrade to Pro"}
                    </button>
                  </div>
                </>
              ) : needsEmailVerification ? (
                <p className="account-note">
                  Verify your email first, then come back to upgrade.
                </p>
              ) : hasUnlimitedAccess ? (
                <p className="account-note">
                  No upgrade needed. Your plan already includes full access.
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
              <SectionTitle icon="ST" title="Account Settings" />
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
                  {isRefreshingStatus ? "Refreshing…" : "Refresh account status"}
                </button>
                <Link to="/terms" className="btn btn--ghost">
                  Terms of Service
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
