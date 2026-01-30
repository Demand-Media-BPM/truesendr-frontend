// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";
// import "./EmailFinder.css";
// import EmailFinderBulk from "./EmailFinderBulk";

// const API_BASE = process.env.REACT_APP_API_BASE || "";
// const LISTBOX_ID = "domain-suggest-listbox";

// export default function EmailFinder() {
//   // Single finder
//   const [name, setName] = useState("");
//   const [domain, setDomain] = useState("");

//   // suggestions
//   const [sugs, setSugs] = useState([]);
//   const [sugsOpen, setSugsOpen] = useState(false);
//   const [sugsLoading, setSugsLoading] = useState(false);
//   const [activeIdx, setActiveIdx] = useState(-1); // keyboard highlight

//   // result
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState("");

//   // stable session id (optional but useful for logs)
//   const sessionIdRef = useRef(
//     crypto?.randomUUID?.() ||
//       `${Date.now()}-${Math.random().toString(36).slice(2)}`
//   );

//   // refs
//   const dropRef = useRef(null);
//   const inputRef = useRef(null);

//   const getUsername = () =>
//     (
//       localStorage.getItem("loggedInUser") ||
//       localStorage.getItem("username") ||
//       ""
//     ).trim() || "guest";

//   // ---------- Debounced suggestions ----------
//   useEffect(() => {
//     let abort = false;
//     let timer = null;

//     async function fetchSugs(q) {
//       try {
//         const token = localStorage.getItem("token");
//         setSugsLoading(true);
//         const url = `${API_BASE}/api/finder/domains/suggest?q=${encodeURIComponent(
//           q
//         )}&limit=10&_ts=${Date.now()}`;

//         const resp = await fetch(url, {
//           method: "GET",
//           headers: {
//             ...(token ? { Authorization: `Bearer ${token}` } : {}),
//             "X-User": getUsername(),
//             "ngrok-skip-browser-warning": "1",
//           },
//         });

//         if (!resp.ok) throw new Error(`suggest ${resp.status}`);
//         const data = await resp.json();
//         if (!abort) {
//           const items = Array.isArray(data?.suggestions) ? data.suggestions : [];
//           setSugs(items);
//           setSugsOpen(items.length > 0);
//           setActiveIdx(-1);
//         }
//       } catch (e) {
//         if (!abort) {
//           console.error("suggestions error", e);
//           setSugs([]);
//           setSugsOpen(false);
//         }
//       } finally {
//         !abort && setSugsLoading(false);
//       }
//     }

//     const q = domain.trim();
//     if (!q) {
//       setSugs([]);
//       setSugsOpen(false);
//       return () => {};
//     }

//     timer = setTimeout(() => fetchSugs(q), 220);

//     return () => {
//       abort = true;
//       if (timer) clearTimeout(timer);
//     };
//   }, [domain]);

//   // click-outside to close dropdown
//   useEffect(() => {
//     function onDocClick(e) {
//       if (!dropRef.current) return;
//       if (!dropRef.current.contains(e.target)) {
//         setSugsOpen(false);
//         setActiveIdx(-1);
//       }
//     }
//     document.addEventListener("mousedown", onDocClick);
//     return () => document.removeEventListener("mousedown", onDocClick);
//   }, []);

//   function chooseSuggestion(v) {
//     setDomain(v);
//     setSugsOpen(false);
//     setActiveIdx(-1);
//     inputRef.current?.focus();
//   }

//   function onKeyDownDomain(e) {
//     if (!sugsOpen || !sugs.length) return;

//     if (e.key === "ArrowDown") {
//       e.preventDefault();
//       setActiveIdx((idx) => {
//         const next = idx + 1;
//         return next >= sugs.length ? 0 : next;
//       });
//     } else if (e.key === "ArrowUp") {
//       e.preventDefault();
//       setActiveIdx((idx) => {
//         const prev = idx - 1;
//         return prev < 0 ? sugs.length - 1 : prev;
//       });
//     } else if (e.key === "Enter") {
//       if (activeIdx >= 0 && activeIdx < sugs.length) {
//         e.preventDefault();
//         chooseSuggestion(sugs[activeIdx]);
//       }
//     } else if (e.key === "Escape") {
//       setSugsOpen(false);
//       setActiveIdx(-1);
//     }
//   }

