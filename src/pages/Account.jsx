import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import "../styles/Account.modern.css";

const RETRY_DELAYS_MS = [1500, 3000];

const getPlanLabel = (planType, hasUnlimitedAccess) => {
  if (hasUnlimitedAccess && planType === "lifetime") {
    return "Lifetime";
  }

  if (hasUnlimitedAccess && planType === "paid") {
    return "Paid";
  }

  if (hasUnlimitedAccess) {
    return "Unlimited";
  }

  if (!planType) {
    return "Free";
  }

  return planType.charAt(0).toUpperCase() + planType.slice(1);
};

export default function Account() {
  const {
    user,
    authReady,
    refreshCurrentUser,
    planType,
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

  const isLoggedIn = Boolean(user);
  const planLabel = useMemo(
    () => getPlanLabel(planType, hasUnlimitedAccess),
    [hasUnlimitedAccess, planType],
  );
  const numericRemaining =
    questionsRemainingToday == null ? null : Number(questionsRemainingToday);

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
            "Payment received. Your account has been upgraded and unlimited access is now active.",
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
                  "Payment received. Your account has been upgraded and unlimited access is now active.",
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
    if (isCreatingCheckout) {
      return;
    }

    setIsCreatingCheckout(true);
    setCheckoutError("");

    const successUrl = `${window.location.origin}/account?checkout=success`;
    const cancelUrl = `${window.location.origin}/account?checkout=cancelled`;

    try {
      let data;

      try {
        const response = await api.post(
          "/accounts/billing/create-checkout-session/",
          {
            success_url: successUrl,
            cancel_url: cancelUrl,
          },
        );
        data = response.data;
      } catch (error) {
        if (error.response?.status !== 500) {
          throw error;
        }

        const fallbackResponse = await api.post(
          "/accounts/billing/create-checkout-session/",
          {},
        );
        data = fallbackResponse.data;
      }

      if (!data?.checkout_url) {
        throw new Error("Unable to start checkout.");
      }

      window.location.assign(data.checkout_url);
    } catch (error) {
      console.error("Unable to create checkout session", error);
      setCheckoutError(
        error.response?.data?.detail ||
          "Unable to start payment setup right now. Please try again.",
      );
      setIsCreatingCheckout(false);
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
              Sign in to manage your plan and billing status.
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
            <p className="account-eyebrow">Billing</p>
            <h1>Account</h1>
            <p className="account-muted">
              Manage your plan, start Stripe checkout, and confirm payment
              status after returning from checkout.
            </p>
          </div>
          <div className="account-plan-chip">{planLabel} plan</div>
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

        {checkoutError && (
          <section
            className="account-banner account-banner--error"
            aria-live="assertive"
          >
            {checkoutError}
          </section>
        )}

        <section className="account-grid">
          <article className="account-card">
            <h2>Current access</h2>
            <dl className="account-details">
              <div>
                <dt>Plan</dt>
                <dd>{planLabel}</dd>
              </div>
              <div>
                <dt>Unlimited access</dt>
                <dd>{hasUnlimitedAccess ? "Enabled" : "Not yet"}</dd>
              </div>
              <div>
                <dt>Daily quota</dt>
                <dd>
                  {hasUnlimitedAccess || numericRemaining == null
                    ? "Unlimited"
                    : `${numericRemaining} question${numericRemaining === 1 ? "" : "s"} remaining today`}
                </dd>
              </div>
            </dl>

            <div className="account-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleRefreshStatus}
                disabled={isRefreshingStatus}
              >
                {isRefreshingStatus ? "Refreshing…" : "Refresh status"}
              </button>
              <Link to="/question-generator" className="btn btn--subtle">
                Open generator
              </Link>
            </div>
          </article>

          <article className="account-card account-card--accent">
            <h2>
              {hasUnlimitedAccess
                ? "Unlimited access active"
                : "Upgrade to paid"}
            </h2>
            <p className="account-muted">
              {hasUnlimitedAccess
                ? "Your account already has unlimited question generation."
                : "Free accounts are limited to one generated question per day. Upgrade through Stripe Checkout for unlimited access."}
            </p>

            {!hasUnlimitedAccess ? (
              <div className="account-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleUpgrade}
                  disabled={isCreatingCheckout}
                >
                  {isCreatingCheckout ? "Redirecting…" : "Upgrade now"}
                </button>
                <p className="account-note">
                  You will be redirected to Stripe Checkout. Your plan updates
                  only after the backend webhook confirms payment.
                </p>
              </div>
            ) : (
              <p className="account-note">
                Stripe redirects are no longer needed for this account unless
                you want to test the checkout flow with a different free user.
              </p>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}
