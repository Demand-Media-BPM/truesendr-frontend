// //...........................................................................................................................................................

// // BulkValidator.jsx (updated with persistence + new APIs)
// import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import { toast } from "react-toastify";
// import { v4 as uuidv4 } from "uuid";
// import "./BulkValidator.css";
// import BulkHistory from "./BulkHistory";
// // import BulkHistory from "./Components/BulkHistory";

// /** ───────────────── Endpoint resolution ───────────────── */
// const DEFAULT_API_PORT = 5000;
// const isBrowser = typeof window !== "undefined";
// const loc = isBrowser
//   ? window.location
//   : { protocol: "http:", hostname: "localhost", host: "localhost" };
// const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(loc?.hostname || "");

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

// const API_BASE =
//   envApi ||
//   (isLocalHost
//     ? `http://localhost:${DEFAULT_API_PORT}`
//     : `${loc.protocol}//${loc.host}`);

// const WS_URL =
//   envWs ||
//   (API_BASE.startsWith("http")
//     ? API_BASE.replace(/^http/i, "ws").replace(/\/+$/, "")
//     : (loc.protocol === "https:" ? "wss:" : "ws:") +
//       (isLocalHost ? `//localhost:${DEFAULT_API_PORT}` : `//${loc.host}`));

// // Optional Basic auth header if server enforces it
// const BASIC_AUTH_B64 =
//   (typeof process !== "undefined" &&
//     process.env &&
//     process.env.REACT_APP_BULK_AUTH_B64) ||
//   "";

// // Polling cadence
// const PROGRESS_POLL_MS = 700;

// // current logged-in user (already set by your Login flow)
// const getUser = () =>
//   typeof localStorage !== "undefined"
//     ? (localStorage.getItem("loggedInUser") || "").trim()
//     : "";

// /** ───────────────── Small helpers ───────────────── */
// const STORAGE_KEY = "bulk.session"; // persists bulkId, sessionId, preflight, stage
// const saveSession = (obj) => {
//   try {
//     sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
//   } catch {}
// };
// const loadSession = () => {
//   try {
//     const raw = sessionStorage.getItem(STORAGE_KEY);
//     return raw ? JSON.parse(raw) : null;
//   } catch {
//     return null;
//   }
// };
// const clearSession = () => {
//   try {
//     sessionStorage.removeItem(STORAGE_KEY);
//   } catch {}
// };

// const apiHeaders = () => {
//   const h = {
//     "ngrok-skip-browser-warning": "true",
//     "X-User": getUser(),
//   };
//   if (BASIC_AUTH_B64) h["Authorization"] = `Basic ${BASIC_AUTH_B64}`;
//   return h;
// };

// const norm = (e) =>
//   String(e || "")
//     .trim()
//     .toLowerCase();
// const catFromStatus = (s = "") => {
//   const t = String(s || "");
//   if (/\bInvalid\b/i.test(t)) return "invalid";
//   if (/\bRisky\b/i.test(t)) return "risky";
//   if (/\bValid\b/i.test(t)) return "valid";
//   return "unknown";
// };

// // Simple SVG donut with segments
// function Donut({ segments = [], size = 140, stroke = 16, empty = false }) {
//   const r = (size - stroke) / 2;
//   const c = 2 * Math.PI * r;
//   let offset = 0;

//   return (
//     <svg
//       width={size}
//       height={size}
//       viewBox={`0 0 ${size} ${size}`}
//       className="donut"
//     >
//       <circle
//         cx={size / 2}
//         cy={size / 2}
//         r={r}
//         strokeWidth={stroke}
//         className="donut-track"
//         fill="none"
//       />
//       {!empty &&
//         segments.map((seg, i) => {
//           const len = c * Math.max(0, Math.min(1, seg.frac || 0));
//           const dashArray = `${len} ${c - len}`;
//           const el = (
//             <circle
//               key={i}
//               cx={size / 2}
//               cy={size / 2}
//               r={r}
//               fill="none"
//               strokeWidth={stroke}
//               stroke={seg.color}
//               strokeDasharray={dashArray}
//               strokeDashoffset={-offset}
//               className="donut-seg"
//             />
//           );
//           offset += len;
//           return el;
//         })}
//       <text
//         x="50%"
//         y="50%"
//         dominantBaseline="middle"
//         textAnchor="middle"
//         className="donut-center"
//       >
//         {empty ? "–" : ""}
//       </text>
//     </svg>
//   );
// }

// const BulkValidator = () => {
//   const [file, setFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [downloadUrl, setDownloadUrl] = useState("");
//   const [isDragging, setIsDragging] = useState(false);
//   const [backgroundMode, setBackgroundMode] = useState(false);
//   const [deleting, setDeleting] = useState(false);

//   // progress
//   const [progressCurrent, setProgressCurrent] = useState(0);
//   const [progressTotal, setProgressTotal] = useState(0);
//   const [stage, setStage] = useState("idle");
//   const [started, setStarted] = useState(false);

//   // dialog & bulk session
//   const [showDialog, setShowDialog] = useState(false);
//   const showDialogRef = useRef(false);
//   useEffect(() => {
//     showDialogRef.current = showDialog;
//   }, [showDialog]);
//   const [preflight, setPreflight] = useState(null);
//   const [liveCounts, setLiveCounts] = useState({
//     valid: 0,
//     invalid: 0,
//     risky: 0,
//     unknown: 0,
//   });
//   const [bulkId, setBulkId] = useState(null);

//   const sessionIdRef = useRef(uuidv4());
//   const wsRef = useRef(null);
//   const pollRef = useRef(null);
//   const mountedRef = useRef(false);
//   const processedEmailsRef = useRef(new Set());

//   // --- Background jobs tray state (persist per user) ---
//   const BG_KEY = (u) => `bulk.bg.jobs:${u || "anon"}`;
//   const [bgJobs, setBgJobs] = useState([]); // [{ bulkId, name, progressPct, state }]

//   // map bulkId -> file name for tray labels
//   const NAMES_KEY = (u) => `bulk.bg.names:${u || "anon"}`;
//   const getNames = () => {
//     try {
//       return JSON.parse(localStorage.getItem(NAMES_KEY(getUser())) || "{}");
//     } catch {
//       return {};
//     }
//   };
//   const saveName = (id, name) => {
//     try {
//       const all = getNames();
//       all[id] = name || "bulk.xlsx";
//       localStorage.setItem(NAMES_KEY(getUser()), JSON.stringify(all));
//     } catch {}
//   };
//   const lookupName = (id) => getNames()[id] || "bulk.xlsx";

//   const loadBg = () => {
//     try {
//       return JSON.parse(localStorage.getItem(BG_KEY(getUser())) || "[]");
//     } catch {
//       return [];
//     }
//   };
//   const saveBg = (arr) => {
//     try {
//       localStorage.setItem(BG_KEY(getUser()), JSON.stringify(arr || []));
//     } catch {}
//   };

//   const removeName = (id) => {
//     const all = getNames();
//     delete all[id];
//     localStorage.setItem(NAMES_KEY(getUser()), JSON.stringify(all));
//   };

//   const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
//   const completedFiredRef = useRef(new Set());
//   const scheduleHistoryRefresh = (id) => {
//     if (id && completedFiredRef.current.has(id)) return; // prevent duplicates
//     if (id) {
//       completedFiredRef.current.add(id);
//       // keep last ~200 ids to avoid unbounded growth
//       if (completedFiredRef.current.size > 200) {
//         const it = completedFiredRef.current.values();
//         completedFiredRef.current.delete(it.next().value);
//       }
//     }
//     setTimeout(() => setHistoryRefreshKey((k) => k + 1), 300);
//   };

//   useEffect(() => {
//     setBgJobs(loadBg());
//   }, []);
//   useEffect(() => {
//     saveBg(bgJobs);
//   }, [bgJobs]);

//   // ───────────────── Restore persisted session on mount ─────────────────
//   useEffect(() => {
//     const saved = loadSession();
//     if (
//       saved &&
//       saved.bulkId &&
//       saved.sessionId &&
//       saved.username === getUser() &&
//       saved.started === false
//     ) {
//       // reuse prior sessionId or create new one (then attach)
//       sessionIdRef.current = saved.sessionId || sessionIdRef.current;
//       setBulkId(saved.bulkId);
//       setPreflight(saved.preflight || null);
//       setStage(saved.stage || "preparing");
//       setShowDialog(true);
//       // Attach to bind WS on the server (safe even if already attached)
//       axios
//         .post(
//           `${API_BASE}/api/bulk/attach`,
//           {
//             bulkId: saved.bulkId,
//             sessionId: sessionIdRef.current,
//             username: getUser(),
//           },
//           { headers: { ...apiHeaders(), "Content-Type": "application/json" } }
//         )
//         .catch(() => {});
//     }
//   }, []);

//   // persist whenever key parts change
//   useEffect(() => {
//     if (!bulkId) return;
//     saveSession({
//       bulkId,
//       sessionId: sessionIdRef.current,
//       preflight,
//       stage,
//       started,
//       username: getUser(),
//       at: Date.now(),
//     });
//   }, [bulkId, preflight, stage, started]);

//   // ───────────────── WebSocket (live progress + status/bulk:stats) ─────────────────
//   useEffect(() => {
//     mountedRef.current = true;
//     try {
//       const user = encodeURIComponent(getUser());
//       const sid = encodeURIComponent(sessionIdRef.current);
//       const ws = new WebSocket(`${WS_URL}/?sessionId=${sid}&user=${user}`);
//       wsRef.current = ws;