//   // ---------- Single Finder ----------
//   const onSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setResult(null);
//     setSugsOpen(false);

//     if (!name.trim() || !domain.trim()) {
//       setError("Please enter both name and domain/company.");
//       return;
//     }

//     const token = localStorage.getItem("token");
//     const username = getUsername();
//     setLoading(true);
//     try {
//       const resp = await axios.post(
//         `${API_BASE}/api/finder`,
//         {
//           name: name.trim(),
//           domain: domain.trim().toLowerCase(),
//           sessionId: sessionIdRef.current,
//         },
//         {
//           headers: {
//             ...(token ? { Authorization: `Bearer ${token}` } : {}),
//             "X-User": username,
//             "ngrok-skip-browser-warning": "1",
//             "X-Requested-With": "XMLHttpRequest",
//             "Cache-Control":
//               "no-store, no-cache, must-revalidate, proxy-revalidate",
//             Pragma: "no-cache",
//           },
//         }
//       );
//       setResult(resp.data);
//     } catch (err) {
//       setError(err?.response?.data?.error || "Request failed");
//       console.error("single finder error", err?.response?.data || err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const canSubmit = name.trim() && domain.trim() && !loading;

//   const activeDescId =
//     sugsOpen && activeIdx >= 0 ? `sug-${activeIdx}` : undefined;

//   return (
//     <div className="ef">
//       <h2 className="ef__title">Email Finder</h2>

//       {/* Single Finder */}
//       <form onSubmit={onSubmit} className="ef-form" autoComplete="off">
//         <div className="field">
//           <label htmlFor="ef-name">Name</label>
//           <input
//             id="ef-name"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             placeholder="John Doe"
//           />
//         </div>

//         <div className="field field--dropdown" ref={dropRef}>
//           <label htmlFor="ef-domain">Domain or Company</label>
//           <input
//             id="ef-domain"
//             ref={inputRef}
//             value={domain}
//             onChange={(e) => setDomain(e.target.value)}
//             onKeyDown={onKeyDownDomain}
//             onFocus={() => sugs.length && setSugsOpen(true)}
//             placeholder="acme.com or Demand Media BPM"
//             // A11y: use combobox role on the input to allow aria-expanded, etc.
//             role="combobox"
//             aria-autocomplete="list"
//             aria-expanded={!!sugsOpen}
//             aria-controls={LISTBOX_ID}
//             aria-activedescendant={activeDescId}
//             aria-haspopup="listbox"
//           />

//           {/* Suggestions dropdown */}
//           {sugsOpen && (
//             <div
//               id={LISTBOX_ID}
//               role="listbox"
//               className="ef-suggest"
//             >
//               {sugsLoading && (
//                 <div className="ef-suggest__row ef-suggest__loading">
//                   Searching…
//                 </div>
//               )}

//               {!sugsLoading && sugs.length === 0 && (
//                 <div className="ef-suggest__row ef-suggest__empty">
//                   No suggestions
//                 </div>
//               )}

//               {!sugsLoading &&
//                 sugs.map((d, i) => (
//                   <div
//                     id={`sug-${i}`}
//                     key={d}
//                     role="option"
//                     aria-selected={i === activeIdx}
//                     onMouseDown={(e) => e.preventDefault()} // keep focus
//                     onClick={() => chooseSuggestion(d)}
//                     onMouseEnter={() => setActiveIdx(i)}
//                     className={
//                       "ef-suggest__row" + (i === activeIdx ? " is-active" : "")
//                     }
//                     title={d}
//                   >
//                     <span className="ef-suggest__text">{d}</span>
//                     <span className="ef-suggest__hint">press Enter ↩</span>
//                   </div>
//                 ))}
//             </div>
//           )}
//         </div>

//         <button type="submit" disabled={!canSubmit}>
//           {loading ? "Finding…" : "Find Email"}
//         </button>
//       </form>

//       {error && <div className="error">{error}</div>}

