// src/Components/PhoneHistory.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./PhoneHistory.css";
import { showAppToast } from "./showAppToast";

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
  Tooltip,
  IconButton,
} from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import phoneLogo from "../assets/illustrator/phone-orange.png";

import { default as InfoOutlinedIcon } from "@mui/icons-material/InfoOutlined";

// Flags
import * as FlagIcons from "country-flag-icons/react/3x2";

function Flag({ code, className }) {
  const C = (FlagIcons || {})[String(code || "").toUpperCase()];
  if (!C) return null;
  return <C className={className} />;
}

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

const COUNTRY_OPTIONS = [
  { code: "AF", label: "🇦🇫 Afghanistan (+93)" },
  { code: "AL", label: "🇦🇱 Albania (+355)" },
  { code: "DZ", label: "🇩🇿 Algeria (+213)" },
  { code: "AD", label: "🇦🇩 Andorra (+376)" },
  { code: "AO", label: "🇦🇴 Angola (+244)" },
  { code: "AR", label: "🇦🇷 Argentina (+54)" },
  { code: "AM", label: "🇦🇲 Armenia (+374)" },
  { code: "AU", label: "🇦🇺 Australia (+61)" },
  { code: "AT", label: "🇦🇹 Austria (+43)" },
  { code: "AZ", label: "🇦🇿 Azerbaijan (+994)" },
  { code: "BH", label: "🇧🇭 Bahrain (+973)" },
  { code: "BD", label: "🇧🇩 Bangladesh (+880)" },
  { code: "BY", label: "🇧🇾 Belarus (+375)" },
  { code: "BE", label: "🇧🇪 Belgium (+32)" },
  { code: "BZ", label: "🇧🇿 Belize (+501)" },
  { code: "BJ", label: "🇧🇯 Benin (+229)" },
  { code: "BT", label: "🇧🇹 Bhutan (+975)" },
  { code: "BO", label: "🇧🇴 Bolivia (+591)" },
  { code: "BA", label: "🇧🇦 Bosnia & Herzegovina (+387)" },
  { code: "BW", label: "🇧🇼 Botswana (+267)" },
  { code: "BR", label: "🇧🇷 Brazil (+55)" },
  { code: "BG", label: "🇧🇬 Bulgaria (+359)" },
  { code: "KH", label: "🇰🇭 Cambodia (+855)" },
  { code: "CM", label: "🇨🇲 Cameroon (+237)" },
  { code: "CA", label: "🇨🇦 Canada (+1)" },
  { code: "CL", label: "🇨🇱 Chile (+56)" },
  { code: "CN", label: "🇨🇳 China (+86)" },
  { code: "CO", label: "🇨🇴 Colombia (+57)" },
  { code: "CR", label: "🇨🇷 Costa Rica (+506)" },
  { code: "HR", label: "🇭🇷 Croatia (+385)" },
  { code: "CU", label: "🇨🇺 Cuba (+53)" },
  { code: "CY", label: "🇨🇾 Cyprus (+357)" },
  { code: "CZ", label: "🇨🇿 Czech Republic (+420)" },
  { code: "DK", label: "🇩🇰 Denmark (+45)" },
  { code: "DO", label: "🇩🇴 Dominican Republic (+1)" },
  { code: "EC", label: "🇪🇨 Ecuador (+593)" },
  { code: "EG", label: "🇪🇬 Egypt (+20)" },
  { code: "EE", label: "🇪🇪 Estonia (+372)" },
  { code: "ET", label: "🇪🇹 Ethiopia (+251)" },
  { code: "FI", label: "🇫🇮 Finland (+358)" },
  { code: "FR", label: "🇫🇷 France (+33)" },
  { code: "GE", label: "🇬🇪 Georgia (+995)" },
  { code: "DE", label: "🇩🇪 Germany (+49)" },
  { code: "GH", label: "🇬🇭 Ghana (+233)" },
  { code: "GR", label: "🇬🇷 Greece (+30)" },
  { code: "GT", label: "🇬🇹 Guatemala (+502)" },
  { code: "HN", label: "🇭🇳 Honduras (+504)" },
  { code: "HK", label: "🇭🇰 Hong Kong (+852)" },
  { code: "HU", label: "🇭🇺 Hungary (+36)" },
  { code: "IS", label: "🇮🇸 Iceland (+354)" },
  { code: "IN", label: "🇮🇳 India (+91)" },
  { code: "ID", label: "🇮🇩 Indonesia (+62)" },
  { code: "IR", label: "🇮🇷 Iran (+98)" },
  { code: "IQ", label: "🇮🇶 Iraq (+964)" },
  { code: "IE", label: "🇮🇪 Ireland (+353)" },
  { code: "IL", label: "🇮🇱 Israel (+972)" },
  { code: "IT", label: "🇮🇹 Italy (+39)" },
  { code: "JM", label: "🇯🇲 Jamaica (+1)" },
  { code: "JP", label: "🇯🇵 Japan (+81)" },
  { code: "JO", label: "🇯🇴 Jordan (+962)" },
  { code: "KZ", label: "🇰🇿 Kazakhstan (+7)" },
  { code: "KE", label: "🇰🇪 Kenya (+254)" },
  { code: "KR", label: "🇰🇷 South Korea (+82)" },
  { code: "KW", label: "🇰🇼 Kuwait (+965)" },
  { code: "LA", label: "🇱🇦 Laos (+856)" },
  { code: "LV", label: "🇱🇻 Latvia (+371)" },
  { code: "LB", label: "🇱🇧 Lebanon (+961)" },
  { code: "LY", label: "🇱🇾 Libya (+218)" },
  { code: "LI", label: "🇱🇮 Liechtenstein (+423)" },
  { code: "LT", label: "🇱🇹 Lithuania (+370)" },
  { code: "LU", label: "🇱🇺 Luxembourg (+352)" },
  { code: "MO", label: "🇲🇴 Macau (+853)" },
  { code: "MY", label: "🇲🇾 Malaysia (+60)" },
  { code: "MT", label: "🇲🇹 Malta (+356)" },
  { code: "MU", label: "🇲🇺 Mauritius (+230)" },
  { code: "MX", label: "🇲🇽 Mexico (+52)" },
  { code: "MD", label: "🇲🇩 Moldova (+373)" },
  { code: "MC", label: "🇲🇨 Monaco (+377)" },
  { code: "MN", label: "🇲🇳 Mongolia (+976)" },
  { code: "ME", label: "🇲🇪 Montenegro (+382)" },
  { code: "MA", label: "🇲🇦 Morocco (+212)" },
  { code: "MZ", label: "🇲🇿 Mozambique (+258)" },
  { code: "MM", label: "🇲🇲 Myanmar (+95)" },
  { code: "NP", label: "🇳🇵 Nepal (+977)" },
  { code: "NL", label: "🇳🇱 Netherlands (+31)" },
  { code: "NZ", label: "🇳🇿 New Zealand (+64)" },
  { code: "NG", label: "🇳🇬 Nigeria (+234)" },
  { code: "NO", label: "🇳🇴 Norway (+47)" },
  { code: "OM", label: "🇴🇲 Oman (+968)" },
  { code: "PK", label: "🇵🇰 Pakistan (+92)" },
  { code: "PA", label: "🇵🇦 Panama (+507)" },
  { code: "PY", label: "🇵🇾 Paraguay (+595)" },
  { code: "PE", label: "🇵🇪 Peru (+51)" },
  { code: "PH", label: "🇵🇭 Philippines (+63)" },
  { code: "PL", label: "🇵🇱 Poland (+48)" },
  { code: "PT", label: "🇵🇹 Portugal (+351)" },
  { code: "QA", label: "🇶🇦 Qatar (+974)" },
  { code: "RO", label: "🇷🇴 Romania (+40)" },
  { code: "RU", label: "🇷🇺 Russia (+7)" },
  { code: "SA", label: "🇸🇦 Saudi Arabia (+966)" },
  { code: "RS", label: "🇷🇸 Serbia (+381)" },
  { code: "SG", label: "🇸🇬 Singapore (+65)" },
  { code: "SK", label: "🇸🇰 Slovakia (+421)" },
  { code: "SI", label: "🇸🇮 Slovenia (+386)" },
  { code: "ZA", label: "🇿🇦 South Africa (+27)" },
  { code: "ES", label: "🇪🇸 Spain (+34)" },
  { code: "LK", label: "🇱🇰 Sri Lanka (+94)" },
  { code: "SE", label: "🇸🇪 Sweden (+46)" },
  { code: "CH", label: "🇨🇭 Switzerland (+41)" },
  { code: "TW", label: "🇹🇼 Taiwan (+886)" },
  { code: "TH", label: "🇹🇭 Thailand (+66)" },
  { code: "TR", label: "🇹🇷 Turkey (+90)" },
  { code: "UA", label: "🇺🇦 Ukraine (+380)" },
  { code: "AE", label: "🇦🇪 United Arab Emirates (+971)" },
  { code: "GB", label: "🇬🇧 United Kingdom (+44)" },
  { code: "US", label: "🇺🇸 United States (+1)" },
  { code: "UY", label: "🇺🇾 Uruguay (+598)" },
  { code: "UZ", label: "🇺🇿 Uzbekistan (+998)" },
  { code: "VE", label: "🇻🇪 Venezuela (+58)" },
  { code: "VN", label: "🇻🇳 Vietnam (+84)" },
  { code: "YE", label: "🇾🇪 Yemen (+967)" },
  { code: "ZM", label: "🇿🇲 Zambia (+260)" },
  { code: "ZW", label: "🇿w Zimbabwe (+263)" },
];

