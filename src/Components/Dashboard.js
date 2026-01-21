import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "./Dashboard.css";
import { CiCircleCheck } from "react-icons/ci";
import { CiCircleRemove } from "react-icons/ci";
import { CiCircleQuestion } from "react-icons/ci";
import { CiCircleAlert } from "react-icons/ci";

// ---------- config helpers ----------
function apiBase() {
  const env = process.env.REACT_APP_API_BASE;
  if (env) return env.replace(/\/+$/, "") + "/api";
  return `${window.location.origin}/api`;
}

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

function baseHeaders(username) {
  const authB64 =
    process.env.REACT_APP_BULK_AUTH_B64 || process.env.REACT_APP_BASIC_AUTH_B64;
  const h = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (username) h["X-User"] = username;
  if (authB64) h["Authorization"] = `Basic ${authB64}`;
  return h;
}

// Map raw status text to a normalized category for CSS
function getStatusCategory(status) {
  const s = String(status || "").toLowerCase();

  if (
    s.includes("invalid") ||
    s.includes("undeliverable") ||
    s.includes("failed") ||
    s.includes("error")
  ) {
    return "invalid";
  }
  if (s.includes("risky")) return "risky";
  if (s.includes("unknown")) return "unknown";

  // everything else (valid, completed, etc.)
  return "valid";
}

function getBulkStatusCategory(status) {
  const s = String(status || "").toLowerCase();

  if (s.includes("fail") || s.includes("error") || s.includes("cancel")) {
    return "invalid";
  }
  if (s.includes("run") || s.includes("preflight")) {
    return "risky";
  }
  // "completed" / "done" treated as success/valid
  return "valid";
}

// ---------- misc helpers ----------
const COLORS = {
  deliverable: "#059569",
  risky: "#f49e0a",
  undeliverable: "#db2626",
  unknown: "#64748a",
};

const fmt = (n) => (n || 0).toLocaleString();

function fmtDateTime(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ----- responsive helpers for charts -----
function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth || 1024);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth || 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

// Keep x-axis labels short and clean
function shortLabel(s, max = 8) {
  const t = String(s || "");
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function HistTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  // Take the pretty label from the data row if available
  const payloadRow = payload[0]?.payload || {};
  const title = payloadRow.dateLabel || label;

  const map = Object.fromEntries(payload.map((p) => [p.name, p.value || 0]));
  const total =
    (map.Deliverable || 0) +
    (map.Risky || 0) +
    (map.Undeliverable || 0) +
    (map.Unknown || 0);

  const Row = ({ color, name, value }) => (
    <div className="tt-line">
      <span className="tt-left">
        <span className="dot" style={{ "--c": color }} />
        {name}
      </span>
      <span className="tt-right">{fmt(value)}</span>
    </div>
  );

  return (
    <div className="tt">
      <div className="tt-title">{title || "-"}</div>
      <Row
        color={COLORS.deliverable}
        name="Valid"
        value={map.Deliverable || 0}
      />
      <Row
        color={COLORS.undeliverable}
        name="Invalid"
        value={map.Undeliverable || 0}
      />
      <Row color={COLORS.risky} name="Risky" value={map.Risky || 0} />
      <Row color={COLORS.unknown} name="Unknown" value={map.Unknown || 0} />
      <div className="tt-total">
        Total: <b>{fmt(total)}</b>
      </div>
    </div>
  );
}

// map header range key to "days" for backend
function rangeDays(key) {
  switch (key) {
    case "today":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30;
    case "twoMonths":
      return 60;
    default:
      return 30;
  }
}