//       {result && !loading && (
//         <div className={`finder-result ${!result.found ? "not-found" : ""}`}>
//           {result.found ? (
//             <>
//               <h3>Result</h3>
//               <p>
//                 <b>Email:</b> {result.email}
//               </p>
//               <div className="chips">
//                 <span
//                   className={
//                     "chip " +
//                     (result.confidence === "High"
//                       ? "chip--success"
//                       : result.confidence === "Low"
//                       ? "chip--danger"
//                       : "chip--warn")
//                   }
//                 >
//                   Confidence: {result.confidence || "—"}
//                 </span>
//                 {result.fromCache && <span className="chip">From cache</span>}
//               </div>
//               {result.reason && (
//                 <p className="bulk-sub" style={{ marginTop: 8 }}>
//                   <i>{result.reason}</i>
//                 </p>
//               )}
//             </>
//           ) : (
//             <>
//               <h3>Result not found</h3>
//               {result.note && <p className="note">{result.note}</p>}
//             </>
//           )}
//         </div>
//       )}

//       <hr className="ef__divider" />

//       {/* Bulk Finder lives in its own component & stylesheet */}
//       {/* <EmailFinderBulk /> */}
//     </div>
//   );
// }

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./EmailFinder.css";
import EmailFinderHistory from "./EmailFinderHistory";
import { useCredits } from "../credits/CreditsContext";
import finderLogo from "../assets/illustrator/finder.png";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";

const API_BASE = process.env.REACT_APP_API_BASE;

