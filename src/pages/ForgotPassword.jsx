import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import "../styles/Login.modern.css";

const GENERIC_CONFIRMATION_MESSAGE =
  "If an account exists for that email, a password reset link has been sent.";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data } = await api.post(
        "/accounts/password-reset/",
        { email },
        { skipAuth: true },
      );
      setConfirmationMessage(data?.detail || GENERIC_CONFIRMATION_MESSAGE);
    } catch (error) {
      let message =
        "Unable to send the reset email right now. Please try again.";
      const payload = error.response?.data;
      if (payload?.detail) {
        message = payload.detail;
      }
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="container">
        <div className="login-card">
          <header className="login-header">
            <h1>Reset your password</h1>
            <p className="muted">
              Enter your email and we&apos;ll send a reset link if an account
              exists for it.
            </p>
          </header>

          {confirmationMessage ? (
            <div className="login-state-block">
              <p className="login-alert login-alert--success" role="status">
                {confirmationMessage}
              </p>
              <p className="muted login-helper-text">
                Check your inbox and spam folder, then follow the link to set a
                new password.
              </p>
              <div className="login-secondary-actions">
                <Link to="/login" className="btn btn--primary login-submit">
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <p className="login-alert login-alert--error" role="alert">
                  {errorMessage}
                </p>
              )}

              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="login-field">
                  <label htmlFor="reset-email" className="login-label">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    className="login-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  className="btn btn--primary login-submit"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <div className="login-footer login-footer--split">
                <Link to="/login" className="link">
                  Back to login
                </Link>
                <Link to="/register" className="link">
                  Create an account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
