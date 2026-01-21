import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./EmailFinderHistory.css";

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
  FormControl,
  Select,
  MenuItem,
  TextField,
  Tooltip,
  IconButton,
} from "@mui/material";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import SearchIcon from "@mui/icons-material/Search";

import { default as InfoOutlinedIcon } from "@mui/icons-material/InfoOutlined";

// Format like: 01 Dec 2025 07:28 PM
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";

  const day = String(dt.getDate()).padStart(2, "0");
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

export default function EmailFinderHistory({ username, token, apiBase }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  function buildHeaders() {
    const h = {
      "Content-Type": "application/json",
      "X-User": username || "",
      "ngrok-skip-browser-warning": "69420",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  function apiUrl(path) {
    const base = String(apiBase || "").replace(/\/+$/, "");
    if (base.endsWith("/api"))
      return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    return `${base}/api${path.startsWith("/") ? "" : "/"}${path}`;
  }

  async function fetchHistory() {
    if (!username) return;
    try {
      const res = await axios.get(apiUrl("/finder/history?limit=500"), {
        headers: buildHeaders(),
      });

      // backend shape expected:
      // { items: [...] } OR { ok:true, items:[...] }
      const items = Array.isArray(res.data?.items)
        ? res.data.items
        : Array.isArray(res.data?.history)
        ? res.data.history
        : [];

      setRows(items);
    } catch (e) {
      console.error(
        "finder history fetch failed",
        e?.response?.data || e?.message
      );
      setRows([]);
    }
  }

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const filtered = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    const query = q.trim().toLowerCase();

    return rows.filter((r) => {
      // --- status filter (your existing logic) ---
      const want = status;
      const state = String(r?.state || "done").toLowerCase();
      const hasEmail = Boolean(r?.email);
      const st = String(r?.status || "").toLowerCase();

      let statusOk = true;
      if (want !== "all") {
        if (want === "found") statusOk = hasEmail;
        else if (want === "not_found")
          statusOk = !hasEmail && state !== "error";
        else if (want === "error") statusOk = state === "error";
        else if (want === "running") statusOk = state === "running";
        else statusOk = st === want;
      }

      // --- search filter (same vibe as single history) ---
      if (!query) return statusOk;

      const fullName = String(
        r?.fullName || r?.nameInput || r?.inputName || ""
      ).toLowerCase();
      const domain = String(r?.domain || "").toLowerCase();
      const email = String(r?.email || "").toLowerCase();

      const queryOk =
        email.includes(query) ||
        fullName.includes(query) ||
        domain.includes(query);

      return statusOk && queryOk;
    });
  }, [rows, status, q]);

  const totalRecords = filtered.length;

  const visible = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filtered.slice(start, end);
  }, [filtered, page, rowsPerPage]);

  async function clearHistory() {
    if (!username || clearing) return;
    setClearing(true);
    try {
      const res = await axios.delete(apiUrl("/finder/history"), {
        headers: buildHeaders(),
        withCredentials: true,
      });

      if (res.data?.ok) {
        await fetchHistory();
        setPage(0);
      } else {
        await fetchHistory();
      }
    } catch (e) {
      console.error(
        "❌ Clear finder history failed:",
        e?.response?.data || e?.message
      );
      await fetchHistory();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="efh-wrap">
      {/* Toolbar row */}
      {/* <div className="efh-toolbar">
        <div className="efh-left">
          <div className="efh-controlBox efh-searchBox">
            <TextField
              variant="standard"
              placeholder="Search by name / domain / email"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              InputProps={{ disableUnderline: true }}
              className="efh-input"
            />
            <SearchIcon className="efh-endIcon" />
          </div>

          <div className="efh-controlBox efh-selectWrap">
            <FormControl
              size="small"
              className="efh-selectBox"
              variant="standard"
            >
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
                className="efh-select"
                disableUnderline
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="found">Found</MenuItem>
                <MenuItem value="not_found">Not Found</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        <div className="efh-clearRight">
          <button
            type="button"
            className="efh-clearLink"
            onClick={() => setConfirmOpen(true)}
            disabled={clearing}
            style={{
              opacity: clearing ? 0.6 : 1,
              cursor: clearing ? "not-allowed" : "pointer",
            }}
          >
            {clearing ? "Clearing..." : "Clear History"}
          </button>

          <Tooltip title="Deletes email finder history for this user">
            <IconButton className="efh-infoBtn" size="small">
              <InfoOutlinedIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div> */}

      <div className="efh-toolbar">
        <div className="efh-left">
          {/* Search box (NEW) */}
          <div className="efh-controlBox efh-searchBox">
            <TextField
              variant="standard"
              placeholder="Search by name / domain / email"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              InputProps={{ disableUnderline: true }}
              className="efh-input"
            />
            <SearchIcon className="efh-endIcon" />
          </div>

          {/* Status dropdown (existing) */}
          <div className="efh-controlBox efh-selectWrap">
            <FormControl
              size="small"
              className="efh-selectBox"
              variant="standard"
            >
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
                className="efh-select"
                disableUnderline
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="found">Found</MenuItem>
                <MenuItem value="not_found">Not Found</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* ✅ moved INSIDE efh-left so mobile grid can align it on the right */}
          <div className="efh-clearRight">
            <button
              type="button"
              className="efh-clearLink"
              onClick={() => setConfirmOpen(true)}
              disabled={clearing}
              style={{
                opacity: clearing ? 0.6 : 1,
                cursor: clearing ? "not-allowed" : "pointer",
              }}
            >
              {clearing ? "Clearing..." : "Clear History"}
            </button>

            <Tooltip title="Deletes email finder history for this user">
              <IconButton className="efh-infoBtn" size="small">
                <InfoOutlinedIcon />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        classes={{ paper: "efh-confirmPaper" }}
      >
        <DialogTitle className="efh-confirmTitle">Clear History?</DialogTitle>

        <DialogContent className="efh-confirmBody">
          Are you sure you want to clear email finder history of{" "}
          <span className="efh-confirmCount">{totalRecords} records</span>?
        </DialogContent>

        <DialogActions className="efh-confirmActions">
          <Button
            onClick={() => setConfirmOpen(false)}
            className="efh-confirmCancel"
          >
            Cancel
          </Button>

          <Button
            onClick={async () => {
              setConfirmOpen(false);
              await clearHistory();
            }}
            className="efh-confirmClear"
            disabled={clearing}
          >
            Clear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Table card */}
      <Paper className="efh-tableCard" elevation={0}>
        <div className="efh-cardBody">
          <TableContainer className="efh-tableWrap">
            <Table stickyHeader size="small" className="efh-table">
              <TableHead>
                <TableRow>
                  <TableCell className="efh-th efh-col-name">Name</TableCell>
                  <TableCell className="efh-th efh-col-domain">
                    Domain
                  </TableCell>
                  <TableCell className="efh-th efh-col-email">Email</TableCell>
                  <TableCell className="efh-th efh-col-date">
                    Verified On
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visible.map((r, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowClass = isEven
                    ? "efh-row is-even"
                    : "efh-row is-odd";

                  const fullName =
                    r?.fullName || r?.nameInput || r?.inputName || "—";
                  const domain = r?.domain || "—";
                  const email = r?.email || "—";

                  return (
                    <TableRow key={r?._id || `${idx}`} className={rowClass}>
                      <TableCell className="efh-td efh-col-name">
                        {fullName}
                      </TableCell>

                      <TableCell className="efh-td efh-col-domain">
                        {domain}
                      </TableCell>

                      <TableCell className="efh-td efh-col-email">
                        {email}
                      </TableCell>

                      <TableCell className="efh-td efh-col-date">
                        {fmtDate(r?.createdAt || r?.updatedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!visible.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="efh-empty">
                      No email finder history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Sticky pagination */}
          <Box className="efh-pagination">
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Box>
        </div>
      </Paper>
    </div>
  );
}
