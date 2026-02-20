import React, { useMemo, useState } from "react";
import "./BuyCredits.css";
import axios from "axios";
import { toast } from "react-toastify";
import { useCredits } from "../credits/CreditsContext";

// ✅ MUI imports (only for slider)
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";

function BuyCredits() {
  const PRICE_PER_CREDIT = 0.008;
  const GST_RATE = 0.18;

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
  const tax = useMemo(() => subTotal * GST_RATE, [subTotal]);
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
                <button className="bc-enterpriseLink" type="button">
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

                <div className="bc-row bc-rowTax">
                  <span className="bc-label bc-taxLabel">
                    <span className="bc-gstLine">
                      GST {Math.round(GST_RATE * 100)}%
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
      </div>
    </div>
  );
}

export default BuyCredits;
