// import React, { useState, useEffect, useRef } from "react";
// import Confetti from "react-confetti";
// import { toast } from "react-toastify";
// import { v4 as uuidv4 } from "uuid";
// import "./SingleValidator.css";
// import SingleValidationHistory from "./SingleValidationHistory";

// /** ───────────────── Config ───────────────── */
// const DEFAULT_API_PORT = 5000;
// const STABILIZE_WINDOW_MS = 25000; // background budget
// const STABILIZE_EVERY_MS = 2000; // poll cadence
// const RECONNECT_WS_MS = 2000; // WS backoff
// const HINT_1_MS = 6000; // when to show “taking longer” hint
// const HINT_2_MS = 14000; // when to show “extra checks” hint

// // Set to true to re-enable logs, badges, etc.
// const SHOW_DEBUG = false;

// /** ───────────────── Endpoint resolution ───────────────── */
// const isBrowser = typeof window !== "undefined";
// const loc = isBrowser
//   ? window.location
//   : { protocol: "http:", hostname: "localhost", host: "localhost" };
// const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(loc.hostname || "");
// const envApi =
//   (typeof process !== "undefined" &&
//     process.env &&
//     process.env.REACT_APP_API_BASE) ||
//   "";
// const envWs =
//   (typeof process !== "undefined" &&
//     process.env &&
//     process.env.REACT_APP_WS_URL) ||
//   "";

// const wsProto = loc.protocol === "https:" ? "wss:" : "ws:";

// const API_BASE =
//   envApi ||
//   (isLocalHost
//     ? `http://localhost:${DEFAULT_API_PORT}`
//     : `${loc.protocol}//${loc.host}`);

// const WS_URL =
//   envWs ||
//   (isLocalHost
//     ? `${wsProto}//localhost:${DEFAULT_API_PORT}/`
//     : `${wsProto}//${loc.host}/`);

// console.log("[SingleValidator] API_BASE =", API_BASE, "WS_URL =", WS_URL);

// /** ───────────────── Helpers ───────────────── */
// const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// const categoryFromStatus = (status = "") => {
//   const s = String(status || "");
//   if (/\bInvalid\b/i.test(s)) return "invalid";
//   if (/\bRisky\b/i.test(s)) return "risky";
//   if (/\bValid\b/i.test(s)) return "valid";
//   return "unknown";
// };

// const isDefinitive = (status = "") => {
//   const cat = categoryFromStatus(status);
//   return cat === "valid" || cat === "invalid";
// };

// /** ───────────────── Inline overlay styles (no CSS changes needed) ───────────────── */
// const overlayStyle = {
//   position: "fixed",
//   inset: 0,
//   background: "rgba(10,12,16,.55)",
//   backdropFilter: "blur(4px)",
//   display: "grid",
//   placeItems: "center",
//   zIndex: 9999,
// };
// const overlayCardStyle = {
//   background: "var(--card-bg, #fff)",
//   color: "var(--fg, #111)",
//   padding: "24px 28px",
//   borderRadius: 16,
//   minWidth: 280,
//   maxWidth: "90vw",
//   boxShadow: "0 8px 40px rgba(0,0,0,.25)",
//   textAlign: "center",
// };
// const spinnerStyle = {
//   width: 42,
//   height: 42,
//   border: "4px solid rgba(0,0,0,.15)",
//   borderTopColor: "currentColor",
//   borderRadius: "50%",
//   margin: "0 auto 12px",
//   animation: "ts-rotate 0.9s linear infinite",
// };

// /** Inject minimal keyframes once */
// if (
//   typeof document !== "undefined" &&
//   !document.getElementById("ts-rotate-style")
// ) {
//   const style = document.createElement("style");
//   style.id = "ts-rotate-style";
//   style.textContent = `@keyframes ts-rotate { to { transform: rotate(360deg); } }`;
//   document.head.appendChild(style);
// }

// const SingleValidator = () => {
//   const [email, setEmail] = useState("");
//   const [statusUpdate, setStatusUpdate] = useState(null);

//   const [loading, setLoading] = useState(false);
//   const [statusIcon, setStatusIcon] = useState(null);
//   const [statusMessage, setStatusMessage] = useState("");
//   const [statusColor, setStatusColor] = useState("#27ae60");
//   const [showConfetti, setShowConfetti] = useState(false);

//   // optional: surface model confidence/reason (final only)
//   const [confidence, setConfidence] = useState(null);
//   const [reason, setReason] = useState("");

//   // “friendly” loader hints while we work
//   const [waitingHint, setWaitingHint] = useState("");

//   // debug-only states (hidden unless SHOW_DEBUG)
//   const [logs, setLogs] = useState([]);
//   const [probeUsed, setProbeUsed] = useState("");
//   const [mxHost, setMxHost] = useState("");

//   const sessionIdRef = useRef(uuidv4());
//   const wsRef = useRef(null);
//   const wsReconnectTimer = useRef(null);

//   const lastEmailRef = useRef("");
//   const pollTimerRef = useRef(null);
//   const pollDeadlineRef = useRef(0);
//   const pageVisibleRef = useRef(true);
//   const hintTimersRef = useRef([]);
//   const idKeyRef = useRef(null); // ← NEW: one UUID per click

//   const [historyReloadTrigger, setHistoryReloadTrigger] = useState(0); // <-- new

