import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { getUid } from "../lib/api";
import { supabase } from "../lib/supabase";
import { ml } from "../lib/ml";

const R = "#FC3C44";
const CIRC = 2 * Math.PI * 14;
const MAX = 280;
const ADMIN_ID = "a44420e9-826b-4b55-ae14-63950e111495";

const GENRES = ["Hip-hop", "R&B", "Pop", "Indie"];

/* ── genre dropdown ── */
function GenreDropdown({ options, selected, onToggle, placeholder }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const fn = e => {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const label = selected.length === 0 ? placeholder : selected.join(", ");

  return (
    <div style={{ position: "relative" }}>
      <button ref={triggerRef} onClick={() => { if (!open) { setRect(triggerRef.current?.getBoundingClientRect()); } setOpen(o => !o); }}
        style={{ all: "unset", boxSizing: "border-box", width: "100%", height: 56, padding: "0 14px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", border: open ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.08)", color: selected.length ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer", transition: "border-color 150ms" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 8, opacity: 0.4, transition: "transform 150ms", transform: open ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && rect && createPortal(<div ref={panelRef} style={{ position: "fixed", top: rect.bottom + 6, left: rect.left, width: rect.width, zIndex: 1100, background: "rgba(22,22,26,0.98)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", maxHeight: 240, overflowY: "auto" }}>
        {options.map(opt => {
          const on = selected.includes(opt);
          return (
            <button key={opt} onClick={() => { onToggle(opt); setOpen(false); }} style={{ all: "unset", boxSizing: "border-box", width: "100%", height: 38, padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "space-between", color: on ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: on ? 600 : 400, cursor: "pointer", background: on ? "rgba(252,60,68,0.08)" : "transparent", transition: "background 100ms" }}
              onMouseEnter={e => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}>
              <span>{opt}</span>
              {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
          );
        })}
      </div>, document.body)}
    </div>
  );
}

/* ── char ring ── */
function Ring({ used }) {
  const pct = Math.min(used / MAX, 1);
  const dash = (pct * CIRC).toFixed(1);
  const left = MAX - used;
  const warn = left <= 40 && left >= 0;
  const over = left < 0;
  return (
    <div style={{ display: "inline-grid", placeItems: "center", width: 34, height: 34, position: "relative" }}>
      <svg width="34" height="34" viewBox="0 0 34 34" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="17" cy="17" r="14" fill="none" strokeWidth="2.5" stroke="rgba(255,255,255,0.1)" />
        <circle cx="17" cy="17" r="14" fill="none" strokeWidth="2.5"
          stroke={over ? "#ef4444" : warn ? "#f59e0b" : R}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          style={{ transition: "stroke-dasharray 120ms" }}
        />
      </svg>
      <span style={{ position: "absolute", fontSize: 9, fontWeight: 700, color: over ? "#ef4444" : warn ? "#f59e0b" : "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>{left}</span>
    </div>
  );
}

/* ── pop/chip panel ── */
function Popover({ title, options, selected, onToggle, onClose, anchorRef }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const pw = ref.current.offsetWidth;
    const ph = ref.current.offsetHeight;
    let left = Math.max(16, r.left);
    if (left + pw > window.innerWidth - 16) left = window.innerWidth - 16 - pw;
    const top = Math.max(16, r.top - ph - 10);
    ref.current.style.left = left + "px";
    ref.current.style.top = top + "px";
  });

  useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target) && !anchorRef?.current?.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose, anchorRef]);

  return (
    <div ref={ref} style={{ position: "fixed", zIndex: 9999, width: 330, maxWidth: "calc(100vw - 32px)", background: "rgba(18,18,20,0.96)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", padding: 16, animation: "popIn 200ms cubic-bezier(0.22,1,0.36,1) both" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(v => {
          const on = selected.includes(v);
          return (
            <button key={v} type="button" onClick={() => onToggle(v)}
              style={{ height: 32, padding: "0 14px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: on ? "#fff" : "rgba(255,255,255,0.06)", border: `1px solid ${on ? "transparent" : "rgba(255,255,255,0.1)"}`, fontSize: 13, fontWeight: on ? 600 : 500, color: on ? "#000" : "rgba(255,255,255,0.7)", cursor: "pointer", fontFamily: "inherit", transition: "all 120ms ease" }}
            >{v}</button>
          );
        })}
      </div>
    </div>
  );
}

function LinkPopover({ link, onSet, onClose, anchorRef }) {
  const [val, setVal] = useState(link ?? "");
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";

  useEffect(() => {
    if (!ref.current || !anchorRef?.current) return;
    const r  = anchorRef.current.getBoundingClientRect();
    const pw = ref.current.offsetWidth;
    const ph = ref.current.offsetHeight;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - pw - 16));
    const top = r.top - ph - 12;
    ref.current.style.left = left + "px";
    ref.current.style.top  = Math.max(16, top) + "px";
  });

  useEffect(() => {
    const fn = e => {
      if (!ref.current?.contains(e.target) && !anchorRef?.current?.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose, anchorRef]);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, []);

  function validUrl(raw) {
    const s = (raw ?? "").trim();
    if (!s || /\s/.test(s)) return false;
    let u;
    try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return false; }
    // 호스트명에 점이 있고 TLD가 2자 이상이어야 유효 (예: example.com)
    return /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname);
  }

  function submit() {
    const trimmed = val.trim();
    if (!trimmed) { onSet(null); onClose(); return; }
    if (!validUrl(trimmed)) return;  // 유효하지 않은 링크/텍스트는 추가하지 않음
    onSet(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    onClose();
  }

  const isValid = validUrl(val);
  let domain = "";
  if (isValid) {
    try { domain = new URL(/^https?:\/\//i.test(val) ? val.trim() : `https://${val.trim()}`).hostname.replace(/^www\./, ""); } catch {}
  }

  return (
    <div ref={ref} style={{ position: "fixed", zIndex: 9999, width: 340, background: "rgba(16,16,18,0.98)", backdropFilter: "blur(28px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.7)", padding: 18, animation: "popIn 200ms cubic-bezier(0.22,1,0.36,1) both" }}>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{ml("k019")}</span>
      </div>

      {/* input */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 14px", background: "rgba(255,255,255,0.06)", border: `1px solid ${focused ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, transition: "border-color 150ms" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <input
          ref={inputRef}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="https://..."
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 14 }}
        />
        {val && (
          <button type="button" onClick={() => { setVal(""); inputRef.current?.focus(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "grid", placeItems: "center", padding: 0, flexShrink: 0, transition: "color 120ms" }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* domain preview / invalid hint */}
      {domain ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/></svg>
          {domain}
        </div>
      ) : val.trim() ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#ff6b6b", display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {lang === "ko" ? "유효하지 않은 링크예요" : "Invalid link"}
        </div>
      ) : null}

      {/* actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {link && (
          <button type="button" onClick={() => { onSet(null); onClose(); }}
            style={{ flex: 1, height: 38, borderRadius: 9, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "border-color 150ms, color 150ms" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
          >{ml("k049")}</button>
        )}
        {(() => {
          const canConfirm = !val.trim() || isValid;
          return (
            <button type="button" onClick={submit} disabled={!canConfirm}
              style={{ flex: 2, height: 38, borderRadius: 9, background: canConfirm ? R : "rgba(255,255,255,0.1)", border: "none", color: canConfirm ? "#fff" : "rgba(255,255,255,0.35)", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, cursor: canConfirm ? "pointer" : "not-allowed", letterSpacing: "-0.01em", transition: "background 150ms" }}
              onMouseEnter={e => { if (canConfirm) e.currentTarget.style.background = "#FF505A"; }}
              onMouseLeave={e => { if (canConfirm) e.currentTarget.style.background = R; }}
            >{ml("k050")}</button>
          );
        })()}
      </div>
    </div>
  );
}

function StatusPopover({ status, onSet, onClose, anchorRef }) {
  const ref = useRef(null);
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  useEffect(() => {
    if (!ref.current || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const pw = ref.current.offsetWidth;
    const ph = ref.current.offsetHeight;
    let left = Math.max(16, r.left);
    if (left + pw > window.innerWidth - 16) left = window.innerWidth - 16 - pw;
    ref.current.style.left = left + "px";
    ref.current.style.top = Math.max(16, r.top - ph - 10) + "px";
  });
  useEffect(() => {
    const fn = e => { if (!ref.current?.contains(e.target) && !anchorRef?.current?.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose, anchorRef]);

  return (
    <div ref={ref} style={{ position: "fixed", zIndex: 9999, width: 300, background: "rgba(18,18,20,0.96)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.6)", padding: 16, animation: "popIn 200ms cubic-bezier(0.22,1,0.36,1) both" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{ml("k051")}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { key: "open",   label: ml("k135") },
          { key: "closed", label: ml("k052") },
        ].map(({ key, label }) => (
          <button key={key} type="button" onClick={() => { onSet(key); onClose(); }}
            style={{ flex: 1, height: 44, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid", transition: "all 160ms", background: status === key ? (key === "open" ? R : "rgba(255,255,255,0.12)") : "rgba(255,255,255,0.04)", borderColor: status === key ? "transparent" : "rgba(255,255,255,0.1)", color: status === key ? "#fff" : "rgba(255,255,255,0.5)" }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor" }} />{label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── tool icon button ── */
function Tool({ title, badge, onClick, btnRef, children }) {
  return (
    <button ref={btnRef} type="button" title={title} onClick={onClick}
      style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: R, cursor: "pointer", position: "relative", background: "transparent", border: "none", transition: "background 140ms" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(252,60,68,0.1)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {children}
      {badge > 0 && (
        <span style={{ position: "absolute", top: 4, right: 4, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 999, background: R, color: "#fff", fontSize: 9, fontWeight: 700, display: "grid", placeItems: "center", fontVariantNumeric: "tabular-nums" }}>{badge}</span>
      )}
    </button>
  );
}

function PhotoPreviewGrid({ images, onRemove }) {
  const n = images.length;
  if (n === 0) return null;
  const gridStyle = {
    display: "grid", gap: 3, borderRadius: 16, overflow: "hidden", marginTop: 12,
    ...(n === 1 && { gridTemplateColumns: "1fr" }),
    ...(n === 2 && { gridTemplateColumns: "1fr 1fr", height: 260 }),
    ...(n === 3 && { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "130px 130px", height: 260 }),
    ...(n >= 4 && { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "130px 130px", height: 260 }),
  };
  return (
    <div style={gridStyle}>
      {images.slice(0, 4).map((img, i) => (
        <div key={i} style={{ position: "relative", overflow: "hidden", gridRow: n === 3 && i === 0 ? "1 / 3" : "auto", ...(n > 1 && { height: n === 2 ? 260 : 130 }), background: n === 1 ? "transparent" : "#0a0a0a" }}>
          <img loading="eager" decoding="async" src={img.url} alt="" style={{ width: "100%", height: n === 1 ? "auto" : "100%", maxHeight: n === 1 ? 480 : undefined, objectFit: n === 1 ? "contain" : "cover", display: "block" }} />
          <button onClick={e => { e.stopPropagation(); onRemove(i); }}
            style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#fff", fontSize: 16, zIndex: 2 }}>×</button>
          {n >= 4 && i === 3 && images.length > 4 && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700, color: "#fff" }}>+{images.length - 4}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewProjectModal({ open, onClose, editData, onSaved, category }) {
  const navigate = useNavigate();
  const { profile } = useApp() ?? {};
  const { showToast } = useToast();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";

  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [media, setMedia]       = useState([]);    // { url, file }
  const [audio, setAudio]       = useState(null);  // { name, file, duration, size }
  const [genres, setGenres]           = useState([]);
  const [link, setLink]               = useState(null);
  const [status, setStatus]           = useState("open");
  const [loading, setLoading]         = useState(false);
  const [pop, setPop]                 = useState(null);  // "genre"|"status"|"link"

  const titleRef   = useRef(null);
  const descRef    = useRef(null);
  const fileRef    = useRef(null);
  const audioRef   = useRef(null);
  const linkRef    = useRef(null);
  const modalRef   = useRef(null);
  const genreRef   = useRef(null);
  const statusRef  = useRef(null);

  const used = title.length + desc.length;
  const isAdmin = profile?.id === ADMIN_ID;
  const canPost = (editData ? true : title.trim().length > 0) && (isAdmin || genres.length > 0) && used <= MAX && !loading;

  // reset on open
  useEffect(() => {
    if (open) {
      if (editData) {
        setTitle(editData.title ?? "");
        setDesc(editData.description ?? editData.text ?? "");
        setGenres(editData.genre ? editData.genre.split(",").map(s => s.trim()).filter(Boolean) : []);
        setLink(editData.link_url ?? editData.linkUrl ?? null);
        if (editData.grid?.length) {
          setMedia(editData.grid.map(u => ({ url: u, file: null })));
        } else {
          const imgRaw = editData.cover_url ?? editData.image_url ?? editData.coverUrl ?? editData.imageUrl ?? null;
          if (imgRaw) {
            try {
              const parsed = JSON.parse(imgRaw);
              setMedia(Array.isArray(parsed) ? parsed.map(u => ({ url: u, file: null })) : [{ url: imgRaw, file: null }]);
            } catch { setMedia([{ url: imgRaw, file: null }]); }
          } else { setMedia([]); }
        }
        const audUrl = editData.audio_url ?? editData.audioUrl ?? null;
        setAudio(audUrl ? {
          name: editData.audio_name ?? editData.audioName ?? "오디오 파일",
          file: null,
          duration: editData.audio_duration ?? editData.audioDuration ?? null,
          size: editData.audio_size ?? editData.audioSize ?? null,
          url: audUrl,
        } : null);
        setStatus("open");
      } else {
        setTitle(""); setDesc(""); setMedia([]);
        setGenres([]); setLink(null); setStatus("open"); setAudio(null);
      }
      setPop(null); setLoading(false);
    }
  }, [open, editData]);

  // contentEditable 내용란 초기 내용 주입 (비제어 요소)
  useEffect(() => {
    if (open && descRef.current) {
      descRef.current.textContent = editData ? (editData.description ?? editData.text ?? "") : "";
    }
  }, [open, editData]);

  // ESC to close + body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const fn = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", fn); };
  }, [open, onClose]);

  function toggleGenre(v) {
    if (genres.includes(v)) { setGenres(g => g.filter(x => x !== v)); return; }
    if (genres.length >= 2) return;
    setGenres(g => [...g, v]);
  }

  function addFiles(files) {
    const imgs = [...files].filter(f => f.type.startsWith("image/"));
    setMedia(prev => {
      const next = [...prev];
      for (const f of imgs) { if (next.length >= 4) break; next.push({ url: URL.createObjectURL(f), file: f }); }
      return next;
    });
  }

  function removeMedia(i) { setMedia(prev => prev.filter((_, idx) => idx !== i)); }

  // drag & drop
  const [dragging, setDragging] = useState(false);
  function onDragEnter(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave(e) { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }
  function onDrop(e) { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }

  async function handlePost() {
    if (!isAdmin && genres.length === 0) { showToast(ml("k069"), "error"); return; }
    const uid = await getUid();
    if (!uid) { showToast(ml("k053"), "error"); return; }
    setLoading(true);
    try {
      // Image — 다중 업로드, JSON 배열로 저장
      let finalImageUrl = null;
      if (media.length > 0) {
        const uploaded = await Promise.all(media.map(async (m) => {
          if (!m.file) return m.url;
          const ext = m.file.name.split(".").pop();
          const path = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("post-images")
            .upload(path, m.file, { contentType: m.file.type, cacheControl: "3600", upsert: false });
          if (upErr) throw upErr;
          return supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
        }));
        finalImageUrl = uploaded.length === 1 ? uploaded[0] : JSON.stringify(uploaded);
        setMedia(uploaded.map(url => ({ url, file: null })));
      }

      // Audio
      let audio_url = null;
      if (audio) {
        if (audio.file) {
          const ext = audio.file.name.split(".").pop();
          const path = `${uid}/${Date.now()}.${ext}`;
          const { error: audErr } = await supabase.storage
            .from("post-audio")
            .upload(path, audio.file, { contentType: audio.file.type, upsert: false });
          if (!audErr) audio_url = supabase.storage.from("post-audio").getPublicUrl(path).data.publicUrl;
        } else if (audio.url) {
          audio_url = audio.url;
        }
      }

      const updatedFields = {
        title: title.trim(),
        description: desc.trim() || null,
        genre: genres.join(", "),
        image_url: finalImageUrl,
        audio_url: audio_url ?? null,
        audio_name: audio?.name ?? null,
        audio_duration: audio?.duration ?? null,
        audio_size: audio?.size ?? null,
        link_url: link ?? null,
      };

      if (editData?.id) {
        const { error } = await supabase.from("posts").update(updatedFields).eq("id", String(editData.id));
        if (error) throw new Error(`Update failed: ${error.message}`);
        const { data: fresh } = await supabase
          .from("posts")
          .select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)")
          .eq("id", String(editData.id))
          .single();
        showToast(ml("k054"), "success");
        onClose();
        onSaved?.(fresh);
      } else {
        const { data, error } = await supabase.from("posts").insert({
          author_id: uid,
          category: category ?? null,
          ...updatedFields,
        }).select().single();
        if (error) throw error;
        const uploadedId = data.id;
        showToast(ml("k055"), "success", async () => {
          await supabase.from("posts").delete().eq("id", uploadedId);
          showToast(ml("k056"), "info");
        });
        onClose();
        navigate(`/post/${uploadedId}`);
      }
    } catch (err) {
      console.error(err);
      if (err?.message?.includes("row-level security")) {
        showToast("로그인 후 업로드 해주세요.", "error");
      } else {
        showToast(err?.message || "업로드 실패", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes popIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes sheetIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        .npm-body::-webkit-scrollbar{display:none;}
        .npm-desc:empty:before{content:attr(data-placeholder);color:rgba(255,255,255,0.3);pointer-events:none;}
      `}</style>

      {/* backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />

      {/* sheet */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1001, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "90px 24px 80px", pointerEvents: "none" }}>
        <div ref={modalRef} style={{ width: "100%", maxWidth: 640, maxHeight: "calc(100vh - 170px)", display: "flex", flexDirection: "column", background: "rgba(14,14,16,0.96)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, boxShadow: "0 40px 100px rgba(0,0,0,0.7)", overflow: "hidden", animation: "sheetIn 280ms cubic-bezier(0.22,1,0.36,1) both", pointerEvents: "all" }}>

          {/* header */}
          <header style={{ display: "flex", alignItems: "center", gap: 12, height: 76, padding: "0 12px 0 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", position: "sticky", top: 0, zIndex: 3, background: "rgba(14,14,16,0.95)", backdropFilter: "blur(20px)" }}>
            <button type="button" onClick={onClose} style={{ height: 40, padding: "0 8px", display: "inline-flex", alignItems: "center", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500, cursor: "pointer", borderRadius: 8, background: "none", border: "none", fontFamily: "inherit", transition: "color 120ms" }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
            >{ml("k005")}</button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff" }}>{editData ? "Edit Post" : "New Post"}</div>
            </div>
            <button type="button" onClick={handlePost} disabled={!canPost}
              style={{ height: 40, padding: "0 20px", borderRadius: 999, background: canPost ? R : "rgba(255,255,255,0.08)", color: canPost ? "#fff" : "rgba(255,255,255,0.25)", fontSize: 13.5, fontWeight: 700, cursor: canPost ? "pointer" : "not-allowed", border: "none", fontFamily: "inherit", letterSpacing: "-0.01em", transition: "background 160ms, color 160ms, transform 100ms" }}
              onMouseEnter={e => { if (canPost) e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >{loading ? (editData ? (ml("k059")) : (ml("k020"))) : (editData ? (ml("k060")) : (ml("k021")))}</button>
          </header>

          {/* body */}
          <div
            onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={e => e.preventDefault()} onDrop={onDrop}
            className="npm-body"
            style={{ flex: 1, minHeight: 0, overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none", padding: "22px 22px 0", outline: dragging ? `2px dashed ${R}` : "none", outlineOffset: -10, borderRadius: 20 }}
          >
            {/* author */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", overflow: "hidden", background: "linear-gradient(135deg,#fc3c44,#7c0a12)", fontSize: 15, fontWeight: 900, color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)" }}>
                {profile?.avatar_url
                  ? <img loading="eager" decoding="async" src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (profile?.username?.[0]?.toUpperCase() ?? "나")}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff" }}>{profile?.username ?? "아티스트"}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                  {profile?.handle ? `@${profile.handle}` : ""}
                </div>
              </div>
            </div>

            {/* title input */}
            <textarea
              ref={titleRef}
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (titleRef.current) { titleRef.current.style.height = "auto"; titleRef.current.style.height = titleRef.current.scrollHeight + "px"; }
              }}
              maxLength={60}
              rows={1}
              placeholder={ml("k022")}
              style={{ width: "100%", background: "transparent", border: 0, outline: 0, color: "#fff", fontFamily: "inherit", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3, padding: "2px 0 6px", resize: "none", overflow: "hidden" }}
            />

            {/* desc (contentEditable) + 본문 안 인라인 링크 칩 */}
            <div onClick={e => { if (e.target === e.currentTarget) descRef.current?.focus(); }}
              style={{ marginTop: 12, fontSize: 19, fontWeight: 400, lineHeight: 1.65, minHeight: 48, color: "rgba(255,255,255,0.65)", cursor: "text" }}>
              <span
                ref={descRef}
                className="npm-desc"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={ml("k023")}
                onInput={e => setDesc(e.currentTarget.textContent)}
                style={{ outline: "none", whiteSpace: "pre-wrap", wordBreak: "break-word", caretColor: "#fff", display: "inline-block", minWidth: 2, verticalAlign: "top" }}
              />
              {link && " "}
              {link && (() => {
                let domain = link;
                try { domain = new URL(link).hostname.replace(/^www\./, ""); } catch {}
                const FAV_COLORS = ["#2463EB", "#1DB954", "#FF2E88", "#F5854D", "#7C3AED", "#0EA5E9"];
                const ch = (domain[0] ?? "?").toUpperCase();
                const color = FAV_COLORS[domain.length % FAV_COLORS.length];
                return (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 12px 0 10px", borderRadius: 999, background: "#161618", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", maxWidth: "100%", verticalAlign: "middle" }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, flex: "none", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: "#fff", background: color }}>{ch}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{domain}</span>
                    <button type="button" onClick={() => setLink(null)}
                      style={{ all: "unset", cursor: "pointer", flex: "none", width: 20, height: 20, borderRadius: 999, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.44)", transition: "background .2s, color .2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.44)"; }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ width: 13, height: 13 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                );
              })()}
            </div>

            {/* media grid */}
            <PhotoPreviewGrid images={media} onRemove={removeMedia} />

            {/* ── 장르 + 음원 ── */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", marginBottom: 10 }}>{ml("k003")}</div>
                <GenreDropdown options={GENRES} selected={genres} onToggle={toggleGenre} placeholder={t("upload.genrePlaceholder")} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", marginBottom: 10 }}>{ml("k024")}</div>
                {audio ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, height: 56, padding: "0 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <input
                          value={audio.name}
                          onChange={e => setAudio(a => ({ ...a, name: e.target.value }))}
                          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: 12.5, fontWeight: 600, color: "#fff", fontFamily: "inherit", padding: 0 }}
                        />
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      </div>
                      {audio.duration != null && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{Math.floor(audio.duration / 60)}:{String(audio.duration % 60).padStart(2, "0")}</div>}
                    </div>
                    <button type="button" onClick={() => setAudio(null)} style={{ all: "unset", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "grid", placeItems: "center" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ) : (
                  <div onClick={() => audioRef.current?.click()}
                    style={{ display: "flex", alignItems: "center", gap: 10, height: 56, padding: "0 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", transition: "border-color 150ms, background 150ms" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)"><path d="M12 3v11.26A3.5 3.5 0 1 0 14 17V8h4.5V3H12z"/></svg>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{t("upload.audioPlaceholder")}</span>
                  </div>
                )}
              </div>
            </div>




            {/* toolbar */}
            <footer style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 16px", marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)", position: "sticky", bottom: 0, background: "rgba(14,14,16,0.95)", backdropFilter: "blur(20px)", marginLeft: -22, marginRight: -22, paddingLeft: 22, paddingRight: 22 }}>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files); fileRef.current.value = ""; }} />
              <input ref={audioRef} type="file" accept="audio/*" hidden onChange={e => {
  const f = e.target.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  const tmp = new window.Audio();
  tmp.src = url;
  tmp.onloadedmetadata = () => {
    setAudio({ name: f.name, file: f, duration: Math.round(tmp.duration), size: f.size });
    URL.revokeObjectURL(url);
  };
  tmp.onerror = () => { setAudio({ name: f.name, file: f, duration: null, size: f.size }); URL.revokeObjectURL(url); };
  audioRef.current.value = "";
}} />

              <Tool title={ml("k061")} badge={media.length} onClick={() => fileRef.current?.click()}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>
              </Tool>
              <Tool title={ml("k062")} badge={audio ? 1 : 0} onClick={() => audioRef.current?.click()}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v11.26A3.5 3.5 0 1 0 14 17V8h4.5V3H12z"/></svg>
              </Tool>
              <Tool title={ml("k019")} badge={link ? 1 : 0} btnRef={linkRef} onClick={() => setPop(p => p === "link" ? null : "link")}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </Tool>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: used > MAX ? "#ef4444" : (MAX - used) <= 40 ? "#f59e0b" : "rgba(255,255,255,0.5)", marginRight: 10 }}>
                {used}/{MAX}
              </span>
              <Ring used={used} />
            </footer>
          </div>
        </div>
      </div>

      {/* popovers */}
      {pop === "link" && (
        <LinkPopover link={link} onSet={setLink} onClose={() => setPop(null)} anchorRef={linkRef} />
      )}
    </>
  );
}
