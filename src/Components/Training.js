import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Training.css";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function Training({ userName }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [domainStats, setDomainStats] = useState([]);
  const [providerStats, setProviderStats] = useState([]);
  const [msg, setMsg] = useState("");

  async function fetchStats() {
    try {
      const r1 = await axios.get(`${API_BASE}/api/training/domains`);
      const r2 = await axios.get(`${API_BASE}/api/training/providers`);
      setDomainStats(r1.data.domains || []);
      setProviderStats(r2.data.providers || []);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setMsg("Please select a file first.");
      return;
    }

    try {
      setUploading(true);
      setMsg("");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("source", "bouncer"); // for now; can make dropdown later
      fd.append("username", userName || "");

      const res = await axios.post(`${API_BASE}/api/training/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const d = res.data || {};
      const summary = `Processed ${d.processed || 0} rows — Inserted: ${
        d.inserted || 0
      }, Updated: ${d.updated || 0}, Skipped: ${d.skipped || 0}, Invalid format: ${
        d.invalidFormat || 0
      }.`;
      setMsg(d.message || summary);

      setUploading(false);
      fetchStats();
    } catch (err) {
      console.error("Upload failed:", err);
      const apiError = err.response?.data?.error;
      setMsg(
        "Upload failed: " +
          (apiError || err.message || "Unknown error. Check console.")
      );
      setUploading(false);
    }
  }

  return (
    <div className="dt-container">
      <h1 className="dt-title">🧠 Data Training Console</h1>

      {/* UPLOAD BLOCK */}
      <div className="dt-card upload-card">
        <h2>Upload Training Dataset</h2>
        <p className="dt-subtext">
          Upload a labelled CSV / Excel file from Bouncer, ZeroBounce, or your
          manually verified list. This trains TrueSendr&apos;s domain
          heuristics.
        </p>

        <form onSubmit={handleUpload} className="dt-upload-form">
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="dt-file-input"
          />
          <button type="submit" disabled={uploading} className="dt-upload-btn">
            {uploading ? "Uploading…" : "Upload & Train"}
          </button>
        </form>

        {msg && <div className="dt-message">{msg}</div>}
      </div>

      {/* DOMAIN STATS */}
      <div className="dt-card stats-card">
        <h2>Domain Behavior Snapshot</h2>
        <p className="dt-subtext">Aggregated training stats per domain.</p>

        <div className="dt-table-wrapper">
          <table className="dt-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Total</th>
                <th>Valid</th>
                <th>Invalid</th>
                <th>Risky</th>
                <th>Unknown</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {domainStats.length === 0 && (
                <tr>
                  <td colSpan="7" className="dt-empty">
                    No data yet. Train using the upload above.
                  </td>
                </tr>
              )}
              {domainStats.map((d, i) => (
                <tr key={i}>
                  <td>{d.domain}</td>
                  <td>{d.total}</td>
                  <td className="dt-valid">{d.valid}</td>
                  <td className="dt-invalid">{d.invalid}</td>
                  <td className="dt-risky">{d.risky}</td>
                  <td className="dt-unknown">{d.unknown}</td>
                  <td>
                    {d.updatedAt
                      ? new Date(d.updatedAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROVIDER STATS */}
      <div className="dt-card stats-card">
        <h2>Provider Behavior Snapshot</h2>
        <p className="dt-subtext">
          Aggregated training stats per mail provider / gateway.
        </p>

        <div className="dt-table-wrapper">
          <table className="dt-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Total</th>
                <th>Valid</th>
                <th>Invalid</th>
                <th>Risky</th>
                <th>Unknown</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {providerStats.length === 0 && (
                <tr>
                  <td colSpan="7" className="dt-empty">
                    No provider data yet.
                  </td>
                </tr>
              )}
              {providerStats.map((p, i) => (
                <tr key={i}>
                  <td>{p.provider}</td>
                  <td>{p.total}</td>
                  <td className="dt-valid">{p.valid}</td>
                  <td className="dt-invalid">{p.invalid}</td>
                  <td className="dt-risky">{p.risky}</td>
                  <td className="dt-unknown">{p.unknown}</td>
                  <td>
                    {p.updatedAt
                      ? new Date(p.updatedAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
