import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./ToxicityChecker.css";

/* ─────────────────────────────────────────────
   USERNAME RESOLVER (as per your implementation)
────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   AXIOS INSTANCE
────────────────────────────────────────────── */
const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE ||
    (window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : `${window.location.protocol}//${window.location.host}`),
  headers: { "ngrok-skip-browser-warning": "1" },
});

// attach username header + query param automatically
api.interceptors.request.use((config) => {
  const u = getUsername();
  if (u) {
    config.headers = {
      ...(config.headers || {}),
      "X-User": u,
      "ngrok-skip-browser-warning": "1",
    };
    if ((config.method || "get").toLowerCase() === "get") {
      config.params = { ...(config.params || {}), username: u };
    }
  }
  return config;
});

/* ─────────────────────────────────────────────
   HELPER
────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2);
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────── */
const ToxicityChecker = () => {
  const username = getUsername();
  const [file, setFile] = useState(null);
  const [sessionId] = useState(() => uid());
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [stats, setStats] = useState({
    processed: 0,
    total: 0,
    toxicCount: 0,
    cleanCount: 0,
    unknownCount: 0,
  });

  const [history, setHistory] = useState([]);
  const [onlyToxic, setOnlyToxic] = useState(false);
  const [activeBulkId, setActiveBulkId] = useState(null);
  const wsRef = useRef(null);

  /* ─────────────────────────────────────────────
     WEBSOCKET CONNECTION
  ─────────────────────────────────────────────── */
  useEffect(() => {
    let wsUrl;
    try {
      const base =
        process.env.REACT_APP_API_BASE ||
        (window.location.hostname === "localhost"
          ? "http://localhost:5000"
          : `${window.location.protocol}//${window.location.host}`);
      wsUrl = base.replace(/^http/, "ws");
    } catch {
      wsUrl = "ws://localhost:5000";
    }

    const url = `${wsUrl}/?sessionId=${encodeURIComponent(
      sessionId
    )}&user=${encodeURIComponent(username || "")}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "hello", sessionId, user: username }));
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "progress") {
          setProgress((prev) => ({
            current: data.current ?? prev.current ?? 0,
            total: data.total ?? prev.total ?? 0,
          }));
        }
        if (data.type === "bulk:stats" && data.kind === "toxicity") {
          setStats({
            processed: data.processed ?? 0,
            total: data.total ?? 0,
            toxicCount: data.toxicCount ?? 0,
            cleanCount: data.cleanCount ?? 0,
            unknownCount: data.unknownCount ?? 0,
          });
          if (!activeBulkId && data.bulkId)
            setActiveBulkId(String(data.bulkId));
        }
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      try {
        ws.close();
      } catch {}
    };
  }, [sessionId, username, activeBulkId]);

  /* ─────────────────────────────────────────────
     DOWNLOAD CSV (header-safe)
  ─────────────────────────────────────────────── */
  const downloadCsv = async (bulkId, onlyToxic) => {
    try {
      const { data } = await api.get(`/api/toxicity/bulk/download/${bulkId}`, {
        params: {
          username,
          onlyToxic: onlyToxic ? 1 : undefined,
        },
        responseType: "blob",
      });
      const blob = new Blob([data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `toxicity_${bulkId}${onlyToxic ? "_toxic" : ""}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("download error:", err?.response?.data || err);
      alert("Download failed");
    }
  };

  /* ─────────────────────────────────────────────
     HISTORY FETCH
  ─────────────────────────────────────────────── */
  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/api/toxicity/bulk/history", {
        params: { limit: 20 },
      });
      setHistory(data?.items || []);
    } catch (e) {
      console.error("toxicity history error:", e?.response?.data || e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [username]);

  /* ─────────────────────────────────────────────
     UPLOAD HANDLER
  ─────────────────────────────────────────────── */
  const startUpload = async () => {
    if (!file) return;
    if (!username) {
      alert("Please log in again — username not found.");
      return;
    }

    setIsUploading(true);
    setProgress({ current: 0, total: 0 });
    setStats({
      processed: 0,
      total: 0,
      toxicCount: 0,
      cleanCount: 0,
      unknownCount: 0,
    });
    setActiveBulkId(null);

    const form = new FormData();
    form.append("file", file);
    form.append("username", username);
    form.append("sessionId", sessionId);

    try {
      const { data } = await api.post("/api/toxicity/bulk/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data?.ok) {
        setActiveBulkId(String(data.bulkId));
        setTimeout(fetchHistory, 1500);
      } else {
        alert(data?.error || "Upload failed");
      }
    } catch (err) {
      console.error("upload error:", err?.response?.data || err);
      alert(err?.response?.data?.error || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  /* ─────────────────────────────────────────────
     CANCEL HANDLER
  ─────────────────────────────────────────────── */
  const cancelActive = async () => {
    if (!activeBulkId) return;
    try {
      await api.post(`/api/toxicity/bulk/cancel/${activeBulkId}`);
    } catch (e) {
      console.error("cancel error:", e?.response?.data || e);
    }
  };

  /* ─────────────────────────────────────────────
     POLLING FALLBACK (progress)
  ─────────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const { data } = await api.get("/api/toxicity/bulk/progress", {
          params: { sessionId },
        });
        if (data?.current != null) {
          setProgress((p) => ({
            current: data.current,
            total: data.total ?? p.total,
          }));
        }
      } catch {}
    }, 2500);
    return () => clearInterval(t);
  }, [sessionId, username]);

  const percent = useMemo(() => {
    if (!progress.total) return 0;
    return Math.round((progress.current / progress.total) * 100);
  }, [progress]);

  /* ─────────────────────────────────────────────
     UI RENDER
  ─────────────────────────────────────────────── */
  return (
    <div className="toxicity-page" style={{ color: "#000" }}>
      <div className="toxicity-card">
        <h2>Toxicity Checker</h2>
        <div className="uploader">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={isUploading}
          />
          <button onClick={startUpload} disabled={!file || isUploading}>
            {isUploading ? "Uploading…" : "Start Toxicity Check"}
          </button>
          <button
            className="secondary"
            onClick={cancelActive}
            disabled={!activeBulkId}
            title="Cancel the current job"
          >
            Cancel
          </button>
        </div>

        <div className="progress">
          <div className="bar">
            <div className="fill" style={{ width: `${percent}%` }}></div>
          </div>
          <div className="label">
            {progress.current}/{progress.total} ({percent}%)
          </div>
        </div>

        <div className="live-stats">
          <div>
            Processed: <strong>{stats.processed}</strong> / {stats.total}
          </div>
          <div>
            Toxic: <strong className="bad">{stats.toxicCount}</strong>
          </div>
          <div>
            Clean: <strong className="good">{stats.cleanCount}</strong>
          </div>
          <div>
            Unknown: <strong>{stats.unknownCount}</strong>
          </div>
        </div>

        <div className="list-controls">
          <label>
            <input
              type="checkbox"
              checked={onlyToxic}
              onChange={(e) => setOnlyToxic(e.target.checked)}
            />
            Download only toxic results
          </label>
        </div>
      </div>

      <div className="toxicity-card">
        <div className="header-row">
          <h3>Recent Toxicity Jobs</h3>
          <button className="secondary" onClick={fetchHistory}>
            Refresh
          </button>
        </div>
        <table className="toxicity-table">
          <thead>
            <tr>
              <th>When</th>
              <th>File</th>
              <th>Total</th>
              <th>Toxic</th>
              <th>Clean</th>
              <th>Unknown</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {(history || []).map((h) => (
              <tr key={h._id}>
                <td>{new Date(h.createdAt).toLocaleString()}</td>
                <td title={h.originalFilename}>{h.originalFilename}</td>
                <td>{h.total}</td>
                <td className="bad">{h.toxicCount}</td>
                <td className="good">{h.cleanCount}</td>
                <td>{h.unknownCount}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => downloadCsv(h._id, onlyToxic)}
                  >
                    CSV
                  </button>
                </td>
              </tr>
            ))}
            {(!history || history.length === 0) && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", opacity: 0.7 }}>
                  No jobs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ToxicityChecker;
