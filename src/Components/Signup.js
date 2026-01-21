// // src/pages/Signup.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import axios from "axios";
// import "./Signup.css";
// import logo from "../assets/Mascot.png";
// import { useNavigate } from "react-router-dom";
// import ReCAPTCHA from "react-google-recaptcha";

// // ✅ Use API base from .env (kept from your code)
// const api = axios.create({
//   baseURL:
//     process.env.REACT_APP_API_BASE ||
//     (window.location.hostname === "localhost"
//       ? "http://localhost:5000"
//       : `${window.location.protocol}//${window.location.host}`),
//   headers: { "ngrok-skip-browser-warning": "true" },
// });

// const FIVE_MIN = 5 * 60; // seconds

// const Signup = () => {
//   const navigate = useNavigate();

//   // form fields
//   const [firstName, setFirstName] = useState("");
//   const [lastName, setLastName] = useState("");
//   // const [username, setUsername] = useState(""); // separate username
//   const [email, setEmail] = useState(""); // for verification/login
//   const [password, setPassword] = useState("");

//   // ui state
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const [pwFocused, setPwFocused] = useState(false);

//   // modal state
//   const [showModal, setShowModal] = useState(false);
//   const [code, setCode] = useState("");
//   const [expiresIn, setExpiresIn] = useState(FIVE_MIN); // seconds remaining
//   const [isSending, setIsSending] = useState(false);
//   const timerRef = useRef(null);

//   // reCAPTCHA
//   const [captchaToken, setCaptchaToken] = useState(null);
//   const recaptchaRef = useRef(null);

//   // ✅ Password rule checks (front-end only)
//   const passLenOK = useMemo(() => password.length >= 8, [password]);
//   const passUpperOK = useMemo(() => /[A-Z]/.test(password), [password]);
//   const passDigitOK = useMemo(() => /\d/.test(password), [password]);
//   // consider most typical special symbols; adjust if you want to allow spaces too
//   const passSpecialOK = useMemo(
//     () => /[!@#$%^&*()\-_=+[{\]}\\|;:'",<.>/?`~]/.test(password),
//     [password]
//   );

//   const allPassReqOK = passLenOK && passUpperOK && passDigitOK && passSpecialOK;

//   // derived mm:ss
//   const timeLeft = useMemo(() => {
//     const m = Math.floor(expiresIn / 60);
//     const s = expiresIn % 60;
//     return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
//   }, [expiresIn]);

//   // countdown
//   useEffect(() => {
//     if (!showModal) return;
//     if (expiresIn <= 0) return;

//     timerRef.current = setInterval(() => {
//       setExpiresIn((x) => (x > 0 ? x - 1 : 0));
//     }, 1000);
//     return () => clearInterval(timerRef.current);
//   }, [showModal, expiresIn]);

//   const validateForm = () => {
//     if (!firstName.trim() || !lastName.trim())
//       return "First name and last name are required.";
//     // if (!username.trim()) return "Username is required.";
//     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
//       return "Please enter a valid email address.";

//     // ✅ New password validation
//     if (!allPassReqOK) {
//       return "Password must be 8+ chars and include at least 1 uppercase letter, 1 number, and 1 special symbol.";
//     }

//     if (!captchaToken) return "Please complete the captcha.";
//     return null;
//   };

//   // Step 1: request activation code
//   const handleSignup = async () => {
//     setError("");
//     setSuccess("");
//     const err = validateForm();
//     if (err) {
//       setError(err);
//       return;
//     }

//     try {
//       setIsSending(true);
//       const res = await api.post("/auth/request-code", {
//         firstName,
//         lastName,
//         // username: username.trim(),
//         email: email.trim().toLowerCase(),
//         password,
//         captchaToken, // 👈 send captcha token
//       });
//       setIsSending(false);

//       if (res.data?.ok) {
//         setShowModal(true);
//         setExpiresIn(res.data.expiresInSec ?? FIVE_MIN); // server says 300
//         setSuccess("We sent an activation code to your email.");
//       } else {
//         setError(res.data?.message || "Could not send activation code.");
//         recaptchaRef.current?.reset();
//         setCaptchaToken(null);
//       }
//     } catch (e) {
//       setIsSending(false);
//       setError(e?.response?.data?.message || "Could not send activation code.");
//       recaptchaRef.current?.reset();
//       setCaptchaToken(null);
//     }
//   };

//   // Step 2: verify activation code (creates account)
//   const verifyCode = async () => {
//     setError("");
//     setSuccess("");
//     if (!/^\d{6}$/.test(code)) {
//       setError("Please enter the 6-digit code.");
//       return;
//     }
//     try {
//       const res = await api.post("/auth/verify-code", {
//         email: email.trim().toLowerCase(),
//         code: code.trim(),
//       });
//       if (res.data?.ok) {
//         setSuccess("Your account was created successfully! Redirecting…");
//         setTimeout(() => navigate("/login"), 1500);
//       } else {
//         setError(res.data?.message || "Invalid or expired code.");
//       }
//     } catch (e) {
//       setError(e?.response?.data?.message || "Invalid or expired code.");
//     }
//   };

