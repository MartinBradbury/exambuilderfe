// src/pages/Register.jsx
import { useState, useContext } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import "../styles/Register.modern.css";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useContext(UserContext) || {};

  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password1: "",
    password2: "",
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
      // 1) Register -> { refresh, access }
      const { data } = await axios.post(
        "https://exambuilder-efae14d59f03.herokuapp.com/accounts/register/",
        formData
      );
      const { access, refresh } = data || {};
      if (!access || !refresh) throw new Error("Missing tokens from register.");

      // 2) Persist tokens
      localStorage.setItem("accessToken", access);
      localStorage.setItem("refreshToken", refresh);

      // 3) Tell UserContext we're logged in (decodes JWT internally)
      if (login) login(access);

      // 4) (Optional) set axios default header for this tab
      axios.defaults.headers.common.Authorization = `Bearer ${access}`;

      // 5) Go home logged in
      navigate("/");
    } catch (error) {
      let msg = "Something went wrong. Please try again.";
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

      // Clean up partial tokens
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      delete axios.defaults.headers.common.Authorization;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reg-root">
      <div className="container">
        <div className="reg-card">
          <header className="reg-header">
            <h1>Create your account</h1>
            <p className="muted">
              Generate questions, get marking, track results.
            </p>
          </header>

          {errorMessage && (
            <p className="reg-alert reg-alert--error">{errorMessage}</p>
          )}

          <form onSubmit={handleSubmit} className="reg-form" noValidate>
            <div className="reg-field">
              <label htmlFor="username" className="reg-label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="reg-input"
                placeholder="Choose a unique username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="reg-field">
              <label htmlFor="email" className="reg-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="reg-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="reg-field">
              <label htmlFor="password1" className="reg-label">
                Password
              </label>
              <input
                id="password1"
                name="password1"
                type="password"
                className="reg-input"
                placeholder="Create a strong password (8+ chars)"
                value={formData.password1}
                onChange={handleChange}
                required
              />
            </div>

            <div className="reg-field">
              <label htmlFor="password2" className="reg-label">
                Repeat Password
              </label>
              <input
                id="password2"
                name="password2"
                type="password"
                className="reg-input"
                placeholder="Repeat the password"
                value={formData.password2}
                onChange={handleChange}
                required
              />
            </div>

            <button
              className="btn btn--primary reg-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Registering…" : "Register"}
            </button>
          </form>

          <div className="reg-footer">
            <span className="muted">Already have an account?</span>{" "}
            <Link to="/login" className="link">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
