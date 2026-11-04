import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmailVerificationNotice from "../components/EmailVerificationNotice";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import { applyThemePreference, getPreferredTheme } from "../lib/theme";
import {
  ALEVEL_CHEMISTRY_QUALIFICATION,
  ALEVEL_PHYSICS_QUALIFICATION,
  ALEVEL_QUALIFICATION,
  GCSE_QUALIFICATION,
  PURCHASABLE_QUALIFICATIONS,
  getCheckoutPrice,
  getAccessPlanLabel,
  getMissingUpgradeQualifications,
  getPreferredUpgradeQualification,
  getQualificationLabel,
  getQualificationAccessState,
  hasAccessToQualification,
} from "../lib/access";
import {
  buildCheckoutRequest,
  confirmCheckoutEntitlement,
  resolvePurchasedQualification,
} from "../lib/checkout";
import {
  buildPerformanceSummary,
  getSessionLevel,
  isSessionOnOrAfterDate,
} from "../lib/performance";
import "../styles/Account.modern.css";

const PENDING_CHECKOUT_KEY = "pendingCheckoutQualification";

const MODULE_DESCRIPTIONS = {
  [GCSE_QUALIFICATION]:
    "One-off payment for unlimited GCSE Science questions, AI marking and feedback.",
  [ALEVEL_QUALIFICATION]:
    "One-off payment for unlimited A-level Biology questions, AI marking and feedback.",
  [ALEVEL_CHEMISTRY_QUALIFICATION]:
    "One-off payment for unlimited A-level Chemistry questions, AI marking and feedback.",
  [ALEVEL_PHYSICS_QUALIFICATION]:
    "One-off payment for unlimited A-level Physics questions, AI marking and feedback.",
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

const getSessionQualification = (session) => {
  const normalizedLevel = String(getSessionLevel(session) || "")
    .trim()
    .toLowerCase();

  if (normalizedLevel.includes("gcse")) {
    return GCSE_QUALIFICATION;
  }

  if (
    normalizedLevel.includes("a level") ||
    normalizedLevel.includes("alevel") ||
    normalizedLevel.includes("as and a level")
  ) {
    return ALEVEL_QUALIFICATION;
  }

  return null;
};

const getOverviewLevelForQualification = (qualification) => {
  if (qualification === GCSE_QUALIFICATION) {
    return "gcse";
  }

  if (qualification === ALEVEL_QUALIFICATION) {
    return "a-level";
  }

  return null;
};

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
    emailVerified,
    hasGcseAccess,
    hasALevelAccess,
    hasAnyPaidAccess,
    hasFullAccess,
    questionsRemainingToday,
  } = useContext(UserContext) || {};
  const [searchParams] = useSearchParams();
  const checkoutState = searchParams.get("checkout");
  const upgradeSection = searchParams.get("section");
  const upgradeQualificationParam = searchParams.get("qualification");
  const retryTimeoutsRef = useRef([]);
  const upgradeCardRef = useRef(null);

  const [creatingCheckoutFor, setCreatingCheckoutFor] = useState(null);
  const isCreatingCheckout = creatingCheckoutFor !== null;
  const [checkoutError, setCheckoutError] = useState("");
  const [statusBanner, setStatusBanner] = useState("");
  const [, setIsRefreshingStatus] = useState(false);
  const [hasAcceptedPurchaseTerms, setHasAcceptedPurchaseTerms] =
    useState(false);
  const [highlightedQualification, setHighlightedQualification] =
    useState(null);
  const [performanceSessions, setPerformanceSessions] = useState([]);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(true);
  const [performanceError, setPerformanceError] = useState("");
  const [trackingResetError, setTrackingResetError] = useState("");
  const [isTrackingResetModalOpen, setIsTrackingResetModalOpen] =
    useState(false);
  const [isStartingNewTrackingPeriod, setIsStartingNewTrackingPeriod] =
    useState(false);
  const [activeSummaryQualification, setActiveSummaryQualification] =
    useState(GCSE_QUALIFICATION);
  const [
    hasInitializedSummaryQualification,
    setHasInitializedSummaryQualification,
  ] = useState(false);
  const summaryTouchStartXRef = useRef(null);
  const [themePreference, setThemePreference] = useState(getPreferredTheme);

  const isLoggedIn = Boolean(user);
  const planLabel = useMemo(() => getAccessPlanLabel(user), [user]);
  const needsEmailVerification = isLoggedIn && !emailVerified;
  const missingUpgradeQualifications = useMemo(
    () => getMissingUpgradeQualifications(user),
    [user],
  );
  const canUpgrade = Boolean(user) && missingUpgradeQualifications.length > 0;
  const numericRemaining =
    questionsRemainingToday == null ? null : Number(questionsRemainingToday);
  const performanceTrackingStartDate =
    user?.performance_tracking_start_date || user?.stats_reset_at || null;
  const checkoutStatus = useMemo(
    () => getQualificationAccessState(user),
    [user],
  );
  const summaryLocked = !hasAccessToQualification(
    user,
    activeSummaryQualification,
  );
  const trackingLocked = !hasAnyPaidAccess;

  useEffect(() => {
    if (upgradeSection !== "upgrade" || !authReady || !isLoggedIn) {
      return;
    }

    const preferredQualification = missingUpgradeQualifications.includes(
      upgradeQualificationParam,
    )
      ? upgradeQualificationParam
      : getPreferredUpgradeQualification(missingUpgradeQualifications);

    setHighlightedQualification(preferredQualification);

    upgradeCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [
    authReady,
    isLoggedIn,
    missingUpgradeQualifications,
    upgradeQualificationParam,
    upgradeSection,
  ]);

  useEffect(() => {
    applyThemePreference(themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (hasInitializedSummaryQualification) {
      return;
    }

    if (hasALevelAccess && !hasGcseAccess) {
      setActiveSummaryQualification(ALEVEL_QUALIFICATION);
    } else {
      setActiveSummaryQualification(GCSE_QUALIFICATION);
    }

    setHasInitializedSummaryQualification(true);
  }, [hasALevelAccess, hasGcseAccess, hasInitializedSummaryQualification]);

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
    const purchasedQualification = resolvePurchasedQualification(
      upgradeQualificationParam,
      window.sessionStorage.getItem(PENDING_CHECKOUT_KEY),
    );
    const waitAndTrack = (ms) =>
      new Promise((resolve) => {
        retryTimeoutsRef.current.push(window.setTimeout(resolve, ms));
      });
    const successMessage = purchasedQualification
      ? `Payment received. ${getQualificationLabel(purchasedQualification)} access is now active.`
      : "Payment received. Your access has been updated.";

    const checkStatus = async () => {
      if (!refreshCurrentUser) {
        return;
      }

      setIsRefreshingStatus(true);
      const outcome = await confirmCheckoutEntitlement({
        refreshUser: refreshCurrentUser,
        qualification: purchasedQualification,
        wait: waitAndTrack,
        isCancelled: () => !isActive,
        onPending: (refreshFailed) => {
          if (isActive) {
            setStatusBanner(
              refreshFailed
                ? "We could not confirm your payment yet. Retrying..."
                : "Your payment is still being processed. Please refresh in a moment if your plan has not updated yet.",
            );
          }
        },
      });

      if (!isActive) {
        return;
      }

      if (outcome === "confirmed") {
        window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
        setStatusBanner(successMessage);
      } else if (outcome === "error") {
        setStatusBanner(
          "We could not confirm your payment yet. Please refresh your account in a moment.",
        );
      }

      setIsRefreshingStatus(false);
    };

    checkStatus();

    return () => {
      isActive = false;
    };
  }, [
    authReady,
    checkoutState,
    isLoggedIn,
    refreshCurrentUser,
    upgradeQualificationParam,
  ]);

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

  const performanceSummaryByQualification = useMemo(() => {
    const groupedSessions = trackedPerformanceSessions.reduce(
      (groups, session) => {
        const qualification = getSessionQualification(session);

        if (!qualification) {
          return groups;
        }

        groups[qualification].push(session);
        return groups;
      },
      {
        [GCSE_QUALIFICATION]: [],
        [ALEVEL_QUALIFICATION]: [],
      },
    );

    return {
      [GCSE_QUALIFICATION]: buildPerformanceSummary(
        groupedSessions[GCSE_QUALIFICATION],
      ),
      [ALEVEL_QUALIFICATION]: buildPerformanceSummary(
        groupedSessions[ALEVEL_QUALIFICATION],
      ),
    };
  }, [trackedPerformanceSessions]);

  const summaryCards = useMemo(
    () =>
      [GCSE_QUALIFICATION, ALEVEL_QUALIFICATION].map((qualification) => {
        const summary = performanceSummaryByQualification[qualification];

        return {
          qualification,
          title: getQualificationLabel(qualification),
          summary,
          items: [
            {
              label: "Average score",
              value: formatMetricValue(summary.averageScore, "%"),
            },
            {
              label: "Questions answered",
              value: formatMetricValue(summary.totalQuestionsAnswered),
            },
            {
              label: "Strongest topic",
              value: summary.strongestTopic || "--",
            },
            {
              label: "Weakest topic",
              value: summary.weakestTopic || "--",
            },
            {
              label: "Last score",
              value: formatMetricValue(summary.lastScore, "%"),
            },
          ],
        };
      }),
    [performanceSummaryByQualification],
  );

  useEffect(() => {
    const currentCard = summaryCards.find(
      (card) => card.qualification === activeSummaryQualification,
    );

    if (currentCard?.summary.trackedTestsCount > 0) {
      return;
    }

    const nextCardWithData = summaryCards.find(
      (card) => card.summary.trackedTestsCount > 0,
    );

    if (nextCardWithData) {
      setActiveSummaryQualification(nextCardWithData.qualification);
    }
  }, [activeSummaryQualification, summaryCards]);

  const showSummaryQualification = (qualification) => {
    setActiveSummaryQualification(qualification);
  };

  const activeSummaryIndex = Math.max(
    0,
    summaryCards.findIndex(
      (card) => card.qualification === activeSummaryQualification,
    ),
  );

  const handleSummaryTouchStart = (event) => {
    if (!event.touches?.length) {
      return;
    }

    summaryTouchStartXRef.current = event.touches[0].clientX;
  };

  const handleSummaryTouchEnd = (event) => {
    const touchStartX = summaryTouchStartXRef.current;
    summaryTouchStartXRef.current = null;

    if (touchStartX == null || !event.changedTouches?.length) {
      return;
    }

    const touchEndX = event.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    const swipeThreshold = 40;

    if (Math.abs(deltaX) < swipeThreshold) {
      return;
    }

    const nextIndex =
      deltaX < 0
        ? Math.min(summaryCards.length - 1, activeSummaryIndex + 1)
        : Math.max(0, activeSummaryIndex - 1);

    showSummaryQualification(summaryCards[nextIndex].qualification);
  };

  const handleThemeToggle = () => {
    setThemePreference((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark",
    );
  };

  const focusUpgradeOptions = (preferredQualification = null) => {
    setHighlightedQualification(
      missingUpgradeQualifications.includes(preferredQualification)
        ? preferredQualification
        : getPreferredUpgradeQualification(missingUpgradeQualifications),
    );

    upgradeCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleUpgrade = async (qualification) => {
    if (isCreatingCheckout || !missingUpgradeQualifications.includes(qualification)) {
      return;
    }

    if (!hasAcceptedPurchaseTerms) {
      setCheckoutError("You must accept the purchase terms before continuing.");
      return;
    }

    const qualificationLabel = getQualificationLabel(qualification);

    setCreatingCheckoutFor(qualification);
    setCheckoutError("");

    try {
      const checkoutRequest = buildCheckoutRequest(
        window.location.origin,
        qualification,
      );
      window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, qualification);

      const { data } = await api.post(
        "/accounts/billing/create-checkout-session/",
        checkoutRequest,
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
            `This account already has ${qualificationLabel} access.`,
        );

        try {
          await refreshCurrentUser?.();
        } catch (refreshError) {
          console.error(
            "Unable to refresh account after checkout conflict",
            refreshError,
          );
        }

        setCreatingCheckoutFor(null);
        return;
      }

      if (error.response?.status === 403) {
        window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
        setCheckoutError(
          error.response?.data?.detail ||
            "Unable to start payment setup right now. Please try again.",
        );

        try {
          await refreshCurrentUser?.();
        } catch (refreshError) {
          console.error(
            "Unable to refresh account after checkout block",
            refreshError,
          );
        }

        setCreatingCheckoutFor(null);
        return;
      }

      window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      setCheckoutError(
        error.response?.data?.detail ||
          "Unable to start payment setup right now. Please try again.",
      );
      setCreatingCheckoutFor(null);
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

        <section className="account-quickStart" aria-label="Start practicing">
          <div className="account-quickStart__copy">
            <p className="account-quickStart__eyebrow">Quick start</p>
            <h2>Start a new question session</h2>
            <p className="account-muted">
              Jump straight into the question generator whenever you are ready
              to practise exam-style questions and get instant feedback.
            </p>
          </div>
          <div className="account-quickStart__actions">
            <Link to="/question-generator" className="btn btn--primary">
              Open Question Generator
            </Link>
          </div>
        </section>

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
                  <dt>A-level Biology access</dt>
                  <dd>{hasALevelAccess ? "Enabled" : "Not yet"}</dd>
                </div>
                <div>
                  <dt>A-level Chemistry access</dt>
                  <dd>{checkoutStatus.hasChemistryAccess ? "Enabled" : "Not yet"}</dd>
                </div>
                <div>
                  <dt>A-level Physics access</dt>
                  <dd>{checkoutStatus.hasPhysicsAccess ? "Enabled" : "Not yet"}</dd>
                </div>
                <div>
                  <dt>GCSE Science access</dt>
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
            <article className="account-card account-summaryCard h-100">
              <SectionTitle title="Performance Summary" />

              <div
                className="account-summaryTabs"
                role="tablist"
                aria-label="Performance summary by qualification"
              >
                {summaryCards.map((card) => {
                  const isActive =
                    card.qualification === activeSummaryQualification;

                  return (
                    <button
                      key={card.qualification}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`account-summaryTab${
                        isActive ? " account-summaryTab--active" : ""
                      }`}
                      onClick={() =>
                        showSummaryQualification(card.qualification)
                      }
                    >
                      {card.title}
                    </button>
                  );
                })}
              </div>

              {isLoadingPerformance ? (
                <p className="account-muted">Loading summary…</p>
              ) : performanceError ? (
                <p className="account-muted">{performanceError}</p>
              ) : performanceSummary.trackedTestsCount === 0 ? (
                <p className="account-muted account-summaryEmpty">
                  Complete a test to start building your summary.
                </p>
              ) : (
                <div
                  className={`account-lockable${
                    summaryLocked ? " account-lockable--locked" : ""
                  }`}
                >
                  <div className="account-lockable__content">
                    <div
                      className="account-summaryViewport"
                      onTouchStart={handleSummaryTouchStart}
                      onTouchEnd={handleSummaryTouchEnd}
                    >
                      <div
                        className="account-summaryTrack"
                        style={{
                          transform: `translateX(-${activeSummaryIndex * 100}%)`,
                        }}
                      >
                        {summaryCards.map((card) => (
                          <section
                            key={card.qualification}
                            className="account-summarySlide"
                            aria-label={`${card.title} summary`}
                          >
                            <div className="account-summarySlideHeader">
                              <div>
                                <p className="account-muted">{card.title}</p>
                                <strong>
                                  {card.summary.trackedTestsCount} tracked test
                                  {card.summary.trackedTestsCount === 1
                                    ? ""
                                    : "s"}
                                </strong>
                              </div>
                            </div>

                            {card.summary.trackedTestsCount === 0 ? (
                              <p className="account-muted account-summaryEmpty account-summaryEmpty--panel">
                                No tracked {card.title.toLowerCase()} tests yet.
                              </p>
                            ) : (
                              <div className="account-summaryMetrics">
                                {card.items.map((item) => (
                                  <div
                                    key={`${card.qualification}-${item.label}`}
                                    className="account-summaryMetric"
                                  >
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>
                        ))}
                      </div>
                    </div>

                    <div className="account-summaryDots" aria-hidden="true">
                      {summaryCards.map((card) => (
                        <span
                          key={`${card.qualification}-dot`}
                          className={`account-summaryDot${
                            activeSummaryQualification === card.qualification
                              ? " account-summaryDot--active"
                              : ""
                          }`}
                        />
                      ))}
                    </div>

                    <div className="account-summaryFooter">
                      <Link
                        to="/progress"
                        state={{
                          initialOverviewLevel:
                            getOverviewLevelForQualification(
                              activeSummaryQualification,
                            ),
                        }}
                        className="account-summaryCta"
                      >
                        View detailed progress -&gt;
                      </Link>
                    </div>
                  </div>

                  {summaryLocked ? (
                    <button
                      type="button"
                      className="account-lockable__overlay"
                      onClick={() =>
                        focusUpgradeOptions(activeSummaryQualification)
                      }
                      aria-label={`Upgrade to unlock ${getQualificationLabel(activeSummaryQualification)} summary`}
                    >
                      <span className="account-lockable__overlayCard">
                        <strong>
                          Upgrade to unlock{" "}
                          {getQualificationLabel(activeSummaryQualification)}{" "}
                          summary
                        </strong>
                        <span>
                          {hasAnyPaidAccess
                            ? `Buy ${getQualificationLabel(activeSummaryQualification)} access to view this qualification's performance summary.`
                            : "Buy a paid plan to unlock your performance summary and progress insights."}
                        </span>
                        <span className="account-lockable__overlayAction">
                          See upgrade options
                        </span>
                      </span>
                    </button>
                  ) : null}
                </div>
              )}
            </article>
          </div>

          <div className="col-12 col-lg-6">
            <article className="account-card h-100">
              <SectionTitle title="Performance Tracking" />
              <div
                className={`account-lockable${
                  trackingLocked ? " account-lockable--locked" : ""
                }`}
              >
                <div className="account-lockable__content">
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
                </div>

                {trackingLocked ? (
                  <button
                    type="button"
                    className="account-lockable__overlay"
                    onClick={() => focusUpgradeOptions()}
                    aria-label="Upgrade to unlock performance tracking"
                  >
                    <span className="account-lockable__overlayCard">
                      <strong>Upgrade to unlock performance tracking</strong>
                      <span>
                        Any paid access plan unlocks tracking controls and reset
                        options.
                      </span>
                      <span className="account-lockable__overlayAction">
                        See upgrade options
                      </span>
                    </span>
                  </button>
                ) : null}
              </div>
            </article>
          </div>

          <div className="col-12 col-lg-6">
            <article
              ref={upgradeCardRef}
              id="account-upgrade-plan"
              className="account-card account-card--accent h-100"
            >
              <SectionTitle title="Upgrade Plan" />
              <p className="account-muted">
                {hasFullAccess
                  ? "All four modules are already active on this account."
                  : "Secure checkout powered by Stripe. Each module is a separate one-off payment of £2.99 with no subscription."}
              </p>

              <div className="account-upgradeHighlight">
                <p className="account-upgradeHighlight__eyebrow">
                  Early access pricing
                </p>
                <p className="account-upgradeHighlight__title">
                  Pay once per module to unlock unlimited premium revision
                  tools.
                </p>
                <ul className="account-upgradeHighlight__list">
                  <li>Unlimited questions</li>
                  <li>Full AI marking</li>
                  <li>Detailed feedback</li>
                  <li>Performance tracking</li>
                </ul>
              </div>

              {canUpgrade ? (
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
              ) : null}

              <ul
                className="account-upgradeOptions"
                aria-label="Purchasable modules"
              >
                {PURCHASABLE_QUALIFICATIONS.map((qualification) => {
                  const label = getQualificationLabel(qualification);
                  const isOwned = !missingUpgradeQualifications.includes(
                    qualification,
                  );

                  return (
                    <li
                      key={qualification}
                      data-qualification={qualification}
                      className={`account-upgradeOption account-moduleOption ${
                        highlightedQualification === qualification
                          ? "account-upgradeOption--active"
                          : ""
                      }`}
                    >
                      <div className="account-moduleOption__copy">
                        <strong>
                          {label} - {getCheckoutPrice(qualification)}
                        </strong>
                        <small>{MODULE_DESCRIPTIONS[qualification]}</small>
                      </div>
                      {isOwned ? (
                        <span className="account-moduleOption__status">
                          Unlocked
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => handleUpgrade(qualification)}
                          disabled={
                            isCreatingCheckout || !hasAcceptedPurchaseTerms
                          }
                        >
                          {creatingCheckoutFor === qualification
                            ? "Redirecting..."
                            : `Buy ${label}`}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              {!canUpgrade && !hasFullAccess ? (
                <p className="account-note">
                  Refresh your account if your plan changed recently.
                </p>
              ) : null}
              {checkoutStatus.hasAnyPaidAccess && canUpgrade ? (
                <p className="account-note">
                  Modules you already own stay unlocked. Buy any other module
                  separately.
                </p>
              ) : null}
            </article>
          </div>

          <div className="col-12">
            <article className="account-card account-settingsCard">
              <SectionTitle title="Account Settings" />
              <div className="account-settingsModern">
                <section className="account-settingsModern__hero">
                  <div>
                    <p className="account-settingsModern__eyebrow">
                      Preferences
                    </p>
                    <h3>Manage how this account works on this device</h3>
                    <p className="account-muted">
                      Update your theme, review important policies, and control
                      your current session from one place.
                    </p>
                  </div>
                  <div className="account-settingsModern__status">
                    <span className="account-settingsModern__statusLabel">
                      Current theme
                    </span>
                    <strong>
                      {themePreference === "dark" ? "Dark mode" : "Light mode"}
                    </strong>
                  </div>
                </section>

                <div className="account-settingsModern__grid">
                  <section className="account-settingsModern__panel">
                    <div className="account-settingsModern__panelTop">
                      <p className="account-settingsModern__label">Display</p>
                      <span className="account-settingsModern__badge">
                        Saved
                      </span>
                    </div>
                    <h4>Theme preference</h4>
                    <p className="account-muted">
                      Switch between dark and light mode and keep the same look
                      across the app.
                    </p>

                    <label
                      className="account-settingsModern__toggle"
                      htmlFor="account-theme-toggle"
                    >
                      <span className="account-settingsModern__toggleCopy">
                        <strong>
                          {themePreference === "dark"
                            ? "Switch to light mode"
                            : "Switch to dark mode"}
                        </strong>
                        <small>Your choice is saved automatically.</small>
                      </span>
                      <span className="account-settingsCard__toggleControl">
                        <input
                          id="account-theme-toggle"
                          type="checkbox"
                          checked={themePreference === "light"}
                          onChange={handleThemeToggle}
                        />
                        <span
                          className="account-settingsCard__toggleTrack"
                          aria-hidden="true"
                        >
                          <span className="account-settingsCard__toggleThumb" />
                        </span>
                      </span>
                    </label>
                  </section>

                  <section className="account-settingsModern__panel">
                    <div className="account-settingsModern__panelTop">
                      <p className="account-settingsModern__label">Legal</p>
                    </div>
                    <h4>Important policies</h4>
                    <p className="account-muted">
                      Review the policies that apply to your account and any
                      purchases.
                    </p>

                    <div className="account-settingsModern__linkGrid">
                      <Link
                        to="/terms"
                        className="account-settingsModern__linkCard"
                      >
                        <strong>Terms</strong>
                        <span>Service terms and usage rules</span>
                      </Link>
                      <Link
                        to="/privacy-policy"
                        className="account-settingsModern__linkCard"
                      >
                        <strong>Privacy</strong>
                        <span>How your data is handled</span>
                      </Link>
                      <Link
                        to="/refund-policy"
                        className="account-settingsModern__linkCard"
                      >
                        <strong>Refunds</strong>
                        <span>Refund and billing guidance</span>
                      </Link>
                    </div>
                  </section>

                  <section className="account-settingsModern__panel account-settingsModern__panel--session">
                    <div className="account-settingsModern__panelTop">
                      <p className="account-settingsModern__label">Session</p>
                    </div>
                    <h4>Sign out of this device</h4>
                    <p className="account-muted">
                      End your current session here if you are finished using
                      this account on this device.
                    </p>

                    <button
                      type="button"
                      className="account-settingsModern__logout"
                      onClick={() => logout?.()}
                    >
                      Log out
                    </button>
                  </section>
                </div>
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
