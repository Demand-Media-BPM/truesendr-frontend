import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import "./SMTPValidatorLive.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_BASE = process.env.REACT_APP_API_BASE;
const WS_URL = process.env.REACT_APP_WS_URL;
const MAX_LOGS = 300;

function getUsername() {
  if (typeof localStorage === "undefined") return "";
  return (localStorage.getItem("loggedInUser") || "").trim();
}

function statusClass(status = "") {
  const s = String(status || "").toLowerCase();
  if (s.includes("invalid")) return "smtp-status invalid";
  if (s.includes("valid")) return "smtp-status valid";
  if (s.includes("risky")) return "smtp-status risky";
  return "smtp-status unknown";
}

export default function SMTPValidatorLive() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [levelFilter, setLevelFilter] = useState("all");

  const wsRef = useRef(null);
  const currentSessionIdRef = useRef("");
  const currentEmailRef = useRef("");
  const logsEndRef = useRef(null);

  const canSubmit = useMemo(() => !loading && email.trim().length > 0, [loading, email]);

  const filteredLogs = useMemo(() => {
    if (levelFilter === "all") return logs;
    return logs.filter((l) => l.level === levelFilter);
  }, [logs, levelFilter]);

  useEffect(() => {
    if (!WS_URL) return;

    const username = encodeURIComponent(getUsername());
    const sid = encodeURIComponent(currentSessionIdRef.current || "smtp-idle");
    const ws = new WebSocket(`${WS_URL}?sessionId=${sid}&user=${username}`);
    wsRef.current = ws;

    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            sessionId: currentSessionIdRef.current || "smtp-idle",
            username: getUsername(),
          }),
        );
      } catch {}
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type !== "log") return;

        const currentEmail = (currentEmailRef.current || "").toLowerCase();
        if (currentEmail && String(data.email || "").toLowerCase() !== currentEmail) return;

        const item = {
          at: data.at || new Date().toISOString(),
          step: data.step || "step",
          level: data.level || "info",
          message: data.message || "",
        };

        setLogs((prev) => {
          const next = [...prev, item];
          if (next.length > MAX_LOGS) next.splice(0, next.length - MAX_LOGS);
          return next;
        });
      } catch {}
    };

    return () => {
      try {
        ws.close();
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [filteredLogs.length]);

  const onVerify = async () => {
    const e = email.trim().toLowerCase();

    if (!e) {
      toast.warn("Please enter an email.");
      return;
    }
    if (!EMAIL_REGEX.test(e)) {
      toast.warn("Please enter a valid email format.");
      return;
    }

    const sessionId = `smtp-admin-${Date.now()}`;
    currentSessionIdRef.current = sessionId;
    currentEmailRef.current = e;
    setLogs([]);

    try {
      setLoading(true);
      setResult(null);

      const res = await fetch(`${API_BASE}/api/single/validate-smtp-admin-testing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: e,
          username: getUsername(),
          sessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "SMTP validation failed");
      }

      setResult(data);
      toast.success("SMTP-only validation completed.");
    } catch (err) {
      toast.error(err.message || "Something went wrong");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => setLogs([]);

  const copyLogs = async () => {
    const text = filteredLogs
      .map((l) => `[${l.at}] [${l.level}] [${l.step}] ${l.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success("Logs copied.");
    } catch {
      toast.error("Failed to copy logs.");
    }
  };

  return (
    <div className="smtp-live-wrap">
      <div className="smtp-live-card">
        <h1>Smtp Testing</h1>
        <p className="smtp-sub">
          SMTP-only check. No cache reuse, no SendGrid fallback, no DB save.
        </p>

        <div className="smtp-row">
          <input
            type="email"
            placeholder="example@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && onVerify()}
            disabled={loading}
          />
          <button onClick={onVerify} disabled={!canSubmit}>
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>

        {result && (
          <div className="smtp-result">
            <div className={statusClass(result.status)}>{result.status || "Unknown"}</div>

            <div className="smtp-grid">
              <div><strong>Email:</strong> {result.email || "-"}</div>
              <div><strong>Category:</strong> {result.category || "-"}</div>
              <div><strong>Sub Status:</strong> {result.subStatus || "-"}</div>
              <div><strong>Score:</strong> {typeof result.score === "number" ? result.score : "-"}</div>
              <div><strong>Confidence:</strong> {typeof result.confidence === "number" ? `${Math.round(result.confidence * 100)}%` : "-"}</div>
              <div><strong>Domain:</strong> {result.domain || "-"}</div>
              <div><strong>Provider:</strong> {result.domainProvider || result.provider || "-"}</div>
              <div><strong>Disposable:</strong> {result.isDisposable ? "Yes" : "No"}</div>
              <div><strong>Free:</strong> {result.isFree ? "Yes" : "No"}</div>
              <div><strong>Role-based:</strong> {result.isRoleBased ? "Yes" : "No"}</div>
            </div>

            <div className="smtp-text"><strong>Reason:</strong> {result.reason || "-"}</div>
            <div className="smtp-text"><strong>Message:</strong> {result.message || "-"}</div>
          </div>
        )}

        <div className="smtp-logs">
          <div className="smtp-logs-head">
            <h3>Detailed Logs</h3>
            <div className="smtp-logs-actions">
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
              <button type="button" onClick={copyLogs}>Copy</button>
              <button type="button" onClick={clearLogs}>Clear</button>
            </div>
          </div>

          <div className="smtp-logs-body">
            {filteredLogs.length === 0 ? (
              <div className="smtp-log-empty">No logs yet.</div>
            ) : (
              filteredLogs.map((l, idx) => (
                <div key={`${l.at}-${idx}`} className={`smtp-log-line ${l.level || "info"}`}>
                  <span className="ts">{new Date(l.at).toLocaleTimeString()}</span>
                  <span className="lv">{(l.level || "info").toUpperCase()}</span>
                  <span className="st">{l.step}</span>
                  <span className="msg">{l.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
