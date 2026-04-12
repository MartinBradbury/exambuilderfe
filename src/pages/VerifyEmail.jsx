import { useContext, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmailVerificationNotice from "../components/EmailVerificationNotice";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import "../styles/Login.modern.css";

const getMessageFromPayload = (payload, fallback) => {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  const firstKey = Object.keys(payload)[0];
  const firstValue = payload[firstKey];

  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return firstValue[0];
  }

  if (typeof firstValue === "string") {
    return firstValue;
  }

  return fallback;
};

export default function VerifyEmail() {
  const { user, authReady, refreshCurrentUser, emailVerified } =
    useContext(UserContext) || {};
  const [searchParams] = useSearchParams();
  const hasStartedRef = useRef(false);

  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const hasValidLinkParams = Boolean(uid && token);

  const [status, setStatus] = useState(
    hasValidLinkParams ? "loading" : "invalid-link",
  );
  const [message, setMessage] = useState(
    hasValidLinkParams
      ? "Confirming your email verification now."
      : "This verification link is incomplete or invalid. Request a new verification email to continue.",
  );

  useEffect(() => {
    if (!hasValidLinkParams || hasStartedRef.current) {
      return;
    }

    let isActive = true;
    hasStartedRef.current = true;

    const confirmVerification = async () => {
      try {
        const { data } = await api.post(
          "/accounts/email-verification/confirm/",
          { uid, token },
          { skipAuth: true },
        );

        await refreshCurrentUser?.();

        if (!isActive) {
          return;
        }

        setStatus("success");
        setMessage(
          typeof data?.detail === "string"
            ? data.detail
            : "Your email has been verified and your account details are up to date.",
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatus("error");
        setMessage(
          getMessageFromPayload(
            error.response?.data,
            "This verification link is invalid or has expired. Request a new email and try again.",
          ),
        );
      }
    };

    confirmVerification();

    return () => {
      isActive = false;
    };
  }, [hasValidLinkParams, refreshCurrentUser, token, uid]);

  const primaryLink = user ? "/account" : "/login";
  const primaryLabel = user ? "Go to account" : "Go to login";

  return (
    <div className="login-root">
      <div className="container">
        <div className="login-card">
          <header className="login-header">
            <h1>Verify your email</h1>
            <p className="muted">
              Confirm your account email so your account details stay up to date.
            </p>
          </header>

          {status === "loading" && (
            <p className="login-alert login-alert--success" role="status">
              {message}
            </p>
          )}

          {status === "success" && (
            <div className="login-state-block">
              <p className="login-alert login-alert--success" role="status">
                {message}
              </p>
              <div className="login-secondary-actions">
                <Link to={primaryLink} className="btn btn--primary">
                  {primaryLabel}
                </Link>
                <Link to="/question-generator" className="btn btn--ghost">
                  Open generator
                </Link>
              </div>
            </div>
          )}

          {(status === "error" || status === "invalid-link") && (
            <div className="login-state-block">
              <p className="login-alert login-alert--error" role="alert">
                {message}
              </p>

              {authReady && user && !emailVerified ? (
                <EmailVerificationNotice
                  title="Need a fresh verification email?"
                  description="Request another verification email and then open the newest link from your inbox."
                  className="login-inline-panel"
                />
              ) : (
                <div className="login-secondary-actions">
                  <Link to="/login" className="btn btn--primary">
                    Go to login
                  </Link>
                  <Link to="/register" className="btn btn--ghost">
                    Create account
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