/** Username extraction logic (same pattern you use) */
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

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ).trim();
}

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function trimName(n) {
  return String(n || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normDomain(d) {
  return String(d || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0];
}

function splitFullName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  return { firstName, lastName };
}

function fmtValidatedOn(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";

  const day = dt.getDate();
  const month = dt.toLocaleString("en-US", { month: "short" });
  const year = dt.getFullYear();

  let hours = dt.getHours();
  const minutes = String(dt.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  const hh = String(hours).padStart(2, "0");

  return `${day} ${month} ${year} ${hh}:${minutes} ${ampm}`;
}

export default function EmailFinder() {
  const username = getUsername();
  const token = getToken();

  const { refreshCredits } = useCredits();
  const creditsRefreshTimersRef = useRef([]);
  const refreshedJobIdsRef = useRef(new Set()); // refresh once per job

  const scheduleCreditsRefresh = () => {
    // clear old scheduled refreshes
    creditsRefreshTimersRef.current.forEach((t) => clearTimeout(t));
    creditsRefreshTimersRef.current = [];

    // 1) quick refresh (for cache-hit paths)
    creditsRefreshTimersRef.current.push(
      setTimeout(() => refreshCredits?.(), 400),
    );

    // 2) delayed refresh (for worker path where credit decrements AFTER state becomes done)
    creditsRefreshTimersRef.current.push(
      setTimeout(() => refreshCredits?.(), 2200),
    );
  };

  const [activeTab, setActiveTab] = useState("validate"); // validate | history

  // Left form
  const [fullName, setFullName] = useState("");
  const [domain, setDomain] = useState("");

  // request start state
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Right panel (latest 5, newest first)
  const [cards, setCards] = useState([]);

  // polling control for running jobs (parallel)
  const pollTimerRef = useRef(null);
  const inflightRef = useRef(new Set());

  function buildHeaders() {
    const h = {
      "Content-Type": "application/json",
      "X-User": username || "",
      "ngrok-skip-browser-warning": "69420",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      "X-Requested-With": "XMLHttpRequest",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  /** Load last 5 for Validate tab (like PhoneValidator) */
  useEffect(() => {
    async function fetchRecent() {
      if (!username) return;

      try {
        const res = await axios.get(
          apiUrl(`/api/finder/history?limit=5&_ts=${Date.now()}`),
          { headers: buildHeaders() },
        );

        const items = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data?.history)
            ? res.data.history
            : [];

        const normalized = items.map((it) => ({
          _id: String(it._id),
          state: it.state || "done", // running | done | error
          fullName: it.fullName || it.nameInput || it.inputName || "",
          domain: it.domain || "",
          email: it.email || "",
          createdAt: it.createdAt,
          updatedAt: it.updatedAt,
          error: it.error || "",
        }));

        setCards(normalized.slice(0, 5));
      } catch {
        setCards([]);
      }
    }

    if (activeTab === "validate") fetchRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, activeTab]);

  /** Poll running cards (parallel) */
  useEffect(() => {
    const hasRunning = cards.some((c) => c.state === "running");

    if (!hasRunning) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    async function fetchJob(jobId) {
      if (!jobId) return;
      if (inflightRef.current.has(jobId)) return;
      inflightRef.current.add(jobId);

      try {
        const resp = await axios.get(
          apiUrl(
            `/api/finder/job/${encodeURIComponent(jobId)}?_ts=${Date.now()}`,
          ),
          { headers: buildHeaders() },
        );

        const j = resp.data || {};
        const nextState = j.state || "done"; // backend should return state
        const prevState = cards.find(
          (c) => String(c._id) === String(jobId),
        )?.state;
        const justFinished = prevState === "running" && nextState !== "running";

        // ✅ CREDIT REFRESH: exactly when backend returns final result
        // (this is the moment you deduct credits + card becomes final)
        if (justFinished && !refreshedJobIdsRef.current.has(String(jobId))) {
          refreshedJobIdsRef.current.add(String(jobId));
          scheduleCreditsRefresh();
        }

        setCards((prev) =>
          prev.map((c) => {
            if (String(c._id) !== String(jobId)) return c;
            return {
              ...c,
              state: nextState,
              fullName: j.fullName || c.fullName,
              domain: j.domain || c.domain,
              email: j.email || "",
              error: j.error || "",
              updatedAt: j.updatedAt || c.updatedAt,
              createdAt: j.createdAt || c.createdAt,
            };
          }),
        );
      } catch {
        // ignore transient
      } finally {
        inflightRef.current.delete(jobId);
      }
    }

    if (!pollTimerRef.current) {
      pollTimerRef.current = setInterval(() => {
        const runningIds = cards
          .filter((c) => c.state === "running")
          .map((c) => c._id);

        if (!runningIds.length) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
          return;
        }

        runningIds.forEach((id) => fetchJob(id));
      }, 1400);
    }

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      inflightRef.current.clear();

      creditsRefreshTimersRef.current.forEach((t) => clearTimeout(t));
      creditsRefreshTimersRef.current = [];
    };
  }, []);

  /** Submit (parallel job) */
  async function handleFind(e) {
    e.preventDefault();
    setErrMsg("");

    const n = trimName(fullName);
    const d = normDomain(domain);

    if (!n || !d) {
      setErrMsg("Please enter full name and a valid domain.");
      return;
    }

    const { firstName, lastName } = splitFullName(n);
    if (!firstName || !lastName) {
      setErrMsg("Please enter both first and last name.");
      return;
    }

    if (!username) {
      setErrMsg("No username found in localStorage.");
      return;
    }

    setSubmitting(true);

    try {
      const resp = await axios.post(
        apiUrl("/api/finder/start"),
        { fullName: n, domain: d },
        { headers: buildHeaders() },
      );

      const jobId = resp.data?.jobId;
      if (!jobId) throw new Error("No jobId returned");
      const stateFromStart = resp.data?.state; // running | done | error (if provided)

      // ✅ if backend returns final result immediately and you create final card now
      if (
        stateFromStart &&
        stateFromStart !== "running" &&
        !refreshedJobIdsRef.current.has(String(jobId))
      ) {
        refreshedJobIdsRef.current.add(String(jobId));
        scheduleCreditsRefresh();
      }

      if (!jobId) throw new Error("No jobId returned");

      const nowIso = new Date().toISOString();

      // add running card to top immediately (so loader card shows)
      const newCard = {
        _id: String(jobId),
        state: stateFromStart || "running",
        fullName: n,
        domain: d,
        email: resp.data?.email || "",
        error: resp.data?.error || "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setCards((prev) => {
        const next = [
          newCard,
          ...prev.filter((c) => String(c._id) !== String(jobId)),
        ];
        return next.slice(0, 5);
      });

      // clear inputs so user can submit again (parallel)
      setFullName("");
      setDomain("");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Request failed";
      setErrMsg(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyEmail(email) {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  /** TOP Running loader (exact Figma) */
  function RunningTopCard({ c }) {
    return (
      <div className="ef-runCard">
        <div className="ef-runName">{c?.fullName || "—"}</div>
        <div className="ef-runDomain">{c?.domain || "—"}</div>
        <div className="ef-runText">Finding email</div>
        <div className="ef-runBar">
          <span className="ef-runFill" />
        </div>
      </div>
    );
  }

  /** RESULT CARD (exact Figma) */
  function ResultCard({ c }) {
    const found = !!c.email;
    const isErr = c.state === "error";

    return (
      <div className="ef-card">
        <div className="ef-cardName">{c.fullName || "—"}</div>
        <div className="ef-cardDomain">{c.domain || "—"}</div>

        <div className="ef-cardEmailRow">
          <div className={`ef-cardEmail ${!found ? "is-muted" : ""}`}>
            {isErr ? "Error" : found ? c.email : "No email found"}
          </div>

          {found && (
            <button
              type="button"
              className="ef-copyBtn"
              onClick={() => copyEmail(c.email)}
              aria-label="Copy email"
              title="Copy"
            >
              <ContentCopyRoundedIcon className="ef-copyIcon" />
            </button>
          )}
        </div>

        <div className="ef-cardVerified">
          Verified on :{" "}
          <span className="ef-cardVerifiedAt">
            {fmtValidatedOn(c.createdAt)}
          </span>
        </div>

        {isErr && c.error && <div className="ef-cardErr">{c.error}</div>}
      </div>
    );
  }

  function renderValidateLeft() {
    return (
      <div className="ef-left">
        <div className="ef-leftTitle">Find an email address</div>

        <form className="ef-form" onSubmit={handleFind} autoComplete="off">
          <div className="ef-field">
            <label className="ef-label">Full Name</label>
            <input
              className="ef-input"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="ef-field">
            <label className="ef-label">Domain</label>
            <input
              className="ef-input"
              placeholder="company.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <button className="ef-verifyBtn" type="submit" disabled={submitting}>
            {submitting ? "Starting..." : "Find Email"}
          </button>

          {errMsg && <div className="ef-error">{errMsg}</div>}
        </form>
      </div>
    );
  }

  function renderValidateRight() {
    const list = Array.isArray(cards) ? cards.slice(0, 5) : [];

    const runningList = list.filter((x) => x.state === "running");
    const doneList = list.filter((x) => x.state !== "running");

    if (!list.length) {
      return (
        <div className="ef-right ef-rightEmpty">
          <div className="ef-emptyWrap">
            <img src={finderLogo} alt="Finder" className="ef-emptyLogo" />
            <div className="ef-emptyTitle">Nothing here yet!</div>
            <div className="ef-emptySub">
              Find an email address to see results here
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="ef-right">
        <div className="ef-rightStack">
          {/* ✅ show ALL running loader cards */}
          {runningList.map((c) => (
            <RunningTopCard key={c._id} c={c} />
          ))}

          {/* ✅ then show completed/not-found/error cards */}
          {doneList.map((row) => (
            <ResultCard key={row._id} c={row} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ef-page">
      <div className="ef-headerRow">
        <div className="ef-title">Email Finder</div>

        <div className="single-tabs">
          <button
            className={activeTab === "validate" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("validate")}
            type="button"
          >
            Find
          </button>

          <button
            className={activeTab === "history" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("history")}
            type="button"
          >
            History
          </button>
        </div>
      </div>

      <div
        className={`ef-mainCard ${
          activeTab === "validate" ? "is-validate" : "is-history"
        }`}
      >
        {activeTab === "validate" ? (
          <div className="ef-split">
            {renderValidateLeft()}
            {renderValidateRight()}
          </div>
        ) : (
          <EmailFinderHistory
            username={username}
            token={token}
            apiBase={API_BASE}
          />
        )}
      </div>
    </div>
  );
}