//   /** ───────────────── Username helper ───────────────── */
//   // current logged-in user (saved by your Login flow). Safe if empty.
//   const getUser = () =>
//     typeof localStorage !== "undefined"
//       ? (localStorage.getItem("loggedInUser") || "").trim()
//       : "";

//   /** ───────────────── Friendly loader hints ───────────────── */
//   const startHintTimers = () => {
//     stopHintTimers();
//     setWaitingHint("");
//     hintTimersRef.current = [
//       setTimeout(
//         () =>
//           setWaitingHint("Still verifying — some mail servers respond slowly."),
//         HINT_1_MS
//       ),
//       setTimeout(
//         () => setWaitingHint("Running extra checks to be sure."),
//         HINT_2_MS
//       ),
//     ];
//   };
//   const stopHintTimers = () => {
//     hintTimersRef.current.forEach((t) => clearTimeout(t));
//     hintTimersRef.current = [];
//     setWaitingHint("");
//   };

//   /** ───────────────── Stabilizer ───────────────── */
//   const stopStabilizer = () => {
//     if (pollTimerRef.current) {
//       clearInterval(pollTimerRef.current);
//       pollTimerRef.current = null;
//     }
//     pollDeadlineRef.current = 0;
//   };

//   const finalize = (data) => {
//     const final = {
//       email: lastEmailRef.current,
//       status: data.status || "❔ Unknown",
//       timestamp: data.timestamp || null,
//       domain: data.domain || "N/A",
//       domainProvider: data.provider || data.domainProvider || "N/A",
//       isDisposable: !!data.isDisposable,
//       isFree: !!data.isFree,
//       isRoleBased: !!data.isRoleBased,
//       score: typeof data.score === "number" ? data.score : 0, // was 50 → align with backend default 0
//     };

//     if (typeof data.confidence === "number") setConfidence(data.confidence);

//     setStatusUpdate(final);
//     renderFromResult({
//       status: final.status,
//       message: data.message, // ← show server message
//       reason: data.reason, // ← and reason label
//     });

//     setHistoryReloadTrigger((prev) => prev + 1);
//     setLoading(false);
//     stopHintTimers();
//     stopStabilizer();
//   };

//   const startStabilizer = () => {
//     stopStabilizer();
//     pollDeadlineRef.current = Date.now() + STABILIZE_WINDOW_MS;

//     // keep overlay visible; DO NOT surface interim statuses
//     pollTimerRef.current = setInterval(async () => {
//       if (!pageVisibleRef.current) return;

//       if (Date.now() > pollDeadlineRef.current) {
//         // budget consumed — settle on the latest snapshot (best effort)
//         try {
//           const res = await fetch(`${API_BASE}/api/single/verify-smart`, {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               "ngrok-skip-browser-warning": "true",
//               "X-Idempotency-Key": idKeyRef.current,
//             },
//             body: JSON.stringify({
//               email: lastEmailRef.current,
//               sessionId: sessionIdRef.current,
//               username: getUser(),
//               idempotencyKey: idKeyRef.current,
//             }),
//           });
//           const latest = await res.json();
//           finalize(latest);
//         } catch (e) {
//           finalize({ status: "❔ Unknown" });
//         }
//         return;
//       }

//       try {
//         const res = await fetch(`${API_BASE}/api/single/verify-smart`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             "X-Idempotency-Key": idKeyRef.current,
//             "ngrok-skip-browser-warning": "true",
//           },
//           body: JSON.stringify({
//             email: lastEmailRef.current,
//             sessionId: sessionIdRef.current,
//             username: getUser(),
//             idempotencyKey: idKeyRef.current,
//           }),
//         });
//         const data = await res.json();

//         // optional debug badges (not shown unless SHOW_DEBUG)
//         if (SHOW_DEBUG) {
//           if (data?.probe_sender && !probeUsed) setProbeUsed(data.probe_sender);
//           if (data?.mx_host && !mxHost) setMxHost(data.mx_host);
//         }

//         if (isDefinitive(String(data.status || ""))) {
//           finalize(data);
//         }
//         // else: keep waiting; do not update the UI with “risky/unknown”
//       } catch {
//         /* ignore and keep polling until deadline */
//       }
//     }, STABILIZE_EVERY_MS);
//   };

//   /** ───────────────── WebSocket (only to catch *final* early) ───────────────── */
//   const openWebSocket = () => {
//     try {
//       // const ws = new WebSocket(WS_URL);
//       const user = encodeURIComponent(getUser());
//       const sid = encodeURIComponent(sessionIdRef.current);
//       const ws = new WebSocket(`${WS_URL}?sessionId=${sid}&user=${user}`);

//       wsRef.current = ws;

//       ws.onopen = () => {
//         try {
//           ws.send(
//             JSON.stringify({
//               sessionId: sessionIdRef.current,
//               username: getUser(),
//             })
//           );
//         } catch {}
//       };

//       ws.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data);

