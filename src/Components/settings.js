import React, { useMemo, useState } from "react";
import "./Settings.css";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");

  // ✅ later you’ll replace this with API data
  const profileData = useMemo(
    () => ({
      name: "Woodrow Cummerata",
      email: "woodrowcummerata@breitenberggroup.com",
      company: "Breitenberg Group",
      billingModel: "Pay As You Go",
      lastLogin: "21 Jan 2026, 11:45 AM",
      creditsUsed: 3415,
      creditsTotal: 9000,
    }),
    [],
  );

  const usedPct = useMemo(() => {
    const t = Number(profileData.creditsTotal || 0);
    const u = Number(profileData.creditsUsed || 0);
    if (!t) return 0;
    return Math.max(0, Math.min(100, (u / t) * 100));
  }, [profileData]);

  // Reset password UI only (backend later)
  const [pwForm, setPwForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const onPwChange = (key) => (e) =>
    setPwForm((p) => ({ ...p, [key]: e.target.value }));

  const onResetPassword = (e) => {
    e.preventDefault();
    // ✅ backend route later
    // For now just UI behavior
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) return;
    if (pwForm.next !== pwForm.confirm) return;

    setPwForm({ current: "", next: "", confirm: "" });
    // optional: toast later
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
            className={`ts-tab ${
              activeTab === "reset" ? "is-active" : ""
            }`}
            onClick={() => setActiveTab("reset")}
            role="tab"
            aria-selected={activeTab === "reset"}
          >
            Reset Password
          </button>

          <button
            type="button"
            className={`ts-tab ${
              activeTab === "security" ? "is-active" : ""
            }`}
            onClick={() => setActiveTab("security")}
            role="tab"
            aria-selected={activeTab === "security"}
          >
            Security
          </button>

          <button
            type="button"
            className={`ts-tab ${
              activeTab === "billing" ? "is-active" : ""
            }`}
            onClick={() => setActiveTab("billing")}
            role="tab"
            aria-selected={activeTab === "billing"}
          >
            Billing
          </button>
        </div>
      </div>

      {/* ====== PROFILE TAB ====== */}
      {activeTab === "profile" && (
        <div className="ts-settings__body">
          <section className="ts-card">
            <div className="ts-card__title">Account Overview</div>

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

                {/* <div className="ts-kv">
                  <div className="ts-kv__k">Company</div>
                  <div className="ts-kv__v">{profileData.company}</div>
                </div> */}
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
          </section>

          <section className="ts-card ts-card--danger">
            <div className="ts-card__title">Delete Account</div>
            <p className="ts-danger__text">
              Deleting your account will permanently remove all your data. This
              action cannot be undone.
            </p>

            <button type="button" className="ts-danger__action">
              Delete Account
            </button>
          </section>
        </div>
      )}

      {/* ====== RESET PASSWORD TAB ====== */}
      {activeTab === "reset" && (
        <div className="ts-settings__body">
          <section className="ts-card">
            <form className="ts-form" onSubmit={onResetPassword}>
              <div className="ts-field">
                <label className="ts-label">Current Password</label>
                <input
                  className="ts-input"
                  type="password"
                  placeholder="Enter current password"
                  value={pwForm.current}
                  onChange={onPwChange("current")}
                />
              </div>

              <div className="ts-field">
                <label className="ts-label">New Password</label>
                <input
                  className="ts-input"
                  type="password"
                  placeholder="Enter new password"
                  value={pwForm.next}
                  onChange={onPwChange("next")}
                />
              </div>

              <div className="ts-field">
                <label className="ts-label">Confirm New Password</label>
                <input
                  className="ts-input"
                  type="password"
                  placeholder="Enter new password"
                  value={pwForm.confirm}
                  onChange={onPwChange("confirm")}
                />
              </div>

              <button type="submit" className="ts-btn">
                Reset Password
              </button>

              {/* small inline validation UI (no backend yet) */}
              {pwForm.next &&
                pwForm.confirm &&
                pwForm.next !== pwForm.confirm && (
                  <div className="ts-inline-error">
                    New password and confirm password do not match.
                  </div>
                )}
            </form>
          </section>
        </div>
      )}

      {/* ====== SECURITY TAB ====== */}
      {activeTab === "security" && (
        <div className="ts-settings__body">
          <section className="ts-card ts-card--placeholder">
            <div className="ts-card__title">Security</div>
            <p className="ts-placeholder__text">
              Nhi Hua bhai
            </p>
          </section>
        </div>
      )}

      {/* ====== BILLING TAB ====== */}
      {activeTab === "billing" && (
        <div className="ts-settings__body">
          <section className="ts-card ts-card--placeholder">
            <div className="ts-card__title">Billing</div>
            <p className="ts-placeholder__text">
              Nhi Hua bhai
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