// ---------- main component ----------
export default function Dashboard() {
  const navigate = useNavigate();
  const username = getUsername();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState(null);

  // top header range: today / this week / this month / last 2 months
  const [rangeKey, setRangeKey] = useState("month");

  // usage (histogram) toggle
  const [histMode, setHistMode] = useState("both"); // 'bulk' | 'single' | 'both'

  // recent validations
  const [recentType, setRecentType] = useState("single"); // 'single' | 'bulk'
  const [recentItems, setRecentItems] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState("");

  const ww = useWindowWidth();

  const chartCfg = useMemo(() => {
    // breakpoints: 425, 768, 1024, 1440, 2560
    if (ww <= 425) {
      return {
        tickFont: 10,
        xAngle: -35,
        xHeight: 44,
        xInterval: 1, // show every 2nd label
        barSize: 14,
        margin: { top: 14, right: 10, left: 0, bottom: 44 },
      };
    }
    if (ww <= 768) {
      return {
        tickFont: 11,
        xAngle: -25,
        xHeight: 38,
        xInterval: 0,
        barSize: 16,
        margin: { top: 16, right: 12, left: 0, bottom: 42 },
      };
    }
    if (ww <= 1024) {
      return {
        tickFont: 12,
        xAngle: 0,
        xHeight: 28,
        xInterval: 0,
        barSize: 22,
        margin: { top: 18, right: 14, left: 6, bottom: 28 },
      };
    }
    if (ww <= 1440) {
      return {
        tickFont: 12,
        xAngle: 0,
        xHeight: 28,
        xInterval: 0,
        barSize: 30,
        margin: { top: 20, right: 16, left: 10, bottom: 28 },
      };
    }
    // 2560+
    return {
      tickFont: 13,
      xAngle: 0,
      xHeight: 28,
      xInterval: 0,
      barSize: 22,
      margin: { top: 22, right: 18, left: 12, bottom: 28 },
    };
  }, [ww]);

  // --------- data fetch: summary ----------
  const fetchSummary = async () => {
    if (!username) return;
    setLoading(true);
    setErr("");
    try {
      const days = rangeDays(rangeKey);
      const params = new URLSearchParams();
      params.set("mode", "last");
      params.set("days", String(days));
      params.set("username", username || "");
      const resp = await fetch(
        `${apiBase()}/dashboard/summary?${params.toString()}`,
        { method: "GET", headers: baseHeaders(username) }
      );
      if (!resp.ok) throw new Error((await resp.text()) || "Failed to load");
      const data = await resp.json();
      setSummary(data);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!username) {
      setErr("Not logged in: username missing. Please sign in again.");
      setSummary(null);
      return;
    }
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, rangeKey]);

  // --------- data fetch: recent validations ----------
  const fetchRecent = async (type) => {
    if (!username) return;
    setRecentLoading(true);
    setRecentError("");
    try {
      const params = new URLSearchParams();
      params.set("username", username);
      params.set("type", type);
      params.set("limit", "5");

      const resp = await fetch(
        `${apiBase()}/dashboard/recent?${params.toString()}`,
        { method: "GET", headers: baseHeaders(username) }
      );
      if (!resp.ok) throw new Error((await resp.text()) || "Failed to load");
      const data = await resp.json();
      setRecentItems(data.items || []);
    } catch (e) {
      setRecentError(e.message || "Failed to load");
      setRecentItems([]);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    if (!username) return;
    fetchRecent(recentType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, recentType]);

  // --------- derived summary values ----------
  const totalsSingle = useMemo(
    () =>
      summary?.totals?.single || {
        emails: 0,
        deliverable: 0,
        risky: 0,
        undeliverable: 0,
        unknown: 0,
        requests: 0,
      },
    [summary]
  );

  const totalsBulk = useMemo(
    () =>
      summary?.totals?.bulk || {
        emails: 0,
        deliverable: 0,
        risky: 0,
        undeliverable: 0,
        unknown: 0,
        requests: 0,
      },
    [summary]
  );

  const daily = useMemo(() => summary?.daily || [], [summary]);

  const totalEmails = totalsSingle.emails + totalsBulk.emails;
  const totalValid = totalsSingle.deliverable + totalsBulk.deliverable;
  const totalInvalid = totalsSingle.undeliverable + totalsBulk.undeliverable;
  const totalRisky = totalsSingle.risky + totalsBulk.risky;
  const totalUnknown = totalsSingle.unknown + totalsBulk.unknown;

  const pct = (value) =>
    totalEmails > 0 ? Math.round((value * 100) / totalEmails) : 0;

  const pieBulk = useMemo(
    () => [
      {
        name: "Deliverable",
        value: totalsBulk.deliverable,
        fill: COLORS.deliverable,
      },
      { name: "Risky", value: totalsBulk.risky, fill: COLORS.risky },
      {
        name: "Undeliverable",
        value: totalsBulk.undeliverable,
        fill: COLORS.undeliverable,
      },
      { name: "Unknown", value: totalsBulk.unknown, fill: COLORS.unknown },
    ],
    [totalsBulk]
  );

  const pieSingle = useMemo(
    () => [
      {
        name: "Deliverable",
        value: totalsSingle.deliverable,
        fill: COLORS.deliverable,
      },
      { name: "Risky", value: totalsSingle.risky, fill: COLORS.risky },
      {
        name: "Undeliverable",
        value: totalsSingle.undeliverable,
        fill: COLORS.undeliverable,
      },
      { name: "Unknown", value: totalsSingle.unknown, fill: COLORS.unknown },
    ],
    [totalsSingle]
  );

  const barsData = useMemo(() => {
    const TOTAL_SLOTS = 10;

    // 1) Normalize daily into per-day values based on histMode
    const perDay = daily.map((d) => {
      let s;
      if (histMode === "single") {
        s = d.single || {};
      } else if (histMode === "bulk") {
        s = d.bulk || {};
      } else {
        // both
        s = {
          valid: (d.single.valid || 0) + (d.bulk.valid || 0),
          risky: (d.single.risky || 0) + (d.bulk.risky || 0),
          invalid: (d.single.invalid || 0) + (d.bulk.invalid || 0),
          unknown: (d.single.unknown || 0) + (d.bulk.unknown || 0),
          emails: (d.single.emails || 0) + (d.bulk.emails || 0),
        };
      }

      return {
        dateLabel: d.date ? d.date.slice(5) : "",
        Deliverable: s.valid || 0,
        Risky: s.risky || 0,
        Undeliverable: s.invalid || 0,
        Unknown: s.unknown || 0,
        total: s.emails || 0,
      };
    });

    // helper: create an empty bar slot (just width, no bar)
    const makeEmptyBar = (slot) => ({
      slot,
      dateLabel: "",
      Deliverable: 0,
      Risky: 0,
      Undeliverable: 0,
      Unknown: 0,
      total: 0,
    });

    const bars = [];

    // 2) Fill active bars based on rangeKey
    if (rangeKey === "today") {
      if (perDay[0]) {
        bars.push({
          slot: 1,
          dateLabel: perDay[0].dateLabel || "Today",
          Deliverable: perDay[0].Deliverable,
          Risky: perDay[0].Risky,
          Undeliverable: perDay[0].Undeliverable,
          Unknown: perDay[0].Unknown,
          total: perDay[0].total,
        });
      }
      // rest will be empty
    } else if (rangeKey === "week") {
      // up to 7 days -> first 7 bars
      perDay.slice(0, 7).forEach((d, idx) => {
        bars.push({
          slot: idx + 1,
          dateLabel: d.dateLabel,
          Deliverable: d.Deliverable,
          Risky: d.Risky,
          Undeliverable: d.Undeliverable,
          Unknown: d.Unknown,
          total: d.total,
        });
      });
    } else {
      // "month" or "twoMonths" => group into weeks (chunks of 7 days)
      const weekChunks = [];
      for (let i = 0; i < perDay.length; i += 7) {
        weekChunks.push(perDay.slice(i, i + 7));
      }

      weekChunks.forEach((weekArr, idx) => {
        if (bars.length >= TOTAL_SLOTS) return; // safety

        const agg = weekArr.reduce(
          (acc, d) => {
            acc.Deliverable += d.Deliverable;
            acc.Risky += d.Risky;
            acc.Undeliverable += d.Undeliverable;
            acc.Unknown += d.Unknown;
            acc.total += d.total;
            return acc;
          },
          {
            Deliverable: 0,
            Risky: 0,
            Undeliverable: 0,
            Unknown: 0,
            total: 0,
          }
        );

        bars.push({
          slot: bars.length + 1,
          dateLabel: `Week ${idx + 1}`, // you can swap later to a nicer text
          Deliverable: agg.Deliverable,
          Risky: agg.Risky,
          Undeliverable: agg.Undeliverable,
          Unknown: agg.Unknown,
          total: agg.total,
        });
      });
    }

    // 3) Pad to exactly 10 slots with empty bars (so width is constant)
    while (bars.length < TOTAL_SLOTS) {
      bars.push(makeEmptyBar(bars.length + 1));
    }

    // Ensure exactly 10
    return bars.slice(0, TOTAL_SLOTS);
  }, [daily, histMode, rangeKey]);

  const allEmpty =
    !loading && !err && totalsSingle.emails + totalsBulk.emails === 0;

  // ---------- render ----------
  return (
    <div className="dash-container">
      {/* HEADER BAR */}
      <div className="dash-header header-bar">
        <div className="header-left">
          <h2>Dashboard</h2>
        </div>
        <div className="header-right">
          <div className="segmenteds header-range" role="tablist">
            <button
              className={`seg ${rangeKey === "today" ? "is-active" : ""}`}
              onClick={() => setRangeKey("today")}
              aria-pressed={rangeKey === "today"}
            >
              Today
            </button>
            <button
              className={`seg ${rangeKey === "week" ? "is-active" : ""}`}
              onClick={() => setRangeKey("week")}
              aria-pressed={rangeKey === "week"}
            >
              This Week
            </button>
            <button
              className={`seg ${rangeKey === "month" ? "is-active" : ""}`}
              onClick={() => setRangeKey("month")}
              aria-pressed={rangeKey === "month"}
            >
              This Month
            </button>
            <button
              className={`seg ${rangeKey === "twoMonths" ? "is-active" : ""}`}
              onClick={() => setRangeKey("twoMonths")}
              aria-pressed={rangeKey === "twoMonths"}
            >
              Last 2 Months
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="skeleton-wrap">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-wide" />
        </div>
      )}

      {err && (
        <div className="alert error">
          <div>
            <strong>Failed to load.</strong> {err}
          </div>
          <button className="btn btn-ghost" onClick={fetchSummary}>
            Retry
          </button>
        </div>
      )}

      {allEmpty && !loading && !err && (
        <div className="empty card">
          <div className="empty-title">No activity in this period</div>
          <div className="empty-sub">Try selecting a different range.</div>
        </div>
      )}

      {!loading && !err && !allEmpty && (
        <>
          {/* KPI row – top summary cards */}
          <div className="grid kpi-five section-gap">
            {/* TOTAL */}
            <div className="kpi card kpi-main">
              <div className="kpi-top">
                <span className="kpi-label">Total</span>
              </div>
              <div className="kpi-main-row">
                <div className="kpi-main-left">
                  <span className="kpi-value">{fmt(totalEmails)}</span>
                </div>
                {/* Total has no icon in Figma */}
              </div>
            </div>

            <div className="kpi card kpi-main">
              <div className="kpi-top">
                <span className="kpi-label">Valid</span>
              </div>
              <div className="kpi-main-row">
                <div className="kpi-main-left">
                  <span className="kpi-value">{fmt(totalValid)}</span>
                  <span className="kpi-pill kpi-pill-valid">
                    {pct(totalValid)}%
                  </span>
                </div>

                <div className="kpi-icon-box kpi-icon-box-valid">
                  <CiCircleCheck size={20} />
                </div>
              </div>
            </div>

            <div className="kpi card kpi-main">
              <div className="kpi-top">
                <span className="kpi-label">Invalid</span>
              </div>
              <div className="kpi-main-row">
                <div className="kpi-main-left">
                  <span className="kpi-value">{fmt(totalInvalid)}</span>
                  <span className="kpi-pill kpi-pill-invalid">
                    {pct(totalInvalid)}%
                  </span>
                </div>

                <div className="kpi-icon-box kpi-icon-box-invalid">
                  <CiCircleRemove size={20} />
                </div>
              </div>
            </div>

            <div className="kpi card kpi-main">
              <div className="kpi-top">
                <span className="kpi-label">Risky</span>
              </div>
              <div className="kpi-main-row">
                <div className="kpi-main-left">
                  <span className="kpi-value">{fmt(totalRisky)}</span>
                  <span className="kpi-pill kpi-pill-risky">
                    {pct(totalRisky)}%
                  </span>
                </div>

                <div className="kpi-icon-box kpi-icon-box-risky">
                  <CiCircleAlert size={20} />
                </div>
              </div>
            </div>

            <div className="kpi card kpi-main">
              <div className="kpi-top">
                <span className="kpi-label">Unknown</span>
              </div>
              <div className="kpi-main-row">
                <div className="kpi-main-left">
                  <span className="kpi-value">{fmt(totalUnknown)}</span>
                  <span className="kpi-pill kpi-pill-unknown">
                    {pct(totalUnknown)}%
                  </span>
                </div>

                <div className="kpi-icon-box kpi-icon-box-unknown">
                  <CiCircleQuestion size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Single + Bulk donuts */}
          <div className="grid two section-gap">
            {/* Single validation */}
            <div className="card">
              <div className="card-top">
                <div className="card-title">Single Validation</div>
              </div>

              <div className="card-content figma-card">
                {/* Donut left */}
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieSingle}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        isAnimationActive
                      >
                        {pieSingle.map((e, i) => (
                          <Cell key={`s-${i}`} fill={e.fill} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(val, n) => [fmt(val), n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend / counts right */}
                <div className="stats-list">
                  <div className="stat-row">
                    <span
                      className="legend"
                      style={{ "--c": COLORS.deliverable }}
                    >
                      Valid
                    </span>
                    <span className="stat-count">
                      {fmt(totalsSingle.deliverable)} (
                      {totalsSingle.emails
                        ? Math.round(
                            (totalsSingle.deliverable * 100) /
                              totalsSingle.emails
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="stat-row">
                    <span
                      className="legend"
                      style={{ "--c": COLORS.undeliverable }}
                    >
                      Invalid
                    </span>
                    <span className="stat-count">
                      {fmt(totalsSingle.undeliverable)} (
                      {totalsSingle.emails
                        ? Math.round(
                            (totalsSingle.undeliverable * 100) /
                              totalsSingle.emails
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="legend" style={{ "--c": COLORS.risky }}>
                      Risky
                    </span>
                    <span className="stat-count">
                      {fmt(totalsSingle.risky)} (
                      {totalsSingle.emails
                        ? Math.round(
                            (totalsSingle.risky * 100) / totalsSingle.emails
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="legend" style={{ "--c": COLORS.unknown }}>
                      Unknown
                    </span>
                    <span className="stat-count">
                      {fmt(totalsSingle.unknown)} (
                      {totalsSingle.emails
                        ? Math.round(
                            (totalsSingle.unknown * 100) / totalsSingle.emails
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="stat-row total-row">
                    <span className="legend total-label">Total Emails</span>
                    <span className="stat-count">
                      {fmt(totalsSingle.emails)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <button
                  className="btn-cta-outline btn-cta-full"
                  onClick={() => navigate("/single")}
                >
                  Validate Email
                </button>
              </div>
            </div>

            {/* Bulk validation */}
            <div className="card">
              <div className="card-top">
                <div className="card-title">Bulk Validation</div>
              </div>

              <div className="card-content figma-card">
                {/* Donut left */}
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieBulk}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        isAnimationActive
                      >
                        {pieBulk.map((e, i) => (
                          <Cell key={`b-${i}`} fill={e.fill} />
                        ))}
                        {/* <Label
                          position="center"
                          content={CenterLabel({
                            value: fmt(totalsBulk.emails),
                            sub: "Total Emails",
                          })}
                        /> */}
                      </Pie>
                      <RTooltip formatter={(val, n) => [fmt(val), n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend / counts right */}
                <div className="stats-list">
                  <div className="stat-row">
                    <span
                      className="legend"
                      style={{ "--c": COLORS.deliverable }}
                    >
                      Valid
                    </span>
                    <span className="stat-count">
                      {fmt(totalsBulk.deliverable)} (
                      {totalsBulk.emails
                        ? Math.round(
                            (totalsBulk.deliverable * 100) / totalsBulk.emails
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="stat-row">
                    <span
                      className="legend"
                      style={{ "--c": COLORS.undeliverable }}
                    >
                      Invalid
                    </span>
                    <span className="stat-count">
                      {fmt(totalsBulk.undeliverable)} (
                      {totalsBulk.emails
                        ? Math.round(
                            (totalsBulk.undeliverable * 100) / totalsBulk.emails
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="legend" style={{ "--c": COLORS.risky }}>
                      Risky
                    </span>
                    <span className="stat-count">
                      {fmt(totalsBulk.risky)} (
                      {totalsBulk.emails
                        ? Math.round(
                            (totalsBulk.risky * 100) / totalsBulk.emails
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="legend" style={{ "--c": COLORS.unknown }}>
                      Unknown
                    </span>
                    <span className="stat-count">
                      {fmt(totalsBulk.unknown)} (
                      {totalsBulk.emails
                        ? Math.round(
                            (totalsBulk.unknown * 100) / totalsBulk.emails
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="stat-row total-row">
                    <span className="legend total-label">Total Emails</span>
                    <span className="stat-count">{fmt(totalsBulk.emails)}</span>
                  </div>
                  <div className="stat-row total-row">
                    <span className="legend total-label">Total Lists</span>
                    <span className="stat-count">
                      {fmt(totalsBulk.requests)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <button
                  className="btn-cta-outline btn-cta-full"
                  onClick={() => navigate("/bulk")}
                >
                  Upload List
                </button>
              </div>
            </div>
          </div>

          {/* Usage histogram */}
          <div className="card section-gap-large">
            <div className="card-top usage-top">
              <div className="card-title">Usage</div>
              <div className="segmenteds usage-range">
                <button
                  className={`seg ${histMode === "both" ? "is-active" : ""}`}
                  onClick={() => setHistMode("both")}
                >
                  Both
                </button>
                <button
                  className={`seg ${histMode === "single" ? "is-active" : ""}`}
                  onClick={() => setHistMode("single")}
                >
                  Single
                </button>
                <button
                  className={`seg ${histMode === "bulk" ? "is-active" : ""}`}
                  onClick={() => setHistMode("bulk")}
                >
                  Bulk
                </button>
              </div>
            </div>

            <div className="card-chart chart-taller">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barsData}
                  margin={chartCfg.margin}
                  barSize={chartCfg.barSize}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />

                  <XAxis
                    dataKey="dateLabel" 
                    interval={0} 
                    tickLine={false}
                    axisLine={false}
                    height={chartCfg.xHeight}
                    angle={chartCfg.xAngle}
                    textAnchor={chartCfg.xAngle ? "end" : "middle"}
                    tick={{ fontSize: chartCfg.tickFont }}
                    tickFormatter={(v) =>
                      shortLabel(v || "", ww <= 425 ? 6 : 9)
                    }
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: chartCfg.tickFont }}
                    width={ww <= 425 ? 28 : 36}
                  />

                  <RTooltip content={<HistTooltip />} />

                  <Bar dataKey="Unknown" stackId="a" fill={COLORS.unknown} />
                  <Bar dataKey="Risky" stackId="a" fill={COLORS.risky} />
                  <Bar
                    dataKey="Undeliverable"
                    stackId="a"
                    fill={COLORS.undeliverable}
                  />
                  <Bar
                    dataKey="Deliverable"
                    stackId="a"
                    fill={COLORS.deliverable}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="hist-top-legend">
              <span className="legend" style={{ "--c": COLORS.deliverable }}>
                Valid
              </span>
              <span className="legend" style={{ "--c": COLORS.undeliverable }}>
                Invalid
              </span>
              <span className="legend" style={{ "--c": COLORS.risky }}>
                Risky
              </span>
              <span className="legend" style={{ "--c": COLORS.unknown }}>
                Unknown
              </span>
            </div>
          </div>

          {/* Recent validations – single / bulk tables */}
          <div className="card section-gap-large">
            <div className="card-top">
              <div className="card-title">Recent Validations</div>

              <div className="recent-right">
                <div className="segmenteds recent-type">
                  <button
                    className={`seg ${
                      recentType === "single" ? "is-active" : ""
                    }`}
                    onClick={() => setRecentType("single")}
                  >
                    Single
                  </button>
                  <button
                    className={`seg ${
                      recentType === "bulk" ? "is-active" : ""
                    }`}
                    onClick={() => setRecentType("bulk")}
                  >
                    Bulk
                  </button>
                </div>
              </div>
            </div>

            {recentLoading && (
              <div className="recent-loading">Loading recent activity…</div>
            )}

            {recentError && !recentLoading && (
              <div className="recent-error">
                <span>{recentError}</span>
                <button
                  className="btn btn-ghost"
                  onClick={() => fetchRecent(recentType)}
                >
                  Retry
                </button>
              </div>
            )}

            {!recentLoading && !recentError && (
              <div
                className={`recent-table-wrap ${
                  recentType === "single" ? "is-single" : "is-bulk"
                }`}
              >
                {recentItems.length === 0 ? (
                  <div className="recent-empty">
                    No validations yet. Run your first{" "}
                    {recentType === "bulk" ? "bulk list" : "single email"}{" "}
                    validation.
                  </div>
                ) : (
                  <div className="recent-table-scroll">
                    <table className="recent-table">
                      <thead>
                        {recentType === "single" ? (
                          <tr>
                            <th>Email</th>
                            <th>Status</th>
                            <th className="num">Score</th>
                            <th>Confidence Level</th>
                            <th>Validated On</th>
                          </tr>
                        ) : (
                          <tr>
                            <th>Name</th>
                            <th className="num">Number of Emails</th>
                            <th className="num">Credits Utilized</th>
                            <th>Status</th>
                            <th>Validated On</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {recentType === "single"
                          ? recentItems.map((row) => (
                              <tr key={row.id}>
                                <td>{row.email || "-"}</td>
                                <td className="status-cell">
                                  <span
                                    className={`status-dot status-dot-${getStatusCategory(
                                      row.status
                                    )}`}
                                  />
                                  <span className="status-label">
                                    {row.status || "Unknown"}
                                  </span>
                                </td>
                                <td className="num">
                                  {row.score != null ? row.score : "-"}
                                </td>
                                <td>
                                  {row.confidence != null ? (
                                    <div className="conf-cell">
                                      <div className="conf-bar">
                                        <div
                                          className="conf-bar-fill"
                                          style={{
                                            width: `${Math.max(
                                              0,
                                              Math.min(
                                                100,
                                                Number(row.confidence)
                                              )
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="conf-text">
                                        {Math.round(row.confidence)}%
                                      </span>
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td>{fmtDateTime(row.validatedAt)}</td>
                              </tr>
                            ))
                          : recentItems.map((row) => (
                              <tr key={row.id}>
                                <td>{row.name || "-"}</td>
                                <td className="num">
                                  {fmt(row.numberOfEmails || 0)}
                                </td>
                                <td className="num">
                                  {fmt(row.creditsUtilized || 0)}
                                </td>
                                <td className="status-cell">
                                  <span
                                    className={`status-dot status-dot-${getBulkStatusCategory(
                                      row.status
                                    )}`}
                                  />
                                  <span className="status-label">
                                    {row.status || "Completed"}
                                  </span>
                                </td>
                                <td>{fmtDateTime(row.validatedAt)}</td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
