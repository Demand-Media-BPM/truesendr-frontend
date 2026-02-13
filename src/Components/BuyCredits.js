import React, { useEffect, useMemo, useState } from "react";
import "./BuyCredits.css";

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

  const clampCredits = (n) => {
    if (!Number.isFinite(n)) return 1000;
    return Math.max(1000, Math.min(1000000, Math.floor(n)));
  };

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

  const [credits, setCredits] = useState(1000);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(nearestStepIndex(credits));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credits]);

  const money = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const creditsPretty = new Intl.NumberFormat("en-US").format(credits);

  const subTotal = useMemo(() => credits * PRICE_PER_CREDIT, [credits]);
  const tax = useMemo(() => subTotal * GST_RATE, [subTotal]);
  const total = useMemo(() => subTotal + tax, [subTotal, tax]);

  const fillPct = useMemo(() => {
    const max = STEPS.length - 1;
    return max === 0 ? 0 : (idx / max) * 100;
  }, [idx, STEPS.length]);

  const sliderStyle = useMemo(
    () => ({
      background: `linear-gradient(to right, var(--ts-orange) 0%, var(--ts-orange) ${fillPct}%, var(--ts-track) ${fillPct}%, var(--ts-track) 100%)`,
    }),
    [fillPct],
  );

  const onInput = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = raw ? Number(raw) : 0;
    setCredits(clampCredits(num));
  };

  const onSlider = (e) => {
    const next = Number(e.target.value);
    setIdx(next);
    setCredits(STEPS[next]);
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
                  inputMode="numeric"
                />
              </div>

              <div className="bc-minText">Minimum Purchase: 1000 Credits</div>

              <div className="bc-dottedDivider" />
              <div className="bc-orText">or select credits</div>

              <div className="bc-sliderArea">
                <div className="bc-sliderTrack">
                  <input
                    className="bc-slider"
                    type="range"
                    min={0}
                    max={STEPS.length - 1}
                    step={1}
                    value={idx}
                    onChange={onSlider}
                    style={sliderStyle}
                  />
                </div>

                <div className="bc-marksRow">
                  {MARKS.map((m, i) => (
                    <div
                      key={m}
                      className={`bc-mark ${i === idx ? "active" : ""}`}
                    >
                      {m}
                    </div>
                  ))}
                </div>

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
