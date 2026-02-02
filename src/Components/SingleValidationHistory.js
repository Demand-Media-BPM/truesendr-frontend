import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./SingleValidationHistory.css";

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

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchIcon from "@mui/icons-material/Search";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import singleLogo from "../assets/illustrator/single-orange.png";

const apiBase =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : `${window.location.protocol}//${window.location.host}`);

/** Normalize backend status to ONLY: Valid | Invalid | Risky | Unknown */
const normalizeStatusLabel = (raw = "") => {
  const s = String(raw || "");
  if (/\bInvalid\b/i.test(s)) return "Invalid";
  if (/\bRisky\b/i.test(s)) return "Risky";
  if (/\bValid\b/i.test(s)) return "Valid";
  return "Unknown";
};

const categoryFromStatus = (status = "") => {
  const s = String(status || "");
  if (/\bInvalid\b/i.test(s)) return "invalid";
  if (/\bRisky\b/i.test(s)) return "risky";
  if (/\bValid\b/i.test(s)) return "valid";
  return "unknown";
};

const defaultReasonForCategory = (cat) => {
  switch (cat) {
    case "valid":
      return "Accepted email";
    case "invalid":
      return "Rejected Email";
    case "risky":
      return "Low deliverability";
    default:
      return "Unknown";
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
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

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Valid", value: "valid" },
  { label: "Invalid", value: "invalid" },
  { label: "Risky", value: "risky" },
  { label: "Unknown", value: "unknown" },
];

export default function SingleValidationHistory({ username, reloadTrigger }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [expanded, setExpanded] = useState({});
  const [openClearDialog, setOpenClearDialog] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const payload = {
        username,
        limit: 1000,
        q: q?.trim() || "",
        status: status || "all",
        page: page + 1,
        pageSize: rowsPerPage,
      };

      const res = await axios.post(`${apiBase}/api/single/history`, payload, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });

      if (res.data?.success) {
        const data = res.data.data || [];
        setHistory(Array.isArray(data) ? data : []);

        setTotalRecords(
          typeof res.data.total === "number"
            ? res.data.total
            : typeof res.data.totalCount === "number"
              ? res.data.totalCount
              : Array.isArray(data)
                ? data.length
                : 0,
        );
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch validation history:", err?.message || err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!username) return;
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, reloadTrigger]);

  useEffect(() => {
    if (!username) return;
    setPage(0);
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const handleClearHistory = async () => {
    try {
      setClearing(true);
      await axios.post(
        `${apiBase}/api/single/clear-history`,
        { username },
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );
      setExpanded({});
      setPage(0);
      await fetchHistory();
    } catch (err) {
      console.error("Failed to clear history:", err?.message || err);
    } finally {
      setClearing(false);
    }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (history || []).filter((item) => {
      const cat = categoryFromStatus(item.status);
      const email = String(item.email || "").toLowerCase();
      const statusOk = status === "all" ? true : cat === status;
      const queryOk = !query ? true : email.includes(query);
      return statusOk && queryOk;
    });
  }, [history, q, status]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filtered.slice(start, end);
  }, [filtered, page, rowsPerPage]);

  const totalCount = filtered.length;

  return (
    <div className="svh-wrap">
      {/* Top controls */}
      <div className="svh-toolbar">
        <div className="svh-left">
          <div className="svh-controlBox svh-searchBox">
            <TextField
              variant="standard"
              placeholder="Search by email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{ disableUnderline: true }}
              className="svh-input"
            />
            <SearchIcon className="svh-endIcon" />
          </div>

          <div className="svh-controlBox svh-selectBox">
            <FormControl fullWidth size="small">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                displayEmpty
                variant="standard"
                disableUnderline
                className="svh-select"
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

        <div className="svh-clearBtn">
          <span className="svh-clearText">Clear History</span>

          <Tooltip
            title="History is deleted automatically after every 60 days."
            placement="top"
            arrow
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: "#fff",
                  color: "#111827",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                  fontSize: "12px",
                  fontWeight: 500,
                },
              },
              arrow: {
                sx: { color: "#fff" }, // arrow matches white tooltip
              },
            }}
          >
            <IconButton
              size="small"
              className="svh-infoBtn"
              onClick={() => setOpenClearDialog(true)}
            >
              <InfoOutlineIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Table + Pagination in one fixed-height card (prevents page scrollbar) */}
      <Paper className="svh-paper" elevation={0}>
        <div className="svh-cardBody">
          <TableContainer className="svh-tableWrap">
            <Table stickyHeader aria-label="Single validation history">

              <TableHead>
                <TableRow>
                  <TableCell className="svh-th svh-col-email">Email</TableCell>
                  <TableCell className="svh-th svh-col-status">
                    Status
                  </TableCell>
                  <TableCell className="svh-th svh-col-reason">
                    Reason
                  </TableCell>
                  <TableCell className="svh-th svh-col-score">Score</TableCell>
                  <TableCell className="svh-th svh-col-expand" align="right" />
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="svh-empty">
                      Loading validations...
                    </TableCell>
                  </TableRow>
                ) : totalCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="svh-emptyCell">
                      <div className="svh-emptyState">
                        <img
                          src={singleLogo}
                          alt="Nothing here yet"
                          className="svh-emptyIllus"
                          draggable="false"
                        />
                        <div className="svh-emptyTitle">Nothing here yet!</div>
                        <div className="svh-emptySub">
                          Start your first email validation to see results
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((item, idx) => {
                    const zebraClass = idx % 2 === 1 ? "is-even" : "is-odd";
                    const cat = categoryFromStatus(item.status);
                    const statusLabel = normalizeStatusLabel(item.status);

                    const reasons = Array.isArray(item.reason)
                      ? item.reason.filter(Boolean)
                      : [item.reason || defaultReasonForCategory(cat)];
                    const reasonText =
                      reasons[0] || defaultReasonForCategory(cat);

                    const isOpen = !!expanded[item.id];

                    const confPct =
                      typeof item.confidence === "number"
                        ? Math.max(
                            0,
                            Math.min(100, Math.round(item.confidence * 100)),
                          )
                        : null;

                    return (
                      <React.Fragment key={item.id}>
                        <TableRow
                          className={`svh-row svh-dataRow ${zebraClass}`}
                          hover
                        >
                          <TableCell className="svh-emailCell">
                            <div className="svh-email">{item.email}</div>
                          </TableCell>

                          <TableCell>
                            <div className="svh-statusPlain">
                              <span className={`svh-dot svh-dot-${cat}`} />
                              <span className="svh-plainText">
                                {statusLabel}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`svh-reasonPlain svh-reason-${cat}`}
                            >
                              {reasonText}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="svh-scorePlain">
                              <span className="svh-dot svh-dot-score" />
                              <span className="svh-plainText">
                                {item.score ?? "N/A"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => toggleExpand(item.id)}
                              aria-label={isOpen ? "Collapse" : "Expand"}
                              className="svh-expandBtn"
                            >
                              {isOpen ? (
                                <KeyboardArrowUpIcon />
                              ) : (
                                <KeyboardArrowDownIcon />
                              )}
                            </IconButton>
                          </TableCell>
                        </TableRow>

                        <TableRow className={`svh-expandRow ${zebraClass}`}>
                          <TableCell colSpan={5} className="svh-expandCell">
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                              <Box className="svh-details">
                                <div className="svh-msgLine">
                                  {item.message
                                    ? item.message
                                    : "This address may not reliably accept mail. Sending emails could result in bounces."}
                                </div>

                                <div className="svh-detailGrid">
                                  <div className="svh-detailCol">
                                    <div className="svh-detailTitle">
                                      Source Details
                                    </div>

                                    <div className="svh-pairs svh-pairs-2">
                                      <div className="svh-pair">
                                        <div className="svh-label">Domain</div>
                                        <div className="svh-value">
                                          {item.domain || "N/A"}
                                        </div>
                                      </div>

                                      <div className="svh-pair">
                                        <div className="svh-label">
                                          Provider
                                        </div>
                                        <div className="svh-value svh-clamp2">
                                          {item.provider || "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="svh-detailCol">
                                    <div className="svh-detailTitle">
                                      Type Details
                                    </div>

                                    <div className="svh-pairs svh-pairs-3">
                                      <div className="svh-pair">
                                        <div className="svh-label">
                                          Disposable
                                        </div>
                                        <div className="svh-value">
                                          {item.isDisposable ? "Yes" : "No"}
                                        </div>
                                      </div>

                                      <div className="svh-pair">
                                        <div className="svh-label">
                                          Free Mail
                                        </div>
                                        <div className="svh-value">
                                          {item.isFree ? "Yes" : "No"}
                                        </div>
                                      </div>

                                      <div className="svh-pair">
                                        <div className="svh-label">
                                          Role Based
                                        </div>
                                        <div className="svh-value">
                                          {item.isRoleBased ? "Yes" : "No"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="svh-detailCol">
                                    <div className="svh-detailTitle">
                                      Email Details
                                    </div>

                                    <div className="svh-pairs svh-pairs-2">
                                      <div className="svh-pair">
                                        <div className="svh-label">
                                          Confidence Level
                                        </div>
                                        <div className="svh-confidence">
                                          <div className="svh-bar">
                                            <div
                                              className="svh-barFill"
                                              style={{
                                                width:
                                                  confPct === null
                                                    ? "0%"
                                                    : `${confPct}%`,
                                              }}
                                            />
                                          </div>
                                          <div className="svh-value">
                                            {confPct === null
                                              ? "N/A"
                                              : `${confPct}%`}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="svh-pair">
                                        <div className="svh-label">
                                          Validated On
                                        </div>
                                        <div className="svh-value">
                                          {formatDate(item.timestamp)}
                                        </div>
                                      </div>
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

          <div className="svh-pagination">
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
      <Dialog open={openClearDialog} onClose={() => setOpenClearDialog(false)}>
        <DialogTitle>Clear History?</DialogTitle>

        <DialogContent>
          Are you sure you want to clear single validation history of{" "}
          <b>{totalRecords}</b> records?
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setOpenClearDialog(false)}
            sx={{ color: "#111827" }}
          >
            Cancel
          </Button>
          <Button
            color="warning"
            onClick={async () => {
              setOpenClearDialog(false);
              await handleClearHistory();
            }}
          >
            Clear
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
