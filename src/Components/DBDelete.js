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
  const [emailText, setEmailText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const parsed = useMemo(() => {
    const parts = emailText
      .split(/[\s,;]+/g)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    const seen = new Set();
    const validEmails = [];
    const invalidEmails = [];

    for (const item of parts) {
      if (!EMAIL_REGEX.test(item)) {
        invalidEmails.push(item);
        continue;
      }

      if (!seen.has(item)) {
        seen.add(item);
        validEmails.push(item);
      }
    }

    return {
      totalEntries: parts.length,
      validEmails,
      invalidEmails,
      duplicateCount: Math.max(
        0,
        parts.length - validEmails.length - invalidEmails.length
      ),
    };
  }, [emailText]);

  const canSubmit = !loading && parsed.validEmails.length > 0;

  async function onDelete() {
    const requesterEmail = getRequesterEmail();

    if (!parsed.validEmails.length) {
      toastError("Paste at least one valid email address.");
      return;
    }

    try {
      setLoading(true);
      setConfirmOpen(false);
      setResult(null);

      const res = await axios.post(
        `${API_BASE}/api/admin/db-delete/emails`,
        {
          emails: parsed.validEmails,
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
          Paste email addresses to remove matching history/cache entries across
          all users databases.
        </p>

        <div className="dbd-paste">
          <textarea
            value={emailText}
            placeholder="Copy & paste email addresses"
            onChange={(e) => setEmailText(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="dbd-meta">
          <span>{parsed.validEmails.length} emails detected</span>
          {parsed.duplicateCount > 0 && (
            <span>{parsed.duplicateCount} duplicates ignored</span>
          )}
          {parsed.invalidEmails.length > 0 && (
            <span className="dbd-meta__bad">
              {parsed.invalidEmails.length} invalid ignored
            </span>
          )}
        </div>

        <button
          type="button"
          className="dbd-delete-btn"
          onClick={() => setConfirmOpen(true)}
          disabled={!canSubmit}
        >
          {loading ? "Deleting..." : "Delete from DB"}
        </button>

        {result && (
          <div className="dbd-result">
            <h3>Deletion Summary</h3>
            <div>
              <strong>Valid emails:</strong>{" "}
              {result.validCount ?? result.targetEmails?.length ?? 0}
            </div>
            <div>
              <strong>Invalid ignored:</strong>{" "}
              {result.invalidEmails?.length ?? 0}
            </div>
            <div>
              <strong>Duplicates ignored:</strong>{" "}
              {result.duplicateCount ?? 0}
            </div>
            <div>
              <strong>Status:</strong> {result.message || "-"}
            </div>
            <div>
              <strong>Global EmailLog:</strong>{" "}
              {result?.deleted?.global?.EmailLog ?? 0}
            </div>
            <div>
              <strong>Global SinglePending:</strong>{" "}
              {result?.deleted?.global?.SinglePending ?? 0}
            </div>
            <div>
              <strong>Global SendGridPending:</strong>{" "}
              {result?.deleted?.global?.SendGridPending ?? 0}
            </div>
            <div>
              <strong>User DBs scanned:</strong>{" "}
              {result?.deleted?.allUsers?.userCount ?? 0}
            </div>
            <div>
              <strong>User DB failures:</strong>{" "}
              {result?.deleted?.allUsers?.failedUsers ?? 0}
            </div>
            <div>
              <strong>Total per-user EmailLog deleted:</strong>{" "}
              {result?.deleted?.allUsers?.EmailLogTotal ?? 0}
            </div>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div
          className="dbd-confirm-backdrop"
          role="presentation"
          onClick={() => !loading && setConfirmOpen(false)}
        >
          <div
            className="dbd-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dbd-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dbd-confirm-title">Clear Records?</h2>
            <p>
              Are you sure you want to clear DB history/cache for{" "}
              <strong>{parsed.validEmails.length}</strong> email(s) across all
              users DBs?
            </p>

            <div className="dbd-confirm-actions">
              <button
                type="button"
                className="dbd-confirm-btn"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dbd-confirm-btn dbd-confirm-danger"
                onClick={onDelete}
                disabled={loading}
              >
                {loading ? "Clearing..." : "Clear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
