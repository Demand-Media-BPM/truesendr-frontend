import React, { useEffect, useMemo, useState } from "react";
import "./BuyCredits.css";
import axios from "axios";
import { toast } from "react-toastify";
import { useCredits } from "../credits/CreditsContext";
import * as FlagIcons from "country-flag-icons/react/3x2";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Popper from "@mui/material/Popper";

// ✅ MUI imports (only for slider)
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";

function BuyCredits() {
  const PRICE_PER_CREDIT = 0.008;

  // dynamic tax (fetched on page load)
  const [countryName, setCountryName] = useState("—");
  const [taxName, setTaxName] = useState("Tax");
  const [taxRate, setTaxRate] = useState(0);

  // Enterprise modal
  const [showEnterprise, setShowEnterprise] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);

  // form state (frontend-only for now)
  const [entForm, setEntForm] = useState({
    name: "",
    email: "",
    jobTitle: "",
    companyName: "",
    countryCode: "US",
    phone: "",
    volume: "1000000",
  });

  const openEnterprise = () => setShowEnterprise(true);
  const closeEnterprise = () => setShowEnterprise(false);

  const onEntChange = (key) => (e) => {
    setEntForm((p) => ({ ...p, [key]: e.target.value }));
  };

  const onRequestQuote = async (e) => {
    e.preventDefault();

    try {
      setSendingQuote(true);

      // basic front-end validation (minimal)
      if (!entForm.name?.trim() || !entForm.email?.trim()) {
        toast.error("Please enter Name and Company Email.");
        return;
      }

      const api = getApiBase();
      const username = String(getUsernameFromStorage() || "").trim();

      const payload = {
        username, // optional (helps you identify user if logged-in)
        name: entForm.name,
        email: entForm.email,
        jobTitle: entForm.jobTitle,
        companyName: entForm.companyName,
        countryCode: selectedCountry?.code,
        countryName: selectedCountry?.name,
        dialCode: selectedCountry?.dial,
        phone: entForm.phone,
        volume: entForm.volume,
        page: "BuyCredits Enterprise Modal",
      };

      const { data } = await axios.post(
        `${api}/api/payment/razorpay/enterprise-lead`,
        payload,
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (data?.ok) {
        toast.success("Request sent! Our team will contact you shortly.");
        closeEnterprise();

        // optional: reset the form
        setEntForm({
          name: "",
          email: "",
          jobTitle: "",
          companyName: "",
          countryCode: "US",
          phone: "",
          volume: "1000000",
        });
      } else {
        toast.error(
          data?.message || "Could not send request. Please try again.",
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Could not send request.");
    } finally {
      setSendingQuote(false);
    }
  };

  // ESC close
  useEffect(() => {
    if (!showEnterprise) return;
    const onKey = (ev) => {
      if (ev.key === "Escape") closeEnterprise();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showEnterprise]);

  // -------------------------
  // Country list (all + flags)
  // -------------------------
  const COUNTRIES = useMemo(
    () => [
      { code: "US", name: "United States", dial: "+1" },
      { code: "IN", name: "India", dial: "+91" },
      { code: "GB", name: "United Kingdom", dial: "+44" },
      { code: "AE", name: "United Arab Emirates", dial: "+971" },
      { code: "AU", name: "Australia", dial: "+61" },
      { code: "CA", name: "Canada", dial: "+1" },
      { code: "DE", name: "Germany", dial: "+49" },
      { code: "FR", name: "France", dial: "+33" },
      { code: "IT", name: "Italy", dial: "+39" },
      { code: "ES", name: "Spain", dial: "+34" },
      { code: "NL", name: "Netherlands", dial: "+31" },
      { code: "SE", name: "Sweden", dial: "+46" },
      { code: "NO", name: "Norway", dial: "+47" },
      { code: "DK", name: "Denmark", dial: "+45" },
      { code: "CH", name: "Switzerland", dial: "+41" },
      { code: "SG", name: "Singapore", dial: "+65" },
      { code: "JP", name: "Japan", dial: "+81" },
      { code: "KR", name: "South Korea", dial: "+82" },
      { code: "BR", name: "Brazil", dial: "+55" },
      { code: "MX", name: "Mexico", dial: "+52" },
      { code: "ZA", name: "South Africa", dial: "+27" },
      { code: "NG", name: "Nigeria", dial: "+234" },
      { code: "SA", name: "Saudi Arabia", dial: "+966" },
      { code: "TR", name: "Turkey", dial: "+90" },
      { code: "RU", name: "Russia", dial: "+7" },
      { code: "CN", name: "China", dial: "+86" },
      { code: "HK", name: "Hong Kong", dial: "+852" },
      { code: "TW", name: "Taiwan", dial: "+886" },
      { code: "TH", name: "Thailand", dial: "+66" },
      { code: "MY", name: "Malaysia", dial: "+60" },
      { code: "ID", name: "Indonesia", dial: "+62" },
      { code: "PH", name: "Philippines", dial: "+63" },
      { code: "VN", name: "Vietnam", dial: "+84" },
      { code: "PK", name: "Pakistan", dial: "+92" },
      { code: "BD", name: "Bangladesh", dial: "+880" },
      { code: "LK", name: "Sri Lanka", dial: "+94" },
      { code: "NP", name: "Nepal", dial: "+977" },
      { code: "IL", name: "Israel", dial: "+972" },
      { code: "EG", name: "Egypt", dial: "+20" },
      { code: "AR", name: "Argentina", dial: "+54" },
      { code: "CL", name: "Chile", dial: "+56" },
      { code: "CO", name: "Colombia", dial: "+57" },
      { code: "PE", name: "Peru", dial: "+51" },
      // ...add more if you want, but this already covers most common.
    ],
    [],
  );

  const selectedCountry = useMemo(() => {
    const code = String(entForm.countryCode || "US").toUpperCase();
    return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
  }, [entForm.countryCode, COUNTRIES]);

  const Flag = ({ code }) => {
    const Comp = FlagIcons?.[String(code || "").toUpperCase()];
    if (!Comp) return null;
    return <Comp className="bc-flagIcon" />;
  };

  const STEPS = useMemo(
    () => [
      1000, 2000, 4000, 7000, 12000, 25000, 50000, 80000, 150000, 300000,
      550000, 1000000,
    ],
    [],
  );

  const MARKS = useMemo(
    () => [
      "1k",
      "2k",
      "4k",
      "7k",
      "12k",
      "25k",
      "50k",
      "80k",
      "150k",
      "300k",
      "550k",
      "1m",
    ],
    [],
  );

  const nearestStepIndex = (value) => {
    let best = 0;
    let diff = Infinity;
    for (let i = 0; i < STEPS.length; i++) {
      const d = Math.abs(STEPS[i] - value);
      if (d < diff) {
        diff = d;
        best = i;
      }
    }
    return best;
  };

  const [credits, setCredits] = useState(1000); // real numeric used for pricing
  const [idx, setIdx] = useState(0); // slider index
  const [creditText, setCreditText] = useState("1000"); // what user types (can be "")
  const [inputError, setInputError] = useState(""); // optional message
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const money2 = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const money3 = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(n);

  const creditsPretty =
    creditText === ""
      ? ""
      : new Intl.NumberFormat("en-US").format(Number(creditText));

  const subTotal = useMemo(() => credits * PRICE_PER_CREDIT, [credits]);
  const tax = useMemo(() => subTotal * taxRate, [subTotal, taxRate]);
  const total = useMemo(() => subTotal + tax, [subTotal, tax]);

  const onInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, ""); // keep only digits
    setCreditText(raw); // ✅ allow empty

    if (raw === "") {
      setInputError("Minimum purchase is 1000 credits");
      return; // don't update slider/pricing yet
    }

    const typed = Number(raw);

    if (!Number.isFinite(typed)) return;

    // ✅ Allow any number in input, but show warning if below min
    if (typed < 1000) {
      setInputError("Minimum purchase is 1000 credits");
    } else {
      setInputError("");
    }

    // ✅ For calculations + slider: clamp to [1000..1,000,000]
    const nextCredits = Math.max(1000, Math.min(1000000, Math.floor(typed)));
    setCredits(nextCredits);

    // ✅ slider thumb moves to nearest step but does not overwrite typed value
    const nextIdx = nearestStepIndex(nextCredits);
    setIdx(nextIdx);
  };

  const onInputBlur = () => {
    if (creditText === "") {
      setCreditText("1000");
      setCredits(1000);
      setIdx(0);
      setInputError("");
      return;
    }

    const typed = Number(creditText || "0");

    if (!Number.isFinite(typed) || typed < 1000) {
      setCreditText("1000");
      setCredits(1000);
      setIdx(0);
      setInputError("");
      return;
    }

    // if user typed > 1,000,000 clamp
    if (typed > 1000000) {
      setCreditText("1000000");
      setCredits(1000000);
      setIdx(STEPS.length - 1);
      setInputError("");
    }
  };

  // ✅ MUI marks (value is index, label is your MARKS)
  const muiMarks = useMemo(
    () => MARKS.map((label, i) => ({ value: i, label })),
    [MARKS],
  );

  // ✅ MUI slider change handler (keeps your idx + credits logic)
  const onMuiSliderChange = (_e, newValue) => {
    const nextIdx = Array.isArray(newValue) ? newValue[0] : newValue;
    setIdx(nextIdx);

    const stepCredits = STEPS[nextIdx];
    setCredits(stepCredits);
    setCreditText(String(stepCredits)); // ✅ keep input in sync with slider
    setInputError("");
  };

  const { refreshCredits } = useCredits();

  useEffect(() => {
    let alive = true;

    async function loadTaxInfo() {
      try {
        const api = getApiBase();
        const { data } = await axios.get(
          `${api}/api/payment/razorpay/tax-info`,
          {
            headers: { "ngrok-skip-browser-warning": "true" },
          },
        );

        if (!alive) return;

        if (data?.ok) {
          setCountryName(data?.country?.name || "—");
          setTaxName(data?.tax?.name || "Tax");
          setTaxRate(Number(data?.tax?.rate || 0));
        } else {
          setCountryName("—");
          setTaxName("Tax");
          setTaxRate(0);
        }
      } catch (e) {
        if (!alive) return;
        setCountryName("—");
        setTaxName("Tax");
        setTaxRate(0);
      }
    }

    loadTaxInfo();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!countryOpen) return;

    const onDown = (e) => {
      const el = document.querySelector(".bc-countryDd");
      if (el && !el.contains(e.target)) {
        setCountryOpen(false);
        setCountrySearch("");
      }
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [countryOpen]);

  function getApiBase() {
    const env = process.env.REACT_APP_API_BASE;
    if (env) return env.replace(/\/+$/, "");
    return window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : `${window.location.protocol}//${window.location.host}`;
  }

  function getUsernameFromStorage() {
    // best-effort (matches your app style)
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

  function loadRazorpay() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  const [paying, setPaying] = useState(false);

  const onBuyCredits = async () => {
    try {
      const username = String(getUsernameFromStorage() || "").trim();
      if (!username) {
        toast.error("Please login again (username not found).");
        return;
      }
      if (credits < 1000) {
        toast.error("Minimum purchase is 1000 credits");
        return;
      }

      setPaying(true);

      const ok = await loadRazorpay();
      if (!ok) {
        toast.error("Razorpay SDK failed to load");
        return;
      }

      // 1) create order
      const api = getApiBase();
      const { data } = await axios.post(
        `${api}/api/payment/razorpay/create-order`,
        { username, credits },
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (!data?.ok) {
        toast.error(data?.message || "Could not create order");
        return;
      }

      const { key_id, order } = data;

      // 2) open Razorpay
      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "TrueSendr",
        description: `Buy ${credits} credits`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3) verify + credit
            const vr = await axios.post(
              `${api}/api/payment/razorpay/verify`,
              {
                username,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: { "ngrok-skip-browser-warning": "true" } },
            );

            if (vr.data?.ok) {
              toast.success("Payment successful! Credits added.");
              await refreshCredits();
            } else {
              toast.error(vr.data?.message || "Payment verification failed");
            }
          } catch (e) {
            toast.error("Payment verification failed");
            console.error(e);
          }
        },
        modal: {
          ondismiss: async () => {
            toast.info("Payment cancelled");

            try {
              await axios.post(
                `${api}/api/payment/razorpay/cancel`,
                {
                  username,
                  razorpay_order_id: order.id, // ✅ cancel the exact order we created
                },
                { headers: { "ngrok-skip-browser-warning": "true" } },
              );
            } catch (e) {
              console.warn(
                "cancel notify failed:",
                e?.response?.data || e?.message || e,
              );
            }
          },
        },

        theme: { color: "#ff6a00" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="bc-page">
      <div className="bc-container">
        <div className="bc-header">
          <h1 className="bc-title">Buy Credits</h1>
        </div>

        {/* CONNECTED MAIN CARD (LEFT + RIGHT) */}
        <div className="bc-connected">
          {/* LEFT */}
          <div className="bc-left">
            <div className="bc-leftTop">
              <div className="bc-centerTitle">Number of Emails</div>
              <div className="bc-centerSub">1 Email = 1 Credit</div>

              <div className="bc-inputWrap">
                <input
                  className="bc-input"
                  value={creditsPretty}
                  onChange={onInput}
                  onBlur={onInputBlur}
                  inputMode="numeric"
                />
              </div>

              <div className="bc-minText">Minimum Purchase: 1000 Credits</div>

              <div className="bc-dottedDivider" />
              <div className="bc-orText">or select credits</div>

              {/* ✅ ONLY THIS SLIDER PART CHANGED */}
              <div className="bc-sliderArea">
                <Box className="bc-muiSliderWrap">
                  <Slider
                    aria-label="Credits"
                    value={idx}
                    min={0}
                    max={STEPS.length - 1}
                    step={1}
                    marks={muiMarks}
                    onChange={onMuiSliderChange}
                    // matches the “marks” behavior from MUI example
                    sx={{
                      // base
                      color: "var(--ts-orange)",
                      padding: "0",
                      margin: "0",
                      width: "100%",

                      // rail + track
                      "& .MuiSlider-rail": {
                        opacity: 1,
                        height: "0.22rem",
                        borderRadius: "999rem",
                        backgroundColor: "var(--ts-track)",
                      },
                      "& .MuiSlider-track": {
                        height: "0.22rem",
                        border: "none",
                        borderRadius: "999rem",
                      },

                      // thumb
                      "& .MuiSlider-thumb": {
                        width: "0.9rem",
                        height: "0.9rem",
                        backgroundColor: "var(--ts-orange)",
                        border: "0.2rem solid #fff",
                        boxShadow: "0 0.55rem 1.3rem rgba(255, 106, 0, 0.28)",
                      },
                      "& .MuiSlider-thumb:before": { display: "none" },
                      "& .MuiSlider-thumb:hover": {
                        boxShadow: "0 0.55rem 1.3rem rgba(255, 106, 0, 0.28)",
                      },
                      "& .MuiSlider-thumb.Mui-focusVisible": {
                        boxShadow: "0 0.55rem 1.3rem rgba(255, 106, 0, 0.28)",
                      },
                      "& .MuiSlider-thumb.Mui-active": {
                        boxShadow: "0 0.55rem 1.3rem rgba(255, 106, 0, 0.28)",
                      },

                      // hide default mark dots (Figma has labels only)
                      "& .MuiSlider-mark": {
                        width: 0,
                        height: 0,
                        backgroundColor: "transparent",
                      },

                      // labels under track
                      "& .MuiSlider-markLabel": {
                        fontSize: "0.72rem",
                        color: "#94a3b8",
                        whiteSpace: "nowrap",
                        top: "1.15rem", // ✅ pushes labels nicely below the line like Figma
                      },

                      // ✅ active label color (matches your orange highlight)
                      [`& .MuiSlider-markLabel[data-index="${idx}"]`]: {
                        color: "var(--ts-orange)",
                        fontWeight: 700,
                      },
                    }}
                  />
                </Box>

                <div className="bc-pill">
                  <span className="bc-pillText">
                    {MARKS[idx]} Credits{" "}
                    <span className="bc-pillPrice">{money2(subTotal)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ENTERPRISE (same-to-same, under left) */}
            <div className="bc-enterprise">
              <div>
                <div className="bc-enterpriseTitle">Enterprise</div>
                <div className="bc-enterpriseSub">
                  Need more than 1 million credits?
                </div>
                <button
                  className="bc-enterpriseLink"
                  type="button"
                  onClick={openEnterprise}
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT (CONNECTED SUMMARY) */}
          <div className="bc-right">
            <div className="bc-summaryTitle">Purchase Summary</div>

            <div className="bc-summaryGrid">
              {/* ✅ main content block */}
              <div className="bc-summaryMain">
                <div className="bc-row">
                  <span className="bc-label">Credits</span>
                  <span className="bc-value">{creditsPretty}</span>
                </div>

                <div className="bc-row">
                  <span className="bc-label">Price Per Credit</span>
                  <span className="bc-value">{money3(PRICE_PER_CREDIT)}</span>
                </div>

                <div className="bc-hr" />

                <div className="bc-row">
                  <span className="bc-label">Sub Total</span>
                  <span className="bc-value">{money2(subTotal)}</span>
                </div>

                <div className="bc-row">
                  <span className="bc-label">Tax</span>
                </div>

                {/* Country name below Tax */}
                <div className="bc-row">
                  <span className="bc-label bc-taxLabel">
                    <span className="bc-gstLine">{countryName}</span>
                  </span>
                </div>

                {/* Tax name below country, value on right */}
                <div className="bc-row bc-rowTax">
                  <span className="bc-label bc-taxLabel">
                    <span className="bc-gstLine">
                      {taxName} {Math.round(taxRate * 100)}%
                    </span>
                  </span>
                  <span className="bc-value">{money2(tax)}</span>
                </div>

                <div className="bc-hr" />

                <div className="bc-totalRow">
                  <span className="bc-totalLabel">Your Total</span>
                  <span className="bc-totalValue">{money2(total)}</span>
                </div>

                <button
                  className="bc-buyBtn"
                  type="button"
                  onClick={onBuyCredits}
                  disabled={paying}
                >
                  {paying ? "Processing..." : "Buy Credits"}
                </button>
              </div>

              {/* ✅ footer pinned to bottom */}
              <div className="bc-foot">
                <div>Credits never expire</div>
                <div>Secure payments</div>

                <div className="bc-hr bc-footDivider" />

                <div className="bc-footSmall">
                  By clicking “Buy Credits”, you agree to our{" "}
                  <span className="bc-link">Terms of Use</span> and{" "}
                  <span className="bc-link">Privacy Policy</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* breathing space */}
        <div className="bc-spacer" />
        {/* =========================
            ENTERPRISE MODAL (Figma)
           ========================= */}
        {showEnterprise && (
          <div className="bc-modalOverlay">
            <div
              className="bc-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) =>
                e.stopPropagation()
              } /* ✅ ensures inside click never closes */
            >
              <div className="bc-modalHeader">
                <div className="bc-modalTitle">Enterprise Plan</div>
                <div className="bc-modalSub">
                  Need more than 1 million credits?
                </div>
              </div>

              <div className="bc-modalBody">
                {/* LEFT BENEFITS */}
                <div className="bc-modalLeft">
                  <div className="bc-benefitsTitle">Benefits</div>
                  <ul className="bc-benefitsList">
                    <li>Volume based pricing</li>
                    <li>Dedicated account support</li>
                  </ul>
                </div>

                {/* RIGHT FORM */}
                <form className="bc-modalRight" onSubmit={onRequestQuote}>
                  <div className="bc-formGrid">
                    <div className="bc-field">
                      <label className="bc-label2">Name</label>
                      <input
                        className="bc-input2"
                        placeholder="Enter your full name"
                        value={entForm.name}
                        onChange={onEntChange("name")}
                      />
                    </div>

                    <div className="bc-field">
                      <label className="bc-label2">Company Email</label>
                      <input
                        className="bc-input2"
                        placeholder="example@company.com"
                        value={entForm.email}
                        onChange={onEntChange("email")}
                      />
                    </div>

                    <div className="bc-field">
                      <label className="bc-label2">Job Title</label>
                      <input
                        className="bc-input2"
                        placeholder="e.g., Marketing Manager"
                        value={entForm.jobTitle}
                        onChange={onEntChange("jobTitle")}
                      />
                    </div>

                    <div className="bc-field">
                      <label className="bc-label2">Company Name</label>
                      <input
                        className="bc-input2"
                        placeholder="Enter your company name"
                        value={entForm.companyName}
                        onChange={onEntChange("companyName")}
                      />
                    </div>

                    <div className="bc-field">
                      <label className="bc-label2">Country</label>

                      <div className="bc-countryDd">
                        {/* Toggle */}
                        <button
                          type="button"
                          className="bc-countryToggle"
                          onClick={() => setCountryOpen((v) => !v)}
                        >
                          <span className="bc-countryToggleLeft">
                            <Flag code={selectedCountry.code} />
                            <span className="bc-countryToggleText">
                              {selectedCountry.name} ({selectedCountry.dial})
                            </span>
                          </span>

                          <span className="bc-caret">▾</span>
                        </button>

                        {/* Menu */}
                        {countryOpen && (
                          <div className="bc-countryMenu">
                            <div className="bc-searchRow">
                              <input
                                className="bc-countrySearch"
                                placeholder="Search country..."
                                value={countrySearch}
                                onChange={(e) =>
                                  setCountrySearch(e.target.value)
                                }
                                autoFocus
                              />
                            </div>

                            <div className="bc-countryList">
                              {COUNTRIES.filter((c) => {
                                const q = countrySearch.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  c.name.toLowerCase().includes(q) ||
                                  c.dial
                                    .replace("+", "")
                                    .includes(q.replace("+", "")) ||
                                  c.code.toLowerCase().includes(q)
                                );
                              }).map((c) => {
                                const active = c.code === selectedCountry.code;
                                return (
                                  <button
                                    key={c.code}
                                    type="button"
                                    className={`bc-countryItem ${active ? "active" : ""}`}
                                    onClick={() => {
                                      setEntForm((p) => ({
                                        ...p,
                                        countryCode: c.code,
                                      }));
                                      setCountryOpen(false);
                                      setCountrySearch("");
                                    }}
                                  >
                                    <span className="bc-countryItemLeft">
                                      <Flag code={c.code} />
                                      <span className="bc-countryItemText">
                                        {c.name} ({c.dial})
                                      </span>
                                    </span>

                                    {active ? (
                                      <span className="bc-check">✓</span>
                                    ) : null}
                                  </button>
                                );
                              })}

                              {/* empty state */}
                              {COUNTRIES.filter((c) => {
                                const q = countrySearch.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  c.name.toLowerCase().includes(q) ||
                                  c.dial
                                    .replace("+", "")
                                    .includes(q.replace("+", "")) ||
                                  c.code.toLowerCase().includes(q)
                                );
                              }).length === 0 && (
                                <div className="bc-countryEmpty">
                                  No results
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bc-field">
                      <label className="bc-label2">Phone Number</label>
                      <input
                        className="bc-input2"
                        placeholder="e.g., 1234567890"
                        value={entForm.phone}
                        onChange={onEntChange("phone")}
                      />
                    </div>

                    <div className="bc-field bc-fieldWide">
                      <label className="bc-label2">
                        Estimated Monthly Volume
                      </label>
                      <input
                        className="bc-input2"
                        placeholder="1,000,000"
                        value={entForm.volume}
                        onChange={onEntChange("volume")}
                      />
                      <div className="bc-hint2">
                        Minimum Volume: 1,000,000 credits
                      </div>
                    </div>
                  </div>

                  <button
                    className="bc-quoteBtn"
                    type="submit"
                    disabled={sendingQuote}
                  >
                    {sendingQuote ? "Sending..." : "Request Custom Quote"}
                  </button>

                  <div className="bc-modalFootNote">
                    Our team will contact you within 24 hours.
                  </div>
                </form>
              </div>

              <button
                className="bc-modalClose"
                type="button"
                onClick={closeEnterprise}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyCredits;
