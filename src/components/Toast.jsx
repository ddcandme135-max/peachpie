/*
  Toast-Catalog.html 원본 그대로:
  --accent:#FC3C44  --accent-bright:#FF505A
  --pos:#5ee6a8     --warn:#ffcf5e
  --fg-1:#fff       --fg-2:rgba(255,255,255,0.66)
  --fg-3:rgba(255,255,255,0.42)
  --line:rgba(255,255,255,0.08)  --line-hi:rgba(255,255,255,0.14)
*/

import { useTranslation } from "react-i18next";
import { ml } from "../lib/ml";

export default function Toast({ message, type, removing, onUndo, onDismiss, icon: iconProp }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const msg = message ?? "";

  // ── icon prop → variant + subtitle ──────────────────────────
  function resolve() {
    // Resolve effective icon (explicit prop or type-based fallback)
    let ic = iconProp;
    if (!ic) {
      if (type === "success") ic = "check";
      else if (type === "error") ic = "x";
      else if (type === "warn") ic = "shield";
      else ic = "minus";
    }

    // Determine subtitle from message
    let sub = null;
    if (msg.includes("신고")) sub = "검토 후 조치될 예정이에요";
    else if (msg.includes("피드백을 보냈")) sub = "소중한 의견 감사합니다";

    // Icon → variant + icon box style
    let v, icStyle, icNode;

    switch (ic) {
      case "heart":
        v = "like";
        icStyle = { background: "#FC3C44", color: "#fff", boxShadow: "none" };
        icNode = <HeartFilled />;
        break;
      case "heart-off":
        v = "heartoff";
        icStyle = { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.66)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" };
        icNode = <HeartOutline />;
        break;
      case "sparkle":
        v = "welcome";
        icStyle = { background: "linear-gradient(135deg,#ff7a4d,#FC3C44 60%,#c21230)", color: "#fff", boxShadow: "none" };
        icNode = <Sparkle />;
        break;
      case "house":
        v = "pos";
        icStyle = { background: "rgba(94,230,168,0.16)", color: "#5ee6a8", boxShadow: "inset 0 0 0 1px rgba(94,230,168,0.35)" };
        icNode = <House />;
        break;
      case "music":
        v = "pos";
        icStyle = { background: "rgba(94,230,168,0.16)", color: "#5ee6a8", boxShadow: "inset 0 0 0 1px rgba(94,230,168,0.35)" };
        icNode = <Music />;
        break;
      case "list-music":
        v = "pos";
        icStyle = { background: "rgba(94,230,168,0.16)", color: "#5ee6a8", boxShadow: "inset 0 0 0 1px rgba(94,230,168,0.35)" };
        icNode = <ListMusic />;
        break;
      case "check":
        v = "pos";
        icStyle = { background: "rgba(94,230,168,0.16)", color: "#5ee6a8", boxShadow: "inset 0 0 0 1px rgba(94,230,168,0.35)" };
        icNode = <CheckIcon />;
        break;
      case "user-plus":
        v = "neu";
        icStyle = { background: "rgba(255,255,255,0.08)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" };
        icNode = <UserPlus />;
        break;
      case "user-minus":
        v = "neu";
        icStyle = { background: "rgba(255,255,255,0.08)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" };
        icNode = <UserMinus />;
        break;
      case "trash":
        v = "neu";
        icStyle = { background: "rgba(255,255,255,0.08)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" };
        icNode = <Trash />;
        break;
      case "minus":
        v = "neu";
        icStyle = { background: "rgba(255,255,255,0.08)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" };
        icNode = <MinusIcon />;
        break;
      case "shield":
        v = "warn";
        icStyle = { background: "rgba(255,207,94,0.16)", color: "#ffcf5e", boxShadow: "inset 0 0 0 1px rgba(255,207,94,0.35)" };
        icNode = <ShieldIcon />;
        break;
      case "flag":
        v = "warn";
        icStyle = { background: "rgba(255,207,94,0.16)", color: "#ffcf5e", boxShadow: "inset 0 0 0 1px rgba(255,207,94,0.35)" };
        icNode = <FlagIcon />;
        break;
      case "x":
        v = "error";
        icStyle = { background: "#FC3C44", color: "#fff", boxShadow: "none" };
        icNode = <XIcon />;
        break;
      default:
        v = "neu";
        icStyle = { background: "rgba(255,255,255,0.08)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" };
        icNode = <MinusIcon />;
    }

    return { v, icStyle, icNode, sub };
  }

  const { v, icStyle, icNode, sub } = resolve();

  // 액션 텍스트 색
  const actColor = (v === "neu" || v === "heartoff") ? "rgba(255,255,255,0.66)" : "#FF505A";
  // 액션 레이블
  const actLabel = (v === "neu" || v === "heartoff")
    ? (ml("undo"))
    : (ml("undo"));

  // 하단 바 색 (모든 변형에 표시)
  const barColor =
    v === "pos"     ? "#5ee6a8" :
    v === "warn"    ? "#ffcf5e" :
    v === "neu"     ? "rgba(255,255,255,0.4)" :
    v === "welcome" ? "#FC3C44" :
    v === "like"    ? "#FC3C44" :
    v === "heartoff"? "rgba(255,255,255,0.25)" :
    v === "error"   ? "#FC3C44" :
    "rgba(255,255,255,0.25)";

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      display: "inline-flex", alignItems: "center", gap: 12,
      borderRadius: 14,
      background: "rgba(26,26,29,0.96)",
      boxShadow: "0 16px 40px -16px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.14)",
      color: "#fff",
      padding: "13px 14px",
      minWidth: 240, maxWidth: 400,
      pointerEvents: "auto",
      fontFamily: "'Pretendard','Inter',-apple-system,sans-serif",
      WebkitFontSmoothing: "antialiased",
      animation: removing
        ? "toastOut 300ms ease forwards"
        : "toastIn 320ms cubic-bezier(0.16,1,0.3,1) both",
    }}>

      {/* 아이콘 박스 (.ic) */}
      <span style={{
        width: 32, height: 32, borderRadius: 9, flex: "none",
        display: "grid", placeItems: "center",
        ...icStyle,
      }}>
        {icNode}
      </span>

      {/* 본문 (.bd) */}
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {message}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.42)", fontWeight: 500, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sub}
          </div>
        )}
      </div>

      {/* 액션 버튼 (.act) */}
      {onUndo && (
        <span
          onClick={() => { onUndo(); onDismiss(); }}
          style={{ flexShrink: 0, paddingLeft: 13, borderLeft: "1px solid rgba(255,255,255,0.14)", fontWeight: 700, cursor: "pointer", fontSize: 12.5, whiteSpace: "nowrap", color: actColor }}
        >
          {actLabel}
        </span>
      )}

      {/* 하단 진행 바 (.bar) — pos/warn/neu/welcome만 표시 */}
      {barColor && (
        <span style={{
          position: "absolute", bottom: 0, left: 0,
          height: 2, borderRadius: "0 0 14px 14px",
          background: barColor,
          animation: removing ? "none" : "toastBar 3s linear forwards",
          transformOrigin: "left",
        }} />
      )}

      <style>{`
        @keyframes toastBar { from { width: 100% } to { width: 0% } }
      `}</style>
    </div>
  );
}

/* ── SVG 아이콘 (카탈로그 원본 경로) ──────────────────────────── */

function HeartFilled() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function HeartOutline() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function UserPlus() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  );
}
function UserMinus() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="17" y1="11" x2="23" y2="11"/>
    </svg>
  );
}
function Sparkle() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z"/>
    </svg>
  );
}
function House() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function Trash() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  );
}
function Music() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  );
}
function ListMusic() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="14" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <circle cx="18" cy="18" r="3"/>
      <line x1="18" y1="16.2" x2="18" y2="19.8"/>
      <line x1="16.2" y1="18" x2="19.8" y2="18"/>
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  );
}
