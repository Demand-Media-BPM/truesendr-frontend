import React, { useEffect, useMemo, useState } from "react";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import axios from "axios";
import "./Settings.css";
import { toastSuccess, toastError } from "./showAppToast";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const API_BASE = process.env.REACT_APP_API_BASE || "";

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    billingModel: "Pay As You Go",
    lastLogin: "",
    creditsUsed: 0,
    creditsTotal: 0,
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function getUsername() {
    const u0 = (localStorage.getItem("loggedInUser") || "").trim();
    if (u0) return u0;

    const u1 = (
      localStorage.getItem("username") ||
      localStorage.getItem("user") ||
      ""
    ).trim();
    if (u1) return u1;

    try {
      const u2 = JSON.parse(localStorage.getItem("auth") || "{}")?.username;
      if (u2) return String(u2).trim();
    } catch {}

    return "";
  }

  const [pwForm, setPwForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [pwFocused, setPwFocused] = useState(false);

  const [showPw, setShowPw] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const onPwChange = (key) => (e) =>
    setPwForm((p) => ({ ...p, [key]: e.target.value }));

  const togglePwVisibility = (key) => {
    setShowPw((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const passLenOK = useMemo(() => pwForm.next.length >= 8, [pwForm.next]);
  const passUpperOK = useMemo(() => /[A-Z]/.test(pwForm.next), [pwForm.next]);
  const passDigitOK = useMemo(() => /\d/.test(pwForm.next), [pwForm.next]);
  const passSpecialOK = useMemo(
    () => /[!@#$%^&*()\-_=+[{\]}\\|;:'",<.>/?`~]/.test(pwForm.next),
    [pwForm.next],
  );

  const allPassReqOK = passLenOK && passUpperOK && passDigitOK && passSpecialOK;

  const passwordsMismatch =
    pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm;

  const formatLastLogin = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError("");

      const username = getUsername();

      const res = await axios.get(`${API_BASE}/api/profile`, {
        headers: {
          "x-username": username,
        },
      });

      const user = res?.data?.user || res?.data || {};

      const fullName =
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.username ||
        "—";

      setProfileData({
        name: fullName,
        email: user.email || "—",
        billingModel: user.billingModel || "Pay As You Go",
        lastLogin: formatLastLogin(user.lastLogin),
        creditsUsed: Number(user.creditsUsed || 0),
        creditsTotal: Number(user.creditsTotal || 0),
      });
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setProfileError(
        err?.response?.data?.message || "Failed to load profile data.",
      );
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const openDeleteModal = () => setDeleteModalOpen(true);

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
  };

  function forceLogoutToLogin() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    localStorage.removeItem("auth");
    localStorage.removeItem("credits");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("TS_SESSION_PING_MS");
    localStorage.removeItem("TS_ACTIVE_SESSION_ID");

    sessionStorage.removeItem("TS_MY_SESSION_ID");

    window.location.replace("/login");
  }

  const onDeleteAccount = async () => {
    try {
      setDeleteLoading(true);

      const username = getUsername();

      const res = await axios.delete(`${API_BASE}/api/profile/delete-account`, {
        headers: {
          "x-username": username,
        },
        data: {
          username,
        },
      });

      toastSuccess(res?.data?.message || "Account deleted successfully.");

      setDeleteModalOpen(false);

      setTimeout(() => {
        forceLogoutToLogin();
      }, 1200);
    } catch (err) {
      console.error("Delete account failed:", err);
      toastError(err?.response?.data?.message || "Failed to delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const onResetPassword = async (e) => {
    e.preventDefault();

    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      toastError("Please fill all password fields.");
      return;
    }

    if (!allPassReqOK) {
      toastError(
        "New password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.",
      );
      return;
    }

    if (pwForm.next !== pwForm.confirm) {
      toastError("New password and confirm password do not match.");
      return;
    }

    try {
      setPwLoading(true);

      const username = getUsername();

      const res = await axios.put(
        `${API_BASE}/api/profile/reset-password`,
        {
          username,
          currentPassword: pwForm.current,
          newPassword: pwForm.next,
          confirmPassword: pwForm.confirm,
        },
        {
          headers: {
            "x-username": username,
          },
        },
      );

      toastSuccess(
        res?.data?.message ||
          "Password updated successfully. Please login again.",
      );

      setPwForm({ current: "", next: "", confirm: "" });

      setTimeout(() => {
        forceLogoutToLogin();
      }, 1200);
    } catch (err) {
      console.error("Reset password failed:", err);
      toastError(err?.response?.data?.message || "Failed to reset password.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="ts-settings">
      <div className="ts-settings__header">
        <h1 className="ts-settings__title">Settings</h1>

        <div className="ts-tabs" role="tablist" aria-label="Settings Tabs">
          <button
            type="button"
            className={`ts-tab ${activeTab === "profile" ? "is-active" : ""}`}
            onClick={() => setActiveTab("profile")}
            role="tab"
            aria-selected={activeTab === "profile"}
          >
            Profile
          </button>

          <button
            type="button"
            className={`ts-tab ${activeTab === "reset" ? "is-active" : ""}`}
            onClick={() => setActiveTab("reset")}
            role="tab"
            aria-selected={activeTab === "reset"}
          >
            Reset Password
          </button>

          <button
            type="button"
            className={`ts-tab ${activeTab === "security" ? "is-active" : ""}`}
            onClick={() => setActiveTab("security")}
            role="tab"
            aria-selected={activeTab === "security"}
          >
            Security
          </button>

          <button
            type="button"
            className={`ts-tab ${activeTab === "billing" ? "is-active" : ""}`}
            onClick={() => setActiveTab("billing")}
            role="tab"
            aria-selected={activeTab === "billing"}
          >
            Billing
          </button>
        </div>
      </div>

      {activeTab === "profile" && (
        <div className="ts-settings__body">
          <section className="ts-card">
            <div className="ts-card__title">Account Overview</div>

            {profileLoading ? (
              <div className="ts-placeholder__text">Loading profile...</div>
            ) : profileError ? (
              <div className="ts-inline-error">{profileError}</div>
            ) : (
              <div className="ts-overview">
                <div className="ts-overview__col">
                  <div className="ts-kv">
                    <div className="ts-kv__k">Name</div>
                    <div className="ts-kv__v">{profileData.name}</div>
                  </div>

                  <div className="ts-kv">
                    <div className="ts-kv__k">Email</div>
                    <div className="ts-kv__v">{profileData.email}</div>
                  </div>
                </div>

                <div className="ts-overview__col">
                  <div className="ts-kv">
                    <div className="ts-kv__k">Billing Model</div>
                    <div className="ts-kv__v">{profileData.billingModel}</div>
                  </div>

                  <div className="ts-kv">
                    <div className="ts-kv__k">Last Login</div>
                    <div className="ts-kv__v">{profileData.lastLogin}</div>
                  </div>

                  {/* <div className="ts-kv ts-kv--credits">
                    <div className="ts-kv__k">Credits Usage</div>

                    <div className="ts-credits">
                      <div className="ts-credits__track" aria-hidden="true">
                        <div
                          className="ts-credits__fill"
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>

                      <div className="ts-credits__meta">
                        <div className="ts-credits__used">
                          Used: {profileData.creditsUsed.toLocaleString()}
                        </div>
                        <div className="ts-credits__total">
                          Total: {profileData.creditsTotal.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div> */}
                </div>
              </div>
            )}
          </section>

          <section className="ts-card ts-card--danger">
            <div className="ts-card__title">Delete Account</div>
            <p className="ts-danger__text">
              Deleting your account will permanently remove all your data. This
              action cannot be undone.
            </p>

            <button
              type="button"
              className="ts-danger__action"
              onClick={openDeleteModal}
              disabled={deleteLoading}
            >
              Delete Account
            </button>
          </section>
        </div>
      )}

      {activeTab === "reset" && (
        <div className="ts-settings__body">
          <section className="ts-card">
            <div className="ts-card__title">Reset Password</div>

            <form className="ts-form" onSubmit={onResetPassword}>
              <div className="ts-field">
                <label className="ts-label">Current Password</label>
                <div className="ts-password-wrap">
                  <input
                    className="ts-input ts-input--password"
                    type={showPw.current ? "text" : "password"}
                    placeholder="Enter current password"
                    value={pwForm.current}
                    onChange={onPwChange("current")}
                    autoComplete="current-password"
                    disabled={pwLoading}
                  />
                  <button
                    type="button"
                    className="ts-eye-btn"
                    onClick={() => togglePwVisibility("current")}
                    aria-label={
                      showPw.current
                        ? "Hide current password"
                        : "Show current password"
                    }
                    disabled={pwLoading}
                  >
                    {showPw.current ? (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOutlinedIcon fontSize="small" />
                    )}
                  </button>
                </div>
              </div>

              <div className="ts-field">
                <label className="ts-label">New Password</label>
                <div className="ts-password-wrap">
                  <input
                    className="ts-input ts-input--password"
                    type={showPw.next ? "text" : "password"}
                    placeholder="Enter new password"
                    value={pwForm.next}
                    onChange={onPwChange("next")}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                    autoComplete="new-password"
                    disabled={pwLoading}
                  />
                  <button
                    type="button"
                    className="ts-eye-btn"
                    onClick={() => togglePwVisibility("next")}
                    aria-label={
                      showPw.next ? "Hide new password" : "Show new password"
                    }
                    disabled={pwLoading}
                  >
                    {showPw.next ? (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOutlinedIcon fontSize="small" />
                    )}
                  </button>
                </div>

                {(pwFocused || pwForm.next) && (
                  <div className="ts-reqs" aria-live="polite">
                    <span className={`ts-req ${passLenOK ? "ok" : "bad"}`}>
                      {passLenOK ? "✓" : "✗"} 8+ chars
                    </span>
                    <span className={`ts-req ${passUpperOK ? "ok" : "bad"}`}>
                      {passUpperOK ? "✓" : "✗"} Uppercase
                    </span>
                    <span className={`ts-req ${passDigitOK ? "ok" : "bad"}`}>
                      {passDigitOK ? "✓" : "✗"} Number
                    </span>
                    <span className={`ts-req ${passSpecialOK ? "ok" : "bad"}`}>
                      {passSpecialOK ? "✓" : "✗"} Special
                    </span>
                  </div>
                )}
              </div>

              <div className="ts-field">
                <label className="ts-label">Confirm New Password</label>
                <div className="ts-password-wrap">
                  <input
                    className="ts-input ts-input--password"
                    type={showPw.confirm ? "text" : "password"}
                    placeholder="Enter new password again"
                    value={pwForm.confirm}
                    onChange={onPwChange("confirm")}
                    autoComplete="new-password"
                    disabled={pwLoading}
                  />
                  <button
                    type="button"
                    className="ts-eye-btn"
                    onClick={() => togglePwVisibility("confirm")}
                    aria-label={
                      showPw.confirm
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    disabled={pwLoading}
                  >
                    {showPw.confirm ? (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOutlinedIcon fontSize="small" />
                    )}
                  </button>
                </div>
              </div>

              {passwordsMismatch && (
                <div className="ts-inline-error">
                  New password and confirm password do not match.
                </div>
              )}

              <button
                type="submit"
                className="ts-btn"
                disabled={
                  pwLoading ||
                  !pwForm.current ||
                  !pwForm.next ||
                  !pwForm.confirm ||
                  !allPassReqOK ||
                  !!passwordsMismatch
                }
              >
                {pwLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </section>
        </div>
      )}

      {activeTab === "security" && (
        <div className="ts-settings__body">
          <section className="ts-card ts-card--placeholder">
            <div className="ts-card__title">Security</div>
            <p className="ts-placeholder__text">Still Under Working</p>
          </section>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="ts-settings__body">
          <section className="ts-card ts-card--placeholder">
            <div className="ts-card__title">Billing</div>
            <p className="ts-placeholder__text">Still Under Working</p>
          </section>
        </div>
      )}

      {deleteModalOpen && (
        <div className="ts-modal-backdrop" onClick={closeDeleteModal}>
          <div
            className="ts-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <h2 id="delete-account-title" className="ts-modal__title">
              Delete Account?
            </h2>

            <p className="ts-modal__text">
              This will permanently delete your account and all associated data.
              You will lose your credits and access immediately.
              <br />
              This action cannot be undone.
            </p>

            <div className="ts-modal__actions">
              <button
                type="button"
                className="ts-modal__btn ts-modal__btn--cancel"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ts-modal__btn ts-modal__btn--danger"
                onClick={onDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
