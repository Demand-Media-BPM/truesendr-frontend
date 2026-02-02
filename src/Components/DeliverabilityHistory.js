// src/Components/DeliverabilityHistory.js
import React, { useMemo, useState } from "react";
import axios from "axios";
import "./DeliverabilityHistory.css";

// MUI (same vibe as Single/Bulk history)
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  Dialog,
  Tooltip,
  IconButton,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import deliverabilityLogo from "../assets/illustrator/deliverability-orange.png";

function DeliverabilityHistoryEmpty() {
  return (
    <div className="delivH-empty">
      <img
        src={deliverabilityLogo}
        alt="Deliverability"
        className="delivH-emptyLogo"
        loading="lazy"
      />
      <div className="delivH-emptyTitle">Nothing here yet!</div>
      <div className="delivH-emptySub">
        Create a deliverability test to see results here
      </div>
    </div>
  );
}

export default function DeliverabilityHistory({
  username,
  tests,
  setTests,
  loadingTests,
  setError,
  fetchHistoryOnce,
  fetchTestById,
  mergeTestIntoState,
  baseHeaders,
  apiBase,

  providerLabelMap,
  providerBadge,
  IconDownload,
  donutBackground,
  creditsUtilizedFor,

  normalizeMailboxStatus,
  statusLabelForMailbox,
  statusDotClassForMailbox,

  effectiveTestStatusLabel,
  effectiveTestStatus,
}) {
  // history UI state (moved from Deliverability.js)
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  // report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [modalTest, setModalTest] = useState(null);

  // clear dialog
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  function historyStatusDotClass(test) {
    const v = String(effectiveTestStatus(test)).toUpperCase();
    if (v === "COMPLETED") return "hist-dot--green";
    if (v === "ACTIVE") return "hist-dot--blue";
    if (v === "NEW") return "hist-dot--gray";
    return "hist-dot--blue";
  }

  const filteredTests = useMemo(() => {
    const s = (searchTerm || "").trim().toLowerCase();
    const list = Array.isArray(tests) ? tests : [];
    if (!s) return list;
    return list.filter((t) =>
      String(t.name || "")
        .toLowerCase()
        .includes(s),
    );
  }, [tests, searchTerm]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredTests.slice(start, start + rowsPerPage);
  }, [filteredTests, page, rowsPerPage]);

  const currentCountsForModal = useMemo(() => {
    const mailboxes = Array.isArray(modalTest?.mailboxes)
      ? modalTest.mailboxes
      : [];
    let inbox = 0,
      spam = 0;
    mailboxes.forEach((m) => {
      const st = normalizeMailboxStatus(m.status);
      if (st === "inbox") inbox++;
      if (st === "spam") spam++;
    });
    return { inbox, spam, providers: mailboxes.length };
  }, [modalTest, normalizeMailboxStatus]);

  const handleDownloadReport = async (t) => {
    const testObj = t || modalTest;
    if (!testObj?._id || !username) return;

    try {
      setError("");
      const url = `${apiBase()}/deliverability/tests/${testObj._id}/report`;
      const res = await axios.get(url, {
        params: { username },
        headers: baseHeaders(username),
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      const createdStr = testObj.createdAt
        ? new Date(testObj.createdAt).toISOString().slice(0, 10)
        : "report";

      const safeName = (testObj.name || "test")
        .toLowerCase()
        .replace(/[^\w.-]+/g, "-");

      a.href = downloadUrl;
      a.setAttribute(
        "download",
        `deliverability-${safeName}-${createdStr}.csv`,
      );
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to download report.",
      );
    }
  };

  const openReportModal = async (t) => {
    setReportOpen(true);
    setModalTest(null);

    const fresh = await fetchTestById(t?._id);
    if (fresh) {
      setModalTest(fresh);
      mergeTestIntoState(fresh);
    } else {
      setModalTest(t);
    }
  };

  const closeReportModal = () => {
    setReportOpen(false);
    setModalTest(null);
  };

  const handleClearHistory = () => {
    setError("");
    setClearOpen(true);
  };

  const handleCloseClearDialog = () => {
    if (clearing) return;
    setClearOpen(false);
  };

  const handleConfirmClearHistory = async () => {
    setError("");
    if (!username) return setError("User not found. Please log in again.");

    try {
      setClearing(true);

      const url = `${apiBase()}/deliverability/history`;
      await axios.delete(url, {
        params: { username },
        headers: baseHeaders(username),
      });

      // Clear UI list
      setTests([]);
      setPage(0);

      setClearOpen(false);
      await fetchHistoryOnce();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Clear History endpoint is not available on backend yet.",
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="deliv-history">
      <div className="delivH-toolbar">
        <div className="delivH-left">
          <div className="delivH-controlBox delivH-searchBox">
            <TextField
              variant="standard"
              placeholder="Search by test name"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              InputProps={{ disableUnderline: true }}
              className="delivH-input"
            />
            <SearchIcon className="delivH-endIcon" />
          </div>
        </div>

        <div className="delivH-clearBtn">
          <span className="delivH-clearText" onClick={handleClearHistory}>
            Clear History
          </span>

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
              arrow: { sx: { color: "#fff" } },
            }}
          >
            <IconButton size="small" className="delivH-infoBtn">
              <InfoOutlineIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <Paper className="deliv-history-card" elevation={0}>
        {loadingTests ? (
          <div className="deliv-loading">Loading...</div>
        ) : filteredTests.length === 0 ? (
          <DeliverabilityHistoryEmpty />
        ) : (
          <>
            <TableContainer className="deliv-history-tableWrap deliv-scroll">
              <Table size="small" stickyHeader className="deliv-history-table">
                <TableHead>
                  <TableRow className="deliv-mui-head">
                    <TableCell className="col-test">Test Name</TableCell>
                    <TableCell className="col-status">Result Status</TableCell>
                    <TableCell className="col-created">Created Date</TableCell>
                    <TableCell className="col-providers" align="center">
                      Providers
                    </TableCell>
                    <TableCell className="col-num" align="center">
                      Inbox
                    </TableCell>
                    <TableCell className="col-num" align="center">
                      Spam
                    </TableCell>
                    <TableCell className="col-action" align="center">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {pagedRows.map((t) => {
                    const counts = t.counts || {};
                    const providers =
                      t.totalMailboxes ??
                      (Array.isArray(t.mailboxes) ? t.mailboxes.length : 0);

                    const created = t.createdAt
                      ? new Date(t.createdAt).toLocaleString()
                      : "-";

                    return (
                      <TableRow key={t._id} hover className="deliv-history-row">
                        <TableCell
                          className="col-test"
                          sx={{ fontWeight: 500 }}
                        >
                          {t.name || "-"}
                        </TableCell>

                        <TableCell className="col-status">
                          <div className="hist-status">
                            <span
                              className={`hist-dot ${historyStatusDotClass(t)}`}
                            />
                            <span className="hist-statusText">
                              {effectiveTestStatusLabel(t)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="col-created">{created}</TableCell>

                        <TableCell className="col-providers" align="center">
                          {providers}
                        </TableCell>
                        <TableCell className="col-num" align="center">
                          {counts.inbox || 0}
                        </TableCell>
                        <TableCell className="col-num" align="center">
                          {counts.spam || 0}
                        </TableCell>

                        <TableCell className="col-action" align="center">
                          <Button
                            variant="text"
                            size="small"
                            className="deliv-viewReportBtn"
                            onClick={() => openReportModal(t)}
                          >
                            View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredTests.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10) || 10);
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* REPORT MODAL */}
      <Dialog
        open={reportOpen}
        onClose={closeReportModal}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: { className: "delivReportPaper delivReportPaper--md" },
        }}
      >
        <div className="delivReportTitle">
          {modalTest?.name || "Deliverability Test Report"}
        </div>

        <div className="delivReportBody">
          <div className="delivReportTop">
            <div className="delivReportTopLeft">
              <div
                className="delivReportDonut"
                style={{
                  background: donutBackground({
                    inbox: currentCountsForModal.inbox,
                    spam: currentCountsForModal.spam,
                    providers: currentCountsForModal.providers,
                  }),
                }}
              >
                <div className="delivReportDonutHole" />
              </div>

              <div className="delivReportLegend">
                <div className="delivLegendRow">
                  <span className="delivPillDot dot-inbox" />
                  <span className="delivPillLabel">Inbox</span>
                  <span className="delivPillCount">
                    {currentCountsForModal.inbox}
                  </span>
                </div>

                <div className="delivLegendRow">
                  <span className="delivPillDot dot-spam" />
                  <span className="delivPillLabel">Spam</span>
                  <span className="delivPillCount">
                    {currentCountsForModal.spam}
                  </span>
                </div>

                <div className="delivReportDivider" />

                <div className="delivLegendRow delivLegendRow--muted">
                  <span className="delivPillDot delivPillDot--empty" />
                  <span className="delivPillLabel">Providers</span>
                  <span className="delivPillCount">
                    {currentCountsForModal.providers}
                  </span>
                </div>
              </div>
            </div>

            <div className="deliv-modal-right">
              <div className="credits-text">
                Credits utilized: {creditsUtilizedFor(modalTest)}
              </div>

              <button
                type="button"
                className="deliv-download-link"
                onClick={() => handleDownloadReport(modalTest)}
              >
                Download Result (CSV) <IconDownload />
              </button>
            </div>
          </div>

          <div className="delivReportTableWrap deliv-scroll">
            <div className="delivReportTableHead">
              <div>Provider</div>
              <div>Status</div>
              <div>Folder</div>
              <div>Last Checked</div>
              <div>Error</div>
            </div>

            {(Array.isArray(modalTest?.mailboxes)
              ? modalTest.mailboxes
              : []
            ).map((m, idx) => {
              const providerKey = m.provider;
              const providerLabel =
                providerLabelMap.get(providerKey) || providerKey;
              const stLabel = statusLabelForMailbox(m.status);
              const dotClass = statusDotClassForMailbox(m.status);

              return (
                <div className="delivReportTableRow" key={`${m.email}-${idx}`}>
                  <div className="cell-provider">
                    <div className="prov-mini">
                      {providerBadge(providerKey)}
                    </div>
                    <div className="prov-mini-name">{providerLabel}</div>
                  </div>

                  <div className="cell-status">
                    <span className={`dot ${dotClass}`} />
                    <span className="status-text">{stLabel}</span>
                  </div>

                  <div className="cell-muted">{m.folder || "-"}</div>

                  <div className="cell-muted">
                    {m.lastCheckedAt
                      ? new Date(m.lastCheckedAt).toLocaleString()
                      : "-"}
                  </div>

                  <div className="cell-error">{m.error || "-"}</div>
                </div>
              );
            })}
          </div>

          <div className="delivReportFooter">
            <button
              type="button"
              className="delivCloseBtn"
              onClick={closeReportModal}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>

      {/* CLEAR HISTORY DIALOG */}
      <Dialog
        open={clearOpen}
        onClose={handleCloseClearDialog}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: { className: "delivClearPaper" },
        }}
      >
        <div className="delivClearTitle">Clear History?</div>

        <div className="delivClearBody">
          Are you sure you want to clear deliverability history of{" "}
          <b>{filteredTests.length}</b> records?
        </div>

        <div className="delivClearActions">
          <button
            type="button"
            className="delivClearCancel"
            onClick={handleCloseClearDialog}
            disabled={clearing}
          >
            Cancel
          </button>

          <button
            type="button"
            className="delivClearConfirm"
            onClick={handleConfirmClearHistory}
            disabled={clearing}
          >
            {clearing ? "Clearing..." : "Clear"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
