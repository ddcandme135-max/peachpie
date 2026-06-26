import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const { t } = useTranslation();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage(t("auth.signupSuccess"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400, padding: "48px 40px", borderRadius: 24, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>

        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>
            Peachpie
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
            {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 4, marginBottom: 28 }}>
          {[{ id: "login", label: t("auth.login") }, { id: "signup", label: t("auth.signup") }].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id); setError(""); setMessage(""); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, transition: "all 150ms", background: mode === tab.id ? "rgba(255,255,255,0.12)" : "transparent", color: mode === tab.id ? "#fff" : "rgba(255,255,255,0.4)" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>{t("auth.email")}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>{t("auth.password")}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.3)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(252,60,68,0.1)", border: "1px solid rgba(252,60,68,0.2)", color: "#fc8086", fontSize: 13 }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontSize: 13 }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 6, padding: "13px", borderRadius: 12, background: loading ? "rgba(252,60,68,0.5)" : "#FC3C44", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 150ms" }}
          >
            {loading ? t("auth.loading") : mode === "login" ? t("auth.login") : t("auth.signup")}
          </button>
        </form>

      </div>
    </div>
  );
}
