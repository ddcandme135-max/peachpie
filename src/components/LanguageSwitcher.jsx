import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

export default function LanguageSwitcher({ isOpen: sidebarOpen }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const langPrefix = (i18n.language ?? "en").slice(0, 2);
  const current = LANGS.find(l => l.code === langPrefix) ?? LANGS[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="언어 선택"
        style={{
          display: "flex", alignItems: "center", gap: sidebarOpen ? 8 : 0,
          width: "100%", padding: sidebarOpen ? "8px 10px" : "8px 0",
          justifyContent: sidebarOpen ? "flex-start" : "center",
          background: open ? "rgba(255,255,255,0.08)" : "none",
          border: "none", borderRadius: 10, cursor: "pointer",
          color: "rgba(255,255,255,0.6)", transition: "background 120ms",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "none"; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M3.6 9h16.8M3.6 15h16.8"/>
          <path d="M12 3a14.5 14.5 0 0 1 4 9 14.5 14.5 0 0 1-4 9 14.5 14.5 0 0 1-4-9 14.5 14.5 0 0 1 4-9z"/>
        </svg>
        {sidebarOpen && (
          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
            {current.flag} {current.label}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          background: "#161622", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, padding: "4px 0", minWidth: 150,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 200,
        }}>
          {LANGS.map(lang => {
            const active = langPrefix === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 14px", background: "none",
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  color: active ? "#fff" : "rgba(255,255,255,0.6)",
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  textAlign: "left",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ fontSize: 16 }}>{lang.flag}</span>
                {lang.label}
                {active && (
                  <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
