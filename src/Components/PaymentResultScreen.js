import React, { useEffect } from "react";
import "./PaymentResultScreen.css";

function PaymentResultScreen({
  status = "success", // "success" | "failed"
  amountText = "",
  creditsAdded = 0,
  subText = "",
  onGoDashboard,
  autoRedirectMs = 10000,
}) {
  const isOk = status === "success";

  useEffect(() => {
    if (!onGoDashboard) return;
    const t = setTimeout(() => onGoDashboard(), autoRedirectMs);
    return () => clearTimeout(t);
  }, [onGoDashboard, autoRedirectMs]);

  return (
    <div className="prs-page">
      <div className="prs-card">
        <div className={`prs-icon ${isOk ? "ok" : "bad"}`}>
          {isOk ? "✓" : "!"}
        </div>

        <h1 className="prs-title">
          {isOk ? "Payment Successful" : "Payment Failed"}
        </h1>

        <p className="prs-desc">
          {isOk ? (
            <>
              Your payment of <b>{amountText}</b> has been successfully
              completed.
            </>
          ) : (
            <>
              We were unable to process your payment of <b>{amountText}</b>.
              <br />
              No amount has been deducted from your bank account.
            </>
          )}
        </p>

        {isOk ? (
          <div className="prs-credits">{creditsAdded} credits are added to your account.</div>
        ) : null}

        {/* {subText ? <div className="prs-sub">{subText}</div> : null} */}

        <button className="prs-btn" type="button" onClick={onGoDashboard}>
          {isOk ? "Go to Dashboard" : "Return to Dashboard"}
        </button>

        <div className="prs-foot">
          You will be redirected automatically in 10 seconds.
        </div>
      </div>
    </div>
  );
}

export default PaymentResultScreen;