//       ws.onopen = () => {
//         try {
//           ws.send(
//             JSON.stringify({ sessionId: sessionIdRef.current, user: getUser() })
//           );
//         } catch {}
//       };

//       ws.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data);

//           // PROGRESS (now carries bulkId from server)
//           if (
//             data?.type === "progress" &&
//             typeof data.current === "number" &&
//             typeof data.total === "number"
//           ) {
//             // Foreground (live modal): only react if this is our active bulkId
//             if (data.bulkId && data.bulkId === bulkId) {
//               if (!mountedRef.current) return;
//               if (
//                 stage !== "validating" &&
//                 stage !== "finishing" &&
//                 stage !== "finished"
//               ) {
//                 setStage("validating");
//               }
//               setProgressCurrent(data.current);
//               setProgressTotal(data.total);
//             }
//             // inside ws.onmessage, in the PROGRESS handling block
//             if (data.bulkId) {
//               const pct =
//                 data.total > 0
//                   ? Math.min(100, Math.round((data.current / data.total) * 100))
//                   : 0;

//               setBgJobs((prev) => {
//                 const exists = prev.some((j) => j.bulkId === data.bulkId);
//                 const next = exists
//                   ? prev.map((j) =>
//                       j.bulkId === data.bulkId
//                         ? {
//                             ...j,
//                             progressPct: pct,
//                             state: pct >= 100 ? "done" : j.state,
//                             expiresAt:
//                               pct >= 100 && j.state !== "done"
//                                 ? Date.now() + 30_000
//                                 : j.expiresAt || null,
//                           }
//                         : j
//                     )
//                   : [
//                       ...prev,
//                       {
//                         bulkId: data.bulkId,
//                         name: lookupName(data.bulkId),
//                         progressPct: pct,
//                         state: pct >= 100 ? "done" : "running",
//                         expiresAt: pct >= 100 ? Date.now() + 30_000 : null,
//                       },
//                     ];

//                 // 🔔 fire event when we *transition* to done
//                 const becameDone =
//                   next.some(
//                     (j) => j.bulkId === data.bulkId && j.state === "done"
//                   ) &&
//                   !prev.some(
//                     (j) => j.bulkId === data.bulkId && j.state === "done"
//                   );
//                 if (becameDone) {
//                   scheduleHistoryRefresh(data.bulkId);
//                 }

//                 return next;
//               });
//             }
//           }

//           // BULK STATS (counts under the pie) — keep but guard by bulkId
//           if (
//             data?.type === "bulk:stats" &&
//             data.bulkId &&
//             data.bulkId === bulkId
//           ) {
//             if (data.counts) {
//               setLiveCounts({
//                 valid: data.counts.valid || 0,
//                 risky: data.counts.risky || 0,
//                 invalid: data.counts.invalid || 0,
//                 unknown: data.counts.unknown || 0,
//               });
//             }
//           }

//           // inside ws.onmessage
//           if (data?.type === "bulk:deleted" && data.bulkId === bulkId) {
//             setShowDialog(false);
//             resetAll();
//             scheduleHistoryRefresh(data.bulkId);
//           }

//           // PER-ITEM STATUS (only when live dialog is open)
//           if (data?.type === "status" && showDialogRef.current) {
//             const em = norm(data.email || "");
//             if (!em || processedEmailsRef.current.has(em)) return;
//             processedEmailsRef.current.add(em);
//             const cat = catFromStatus(data.status || "");
//             setLiveCounts((prev) => ({ ...prev, [cat]: (prev[cat] || 0) + 1 }));
//           }
//         } catch {}
//       };

//       ws.onclose = () => {
//         wsRef.current = null;
//       };
//     } catch {}
//     return () => {
//       mountedRef.current = false;
//       try {
//         wsRef.current && wsRef.current.close();
//       } catch {}
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [bulkId]);

//   /** ───────────────── Polling fallback (only progress) ───────────────── */
//   const refreshProgressOnce = async () => {
//     try {
//       const headers = { ...apiHeaders(), "Cache-Control": "no-cache" };
//       const res = await fetch(
//         `${API_BASE}/api/bulk/progress?sessionId=${encodeURIComponent(
//           sessionIdRef.current
//         )}&bulkId=${encodeURIComponent(bulkId || "")}`,
//         { headers }
//       );
//       const p = await res.json();
//       if (p && typeof p.total === "number" && typeof p.current === "number") {
//         if (p.total > 0 && stage === "preparing") setStage("validating");
//         setProgressTotal(p.total || 0);
//         setProgressCurrent(p.current || 0);
//       }
//     } catch {}
//   };

//   // Auto-remove done strips after expiresAt (30s)
//   useEffect(() => {
//     const t = setInterval(() => {
//       const now = Date.now();
//       setBgJobs((prev) =>
//         prev.filter(
//           (j) => !(j.state === "done" && j.expiresAt && j.expiresAt <= now)
//         )
//       );
//     }, 1000);
//     return () => clearInterval(t);
//   }, []);

//   useEffect(() => {
//     const shouldPoll =
//       !!bulkId &&
//       (uploading ||
//         (stage !== "idle" &&
//           stage !== "finished" &&
//           (progressTotal === 0 || progressCurrent < progressTotal)));
//     if (!shouldPoll) {
//       if (pollRef.current) {
//         clearInterval(pollRef.current);
//         pollRef.current = null;
//       }
//       return;
//     }
//     refreshProgressOnce();
//     pollRef.current = setInterval(refreshProgressOnce, PROGRESS_POLL_MS);
//     return () => {
//       if (pollRef.current) {
//         clearInterval(pollRef.current);
//         pollRef.current = null;
//       }
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [bulkId, uploading, stage, progressCurrent, progressTotal]);

//   // Finishing hint
//   useEffect(() => {
//     const total = progressTotal || 0;
//     if (total > 0 && progressCurrent >= total) {
//       if (!downloadUrl && !backgroundMode) {
//         if (stage !== "finished") setStage("finishing");
//       } else {
//         setStage("finished");
//         scheduleHistoryRefresh(bulkId);
//       }
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [progressCurrent, progressTotal, downloadUrl, backgroundMode]);

//   // Cleanup blob URL
//   useEffect(() => {
//     return () => {
//       if (downloadUrl) URL.revokeObjectURL(downloadUrl);
//     };
//   }, [downloadUrl]);

//   /** ───────────────── Handlers ───────────────── */
//   const resetAll = () => {
//     setDownloadUrl("");
//     setProgressCurrent(0);
//     setProgressTotal(0);
//     setStage("idle");
//     setLiveCounts({ valid: 0, invalid: 0, risky: 0, unknown: 0 });
//     setBulkId(null);
//     setPreflight(null);
//     processedEmailsRef.current = new Set();
//     clearSession();
//   };

//   const fileInputRef = useRef(null);
//   const clearFileInput = () => {
//     setFile(null);
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   };

//   const handleFileChange = (e) => {
//     setFile(e.target.files[0] || null);
//     // keep current session if user just picked a new file but hasn’t preflighted yet
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setIsDragging(false);
//     const droppedFile = e.dataTransfer.files?.[0];
//     if (droppedFile && droppedFile.name.toLowerCase().endsWith(".xlsx")) {
//       setFile(droppedFile);
//     } else {
//       toast.error("❌ Please drop a valid .xlsx Excel file");
//     }
//   };
//   const handleDragOver = (e) => {
//     e.preventDefault();
//     setIsDragging(true);
//   };
//   const handleDragLeave = () => setIsDragging(false);

//   // 1) PRE-FLIGHT → stores original in GridFS and returns stats + bulkId
//   const handleOpenPreflight = async () => {
//     if (!file) {
//       toast.warn("⚠️ Please select an Excel file (.xlsx)");
//       return;
//     }
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("sessionId", sessionIdRef.current);

//     try {
//       const headers = { ...apiHeaders() };
//       // NOTE: let axios set multipart boundary automatically
//       const { data } = await axios.post(
//         `${API_BASE}/api/bulk/preflight`,
//         formData,
//         { headers }
//       );

//       setBulkId(data.bulkId);
//       saveName(data.bulkId, data.fileName);
//       const pf = {
//         fileName: data.fileName,
//         dateISO: data.date,
//         totals: {
//           emails: data.totals?.totalRows ?? 0,
//           invalidFormat: data.totals?.invalidFormat ?? 0,
//           duplicates: data.totals?.duplicates ?? 0,
//           domains: data.totals?.domainsCount ?? 0,
//         },
//         creditsRequired: data.creditsRequired ?? 0,
//         bulkId: data.bulkId,
//       };
//       setPreflight(pf);
//       setShowDialog(true);
//       setStage("preparing");
//       setLiveCounts({ valid: 0, invalid: 0, risky: 0, unknown: 0 });
//       processedEmailsRef.current = new Set();
//       saveSession({
//         bulkId: data.bulkId,
//         sessionId: sessionIdRef.current,
//         preflight: pf,
//         stage: "preparing",
//         started: false,
//         username: getUser(),
//         at: Date.now(),
//       });
//       setStarted(false);
//     } catch (e) {
//       const msg = e?.response?.data || e?.message || "Preflight failed";
//       toast.error(`❌ ${msg}`);
//     }
//   };

