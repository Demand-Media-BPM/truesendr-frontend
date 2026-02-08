import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import { CreditsProvider } from "./credits/CreditsContext";

/* Pages */
import SingleValidator from "./Components/SingleValidator";
import BulkValidator from "./Components/BulkValidator";
import Dashboard from "./Components/Dashboard";
import Login from "./Components/Login";
import Loader from "./Components/Loader";
import HeaderBar from "./Components/HeaderBar";
import Signup from "./Components/Signup";
import ForgotPassword from "./Components/ForgotPassword";
import ResetPassword from "./Components/ResetPassword";
import EmailFinder from "./Components/EmailFinder";
import PhoneValidator from "./Components/PhoneValidator";
import Deliverability from "./Components/Deliverability";
import FileCleaner from "./Components/FileCleaner";
import Settings from "./Components/settings";
import Refer from "./Components/Refer";
import Support from "./Components/Support";
import Terms from "./Components/Terms";
import Privacy from "./Components/Privacy";
import BuyCredits from "./Components/BuyCredits";
import Training from "./Components/Training";

import logo from "./assets/TrueSendr Temp logo-02.png";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

/* ───────── YOUR REQUIRED MATERIAL UI ICONS ───────── */
import DashboardIcon from "@mui/icons-material/Dashboard";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import CleaningServicesOutlinedIcon from "@mui/icons-material/CleaningServicesOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

/* Axios instance */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE,
  headers: { "ngrok-skip-browser-warning": "true" },
});

// ─────────────────────────────────────────────────────────────
// Single active login per browser profile (cross-tab secure)
// - When any tab logs in, other tabs must logout
// - When any tab logs out, all tabs logout
// ─────────────────────────────────────────────────────────────
const LS_ACTIVE_SESSION = "TS_ACTIVE_SESSION_ID";
const SS_MY_SESSION = "TS_MY_SESSION_ID";
const LS_SESSION_PING = "TS_SESSION_PING_MS";
const PING_INTERVAL_MS = 4000; // 4s
const PING_STALE_MS = 10000; // consider dead if > 12s old

