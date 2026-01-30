// src/Components/Deliverability.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./Deliverability.css";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// ✅ NEW: history component
import DeliverabilityHistory from "./DeliverabilityHistory";

// ✅ Provider logos
import logoSeznam from "../assets/provider-logos/Seznam.png";
import logoYahoo from "../assets/provider-logos/yahoo.png";
import logoGoogleBiz from "../assets/provider-logos/google business.png";
import logoYandex from "../assets/provider-logos/yandex.png";
import logoGmail from "../assets/provider-logos/gmail.png";
import logoGmx from "../assets/provider-logos/GMX.png";
import logoAol from "../assets/provider-logos/Aol.png";
import logoZoho from "../assets/provider-logos/Zoho-logo.png";
import { useCredits } from "../credits/CreditsContext";
import deliverabilityLogo from "../assets/illustrator/deliverability.png";



const PROVIDER_LOGOS = {
  gmail: logoGmail,
  google_business: logoGoogleBiz,
  yandex: logoYandex,
  seznam: logoSeznam,
  zoho: logoZoho,
  yahoo: logoYahoo,
  aol: logoAol,
  gmx: logoGmx,
};

/** ---------- username helper (same as Dashboard) ---------- */
function getUsername() {
  const u0 = (localStorage.getItem("loggedInUser") || "").trim();
  if (u0) return u0;

  const u1 =
    (
      localStorage.getItem("username") ||
      localStorage.getItem("user") ||
      ""
    )?.trim() || "";
  if (u1) return u1;

  try {
    const u2 = JSON.parse(localStorage.getItem("auth") || "{}")?.username;
    if (u2) return String(u2).trim();
  } catch {}
  return "";
}

/** ---------- API base ---------- */
function apiBase() {
  const env = process.env.REACT_APP_API_BASE;
  if (env) return env.replace(/\/+$/, "") + "/api";
  return `${window.location.origin}/api`;
}

/** ✅ WS base resolver */
function wsBase() {
  const env = process.env.REACT_APP_WS_URL;
  if (env) return env.replace(/\/+$/, "");

  const api = apiBase(); // ex: http://localhost:5000/api
  const httpOrigin = api.replace(/\/api\/?$/, ""); // -> http://localhost:5000

  const isHttps = httpOrigin.startsWith("https://");
  const wsOrigin = httpOrigin.replace(
    isHttps ? "https://" : "http://",
    isHttps ? "wss://" : "ws://"
  );

  return wsOrigin.replace(/\/+$/, "");
}

function baseHeaders(username) {
  const authB64 =
    process.env.REACT_APP_BULK_AUTH_B64 || process.env.REACT_APP_BASIC_AUTH_B64;
  const h = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (username) h["X-User"] = username;
  if (authB64) h["Authorization"] = `Basic ${authB64}`;
  return h;
}

const MIN_POLL_MS = 5000;
const MAX_POLL_MS = 120000;
const DELIV_CREDITS_PER_MAILBOX = 1;

const PROVIDER_OPTIONS = [
  { key: "gmail", label: "Gmail" },
  { key: "google_business", label: "Google Business" },
  { key: "yandex", label: "Yandex" },
  { key: "seznam", label: "Seznam" },
  { key: "zoho", label: "Zoho" },
  { key: "yahoo", label: "Yahoo" },
  { key: "aol", label: "AOL" },
  { key: "gmx", label: "GMX" },
];

const DEFAULT_SELECTED_PROVIDERS = [
  "gmail",
  "google_business",
  "yandex",
  "seznam",
  "zoho",
  "yahoo",
  "aol",
  "gmx",
];

/** ---------- small inline icons ---------- */
function IconCopy({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 1H6a2 2 0 0 0-2 2v10h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"
      />
    </svg>
  );
}

function IconDownload({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a1 1 0 0 1 1 1v9.6l3.3-3.3 1.4 1.4-5.7 5.7-5.7-5.7 1.4-1.4 3.3 3.3V4a1 1 0 0 1 1-1zM5 19a1 1 0 0 1 1-1h12a1 1 0 0 1 0 2H6a1 1 0 0 1-1-1z"
      />
    </svg>
  );
}

