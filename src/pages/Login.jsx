import { useState, useContext } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { UserContext } from "../context/UserContextObject";
import { api } from "../lib/api";
import "../styles/Login.modern.css";

export default function Login() {
  const { login } = useContext(UserContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const successMessage = location.state?.message || "";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // POST /accounts/login/ expects { email, password } per your serializer
      const { data } = await api.post("/accounts/login/", formData);

      const { access, refresh } = data || {};
      if (!access || !refresh) throw new Error("Login failed (no tokens).");

      await login?.(access, refresh);
      navigate("/");
    } catch (error) {
      // DRF-style error extraction
      let msg = "Invalid email or password.";
      if (error.response?.data) {
        const payload = error.response.data;
        const firstKey = Object.keys(payload)[0];
        const firstVal = payload[firstKey];
        if (Array.isArray(firstVal) && firstVal.length > 0) msg = firstVal[0];
        else if (typeof firstVal === "string") msg = firstVal;
      } else if (error.message) {
        msg = error.message;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="container">
        <div className="login-card">
          <header className="login-header">
            <h1>Welcome back</h1>
            <p className="muted">
              Log in to generate questions and track your progress.
            </p>
          </header>

          {successMessage && (
            <p className="login-alert login-alert--success" role="status">
              {successMessage}
            </p>
          )}

          {errorMessage && (
            <p className="login-alert login-alert--error" role="alert">
              {errorMessage}
            </p>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="email" className="login-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="login-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="login-input"
                placeholder="Your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="login-meta-row">
              <Link to="/forgot-password" className="link">
                Forgot your password?
              </Link>
            </div>

            <button
              className="btn btn--primary login-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="login-footer">
            <span className="muted">Don't have an account?</span>{" "}
            <Link to="/register" className="link">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