//   // 2) START: either stream XLSX or run in background (no download)

//   const doStartValidation = async () => {
//     if (!bulkId) return;

//     setUploading(true);
//     setDownloadUrl("");
//     setProgressCurrent(0);
//     setProgressTotal(0);

//     // capture before we mutate state
//     const theId = bulkId;
//     const body = {
//       bulkId: theId,
//       sessionId: sessionIdRef.current,
//       ...(backgroundMode ? { noDownload: true } : {}),
//     };
//     const headers = { ...apiHeaders(), "Content-Type": "application/json" };

//     try {
//       if (backgroundMode) {
//         // 1) create the strip immediately
//         setBgJobs((prev) => [
//           ...prev.filter((j) => j.bulkId !== theId),
//           {
//             bulkId: theId,
//             name: preflight?.fileName || "bulk.xlsx",
//             progressPct: 0,
//             state: "running",
//             expiresAt: null,
//           },
//         ]);

//         // 2) close dialog & reset foreground state immediately
//         setShowDialog(false);
//         clearFileInput();
//         clearSession();
//         setStarted(false);
//         setBulkId(null); // prevents modal progress from changing stages
//         setStage("idle");

//         // 3) fire-and-forget the request (do NOT await)
//         axios
//           .post(`${API_BASE}/api/bulk/start`, body, { headers })
//           .then(({ data }) => {
//             if (!data?.ok && !data?.canceled) {
//               toast.error("Background start failed");
//               setBgJobs((prev) => prev.filter((j) => j.bulkId !== theId));
//               return;
//             }
//             // 🔔 tell History to refresh (server already set state=running)
//             announceJobEvent("bulk:job-started", { bulkId: theId });
//           })
//           .catch((err) => {
//             toast.error(
//               `❌ Background start error: ${err?.response?.data || err.message}`
//             );
//             setBgJobs((prev) => prev.filter((j) => j.bulkId !== theId));
//           });

//         setUploading(false);
//         toast.info("▶️ Running in background… You can continue working.");
//         return;
//       }

//       // === normal/foreground path (unchanged) ===
//       const resp = await axios.post(`${API_BASE}/api/bulk/start`, body, {
//         headers,
//         responseType: "blob",
//         timeout: 0,
//       });
//       const contentType = (resp.headers && resp.headers["content-type"]) || "";
//       const blob = new Blob([resp.data], {
//         type: contentType || "application/octet-stream",
//       });
//       const url = URL.createObjectURL(blob);
//       setDownloadUrl(url);
//       setStage("finished");
//       scheduleHistoryRefresh(bulkId);
//       if (progressTotal > 0) setProgressCurrent(progressTotal);
//       toast.success("✅ Bulk validation complete!");
//     } catch (err) {
//       const msg = err?.response?.data || err.message || "Start failed";
//       toast.error(`❌ ${msg}`);
//       setStage("idle");
//       setShowDialog(false);
//       clearSession();
//     } finally {
//       setUploading(false);
//     }
//   };

//   // Cancel job
//   const handleCancel = async () => {
//     if (!bulkId) return;
//     try {
//       await axios.post(
//         `${API_BASE}/api/bulk/cancel`,
//         { bulkId, username: getUser() },
//         { headers: { ...apiHeaders(), "Content-Type": "application/json" } }
//       );
//       setStage("idle");
//       scheduleHistoryRefresh(bulkId);
//       toast.success("🛑 Job canceled");
//     } catch (e) {
//       toast.error(`❌ Cancel failed: ${e?.response?.data || e.message}`);
//     }
//   };

//   const announceJobEvent = (type, detail) => {
//     try {
//       window.dispatchEvent(new CustomEvent(type, { detail }));
//     } catch {}
//   };

//   // Delete job (hard=true to remove files from GridFS)
//   const handleDeleteServer = async () => {
//     if (!bulkId || deleting) {
//       if (!bulkId) resetAll();
//       return;
//     }

//     setDeleting(true);
//     const currentBulkId = bulkId;

//     // 🔹 Clear UI optimistically so the dialog closes even if server is slow
//     clearSession();
//     setShowDialog(false);
//     clearFileInput();
//     setBgJobs((prev) => prev.filter((x) => x.bulkId !== currentBulkId));
//     removeName(currentBulkId);
//     setStarted(false);
//     setBackgroundMode(false);
//     resetAll(); // clears bulkId, counts, progress, etc.

//     try {
//       await axios.delete(
//         `${API_BASE}/api/bulk/${encodeURIComponent(currentBulkId)}`,
//         {
//           headers: apiHeaders(),
//           params: {
//             username: getUser(),
//             sessionId: sessionIdRef.current,
//             hard: "true",
//           },
//           timeout: 10000, // prevent infinite spinner
//         }
//       );
//       toast.success("🧹 Job deleted");
//       scheduleHistoryRefresh(currentBulkId);
//     } catch (e) {
//       toast.error(`❌ Delete failed: ${e?.response?.data || e.message}`);
//     } finally {
//       setDeleting(false);
//     }
//   };

//   // Download original/result by bulkId (needs headers, so fetch as blob)
//   const downloadBy = async (kind, idOverride) => {
//     const id = idOverride || bulkId;
//     if (!id) return;
//     try {
//       const resp = await axios.get(`${API_BASE}/api/bulk/${kind}`, {
//         headers: apiHeaders(),
//         params: { bulkId: id, username: getUser() },
//         responseType: "blob",
//       });
//       const ct = resp.headers["content-type"] || "application/octet-stream";
//       const blob = new Blob([resp.data], { type: ct });
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       const baseName = idOverride
//         ? lookupName(id)
//         : preflight?.fileName || "emails.xlsx";
//       a.href = url;
//       a.download =
//         kind === "original"
//           ? baseName || "uploaded.xlsx"
//           : `validated_${baseName || "emails"}.xlsx`;
//       a.click();
//       URL.revokeObjectURL(url);
//       if (kind === "result" && idOverride) {
//         setBgJobs((prev) => prev.filter((j) => j.bulkId !== idOverride));
//       }
//     } catch (e) {
//       toast.error(`❌ Download failed: ${e?.response?.data || e.message}`);
//     }
//   };

//   // Dialog actions
//   const handleDialogClose = () => setShowDialog(false);

//   const handleProceed = () => {
//     saveSession({
//       bulkId,
//       sessionId: sessionIdRef.current,
//       preflight,
//       stage: "preparing",
//       started: true,
//       username: getUser(),
//       at: Date.now(),
//     });
//     setStarted(true);
//     setStage("preparing"); // will flip to "validating" on first WS tick
//     doStartValidation();
//   };

//   /** ───────────────── UI helpers ───────────────── */
//   const percent =
//     progressTotal > 0
//       ? Math.max(
//           0,
//           Math.min(100, Math.round((progressCurrent / progressTotal) * 100))
//         )
//       : 0;

//   const progressLabel =
//     progressTotal > 0
//       ? `${progressCurrent} / ${progressTotal} • ${percent}%`
//       : stage === "preparing"
//       ? "Preparing…"
//       : uploading
//       ? "Validating…"
//       : "";

//   const donutSegments = (() => {
//     const total = Math.max(
//       1,
//       liveCounts.valid +
//         liveCounts.invalid +
//         liveCounts.risky +
//         liveCounts.unknown || 0
//     );
//     return [
//       { key: "valid", color: "#2ecc71", frac: (liveCounts.valid || 0) / total },
//       { key: "risky", color: "#f39c12", frac: (liveCounts.risky || 0) / total },
//       {
//         key: "invalid",
//         color: "#e74c3c",
//         frac: (liveCounts.invalid || 0) / total,
//       },
//       {
//         key: "unknown",
//         color: "#bdc3c7",
//         frac: (liveCounts.unknown || 0) / total,
//       },
//     ];
//   })();

//   // ─── Background jobs summary (counts + overall %) ───
//   const runningJobs = bgJobs.filter((j) => j.state === "running");
//   const doneJobs = bgJobs.filter((j) => j.state === "done");
//   const runningCount = runningJobs.length;
//   const doneCount = doneJobs.length;
//   const avgRunningPct = runningCount
//     ? Math.round(
//         runningJobs.reduce((sum, j) => sum + (j.progressPct || 0), 0) /
//           runningCount
//       )
//     : 0;

//   return (
//     <>
//       <div className="bulk-wrapper fancy-bg">
//         <div className="bulk-validator">
//           <header className="bulk-header">
//             <div className="title-wrap">
//               <div className="app-icon" aria-hidden>
//                 📥
//               </div>
//               <h2>Bulk Email Validator</h2>
//             </div>
//             <div className="header-right">
//               <span className={`stage-chip stage-${stage}`}>
//                 {stage === "idle" && "Idle"}
//                 {stage === "preparing" && "Preparing"}
//                 {stage === "validating" && "Validating"}
//                 {stage === "finishing" && "Finishing"}
//                 {stage === "finished" && "Finished"}
//               </span>
//               <a
//                 href={`${API_BASE}/api/bulk/download-template`}
//                 className="download-btn"
//                 title="Download .xlsx template"
//               >
//                 <span className="btn-ico" aria-hidden>
//                   📄
//                 </span>{" "}
//                 Template
//               </a>
//             </div>
//           </header>

