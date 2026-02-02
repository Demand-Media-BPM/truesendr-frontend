import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./BulkHistory.css";

// MUI
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Collapse,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import bulkLogo from "../assets/illustrator/bulk-orange.png";

// MUI Icons
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";

// ⚠️ TEMP: force backend to production domain only (bypasses env + localhost logic)
const API_BASE = process.env.REACT_APP_API_BASE;

console.log("[BulkHistory][HARDCODED] API_BASE =", API_BASE);

// keep auth the same
const BASIC_AUTH_B64 =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_BULK_AUTH_B64) ||
  "";

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

const formatDate = (dateStr) => {
  if (!dateStr) return "–";
  const date = new Date(dateStr);
  const locale = (navigator && navigator.language) || "en-US";
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Bulk status normalization for UI */
const normalizeBulkStatusLabel = (raw = "") => {
  const s = String(raw || "").toLowerCase();
  if (s === "needs_cleanup") return "Needs Cleanup";
  if (s === "cleaning") return "Cleaning";
  if (s === "needs_fix") return "Needs Fix";
  if (s === "ready") return "Ready";
  if (s === "running" || s === "preflight") return "Running";
  if (s === "done") return "Completed";
  if (s === "failed") return "Failed";
  if (s === "canceled") return "Canceled";
  return s ? s.replace(/\b\w/g, (m) => m.toUpperCase()) : "–";
};

const bulkStatusCategory = (raw = "") => {
  const s = String(raw || "").toLowerCase();
  if (s === "running" || s === "preflight") return "inprogress";
  if (s === "done" || s === "finished" || s === "completed") return "completed";
  if (s === "failed") return "failed";
  if (s === "canceled") return "canceled";
  return "unknown";
};

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Needs Cleanup", value: "needs_cleanup" },
  { label: "Cleaning", value: "cleaning" },
  { label: "Needs Fix", value: "needs_fix" },
  { label: "Ready", value: "ready" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "done" },
  { label: "Failed", value: "failed" },
  { label: "Canceled", value: "canceled" },
];

const pct = (n, total) => {
  const a = Number(n || 0);
  const t = Number(total || 0);
  if (!t) return 0;
  return Math.max(0, Math.min(100, Math.round((a / t) * 100)));
};

