import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmailVerificationNotice from "../components/EmailVerificationNotice";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import {
  ALEVEL_QUALIFICATION,
  BOTH_QUALIFICATIONS,
  GCSE_QUALIFICATION,
  getCheckoutPrice,
  getAccessPlanLabel,
  getMissingUpgradeQualifications,
  getQualificationLabel,
  getQualificationAccessState,
  hasAccessToQualification,
} from "../lib/access";
import {
  buildPerformanceSummary,
  getSessionLevel,
  isSessionOnOrAfterDate,
} from "../lib/performance";
import "../styles/Account.modern.css";

const RETRY_DELAYS_MS = [1500, 3000];
const PENDING_CHECKOUT_KEY = "pendingCheckoutQualification";
const THEME_STORAGE_KEY = "themePreference";

const getPreferredTheme = () => {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
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

const getCheckoutOptions = (missingQualifications) => {
  const missingGcse = missingQualifications.includes(GCSE_QUALIFICATION);
  const missingALevel = missingQualifications.includes(ALEVEL_QUALIFICATION);

  if (missingGcse && missingALevel) {
    return [BOTH_QUALIFICATIONS, GCSE_QUALIFICATION, ALEVEL_QUALIFICATION];
  }

  return missingQualifications;
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
  const upgradeCardRef = useRef(null);

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
  const checkoutOptions = useMemo(
    () => getCheckoutOptions(missingUpgradeQualifications),
    [missingUpgradeQualifications],
  );
  const canUpgrade = Boolean(user) && missingUpgradeQualifications.length > 0;
  const numericRemaining =
    questionsRemainingToday == null ? null : Number(questionsRemainingToday);
  const performanceTrackingStartDate =
    user?.performance_tracking_start_date || user?.stats_reset_at || null;
  const selectedCheckoutLabel = getQualificationLabel(
    selectedCheckoutQualification,
  );
  const selectedCheckoutPrice = getCheckoutPrice(selectedCheckoutQualification);
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
    if (
      checkoutOptions.length > 0 &&
      !checkoutOptions.includes(selectedCheckoutQualification)
    ) {
      setSelectedCheckoutQualification(checkoutOptions[0]);
    }
  }, [checkoutOptions, selectedCheckoutQualification]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = themePreference;
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
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
    if (
      preferredQualification &&
      checkoutOptions.includes(preferredQualification)
    ) {
      setSelectedCheckoutQualification(preferredQualification);
    } else if (checkoutOptions.length > 0) {
      setSelectedCheckoutQualification(checkoutOptions[0]);
    }

    upgradeCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleUpgrade = async () => {
    if (isCreatingCheckout || !canUpgrade || !hasAcceptedPurchaseTerms) {
      if (!hasAcceptedPurchaseTerms) {
        setCheckoutError(
          "You must accept the purchase terms before continuing.",
        );
      } else if (!canUpgrade) {
        setCheckoutError(
          "This account already has access to both qualifications.",
        );
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
              className="account-card account-card--accent h-100"
            >
              <SectionTitle title="Upgrade Plan" />
              <p className="account-muted">
                {hasFullAccess
                  ? "GCSE and A-level access are already active on this account."
                  : "Secure checkout powered by Stripe. Early access pricing unlocks the premium study tools for the qualification access you choose."}
              </p>

              {!hasFullAccess ? (
                <>
                  <div className="account-upgradeHighlight">
                    <p className="account-upgradeHighlight__eyebrow">
                      Early access pricing
                    </p>
                    <p className="account-upgradeHighlight__title">
                      Pay once to unlock unlimited premium revision tools.
                    </p>
                    <ul className="account-upgradeHighlight__list">
                      <li>Unlimited questions</li>
                      <li>Full AI marking</li>
                      <li>Detailed feedback</li>
                      <li>Performance tracking</li>
                    </ul>
                  </div>
                  <p className="account-price">
                    {selectedCheckoutQualification === BOTH_QUALIFICATIONS
                      ? "GCSE + A-level early access: £3.99"
                      : `${selectedCheckoutLabel} early access: £2.99`}
                  </p>
                  <div
                    className="account-upgradeOptions"
                    role="radiogroup"
                    aria-label="Select qualification to unlock"
                  >
                    {checkoutOptions.map((option) => (
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
                            setSelectedCheckoutQualification(
                              event.target.value,
                            );
                            setCheckoutError("");
                          }}
                        />
                        <span>
                          <strong>{getQualificationLabel(option)}</strong>
                          <small>
                            {option === BOTH_QUALIFICATIONS
                              ? "Early access for both qualifications with one payment and full premium features."
                              : "Early access for this qualification with full premium features unlocked."}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <ul className="account-benefits">
                    <li>
                      {selectedCheckoutQualification === BOTH_QUALIFICATIONS
                        ? "Unlimited questions across GCSE and A-level"
                        : `Unlimited questions for ${selectedCheckoutLabel}`}
                    </li>
                  </ul>
                  <p className="account-note">
                    Early access price for {selectedCheckoutLabel}:{" "}
                    {selectedCheckoutPrice}
                  </p>
                  {checkoutStatus.hasAnyPaidAccess &&
                  !checkoutStatus.hasFullAccess ? (
                    <p className="account-note">
                      You already have {hasGcseAccess ? "GCSE" : "A-level"}{" "}
                      access. Buy the other qualification here if you want both.
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
              ) : hasFullAccess ? (
                <p className="account-note">
                  No upgrade needed. Your plan already includes both
                  qualifications.
                </p>
              ) : (
                <p className="account-note">
                  Refresh your account if your plan changed recently.
                </p>
              )}
            </article>
          </div>

          <div className="col-12">
            <article className="account-card account-settingsCard">
              <SectionTitle title="Account Settings" />
              <div className="account-settingsCard__layout">
                <div className="account-settingsCard__intro">
                  <p className="account-muted">
                    Change the interface theme, review key policies, or sign out
                    from this device.
                  </p>
                </div>

                <div className="account-settingsCard__groups">
                  <div className="account-settingsCard__group">
                    <p className="account-settingsCard__label">Account</p>
                    <div className="account-settingsCard__actions">
                      <label
                        className="account-settingsCard__toggle"
                        htmlFor="account-theme-toggle"
                      >
                        <span className="account-settingsCard__toggleCopy">
                          <strong>
                            {themePreference === "dark"
                              ? "Dark mode"
                              : "Light mode"}
                          </strong>
                          <small>Use your saved theme across the app.</small>
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
                      <button
                        type="button"
                        className="account-settingsCard__button account-settingsCard__button--subtle"
                        onClick={() => logout?.()}
                      >
                        Log out
                      </button>
                    </div>
                  </div>

                  <div className="account-settingsCard__group">
                    <p className="account-settingsCard__label">Legal</p>
                    <div className="account-settingsCard__actions">
                      <Link
                        to="/terms"
                        className="account-settingsCard__button account-settingsCard__button--ghost"
                      >
                        Terms
                      </Link>
                      <Link
                        to="/privacy-policy"
                        className="account-settingsCard__button account-settingsCard__button--ghost"
                      >
                        Privacy
                      </Link>
                      <Link
                        to="/refund-policy"
                        className="account-settingsCard__button account-settingsCard__button--ghost"
                      >
                        Refunds
                      </Link>
                    </div>
                  </div>
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
