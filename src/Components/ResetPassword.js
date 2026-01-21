import React, { useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "./ResetPassword.css";
import trueSendrLogo from "../assets/TrueSendr Temp logo-03.png";
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

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const query = useQuery();

  const email = query.get("email") || "";
  const token = query.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwFocused, setPwFocused] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [status, setStatus] = useState({ error: "", success: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Same password rules as Signup (keep ticks)
  const passLenOK = useMemo(() => newPassword.length >= 8, [newPassword]);
  const passUpperOK = useMemo(() => /[A-Z]/.test(newPassword), [newPassword]);
  const passDigitOK = useMemo(() => /\d/.test(newPassword), [newPassword]);
  const passSpecialOK = useMemo(
    () => /[!@#$%^&*()\-_=+[{\]}\\|;:'",<.>/?`~]/.test(newPassword),
    [newPassword]
  );
  const allPassReqOK = passLenOK && passUpperOK && passDigitOK && passSpecialOK;

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ error: "", success: "" });

    if (!email || !token) {
      setStatus({ error: "Invalid reset link.", success: "" });
      return;
    }
    if (!allPassReqOK) {
      setStatus({
        error:
          "Password must be 8+ chars and include at least 1 uppercase letter, 1 number, and 1 special symbol.",
        success: "",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ error: "Passwords do not match.", success: "" });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/auth/reset-password", {
        email,
        token,
        newPassword,
        confirmPassword,
      });
      setIsSubmitting(false);

      if (res.data?.ok) {
        setStatus({ success: "Password updated successfully", error: "" });
      } else {
        setStatus({
          error: res.data?.message || "Could not reset password.",
          success: "",
        });
      }
    } catch (err) {
      setIsSubmitting(false);
      setStatus({
        error: err?.response?.data?.message || "Could not reset password.",
        success: "",
      });
    }
  };

  return (
    <div className="rp-wrap">
      <div className="rp-card">
        {/* LEFT */}
        <div className="rp-left">
          {!status.success ? (
            <form className="rp-left-stack" onSubmit={submit}>
              <h2 className="rp-title">Reset Password</h2>

              <label className="rp-label">New Password</label>
              <div className="input-eye">
                <input
                  type={showNewPw ? "text" : "password"}
                  placeholder="********"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowNewPw((s) => !s)}
                  aria-label={showNewPw ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  {showNewPw ? (
                    <VisibilityOffOutlinedIcon fontSize="small" />
                  ) : (
                    <VisibilityOutlinedIcon fontSize="small" />
                  )}
                </button>
              </div>

              {/* ✅ keep checklist logic (only when focused) */}
              {pwFocused && (
                <div className="rp-reqs" aria-live="polite">
                  <span className={`req ${passLenOK ? "ok" : "bad"}`}>
                    {passLenOK ? "✓" : "✗"} 8+ chars
                  </span>
                  <span className={`req ${passUpperOK ? "ok" : "bad"}`}>
                    {passUpperOK ? "✓" : "✗"} Uppercase
                  </span>
                  <span className={`req ${passDigitOK ? "ok" : "bad"}`}>
                    {passDigitOK ? "✓" : "✗"} Number
                  </span>
                  <span className={`req ${passSpecialOK ? "ok" : "bad"}`}>
                    {passSpecialOK ? "✓" : "✗"} Special
                  </span>
                </div>
              )}

              <label className="rp-label">Confirm Password</label>
              <div className="input-eye">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="********"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowConfirmPw((s) => !s)}
                  aria-label={showConfirmPw ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  {showConfirmPw ? (
                    <VisibilityOffOutlinedIcon fontSize="small" />
                  ) : (
                    <VisibilityOutlinedIcon fontSize="small" />
                  )}
                </button>
              </div>

              {status.error && <div className="rp-error">{status.error}</div>}

              <button className="rp-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Resetting…" : "Reset Password"}
              </button>
            </form>
          ) : (
            <div className="rp-success">
              <div className="rp-check">✓</div>
              <p className="rp-success-text">{status.success}</p>

              <button
                className="rp-btn rp-btn-wide"
                onClick={() => navigate("/login")}
              >
                Back to Log in
              </button>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="rp-right">
          <div className="rp-brand">
            <img
              className="rp-brand-logo"
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
