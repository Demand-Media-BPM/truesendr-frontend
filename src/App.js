import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import axios from "axios";

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
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

/* Axios instance */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE,
  headers: { "ngrok-skip-browser-warning": "true" },
});

const App = () => {
  const [collapsed] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("isLoggedIn") === "true"
  );
  const [loggedInUser, setLoggedInUser] = useState(
    () => localStorage.getItem("loggedInUser") || ""
  );
  const [showLoader, setShowLoader] = useState(false);
  const [credits, setCredits] = useState(() =>
    Number(localStorage.getItem("credits") || 0)
  );

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  const handleLogin = async (username) => {
    setLoggedInUser(username);
    setIsLoggedIn(true);
    setShowLoader(true);

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
    localStorage.clear();
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
                username={loggedInUser}
                credits={credits}
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
              </Routes>
            </main>
          </div>
        </div>
      )}

      {/* <ToastContainer position="top-right" autoClose={4000} theme="light" /> */}
      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar
        newestOnTop
        closeButton={false} // 👈 IMPORTANT
        pauseOnHover
      />
    </Router>
  );
};

export default App;
