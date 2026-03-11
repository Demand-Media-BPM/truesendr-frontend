// src/Components/PhoneValidator.js
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./PhoneValidator.css";
import PhoneHistory from "./PhoneHistory"; // keep (history page later)
import { showAppToast } from "./showAppToast";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { useCredits } from "../credits/CreditsContext";
import phoneLogo from "../assets/illustrator/phone.png";

import * as FlagIcons from "country-flag-icons/react/3x2";

const API_BASE = process.env.REACT_APP_API_BASE || "";

// Username extraction logic (same pattern you use)
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

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ).trim();
}

export const COUNTRY_OPTIONS = [
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

function Flag({ code, className }) {
  const C = (FlagIcons || {})[String(code || "").toUpperCase()];
  if (!C) return <span className={className} />;
  return <C className={className} />;
}

function extractDial(label) {
  // returns "+44" (not "(+44)")
  const m = String(label || "").match(/\(\+(\d+)\)/);
  return m ? `+${m[1]}` : "";
}

const ALLOWED_DIAL_SET = new Set(
  COUNTRY_OPTIONS.map((c) => extractDial(c.label)).filter(Boolean),
);

const ISO2_BY_DIAL = Object.fromEntries(
  COUNTRY_OPTIONS.map((c) => [extractDial(c.label), c.code]).filter(
    ([dial, code]) => !!dial && !!code,
  ),
);

function iso2FromDial(dial) {
  const d = normalizeDialInput(dial);
  return d ? String(ISO2_BY_DIAL[d] || "").toUpperCase() : "";
}

function normalizeDialInput(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  const digits = s.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
}

function fmtValidatedOn(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";

  const day = dt.getDate();
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

function stripDialFromInput(inputNumber, dial) {
  const raw = String(inputNumber || "").trim();
  if (!raw) return "";

  const dialDigits = String(dial || "").replace(/[^\d]/g, "");
  if (!dialDigits) return raw;

  const re = new RegExp(`^(\\+?\\s*${dialDigits}\\s*|00\\s*${dialDigits}\\s*)`);
  return raw.replace(re, "").trim();
}

export default function PhoneValidator() {
  const username = getUsername();
  const token = getToken();
  // ✅ Credits refresh (same pattern as Single/Bulk)
  const { refreshCredits } = useCredits();
  const creditsRefreshTimerRef = useRef(null);

  const scheduleCreditsRefresh = () => {
    if (creditsRefreshTimerRef.current)
      clearTimeout(creditsRefreshTimerRef.current);

    creditsRefreshTimerRef.current = setTimeout(() => {
      refreshCredits?.();
    }, 700);
  };

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (creditsRefreshTimerRef.current)
        clearTimeout(creditsRefreshTimerRef.current);
    };
  }, []);

  const [activeTab, setActiveTab] = useState("validate"); // validate | history

  // Left form
  const [dialCode, setDialCode] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // Validate workflow
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Right panel results (last 5)
  const [recent, setRecent] = useState([]);
  const [reloadTick, setReloadTick] = useState(0);

  function buildHeaders() {
    const h = {
      "Content-Type": "application/json",
      "X-User": username || "",
      "ngrok-skip-browser-warning": "69420",
    };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  // Fetch last 5 for Validate tab
  useEffect(() => {
    async function fetchRecent() {
      if (!username) return;
      try {
        const res = await axios.get(`${API_BASE}/api/phone/history?limit=5`, {
          headers: buildHeaders(),
        });
        if (res.data?.ok) {
          const list = Array.isArray(res.data.history) ? res.data.history : [];
          setRecent(list.slice(0, 5));
        }
      } catch {
        setRecent([]);
      }
    }
    fetchRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, reloadTick]);

  async function handleVerify(e) {
    e.preventDefault();
    setErrMsg("");

    const trimmed = String(phoneInput || "").trim();

    if (!trimmed) {
      setErrMsg("Please enter a phone number.");
      return;
    }

    // Keep your rule: no +country code in input
    if (/^(\+|00)/.test(trimmed)) {
      setErrMsg(
        "Remove +country code from phone number. Enter local number only (country code goes in the Country Code field).",
      );
      return;
    }

    const dialNorm = normalizeDialInput(dialCode);

    if (!dialNorm) {
      setErrMsg("Enter country code like +91 or +1");
      return;
    }

    if (!ALLOWED_DIAL_SET.has(dialNorm)) {
      setErrMsg("Please enter a valid country code.");
      return;
    }

    if (!username) {
      setErrMsg("No username found in localStorage.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/phone/validate`,
        {
          phone: trimmed,
          dialCode: dialNorm,
        },
        { headers: buildHeaders() },
      );

      if (res.data?.ok) {
        setPhoneInput("");
        setReloadTick((x) => x + 1);
        scheduleCreditsRefresh();

        showAppToast({
          type: "success",
          title: "Phone validated",
          message: "Phone number was validated successfully.",
        });
      } else {
        setErrMsg(res.data?.message || "Validation failed.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Server error";

      setErrMsg(String(msg));

      showAppToast({
        type: "error",
        title: "Validation failed",
        message: String(msg),
      });
    } finally {
      setLoading(false);
    }
  }

  function LoaderCard() {
    const local = String(phoneInput || "").trim();
    const showNumber = local ? local : "—";
    return (
      <div className="ph-loaderCard">
        <div className="ph-loaderTopLine">
          <div className="ph-loaderTopText">
            <span className="ph-loaderTopCode">
              {normalizeDialInput(dialCode) || "—"}
            </span>
            <span className="ph-loaderTopNum">{showNumber}</span>
          </div>
        </div>

        <div className="ph-loaderMid">Verifying number</div>

        <div className="ph-progress">
          <span className="ph-progressFill" />
        </div>
      </div>
    );
  }

  function ResultCard(row) {
    // If backend country missing (invalid numbers), fallback to selected dialCode
    const cc =
      String(row?.country || "")
        .trim()
        .toUpperCase() ||
      iso2FromDial(dialCode) || // selected in UI
      "UN";

    const countryObj = COUNTRY_OPTIONS.find((c) => c.code === cc);
    const dial = countryObj
      ? extractDial(countryObj.label)
      : normalizeDialInput(dialCode);

    const rawShown = String(row?.inputNumber || "").trim() || "—";
    const shownNumber =
      rawShown === "—" ? "—" : stripDialFromInput(rawShown, dial);

    const isValid = !!row?.valid;

    const badgeClass = isValid
      ? "ph-badge ph-badge-valid"
      : "ph-badge ph-badge-invalid";

    const badgeIconClass = isValid
      ? "ph-badgeIcon valid"
      : "ph-badgeIcon invalid";

    const score =
      typeof row?.leadQualityPercentage === "number"
        ? Math.max(0, Math.min(100, row.leadQualityPercentage))
        : typeof row?.leadQualityScore === "number"
          ? Math.max(0, Math.min(100, row.leadQualityScore))
          : null;

    return (
      <div className="ph-resultCard" key={row?._id}>
        <div className="ph-cardHead">
          <div className="ph-cardLeft">
            <div className="ph-cardTop">
              <Flag code={cc} className="ph-flagSm" />
              <div className="ph-cardTopText">
                <span className="ph-cardTopCode">
                  {cc} {dial ? `(${dial})` : ""}
                </span>

                <span className="ph-cardTopNum">{shownNumber}</span>
              </div>
            </div>

            <div className="ph-cardSub">
              Validated on:{" "}
              <span className="ph-cardDate">
                {fmtValidatedOn(row?.createdAt)}
              </span>
            </div>
          </div>

          <div className={badgeClass}>
            {isValid ? (
              <CheckCircleOutlineIcon className={badgeIconClass} />
            ) : (
              <CancelOutlinedIcon className={badgeIconClass} />
            )}
            <span className="ph-badgeText">
              {isValid ? "Valid" : "Invalid"}
            </span>
          </div>
        </div>

        <div className="ph-miniGrid">
          <div className="ph-miniBox">
            <div className="ph-miniLabel">Provider</div>
            <div className="ph-miniValue">{row?.carrier || "—"}</div>
          </div>

          <div className="ph-miniBox">
            <div className="ph-miniLabel">Line Type Level</div>
            <div className="ph-miniValue">{row?.lineType || "—"}</div>
          </div>

          <div className="ph-miniBox">
            <div className="ph-miniLabel">Confidence</div>
            <div className="ph-miniValue">
              {typeof score === "number" ? `${score}%` : "—"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderValidateLeft() {
    const hintBad = /^(\+|00)/.test(String(phoneInput || "").trim());

    return (
      <div className="ph-left">
        <div className="ph-leftTitle">Validate a phone number</div>

        <form className="ph-form" onSubmit={handleVerify}>
          <div className="ph-field">
            <label className="ph-label">Country Code</label>
            <input
              className="ph-input"
              placeholder="+91"
              value={dialCode}
              onChange={(e) => setDialCode(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="ph-field">
            <label className="ph-label">Phone Number</label>
            <input
              className="ph-input"
              placeholder="8005550199"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
            <div className={hintBad ? "ph-hint bad" : "ph-hint"}>
              Enter the number without spaces or special characters
            </div>
          </div>

          {/* Button small width */}
          <button className="ph-verifyBtn" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </button>

          {errMsg && <div className="ph-error">{errMsg}</div>}
        </form>
      </div>
    );
  }

  function renderValidateRight() {
    const list = Array.isArray(recent) ? recent.slice(0, 5) : [];

    if (!list.length && !loading) {
      return (
        <div className="ph-right ph-rightEmpty">
          <div className="ph-emptyWrap">
            <img src={phoneLogo} alt="Phone" className="ph-emptyLogo" />

            <div className="ph-emptyTitle">Nothing here yet!</div>
            <div className="ph-emptySub">
              Validate a phone number to see results
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="ph-right">
        <div className="ph-rightStack">
          {/* ✅ show loader at top but keep old cards visible */}
          {loading && <LoaderCard />}

          {list.map((row) => ResultCard(row))}
        </div>
      </div>
    );
  }

  return (
    <div className="ph-page">
      <div className="ph-headerRow">
        <div className="ph-title">Phone Validation</div>

        <div className="single-tabs">
          <button
            className={activeTab === "validate" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("validate")}
            type="button"
          >
            Validate
          </button>

          <button
            className={activeTab === "history" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab("history")}
            type="button"
          >
            History
          </button>
        </div>
      </div>

      <div
        className={`ph-mainCard ${
          activeTab === "validate" ? "is-validate" : "is-history"
        }`}
      >
        {activeTab === "validate" ? (
          <div className="ph-split">
            {renderValidateLeft()}
            {renderValidateRight()}
          </div>
        ) : (
          <PhoneHistory username={username} token={token} apiBase={API_BASE} />
        )}
      </div>
    </div>
  );
}
