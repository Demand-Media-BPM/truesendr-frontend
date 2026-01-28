// import React, { useEffect, useMemo, useRef, useState } from "react";
// import axios from "axios";
// import "./HeaderBar.css";

// const HeaderBar = ({ onLogout, username, credits: creditsProp }) => {
//   const [credits, setCredits] = useState(0);
//   const [open, setOpen] = useState(false);
//   const wrapRef = useRef(null);

//   const apiBase =
//     process.env.REACT_APP_API_BASE ||
//     (window.location.hostname === "localhost"
//       ? "http://localhost:5000"
//       : `${window.location.protocol}//${window.location.host}`);

//   // If parent passes credits, prefer it (no duplicate polling).
//   useEffect(() => {
//     if (typeof creditsProp === "number") setCredits(creditsProp);
//   }, [creditsProp]);

//   // Fetch credits on mount + poll every 10s (only if parent NOT sending credits)
//   useEffect(() => {
//     if (!username) return;
//     if (typeof creditsProp === "number") return;

//     let alive = true;

//     const fetchCredits = async () => {
//       try {
//         const res = await axios.get(`${apiBase}/get-credits`, {
//           params: { username },
//           headers: { "ngrok-skip-browser-warning": "true" },
//         });
//         if (alive) setCredits(Number(res.data?.credits || 0));
//       } catch (err) {
//         console.error("❌ Failed to fetch credits", err);
//       }
//     };

//     fetchCredits();
//     const interval = setInterval(fetchCredits, 10000);

//     return () => {
//       alive = false;
//       clearInterval(interval);
//     };
//   }, [username, apiBase, creditsProp]);

//   const initials = useMemo(() => {
//     const u = String(username || "").trim();
//     if (!u) return "U";
//     const parts = u.split(/\s+/).filter(Boolean);
//     if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
//     return (parts[0][0] + parts[1][0]).toUpperCase();
//   }, [username]);

//   // Close dropdown on outside click + ESC
//   useEffect(() => {
//     const onDocDown = (e) => {
//       if (!open) return;
//       if (!wrapRef.current) return;
//       if (!wrapRef.current.contains(e.target)) setOpen(false);
//     };

//     const onKey = (e) => {
//       if (e.key === "Escape") setOpen(false);
//     };

//     document.addEventListener("mousedown", onDocDown);
//     window.addEventListener("keydown", onKey);

//     return () => {
//       document.removeEventListener("mousedown", onDocDown);
//       window.removeEventListener("keydown", onKey);
//     };
//   }, [open]);

//   const toggleMenu = () => setOpen((v) => !v);

//   const handleLogout = () => {
//     setOpen(false);
//     onLogout?.();
//   };

//   return (
//     <header className="hb">
//       {/* Left side intentionally empty (keeps layout like design) */}
//       <div className="hb-left" aria-hidden="true" />

//       <div className="hb-right" ref={wrapRef}>
//         <div className="hb-credits" aria-label="Credits">
//           <span className="hb-credits-num">{credits.toLocaleString()}</span>
//           <span className="hb-credits-label">Credits</span>
//         </div>

//         <button
//           type="button"
//           className={`hb-avatar ${open ? "is-open" : ""}`}
//           onClick={toggleMenu}
//           aria-haspopup="menu"
//           aria-expanded={open ? "true" : "false"}
//           aria-label="Open profile menu"
//         >
//           {initials}
//         </button>

//         {open && (
//           <div className="hb-menu" role="menu" aria-label="Profile menu">
//             <div className="hb-menu-top">
//               <div className="hb-menu-user">{username || "User"}</div>
//             </div>

//             <button
//               type="button"
//               className="hb-menu-item danger"
//               onClick={handleLogout}
//               role="menuitem"
//             >
//               Logout
//             </button>
//           </div>
//         )}
//       </div>
//     </header>
//   );
// };

// export default HeaderBar;


import React, { useEffect, useMemo, useRef, useState } from "react";
import "./HeaderBar.css";
import { useCredits } from "../credits/CreditsContext";

const HeaderBar = ({ onLogout, username }) => {
  const { credits } = useCredits();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const initials = useMemo(() => {
    const u = String(username || "").trim();
    if (!u) return "U";
    const parts = u.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [username]);

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

  const handleLogout = () => {
    setOpen(false);
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
            <div className="hb-menu-top">
              <div className="hb-menu-user">{username || "User"}</div>
            </div>

            <button
              type="button"
              className="hb-menu-item danger"
              onClick={handleLogout}
              role="menuitem"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderBar;
