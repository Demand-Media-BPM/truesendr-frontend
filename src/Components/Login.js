// src/pages/Login.jsx
import React, { useState } from "react";
import axios from "axios";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import trueSendrLogo from "../assets/TrueSendr Temp logo-03.png";

/* MUI icon (same back icon family you used) */
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE ||
    (window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : `${window.location.protocol}//${window.location.host}`),
  headers: { "ngrok-skip-browser-warning": "true" },
  timeout: 20000,
});

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password, remember });
      if (res.data?.success) {
        const user = res.data.user || {};

        // ✅ build full name
        const fullName =
          `${user.firstName || ""} ${user.lastName || ""}`.trim();

        // ✅ store for profile tray
        // ✅ store for profile tray only (session & username handled by App.jsx)
        localStorage.setItem("userEmail", user.email || "");
        if (fullName) localStorage.setItem("userFullName", fullName);

        setTimeout(() => {
          onLogin(user.username);
          navigate("/dashboard", { replace: true });
        }, 800);
      } else {
        setError(res.data?.message || "Invalid email or password.");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid email or password.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* LEFT */}
        <div className="login-left">
          <div className="left-stack login-step">
            <h2 className="title">Log in</h2>

            <label className="field-label">Company Email</label>
            <input
              type="email"
              placeholder="example@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isSubmitting}
            />

            <label className="field-label">Password</label>
            <div className="input-eye">
              <input
                type={showPw ? "text" : "password"}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPw ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </button>
            </div>

            <div className="row-between">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>Remember me</span>
              </label>

              <span
                className="link-orange"
                onClick={() => navigate("/forgot-password")}
                role="button"
                tabIndex={0}
              >
                Forgot Password?
              </span>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button
              className="primary-btn"
              type="button"
              onClick={handleLogin}
              disabled={isSubmitting || !email.trim() || !password}
            >
              {isSubmitting ? "Logging in..." : "Log in"}
            </button>

            <p className="bottom-link center">
              Don’t have an account?{" "}
              <span onClick={() => navigate("/signup")}>Sign up</span>
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="login-right">
          <div className="brand">
            <img
              className="brand-logo"
              src={trueSendrLogo}
              alt="TrueSendr logo"
            />
            <p>Message/Description</p>
          </div>
        </div>
      </div>
    </div>
  );
}