//           if (SHOW_DEBUG && data?.type === "log") {
//             if (!lastEmailRef.current || data.email === lastEmailRef.current) {
//               setLogs((prev) => [...prev, data]);
//               if (data.step === "probe") {
//                 const metaSender =
//                   data?.meta?.sender ||
//                   (typeof data.message === "string"
//                     ? (data.message.match(/Using probe sender:\s*([^\s]+)/i) ||
//                         [])[1]
//                     : "");
//                 if (metaSender) setProbeUsed(metaSender);
//               }
//               if (data.step === "mx_try") {
//                 const metaMx =
//                   data?.meta?.mx ||
//                   (typeof data.message === "string"
//                     ? (data.message.match(/Probing (?:mx|host):\s*([^\s]+)/i) ||
//                         [])[1]
//                     : "");
//                 if (metaMx) setMxHost(metaMx);
//               }
//             }
//             return;
//           }

//           if (data?.type === "status" && (data.email || "").toLowerCase() === (lastEmailRef.current || "").toLowerCase()) {
//             // Only accept definitive results via WS
//             if (isDefinitive(String(data.status || ""))) {
//               finalize(data);
//             }
//           }
//         } catch {}
//       };

//       ws.onclose = () => {
//         wsRef.current = null;
//         if (!wsReconnectTimer.current) {
//           wsReconnectTimer.current = setTimeout(() => {
//             wsReconnectTimer.current = null;
//             openWebSocket();
//           }, RECONNECT_WS_MS);
//         }
//       };
//     } catch {
//     }
//   };

//   useEffect(() => {
//     openWebSocket();
//     const onVis = () => {
//       pageVisibleRef.current = !document.hidden;
//     };
//     document.addEventListener("visibilitychange", onVis);
//     return () => {
//       document.removeEventListener("visibilitychange", onVis);
//       if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current);
//       try {
//         wsRef.current && wsRef.current.close();
//       } catch {}
//       stopStabilizer();
//       stopHintTimers();
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   /** ───────────────── Final status rendering ───────────────── */

//   function renderFromResult({ status, message, reason } = {}) {
//     const cat = categoryFromStatus(status);

//     const fallbacks = {
//       valid: "You can safely send emails to this address.",
//       invalid:
//         "You should not send emails to this address — the mailbox does not exist.",
//       risky: "This address looks risky to send to.",
//       unknown: "We couldn’t get a decisive answer from the server.",
//     };

//     const icons = { valid: "✔️", invalid: "❌", risky: "⚠️", unknown: "❔" };
//     const colors = {
//       valid: "#27ae60",
//       invalid: "#e74c3c",
//       risky: "#f1c40f",
//       unknown: "#e67e22",
//     };

//     // pick text from backend first
//     const msg =
//       typeof message === "string" && message.trim() ? message : fallbacks[cat];

//     // toasts + visuals
//     if (cat === "valid") toast.success("✅ Email is valid");
//     if (cat === "invalid") toast.error("❌ Email is invalid");
//     if (cat === "risky") toast.warning("⚠️ Email is risky");
//     if (cat === "unknown") toast.info("❔ Email status is unknown");

//     setStatusIcon(icons[cat]);
//     setStatusColor(colors[cat]);
//     setStatusMessage(msg);
//     setReason(typeof reason === "string" ? reason : "");

//     // 🎉 confetti only for valid
//     if (cat === "valid") {
//       setShowConfetti(true);
//       setTimeout(() => setShowConfetti(false), 5000);
//     }
//   }

//   /** ───────────────── Action ───────────────── */
//   const validateEmail = async () => {
//     const trimmed = (email || "").trim();
//     if (!trimmed) {
//       toast.warn("⚠️ Please enter an email");
//       return;
//     }
//     if (!EMAIL_REGEX.test(trimmed)) {
//       toast.warn("⚠️ That doesn’t look like a valid email shape");
//       return;
//     }

//     // hard reset/cleanup from any prior run
//     stopStabilizer();
//     stopHintTimers();

//     // NEW: generate idempotency key for this click
//     idKeyRef.current = uuidv4();

//     setStatusUpdate(null);
//     setShowConfetti(false);
//     setConfidence(null);
//     setReason("");
//     if (SHOW_DEBUG) {
//       setLogs([]);
//       setProbeUsed("");
//       setMxHost("");
//     }

//     lastEmailRef.current = trimmed;
//     setLoading(true);
//     startHintTimers();

//     // First pass: do not show prelim; only go final if already definitive
//     try {
//       const res = await fetch(`${API_BASE}/api/single/verify-smart`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Idempotency-Key": idKeyRef.current,
//           "ngrok-skip-browser-warning": "true",
//         },
//         body: JSON.stringify({
//           email: trimmed,
//           sessionId: sessionIdRef.current,
//           username: getUser(),
//           idempotencyKey: idKeyRef.current,
//         }),
//       });
//       const prelim = await res.json();

//       // 🔹 If backend says "no credits", stop immediately
//       if (prelim.error) {
//         setLoading(false);
//         stopHintTimers();
//         toast.error(prelim.error); // show alert box
//         return; // 🚫 don't proceed further
//       }

//       if (isDefinitive(String(prelim.status || ""))) {
//         finalize(prelim);
//       } else {
//         // Not decisive — start background stabilization and keep overlay
//         startStabilizer();
//       }
//     } catch (error) {
//       setLoading(false);
//       stopHintTimers();
//       toast.error("❌ Error: " + error.message);
//     }
//   };

//   const onKeyDown = (e) => {
//     if (e.key === "Enter" && !loading) validateEmail();
//   };

//   const buttonLabel = loading ? "Verifying..." : "Verify";

//   return (
//     <>
//       <div className="single-validator-wrapper">
//         <div className="single-validator-content">
//           <h1 className="single-header">Verify Single Email</h1>

