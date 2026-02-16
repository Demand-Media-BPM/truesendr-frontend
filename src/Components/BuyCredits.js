import React, {useMemo, useState } from "react";
import "./BuyCredits.css";

// ✅ MUI imports (only for slider)
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";

function BuyCredits() {
  const PRICE_PER_CREDIT = 0.009;
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

  const money = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
                    <span className="bc-pillPrice">{money(subTotal)}</span>
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
                  <span className="bc-value">{money(PRICE_PER_CREDIT)}</span>
                </div>

                <div className="bc-hr" />

                <div className="bc-row">
                  <span className="bc-label">Sub Total</span>
                  <span className="bc-value">{money(subTotal)}</span>
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
                  <span className="bc-value">{money(tax)}</span>
                </div>

                <div className="bc-hr" />

                <div className="bc-totalRow">
                  <span className="bc-totalLabel">Your Total</span>
                  <span className="bc-totalValue">{money(total)}</span>
                </div>

                <button className="bc-buyBtn" type="button">
                  Buy Credits
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
