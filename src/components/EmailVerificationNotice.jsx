import { useContext, useState } from "react";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import "../styles/EmailVerificationNotice.css";

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

export default function EmailVerificationNotice({
  title = "Verify your email to unlock billing",
  description = "You can keep using the free tier, but Stripe checkout stays locked until your email is verified.",
  className = "",
}) {
  const { user, emailVerified, refreshCurrentUser } =
    useContext(UserContext) || {};
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  if (!user || emailVerified) {
    return null;
  }

  const handleResend = async () => {
    if (isResending) {
      return;
    }

    setIsResending(true);
    setResendMessage("");
    setResendError("");

    try {
      const { data } = await api.post("/accounts/email-verification/resend/");
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : "Verification email sent.";

      setResendMessage(detail);

      if (
        detail === "Email is already verified." ||
        data?.email_verified === true
      ) {
        await refreshCurrentUser?.();
      }
    } catch (error) {
      setResendError(
        getMessageFromPayload(
          error.response?.data,
          "Unable to resend verification email right now.",
        ),
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section
      className={`verification-notice ${className}`.trim()}
      aria-live="polite"
    >
      <div className="verification-notice__copy">
        <p className="verification-notice__eyebrow">Email verification</p>
        <h2>{title}</h2>
        <p>{description}</p>
        {user?.email && (
          <p className="verification-notice__meta">
            Verification email destination: <strong>{user.email}</strong>
          </p>
        )}
      </div>

      <div className="verification-notice__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleResend}
          disabled={isResending}
        >
          {isResending ? "Sending…" : "Resend verification email"}
        </button>
        {resendMessage && (
          <p className="verification-notice__message" role="status">
            {resendMessage}
          </p>
        )}
        {resendError && (
          <p className="verification-notice__error" role="alert">
            {resendError}
          </p>
        )}
      </div>
    </section>
  );
}