function extractDial(label) {
  const m = String(label || "").match(/\(\+(\d+)\)/);
  return m ? `+${m[1]}` : "";
}

const DIAL_BY_ISO2 = Object.fromEntries(
  COUNTRY_OPTIONS.map(({ code, label }) => [
    String(code || "").toUpperCase(),
    extractDial(label),
  ]),
);

// Reverse map: "+44" -> "GB"
const ISO2_BY_DIAL = Object.fromEntries(
  COUNTRY_OPTIONS.map(({ code, label }) => [
    extractDial(label),
    String(code || "").toUpperCase(),
  ]).filter(([dial]) => !!dial),
);

function normalizeDial(v) {
  const digits = String(v || "").replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

// Accepts: ISO2 ("GB") OR dial ("+44") OR label-like "(+44)"
function iso2FromAny(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase();
  if (!raw) return "";

  // If already ISO2
  if (/^[A-Z]{2}$/.test(raw)) return raw;

  // If dial-ish
  const dial = normalizeDial(raw);
  return ISO2_BY_DIAL[dial] || "";
}

export default function PhoneHistory({ username, token, apiBase }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    // if apiBase already ends with /api, don't add another /api
    if (base.endsWith("/api"))
      return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    return `${base}/api${path.startsWith("/") ? "" : "/"}${path}`;
  }

  async function fetchHistory() {
    if (!username) return;
    try {
      const res = await axios.get(apiUrl("/phone/history?limit=500"), {
        headers: buildHeaders(),
      });
      if (res.data?.ok)
        setRows(Array.isArray(res.data.history) ? res.data.history : []);
      else setRows([]);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const filtered = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    if (status === "all") return rows;

    const wantValid = status === "valid";
    return rows.filter((r) => Boolean(r?.valid) === wantValid);
  }, [rows, status]);

  const totalRecords = filtered.length; // this will show count like "45 records"

  const visible = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filtered.slice(start, end);
  }, [filtered, page, rowsPerPage]);

  const [clearing, setClearing] = useState(false);

  async function clearHistory() {
    if (clearing) return;

    if (!username) {
      showAppToast({
        type: "warning",
        title: "User missing",
        message: "Please log in again to clear phone history.",
      });
      return;
    }

    setClearing(true);
    try {
      const url = apiUrl("/phone/history");

      const res = await axios.delete(url, {
        headers: buildHeaders(),
        withCredentials: true,
      });

      // if backend returns ok:true, refresh
      if (res.data?.ok) {
        await fetchHistory();
        setPage(0);
        showAppToast({
          type: "success",
          title: "History cleared",
          message: "Phone validation history was removed successfully.",
        });
      } else {
        // fallback refresh anyway
        await fetchHistory();
      }
    } catch (e) {
      console.error(
        "❌ Clear history failed:",
        e?.response?.data || e?.message || e,
      );

      showAppToast({
        type: "error",
        title: "Clear failed",
        message:
          e?.response?.data?.message ||
          e?.message ||
          "Could not clear phone validation history.",
      });

      await fetchHistory();
    } finally {
      setClearing(false);
    }
  }

  function confidenceCell(score) {
    const pct =
      typeof score === "number" ? Math.max(0, Math.min(100, score)) : null;

    if (pct == null) return <span className="phh-dash">—</span>;

    return (
      <span className="phh-confWrap">
        <span className="phh-confBar">
          <span className="phh-confFill" style={{ width: `${pct}%` }} />
        </span>
        <span className="phh-confPct">{pct}%</span>
      </span>
    );
  }

  return (
    <div className="phh-wrap">
      {/* Toolbar row */}
      <div className="phh-toolbar">
        <div className="phh-controlBox">
          <FormControl
            size="small"
            className="phh-selectBox"
            variant="standard"
          >
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              className="phh-select"
              disableUnderline
            >
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="valid">Valid</MenuItem>
              <MenuItem value="invalid">Invalid</MenuItem>
            </Select>
          </FormControl>
        </div>

        <div className="phh-clearRight">
          <button
            type="button"
            className="phh-clearLink"
            onClick={() => setConfirmOpen(true)}
            disabled={clearing}
            style={{
              opacity: clearing ? 0.6 : 1,
              cursor: clearing ? "not-allowed" : "pointer",
            }}
          >
            {clearing ? "Clearing..." : "Clear History"}
          </button>

          <Tooltip title="Deletes phone validation history for this user">
            <IconButton className="phh-infoBtn" size="small">
              <InfoOutlinedIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        classes={{ paper: "phh-confirmPaper" }}
      >
        <DialogTitle className="phh-confirmTitle">Clear History?</DialogTitle>

        <DialogContent className="phh-confirmBody">
          Are you sure you want to clear phone history of{" "}
          <span className="phh-confirmCount">{totalRecords} records</span>?
        </DialogContent>

        <DialogActions className="phh-confirmActions">
          <Button
            onClick={() => setConfirmOpen(false)}
            className="phh-confirmCancel"
          >
            Cancel
          </Button>

          <Button
            onClick={async () => {
              setConfirmOpen(false);
              await clearHistory();
            }}
            className="phh-confirmClear"
            disabled={clearing}
          >
            Clear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Table card */}
      <Paper className="phh-tableCard" elevation={0}>
        <div className="phh-cardBody">
          <TableContainer className="phh-tableWrap">
            <Table stickyHeader size="small" className="phh-table">
              <TableHead>
                <TableRow>
                  <TableCell className="phh-th phh-col-phone">
                    Phone Number
                  </TableCell>
                  <TableCell className="phh-th phh-col-country">
                    Country
                  </TableCell>
                  <TableCell className="phh-th phh-col-status">
                    Status
                  </TableCell>
                  <TableCell className="phh-th phh-col-provider">
                    Provider
                  </TableCell>
                  <TableCell className="phh-th phh-col-line">
                    Line Type
                  </TableCell>
                  <TableCell className="phh-th phh-col-conf">
                    Confidence
                  </TableCell>
                  <TableCell className="phh-th phh-col-date">
                    Validated On
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visible.map((r, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowClass = isEven
                    ? "phh-row is-even"
                    : "phh-row is-odd";

                  // r.country is ISO2 from backend (best for flags). inputCountry is dial like "+44".
                  const iso2 =
                    iso2FromAny(r?.country) || iso2FromAny(r?.inputCountry);
                  const dial = iso2
                    ? DIAL_BY_ISO2[iso2] || ""
                    : normalizeDial(r?.inputCountry);

                  const dialShown = dial ? `(${dial})` : "";

                  const isValid = !!r?.valid;

                  return (
                    <TableRow key={r?._id || `${idx}`} className={rowClass}>
                      <TableCell className="phh-td phh-col-phone">
                        {r?.e164 || r?.inputNumber || "—"}
                      </TableCell>

                      <TableCell className="phh-td phh-col-country">
                        <div className="phh-countryCell">
                          <Flag code={iso2 || "UN"} className="phh-flag" />
                          <span className="phh-countryText">
                            {iso2 || "—"} {dialShown}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="phh-td phh-col-status">
                        <span className="phh-status">
                          <span
                            className={
                              isValid
                                ? "phh-dot phh-dot-valid"
                                : "phh-dot phh-dot-invalid"
                            }
                            aria-hidden="true"
                          />

                          {isValid ? "Valid" : "Invalid"}
                        </span>
                      </TableCell>

                      <TableCell className="phh-td phh-col-provider">
                        {r?.carrier || "—"}
                      </TableCell>

                      <TableCell className="phh-td phh-col-line">
                        {r?.lineType || "—"}
                      </TableCell>

                      <TableCell className="phh-td phh-col-conf">
                        {/* {confidenceCell(
                          typeof r?.confidenceLevel === "number"
                            ? r.confidenceLevel
                            : r?.leadQualityScore
                        )} */}
                        {confidenceCell(
                          typeof r?.confidenceLevel === "number"
                            ? r.confidenceLevel
                            : typeof r?.leadQualityPercentage === "number"
                              ? r.leadQualityPercentage
                              : r?.leadQualityScore,
                        )}
                      </TableCell>

                      <TableCell className="phh-td phh-col-date">
                        {fmtDate(r?.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!visible.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="phh-empty">
                      <div className="phh-emptyWrap">
                        <img
                          src={phoneLogo}
                          alt="Phone"
                          className="phh-emptyLogo"
                        />
                        <div className="phh-emptyTitle">Nothing here yet!</div>
                        <div className="phh-emptySub">
                          Validate a phone number to see results
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Sticky pagination */}
          <Box className="phh-pagination">
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
