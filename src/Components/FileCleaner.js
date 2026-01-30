import React, { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import "./FileCleaner.css";
import cleanerLogo from "../assets/illustrator/cleaner.png";

/** ---------- API base helper (same pattern as Dashboard/Deliverability) ---------- */
function apiBase() {
  const env = process.env.REACT_APP_API_BASE;
  if (env) return env.replace(/\/+$/, "") + "/api";
  return `${window.location.origin.replace(/\/+$/, "")}/api`;
}

/** ---------- Default options (kept same keys as your backend) ---------- */
const DEFAULT_OPTIONS = {
  removeDuplicates: true,
  removeInvalidFormat: true,
  removeEmpty: true,
  removeRoleBased: false,
  removeFreeDomains: false,
  removeFakeLooking: false,
  removeHighRiskDomains: false,
  tagDomainType: true,
};

function fmtDT(isoOrMs) {
  try {
    return new Date(isoOrMs).toLocaleString();
  } catch {
    return "";
  }
}

function prettySize(bytes = 0) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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

export default function FileCleaner() {

  const [step, setStep] = useState("upload");

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState(null);
  const [jobId, setJobId] = useState(null);

  const fileInputRef = useRef(null);

  const hasStats = !!stats;

  /** ---------- Handlers ---------- */
  const openPicker = () => {
    try {
      fileInputRef.current?.click();
    } catch {}
  };

  const resetResults = () => {
    setStats(null);
    setJobId(null);
  };

  const clearFile = () => {
    setFile(null);
    resetResults();
    setStep("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const setPickedFile = (f) => {
    setFile(f);
    resetResults();
    setStep("picked");
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    setPickedFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const name = String(droppedFile.name || "").toLowerCase();
    if (
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    ) {
      setPickedFile(droppedFile);
    } else {
      toast.error("❌ Please drop a valid .xlsx / .xls / .csv file");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const handleOptionToggle = (key) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const goNext = () => {
    if (!file) {
      toast.warn("Please upload a file first.");
      return;
    }
    setStep("rules");
  };

  const goBack = () => {
    setStep("picked");
  };

  const goBackFromResults = () => {
    // for mobile/tablet back on right side
    setStats(null);
    setJobId(null);
    setStep("rules");
  };

  async function handleCleanClick(e) {
    e.preventDefault();
    if (!file) {
      toast.warn("Please upload a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("options", JSON.stringify(options));

    try {
      setLoading(true);
      setStats(null);
      setJobId(null);

      const res = await axios.post(
        `${apiBase()}/file-cleaner/clean`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (!res.data || !res.data.ok) {
        throw new Error(res.data?.message || "Cleaning failed.");
      }

      setStats(res.data.stats || null);
      setJobId(res.data.jobId || null);

      toast.success("✅ File cleaned successfully!");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong while cleaning the file.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(type) {
    if (!jobId) {
      toast.warn("No cleaned job found yet. Please clean a file first.");
      return;
    }

    const url = `${apiBase()}/file-cleaner/download/${jobId}?type=${encodeURIComponent(type)}`;

    // 1 small retry (because jobStore may not be ready instantly / race)
    const tryFetch = async () => {
      return axios.get(url, {
        responseType: "blob",
        validateStatus: () => true,
        headers: { "Cache-Control": "no-cache" },
      });
    };

    try {
      let res = await tryFetch();

      const contentType = res.headers?.["content-type"] || "";
      const isJson = contentType.includes("application/json");

      // if not ready, retry once quickly
      if ((res.status !== 200 || isJson) && res.status === 404) {
        await new Promise((r) => setTimeout(r, 200));
        res = await tryFetch();
      }

      const contentType2 = res.headers?.["content-type"] || "";
      const isJson2 = contentType2.includes("application/json");

      if (res.status !== 200 || isJson2) {
        let msg = "Download failed.";
        try {
          const text = await res.data.text();
          const parsed = JSON.parse(text);
          msg = parsed?.message || msg;
        } catch {}
        toast.error(msg);
        return;
      }

      const cd = res.headers?.["content-disposition"] || "";
      const match = cd.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || `file-cleaner-${type}.xlsx`;

      const blobUrl = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      toast.error("Download failed.");
    }
  }

  const fileLabel = stats?.fileName || file?.name || "Cleaned file";
  const cleanedAt = stats?.cleanedAt || stats?.createdAt || Date.now();

  return (
    <div className={`fcui-bg ${hasStats ? "fcui-hasStats" : "fcui-noStats"}`}>
      <div className="fcui-topbar">
        <div className="fcui-title">File Cleaner</div>
      </div>

      <div className="fcui-shell">
        <div className="fcui-grid">
          {/* LEFT */}
          <aside className="fcui-left">
            {/* STEP 1: Upload */}
            {step === "upload" && (
              <>
                <div className="fcui-lefthead">
                  <div className="fcui-lefttitle">Upload File</div>
                </div>

                <div
                  className={`fcui-drop ${isDragging ? "dragging" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  role="button"
                  tabIndex={0}
                  onClick={openPicker}
                >
                  <div className="fcui-dropInner">
                    <div className="fcui-dropIcon">
                      <UploadIcon />
                    </div>

                    <div className="fcui-dropText">
                      <div className="fcui-dropMain">Drag &amp; Drop file</div>
                      <div className="fcui-dropOr">or</div>
                    </div>

                    <div className="fcui-dropActions">
                      <button
                        type="button"
                        className="fcui-browseBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPicker();
                        }}
                      >
                        Browse File
                      </button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="fcui-hiddenInput"
                    aria-label="Upload file"
                  />
                </div>

                <div className="fcui-formats">File formats: csv, xlsx, xls</div>
              </>
            )}

            {/* STEP 2: Picked */}
            {step === "picked" && (
              <>
                <div className="fcui-lefthead">
                  <div className="fcui-lefttitle">Upload File</div>
                </div>

                <div className="fcui-pickedWrap">
                  <div className="fcui-pickedPill" title={file?.name || ""}>
                    <div className="fcui-pickedName">
                      {file?.name || "File"}
                    </div>
                    <div className="fcui-pickedMeta">
                      {file ? prettySize(file.size) : ""}
                    </div>

                    <button
                      type="button"
                      className="fcui-pickedX"
                      title="Remove file"
                      onClick={clearFile}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="fcui-formats">
                    File formats: csv, xlsx, xls
                  </div>

                  <button
                    type="button"
                    className="fcui-nextBtn"
                    onClick={goNext}
                    disabled={!file}
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: Rules */}
            {step === "rules" && (
              <>
                <div className="fcui-rulesTop">
                  <button
                    type="button"
                    className="fcui-backBtn"
                    onClick={goBack}
                  >
                    <ArrowBackRoundedIcon fontSize="small" />
                  </button>
                  <div className="fcui-rulesTopText">
                    Select cleaning filters
                  </div>
                </div>

                <div className="fcui-rulesWrap">
                  <div className="fcui-ruleGroup">
                    <div className="fcui-ruleHead">DUPLICATE HANDLING</div>

                    <CheckRow
                      checked={options.removeDuplicates}
                      onChange={() => handleOptionToggle("removeDuplicates")}
                      title="Remove duplicates"
                      sub="Keep only the first occurrence of each email"
                    />

                    <CheckRow
                      checked={options.removeEmpty}
                      onChange={() => handleOptionToggle("removeEmpty")}
                      title="Remove empty / junk rows"
                      sub='Rows with empty, "null", "test" emails etc'
                    />
                  </div>

                  <div className="fcui-ruleGroup">
                    <div className="fcui-ruleHead">DOMAIN FILTERS</div>

                    <CheckRow
                      checked={options.removeFreeDomains}
                      onChange={() => handleOptionToggle("removeFreeDomains")}
                      title="Remove free-email domains"
                      sub="Gmail, Yahoo, Outlook, Hotmail, iCloud etc"
                    />

                    <CheckRow
                      checked={options.removeHighRiskDomains}
                      onChange={() =>
                        handleOptionToggle("removeHighRiskDomains")
                      }
                      title="Remove high risk domains"
                      sub="Based on your env high risk / blacklist domains"
                    />
                  </div>

                  <div className="fcui-ruleGroup">
                    <div className="fcui-ruleHead">FORMAT VALIDATION</div>

                    <CheckRow
                      checked={options.removeInvalidFormat}
                      onChange={() => handleOptionToggle("removeInvalidFormat")}
                      title="Remove invalid format"
                      sub="Emails without @, bad domains, or broken syntax"
                    />

                    <CheckRow
                      checked={options.removeFakeLooking}
                      onChange={() => handleOptionToggle("removeFakeLooking")}
                      title="Remove fake looking emails"
                      sub="test@, demo@, asdf@, qwerty@, +test, +demo etc"
                    />
                  </div>

                  <div className="fcui-ruleGroup">
                    <div className="fcui-ruleHead">EMAIL TYPE FILTERS</div>

                    <CheckRow
                      checked={options.removeRoleBased}
                      onChange={() => handleOptionToggle("removeRoleBased")}
                      title="Remove role based emails"
                      sub="admin@, info@, support@, hr@, sales@ etc"
                    />

                    <CheckRow
                      checked={options.tagDomainType}
                      onChange={() => handleOptionToggle("tagDomainType")}
                      title="Tag domain type"
                      sub="Mark free / B2B / high security domains in the output"
                    />
                  </div>
                </div>

                <button
                  className="fcui-cleanBtn"
                  onClick={handleCleanClick}
                  disabled={!file || loading}
                >
                  {loading ? "Cleaning..." : "Clean File"}
                </button>
              </>
            )}
          </aside>

          {/* RIGHT */}
          <section className="fcui-right">
            {/* Mobile/Tablet only back button (only visible when stats exist) */}
            {hasStats && (
              <div className="fcui-rightTopBack">
                <button
                  type="button"
                  className="fcui-backBtn fcui-backBtnRight"
                  onClick={goBackFromResults}
                  aria-label="Back"
                >
                  <ArrowBackRoundedIcon fontSize="small" />
                </button>
              </div>
            )}

            {!hasStats ? (
              <div className="fcui-empty">
                <img
                  src={cleanerLogo}
                  alt="File Cleaner"
                  className="fcui-emptyImg"
                  loading="lazy"
                />

                <div className="fcui-emptyTitle">No uploads yet!</div>
                <div className="fcui-emptySub">
                  Upload a CSV or Excel file to clean your <br />
                  email list before validation.
                </div>
              </div>
            ) : (
              <div className="fcui-resultCard">
                <div className="fcui-resultTop">
                  <div className="fcui-resultMeta">
                    <div className="fcui-resultFile">{fileLabel}</div>
                    <div className="fcui-resultDate">
                      Cleaned on: {fmtDT(cleanedAt)}
                    </div>
                  </div>
                </div>

                <div className="fcui-statGrid">
                  <StatBox label="Total Rows" value={stats?.totalRows ?? 0} />
                  <StatBox label="Clean Rows" value={stats?.cleanRows ?? 0} />
                  <StatBox
                    label="Duplicates"
                    value={stats?.removedDuplicates ?? 0}
                  />
                  <StatBox
                    label="Invalid"
                    value={stats?.removedInvalidFormat ?? 0}
                  />

                  <StatBox
                    label="Role-based"
                    value={stats?.removedRoleBased ?? 0}
                  />
                  <StatBox
                    label="Free-domain"
                    value={stats?.removedFreeDomains ?? 0}
                  />
                  <StatBox
                    label="Fake"
                    value={stats?.removedFakeLooking ?? 0}
                  />
                  <StatBox
                    label="High-risk"
                    value={stats?.removedHighRiskDomains ?? 0}
                  />
                </div>

                <div className="fcui-downloadRow">
                  <button
                    type="button"
                    className="fcui-downloadPrimary"
                    onClick={(e) => handleDownload("clean")}
                    disabled={!jobId}
                  >
                    Download Cleaned File
                  </button>

                  <button
                    type="button"
                    className="fcui-downloadLink"
                    onClick={(e) => handleDownload("invalid")}
                    disabled={!jobId}
                  >
                    Download Invalid Rows
                  </button>

                  <button
                    type="button"
                    className="fcui-downloadLink"
                    onClick={(e) => handleDownload("duplicates")}
                    disabled={!jobId}
                  >
                    Download Duplicates
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** ---------- UI bits ---------- */
function CheckRow({ checked, onChange, title, sub }) {
  return (
    <label className="fcui-checkRow">
      <input type="checkbox" checked={!!checked} onChange={onChange} />
      <span className="fcui-checkText">
        <span className="fcui-checkTitle">{title}</span>
        {sub ? <span className="fcui-checkSub">{sub}</span> : null}
      </span>
    </label>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="fcui-statBox">
      <div className="fcui-statLabel">{label}</div>
      <div className="fcui-statValue">{value ?? 0}</div>
    </div>
  );
}