//           <div className="input-bar">
//             <input
//               type="email"
//               placeholder="Email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               onKeyDown={onKeyDown}
//               disabled={loading}
//               aria-label="Email address"
//             />
//             <button
//               onClick={validateEmail}
//               disabled={loading}
//               aria-busy={loading}
//             >
//               {loading && <span className="loader" aria-hidden />}
//               <span>{buttonLabel}</span>
//             </button>
//           </div>

//           {/* Final result (only shown after stabilization or a definitive first pass) */}
//           {!loading && statusUpdate && (
//             <div
//               className="validation-summary"
//               role="status"
//               aria-live="polite"
//             >
//               <span className="icon" style={{ color: statusColor }}>
//                 {statusIcon}
//               </span>
//               <div className="info">
//                 <h2>{statusUpdate.email}</h2>
//                 <p>{statusMessage}</p>
//                 {reason && (
//                   <div className="meta-row">
//                     <span className="badge">
//                     Reason:{" "}
//                       <strong>{reason}</strong>
//                     </span>
//                   </div>
//                 )}

//                 {typeof confidence === "number" && (
//                   <div className="meta-row">
//                     <span className="badge">
//                       Confidence:{" "}
//                       <strong>{Math.round(confidence * 100)}%</strong>
//                     </span>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}

//           {statusUpdate && !loading && (
//             <div className="card-grid">
//               <div className="card">
//                 <h4>Domain</h4>
//                 <p>Name</p>
//                 <strong>{statusUpdate.domain}</strong>
//                 <p>Free</p>
//                 <strong>{statusUpdate.isFree ? "yes" : "no"}</strong>
//               </div>
//               <div className="card">
//                 <h4>Account</h4>
//                 <p>Role</p>
//                 <strong>{statusUpdate.isRoleBased ? "yes" : "no"}</strong>
//               </div>
//               <div className="card">
//                 <h4>Provider</h4>
//                 <p>Domain</p>
//                 <strong>{statusUpdate.domainProvider}</strong>
//               </div>
//               <div className="card">
//                 <h4>Score</h4>
//                 <p>Score</p>
//                 <strong>{statusUpdate.score}</strong>
//               </div>
//             </div>
//           )}

//           {/* Debug UI (hidden unless SHOW_DEBUG = true) */}
//           {SHOW_DEBUG && (
//             <>
//               <div className="log-panel">
//                 <div className="log-header">Verification steps</div>
//                 <div className="log-body">
//                   {logs.length === 0 && (
//                     <div className="log-line muted">No logs yet.</div>
//                   )}
//                   {logs.map((l, idx) => (
//                     <div key={idx} className={`log-line ${l.level || "info"}`}>
//                       <span className="log-time">
//                         {new Date(l.at).toLocaleTimeString()}
//                       </span>
//                       {l.step && <span className="log-step">[{l.step}]</span>}
//                       <span className="log-msg">{l.message}</span>
//                       {l._local && (
//                         <span className="log-tag" title="Client-side milestone">
//                           (client)
//                         </span>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div className="meta-row">
//                 {probeUsed && (
//                   <span className="badge">
//                     Probe: <strong>{probeUsed}</strong>
//                   </span>
//                 )}
//                 {mxHost && (
//                   <span className="badge">
//                     MX: <strong>{mxHost}</strong>
//                   </span>
//                 )}
//               </div>
//             </>
//           )}
//         </div>

//         {/* Fullscreen overlay loader */}
//         {loading && (
//           <div
//             style={overlayStyle}
//             role="alert"
//             aria-busy="true"
//             aria-live="polite"
//           >
//             <div style={overlayCardStyle}>
//               <div style={spinnerStyle} aria-hidden />
//               <h3>Verifying email…</h3>
//               <p style={{ opacity: 0.85, marginTop: 6 }}>
//                 {waitingHint || "Talking to the mail server"}
//               </p>
//             </div>
//           </div>
//         )}

//         {showConfetti && <Confetti />}
//       </div>
//       <div>
//         <SingleValidationHistory
//           username={getUser()}
//           reloadTrigger={historyReloadTrigger}
//         />
//       </div>
//     </>
//   );
// };

// export default SingleValidator;

// SingleValidator.jsx
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import "./SingleValidator.css";
import SingleValidationHistory from "./SingleValidationHistory";
import { useCredits } from "../credits/CreditsContext";

// MUI icons for status pills
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import singleLogo from "../assets/illustrator/single.png";

/** ───────────────── Config ───────────────── */
const DEFAULT_API_PORT = 5000;
const STABILIZE_WINDOW_MS = 25000;
const STABILIZE_EVERY_MS = 2000;
const RECONNECT_WS_MS = 2000;
const HINT_1_MS = 6000;
const HINT_2_MS = 14000;

// Set to true to re-enable logs, badges, etc.
const SHOW_DEBUG = false;

const API_BASE = process.env.REACT_APP_API_BASE;
const WS_URL = process.env.REACT_APP_WS_URL;

console.log(
  "[SingleValidator][HARDCODED] API_BASE =",
  API_BASE,
  "WS_URL =",
  WS_URL,
);