export default function BulkHistory({ refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const firstLoadRef = useRef(true);

  // Toolbar
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Expand
  const [expanded, setExpanded] = useState({});

  // Delete confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState({
    bulkId: null,
    name: "",
  });

  useEffect(() => {
    let mounted = true;
    const first = firstLoadRef.current;

    if (first) setLoading(true);
    else setRefreshing(true);

    const controller = new AbortController();

    axios
      .get(`${API_BASE}/api/bulk/history`, {
        headers: { ...apiHeaders(), "Cache-Control": "no-cache" },
        params: { username: getUser(), limit: 300, t: Date.now() },
        signal: controller.signal,
        timeout: 15000,
      })
      .then(({ data }) => {
        if (!mounted) return;
        setRows(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((e) => {
        if (e?.name === "CanceledError" || e?.message === "canceled") return;
        toast.error(`❌ History failed: ${e?.response?.data || e.message}`);
      })
      .finally(() => {
        if (!mounted) return;
        if (first) {
          setLoading(false);
          firstLoadRef.current = false;
        } else {
          setRefreshing(false);
        }
      });

    return () => {
      mounted = false;
      try {
        controller.abort();
      } catch {}
    };
  }, [refreshKey]);

  const download = async (bulkId) => {
    try {
      const resp = await axios.get(`${API_BASE}/api/bulk/result`, {
        headers: apiHeaders(),
        params: { bulkId, username: getUser() },
        responseType: "blob",
      });
      const ct = resp.headers["content-type"] || "application/octet-stream";
      const blob = new Blob([resp.data], { type: ct });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `validated_${bulkId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(`❌ Download failed: ${e?.response?.data || e.message}`);
    }
  };

  const downloadOriginal = async (bulkId, filename = "uploaded.xlsx") => {
    try {
      const resp = await axios.get(`${API_BASE}/api/bulk/original`, {
        headers: apiHeaders(),
        params: { bulkId, username: getUser() },
        responseType: "blob",
      });
      const ct = resp.headers["content-type"] || "application/octet-stream";
      const blob = new Blob([resp.data], { type: ct });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(
        `❌ Download original failed: ${e?.response?.data || e.message}`,
      );
    }
  };

  const openDeleteConfirm = (bulkId, name) => {
    setPendingDelete({ bulkId, name: name || "this file" });
    setConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setConfirmOpen(false);
    setPendingDelete({ bulkId: null, name: "" });
  };

  const confirmDelete = async () => {
    if (!pendingDelete.bulkId) return;
    const id = pendingDelete.bulkId;

    closeDeleteConfirm(); // close first (nice UX)

    await remove(id); // call your existing delete API function
  };

  const remove = async (bulkId) => {
    try {
      await axios.delete(`${API_BASE}/api/bulk/${encodeURIComponent(bulkId)}`, {
        headers: apiHeaders(),
        params: { username: getUser(), hard: "true" },
      });
      toast.success("🗑 Deleted");
      setRows((prev) => prev.filter((r) => r.bulkId !== bulkId));
      setExpanded((prev) => {
        const copy = { ...prev };
        delete copy[bulkId];
        return copy;
      });
    } catch (e) {
      toast.error(`❌ Delete failed: ${e?.response?.data || e.message}`);
    }
  };

  const toggleExpand = (bulkId) => {
    setExpanded((prev) => ({ ...prev, [bulkId]: !prev[bulkId] }));
  };

  // Filter like SingleHistory toolbar (but bulk data is file-based)
  const filtered = useMemo(() => {
    const query = String(q || "")
      .trim()
      .toLowerCase();
    return (rows || []).filter((r) => {
      const statusOk =
        status === "all" ? true : String(r.status).toLowerCase() === status;

      if (!query) return statusOk;

      // screenshot says "Search by email" — but we match by name/bulkId too
      const name = String(r.name || "").toLowerCase();
      const bulkId = String(r.bulkId || "").toLowerCase();
      const emailLike = String(r.email || r.sampleEmail || "").toLowerCase();

      const queryOk =
        name.includes(query) ||
        bulkId.includes(query) ||
        emailLike.includes(query);

      return statusOk && queryOk;
    });
  }, [rows, q, status]);

  const totalCount = filtered.length;

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filtered.slice(start, end);
  }, [filtered, page, rowsPerPage]);

  // Keep pagination stable when filters change
  useEffect(() => {
    setPage(0);
  }, [q, status]);

  return (
    <div className="bkh-wrap">
      {/* Top controls (same structure as SingleHistory) */}
      <div className="bkh-toolbar">
        <div className="bkh-left">
          <div className="bkh-controlBox bkh-searchBox">
            <TextField
              variant="standard"
              placeholder="Search by email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{ disableUnderline: true }}
              className="bkh-input"
            />
            <SearchIcon className="bkh-endIcon" />
          </div>

          <div className="bkh-controlBox bkh-selectBox">
            <FormControl fullWidth size="small">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                displayEmpty
                variant="standard"
                disableUnderline
                className="bkh-select"
              >
                {STATUS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
      </div>

      {/* Table + Pagination in one fixed-height card */}
      <Paper className="bkh-paper bkh-stickyLayout" elevation={0}>
        <div className="bkh-cardBody">
          <TableContainer className="bkh-tableWrap">
            <Table stickyHeader aria-label="Bulk validation history">
              <TableHead>
                <TableRow>
                  <TableCell className="bkh-th">Name</TableCell>
                  <TableCell className="bkh-th" style={{ width: 180 }}>
                    Status
                  </TableCell>
                  <TableCell className="bkh-th" style={{ width: 210 }}>
                    Created on
                  </TableCell>
                  <TableCell className="bkh-th" style={{ width: 210 }}>
                    Completed on
                  </TableCell>
                  <TableCell
                    className="bkh-th"
                    align="right"
                    style={{ width: 160 }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="bkh-emptyCell">
                      <div className="bkh-emptyState">
                        <img
                          src={bulkLogo}
                          alt="Loading bulk history"
                          className="bkh-emptyLogo"
                          draggable="false"
                        />
                        <div className="bkh-emptyTitle">Loading history...</div>
                        <div className="bkh-emptySub">
                          Fetching your bulk jobs
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : totalCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="bkh-emptyCell">
                      <div className="bkh-emptyState">
                        <img
                          src={bulkLogo}
                          alt="No history yet"
                          className="bkh-emptyLogo"
                          draggable="false"
                        />
                        <div className="bkh-emptyTitle">No history yet!</div>
                        <div className="bkh-emptySub">
                          Upload and validate a file to see it here.
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((r, idx) => {
                    const zebraClass = idx % 2 === 1 ? "is-even" : "is-odd";
                    const cat = bulkStatusCategory(r.status);
                    const label = normalizeBulkStatusLabel(r.status);
                    const isOpen = !!expanded[r.bulkId];

                    const emails = Number(r.emails ?? r.total ?? 0);
                    const valid = Number(r.valid ?? r.validCount ?? 0);
                    const invalid = Number(r.invalid ?? r.invalidCount ?? 0);
                    const risky = Number(r.risky ?? r.riskyCount ?? 0);
                    const unknown = Number(r.unknown ?? r.unknownCount ?? 0);

                    return (
                      <React.Fragment key={r.bulkId}>
                        <TableRow
                          className={`bkh-row bkh-dataRow ${zebraClass}`}
                          hover
                        >
                          {/* Name */}
                          <TableCell className="bkh-nameCell" data-label="Name">
                            <button
                              className="bkh-nameLink"
                              onClick={() =>
                                downloadOriginal(
                                  r.bulkId,
                                  r.name || "uploaded.xlsx",
                                )
                              }
                              title="Download original file"
                              type="button"
                            >
                              {r.name || "—"}
                            </button>
                          </TableCell>

                          {/* Status */}
                          <TableCell data-label="Status">
                            <div className="bkh-statusPlain">
                              <span className={`bkh-dot bkh-dot-${cat}`} />
                              <span className="bkh-plainText">{label}</span>
                            </div>
                          </TableCell>

                          {/* Created on */}
                          <TableCell data-label="Created on">
                            <span className="bkh-plainText">
                              {formatDate(r.createdAt)}
                            </span>
                          </TableCell>

                          {/* Completed on */}
                          <TableCell data-label="Completed on">
                            <span className="bkh-plainText">
                              {formatDate(r.completedAt)}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right" data-label="Actions">
                            <div className="bkh-actions">
                              <IconButton
                                size="small"
                                className="bkh-iconBtn"
                                disabled={!r.canDownload}
                                title={
                                  r.canDownload
                                    ? "Download result"
                                    : "Not available"
                                }
                                onClick={() =>
                                  r.canDownload && download(r.bulkId)
                                }
                              >
                                <FileDownloadOutlinedIcon />
                              </IconButton>

                              <IconButton
                                size="small"
                                className="bkh-iconBtn"
                                disabled={
                                  r.status === "running" ||
                                  r.status === "preflight"
                                }
                                title={
                                  r.status === "running" ||
                                  r.status === "preflight"
                                    ? "Cannot delete while running"
                                    : "Delete"
                                }
                                onClick={() =>
                                  openDeleteConfirm(r.bulkId, r.name)
                                }
                              >
                                <DeleteOutlineOutlinedIcon />
                              </IconButton>

                              <IconButton
                                size="small"
                                onClick={() => toggleExpand(r.bulkId)}
                                aria-label={isOpen ? "Collapse" : "Expand"}
                                className="bkh-expandBtn"
                                title={isOpen ? "Collapse" : "Expand"}
                              >
                                {isOpen ? (
                                  <KeyboardArrowUpIcon />
                                ) : (
                                  <KeyboardArrowDownIcon />
                                )}
                              </IconButton>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expand row (stats cards like screenshot) */}
                        <TableRow className={`bkh-expandRow ${zebraClass}`}>
                          <TableCell
                            colSpan={5}
                            className="bkh-expandCell"
                            data-label="Details"
                          >
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                              <Box className="bkh-details">
                                <div className="bkh-statGrid">
                                  <div className="bkh-statCard">
                                    <div className="bkh-statLabel">Emails</div>
                                    <div className="bkh-statValue">
                                      {emails}
                                    </div>
                                  </div>

                                  <div className="bkh-statCard">
                                    <div className="bkh-statLabel">Valid</div>
                                    <div className="bkh-statRow">
                                      <div className="bkh-statValue">
                                        {valid}
                                      </div>
                                      <span className="bkh-pill bkh-pill-green">
                                        {pct(valid, emails)}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="bkh-statCard">
                                    <div className="bkh-statLabel">Invalid</div>
                                    <div className="bkh-statRow">
                                      <div className="bkh-statValue">
                                        {invalid}
                                      </div>
                                      <span className="bkh-pill bkh-pill-red">
                                        {pct(invalid, emails)}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="bkh-statCard">
                                    <div className="bkh-statLabel">Risky</div>
                                    <div className="bkh-statRow">
                                      <div className="bkh-statValue">
                                        {risky}
                                      </div>
                                      <span className="bkh-pill bkh-pill-orange">
                                        {pct(risky, emails)}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="bkh-statCard">
                                    <div className="bkh-statLabel">Unknown</div>
                                    <div className="bkh-statRow">
                                      <div className="bkh-statValue">
                                        {unknown}
                                      </div>
                                      <span className="bkh-pill bkh-pill-gray">
                                        {pct(unknown, emails)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="bkh-pagination">
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </div>
        </div>
      </Paper>
      {/* Delete confirmation dialog */}
      <Dialog
        open={confirmOpen}
        onClose={closeDeleteConfirm}
        maxWidth="sm"
        PaperProps={{ className: "bkh-confirmPaper" }}
      >
        <DialogTitle className="bkh-confirmTitle">Clear File?</DialogTitle>

        <DialogContent className="bkh-confirmContent">
          Are you sure you want to clear &quot;{pendingDelete.name}&quot; file?
        </DialogContent>

        <DialogActions className="bkh-confirmActions">
          <button
            type="button"
            className="bkh-confirmBtn"
            onClick={closeDeleteConfirm}
          >
            Cancel
          </button>

          <button
            type="button"
            className="bkh-confirmBtn bkh-confirmDanger"
            onClick={confirmDelete}
          >
            Clear
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
