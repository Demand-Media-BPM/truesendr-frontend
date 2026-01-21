import React, { useState } from "react";
import axios from "axios";
import "./ForgotPassword.css";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import trueSendrLogo from "../assets/TrueSendr Temp logo-03.png";

const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE ||
    (window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : `${window.location.protocol}//${window.location.host}`),
  headers: { "ngrok-skip-browser-warning": "true" },
  timeout: 20000,
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ error: "", success: "" });

    if (!email.trim()) {
      setStatus({ error: "Please enter your email address.", success: "" });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setIsSubmitting(false);
      setStatus({
        error: "",
        success: "Reset link has been sent to your email",
      });
    } catch (err) {
      setIsSubmitting(false);

      const statusCode = err?.response?.status;
      const apiMsg = err?.response?.data?.message;

      if (statusCode === 404) {
        setStatus({
          error: apiMsg || "This email is not registered. Please sign up.",
          success: "",
        });
        return;
      }

      setStatus({
        error: apiMsg || "Could not send reset link. Try again.",
        success: "",
      });
    }
  };

  return (
    <div className="fp-wrap">
      <div className="fp-card">
        {/* LEFT */}
        <div className="fp-left">
          {!status.success ? (
            <form className="fp-left-stack" onSubmit={submit}>
              <div className="fp-head">
                <button
                  type="button"
                  className="fp-back"
                  onClick={() => navigate("/login")}
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowBackIcon fontSize="small" />
                </button>

                <h2 className="fp-title">Forgot Password?</h2>
              </div>

              <p className="fp-sub">
                Password reset link will be sent to your email address
              </p>

              <label className="fp-label">Company Email</label>
              <input
                type="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
              />

              {status.error && (
                <div className="fp-error">
                  {status.error}{" "}
                  {status.error.toLowerCase().includes("sign up") && (
                    <span
                      className="fp-signup"
                      onClick={() => navigate("/signup")}
                    >
                      Sign up
                    </span>
                  )}
                </div>
              )}

              <button className="fp-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="fp-success">
              <div className="fp-check">✓</div>
              <p className="fp-success-text">{status.success}</p>
              <p className="fp-success-email">{email.trim()}</p>

              <button
                className="fp-btn fp-btn-wide"
                onClick={() => navigate("/login")}
              >
                Back to Log in
              </button>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="fp-right">
          <div className="fp-brand">
            <img
              className="fp-brand-logo"
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