function EmptyIllustration() {
  return (
    <div className="deliv-empty">
      <img
        src={deliverabilityLogo}
        alt="Deliverability"
        className="deliv-emptyLogo"
        loading="lazy"
      />
      <div className="deliv-empty-title">Nothing here yet!</div>
      <div className="deliv-empty-sub">
        Create a deliverability test to see results here
      </div>
    </div>
  );
}


/** ---------- statuses ---------- */
function normalizeMailboxStatus(s) {
  if (!s) return "pending";
  const v = String(s).toLowerCase();
  if (v === "not_received") return "not_received";
  return v;
}

function statusLabelForMailbox(s) {
  const v = normalizeMailboxStatus(s);
  if (v === "inbox") return "Inbox";
  if (v === "spam") return "Spam";
  if (v === "error") return "Error";
  if (v === "not_received") return "Not Received Yet";
  return "In Progress";
}

function statusDotClassForMailbox(s) {
  const v = normalizeMailboxStatus(s);
  if (v === "inbox") return "dot-inbox";
  if (v === "spam") return "dot-spam";
  if (v === "error") return "dot-error";
  if (v === "not_received") return "dot-muted";
  return "dot-progress";
}

function testStatusLabel(s) {
  const v = String(s || "").toUpperCase();
  if (v === "COMPLETED") return "Completed";
  if (v === "ACTIVE") return "In Progress";
  if (v === "NEW") return "New";
  return s || "In Progress";
}

function testStatusChipColor(s) {
  const v = String(s || "").toUpperCase();
  if (v === "COMPLETED") return "success";
  if (v === "ACTIVE") return "warning";
  return "default";
}

/** ✅ effective test status */
function effectiveTestStatus(test) {
  const mailboxes = Array.isArray(test?.mailboxes) ? test.mailboxes : [];

  // ✅ if test is older than 48h, allow COMPLETED
  const createdAt = test?.createdAt ? new Date(test.createdAt).getTime() : null;
  const ageMs = createdAt ? Date.now() - createdAt : 0;
  const MS_48H = 48 * 60 * 60 * 1000;

  if (ageMs >= MS_48H) return "COMPLETED";

  const anyWaiting = mailboxes.some((m) => {
    const st = normalizeMailboxStatus(m?.status);
    return st === "pending" || st === "not_received";
  });

  if (anyWaiting) return "ACTIVE";
  return String(test?.status || "ACTIVE").toUpperCase();
}

function effectiveTestStatusLabel(test) {
  return testStatusLabel(effectiveTestStatus(test));
}

function effectiveTestChipColor(test) {
  return testStatusChipColor(effectiveTestStatus(test));
}

function donutBackground({ inbox = 0, spam = 0, providers = 0 }) {
  const total = Math.max(1, providers);
  const a = Math.round((inbox / total) * 360);
  const b = Math.round((spam / total) * 360);
  const inboxEnd = a;
  const spamEnd = a + b;

  return `conic-gradient(
    #16a34a 0deg ${inboxEnd}deg,
    #ef4444 ${inboxEnd}deg ${spamEnd}deg,
    #e5e7eb ${spamEnd}deg 360deg
  )`;
}