//   // Resend code (resets timer). We also protect this with captcha
//   const resendCode = async () => {
//     setError("");
//     setSuccess("");
//     if (!captchaToken) {
//       setError("Please complete the captcha before resending.");
//       return;
//     }
//     try {
//       const res = await api.post("/auth/resend-code", {
//         email: email.trim().toLowerCase(),
//         captchaToken, // 👈 include captcha for resend too
//       });
//       if (res.data?.ok) {
//         setSuccess("A new activation code has been sent.");
//         setExpiresIn(res.data.expiresInSec ?? FIVE_MIN);
//         setCode("");
//       } else {
//         setError(res.data?.message || "Could not resend code yet.");
//         recaptchaRef.current?.reset();
//         setCaptchaToken(null);
//       }
//     } catch (e) {
//       setError(e?.response?.data?.message || "Could not resend code.");
//       recaptchaRef.current?.reset();
//       setCaptchaToken(null);
//     }
//   };

//   return (
//     <div className="login-page">
//       <form
//         className="login-box"
//         onSubmit={(e) => {
//           e.preventDefault();
//           handleSignup();
//         }}
//       >
//         <img src={logo} alt="App Logo" className="login-logo" />
//         <h1>Create Account</h1>

//         {error && <p className="error">{error}</p>}
//         {success && <p className="success">{success}</p>}

//         <div className="name-row">
//           <input
//             type="text"
//             placeholder="First name"
//             value={firstName}
//             onChange={(e) => setFirstName(e.target.value)}
//             autoComplete="given-name"
//           />
//           <input
//             type="text"
//             placeholder="Last name"
//             value={lastName}
//             onChange={(e) => setLastName(e.target.value)}
//             autoComplete="family-name"
//           />
//         </div>

//         <input
//           type="email"
//           placeholder="Email (for verification)"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//           autoComplete="email"
//         />

//         <input
//           type="password"
//           placeholder="Password (8+ chars, 1 uppercase, 1 number, 1 special)"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           onFocus={() => setPwFocused(true)}
//           onBlur={() => setPwFocused(false)}
//           autoComplete="new-password"
//           aria-describedby="pw-reqs"
//         />

//         {/* ✅ Horizontal password requirements */}
//         {pwFocused && (
//           <div id="pw-reqs" className="pw-reqs" aria-live="polite">
//             <span className={`req ${passLenOK ? "ok" : "bad"}`}>
//               {passLenOK ? "✓" : "✗"} 8+ chars
//             </span>
//             <span className={`req ${passUpperOK ? "ok" : "bad"}`}>
//               {passUpperOK ? "✓" : "✗"} 1 uppercase
//             </span>
//             <span className={`req ${passDigitOK ? "ok" : "bad"}`}>
//               {passDigitOK ? "✓" : "✗"} 1 number
//             </span>
//             <span className={`req ${passSpecialOK ? "ok" : "bad"}`}>
//               {passSpecialOK ? "✓" : "✗"} 1 special
//             </span>
//           </div>
//         )}

//         {/* Google reCAPTCHA */}
//         <ReCAPTCHA
//           ref={recaptchaRef}
//           sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
//           onChange={(token) => setCaptchaToken(token)}
//           onExpired={() => setCaptchaToken(null)}
//         />

//         <button
//           type="submit"
//           disabled={isSending || !captchaToken || !allPassReqOK}
//         >
//           {isSending ? "Sending code…" : "Sign Up"}
//         </button>

//         <p className="login-link">
//           Already have an account?{" "}
//           <span
//             className="link-text"
//             onClick={() => navigate("/login")}
//             style={{ color: "#1976d2", cursor: "pointer" }}
//           >
//             Login
//           </span>
//         </p>
//       </form>

//       {/* Modal */}
//       {showModal && (
//         <div className="modal-overlay">
//           <div className="modal">
//             <h2>Verify your email</h2>
//             <p>
//               We’ve sent a 6-digit activation code to <b>{email}</b>.
//               <br />
//               Code expires in <b>{timeLeft}</b>.
//             </p>

//             <input
//               type="text"
//               inputMode="numeric"
//               pattern="\d{6}"
//               maxLength={6}
//               placeholder="Enter 6-digit code"
//               value={code}
//               onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
//               className="code-input"
//             />

