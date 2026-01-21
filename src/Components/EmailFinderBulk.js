import React, { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import "./EmailFinderBulk.css";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function EmailFinderBulk() {
  const [bulkError, setBulkError] = useState("");
  const [bulkHistory, setBulkHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [previewMap, setPreviewMap] = useState({}); // bulkId -> { rows, total, shown }
  const [openPreview, setOpenPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const pollersRef = useRef({});
  const fileInputRef = useRef(null);

  const sessionIdRef = useRef(
    crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const getUsername = () =>
    (
      localStorage.getItem("loggedInUser") ||
      localStorage.getItem("username") ||
      ""
    ).trim() || "guest";

  // ---------- History ----------
  async function refreshHistory() {
    try {
      const token = localStorage.getItem("token");
      const username = getUsername();
      const url = `${API_BASE}/api/finder/bulk/history?_ts=${Date.now()}`;
      const resp = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-User": username,
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          "If-Modified-Since": "0",
          "ngrok-skip-browser-warning": "1",
        },
        cache: "no-store",
      });
      if (!resp.ok) throw new Error(`history ${resp.status}`);
      const data = await resp.json();
      const serverItems = data?.items || [];

      serverItems.forEach((item) => {
        const active = item.state !== "done" && item.state !== "error";
        if (active && !pollersRef.current[item._id]) {
          pollersRef.current[item._id] = startPolling(item._id);
        }
      });

      Object.keys(pollersRef.current).forEach((id) => {
        const row = serverItems.find((x) => x._id === id);
        if (!row || row.state === "done" || row.state === "error") {
          clearInterval(pollersRef.current[id]);
          delete pollersRef.current[id];
        }
      });

      setBulkHistory(serverItems);
      setBulkError("");
    } catch (e) {
      console.error("bulk history error", e);
      setBulkError(e?.message || "History fetch failed");
    }
  }

  useEffect(() => {
    refreshHistory();
    const t = setInterval(refreshHistory, 5000);
    return () => {
      clearInterval(t);
      Object.values(pollersRef.current).forEach((iv) => clearInterval(iv));
      pollersRef.current = {};
    };
  }, []);

  // ---------- Template ----------
  async function downloadTemplate() {
    try {
      const token = localStorage.getItem("token");
      const username = getUsername();
      const url = `${API_BASE}/api/finder/bulk/template.csv?_ts=${Date.now()}`;
      const res = await axios.get(url, {
        responseType: "blob",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-User": username,
          "ngrok-skip-browser-warning": "1",
        },
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "finder_template.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error("download template error", e?.response?.data || e.message);
      setBulkError("Failed to download template");
    }
  }

  // ---------- Start bulk ----------
  async function startBulk() {
    if (!selectedFile) {
      setBulkError("Please choose a file first.");
      return;
    }

    setBulkError("");
    setBulkUploading(true);
    try {
      const token = localStorage.getItem("token");
      const username = getUsername();
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("sessionId", sessionIdRef.current);

      const url = `${API_BASE}/api/finder/bulk/start?_ts=${Date.now()}`;
      const up = await axios.post(url, form, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-User": username,
          "ngrok-skip-browser-warning": "1",
        },
      });

      const bulkId = up.data?.bulkId;
      if (!bulkId) throw new Error("Start OK but bulkId missing");

      if (!pollersRef.current[bulkId]) {
        pollersRef.current[bulkId] = startPolling(bulkId);
      }

      await refreshHistory();
    } catch (e) {
      console.error("start bulk error", e?.response?.data || e.message);
      setBulkError(e?.response?.data?.error || "Failed to start bulk");
    } finally {
      setBulkUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ---------- Progress ----------
  function startPolling(bulkId) {
    if (pollersRef.current[bulkId]) return pollersRef.current[bulkId];

    const token = localStorage.getItem("token");
    const username = getUsername();

    const interval = setInterval(async () => {
      try {
        const url = `${API_BASE}/api/finder/bulk/progress?bulkId=${encodeURIComponent(
          bulkId
        )}&_ts=${Date.now()}`;

        const resp = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "X-User": username,
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            "If-Modified-Since": "0",
            "ngrok-skip-browser-warning": "1",
          },
          cache: "no-store",
        });

        if (!resp.ok) throw new Error(`progress ${resp.status}`);
        const p = await resp.json();
        setProgressMap((prev) => ({ ...prev, [bulkId]: p }));

        if (p.state === "done" || p.resultReady) {
          clearInterval(interval);
          delete pollersRef.current[bulkId];
          refreshHistory();
        }
      } catch (err) {
        console.error("poll progress error", err);
        setBulkError(err?.message || "Progress polling failed");
        clearInterval(interval);
        delete pollersRef.current[bulkId];
      }
    }, 1500);

    return interval;
  }

  // ---------- Download ----------
  async function downloadFile(bulkId, filename) {
    try {
      const token = localStorage.getItem("token");
      const username = getUsername();
      const url = `${API_BASE}/api/finder/bulk/${bulkId}/result?_ts=${Date.now()}`;
      const res = await axios.get(url, {
        responseType: "blob",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-User": username,
          "ngrok-skip-browser-warning": "1",
        },
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const safe = (filename || "bulk.xlsx").replace(/\.(xlsx|xls|csv)$/i, "");
      a.download = `result_${safe}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error("download file error", e?.response?.data || e.message);
      setBulkError("Download failed");
    }
  }

  // ---------- Inline Preview ----------
  async function loadPreview(bulkId) {
    try {
      const token = localStorage.getItem("token");
      const username = getUsername();
      const url = `${API_BASE}/api/finder/bulk/${bulkId}/preview?limit=100&_ts=${Date.now()}`;
      const res = await axios.get(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-User": username,
          "ngrok-skip-browser-warning": "1",
        },
      });
      setPreviewMap((prev) => ({
        ...prev,
        [bulkId]: res.data || { rows: [] },
      }));
      setOpenPreview(bulkId);
    } catch (e) {
      console.error("preview error", e?.response?.data || e.message);
      setBulkError(e?.response?.data?.error || "Failed to load preview");
    }
  }

  // ---------- Delete ----------
  async function deleteJob(bulkId) {
    try {
      const token = localStorage.getItem("token");
      const username = getUsername();
      const url = `${API_BASE}/api/finder/bulk/${bulkId}?_ts=${Date.now()}`;
      await axios.delete(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-User": username,
          "ngrok-skip-browser-warning": "1",
        },
      });
      setBulkHistory((prev) => prev.filter((x) => x._id !== bulkId));
      setProgressMap((prev) => {
        const clone = { ...prev };
        delete clone[bulkId];
        return clone;
      });
      setPreviewMap((prev) => {
        const clone = { ...prev };
        delete clone[bulkId];
        return clone;
      });
      if (pollersRef.current[bulkId]) {
        clearInterval(pollersRef.current[bulkId]);
        delete pollersRef.current[bulkId];
      }
      if (openPreview === bulkId) setOpenPreview(null);
    } catch (e) {
      console.error("delete job error", e?.response?.data || e.message);
      setBulkError(e?.response?.data?.error || "Delete failed");
    }
  }

  // ---------- Drag & Drop ----------
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) {
      setSelectedFile(f);
      setBulkError("");
    } else {
      setBulkError("Please drop a .xlsx, .xls, or .csv file.");
    }
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const onChoose = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      setBulkError("");
    }
  };
  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const computedHeaderHelp = useMemo(() => {
    if (selectedFile) return `Selected: ${selectedFile.name}`;
    if (bulkUploading) return "Uploading...";
    return "Drop your file here or click to browse";
  }, [selectedFile, bulkUploading]);

  const fileLabel = useMemo(() => {
    if (!selectedFile?.name) return "";
    const n = selectedFile.name;
    return n.length > 48 ? `${n.slice(0, 32)}…${n.slice(-12)}` : n;
  }, [selectedFile]);

  return (
    <section className="bulk">
      <div className="bulk__header">
        <div>
          <h3 className="bulk__title">Bulk Email Finder</h3>
          {/* <p className="bulk__subtitle">
            Upload a CSV/XLSX with <strong>Full Name</strong> and <strong>Domain</strong>.
          </p> */}
          <p className="bulk__subtitle">
            Upload a CSV/XLSX with <strong>Full Name</strong> and{" "}
            <strong>Domain or Company</strong>.
          </p>
        </div>

        <div className="bulk__actions">
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={downloadTemplate}
            title="Download sample CSV"
          >
            ⬇ Sample File
          </button>
          <button
            className="btn btn--sm"
            onClick={startBulk}
            disabled={!selectedFile || bulkUploading}
            title="Start bulk finding"
          >
            {bulkUploading ? "Uploading…" : "Start Finding"}
          </button>
        </div>
      </div>

      {/* Drag & Drop zone */}
      <div
        className={`dropzone ${isDragging ? "is-dragging" : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === "Enter" ? fileInputRef.current?.click() : null
        }
        aria-label="File upload dropzone"
      >
        {selectedFile && (
          <div className="file-chip" title={selectedFile.name}>
            <span className="file-chip__name">{fileLabel}</span>
            <button
              type="button"
              className="file-chip__close"
              aria-label="Remove selected file"
              onClick={(e) => {
                e.stopPropagation();
                clearSelectedFile();
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="dropzone__inner">
          <div className="dropzone__icon">📤</div>
          <div className="dropzone__title">Drag & Drop to Upload</div>
          <div className="dropzone__hint">{computedHeaderHelp}</div>
          <div className="dropzone__accept">
            Accepted: .csv, .xlsx, .xls · up to 25MB
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={onChoose}
          />
        </div>
      </div>

      {bulkError && <div className="error">{bulkError}</div>}

      <div className="bulk-table card">
        <div className="bulk-table__head">
          <div className="col col--name">File Name</div>
          <div className="col col--progress">Progress</div>
          <div className="col col--status">Status</div>
          <div className="col col--action t-right">Action</div>
        </div>

        {bulkHistory.length === 0 ? (
          <div className="bulk-table__empty">No bulk searches yet.</div>
        ) : (
          bulkHistory.map((item) => {
            const p = progressMap[item._id];
            const pct = p
              ? Math.round(
                  ((p.processed || 0) / Math.max(1, p.total || 0)) * 100
                )
              : Math.round(
                  ((item.processed || 0) / Math.max(1, item.rowsTotal || 0)) *
                    100
                );

            const stateRaw = p?.state || item.state || "uploaded";
            const state = stateRaw.toUpperCase();
            const terminal = state === "DONE" || state === "ERROR";
            const resultReady = p?.resultReady || !!item.resultFileId;

            const statusClass =
              state === "DONE"
                ? "pill pill--success"
                : state === "ERROR"
                ? "pill pill--danger"
                : "pill";

            return (
              <div className="bulk-row" key={item._id}>
                <div className="col col--name">
                  <div className="bulk-row__name" title={item.filename}>
                    {item.filename}
                  </div>
                  <div className="bulk-row__meta">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="col col--progress">
                  <div
                    className={`progress ${pct >= 100 ? "is-complete" : ""}`}
                    aria-label="Progress"
                  >
                    <div
                      className="progress__bar"
                      style={{ width: `${pct || 0}%` }}
                      aria-valuenow={pct || 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      role="progressbar"
                    />
                    <div className="progress__label">{pct || 0}%</div>
                  </div>
                  <div className="bulk-sub">
                    {p?.processed ?? item.processed}/
                    {p?.total ?? item.rowsTotal}
                  </div>
                </div>

                <div className="col col--status">
                  <span className={statusClass}>{state}</span>
                </div>

                <div className="col col--action t-right bulk-row__actions">
                  {resultReady && (
                    <div className="action-stack">
                      <button
                        className="btn btn--sm btn-download"
                        onClick={() => downloadFile(item._id, item.filename)}
                        title="Download XLSX"
                      >
                        ⬇ Download
                      </button>

                      <div
                        className="action-iconrow"
                        aria-label="Secondary actions"
                      >
                        <button
                          className="iconbtn"
                          onClick={() => loadPreview(item._id)}
                          title="Quick preview"
                          aria-label="View"
                        >
                          👁
                        </button>
                        <button
                          className="iconbtn"
                          onClick={() => deleteJob(item._id)}
                          title="Delete job"
                          aria-label="Delete"
                        >
                          ✖
                        </button>
                      </div>
                    </div>
                  )}

                  {!resultReady && terminal && (
                    <div className="action-stack">
                      <div className="action-iconrow">
                        <button
                          className="iconbtn"
                          onClick={() => deleteJob(item._id)}
                          title="Delete job"
                          aria-label="Delete"
                        >
                          ✖
                        </button>
                      </div>
                    </div>
                  )}

                  {!terminal && !resultReady && (
                    <span className="muted">Processing…</span>
                  )}
                </div>

                {openPreview === item._id &&
                  previewMap[item._id]?.rows?.length > 0 && (
                    <div className="preview-panel">
                      <div className="preview-panel__head">
                        <strong>
                          Preview ({previewMap[item._id].shown}/
                          {previewMap[item._id].total})
                        </strong>
                        <button
                          className="btn btn--sm btn--ghost"
                          onClick={() => setOpenPreview(null)}
                        >
                          Close
                        </button>
                      </div>
                      <div className="preview-panel__body">
                        <table className="table">
                          <thead>
                            <tr>
                              <th className="th-left">Name</th>
                              <th className="th-left">Domain</th>
                              <th className="th-left">Email</th>
                              <th className="th-left">Confidence</th>
                              <th className="th-left">Found</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewMap[item._id].rows.map((r, idx) => (
                              <tr key={idx}>
                                <td className="td-left">{r.name}</td>
                                <td className="td-left">{r.domain}</td>
                                <td className="td-left">{r.email}</td>
                                <td className="td-left">{r.confidence}</td>
                                <td className="td-left">{r.found}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