//           {/* Upload area */}
//           <div
//             className={`drop-zone ${isDragging ? "dragging" : ""}`}
//             onDrop={handleDrop}
//             onDragOver={handleDragOver}
//             onDragLeave={handleDragLeave}
//             role="button"
//             tabIndex={0}
//           >
//             <div className="dz-illustration" aria-hidden>
//               <div className="dz-cloud" />
//             </div>

//             {file ? (
//               <p className="dz-text">
//                 <span className="file-tag">📄</span>
//                 <strong>{file.name}</strong>
//               </p>
//             ) : (
//               <p className="dz-text muted">
//                 <strong>Drag & drop</strong> your Excel file here, or click to
//                 browse
//               </p>
//             )}

//             <input
//               ref={fileInputRef}
//               type="file"
//               accept=".xlsx"
//               onChange={handleFileChange}
//               className="dz-input"
//               aria-label="Upload Excel file"
//             />
//           </div>

//           <div className="action-row">
//             <button
//               onClick={handleOpenPreflight}
//               disabled={!file || uploading}
//               className={`primary-btn ${uploading ? "loading" : ""}`}
//             >
//               <span className="btn-ico" aria-hidden>
//                 🚀
//               </span>
//               Upload &amp; Validate
//             </button>

//             {(downloadUrl || stage === "finishing" || stage === "finished") && (
//               <a
//                 href={downloadUrl || "#"}
//                 onClick={(e) => {
//                   if (!downloadUrl) e.preventDefault();
//                 }}
//                 download={`results_${Date.now()}.xlsx`}
//                 className={`download-btn ghost ${
//                   downloadUrl ? "" : "disabled"
//                 }`}
//                 style={{ marginLeft: 12 }}
//                 title={
//                   downloadUrl
//                     ? "Download validated results"
//                     : "Preparing download…"
//                 }
//               >
//                 <span className="btn-ico" aria-hidden>
//                   ⬇️
//                 </span>
//                 {downloadUrl ? "Download Results" : "Preparing…"}
//               </a>
//             )}
//           </div>

//           {/* ─────────────── Dialog ─────────────── */}
//           {showDialog && (
//             <div className="modal-backdrop" role="dialog" aria-modal="true">
//               <div className="modal-panel">
//                 {/* header */}
//                 <div className="modal-head">
//                   <div className="mh-left">
//                     <div className="mh-title">
//                       {preflight?.fileName || "Bulk.xlsx"}
//                     </div>
//                     <div className="mh-date">
//                       {new Date(
//                         preflight?.dateISO || Date.now()
//                       ).toLocaleString()}
//                     </div>
//                   </div>
//                   <button
//                     className="modal-x"
//                     onClick={handleDialogClose}
//                     aria-label="Close"
//                   >
//                     ✕
//                   </button>
//                 </div>

//                 {/* body */}
//                 <div className="modal-body two-col">
//                   <div className="col-left">
//                     {/* STEP 1: preflight summary */}
//                     {stage === "preparing" && (
//                       <>
//                         <div className="preflight-summary">
//                           <div className="pf-row">
//                             <div className="pf-label">emails</div>
//                             <div className="pf-value">
//                               {preflight?.totals?.emails ?? 0}
//                             </div>
//                           </div>
//                           <div className="pf-row">
//                             <div className="pf-label">invalid format</div>
//                             <div className="pf-value">
//                               {preflight?.totals?.invalidFormat ?? 0}
//                             </div>
//                           </div>
//                           <div className="pf-row">
//                             <div className="pf-label">duplicates</div>
//                             <div className="pf-value">
//                               {preflight?.totals?.duplicates ?? 0}
//                             </div>
//                           </div>
//                           <div className="pf-row">
//                             <div className="pf-label">domains</div>
//                             <div className="pf-value">
//                               {preflight?.totals?.domains ?? 0}
//                             </div>
//                           </div>
//                         </div>

//                         {/* background mode toggle */}
//                         <label
//                           style={{
//                             display: "flex",
//                             alignItems: "center",
//                             gap: 8,
//                             marginTop: 8,
//                           }}
//                         >
//                           <input
//                             type="checkbox"
//                             checked={backgroundMode}
//                             onChange={(e) =>
//                               setBackgroundMode(!!e.target.checked)
//                             }
//                           />
//                           Run in background (don’t auto-download result)
//                         </label>
//                       </>
//                     )}

//                     {/* STEP 2: live counts */}
//                     {stage !== "preparing" && (
//                       <div className="live-counts">
//                         <div className="lc-item">
//                           <span className="dot dot-green" /> deliverable
//                           <strong>{liveCounts.valid}</strong>
//                         </div>
//                         <div className="lc-item">
//                           <span className="dot dot-orange" /> risky
//                           <strong>{liveCounts.risky}</strong>
//                         </div>
//                         <div className="lc-item">
//                           <span className="dot dot-red" /> undeliverable
//                           <strong>{liveCounts.invalid}</strong>
//                         </div>
//                         <div className="lc-item">
//                           <span className="dot dot-grey" /> unknown
//                           <strong>{liveCounts.unknown}</strong>
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   <div className="col-right">
//                     {/* Donut */}
//                     <div className="donut-wrap">
//                       <Donut
//                         empty={stage === "preparing"}
//                         segments={stage === "preparing" ? [] : donutSegments}
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 {/* footer */}
//                 <div className="modal-foot">
//                   {/* Credits (step 1) */}
//                   {stage === "preparing" && (
//                     <div className="credits-box">
//                       <div className="cb-title">Verification</div>
//                       <div className="cb-credits">
//                         {preflight?.creditsRequired ?? 0} credits
//                       </div>
//                     </div>
//                   )}

//                   {/* Progress bar (live) */}
//                   {stage !== "preparing" && (
//                     <div className="bulk-progress in-modal">
//                       <div className="progress-top">
//                         <div className="progress-label">{progressLabel}</div>
//                         <div className="progress-badge">{percent}%</div>
//                       </div>
//                       <div className="bulk-progress-track">
//                         <div
//                           className={`bulk-progress-bar ${
//                             percent < 100 ? "striped" : "done"
//                           }`}
//                           style={{ width: `${percent}%` }}
//                         />
//                       </div>
//                     </div>
//                   )}

//                   {/* Buttons */}
//                   <div className="foot-actions">
//                     {stage === "preparing" && (
//                       <>
//                         <button
//                           className="ghost danger"
//                           onClick={handleDeleteServer}
//                           disabled={uploading || deleting}
//                         >
//                           {deleting ? "Deleting…" : "🗑 Delete"}
//                         </button>

//                         <button
//                           className="primary"
//                           onClick={handleProceed}
//                           disabled={uploading}
//                         >
//                           {backgroundMode ? "Start in Background" : "Proceed"}
//                         </button>
//                       </>
//                     )}

//                     {stage === "finished" && (
//                       <a
//                         href={downloadUrl || "#"}
//                         onClick={(e) => {
//                           if (!downloadUrl) e.preventDefault();
//                         }}
//                         download={`results_${Date.now()}.xlsx`}
//                         className={`primary ${downloadUrl ? "" : "disabled"}`}
//                       >
//                         ⬇️ Download
//                       </a>
//                     )}
//                   </div>

//                   {stage === "finished" && (
//                     <div className="finish-note">Validation complete 🎉</div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ─────────────── Background Jobs Dock (below component) ─────────────── */}
//         {bgJobs.length > 0 && (
//           <div className="bg-dock" role="region" aria-label="Background jobs">
//             <div className="bg-dock-inner">
//               <div className="bg-dock-head">
//                 <div className="bg-dock-title">
//                   <span aria-hidden>⏱</span> Recent Background jobs
//                 </div>
//                 <div className="bg-dock-meta">
//                   {runningCount} running • {doneCount} done
//                   {runningCount > 0 ? ` • avg ${avgRunningPct}%` : ""}
//                 </div>
//                 <div className="bg-dock-actions">
//                   {doneCount > 0 && (
//                     <button
//                       className="bg-dock-btn"
//                       onClick={() =>
//                         setBgJobs((prev) =>
//                           prev.filter((j) => j.state !== "done")
//                         )
//                       }
//                       title="Dismiss completed"
//                     >
//                       Clear completed
//                     </button>
//                   )}
//                 </div>
//               </div>

//               <div className="bg-dock-list">
//                 {bgJobs.map((j) => (
//                   <div key={j.bulkId} className={`bg-card ${j.state}`}>
//                     <div className="bg-card-top">
//                       <div className="bg-card-name" title={j.name}>
//                         {j.name}
//                       </div>
//                       <span
//                         className={`bg-chip ${
//                           j.state === "done" ? "done" : "running"
//                         }`}
//                       >
//                         {j.state === "done" ? "Done" : "Running"}
//                       </span>
//                     </div>

//                     <div className="bg-card-track">
//                       <div
//                         className="bg-card-bar"
//                         style={{ width: `${j.progressPct}%` }}
//                       />
//                     </div>