/** ───────────────── Helpers ───────────────── */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const categoryFromStatus = (status = "") => {
  const s = String(status || "");
  if (/\bInvalid\b/i.test(s)) return "invalid";
  if (/\bRisky\b/i.test(s)) return "risky";
  if (/\bValid\b/i.test(s)) return "valid";
  return "unknown";
};

const isDefinitive = (status = "") => {
  const cat = categoryFromStatus(status);
  return cat === "valid" || cat === "invalid";
};

/** ───────────────── Spinner keyframes (for small loaders) ───────────────── */
if (
  typeof document !== "undefined" &&
  !document.getElementById("ts-rotate-style")
) {
  const style = document.createElement("style");
  style.id = "ts-rotate-style";
  style.textContent = `
    @keyframes ts-rotate { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

const SingleValidator = () => {
  const [email, setEmail] = useState("");
  const [statusUpdate, setStatusUpdate] = useState(null);

  // multiple in-flight emails (now objects so each email has its own idKey)
  // [{ email, idKey }]
  const [pendingEmails, setPendingEmails] = useState([]);
  const isLoading = pendingEmails.length > 0;

  const [statusMessage, setStatusMessage] = useState("");
  const [statusColor, setStatusColor] = useState("#27ae60");

  // optional: surface model confidence/reason (final only)
  const [confidence, setConfidence] = useState(null);
  const [reason, setReason] = useState("");

  // “friendly” loader hints while we work
  const [waitingHint, setWaitingHint] = useState("");

  // debug-only states
  const [logs, setLogs] = useState([]);
  const [probeUsed, setProbeUsed] = useState("");
  const [mxHost, setMxHost] = useState("");

  // UI layout + session results (Validate tab should ONLY show current session runs)
  const [activeTab, setActiveTab] = useState("validate"); // "validate" | "history"
  const [results, setResults] = useState([]); // session-only results

  const sessionIdRef = useRef(uuidv4());
  const wsRef = useRef(null);
  const wsReconnectTimer = useRef(null);

  // ✅ Credits hook (Option A)
  const { refreshCredits } = useCredits();

  // debounce credits refresh so multiple finalizations don't spam /get-credits
  const creditRefreshTimerRef = useRef(null);

  const scheduleCreditRefresh = () => {
    if (creditRefreshTimerRef.current)
      clearTimeout(creditRefreshTimerRef.current);

    creditRefreshTimerRef.current = setTimeout(() => {
      refreshCredits?.();
    }, 600);
  };

  const pageVisibleRef = useRef(true);
  const hintTimersRef = useRef([]);

  const [historyReloadTrigger, setHistoryReloadTrigger] = useState(0);

  // helps avoid double-adding the exact same run
  const lastFinalKeyRef = useRef(null);

  // ───────────────── per-email stabilizer state ─────────────────
  const pollTimersRef = useRef(new Map()); // emailLower -> intervalId
  const pollDeadlinesRef = useRef(new Map()); // emailLower -> deadlineTs
  const idKeyByEmailRef = useRef(new Map()); // emailLower -> idKey

  /** ───────────────── Username helper ───────────────── */
  const getUser = () =>
    typeof localStorage !== "undefined"
      ? (localStorage.getItem("loggedInUser") || "").trim()
      : "";

  /** ───────────────── Friendly loader hints ───────────────── */
  const startHintTimers = () => {
    stopHintTimers();
    setWaitingHint("");
    hintTimersRef.current = [
      setTimeout(
        () =>
          setWaitingHint("Still verifying — some mail servers respond slowly."),
        HINT_1_MS,
      ),
      setTimeout(
        () => setWaitingHint("Running extra checks to be sure."),
        HINT_2_MS,
      ),
    ];
  };
  const stopHintTimers = () => {
    hintTimersRef.current.forEach((t) => clearTimeout(t));
    hintTimersRef.current = [];
    setWaitingHint("");
  };

  /** ───────────────── Stabilizers (per email) ───────────────── */
  const stopStabilizerFor = (emailAddr) => {
    const key = String(emailAddr || "")
      .trim()
      .toLowerCase();
    if (!key) return;

    const t = pollTimersRef.current.get(key);
    if (t) clearInterval(t);

    pollTimersRef.current.delete(key);
    pollDeadlinesRef.current.delete(key);
  };

  const stopAllStabilizers = () => {
    for (const [, t] of pollTimersRef.current.entries()) clearInterval(t);
    pollTimersRef.current.clear();
    pollDeadlinesRef.current.clear();
  };

  const startStabilizerFor = (emailAddr) => {
    const e = String(emailAddr || "").trim();
    const key = e.toLowerCase();
    if (!e) return;

    // prevent duplicate polling for same email
    if (pollTimersRef.current.has(key)) return;

    const deadline = Date.now() + STABILIZE_WINDOW_MS;
    pollDeadlinesRef.current.set(key, deadline);

    const tick = async () => {
      if (!pageVisibleRef.current) return;

      const now = Date.now();
      const dl = pollDeadlinesRef.current.get(key) || 0;
      const doFinalSnapshot = now > dl;

      const idKey = idKeyByEmailRef.current.get(key);
      if (!idKey) {
        stopStabilizerFor(e);
        setPendingEmails((prev) =>
          prev.filter((p) => p.email.toLowerCase() !== key),
        );
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/single/verify-smart`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Idempotency-Key": idKey,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            email: e,
            sessionId: sessionIdRef.current,
            username: getUser(),
            idempotencyKey: idKey,
          }),
        });

        const data = await res.json();

        const definitive =
          data &&
          (data.inProgress === false ||
            isDefinitive(String(data.status || "")) ||
            doFinalSnapshot);

        if (definitive) {
          finalize(data || { email: e, status: "❔ Unknown" });
        }
      } catch {
        if (doFinalSnapshot) finalize({ email: e, status: "❔ Unknown" });
      }
    };

    const intervalId = setInterval(tick, STABILIZE_EVERY_MS);
    pollTimersRef.current.set(key, intervalId);
  };

  /** ───────────────── Finalize ───────────────── */
  const finalize = (data) => {
    const finalEmail = String(data?.email || "").trim();
    if (!finalEmail) return;

    const key = finalEmail.toLowerCase();

    // stop only this email’s stabilizer
    stopStabilizerFor(finalEmail);

    const final = {
      email: finalEmail,
      status: data.status || "❔ Unknown",
      timestamp: data.timestamp || data.validatedAt || new Date().toISOString(),
      domain: data.domain || "N/A",
      domainProvider: data.domainProvider || data.provider || "N/A",
      isDisposable: !!data.isDisposable,
      isFree: !!data.isFree,
      isRoleBased: !!data.isRoleBased,
      score: typeof data.score === "number" ? data.score : 0,
    };

    const confVal =
      typeof data.confidence === "number" ? data.confidence : null;
    if (confVal !== null) setConfidence(confVal);

    const { msg, reasonText, color } = renderFromResult({
      status: final.status,
      message: data.message,
      reason: data.reason,
    });

    const enriched = {
      ...final,
      message: msg,
      reason: reasonText,
      confidence: confVal,
    };

    // Avoid double-processing exactly the same snapshot
    const dedupeKey =
      final.email.toLowerCase() + "|" + new Date(final.timestamp).getTime();
    if (lastFinalKeyRef.current === dedupeKey) return;
    lastFinalKeyRef.current = dedupeKey;

    setStatusUpdate(enriched);
    setStatusColor(color);

    // remove this email from pending list
    setPendingEmails((prev) =>
      prev.filter((p) => p.email.toLowerCase() !== key),
    );

    // add/update in results (one card per email)
    setResults((prev) => {
      const idx = prev.findIndex((r) => r.email.toLowerCase() === key);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...enriched };
        return next;
      }
      return [enriched, ...prev];
    });

    // stop hints only when nothing is pending anymore
    setTimeout(() => {
      if (pollTimersRef.current.size === 0) stopHintTimers();
    }, 0);

    // trigger history refresh for the history tab
    setHistoryReloadTrigger((prev) => prev + 1);
    scheduleCreditRefresh();
  };

  /** ───────────────── WebSocket ───────────────── */
  const openWebSocket = () => {
    try {
      const user = encodeURIComponent(getUser());
      const sid = encodeURIComponent(sessionIdRef.current);
      const ws = new WebSocket(`${WS_URL}?sessionId=${sid}&user=${user}`);

      wsRef.current = ws;

      ws.onopen = () => {
        try {
          ws.send(
            JSON.stringify({
              sessionId: sessionIdRef.current,
              username: getUser(),
            }),
          );
        } catch {}
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // ───────────── Debug logs (keep as-is) ─────────────
          if (SHOW_DEBUG && data?.type === "log") {
            setLogs((prev) => [...prev, data]);

            if (data.step === "probe") {
              const metaSender =
                data?.meta?.sender ||
                (typeof data.message === "string"
                  ? (data.message.match(/Using probe sender:\s*([^\s]+)/i) ||
                      [])[1]
                  : "");
              if (metaSender) setProbeUsed(metaSender);
            }

            if (data.step === "mx_try") {
              const metaMx =
                data?.meta?.mx ||
                (typeof data.message === "string"
                  ? (data.message.match(/Probing (?:mx|host):\s*([^\s]+)/i) ||
                      [])[1]
                  : "");
              if (metaMx) setMxHost(metaMx);
            }
            return;
          }

          // ───────────── Status updates ─────────────
          if (data?.type === "status") {
            // ✅ keep your existing single-only filter
            const sec = String(data?.section || "")
              .trim()
              .toLowerCase();
            if (sec && sec !== "single") return;

            // ✅ NEW: strict user filter
            const myUser = String(getUser() || "")
              .trim()
              .toLowerCase();
            const msgUser = String(data?.username || "")
              .trim()
              .toLowerCase();
            if (myUser && msgUser && myUser !== msgUser) return;

            // ✅ NEW: strict session filter (prevents other tabs/users)
            const mySid = String(sessionIdRef.current || "");
            const msgSid = String(data?.sessionId || "");
            if (mySid && msgSid && mySid !== msgSid) return;

            if (
              isDefinitive(String(data.status || "")) ||
              data.inProgress === false
            ) {
              finalize(data);
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!wsReconnectTimer.current) {
          wsReconnectTimer.current = setTimeout(() => {
            wsReconnectTimer.current = null;
            openWebSocket();
          }, RECONNECT_WS_MS);
        }
      };
    } catch {
      /* ignore */
    }
  };

  /** ───────────────── Mount: open WS + resume pending ───────────────── */
  useEffect(() => {
    openWebSocket();

    const onVis = () => {
      pageVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    const username = getUser();

    // Resume any in-progress single validations for this user (do NOT inject history results)
    if (username) {
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/single/pending`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({ username }),
          });
          const data = await res.json();

          if (
            data &&
            data.ok &&
            Array.isArray(data.pendings) &&
            data.pendings.length > 0
          ) {
            const pendings = data.pendings
              .map((p) => {
                const em = p?.email ? String(p.email).trim() : "";
                const idem = p?.idemKey ? String(p.idemKey).trim() : "";
                if (!em) return null;
                const idKey = idem || uuidv4();
                return { email: em, idKey };
              })
              .filter(Boolean);

            // register idKey per email
            pendings.forEach((p) => {
              idKeyByEmailRef.current.set(p.email.toLowerCase(), p.idKey);
            });

            setPendingEmails((prev) => {
              const seen = new Set(prev.map((x) => x.email.toLowerCase()));
              const merged = [...prev];
              pendings.forEach((p) => {
                const k = p.email.toLowerCase();
                if (!seen.has(k)) {
                  merged.push(p);
                  seen.add(k);
                }
              });
              return merged;
            });

            startHintTimers();

            // start stabilizer for each pending concurrently
            pendings.forEach((p) => startStabilizerFor(p.email));
          }
        } catch (e) {
          console.error("Failed to resume pending single validation:", e);
        }
      })();
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (wsReconnectTimer.current) clearTimeout(wsReconnectTimer.current);
      try {
        wsRef.current && wsRef.current.close();
      } catch {}
      stopAllStabilizers();
      stopHintTimers();
      if (creditRefreshTimerRef.current)
        clearTimeout(creditRefreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ───────────────── Tab behavior ───────────────── */
  useEffect(() => {
    if (activeTab !== "validate") {
      stopHintTimers();
    }
  }, [activeTab]);

  /** ───────────────── Final status rendering ───────────────── */
  function renderFromResult({ status, message, reason } = {}) {
    const cat = categoryFromStatus(status);

    const fallbacks = {
      valid: "You can safely send emails to this address.",
      invalid:
        "You should not send emails to this address — the mailbox does not exist.",
      risky: "This address looks risky to send to.",
      unknown: "We couldn’t get a decisive answer from the server.",
    };

    const colors = {
      valid: "#27ae60",
      invalid: "#e74c3c",
      risky: "#f1c40f",
      unknown: "#e67e22",
    };

    const msg =
      typeof message === "string" && message.trim() ? message : fallbacks[cat];

    const reasonText = typeof reason === "string" ? reason : "";

    setStatusColor(colors[cat]);
    setStatusMessage(msg);
    setReason(reasonText);

    return { msg, reasonText, color: colors[cat], cat };
  }

  /** ───────────────── Action ───────────────── */
  const validateEmail = async () => {
    const trimmed = (email || "").trim();
    if (!trimmed) {
      toast.warn("⚠️ Please enter an email");
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      toast.warn("⚠️ That doesn’t look like a valid email shape");
      return;
    }

    const key = trimmed.toLowerCase();

    // if same email already pending, don't duplicate
    if (pendingEmails.some((p) => p.email.toLowerCase() === key)) {
      toast.info("⏳ This email is already being verified.");
      return;
    }

    // per-email idKey
    const idKey = uuidv4();
    idKeyByEmailRef.current.set(key, idKey);

    setStatusUpdate(null);
    setConfidence(null);
    setReason("");
    if (SHOW_DEBUG) {
      setLogs([]);
      setProbeUsed("");
      setMxHost("");
    }

    // mark this email as pending (multiple loaders supported)
    setPendingEmails((prev) => [...prev, { email: trimmed, idKey }]);
    startHintTimers();

    setEmail("");

    try {
      const res = await fetch(`${API_BASE}/api/single/verify-smart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idKey,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: trimmed,
          sessionId: sessionIdRef.current,
          username: getUser(),
          idempotencyKey: idKey,
        }),
      });

      const prelim = await res.json();

      if (prelim?.error) {
        setPendingEmails((prev) =>
          prev.filter((p) => p.email.toLowerCase() !== key),
        );
        stopStabilizerFor(trimmed);
        toast.error(prelim.error);
        return;
      }

      if (
        isDefinitive(String(prelim.status || "")) ||
        prelim.inProgress === false
      ) {
        finalize(prelim);
      } else {
        // start per-email stabilizer
        startStabilizerFor(trimmed);
      }
    } catch (error) {
      setPendingEmails((prev) =>
        prev.filter((p) => p.email.toLowerCase() !== key),
      );
      stopStabilizerFor(trimmed);
      toast.error("❌ Error: " + error.message);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") validateEmail();
  };

  const buttonLabel = "Verify";

  /** ───────────────── Small helpers for UI ───────────────── */
  const formatDateTime = (ts) => {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts);
    }
  };

  const statusPillClass = (status) => {
    const cat = categoryFromStatus(status);
    return `status-pill status-${cat}`;
  };

  const statusLabel = (status) => {
    const cat = categoryFromStatus(status);
    if (cat === "valid") return "Valid";
    if (cat === "invalid") return "Invalid";
    if (cat === "risky") return "Risky";
    return "Unknown";
  };

  const statusIconNode = (status) => {
    const cat = categoryFromStatus(status);
    if (cat === "valid")
      return <CheckCircleOutlineIcon className="status-icon" />;
    if (cat === "invalid")
      return <CancelOutlinedIcon className="status-icon" />;
    if (cat === "risky")
      return <WarningAmberOutlinedIcon className="status-icon" />;
    return <HelpOutlineOutlinedIcon className="status-icon" />;
  };

  const renderResultCard = (r, key) => (
    <div className="result-card" key={key}>
      <div className="result-card-header">
        <div>
          <div className="result-email">{r.email}</div>
          <div className="result-subline">
            Validated on: {formatDateTime(r.timestamp)}
          </div>
        </div>
        <span className={statusPillClass(r.status)}>
          {statusIconNode(r.status)}
          <span className="status-text">{statusLabel(r.status)}</span>
        </span>
      </div>

      <p className="result-message">{r.message || statusMessage}</p>

      <div className="metric-row metric-row-top">
        <div className="metric-box">
          <div className="metric-label">Validation Score</div>
          <div className="metric-value">{r.score ?? 0}</div>
        </div>
        <div className="metric-box">
          <div className="metric-label">Confidence Level</div>
          <div className="metric-value">
            {typeof r.confidence === "number"
              ? `${Math.round(r.confidence * 100)}%`
              : typeof confidence === "number"
                ? `${Math.round(confidence * 100)}%`
                : "—"}
          </div>
        </div>
      </div>

      <div className="metric-row metric-row-bottom">
        <div className="metric-group">
          <div className="metric-group-title">Source Details</div>
          <div className="metric-header-row">
            <span className="metric-header-cell">Domain</span>
            <span className="metric-header-cell">Provider</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-cell">{r.domain}</span>
            <span className="metric-value-cell">{r.domainProvider}</span>
          </div>
        </div>

        <div className="metric-group metric-group-right">
          <div className="metric-group-title">Type Details</div>
          <div className="metric-header-row">
            <span className="metric-header-cell">Disposable</span>
            <span className="metric-header-cell">Free Email</span>
            <span className="metric-header-cell">Role Based</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value-cell">
              {r.isDisposable ? "Yes" : "No"}
            </span>
            <span className="metric-value-cell">{r.isFree ? "Yes" : "No"}</span>
            <span className="metric-value-cell">
              {r.isRoleBased ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="single-page-wrapper">
      {/* Header: title + tabs */}
      <div className="single-page-header">
        <h1 className="single-page-title">Single Validation</h1>
        <div className="single-tabs">
          <button
            className={activeTab === "validate" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("validate")}
          >
            Validate
          </button>
          <button
            className={activeTab === "history" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === "validate" ? (
        <div className="single-main">
          <div className="single-main-inner">
            {/* Left: input */}
            <div className="single-left-panel">
              <div className="single-left-header">
                <label htmlFor="single-email-input">Enter Email</label>
              </div>
              <input
                id="single-email-input"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label="Email address"
                className="single-email-input"
              />
              <button
                className="single-verify-btn"
                onClick={validateEmail}
                aria-busy={isLoading}
              >
                {isLoading && <span className="loader sm" aria-hidden />}
                <span>{buttonLabel}</span>
              </button>
            </div>

            {/* Right: loader cards + results / empty state */}
            <div className="single-right-panel">
              {pendingEmails.length > 0 &&
                pendingEmails.map((p) => (
                  <div className="pending-card" key={`pending-${p.email}`}>
                    <div className="pending-email">{p.email}</div>
                    <div className="pending-bar-text">
                      {waitingHint || "Verifying"}
                    </div>
                    <div className="pending-bar-track">
                      <div className="pending-bar-thumb" />
                    </div>
                  </div>
                ))}

              {pendingEmails.length === 0 && results.length === 0 && (
                <div className="single-empty-state">
                  <img
                    className="single-empty-illus"
                    src={singleLogo}
                    alt="Nothing here yet"
                    draggable="false"
                  />
                  <div className="svh-emptyTitle">Nothing here yet!</div>
                  <div className="svh-emptySub">
                    Start your first email validation to see results
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="result-list">
                  {results.map((r, idx) =>
                    renderResultCard(r, `${r.email}-${idx}`),
                  )}
                </div>
              )}

              {SHOW_DEBUG && (
                <>
                  <div className="log-panel">
                    <div className="log-header">Verification steps</div>
                    <div className="log-body">
                      {logs.length === 0 && (
                        <div className="log-line muted">No logs yet.</div>
                      )}
                      {logs.map((l, idx) => (
                        <div
                          key={idx}
                          className={`log-line ${l.level || "info"}`}
                        >
                          <span className="log-time">
                            {new Date(l.at).toLocaleTimeString()}
                          </span>
                          {l.step && (
                            <span className="log-step">[{l.step}]</span>
                          )}
                          <span className="log-msg">{l.message}</span>
                          {l._local && (
                            <span
                              className="log-tag"
                              title="Client-side milestone"
                            >
                              (client)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="meta-row">
                    {probeUsed && (
                      <span className="badge">
                        Probe: <strong>{probeUsed}</strong>
                      </span>
                    )}
                    {mxHost && (
                      <span className="badge">
                        MX: <strong>{mxHost}</strong>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="single-history-panel">
          <SingleValidationHistory
            username={getUser()}
            reloadTrigger={historyReloadTrigger}
          />
        </div>
      )}
    </div>
  );
};

export default SingleValidator;
