import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import axios from "axios";

const CreditsContext = createContext(null);

function getApiBase() {
  const env = process.env.REACT_APP_API_BASE;
  if (env) return env.replace(/\/+$/, "");
  return window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : `${window.location.protocol}//${window.location.host}`;
}

export function CreditsProvider({ username, children }) {
  const [credits, setCreditsState] = useState(() => {
    return Number(localStorage.getItem("credits") || 0);
  });

  const setCredits = useCallback((value) => {
    const n = Number(value || 0);
    setCreditsState(n);
    localStorage.setItem("credits", String(n));
  }, []);

  // ✅ call this ONLY after credit deduction events (later we’ll add in modules)
  const refreshCredits = useCallback(async () => {
    const u = String(username || "").trim();
    if (!u) return;

    try {
      const res = await axios.get(`${getApiBase()}/get-credits`, {
        params: { username: u },
        headers: { "ngrok-skip-browser-warning": "true" },
      });

      setCredits(res.data?.credits ?? 0);
    } catch (err) {
      console.error("❌ refreshCredits failed", err);
    }
  }, [username, setCredits]);

  // Nice: when username changes (login), sync once
  useEffect(() => {
    if (username) refreshCredits();
  }, [username, refreshCredits]);

  const withCreditRefresh = useCallback(
    async (fn, creditEvent = true) => {
      const result = await fn();
      if (creditEvent) await refreshCredits();
      return result;
    },
    [refreshCredits]
  );

  return (
    <CreditsContext.Provider value={{ credits, setCredits, refreshCredits, withCreditRefresh }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within CreditsProvider");
  return ctx;
}