//             <div className="modal-actions">
//               <button onClick={verifyCode} disabled={expiresIn <= 0}>
//                 Verify & Create Account
//               </button>
//               <button className="linklike" onClick={resendCode}>
//                 Didn’t get the email? Resend
//               </button>
//             </div>

//             <button
//               className="modal-close"
//               onClick={() => {
//                 setShowModal(false);
//                 setCode("");
//                 setSuccess("");
//                 recaptchaRef.current?.reset();
//                 setCaptchaToken(null);
//               }}
//               aria-label="Close"
//             >
//               ✕
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Signup;

import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import "./Signup.css";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import trueSendrLogo from "../assets/TrueSendr Temp logo-03.png";

/* API */
const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE ||
    (window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : `${window.location.protocol}//${window.location.host}`),
  headers: { "ngrok-skip-browser-warning": "true" },
  timeout: 20000,
});

const OTP_LEN = 6;

function EyeIcon({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path
            d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </>
      ) : (
        <>
          <path
            d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4 4l16 16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M9.5 9.7A3.2 3.2 0 0 0 12 15.2c.5 0 1-.1 1.4-.3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);

  /* step: signup | verify | success */
  const [step, setStep] = useState("signup");

  /* form */
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);

  /* captcha */
  const [captchaToken, setCaptchaToken] = useState(null);

  /* show/hide pw */
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* otp */
  const [otp, setOtp] = useState(Array(OTP_LEN).fill(""));
  const otpRefs = useRef([]);

  /* ui */
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* PASSWORD RULES */
  const passLenOK = useMemo(() => password.length >= 8, [password]);
  const passUpperOK = useMemo(() => /[A-Z]/.test(password), [password]);
  const passDigitOK = useMemo(() => /\d/.test(password), [password]);
  const passSpecialOK = useMemo(
    () => /[!@#$%^&*()\-_=+[{\]}\\|;:'",<.>/?`~]/.test(password),
    [password]
  );
  const allPassOK = passLenOK && passUpperOK && passDigitOK && passSpecialOK;

  const validEmail = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );

  const validForm =
    firstName.trim() &&
    lastName.trim() &&
    validEmail &&
    password === confirm &&
    allPassOK &&
    agree &&
    captchaToken;

  const resetOtp = () => {
    setOtp(Array(OTP_LEN).fill(""));
    setTimeout(() => otpRefs.current[0]?.focus(), 0);
  };

  const RESEND_COOLDOWN_SEC = 60;

  const [resendLeft, setResendLeft] = useState(0);
  const resendTimerRef = useRef(null);

  const startResendTimer = (sec = RESEND_COOLDOWN_SEC) => {
    // clear previous timer
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);

    setResendLeft(sec);

    resendTimerRef.current = setInterval(() => {
      setResendLeft((s) => {
        if (s <= 1) {
          clearInterval(resendTimerRef.current);
          resendTimerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const formatMMSS = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  /* SIGNUP */
  const handleSignup = async () => {
    if (!validForm) return;
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/request-code", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        captchaToken,
      });

      if (res.data?.ok) {
        setStep("verify");
        resetOtp();
        const cooldown = Number(
          res.data?.resendCooldownSec || RESEND_COOLDOWN_SEC
        );
        startResendTimer(cooldown);
      } else {
        setError(res.data?.message || "Signup failed");
      }
    } catch (e) {
      const status = e?.response?.status;
      const apiCode = e?.response?.data?.code;

      if (status === 410 && apiCode === "SIGNUP_EXPIRED") {
        setError(
          e?.response?.data?.message || "OTP expired. Please sign up again."
        );
        setTimeout(() => {
          goBackToSignup();
        }, 600);
        setLoading(false);
        return;
      }

      // ✅ if backend says wait, sync timer with server
      const retryAfterSec = e?.response?.data?.retryAfterSec;
      if (e?.response?.status === 429 && retryAfterSec) {
        startResendTimer(Number(retryAfterSec));
        setError(e?.response?.data?.message || "Please wait before resending.");
      } else if (e.code === "ECONNABORTED") {
        setError("Server timeout. Please try again.");
      } else {
        setError(e?.response?.data?.message || "Could not resend code.");
      }
    }

    setLoading(false);
  };

  /* OTP input */
  const handleOtp = (val, i) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus();
  };

  const onOtpKeyDown = (e, i) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LEN - 1)
      otpRefs.current[i + 1]?.focus();
  };

  /* VERIFY */
  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== OTP_LEN) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/verify-code", {
        email: email.trim().toLowerCase(),
        code,
      });
      if (res.data?.ok) setStep("success");
      else setError(res.data?.message || "Invalid code");
    } catch (e) {
      if (e.code === "ECONNABORTED")
        setError("Server timeout. Please try again.");
      else setError(e?.response?.data?.message || "Invalid code");
    }

    setLoading(false);
  };

  /* RESEND (NO CAPTCHA) */
  const resendCode = async () => {
    if (loading) return;
    if (resendLeft > 0) return; // ✅ blocked on UI too

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/resend-code", {
        email: email.trim().toLowerCase(),
      });

      if (res.data?.ok) {
        resetOtp();

        const cooldown = Number(
          res.data?.resendCooldownSec || RESEND_COOLDOWN_SEC
        );
        startResendTimer(cooldown);
      } else {
        setError(res.data?.message || "Could not resend code.");
      }
    } catch (e) {
      // ✅ if backend says wait, sync timer with server
      const retryAfterSec = e?.response?.data?.retryAfterSec;
      if (e?.response?.status === 429 && retryAfterSec) {
        startResendTimer(Number(retryAfterSec));
        setError(e?.response?.data?.message || "Please wait before resending.");
      } else if (e.code === "ECONNABORTED") {
        setError("Server timeout. Please try again.");
      } else {
        setError(e?.response?.data?.message || "Could not resend code.");
      }
    }

    setLoading(false);
  };

  const goBackToSignup = () => {
    setStep("signup");
    setError("");
    resetOtp();

    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = null;
    setResendLeft(0);
  };

  return (
    <div className="signup-wrap">
      <div className="signup-card">
        {/* LEFT */}
        <div className="signup-left">
          {/* SIGNUP */}
          {step === "signup" && (
            <div className="left-stack signup-step">
              <h2 className="title">Sign up</h2>

              <div className="row">
                <input
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirst(e.target.value)}
                  autoComplete="given-name"
                />
                <input
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLast(e.target.value)}
                  autoComplete="family-name"
                />
              </div>

              <input
                placeholder="Company Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              {/* password with eye */}
              <div className="input-eye">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Create Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>

              <div className="input-eye">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>

              {/* checklist (ONE ROW) */}
              <div className="pw-reqs one-row">
                <span className={passLenOK ? "ok" : "bad"}>✓ 8+ chars</span>
                <span className={passUpperOK ? "ok" : "bad"}>✓ Uppercase</span>
                <span className={passDigitOK ? "ok" : "bad"}>✓ Number</span>
                <span className={passSpecialOK ? "ok" : "bad"}>✓ Special</span>
              </div>

              {/* terms */}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>Accept terms & conditions</span>
              </label>

              {/* captcha visible */}
              <div className="captcha">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                  onChange={(t) => setCaptchaToken(t)}
                  onExpired={() => setCaptchaToken(null)}
                />
              </div>

              {error && <div className="error-box">{error}</div>}

              <button
                className="primary-btn"
                disabled={!validForm || loading}
                onClick={handleSignup}
              >
                {loading ? "Signing up..." : "Sign up"}
              </button>

              <p className="login-link center">
                Already have an account?{" "}
                <span onClick={() => navigate("/login")}>Log in</span>
              </p>
            </div>
          )}

          {/* VERIFY */}
          {step === "verify" && (
            <div className="left-stack verify-step">
              <div className="verify-head">
                <button
                  type="button"
                  className="back-inline"
                  onClick={goBackToSignup}
                  aria-label="Go back"
                  title="Back"
                >
                  <ArrowBackIcon className="back-ic" />
                </button>

                <h2 className="title verify-title">Verify Email</h2>
              </div>

              <p className="sub one-line">
                Enter 6 digit code sent to email <b>{email}</b>
              </p>

              <div className="otp-row">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    maxLength={1}
                    value={v}
                    onChange={(e) => handleOtp(e.target.value, i)}
                    onKeyDown={(e) => onOtpKeyDown(e, i)}
                    inputMode="numeric"
                  />
                ))}
              </div>

              {error && <div className="error-box">{error}</div>}

              <button
                className="primary-btn"
                onClick={verifyOtp}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify"}
              </button>

              <p className="resend">
                Didn’t receive code?{" "}
                <span
                  className={`resend-link ${
                    resendLeft > 0 || loading ? "disabled" : ""
                  }`}
                  onClick={resendCode}
                  role="button"
                  aria-disabled={resendLeft > 0 || loading}
                  tabIndex={0}
                >
                  Resend Code
                </span>
                <span className="resend-timer">
                  {resendLeft > 0 ? formatMMSS(resendLeft) : ""}
                </span>
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {step === "success" && (
            <div className="success-wrap">
              <div className="success-circle green">✓</div>
              <p className="success-text">Email verified successfully</p>
              <button
                className="primary-btn full"
                onClick={() => navigate("/login")}
              >
                Back to Log in
              </button>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="signup-right">
          <div className="brand">
            <img
              className="brand-logo"
              src={trueSendrLogo}
              alt="TrueSendr logo"
            />
            <p>Message/Description</p>
          </div>
        </div>
      </div>
    </div>
  );
}
