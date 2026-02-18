import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HeaderBar.css";
import { useCredits } from "../credits/CreditsContext";

/* MUI Icons (match screenshot style) */
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { Dialog } from "@mui/material";

function toTitleCase(name) {
  return String(name || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Try to pull email from localStorage if you don't pass it as a prop */
function getStoredEmail() {
  // 1) direct key
  const e0 = (
    localStorage.getItem("email") ||
    localStorage.getItem("userEmail") ||
    ""
  ).trim();
  if (e0) return e0;

  // 2) if you store some JSON user
  const raw =
    localStorage.getItem("user") ||
    localStorage.getItem("loggedInUserObj") ||
    localStorage.getItem("profile") ||
    "";

  if (raw) {
    try {
      const obj = JSON.parse(raw);
      const e1 = (obj?.email || obj?.user?.email || "").trim();
      if (e1) return e1;
    } catch {
      // ignore
    }
  }

  return "";
}

const HeaderBar = ({ onLogout, username, email }) => {
  const { credits } = useCredits();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const wrapRef = useRef(null);

  const displayName = useMemo(() => {
    const raw = String(
      username ||
        localStorage.getItem("userFullName") ||
        localStorage.getItem("loggedInUser") ||
        "",
    ).trim();

    if (!raw) return "User";

    return toTitleCase(raw);
  }, [username]);

  const displayEmail = useMemo(() => {
    const e = String(email || "").trim();
    if (e) return e;
    return getStoredEmail() || "john.doe@marketingmedia.com";
  }, [email]);

  const initials = useMemo(() => {
    const u = String(displayName || "").trim();
    if (!u) return "U";
    const parts = u.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [displayName]);

  // Close dropdown on outside click + ESC
  useEffect(() => {
    const onDocDown = (e) => {
      if (!open) return;
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleMenu = () => setOpen((v) => !v);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false); // close dropdown
    setLogoutOpen(true); // open confirmation dialog
  };

  const closeLogoutDialog = () => setLogoutOpen(false);

  const confirmLogout = () => {
    setLogoutOpen(false);
    onLogout?.();
  };

  return (
    <header className="hb">
      <div className="hb-left" aria-hidden="true" />

      <div className="hb-right" ref={wrapRef}>
        <div className="hb-credits" aria-label="Credits">
          <span className="hb-credits-num">
            {Number(credits || 0).toLocaleString()}
          </span>
          <span className="hb-credits-label">Credits</span>
        </div>

        <button
          type="button"
          className="hb-buy"
          onClick={() => navigate("/buy-credits")}
          aria-label="Buy credits"
        >
          Buy Credits
        </button>

        <button
          type="button"
          className={`hb-avatar ${open ? "is-open" : ""}`}
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={open ? "true" : "false"}
          aria-label="Open profile menu"
        >
          {initials}
        </button>

        {open && (
          <div className="hb-menu" role="menu" aria-label="Profile menu">
            {/* TOP PROFILE */}
            <div className="hb-menu-profile">
              <div className="hb-menu-avatar">{initials}</div>
              <div className="hb-menu-name">{displayName}</div>
              <div className="hb-menu-email">{displayEmail}</div>
            </div>

            <div className="hb-menu-divider" />

            {/* MENU ITEMS */}
            <button
              type="button"
              className="hb-menu-item"
              role="menuitem"
              onClick={() => go("/settings")}
            >
              <SettingsOutlinedIcon className="hb-mi-ico" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              className="hb-menu-item"
              role="menuitem"
              onClick={() => go("/refer")}
            >
              <CardGiftcardOutlinedIcon className="hb-mi-ico" />
              <span>Refer &amp; earn credits</span>
            </button>

            <button
              type="button"
              className="hb-menu-item"
              role="menuitem"
              onClick={() => go("/support")}
            >
              <HelpOutlineOutlinedIcon className="hb-mi-ico" />
              <span>Support</span>
            </button>

            <button
              type="button"
              className="hb-menu-item"
              role="menuitem"
              onClick={() => go("/terms")}
            >
              <DescriptionOutlinedIcon className="hb-mi-ico" />
              <span>Terms of use</span>
            </button>

            <button
              type="button"
              className="hb-menu-item"
              role="menuitem"
              onClick={() => go("/privacy")}
            >
              <PolicyOutlinedIcon className="hb-mi-ico" />
              <span>Privacy policy</span>
            </button>

            <div className="hb-menu-divider" />

            <button
              type="button"
              className="hb-menu-item danger"
              onClick={handleLogout}
              role="menuitem"
            >
              <LogoutOutlinedIcon className="hb-mi-ico" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
      {/* LOGOUT CONFIRM DIALOG */}
      <Dialog
        open={logoutOpen}
        onClose={closeLogoutDialog}
        fullWidth
        maxWidth={false}
        slotProps={{
          paper: { className: "hbLogoutPaper" },
        }}
      >
        <div className="hbLogoutTitle">Log out?</div>

        <div className="hbLogoutBody">Are you sure you want to log out?</div>

        <div className="hbLogoutActions">
          <button
            type="button"
            className="hbLogoutCancel"
            onClick={closeLogoutDialog}
          >
            Cancel
          </button>

          <button
            type="button"
            className="hbLogoutConfirm"
            onClick={confirmLogout}
          >
            Log out
          </button>
        </div>
      </Dialog>
    </header>
  );
};

export default HeaderBar;