export default function Deliverability() {
  const username = getUsername();
    const { refreshCredits } = useCredits();

  // avoids timing issues (backend writes credits, then you fetch)
  const creditsTimerRef = useRef(null);

  const refreshCreditsSafe = () => {
    try { refreshCredits?.(); } catch {}

    // second refresh after a short delay to handle DB latency
    if (creditsTimerRef.current) clearTimeout(creditsTimerRef.current);
    creditsTimerRef.current = setTimeout(() => {
      try { refreshCredits?.(); } catch {}
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (creditsTimerRef.current) clearTimeout(creditsTimerRef.current);
    };
  }, []);


  // ✅ Tabs stay here (like Single/Bulk)
  const [activeTab, setActiveTab] = useState("create"); // create | history

  // ✅ Test flow stays here
  const [flowStep, setFlowStep] = useState("create"); // create | send
  const [draftTest, setDraftTest] = useState(null);
  const [reportTest, setReportTest] = useState(null);

  // create form
  const [testName, setTestName] = useState("");
  const [selectedProviders, setSelectedProviders] = useState(
    DEFAULT_SELECTED_PROVIDERS
  );
  const [creating, setCreating] = useState(false);

  // send step
  const [emailsText, setEmailsText] = useState("");
  const [subject, setSubject] = useState("");
  const [sentConfirmed, setSentConfirmed] = useState(false);

  // UI banners
  const [copyMessage, setCopyMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkStartedMsg, setCheckStartedMsg] = useState("");
  const [lastRunRequestedAt, setLastRunRequestedAt] = useState(null);
  const [mobileView, setMobileView] = useState("left");

  // history data (data stays here; UI moves to DeliverabilityHistory.js)
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);

  // global error
  const [error, setError] = useState("");

  // polling refs
  const historyDelayRef = useRef(MIN_POLL_MS);
  const historyCancelledRef = useRef(false);

  const reportDelayRef = useRef(MIN_POLL_MS);
  const reportCancelledRef = useRef(false);

  const providerLabelMap = useMemo(
    () => new Map(PROVIDER_OPTIONS.map((p) => [p.key, p.label])),
    []
  );

  const selectedMailboxCount = selectedProviders.length;
  const estimatedCreditsRequired =
    selectedMailboxCount * DELIV_CREDITS_PER_MAILBOX;

  /** ---------- helpers ---------- */
  const providerBadge = (key) => {
    const label = providerLabelMap.get(key) || key;
    const src = PROVIDER_LOGOS[key];

    const letter = String(label || "?")
      .trim()
      .charAt(0)
      .toUpperCase();

    return (
      <div className="prov-badge">
        {src ? (
          <img
            className="prov-logo"
            src={src}
            alt={`${label} logo`}
            loading="lazy"
          />
        ) : (
          letter
        )}
      </div>
    );
  };

  const toggleProvider = (key) => {
    setSelectedProviders((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const creditsUtilizedFor = (t) => {
    const count =
      t?.totalMailboxes ??
      (Array.isArray(t?.mailboxes) ? t.mailboxes.length : 0);
    return count * DELIV_CREDITS_PER_MAILBOX;
  };

  /** ---------- API fetchers ---------- */
  const fetchHistoryOnce = async () => {
    const uname = (username || "").trim();
    if (!uname) return;

    try {
      const url = `${apiBase()}/deliverability/history`;
      const res = await axios.get(url, {
        params: { username: uname },
        headers: baseHeaders(uname),
      });

      const list = Array.isArray(res?.data?.tests) ? res.data.tests : [];
      setTests(list);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load deliverability tests."
      );
    }
  };

  const fetchTestById = async (testId) => {
    if (!testId || !username) return null;
    try {
      const url = `${apiBase()}/deliverability/tests/${testId}`;
      const res = await axios.get(url, {
        params: { username },
        headers: baseHeaders(username),
      });

      const t = res?.data?.test || null;
      const counts = res?.data?.counts || null;

      if (!t) return null;

      return { ...t, counts: counts || t.counts || {} };
    } catch {
      return null;
    }
  };

  /** merge fresh test into state (history + report) */
  const mergeTestIntoState = (freshTest) => {
    if (!freshTest?._id) return;

    setTests((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const idx = list.findIndex(
        (x) => String(x?._id) === String(freshTest._id)
      );
      if (idx === -1) return [freshTest, ...list];
      const copy = [...list];
      copy[idx] = { ...copy[idx], ...freshTest };
      return copy;
    });

    setReportTest((prev) => {
      if (!prev?._id) return prev;
      if (String(prev._id) !== String(freshTest._id)) return prev;
      return { ...prev, ...freshTest };
    });
  };

  /** ---------- initial history load ---------- */
  useEffect(() => {
    if (!username) return;
    setLoadingTests(true);
    (async () => {
      await fetchHistoryOnce();
      setLoadingTests(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  /** ✅ WebSocket realtime updates */
  const wsRef = useRef(null);
  const wsRetryRef = useRef(null);
  const wsRetriesCountRef = useRef(0);

  useEffect(() => {
    const uname = (username || "").trim();
    if (!uname) return;

    let closedByCleanup = false;

    const connect = () => {
      try {
        const url = `${wsBase()}?user=${encodeURIComponent(uname)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          wsRetriesCountRef.current = 0;
          try {
            ws.send(JSON.stringify({ type: "hello", username: uname }));
          } catch {}
        };

        ws.onmessage = async (evt) => {
          let data = null;
          try {
            data = JSON.parse(evt.data);
          } catch {
            return;
          }
          if (data?.type !== "deliverability:update") return;

          const testId = data?.testId || data?._id;

          // Fast path: mailbox_update patch
          if (data?.event === "mailbox_update" && testId && data?.mailbox) {
            const mb = data.mailbox;

            setTests((prev) =>
              (prev || []).map((t) => {
                if (String(t._id) !== String(testId)) return t;

                const mailboxes = Array.isArray(t.mailboxes)
                  ? [...t.mailboxes]
                  : [];
                const idx = mailboxes.findIndex((x) => x.email === mb.email);
                if (idx >= 0) mailboxes[idx] = { ...mailboxes[idx], ...mb };
                else mailboxes.push(mb);

                // recompute counts quickly on frontend
                const counts = { ...(t.counts || {}) };
                let inbox = 0,
                  spam = 0;
                mailboxes.forEach((m) => {
                  const st = normalizeMailboxStatus(m.status);
                  if (st === "inbox") inbox++;
                  if (st === "spam") spam++;
                });

                return {
                  ...t,
                  mailboxes,
                  updatedAt: data.updatedAt || new Date().toISOString(),
                  status: data.status || t.status,
                  counts: { ...counts, inbox, spam },
                };
              })
            );

            return;
          }

          const testObj = data?.test || null;
          if (testObj?._id) {
            mergeTestIntoState(testObj);
            return;
          }

          if (testId) {
            const fresh = await fetchTestById(testId);
            if (fresh) mergeTestIntoState(fresh);
          }
        };

        ws.onclose = () => {
          if (closedByCleanup) return;

          wsRetriesCountRef.current += 1;
          const wait = Math.min(2000 * wsRetriesCountRef.current, 20000);

          if (wsRetryRef.current) clearTimeout(wsRetryRef.current);
          wsRetryRef.current = setTimeout(connect, wait);
        };
      } catch {
        wsRetryRef.current = setTimeout(connect, 4000);
      }
    };

    connect();

    return () => {
      closedByCleanup = true;
      if (wsRetryRef.current) clearTimeout(wsRetryRef.current);
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  /** ---------- polling: history ---------- */
  useEffect(() => {
    historyCancelledRef.current = false;
    if (!username) return;

    const loop = async () => {
      if (historyCancelledRef.current) return;

      if (document.visibilityState !== "visible") {
        setTimeout(loop, MAX_POLL_MS);
        return;
      }

      await fetchHistoryOnce();
      historyDelayRef.current = Math.min(
        historyDelayRef.current * 2,
        MAX_POLL_MS
      );
      setTimeout(loop, historyDelayRef.current);
    };

    setTimeout(loop, MIN_POLL_MS);

    return () => {
      historyCancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  /** ---------- polling: right-side report (ONLY after Continue) ---------- */
  useEffect(() => {
    reportCancelledRef.current = false;

    const reportId = reportTest?._id;
    if (!username || !reportId) return;

    const loop = async () => {
      if (reportCancelledRef.current) return;

      if (document.visibilityState !== "visible") {
        setTimeout(loop, MAX_POLL_MS);
        return;
      }

      const fresh = await fetchTestById(reportId);
      if (fresh) {
        setReportTest(fresh);
        mergeTestIntoState(fresh);
      }

      const mailboxes = Array.isArray(fresh?.mailboxes) ? fresh.mailboxes : [];
      const anyWaiting = mailboxes.some((m) => {
        const st = normalizeMailboxStatus(m.status);
        return st === "pending" || st === "not_received";
      });

      const eff = effectiveTestStatus(fresh);
      if (!anyWaiting && eff === "COMPLETED") return;

      reportDelayRef.current = Math.min(
        reportDelayRef.current * 2,
        MAX_POLL_MS
      );
      setTimeout(loop, reportDelayRef.current);
    };

    reportDelayRef.current = MIN_POLL_MS;
    setTimeout(loop, MIN_POLL_MS);

    return () => {
      reportCancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, reportTest?._id]);

  /** ---------- tab behavior ---------- */
  const goToCreateFresh = () => {
    setError("");
    setCopyMessage("");
    setCheckStartedMsg("");
    setLastRunRequestedAt(null);

    setFlowStep("create");
    setDraftTest(null);
    setReportTest(null);

    setTestName("");
    setSelectedProviders(DEFAULT_SELECTED_PROVIDERS);

    setEmailsText("");
    setSubject("");
    setSentConfirmed(false);
  };

  /** ---------- actions (TEST) ---------- */
  const handleCreateTest = async () => {
    setError("");
    setCopyMessage("");
    setCheckStartedMsg("");
    setLastRunRequestedAt(null);

    if (!username) return setError("User not found. Please log in again.");
    if (!testName.trim()) return setError("Please enter test name.");
    if (selectedProviders.length === 0)
      return setError("Please select at least one email provider.");

    try {
      setCreating(true);
      const url = `${apiBase()}/deliverability/tests`;

      const res = await axios.post(
        url,
        { name: testName.trim(), providers: selectedProviders, username },
        { headers: baseHeaders(username) }
      );

      const apiTest = res?.data?.test || null;
      const addresses = Array.isArray(res?.data?.addresses)
        ? res.data.addresses
        : [];

      if (!apiTest) return setError("Server did not return a test object.");

      setDraftTest(apiTest);
      setEmailsText(addresses.join("\n"));
      setSubject("");
      setSentConfirmed(false);
      setFlowStep("send");
      setMobileView("left");

      // IMPORTANT: right side stays empty until Continue
      setReportTest(null);

      await fetchHistoryOnce();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === "INSUFFICIENT_CREDITS") {
        const required = data.requiredCredits ?? estimatedCreditsRequired;
        const available = data.availableCredits ?? 0;
        setError(
          `You have insufficient credit balance for this test. Required: ${required}, Available: ${available}.`
        );
      } else {
        setError(
          data?.message ||
            err?.message ||
            "Failed to create deliverability test."
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopyEmails = async () => {
    try {
      await navigator.clipboard.writeText(emailsText || "");
      setCopyMessage("Email addresses copied!");
      setTimeout(() => setCopyMessage(""), 1600);
    } catch {
      setCopyMessage("Unable to copy. Please copy manually.");
      setTimeout(() => setCopyMessage(""), 2200);
    }
  };

  const handleContinue = async () => {
    setError("");
    setCheckStartedMsg("");

    if (!draftTest?._id) return setError("No test found. Please create again.");
    const finalSubject = (subject || "").trim();
    if (!finalSubject) return setError("Please enter test email subject.");
    if (!sentConfirmed)
      return setError("Please confirm you have sent the test emails.");

    setChecking(true);
    try {
      const url = `${apiBase()}/deliverability/tests/${
        draftTest._id
      }/run-check`;
      await axios.post(
        url,
        { subject: finalSubject, username },
        { headers: baseHeaders(username) }
      );
      refreshCreditsSafe(); 


      const now = new Date();
      setLastRunRequestedAt(now);
      setCheckStartedMsg(
        "Check started. Results will update automatically as providers are checked."
      );

      const fresh = await fetchTestById(draftTest._id);
      if (fresh) {
        setReportTest(fresh);
        setMobileView("right");
        mergeTestIntoState(fresh);
      }

      await fetchHistoryOnce();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to run deliverability check."
      );
    } finally {
      setChecking(false);
    }
  };

  const handleBackToCreate = async () => {
    setMobileView("left");
    try {
      if (draftTest?._id && !reportTest?._id) {
        const url = `${apiBase()}/deliverability/tests/${draftTest._id}/cancel`;
        await axios.delete(url, {
          params: { username },
          headers: baseHeaders(username),
        });
      }
    } catch {}

    goToCreateFresh();
    await fetchHistoryOnce();
  };

  // Right side table rows (test report panel)
  const reportMailboxRows = useMemo(() => {
    const mbs = Array.isArray(reportTest?.mailboxes)
      ? reportTest.mailboxes
      : [];
    return mbs.map((m) => ({
      providerKey: m.provider,
      providerLabel: providerLabelMap.get(m.provider) || m.provider,
      email: m.email,
      statusLabel: statusLabelForMailbox(m.status),
      dotClass: statusDotClassForMailbox(m.status),
      folder: m.folder || "-",
      lastChecked: m.lastCheckedAt
        ? new Date(m.lastCheckedAt).toLocaleString()
        : "-",
      error: m.error || "-",
    }));
  }, [reportTest, providerLabelMap]);

  /** ---------- render ---------- */
  return (
    <div className="deliv-page">
      <div className="deliv-topbar">
        <div className="deliv-title">Deliverability</div>

        <div className="deliv-tabs">
          <button
            className={`deliv-tab-btn ${
              activeTab === "create" ? "active" : ""
            }`}
            onClick={() => setActiveTab("create")}
            type="button"
          >
            Test
          </button>

          <button
            className={`deliv-tab-btn ${
              activeTab === "history" ? "active" : ""
            }`}
            onClick={() => setActiveTab("history")}
            type="button"
          >
            History
          </button>
        </div>
      </div>

      {error ? <div className="deliv-error">{error}</div> : null}

      {/* ✅ TEST TAB (unchanged UI) */}
      {activeTab === "create" && (
        <div className={`deliv-shell ${mobileView === "right" ? "deliv--showRight" : "deliv--showLeft"}`}>
          <div className="deliv-shell-inner">
            {/* LEFT */}
            <div className="deliv-left">
              {flowStep === "create" && (
                <div className="deliv-left-card">
                  <div className="deliv-left-heading">
                    Create a new deliverability test
                  </div>

                  <div className="deliv-field">
                    <div className="deliv-label">Enter Test Name</div>
                    <input
                      className="deliv-input"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      placeholder=""
                    />
                  </div>

                  <div className="deliv-field providers">
                    <div className="deliv-label">Select Email Providers</div>

                    <div className="deliv-provider-list">
                      {PROVIDER_OPTIONS.map((p) => {
                        const checked = selectedProviders.includes(p.key);
                        return (
                          <button
                            key={p.key}
                            type="button"
                            className={`deliv-provider-item ${
                              checked ? "checked" : ""
                            }`}
                            onClick={() => toggleProvider(p.key)}
                          >
                            <div className="prov-left">
                              {providerBadge(p.key)}
                              <div className="prov-name">{p.label}</div>
                            </div>
                            <div className="prov-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProvider(p.key)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="prov-check-ui" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="deliv-create-footer">
                    <button
                      className="deliv-primary"
                      type="button"
                      onClick={handleCreateTest}
                      disabled={creating}
                    >
                      {creating ? "Creating..." : "Create Test"}
                    </button>

                    <div className="deliv-credits">
                      Total Credits: <b>{estimatedCreditsRequired}</b>
                    </div>
                  </div>
                </div>
              )}

              {flowStep === "send" && (
                <div className="deliv-left-card">
                  <div className="deliv-left-heading-row">
                    <button
                      type="button"
                      className="deliv-back-icon"
                      onClick={handleBackToCreate}
                      aria-label="Back"
                      title="Back"
                    >
                      <ArrowBackIcon fontSize="small" />
                    </button>

                    <div className="deliv-left-heading">
                      Send your test email
                    </div>
                  </div>

                  <div className="deliv-instructions">
                    Please send test email to these addresses within{" "}
                    <b>48 hours</b>
                  </div>

                  <div className="deliv-field providers">
                    <div className="deliv-label">Seed Email Addresses</div>
                    <textarea
                      className="deliv-textarea deliv-scroll"
                      value={emailsText}
                      readOnly
                    />

                    <button
                      type="button"
                      className="deliv-copy-link"
                      onClick={handleCopyEmails}
                    >
                      Copy Email Addresses <IconCopy />
                    </button>

                    {copyMessage ? (
                      <div className="deliv-copy-msg">{copyMessage}</div>
                    ) : null}
                  </div>

                  <div className="deliv-field">
                    <div className="deliv-label">Enter Test Email Subject</div>
                    <input
                      className="deliv-input"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder=""
                    />

                    <div className="deliv-small-note">
                      Use same tool &amp; subject for all emails
                    </div>

                    <label className="deliv-check">
                      <input
                        type="checkbox"
                        checked={sentConfirmed}
                        onChange={(e) => setSentConfirmed(e.target.checked)}
                      />
                      <span className="deliv-check-ui" />
                      I’ve sent the test emails to all seed addresses
                    </label>
                  </div>

                  <div className="deliv-create-footer">
                    <button
                      className="deliv-primary"
                      type="button"
                      onClick={handleContinue}
                      disabled={checking || !!reportTest?._id}
                    >
                      {!!reportTest?._id
                        ? "Check Started"
                        : checking
                        ? "Starting check..."
                        : "Continue"}
                    </button>

                    <div className="deliv-credits">
                      Total Credits: <b>{creditsUtilizedFor(draftTest)}</b>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="deliv-right">
              {!reportTest?._id ? (
                <div className="deliv-right-card">
                  <EmptyIllustration />
                </div>
              ) : (
                <div className="deliv-right-card deliv-right-card--tableOnly">
                  <div className="deliv-right-toprow">
                    <button
                      type="button"
                      className="deliv-back-icon"
                      onClick={() => setMobileView("left")}
                      aria-label="Back"
                      title="Back"
                    >
                      <ArrowBackIcon fontSize="small" />
                    </button>
                    <div className="deliv-right-heading">Back</div>
                  </div>

                  <div className="deliv-table deliv-scroll deliv-table--full">
                    <div className="deliv-table-head">
                      <div>Provider</div>
                      <div>Status</div>
                      <div>Folder</div>
                      <div>Last Checked</div>
                      <div>Error</div>
                    </div>

                    {reportMailboxRows.map((r, idx) => (
                      <div
                        className="deliv-table-row"
                        key={`${r.email}-${idx}`}
                      >
                        <div className="cell-provider">
                          <div className="prov-mini">
                            {providerBadge(r.providerKey)}
                          </div>
                          <div className="prov-mini-name">
                            {r.providerLabel}
                          </div>
                        </div>

                        <div className="cell-status">
                          <span className={`dot ${r.dotClass}`} />
                          <span className="status-text">{r.statusLabel}</span>
                        </div>

                        <div className="cell-muted">{r.folder}</div>
                        <div className="cell-muted">{r.lastChecked}</div>
                        <div className="cell-error">{r.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ HISTORY TAB (render only) */}
      {activeTab === "history" && (
        <DeliverabilityHistory
          username={username}
          tests={tests}
          setTests={setTests}
          loadingTests={loadingTests}
          setError={setError}
          fetchHistoryOnce={fetchHistoryOnce}
          fetchTestById={fetchTestById}
          mergeTestIntoState={mergeTestIntoState}
          baseHeaders={baseHeaders}
          apiBase={apiBase}
          providerLabelMap={providerLabelMap}
          providerBadge={providerBadge}
          IconDownload={IconDownload}
          donutBackground={donutBackground}
          creditsUtilizedFor={creditsUtilizedFor}
          normalizeMailboxStatus={normalizeMailboxStatus}
          statusLabelForMailbox={statusLabelForMailbox}
          statusDotClassForMailbox={statusDotClassForMailbox}
          effectiveTestStatus={effectiveTestStatus}
          effectiveTestStatusLabel={effectiveTestStatusLabel}
          effectiveTestChipColor={effectiveTestChipColor}
        />
      )}
    </div>
  );
}