//                     <div className="bg-card-bottom">
//                       <span className="bg-card-pct">{j.progressPct}%</span>
//                       <div className="bg-card-actions">
//                         {j.state === "running" ? (
//                           <button
//                             className="bg-card-btn"
//                             onClick={async () => {
//                               try {
//                                 await axios.post(
//                                   `${API_BASE}/api/bulk/cancel`,
//                                   { bulkId: j.bulkId, username: getUser() },
//                                   {
//                                     headers: {
//                                       ...apiHeaders(),
//                                       "Content-Type": "application/json",
//                                     },
//                                   }
//                                 );
//                               } catch {}
//                             }}
//                             title="Cancel validation"
//                           >
//                             🛑 Cancel
//                           </button>
//                         ) : (
//                           <>
//                             <button
//                               className="bg-card-btn"
//                               onClick={() => downloadBy("result", j.bulkId)}
//                               title="Download results"
//                             >
//                               ⬇️ Download
//                             </button>
//                             <button
//                               className="bg-card-btn text"
//                               onClick={() =>
//                                 setBgJobs((prev) =>
//                                   prev.filter((x) => x.bulkId !== j.bulkId)
//                                 )
//                               }
//                               title="Dismiss"
//                             >
//                               ×
//                             </button>
//                           </>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}
//         <div className="bh-outer">
//           <BulkHistory refreshKey={historyRefreshKey} />
//         </div>
//       </div>
//     </>
//   );
// };

// export default BulkValidator;

// BulkValidator.jsx (MULTI-CARD FLOW UI — matches screenshots + persistence fixes)
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import "./BulkValidator.css";
import BulkHistory from "./BulkHistory";

// /** ───────────────── Endpoint resolution ───────────────── */
// const DEFAULT_API_PORT = 5000;
// const isBrowser = typeof window !== "undefined";
// const loc = isBrowser
//   ? window.location
//   : { protocol: "http:", hostname: "localhost", host: "localhost" };
// const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(loc?.hostname || "");

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

// const API_BASE =
//   envApi ||
//   (isLocalHost
//     ? `http://localhost:${DEFAULT_API_PORT}`
//     : `${loc.protocol}//${loc.host}`);

// const WS_URL =
//   envWs ||
//   (API_BASE.startsWith("http")
//     ? API_BASE.replace(/^http/i, "ws").replace(/\/+$/, "")
//     : (loc.protocol === "https:" ? "wss:" : "ws:") +
//       (isLocalHost ? `//localhost:${DEFAULT_API_PORT}` : `//${loc.host}`));

// const BASIC_AUTH_B64 =
//   (typeof process !== "undefined" &&
//     process.env &&
//     process.env.REACT_APP_BULK_AUTH_B64) ||
//   "";

// const PROGRESS_POLL_MS = 700;

/** ───────────────── Endpoint resolution (HARDCODED FOR DEBUG) ───────────────── */

// ⚠️ TEMP: force backend + ws to production domain only (bypasses env + localhost logic)
const API_BASE = process.env.REACT_APP_API_BASE;
const WS_URL = process.env.REACT_APP_WS_URL;

console.log(
  "[BulkValidator][HARDCODED] API_BASE =",
  API_BASE,
  "WS_URL =",
  WS_URL,
);

// keep these as-is (auth + polling)
const BASIC_AUTH_B64 =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_BULK_AUTH_B64) ||
  "";

const PROGRESS_POLL_MS = 700;

const getUser = () =>
  typeof localStorage !== "undefined"
    ? (localStorage.getItem("loggedInUser") || "").trim()
    : "";

const apiHeaders = () => {
  const h = {
    "ngrok-skip-browser-warning": "true",
    "X-User": getUser(),
  };
  if (BASIC_AUTH_B64) h["Authorization"] = `Basic ${BASIC_AUTH_B64}`;
  return h;
};

const normTotals = (t = {}) => ({
  emails: t.totalRowsWithEmailCell ?? 0,
  emptyOrJunk: t.emptyOrJunk ?? 0,
  invalidFormat: t.invalidFormat ?? 0,
  duplicates: t.duplicates ?? 0,
  uniqueValid: t.uniqueValid ?? 0,
  errorsFound: t.errorsFound ?? 0,
  cleanupSaves: t.cleanupSaves ?? 0,
});

const stageFromStatePhase = (state = "", phase = "") => {
  const s = String(state || "");
  const p = String(phase || "");

  if (s === "failed") return "failed";
  if (s === "done") return "completed";
  if (s === "running" || p === "running") return "validating";
  if (s === "cleaning" || p === "cleaning") return "cleaning";

  // preflight finished:
  if (s === "needs_cleanup") return "report";
  if (s === "needs_fix") return "needs_fix";
  if (s === "ready") return "ready";

  // fallback:
  if (p === "preflight") return "analyzing";
  return "analyzing";
};

const bulkItemToJob = (item) => {
  const totals = normTotals(item.totals || {});
  const counts = item.counts || { valid: 0, invalid: 0, risky: 0, unknown: 0 };
  const doneFromCounts =
    (counts.valid || 0) +
    (counts.invalid || 0) +
    (counts.risky || 0) +
    (counts.unknown || 0);

  // ✅ prefer backend persisted progress (stable)
  const done =
    typeof item.progressCurrent === "number"
      ? item.progressCurrent
      : doneFromCounts;

  const total =
    typeof item.progressTotal === "number" && item.progressTotal > 0
      ? item.progressTotal
      : (item.totalRows ?? totals.uniqueValid ?? item.creditsRequired ?? 0);

  return {
    uiId: item.bulkId,
    bulkId: item.bulkId,
    fileName: item.fileName || "bulk.xlsx",
    createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),

    totals,
    creditsRequired: item.creditsRequired ?? 0,
    creditsUsed: item.creditsUsed ?? 0,

    cleaned: item.cleaned || null,

    counts,
    progressCurrent: done,
    progressTotal: total,
    progressPct:
      total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,

    state: item.state || "",
    stage: stageFromStatePhase(item.state, item.phase),

    completedAt: item.finishedAt ? new Date(item.finishedAt).getTime() : null,
    error: "",
  };
};

const fmtDT = (isoOrMs) => {
  try {
    const d = new Date(isoOrMs);
    return d.toLocaleString();
  } catch {
    return "";
  }
};

const pct = (n, d) => {
  const dd = Math.max(1, d || 0);
  return Math.max(0, Math.min(100, Math.round((n * 100) / dd)));
};

function UploadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 16V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 9l5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 20h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 11l5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 21h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BulkValidator = () => {
  const [activeTab, setActiveTab] = useState("validate");

  // left uploader
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // jobs (multiple cards)
  const [jobs, setJobs] = useState([]);
  const sessionIdRef = useRef(uuidv4());
  const wsRef = useRef(null);

  // Copy & Paste modal
  const [cpOpen, setCpOpen] = useState(false);
  const [cpFileName, setCpFileName] = useState("filename.xlsx");
  const [cpText, setCpText] = useState("");

  const cpEmails = useMemo(() => {
    const arr = String(cpText || "")
      .split(/[\s,;]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return arr;
  }, [cpText]);

  const cpCount = cpEmails.length;

  // ───────────────── WS: update any job by bulkId ─────────────────
  useEffect(() => {
    try {
      const user = encodeURIComponent(getUser());
      const sid = encodeURIComponent(sessionIdRef.current);
      const ws = new WebSocket(`${WS_URL}/?sessionId=${sid}&user=${user}`);
      wsRef.current = ws;

      ws.onopen = () => {
        try {
          ws.send(
            JSON.stringify({
              sessionId: sessionIdRef.current,
              user: getUser(),
            }),
          );
        } catch {}
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // phase/state updates (preflight/cleaned/etc.)
          if (
            data?.bulkId &&
            (data.phase || data.state) &&
            data?.type !== "progress" &&
            data?.type !== "bulk:stats" &&
            data?.type !== "bulk:done"
          ) {
            const bulkId = data.bulkId;

            setJobs((prev) =>
              prev.map((j) => {
                if (j.bulkId !== bulkId) return j;

                const nextState = data.state || j.state;
                const nextStage = stageFromStatePhase(
                  nextState,
                  data.phase || "",
                );

                return {
                  ...j,
                  state: nextState,
                  stage: nextStage,
                  totals: data.totals ? normTotals(data.totals) : j.totals,
                  creditsRequired: data.creditsRequired ?? j.creditsRequired,
                  cleaned: data.cleaned
                    ? { ...j.cleaned, ...data.cleaned }
                    : j.cleaned,
                };
              }),
            );
          }

          // progress updates
          if (
            data?.type === "progress" &&
            data.bulkId &&
            typeof data.current === "number" &&
            typeof data.total === "number"
          ) {
            const bulkId = data.bulkId;
            setJobs((prev) =>
              prev.map((j) => {
                if (j.bulkId !== bulkId) return j;
                // ✅ never allow progress to go backwards (fixes blinking on tab switch)
                const incomingTotal = data.total || 0;
                const incomingCurrent = data.current || 0;

                // total can increase, never decrease
                const nextTotal = Math.max(j.progressTotal || 0, incomingTotal);

                // current can increase, never decrease
                const nextCurrent = Math.max(
                  j.progressCurrent || 0,
                  incomingCurrent,
                );

                // clamp current to total (if total known)
                const safeCurrent =
                  nextTotal > 0
                    ? Math.min(nextTotal, nextCurrent)
                    : nextCurrent;

                const nextPct =
                  nextTotal > 0
                    ? Math.min(100, Math.round((safeCurrent / nextTotal) * 100))
                    : 0;

                // const completedNow = nextTotal > 0 && safeCurrent >= nextTotal;

                // return {
                //   ...j,
                //   stage:
                //     j.stage === "completed"
                //       ? "completed"
                //       : completedNow
                //       ? "completed"
                //       : "validating",
                //   progressCurrent: safeCurrent,
                //   progressTotal: nextTotal,
                //   progressPct: nextPct,
                //   completedAt:
                //     completedNow && !j.completedAt ? Date.now() : j.completedAt,
                // };
                return {
                  ...j,
                  stage: j.stage === "completed" ? "completed" : "validating",
                  progressCurrent: safeCurrent,
                  progressTotal: nextTotal,
                  progressPct: nextPct,
                };
              }),
            );
          }

          if (data?.type === "bulk:done" && data.bulkId) {
            const bulkId = data.bulkId;
            setJobs((prev) =>
              prev.map((j) =>
                j.bulkId === bulkId
                  ? {
                      ...j,
                      stage: "completed",
                      state: "done",
                      creditsUsed: data.creditsUsed ?? j.creditsUsed ?? 0,
                      counts: data.counts
                        ? { ...j.counts, ...data.counts }
                        : j.counts,
                      completedAt: data.finishedAt
                        ? new Date(data.finishedAt).getTime()
                        : Date.now(),
                    }
                  : j,
              ),
            );
          }

          // aggregated counts
          if (data?.type === "bulk:stats" && data.bulkId && data.counts) {
            const bulkId = data.bulkId;
            const counts = {
              valid: data.counts.valid || 0,
              risky: data.counts.risky || 0,
              invalid: data.counts.invalid || 0,
              unknown: data.counts.unknown || 0,
            };
            setJobs((prev) =>
              prev.map((j) => (j.bulkId === bulkId ? { ...j, counts } : j)),
            );
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch {}

    return () => {
      try {
        wsRef.current && wsRef.current.close();
      } catch {}
    };
  }, []);

  // ───────────────── Rehydrate cards from DB (fix: loader disappears on tab switch) ─────────────────
  useEffect(() => {
    const user = getUser();
    if (!user) return;

    const rehydrate = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/bulk/list`, {
          headers: apiHeaders(),
          params: {
            username: user,
            limit: 5,
          },
        });

        const items = res.data?.items || [];
        const nextJobs = items.map(bulkItemToJob);

        // ✅ keep newest at top (backend already sorted)
        setJobs((prev) => {
          const byId = new Map(prev.map((j) => [j.bulkId, j]));

          return nextJobs.map((fresh) => {
            const old = byId.get(fresh.bulkId);
            if (!old) return fresh;

            const oldValidating = old.stage === "validating";
            const freshSaysDone =
              fresh.state === "done" ||
              fresh.stage === "completed" ||
              fresh.stage === "failed";

            return {
              ...old,
              ...fresh,

              // ✅ don't reset loader/progress during validation
              stage:
                oldValidating && !freshSaysDone ? "validating" : fresh.stage,

              // ✅ keep progress if fresh briefly returns 0
              progressCurrent:
                oldValidating && (fresh.progressCurrent ?? 0) === 0
                  ? old.progressCurrent
                  : fresh.progressCurrent,

              progressTotal:
                oldValidating && (fresh.progressTotal ?? 0) === 0
                  ? old.progressTotal
                  : fresh.progressTotal,

              progressPct:
                oldValidating && (fresh.progressPct ?? 0) === 0
                  ? old.progressPct
                  : fresh.progressPct,
            };
          });
        });

        // ✅ ensure running/cleaning jobs are attached to this sessionId (for WS/progress)
        const needsAttach = items.filter((it) =>
          [
            "running",
            "cleaning",
            "needs_cleanup",
            "needs_fix",
            "ready",
          ].includes(it.state),
        );

        await Promise.all(
          needsAttach.map(async (it) => {
            try {
              await axios.post(
                `${API_BASE}/api/bulk/attach`,
                {
                  bulkId: it.bulkId,
                  sessionId: sessionIdRef.current,
                  username: user,
                },
                {
                  headers: {
                    ...apiHeaders(),
                    "Content-Type": "application/json",
                  },
                },
              );
            } catch {}
          }),
        );
      } catch {}
    };

    // When component mounts
    if (activeTab === "validate") rehydrate();

    // When user comes back to the tab (browser tab focus)
    const onFocus = () => rehydrate();
    window.addEventListener("focus", onFocus);

    return () => window.removeEventListener("focus", onFocus);
  }, [activeTab]);

  // ───────────────── Poll fallback for validating jobs ─────────────────
  useEffect(() => {
    const hasValidating = jobs.some((j) => j.stage === "validating");
    if (!hasValidating) return;

    const t = setInterval(async () => {
      const validating = jobs.filter(
        (j) => j.stage === "validating" && j.bulkId,
      );
      if (!validating.length) return;

      await Promise.all(
        validating.map(async (j) => {
          try {
            const res = await fetch(
              `${API_BASE}/api/bulk/progress?sessionId=${encodeURIComponent(
                sessionIdRef.current,
              )}&bulkId=${encodeURIComponent(j.bulkId)}`,
              { headers: { ...apiHeaders(), "Cache-Control": "no-cache" } },
            );
            const p = await res.json();
            if (
              p &&
              typeof p.total === "number" &&
              typeof p.current === "number"
            ) {
              setJobs((prev) =>
                prev.map((x) => {
                  if (x.bulkId !== j.bulkId) return x;
                  const incomingTotal = p.total || 0;
                  const incomingCurrent = p.current || 0;

                  const nextTotal = Math.max(
                    x.progressTotal || 0,
                    incomingTotal,
                  );
                  const nextCurrent = Math.max(
                    x.progressCurrent || 0,
                    incomingCurrent,
                  );
                  const safeCurrent =
                    nextTotal > 0
                      ? Math.min(nextTotal, nextCurrent)
                      : nextCurrent;

                  const nextPct =
                    nextTotal > 0
                      ? Math.min(
                          100,
                          Math.round((safeCurrent / nextTotal) * 100),
                        )
                      : 0;

                  // const completedNow =
                  //   nextTotal > 0 && safeCurrent >= nextTotal;

                  // return {
                  //   ...x,
                  //   progressCurrent: safeCurrent,
                  //   progressTotal: nextTotal,
                  //   progressPct: nextPct,
                  //   stage:
                  //     x.stage === "completed"
                  //       ? "completed"
                  //       : completedNow
                  //       ? "completed"
                  //       : "validating",
                  //   completedAt:
                  //     completedNow && !x.completedAt
                  //       ? Date.now()
                  //       : x.completedAt,
                  // };

                  return {
                    ...x,
                    progressCurrent: safeCurrent,
                    progressTotal: nextTotal,
                    progressPct: nextPct,
                    stage: x.stage === "completed" ? "completed" : "validating",
                  };
                }),
              );
            }
          } catch {}
        }),
      );
    }, PROGRESS_POLL_MS);

    return () => clearInterval(t);
  }, [jobs]);

  // ───────────────── Left uploader handlers ─────────────────
  const openFilePicker = () => {
    try {
      fileInputRef.current?.click();
    } catch {}
  };

  const clearFileInput = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith(".xlsx")) {
      setFile(droppedFile);
    } else {
      toast.error("❌ Please drop a valid .xlsx Excel file");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // ───────────────── Job actions ─────────────────
  const updateJob = (uiId, patch) => {
    setJobs((prev) =>
      prev.map((j) => (j.uiId === uiId ? { ...j, ...patch } : j)),
    );
  };

  const removeJob = (uiId) => {
    setJobs((prev) => prev.filter((j) => j.uiId !== uiId));
  };

  const handleCopyPasteProceed = async () => {
    const text = (cpText || "").trim();
    if (!text) {
      toast.warn("⚠️ Please paste email addresses");
      return;
    }

    const bulkId = uuidv4();
    const uiId = bulkId;

    // show new card immediately
    setJobs((prev) => [
      {
        uiId,
        bulkId,
        fileName: cpFileName || "EnteredManually.xlsx",
        createdAt: Date.now(),
        stage: "analyzing",
        totals: null,
        creditsRequired: 0,
        counts: { valid: 0, invalid: 0, risky: 0, unknown: 0 },
        progressCurrent: 0,
        progressTotal: 0,
        progressPct: 0,
        cleaned: null,
        creditsUsed: 0,
        state: "analyzing",
        error: "",
      },
      ...prev,
    ]);

    try {
      const { data } = await axios.post(
        `${API_BASE}/api/bulk/preflight-text`,
        {
          bulkId,
          sessionId: sessionIdRef.current,
          username: getUser(),
          fileName: cpFileName || "EnteredManually.xlsx",
          text,
        },
        { headers: { ...apiHeaders(), "Content-Type": "application/json" } },
      );

      const totals = normTotals(data.totals || {});
      const needsCleanup = totals.errorsFound > 0;
      const nextStage = needsCleanup ? "report" : "ready";

      updateJob(uiId, {
        fileName: data.fileName || cpFileName || "EnteredManually.xlsx",
        createdAt: data.date ? new Date(data.date).getTime() : Date.now(),
        totals,
        creditsRequired: data.creditsRequired ?? 0,
        state: data.state || (needsCleanup ? "needs_cleanup" : "ready"),
        stage: nextStage,
      });

      setCpOpen(false);
      toast.success(`✅ ${cpCount} emails detected`);
    } catch (e) {
      updateJob(uiId, {
        stage: "failed",
        error: e?.response?.data || e?.message || "Proceed failed",
      });
      toast.error(`❌ ${e?.response?.data || e?.message || "Proceed failed"}`);
    }
  };

  // 1) VERIFY (preflight) → creates a new card
  const handleVerify = async () => {
    if (!file) {
      toast.warn("⚠️ Please select an Excel file (.xlsx)");
      return;
    }

    const bulkId = uuidv4();
    const uiId = bulkId;
    const tempName = file.name;

    // create job card immediately (loader)
    setJobs((prev) => [
      {
        uiId,
        bulkId,
        fileName: tempName,
        createdAt: Date.now(),
        stage: "analyzing",
        totals: null,
        creditsRequired: 0,
        counts: { valid: 0, invalid: 0, risky: 0, unknown: 0 },
        progressCurrent: 0,
        progressTotal: 0,
        progressPct: 0,
        cleaned: null,
        creditsUsed: 0,
        state: "analyzing",
        error: "",
      },
      ...prev,
    ]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sessionId", sessionIdRef.current);
    formData.append("bulkId", bulkId); // ✅ important (persist job id)

    try {
      setUploading(true);

      const { data } = await axios.post(
        `${API_BASE}/api/bulk/preflight`,
        formData,
        {
          headers: { ...apiHeaders() },
        },
      );

      const totals = normTotals(data.totals || {});
      const needsCleanup = totals.errorsFound > 0;
      const nextStage = needsCleanup ? "report" : "ready";

      updateJob(uiId, {
        // bulkId stays the same (client one)
        fileName: data.fileName || tempName,
        createdAt: data.date ? new Date(data.date).getTime() : Date.now(),
        totals,
        creditsRequired: data.creditsRequired ?? 0,
        state: data.state || (needsCleanup ? "needs_cleanup" : "ready"),
        stage: nextStage,
      });

      clearFileInput();
    } catch (e) {
      updateJob(uiId, {
        stage: "failed",
        error: e?.response?.data || e?.message || "Verify failed",
      });
      toast.error(`❌ ${e?.response?.data || e?.message || "Verify failed"}`);
    } finally {
      setUploading(false);
    }
  };

  // 2) CLEAN UP
  const handleCleanup = async (job) => {
    if (!job?.bulkId) return;

    updateJob(job.uiId, { stage: "cleaning" });

    try {
      const { data } = await axios.post(
        `${API_BASE}/api/bulk/cleanup`,
        {
          bulkId: job.bulkId,
          sessionId: sessionIdRef.current,
          username: getUser(),
        },
        { headers: { ...apiHeaders(), "Content-Type": "application/json" } },
      );

      const invalidRemaining = data.invalidFormatRemaining ?? 0;

      updateJob(job.uiId, {
        cleaned: {
          removedDuplicates: data.removedDuplicates ?? 0,
          removedEmptyOrJunk: data.removedEmptyOrJunk ?? 0,
          cleanedRows: data.cleanedRows ?? 0,
          invalidFormatRemaining: invalidRemaining,
        },
        state: data.state || (invalidRemaining > 0 ? "needs_fix" : "ready"),
        stage: invalidRemaining > 0 ? "needs_fix" : "ready",
      });

      toast.success("✅ File cleaned");
    } catch (e) {
      updateJob(job.uiId, { stage: "report" });
      toast.error(`❌ Cleanup failed: ${e?.response?.data || e.message}`);
    }
  };

  // download invalid format fix file + delete job from DB (hard delete)
  const downloadFix = async (job) => {
    if (!job?.bulkId) return;
    try {
      const resp = await axios.get(`${API_BASE}/api/bulk/download-fix`, {
        headers: apiHeaders(),
        params: { bulkId: job.bulkId, username: getUser() },
        responseType: "blob",
      });

      const ct = resp.headers["content-type"] || "application/octet-stream";
      const blob = new Blob([resp.data], { type: ct });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `fix_invalid_format_${job.fileName || "bulk"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      // ✅ After download: delete the whole bulk session from DB so it doesn't remain in-progress
      await axios.delete(
        `${API_BASE}/api/bulk/${encodeURIComponent(job.bulkId)}`,
        {
          headers: apiHeaders(),
          params: {
            username: getUser(),
            hard: true,
            sessionId: sessionIdRef.current,
          },
        },
      );

      removeJob(job.uiId);
      toast.success("✅ File downloaded. Job removed.");
    } catch (e) {
      toast.error(`❌ Download failed: ${e?.response?.data || e.message}`);
    }
  };

  // start validation (skipInvalidFormat optional)
  const startValidation = async (job, { skipInvalidFormat = false } = {}) => {
    if (!job?.bulkId) return;

    const totalGuess =
      job?.totals?.uniqueValid ||
      job?.creditsRequired ||
      job?.progressTotal ||
      0;

    updateJob(job.uiId, {
      stage: "validating",
      progressCurrent: job.progressCurrent || 0,
      progressTotal: job.progressTotal || totalGuess,
      progressPct: job.progressPct || 0,
      completedAt: null,
      counts: { valid: 0, invalid: 0, risky: 0, unknown: 0 },
    });

    const body = {
      bulkId: job.bulkId,
      sessionId: sessionIdRef.current,
      skipInvalidFormat: !!skipInvalidFormat,
      noDownload: true,
      username: getUser(),
    };

    try {
      await axios.post(`${API_BASE}/api/bulk/start`, body, {
        headers: { ...apiHeaders(), "Content-Type": "application/json" },
        timeout: 0,
      });
      toast.info("▶️ Validation started");
    } catch (e) {
      updateJob(job.uiId, { stage: "ready" });
      toast.error(`❌ Start failed: ${e?.response?.data || e.message}`);
    }
  };

  // download result file (Result ⬇)
  const downloadResult = async (job) => {
    if (!job?.bulkId) return;
    try {
      const resp = await axios.get(`${API_BASE}/api/bulk/result`, {
        headers: apiHeaders(),
        params: { bulkId: job.bulkId, username: getUser() },
        responseType: "blob",
      });

      const ct = resp.headers["content-type"] || "application/octet-stream";
      const blob = new Blob([resp.data], { type: ct });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `validated_${job.fileName || "emails"}.xlsx`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(
        `❌ Result download failed: ${e?.response?.data || e.message}`,
      );
    }
  };

  // ───────────────── UI computed ─────────────────
  const rightContent = useMemo(() => {
    if (!jobs.length) {
      return (
        <div className="bv-empty">
          <div className="bv-emptyIcon" aria-hidden>
            <div className="bv-iconDoc" />
            <div className="bv-iconSheet" />
          </div>
          <div className="bv-emptyTitle">No uploads yet!</div>
          <div className="bv-emptySub">
            Upload a CSV or Excel file to start your bulk <br />
            email validation
          </div>
        </div>
      );
    }

    return (
      <div className="bv-cards">
        {jobs.map((job) => (
          <JobCard
            key={job.uiId}
            job={job}
            onCleanup={() => handleCleanup(job)}
            onContinue={() =>
              startValidation(job, { skipInvalidFormat: false })
            }
            onSkipContinue={() =>
              startValidation(job, { skipInvalidFormat: true })
            }
            onDownloadFix={() => downloadFix(job)}
            onDownloadResult={() => downloadResult(job)}
            onDismiss={() => removeJob(job.uiId)}
          />
        ))}
      </div>
    );
  }, [jobs]);

  return (
    <div
      className={`bulk-wrapper bulkui-bg ${
        activeTab === "history" ? "is-historyPage" : ""
      }`}
    >
      {/* Top header row */}
      <div className="bulkui-topbar">
        <div className="bulkui-title">Bulk Validation</div>

        <div className="bulkui-tabs" role="tablist" aria-label="Bulk tabs">
          <button
            type="button"
            className={`bulkui-tab ${activeTab === "validate" ? "active" : ""}`}
            onClick={() => setActiveTab("validate")}
            role="tab"
            aria-selected={activeTab === "validate"}
          >
            Validate
          </button>
          <button
            type="button"
            className={`bulkui-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
            role="tab"
            aria-selected={activeTab === "history"}
          >
            History
          </button>
        </div>
      </div>

      <div
        className={`bulkui-shell ${
          activeTab === "history" ? "is-history" : ""
        }`}
      >
        {activeTab === "validate" ? (
          <div className="bulkui-grid">
            {/* LEFT */}
            <aside className="bulkui-left">
              <div className="bulkui-lefthead">
                <div className="bulkui-lefttitle">Upload File</div>
                <button
                  type="button"
                  className="bulkui-template"
                  title="Download template"
                  onClick={async () => {
                    try {
                      const resp = await axios.get(
                        `${API_BASE}/api/bulk/download-template`,
                        {
                          headers: apiHeaders(),
                          responseType: "blob",
                        },
                      );

                      const ct =
                        resp.headers["content-type"] ||
                        "application/octet-stream";
                      const blob = new Blob([resp.data], { type: ct });
                      const url = URL.createObjectURL(blob);

                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "email_template.xlsx";
                      a.click();

                      URL.revokeObjectURL(url);
                    } catch (e) {
                      toast.error(
                        `❌ Template download failed: ${e?.message || "Error"}`,
                      );
                    }
                  }}
                >
                  Template
                  <span className="bulkui-templateIcon" aria-hidden>
                    <DownloadIcon />
                  </span>
                </button>
              </div>

              <div
                className={`bulkui-drop ${isDragging ? "dragging" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="bulkui-dropInner">
                  <div className="bulkui-dropIcon">
                    <UploadIcon />
                  </div>

                  <div className="bulkui-dropText">
                    <div className="bulkui-dropMain">Drag &amp; Drop file</div>
                    <div className="bulkui-dropOr">or</div>
                  </div>

                  <div className="bulkui-dropActions">
                    <button
                      type="button"
                      className="bulkui-browseBtn"
                      onClick={openFilePicker}
                    >
                      Browse File
                    </button>
                    <button
                      type="button"
                      className="bulkui-copyLink"
                      onClick={() => {
                        setCpOpen(true);
                        setCpFileName("filename.xlsx");
                        setCpText("");
                      }}
                    >
                      Copy &amp; Paste
                    </button>
                  </div>

                  {file ? (
                    <div className="bulkui-filePill" title={file.name}>
                      {file.name}
                    </div>
                  ) : null}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="bulkui-hiddenInput"
                  aria-label="Upload Excel file"
                />
              </div>

              <div className="bulkui-formats">
                File formats: CSV, XLSX (up to 20 MB)
              </div>

              <button
                className="bulkui-verify"
                onClick={handleVerify}
                disabled={!file || uploading}
              >
                {uploading ? "Verifying..." : "Verify"}
              </button>
            </aside>

            {/* RIGHT */}
            <section className="bulkui-right">{rightContent}</section>
          </div>
        ) : (
          <div className="bh-outer" style={{ marginTop: 0 }}>
            <BulkHistory refreshKey={0} />
          </div>
        )}
      </div>
      {cpOpen && (
        <div className="cp-overlay" role="dialog" aria-modal="true">
          <div className="cp-modal">
            <div className="cp-head">Copy &amp; Paste</div>

            <div className="cp-body">
              <div className="cp-label">Enter File Name</div>
              <input
                className="cp-input"
                value={cpFileName}
                onChange={(e) => setCpFileName(e.target.value)}
                placeholder="filename.xlsx"
              />

              <textarea
                className="cp-textarea"
                value={cpText}
                onChange={(e) => setCpText(e.target.value)}
                placeholder="Copy & paste email addresses"
              />

              <div className="cp-footerRow">
                <div className="cp-count">
                  {cpCount > 0 ? `${cpCount} emails detected` : ""}
                </div>

                <div className="cp-actions">
                  <button
                    type="button"
                    className="cp-cancel"
                    onClick={() => setCpOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cp-proceed"
                    onClick={handleCopyPasteProceed}
                    disabled={!cpText.trim()}
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  //   </div>
  // );
};

function JobCard({
  job,
  onCleanup,
  onContinue,
  onSkipContinue,
  onDownloadFix,
  onDownloadResult,
  onDismiss,
}) {
  const totals = job.totals || {};
  const cleaned = job.cleaned || {};
  const counts = job.counts || { valid: 0, invalid: 0, risky: 0, unknown: 0 };

  const totalValidated =
    (counts.valid || 0) +
    (counts.invalid || 0) +
    (counts.risky || 0) +
    (counts.unknown || 0);

  const showCompleted = job.stage === "completed";
  const showValidating = job.stage === "validating";
  const showAnalyzing = job.stage === "analyzing";
  const showCleaning = job.stage === "cleaning";
  const showReport = job.stage === "report";
  const showNeedsFix = job.stage === "needs_fix";
  const showReady = job.stage === "ready";
  const showCompactStage = showAnalyzing || showCleaning || showValidating;
  const showHeaderMeta = showCompleted;

  const errorsFound = totals.errorsFound ?? 0;

  const StageFileTitle = () =>
    !showCompleted ? <div className="bv-stageFile">{job.fileName}</div> : null;

  const removedTotal =
    (cleaned.removedDuplicates || 0) + (cleaned.removedEmptyOrJunk || 0);
  const syntaxErrors =
    cleaned.invalidFormatRemaining ?? totals.invalidFormat ?? 0;

  const fallbackTotal =
    typeof job.progressTotal === "number" && job.progressTotal > 0
      ? job.progressTotal
      : (job?.totals?.uniqueValid ?? job?.creditsRequired ?? 0);

  const safeCurrent =
    typeof job.progressCurrent === "number" ? job.progressCurrent : 0;

  const progressText =
    fallbackTotal > 0 ? `${safeCurrent} of ${fallbackTotal}` : "Starting…";

  return (
    <div className="bv-card">
      {/* TOP: file + status */}
      <div className="bv-cardTop">
        {/* TOP: show ONLY for completed card */}
        {showHeaderMeta && (
          <div className="bv-cardTop">
            <div className="bv-cardMeta">
              <div className="bv-filename">
                <span className="bv-fileMain">{job.fileName}</span>
              </div>

              <div className="bv-dates">
                <span>Created on: {fmtDT(job.createdAt)}</span>
                <span>
                  Completed on: {fmtDT(job.completedAt || Date.now())}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bv-statusWrap">
          {showCompleted && (
            <div className="bv-status completed">
              <span className="bv-statusIcon">
                <CheckIcon />
              </span>
              Completed
            </div>
          )}

          {showValidating && !showCompactStage && (
            <div className="bv-status progress">In Progress</div>
          )}
        </div>
      </div>

      {/* BODY by stage */}
      {(showAnalyzing || showCleaning) && (
        <div className="bv-figmaStage">
          <div className="bv-figmaName">{job.fileName}</div>
          <div className="bv-figmaLabel">
            {showAnalyzing ? "Verifying" : "Cleaning"}
          </div>

          <div className="bv-figmaTrack is-indeterminate">
            <div className="bv-figmaBar indeterminate" />
          </div>

          {/* numbers hidden for analyzing/cleaning */}
        </div>
      )}

      {showReport && (
        <div className="bv-centerBlock">
          <StageFileTitle />
          <div className="bv-centerTitle">{errorsFound} errors found</div>
          <div className="bv-centerHint">
            Clean Up will save <b>{totals.cleanupSaves ?? 0}</b> credits
          </div>
          <div className="bv-actionsCenter">
            <button className="bv-btn primary" onClick={onCleanup}>
              Clean Up
            </button>
          </div>
        </div>
      )}

      {showNeedsFix && (
        <div className="bv-centerBlock">
          <StageFileTitle />
          <div className="bv-centerTitle">
            {removedTotal} errors removed, {syntaxErrors} syntax errors found
          </div>

          <div className="bv-actionsRow3">
            <button className="bv-btn primary" onClick={onSkipContinue}>
              Skip &amp; Continue
            </button>

            <button className="bv-btn link" onClick={onDownloadFix}>
              Download File
            </button>
          </div>

          <div className="bv-note">
            Download the file, fix the errors, and reupload the corrected
            version using the upload section on the left.
          </div>
        </div>
      )}

      {showReady && (
        <div className="bv-centerBlock">
          <StageFileTitle />
          <div className="bv-centerTitle">0 errors found</div>
          <div className="bv-actionsCenter">
            <button className="bv-btn primary" onClick={onContinue}>
              Continue
            </button>
          </div>
        </div>
      )}

      {showValidating && (
        <div className="bv-figmaStage">
          <div className="bv-figmaName">{job.fileName}</div>
          <div className="bv-figmaLabel">Verifying</div>

          <div className="bv-figmaTrack">
            <div
              className="bv-figmaBar"
              style={{ width: `${job.progressPct || 0}%` }}
            />
          </div>

          <div className="bv-figmaCount">{progressText}</div>
        </div>
      )}

      {showCompleted && (
        <>
          <div className="bv-statsRow">
            <div className="bv-stat">
              <div className="bv-statLabel">Emails</div>
              <div className="bv-statValue">
                {totals.uniqueValid ?? totals.emails ?? totalValidated ?? 0}
              </div>
            </div>

            <div className="bv-stat">
              <div className="bv-statLabel">Valid</div>
              <div className="bv-statValue">
                {counts.valid || 0}{" "}
                <span className="bv-pill green">
                  {pct(counts.valid || 0, totalValidated)}%
                </span>
              </div>
            </div>

            <div className="bv-stat">
              <div className="bv-statLabel">Invalid</div>
              <div className="bv-statValue">
                {counts.invalid || 0}{" "}
                <span className="bv-pill red">
                  {pct(counts.invalid || 0, totalValidated)}%
                </span>
              </div>
            </div>

            <div className="bv-stat">
              <div className="bv-statLabel">Risky</div>
              <div className="bv-statValue">
                {counts.risky || 0}{" "}
                <span className="bv-pill orange">
                  {pct(counts.risky || 0, totalValidated)}%
                </span>
              </div>
            </div>

            <div className="bv-stat">
              <div className="bv-statLabel">Unknown</div>
              <div className="bv-statValue">
                {counts.unknown || 0}{" "}
                <span className="bv-pill gray">
                  {pct(counts.unknown || 0, totalValidated)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bv-bottomRow">
            <div className="bv-credits">
              Credits utilized:{" "}
              <b>{job.creditsUsed ?? job.creditsRequired ?? 0}</b>{" "}
              <span className="bv-info" title="Credits used by this job">
                i
              </span>
            </div>

            <button className="bv-result" onClick={onDownloadResult}>
              Result{" "}
              <span className="bv-resultIcon">
                <DownloadIcon />
              </span>
            </button>
          </div>
        </>
      )}

      {job.stage === "failed" && (
        <div className="bv-centerBlock">
          <StageFileTitle />
          <div className="bv-centerTitle">Failed</div>
          <div className="bv-note">{job.error || "Something went wrong."}</div>
          <div className="bv-actionsCenter">
            <button className="bv-btn soft" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkValidator;
