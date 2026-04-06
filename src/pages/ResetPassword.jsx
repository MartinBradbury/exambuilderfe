import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import "../styles/Login.modern.css";

const extractErrorMessage = (payload) => {
  if (!payload) {
    return "Unable to reset your password. Please try again.";
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

  return "Unable to reset your password. Please try again.";
};

const hasTokenError = (payload) => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return ["uid", "token"].some((key) => key in payload);
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const hasValidLinkParams = Boolean(uid && token);

  const [formData, setFormData] = useState({
    password1: "",
    password2: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [invalidLinkMessage, setInvalidLinkMessage] = useState(
    hasValidLinkParams
      ? ""
      : "This reset link is incomplete or invalid. Request a new password reset email to continue.",
  );

  const passwordsMatch = useMemo(
    () => formData.password1 === formData.password2,
    [formData.password1, formData.password2],
  );

  const handleChange = (e) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !hasValidLinkParams) return;

    setErrorMessage("");

    if (!formData.password1 || !formData.password2) {
      setErrorMessage("Enter your new password in both fields.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/accounts/password-reset/confirm/", {
        uid,
        token,
        password1: formData.password1,
        password2: formData.password2,
      });

      navigate("/login", {
        replace: true,
        state: {
          message: "Your password has been reset. You can now sign in.",
        },
      });
    } catch (error) {
      const payload = error.response?.data;
      const message = extractErrorMessage(payload);

      if (hasTokenError(payload)) {
        setInvalidLinkMessage(
          "This password reset link is invalid or has expired. Request a new reset email and try again.",
        );
        setErrorMessage("");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="container">
        <div className="login-card">
          <header className="login-header">
            <h1>Create a new password</h1>
            <p className="muted">
              Choose a strong password, then sign back in with your updated
              credentials.
            </p>
          </header>

          {invalidLinkMessage ? (
            <div className="login-state-block">
              <p className="login-alert login-alert--error" role="alert">
                {invalidLinkMessage}
              </p>
              <div className="login-secondary-actions">
                <Link to="/forgot-password" className="btn btn--primary">
                  Request a new link
                </Link>
                <Link to="/login" className="btn btn--ghost">
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
                  <label htmlFor="password1" className="login-label">
                    New password
                  </label>
                  <input
                    id="password1"
                    name="password1"
                    type="password"
                    className="login-input"
                    placeholder="Create a strong password"
                    value={formData.password1}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="password2" className="login-label">
                    Confirm new password
                  </label>
                  <input
                    id="password2"
                    name="password2"
                    type="password"
                    className="login-input"
                    placeholder="Repeat the password"
                    value={formData.password2}
                    onChange={handleChange}
                    required
                  />
                </div>

                {!passwordsMatch && formData.password2 && (
                  <p className="login-helper-text login-helper-text--error">
                    Passwords must match before you can continue.
                  </p>
                )}

                <button
                  className="btn btn--primary login-submit"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting…" : "Reset password"}
                </button>
              </form>

              <div className="login-footer login-footer--split">
                <Link to="/forgot-password" className="link">
                  Need a fresh reset link?
                </Link>
                <Link to="/login" className="link">
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