function newSessionId() {
  return (
    (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
    `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

function clearAuthStorage() {
  // remove only auth-related keys (DON'T localStorage.clear())
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("credits");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userFullName");
  localStorage.removeItem(LS_SESSION_PING);
  localStorage.removeItem(LS_ACTIVE_SESSION);
  sessionStorage.removeItem(SS_MY_SESSION);
}

function isPingFresh() {
  const last = Number(localStorage.getItem(LS_SESSION_PING) || 0);
  return last > 0 && Date.now() - last <= PING_STALE_MS;
}

const ADMIN_EMAILS = [
  "saurabh.s@demandmediabpm.com",
  "yashwardhan.s@demandmediabpm.com",
];

const App = () => {
  const [collapsed] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("isLoggedIn") === "true",
  );
  const [loggedInUser, setLoggedInUser] = useState(
    () => localStorage.getItem("loggedInUser") || "",
  );
  const [showLoader, setShowLoader] = useState(false);
  const [credits, setCredits] = useState(() =>
    Number(localStorage.getItem("credits") || 0),
  );

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const displayName = localStorage.getItem("userFullName") || loggedInUser;

  const userEmail = (localStorage.getItem("userEmail") || "")
    .trim()
    .toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(userEmail);

  const openMobileSidebar = () => setMobileSidebarOpen(true);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  // close sidebar when route changes (optional but great)
  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth > 900) setMobileSidebarOpen(false);
    };
    window.addEventListener("resize", closeOnResize);
    return () => window.removeEventListener("resize", closeOnResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMobileSidebar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (
        e.key !== LS_ACTIVE_SESSION &&
        e.key !== "isLoggedIn" &&
        e.key !== "loggedInUser" &&
        e.key !== "credits"
      ) {
        return;
      }

      const active = localStorage.getItem(LS_ACTIVE_SESSION) || "";
      const mine = sessionStorage.getItem(SS_MY_SESSION) || "";

      // If active session is removed -> logout everywhere
      if (!active) {
        setIsLoggedIn(false);
        setLoggedInUser("");
        setCredits(0);
        return;
      }

      // If active session belongs to another tab -> force logout this tab
      if (mine && active !== mine) {
        setIsLoggedIn(false);
        setLoggedInUser("");
        setCredits(0);
        return;
      }

      // If this tab is active, keep state synced
      if (active === mine) {
        setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
        setLoggedInUser(localStorage.getItem("loggedInUser") || "");
        setCredits(Number(localStorage.getItem("credits") || 0));
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ✅ Boot-time guard:
  // If localStorage says logged in but this tab doesn't own the session, force logout.
  // ✅ Boot-time session sync:
  // - If a session is alive (fresh ping), new tab auto-joins it
  // - If session is dead (stale ping), auto-logout default
  useEffect(() => {
    const active = localStorage.getItem(LS_ACTIVE_SESSION) || "";
    const logged = localStorage.getItem("isLoggedIn") === "true";

    if (!active || !logged) return;

    // If the last session is dead (tab closed), clear everything -> login
    if (!isPingFresh()) {
      clearAuthStorage();
      setIsLoggedIn(false);
      setLoggedInUser("");
      setCredits(0);
      return;
    }

    // Session is alive -> this tab joins it
    sessionStorage.setItem(SS_MY_SESSION, active);

    // sync state
    setIsLoggedIn(true);
    setLoggedInUser(localStorage.getItem("loggedInUser") || "");
    setCredits(Number(localStorage.getItem("credits") || 0));
  }, []);

  // ✅ Heartbeat: only the active tab keeps session alive
  useEffect(() => {
    const tick = () => {
      const active = localStorage.getItem(LS_ACTIVE_SESSION) || "";
      const mine = sessionStorage.getItem(SS_MY_SESSION) || "";

      if (!active || !mine) return;

      // Only the active session tab updates ping
      if (active === mine && localStorage.getItem("isLoggedIn") === "true") {
        localStorage.setItem(LS_SESSION_PING, String(Date.now()));
      }
    };

    // run once immediately + interval
    tick();
    const id = setInterval(tick, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const handleLogin = async (username) => {
    setShowLoader(true);

    // ✅ new session takeover: this tab becomes the ONLY active session
    const sid = newSessionId();
    sessionStorage.setItem(SS_MY_SESSION, sid);
    localStorage.setItem(LS_ACTIVE_SESSION, sid);
    localStorage.setItem(LS_SESSION_PING, String(Date.now()));

    setLoggedInUser(username);
    setIsLoggedIn(true);

    const res = await api.get(`/user/${username}`);
    const c = res.data.credits || 0;
    setCredits(c);

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("loggedInUser", username);
    localStorage.setItem("credits", c);

    setTimeout(() => setShowLoader(false), 1500);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUser("");
    setCredits(0);

    // ✅ logs out ALL tabs because active session id is removed
    clearAuthStorage();
  };

  if (showLoader) return <Loader />;

  return (
    <Router>
      {!isLoggedIn ? (
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/signup" replace />} />
        </Routes>
      ) : (
        <CreditsProvider username={loggedInUser}>
          <div className="app-container">
            {/* ───────── SIDEBAR ───────── */}
            <aside
              className={`sidebar ${collapsed ? "collapsed" : ""} ${
                mobileSidebarOpen ? "mobile-open" : ""
              }`}
            >
              {/* Sticky top (logo) */}
              <div className="sidebar-top">
                <div className="sidebar-brand">
                  <img src={logo} alt="TrueSendr" className="sidebar-logo" />
                </div>
              </div>

              {/* Scrollable nav */}
              <div className="sidebar-scroll">
                {/* MAIN */}
                <div className="sidebar-section">
                  <div className="sidebar-section-title">MAIN</div>
                  <NavLink
                    to="/dashboard"
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    <span className="nav-link-icon">
                      <DashboardIcon />
                    </span>
                    <span className="nav-link-label">Dashboard</span>
                  </NavLink>
                </div>

                {/* VALIDATION */}
                <div className="sidebar-section">
                  <div className="sidebar-section-title">VALIDATION</div>

                  <NavLink
                    to="/single"
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    <span className="nav-link-icon">
                      <MailOutlineIcon />
                    </span>
                    <span className="nav-link-label">Single</span>
                  </NavLink>

                  <NavLink
                    to="/bulk"
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    <span className="nav-link-icon">
                      <DescriptionOutlinedIcon />
                    </span>
                    <span className="nav-link-label">Bulk</span>
                  </NavLink>

                  <NavLink
                    to="/phone"
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    <span className="nav-link-icon">
                      <PhoneIphoneOutlinedIcon />
                    </span>
                    <span className="nav-link-label">Phone</span>
                  </NavLink>
                </div>

                {/* EMAIL TOOLS */}
                <div className="sidebar-section">
                  <div className="sidebar-section-title">EMAIL TOOLS</div>

                  {/* <NavLink
                    to="/finder"
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    <span className="nav-link-icon">
                      <SearchOutlinedIcon />
                    </span>
                    <span className="nav-link-label">Finder</span>
                  </NavLink> */}

                  <NavLink
                    to="/Deliverability"
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    <span className="nav-link-icon">
                      <ForwardToInboxOutlinedIcon />
                    </span>
                    <span className="nav-link-label">Deliverability</span>
                  </NavLink>
                </div>

                {/* UTILITIES */}
                <div className="sidebar-section">
                  <div className="sidebar-section-title">UTILITIES</div>

                  <NavLink
                    to="/Cleaner"
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                  >
                    <span className="nav-link-icon">
                      <CleaningServicesOutlinedIcon />
                    </span>
                    <span className="nav-link-label">File Cleaner</span>
                  </NavLink>

                  {isAdmin && (
                    <div className="sidebar-section">
                      <div className="sidebar-section-title">Admin</div>
                      <NavLink
                        to="/finder"
                        onClick={closeMobileSidebar}
                        className={({ isActive }) =>
                          isActive ? "nav-link active" : "nav-link"
                        }
                      >
                        <span className="nav-link-icon">
                          <SearchOutlinedIcon />
                        </span>
                        <span className="nav-link-label">Finder</span>
                      </NavLink>
                      <NavLink
                        to="/training"
                        onClick={closeMobileSidebar}
                        className={({ isActive }) =>
                          isActive ? "nav-link active" : "nav-link"
                        }
                      >
                        <span className="nav-link-icon">
                          <AdminPanelSettingsOutlinedIcon />
                        </span>
                        <span className="nav-link-label">Training</span>
                      </NavLink>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {mobileSidebarOpen && (
              <div className="sidebar-overlay" onClick={closeMobileSidebar} />
            )}

            {/* ───────── MAIN CONTENT ───────── */}
            <div className="content-area">
              <div className="topbar-row">
                <HeaderBar
                  onLogout={handleLogout}
                  username={displayName}
                  email={localStorage.getItem("userEmail")}
                />

                <button
                  className="mobile-menu-btn"
                  onClick={
                    mobileSidebarOpen ? closeMobileSidebar : openMobileSidebar
                  }
                  aria-label="Open menu"
                  type="button"
                >
                  {mobileSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
              </div>

              <main className="main-content">
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/single" element={<SingleValidator />} />
                  <Route path="/bulk" element={<BulkValidator />} />
                  <Route path="/finder" element={<EmailFinder />} />
                  <Route path="/phone" element={<PhoneValidator />} />
                  <Route path="/Deliverability" element={<Deliverability />} />
                  <Route path="/Cleaner" element={<FileCleaner />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/refer" element={<Refer />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/buy-credits" element={<BuyCredits />} />
                  <Route
                    path="/training"
                    element={
                      isAdmin ? (
                        <Training />
                      ) : (
                        <Navigate to="/dashboard" replace />
                      )
                    }
                  />
                </Routes>
              </main>
            </div>
          </div>
        </CreditsProvider>
      )}

      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar
        newestOnTop
        closeButton={false}
        pauseOnHover
      />
    </Router>
  );
};

export default App;
