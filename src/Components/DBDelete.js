import React, { useMemo, useState } from "react";
import axios from "axios";
import { toastError, toastSuccess } from "./showAppToast";
import "./DBDelete.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_BASE = process.env.REACT_APP_API_BASE || "";

function getRequesterEmail() {
  return (
    localStorage.getItem("userEmail") ||
    localStorage.getItem("email") ||
    ""
  ).trim();
}

export default function DBDelete() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const canSubmit = useMemo(() => {
    return !loading && EMAIL_REGEX.test(email.trim().toLowerCase());
  }, [email, loading]);

  async function onDelete() {
    const targetEmail = email.trim().toLowerCase();
    const requesterEmail = getRequesterEmail();

    if (!EMAIL_REGEX.test(targetEmail)) {
      toastError("Enter a valid email address.");
      return;
    }

    const ok = window.confirm(
      `This will permanently delete all DB history/cache for "${targetEmail}" across ALL users DBs. Continue?`
    );
    if (!ok) return;

    try {
      setLoading(true);
      setResult(null);

      const res = await axios.post(
        `${API_BASE}/api/admin/db-delete/email`,
        {
          email: targetEmail,
          requesterEmail,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-user-email": requesterEmail,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      setResult(res.data || null);
      toastSuccess(res?.data?.message || "DB delete completed.");
    } catch (err) {
      console.error("DB delete failed:", err);
      toastError(err?.response?.data?.error || "Failed to delete records.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dbd-wrap">
      <div className="dbd-card">
        <h1>DB Delete</h1>
        <p className="dbd-sub">
          Enter an email to remove all matching history/cache entries across all users databases.
        </p>

        <div className="dbd-row">
          <input
            type="email"
            value={email}
            placeholder="example@domain.com"
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <button type="button" onClick={onDelete} disabled={!canSubmit}>
            {loading ? "Deleting..." : "Delete from DB"}
          </button>
        </div>

        {result && (
          <div className="dbd-result">
            <h3>Deletion Summary</h3>
            <div><strong>Target:</strong> {result.targetEmail || "-"}</div>
            <div><strong>Status:</strong> {result.message || "-"}</div>
            <div><strong>Global EmailLog:</strong> {result?.deleted?.global?.EmailLog ?? 0}</div>
            <div><strong>Global SinglePending:</strong> {result?.deleted?.global?.SinglePending ?? 0}</div>
            <div><strong>Global SendGridPending:</strong> {result?.deleted?.global?.SendGridPending ?? 0}</div>
            <div><strong>User DBs scanned:</strong> {result?.deleted?.allUsers?.userCount ?? 0}</div>
            <div><strong>User DB failures:</strong> {result?.deleted?.allUsers?.failedUsers ?? 0}</div>
            <div><strong>Total per-user EmailLog deleted:</strong> {result?.deleted?.allUsers?.EmailLogTotal ?? 0}</div>
          </div>
        )}
      </div>
    </div>
  );
}
