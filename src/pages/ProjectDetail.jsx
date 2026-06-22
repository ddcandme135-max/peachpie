import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import ShareModal from "../components/ShareModal";
import { CDPlayer } from "./CollabFeed";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useApp } from "../context/AppContext";
import { usePlayer } from "../context/PlayerContext";
import { useLang } from "../context/LangContext";
import { ml } from "../lib/ml";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";

const POSITION_MAP = {
  "보컬": "VOCAL", "프로듀서": "PRODUCER", "기타": "GUITAR", "베이스": "BASS",
  "키보드": "KEYBOARD", "바이올린": "VIOLIN", "믹싱&마스터링": "MIXING/MASTERING",
  "믹싱 & 마스터링": "MIXING/MASTERING", "레코딩": "RECORDING", "비트메이커": "BEAT MAKER",
  "작사&작곡": "LYRICS", "작사 & 작곡": "LYRICS", "피처링": "FEATURING", "세션": "SESSION", "드럼": "DRUMS",
};
function toEnPosition(pos) { if (!pos) return pos; return POSITION_MAP[pos.trim()] ?? pos; }

const AV_COLORS = ["#0369a1","#7c3aed","#be185d","#16a34a","#b45309","#4c1d95","#0891b2","#9333ea"];

function mapTrack(t) {
  return {
    ...t,
    title:       t.title ?? "",
    description: t.description ?? "",
    position:    t.position ?? "",
    genres:      t.genre ? [t.genre] : [],
    author:      t.profiles?.username ?? "아티스트",
    letter:      (t.profiles?.username?.[0] ?? "A").toUpperCase(),
    avatarUrl:   t.profiles?.avatar_url ?? null,
    avBg:        "#7c3aed",
    time:        t.created_at ?? null,
    deadline:    t.deadline ?? null,
  };
}

function mapComment(row, myId, postAuthorId, i) {
  const username = row.profiles?.username ?? "알 수 없음";
  return {
    id:        row.id,
    authorId:  row.author_id,
    isMe:      row.author_id === myId,
    isOwner:   row.author_id === postAuthorId,
    parentId:  row.parent_id ?? null,
    letter:    username[0]?.toUpperCase() ?? "?",
    avBg:      AV_COLORS[i % AV_COLORS.length],
    author:    username,
    avatarUrl: row.profiles?.avatar_url ?? null,
    text:      row.content,
    time:      row.created_at,
    createdAt: row.created_at,
    likes:     0,
    liked:     false,
  };
}

function sortNewest(arr) {
  return [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function TrackWaveSeek({ progress = 0, isActive = false, onSeek }) {
  const bars = useMemo(() => Array.from({ length: 52 }, (_, i) => {
    const t = i / 52;
    return Math.min(100, 12 + Math.abs(Math.sin(t * Math.PI * 7 + 1)) * 58 + Math.abs(Math.sin(t * Math.PI * 17)) * 22);
  }), []);

  const ref = useRef(null);
  const dragging = useRef(false);

  function getPos(clientX) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function handleMouseDown(e) {
    e.preventDefault();
    dragging.current = true;
    onSeek?.(getPos(e.clientX));
    function onMove(e) { if (dragging.current) onSeek?.(getPos(e.clientX)); }
    function onUp() { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div ref={ref} onMouseDown={handleMouseDown}
      style={{ flex: 1, height: 32, cursor: "pointer", display: "flex", alignItems: "center", gap: 1.5, userSelect: "none" }}>
      {bars.map((h, i) => {
        const pct = i / bars.length;
        const played = !isActive || pct < progress;
        return (
          <div key={i} style={{
            flex: 1, borderRadius: 2, minWidth: 2,
            height: `${h}%`,
            background: `linear-gradient(180deg, #FC3C44 0%, #ff2e88 100%)`,
            opacity: played ? 1 : 0.15,
            transition: "opacity 60ms",
          }} />
        );
      })}
    </div>
  );
}

function PositionIcon({ position = "" }) {
  const p = position.toLowerCase();
  if (p.includes("vocal") || p.includes("보컬")) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
    </svg>
  );
  if (p.includes("mix") || p.includes("master") || p.includes("믹싱")) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  );
  if (p.includes("guitar") || p.includes("bass") || p.includes("기타") || p.includes("베이스")) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1 1 2.4 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  );
}

const HeartIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

function ReplyItem({ r, onDelete, onEdit }) {
  const [hov, setHov]           = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(r.text);
  const navigate = useNavigate();
  const menuRef  = useRef(null);
  const { t, i18n } = useTranslation();

  function getTimeAgo(isoString) {
    if (!isoString) return "";
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return "";
    const diff = Date.now() - dt.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("time.justNow");
    if (min < 60) return t("time.minutesAgo", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t("time.hoursAgo", { n: h });
    const d = Math.floor(h / 24);
    if (d === 1) return t("time.yesterday");
    if (d < 7) return t("time.daysAgo", { n: d });
    return new Intl.DateTimeFormat(i18n.language, { month: "long", day: "numeric" }).format(dt);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const fn = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [menuOpen]);

  function submitEdit() {
    const t = editText.trim();
    if (t) onEdit(r.id, t);
    setEditing(false);
  }

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div onClick={() => !r.isMe && r.authorId && navigate(`/profile/${r.authorId}`)}
        style={{ width: 32, height: 32, borderRadius: "50%", background: r.avBg, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#fff", cursor: r.isMe ? "default" : "pointer", overflow: "hidden" }}>
        {r.avatarUrl ? <img loading="eager" decoding="async" src={r.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : r.letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span onClick={() => !r.isMe && r.authorId && navigate(`/profile/${r.authorId}`)}
            style={{ fontSize: 13, fontWeight: 700, color: "#fff", cursor: r.isMe ? "default" : "pointer" }}
            onMouseEnter={e => { if (!r.isMe) e.currentTarget.style.textDecoration = "underline"; }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}>{r.author}</span>
          {r.isOwner && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#FC3C44", background: "rgba(252,60,68,0.2)", padding: "2px 7px", borderRadius: 5, letterSpacing: "0.04em" }}>OWNER</span>}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{getTimeAgo(r.time)}</span>
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submitEdit(); if (e.key === "Escape") setEditing(false); }} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
            <button onClick={submitEdit} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, background: "#fff", color: "#000", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.save")}</button>
            <button onClick={() => { setEditing(false); setEditText(r.text); }} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.cancel")}</button>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.5, margin: 0 }}>{r.text}</p>
        )}
      </div>
      {r.isMe && (
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0, alignSelf: "flex-start" }}>
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: menuOpen ? "rgba(255,255,255,0.08)" : "none", border: "none", cursor: "pointer", color: hov || menuOpen ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", transition: "color 120ms, background 120ms" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: 34, zIndex: 50, background: "#161622", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", minWidth: 96, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
              <button onClick={() => { setEditing(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#fff", fontSize: 13, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "none"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>{t("comment.edit")}</button>
              <button onClick={() => { onDelete(r.id); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#FC3C44", fontSize: 13, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(252,60,68,0.08)"} onMouseLeave={e => e.currentTarget.style.background = "none"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>{t("comment.delete")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommentItem({ c, replies = [], onLike, onDelete, onEdit, onReply, currentUser, currentUserAvatar }) {
  const [hov, setHov]                       = useState(false);
  const [menuOpen, setMenuOpen]             = useState(false);
  const [editing, setEditing]               = useState(false);
  const [editText, setEditText]             = useState(c.text);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText]           = useState("");
  const [showReplies, setShowReplies]       = useState(false);
  const navigate = useNavigate();
  const menuRef  = useRef(null);
  const { t, i18n } = useTranslation();
  const replyRef = useRef(null);
  const isMe = !!c.isMe;

  function getTimeAgo(isoString) {
    if (!isoString) return "";
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return "";
    const diff = Date.now() - dt.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("time.justNow");
    if (min < 60) return t("time.minutesAgo", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t("time.hoursAgo", { n: h });
    const d = Math.floor(h / 24);
    if (d === 1) return t("time.yesterday");
    if (d < 7) return t("time.daysAgo", { n: d });
    return new Intl.DateTimeFormat(i18n.language, { month: "long", day: "numeric" }).format(dt);
  }

  function goProfile() { if (!isMe && c.authorId) navigate(`/profile/${c.authorId}`); }

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => { if (showReplyInput) replyRef.current?.focus(); }, [showReplyInput]);

  function submitEdit() {
    const t = editText.trim();
    if (t) onEdit(c.id, t);
    setEditing(false);
  }

  function handleReply() { setReplyText(`@${c.author} `); setShowReplyInput(true); }

  async function submitReply() {
    const t = replyText.trim();
    if (!t) return;
    await onReply(c.id, t);
    setReplyText(""); setShowReplyInput(false); setShowReplies(true);
  }

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ display: "flex", gap: 16, padding: "20px 16px", borderRadius: 14, background: hov ? "rgba(255,255,255,0.03)" : "transparent", transition: "background 120ms" }}
      >
        <div onClick={goProfile} style={{ width: 42, height: 42, borderRadius: "50%", background: c.avBg, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700, color: "#fff", cursor: isMe ? "default" : "pointer", overflow: "hidden" }}>
          {c.avatarUrl ? <img loading="eager" decoding="async" src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : c.letter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span onClick={goProfile} style={{ fontSize: 14, fontWeight: 700, color: "#fff", cursor: isMe ? "default" : "pointer" }} onMouseEnter={e => { if (!isMe) e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}>{c.author}</span>
            {c.isOwner && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#FC3C44", background: "rgba(252,60,68,0.2)", padding: "2px 7px", borderRadius: 5, letterSpacing: "0.04em" }}>OWNER</span>}
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{getTimeAgo(c.time)}</span>
          </div>
          {editing ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submitEdit(); if (e.key === "Escape") setEditing(false); }} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none" }} />
              <button onClick={submitEdit} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, background: "#fff", color: "#000", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.save")}</button>
              <button onClick={() => { setEditing(false); setEditText(c.text); }} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.cancel")}</button>
            </div>
          ) : (
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: 0 }}>{c.text}</p>
          )}
          {currentUser && !editing && (
            <button onClick={handleReply} style={{ marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color 120ms" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>{t("comment.reply")}</button>
          )}
        </div>
        {isMe ? (
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0, alignSelf: "flex-start", marginTop: 2 }}>
            <button onClick={() => setMenuOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: menuOpen ? "rgba(255,255,255,0.08)" : "none", border: "none", cursor: "pointer", color: hov || menuOpen ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", transition: "color 120ms, background 120ms" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            </button>
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: 40, zIndex: 50, background: "#161622", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", minWidth: 96, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                <button onClick={() => { setEditing(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#fff", fontSize: 13, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"} onMouseLeave={e => e.currentTarget.style.background = "none"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>{t("comment.edit")}</button>
                <button onClick={() => { onDelete(c.id); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#FC3C44", fontSize: 13, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(252,60,68,0.08)"} onMouseLeave={e => e.currentTarget.style.background = "none"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>{t("comment.delete")}</button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => onLike(c.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", flexShrink: 0, color: c.liked ? "#f472b6" : hov ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)", transition: "color 120ms", padding: "2px 6px" }}>
            <HeartIcon filled={c.liked} />
            <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{c.likes}</span>
          </button>
        )}
      </div>

      {showReplyInput && (
        <div style={{ paddingLeft: 58, paddingRight: 16, paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: currentUserAvatar ? "#000" : "#FC3C44", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
              {currentUserAvatar ? <img loading="eager" decoding="async" src={currentUserAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "나"}
            </div>
            <input ref={replyRef} value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submitReply(); if (e.key === "Escape") setShowReplyInput(false); }} placeholder={`@${c.author}${t("comment.replyTo")}`} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 13 }} />
            <button onClick={() => setShowReplyInput(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.cancel")}</button>
            <button onClick={submitReply} style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "50%", background: replyText.trim() ? "#fff" : "rgba(255,255,255,0.08)", border: "none", cursor: replyText.trim() ? "pointer" : "default", color: replyText.trim() ? "#000" : "rgba(255,255,255,0.25)", transition: "all 150ms", flexShrink: 0 }}>
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div style={{ paddingLeft: 58, paddingRight: 16, paddingBottom: 8 }}>
          <button onClick={() => setShowReplies(v => !v)} style={{ background: "none", border: "none", color: "#FC3C44", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "4px 0", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showReplies ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}><polyline points="6 9 12 15 18 9"/></svg>
            {t("comment.reply")} {replies.length}{i18n.language.startsWith("ko") ? "개" : ""} {showReplies ? t("comment.fold") : t("comment.view")}
          </button>
          {showReplies && (
            <div style={{ marginTop: 8 }}>
              {replies.map(r => (
                <ReplyItem key={r.id} r={r} onDelete={onDelete} onEdit={onEdit} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TrackListRow({ t, idx, isPlaying, onToggle }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 8px", borderRadius: 8, cursor: "pointer",
        background: hov ? "rgba(255,255,255,0.06)" : "transparent",
        transition: "background 120ms",
      }}
    >
      <div style={{ width: 20, flexShrink: 0, display: "grid", placeItems: "center" }}>
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(252,60,68,1)">
            <rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 600, color: hov ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>
            {String(idx + 1).padStart(2, "0")}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isPlaying ? "#FC3C44" : "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 120ms" }}>{t.title}</div>
      </div>
      {t.duration && (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{t.duration}</div>
      )}
    </div>
  );
}

export default function ProjectDetail({ previewMode = false, projectId: propProjectId, previewData } = {}) {
  const { id: paramId } = useParams();
  const trackId = propProjectId ?? paramId;
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const { showToast } = useToast();
  const { profile: appProfile, session } = useApp();
  const { togglePlay } = usePlayer();
  const { lang } = useLang();
  const { t, i18n } = useTranslation();

  function getTimeAgo(isoString) {
    if (!isoString) return "";
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return "";
    const diff = Date.now() - dt.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("time.justNow");
    if (min < 60) return t("time.minutesAgo", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t("time.hoursAgo", { n: h });
    const d = Math.floor(h / 24);
    if (d === 1) return t("time.yesterday");
    if (d < 7) return t("time.daysAgo", { n: d });
    return new Intl.DateTimeFormat(i18n.language, { month: "long", day: "numeric" }).format(dt);
  }
  const currentUser = session?.user ?? null;
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [track, setTrack] = useState(navState?.project ?? null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const currentUserAvatar = appProfile?.avatar_url ?? null;
  const [input, setInput] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [tracks, setTracks] = useState([]);
  const [localPlayingId, setLocalPlayingId] = useState(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [fbTab, setFbTab]   = useState("bug");
  const [fbText, setFbText] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbScreenshot, setFbScreenshot]           = useState(null);
  const [fbScreenshotPreview, setFbScreenshotPreview] = useState(null);
  const fbFileRef = useRef(null);
  const localAudioRef    = useRef(new Audio());
  const isComposing      = useRef(false);
  const currentUserRef   = useRef(null);
  const sendingRef       = useRef(false);
  const ownerAuthorIdRef = useRef(null);
  const pad = isOpen ? 240 : 116;

  const deadline = track?.deadline ?? null;
  const daysLeft = deadline ? Math.ceil((new Date(deadline) - Date.now()) / 86400000) : null;
  const deadlineBadge = daysLeft === null ? null : daysLeft < 0 ? "마감" : `D-${daysLeft}`;

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser?.id]);

  useEffect(() => {
    if (previewMode) return;
    setTrack(null);
    setComments([]);
    setLiked(false);
    setLikeCount(0);
    setTracks([]);
  }, [trackId]);

  useEffect(() => {
    return () => {
      localAudioRef.current.pause();
      localAudioRef.current.src = "";
    };
  }, []);

  // previewData → track (live, no Supabase)
  useEffect(() => {
    if (!previewMode || !previewData) return;
    setTrack(mapTrack({
      title:       previewData.name        ?? "",
      description: previewData.description ?? "",
      genre:       previewData.genre       ?? "",
      position:    previewData.position    ?? "",
      cover_url:   previewData.cover       ?? null,
      profiles:    appProfile ? { username: appProfile.username ?? null, avatar_url: appProfile.avatar_url ?? null } : null,
      created_at:  null,
      deadline:    null,
    }));
  }, [previewMode, previewData?.name, previewData?.description, previewData?.genre, previewData?.position, previewData?.cover, appProfile?.username, appProfile?.avatar_url]);

  useEffect(() => {
    if (previewMode || !trackId) return;
    (async () => {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title, position, genre, cover_url, author_id, created_at")
        .neq("id", trackId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!projectsData?.length) return;
      const authorIds = [...new Set(projectsData.map(p => p.author_id).filter(Boolean))];
      const { data: profilesData } = authorIds.length
        ? await supabase.from("profiles").select("id, username").in("id", authorIds)
        : { data: [] };
      const profileMap = {};
      profilesData?.forEach(p => { profileMap[p.id] = p; });
      setRelatedProjects(projectsData.map(p => ({
        ...p,
        author: profileMap[p.author_id]?.username ?? "아티스트",
      })));
    })();
  }, [trackId]);

  async function handleFbSubmit() {
    if (!fbText.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    let screenshotUrl = null;
    if (fbScreenshot) {
      const ext = fbScreenshot.name.split(".").pop();
      const path = `${Date.now()}_${session?.user?.id ?? "anon"}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("feedback-screenshots")
        .upload(path, fbScreenshot, { contentType: fbScreenshot.type });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("feedback-screenshots").getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }
    }
    await supabase.from("reports").insert({
      type: "feedback",
      category: fbTab,
      content: fbText.trim(),
      target_type: "project",
      target_id: String(trackId ?? ""),
      reporter_id: session?.user?.id ?? null,
      screenshot_url: screenshotUrl,
    });
    setFbSent(true);
    setFbText("");
    setFbScreenshot(null);
    setFbScreenshotPreview(null);
    setTimeout(() => setFbSent(false), 1800);
  }

  async function handleReport() {
    if (!currentUser) {
      showToast(ml("k040"), "error");
      return;
    }
    await supabase.from("reports").insert({
      type: "report",
      target_type: "project",
      target_id: String(trackId ?? ""),
      reporter_id: currentUser.id,
    });
    showToast(ml("k041"), "warn", undefined, "flag");
  }

  function toggleLocalTrack(audioUrl, trackId) {
    const audio = localAudioRef.current;
    if (localPlayingId === trackId) {
      if (localIsPlaying) { audio.pause(); setLocalIsPlaying(false); }
      else { audio.play(); setLocalIsPlaying(true); }
      return;
    }
    togglePlay();
    audio.src = audioUrl;
    audio.play().catch(() => {});
    setLocalPlayingId(trackId);
    setLocalIsPlaying(true);
    setLocalProgress(0);
    audio.ontimeupdate = () => {
      if (audio.duration > 0) setLocalProgress(audio.currentTime / audio.duration);
    };
    audio.onended = () => { setLocalIsPlaying(false); setLocalProgress(0); };
  }

  function seekLocalTrack(pct) {
    const audio = localAudioRef.current;
    if (audio.duration > 0) audio.currentTime = pct * audio.duration;
    setLocalProgress(pct);
  }


  async function toggleLike() {
    if (!currentUser || !trackId) return;
    if (liked) {
      setLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
      await supabase.from("likes").delete().eq("project_id", trackId).eq("user_id", currentUser.id);
      showToast(ml("k007"), "info", async () => {
        setLiked(true);
        setLikeCount(prev => prev + 1);
        await supabase.from("likes").insert({ user_id: currentUser.id, project_id: trackId });
      }, "heart-off");
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
      showToast(ml("k017"), "success", async () => {
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
        await supabase.from("likes").delete().eq("project_id", trackId).eq("user_id", currentUser.id);
        showToast(ml("k007"), "info", undefined, "heart-off");
      }, "heart");
      await supabase.from("likes").insert({ user_id: currentUser.id, project_id: trackId });
    }
  }

  useEffect(() => {
    if (previewMode || !trackId) return;
    let mounted = true;
    Promise.allSettled([
      supabase.from("projects").select("*, profiles(id, username, avatar_url)").eq("id", trackId).maybeSingle(),
      supabase.from("likes").select("*", { count: "exact", head: true }).eq("project_id", trackId),
      currentUser
        ? supabase.from("likes").select("id").eq("project_id", trackId).eq("user_id", currentUser.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("tracks").select("id, title, artist, cover_url, audio_url, duration, profiles!tracks_author_id_fkey(username)").eq("type", "song").order("created_at", { ascending: false }).limit(60),
    ]).then(([project, likesCount, myLike, tracks]) => {
      if (!mounted) return;
      if (project.status === "fulfilled" && project.value.data) {
        const { data } = project.value;
        setTrack(prev => mapTrack({ ...(prev ?? {}), ...data, profiles: data.profiles ?? null }));
      } else if (project.status === "fulfilled" && !project.value.data) {
        // projects에 없는 id → posts 상세로 폴백
        navigate(`/post/${trackId}`, { replace: true });
      }
      if (likesCount.status === "fulfilled") setLikeCount(likesCount.value.count ?? 0);
      if (myLike.status === "fulfilled") setLiked(!!myLike.value.data);
      if (tracks.status === "fulfilled") setTracks(tracks.value.data ?? []);
    });
    return () => { mounted = false; };
  }, [trackId, currentUser?.id]);

  useEffect(() => {
    if (previewMode) { setCommentsLoading(false); return; }
    if (!trackId) { setCommentsLoading(false); return; }
    let mounted = true;

    async function loadComments() {
      const { data: { session: s } } = await supabase.auth.getSession();
      const myId = s?.user?.id ?? null;
      const [{ data: postData }, { data, error }] = await Promise.all([
        supabase.from("projects").select("author_id").eq("id", trackId).maybeSingle(),
        supabase.from("comments")
          .select("id, parent_id, author_id, content, created_at, profiles(username, avatar_url)")
          .eq("project_id", trackId)
          .order("created_at", { ascending: true }),
      ]);
      if (!mounted) return;
      const ownerAuthorId = postData?.author_id ?? null;
      ownerAuthorIdRef.current = ownerAuthorId;
      if (!error && data) setComments(sortNewest(data.map((row, i) => mapComment(row, myId, ownerAuthorId, i))));
      setCommentsLoading(false);
    }

    loadComments();

    const channel = supabase
      .channel(`comments:project:${trackId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `project_id=eq.${trackId}` },
        async (payload) => {
          if (!mounted) return;
          if (currentUserRef.current?.id && payload.new.author_id === currentUserRef.current.id) return;
          const { data: row } = await supabase
            .from("comments")
            .select("id, parent_id, author_id, content, created_at, profiles(username, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          if (!row || !mounted) return;
          const myId = currentUserRef.current?.id ?? null;
          setComments(prev => {
            if (prev.some(c => c.id === row.id)) return prev;
            return sortNewest([...prev, mapComment(row, myId, ownerAuthorIdRef.current, prev.length)]);
          });
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "comments", filter: `project_id=eq.${trackId}` },
        (payload) => {
          if (!mounted) return;
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "comments", filter: `project_id=eq.${trackId}` },
        (payload) => {
          if (!mounted) return;
          setComments(prev => prev.map(c =>
            c.id === payload.new.id ? { ...c, text: payload.new.content } : c
          ));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [trackId]);

  function likeComment(id) {
    setComments(prev => prev.map(c =>
      c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c
    ));
  }

  async function deleteComment(id) {
    setComments(prev => prev.filter(c => c.id !== id));
    await supabase.from("comments").delete().eq("id", id);
  }

  async function editComment(id, text) {
    setComments(prev => prev.map(c => c.id === id ? { ...c, text } : c));
    await supabase.from("comments").update({ content: text }).eq("id", id);
  }

  async function sendComment() {
    const text = input.trim();
    if (!text || !currentUser || !trackId || sendingRef.current) return;
    sendingRef.current = true;
    setInput("");
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ author_id: currentUser.id, project_id: trackId, content: text })
        .select("id, parent_id, author_id, content, created_at, profiles(username, avatar_url)")
        .single();
      if (!error && data) {
        setComments(prev => {
          if (prev.some(c => c.id === data.id)) return prev;
          return sortNewest([...prev, mapComment(data, currentUser.id, ownerAuthorIdRef.current, prev.length)]);
        });
      }
    } finally {
      sendingRef.current = false;
    }
  }

  async function sendReply(parentId, text) {
    if (!text || !currentUser || !trackId || sendingRef.current) return;
    sendingRef.current = true;
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ author_id: currentUser.id, project_id: trackId, content: text, parent_id: parentId })
        .select("id, parent_id, author_id, content, created_at, profiles(username, avatar_url)")
        .single();
      if (!error && data) {
        setComments(prev => {
          if (prev.some(c => c.id === data.id)) return prev;
          return sortNewest([...prev, mapComment(data, currentUser.id, ownerAuthorIdRef.current, prev.length)]);
        });
      }
    } finally {
      sendingRef.current = false;
    }
  }

  const topLevel = comments.filter(c => !c.parentId);
  const repliesMap = {};
  comments.filter(c => c.parentId).forEach(r => {
    if (!repliesMap[r.parentId]) repliesMap[r.parentId] = [];
    repliesMap[r.parentId].push(r);
  });

  if (!track && !previewMode) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #FC3C44", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <>
    <div style={{ minHeight: "100vh", background: "#000000", overflowX: "auto" }}>
      <style>{`@keyframes pd-pulse{0%,100%{opacity:1}50%{opacity:.35}} @keyframes recs-pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>


      {!previewMode && <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />}

      <main style={{
        position: "relative", zIndex: 1,
        paddingLeft: previewMode ? 32 : pad, paddingRight: 0,
        paddingTop: 0, paddingBottom: 80,
        transition: `padding-left ${DURATION} ${EASE}`,
        minWidth: previewMode ? "unset" : 900,
      }}>

        <div style={{ display: "grid", gridTemplateColumns: previewMode ? "1fr" : "1fr 400px", gap: 32, alignItems: "stretch", transition: `grid-template-columns ${DURATION} ${EASE}` }}>
        <div>

        {/* ── Back bar ── */}
        {!previewMode && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 0 28px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "8px 10px", borderRadius: 8, transition: "background 120ms, color 120ms" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            {t("project.backToList")}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={toggleLike} style={{ width: 36, height: 36, borderRadius: 10, background: liked ? "rgba(252,60,68,0.14)" : "rgba(255,255,255,0.05)", border: liked ? "1px solid rgba(252,60,68,0.3)" : "1px solid rgba(255,255,255,0.06)", color: liked ? "#FC3C44" : "#fff", display: "grid", placeItems: "center", cursor: currentUser ? "pointer" : "default", transition: "background 120ms, border-color 120ms" }}
              onMouseEnter={e => { if (currentUser) e.currentTarget.style.background = liked ? "rgba(252,60,68,0.22)" : "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = liked ? "rgba(252,60,68,0.14)" : "rgba(255,255,255,0.05)"; }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button onClick={() => setShareOpen(true)} style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", transition: "background 120ms" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button onClick={handleReport} title="신고하기" style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", display: "grid", placeItems: "center", cursor: "pointer", transition: "background 120ms, color 120ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </button>
          </div>
        </div>}

        {/* ── Hero meta ── */}
        <div style={{ maxWidth: 780, marginBottom: 44, paddingTop: previewMode ? 32 : 0 }}>


          {/* Title */}
          {previewMode && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 8, padding: "3px 8px", borderRadius: 5, background: "rgba(252,60,68,0.15)", border: "1px solid rgba(252,60,68,0.35)" }}>
              <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#FC3C44"/></svg>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#FC3C44", letterSpacing: "0.06em", textTransform: "uppercase" }}>제목</span>
            </div>
          )}
          <h1 style={{ fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: track?.title ? "#fff" : "rgba(255,255,255,0.2)", margin: "0 0 16px", wordBreak: "keep-all" }}>
            {track?.title || (previewMode ? "프로젝트 제목" : "")}
          </h1>

          {/* Description */}
          {(track?.description || previewMode) && (
            <>
              {previewMode && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 8, padding: "3px 8px", borderRadius: 5, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)" }}>
                  <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#38bdf8"/></svg>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#38bdf8", letterSpacing: "0.06em", textTransform: "uppercase" }}>설명</span>
                </div>
              )}
              <p style={{ fontSize: 20, color: track?.description ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", lineHeight: 1.65, margin: "0 0 32px", letterSpacing: "-0.005em", maxWidth: 720, whiteSpace: "pre-wrap" }}>
                {track?.description || (previewMode ? "프로젝트 설명을 입력해주세요" : "")}
              </p>
            </>
          )}

          {/* ── Track list ── */}
          {track?.tracks?.length > 0 && (
            <div style={{ marginTop: 36, marginBottom: 32, display: "flex", flexDirection: "column", gap: 8 }}>
              {track.tracks.map((trk, i) => {
                const isPlaying = localPlayingId === i && localIsPlaying;
                return (
                  <div
                    key={i}
                    onClick={() => trk.url && toggleLocalTrack(trk.url, i)}
                    style={{ display: "flex", gap: 13, alignItems: "center", padding: 11, borderRadius: 18, background: "rgba(255,255,255,0.045)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", maxWidth: 520, cursor: trk.url ? "pointer" : "default", transition: "background 120ms" }}
                    onMouseEnter={e => { if (trk.url) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.045)"}
                  >
                    <CDPlayer coverUrl={track.cover_url ?? track.avatarUrl} avBg={track.avBg ?? "linear-gradient(135deg,#7c3aed,#4c1d95)"} size={54} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isPlaying ? "#FC3C44" : "#fff", transition: "color 120ms" }}>
                        {trk.title}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
                        {[track.author, trk.time ? getTimeAgo(trk.time) : ""].filter(Boolean).join("   ·   ")}
                      </div>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: isPlaying ? "rgba(252,60,68,0.15)" : "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", color: isPlaying ? "#FC3C44" : "#fff", transition: "background 120ms, color 120ms" }}>
                      {isPlaying
                        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
                        : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Hero Band ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32,
            marginTop: track?.description ? 14 : 0, paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexWrap: "wrap",
          }}>
            {/* Left: meta cluster */}
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>

              {/* Position stat */}
              {track?.position && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.42)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Position</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {toEnPosition(track.position)}
                  </div>
                </div>
              )}

              {/* Genre stat */}
              {track?.genres?.[0] && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.42)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Genre</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {track.genres[0]}
                  </div>
                </div>
              )}

              {/* Author stack */}
              {track?.author && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    onClick={() => track?.author_id && navigate(`/profile/${track.author_id}`)}
                    style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #000000", background: "#7c3aed", display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", overflow: "hidden", cursor: track?.author_id ? "pointer" : "default", flexShrink: 0 }}
                  >
                    {track.avatarUrl
                      ? <img loading="eager" decoding="async" src={track.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : track.letter}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.62)" }}>
                    <b
                      onClick={() => track?.author_id && navigate(`/profile/${track.author_id}`)}
                      style={{ color: "#fff", fontWeight: 600, cursor: track?.author_id ? "pointer" : "default" }}
                      onMouseEnter={e => { if (track?.author_id) e.currentTarget.style.textDecoration = "underline"; }}
                      onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}
                    >{track.author}</b>{t("project.authorProject")}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Comments ── */}
        {!previewMode && <div style={{ marginTop: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              {t("project.comments")} · {comments.length}
            </div>

            {/* Comment input */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: currentUserAvatar ? "#000" : "#FC3C44", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                {currentUserAvatar ? <img loading="eager" decoding="async" src={currentUserAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "나"}
              </div>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onCompositionStart={() => { isComposing.current = true; }}
                onCompositionEnd={() => { isComposing.current = false; }}
                onKeyDown={e => { if (e.key === "Enter" && !isComposing.current) { e.preventDefault(); sendComment(); } }}
                placeholder={currentUser ? t("comment.placeholder") : t("comment.placeholderLogin")}
                disabled={!currentUser}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 14, opacity: currentUser ? 1 : 0.4 }}
              />
              <button onClick={sendComment} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: input.trim() ? "#fff" : "rgba(255,255,255,0.08)", border: "none", cursor: input.trim() ? "pointer" : "default", color: input.trim() ? "#000" : "rgba(255,255,255,0.25)", transition: "all 150ms", flexShrink: 0 }}>
                <SendIcon />
              </button>
            </div>

            {/* Comment list */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 4 }}>
              {commentsLoading ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13, paddingTop: 32 }}>{t("comment.loading")}</div>
              ) : topLevel.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13, paddingTop: 32 }}>{t("comment.empty")}</div>
              ) : topLevel.map(c => (
                <CommentItem key={c.id} c={c} replies={repliesMap[c.id] ?? []}
                  onLike={likeComment} onDelete={deleteComment} onEdit={editComment}
                  onReply={sendReply} currentUser={currentUser} currentUserAvatar={currentUserAvatar} />
              ))}
            </div>
          </div>
        </div>}

        </div>{/* left col */}

        {/* ── 우측 사이드바 ── */}
        {!previewMode && <aside style={{ position: "sticky", top: 0, display: "flex", flexDirection: "column", gap: 16, minHeight: "100vh", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>

          {/* 피드백 카드 */}
          <div style={{ background: "#000", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 14, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: "rgba(252,60,68,0.12)", border: "1px solid rgba(252,60,68,0.28)", color: "#FC3C44", display: "grid", placeItems: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{t("feedback.title")}</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.44)", marginTop: 4, lineHeight: 1.45, letterSpacing: "-0.005em", wordBreak: "break-word", overflowWrap: "break-word" }}>
                  {t("feedback.desc")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
              {[["bug", t("feedback.tabBug")], ["improve", t("feedback.tabImprove")], ["etc", t("feedback.tabEtc")]].map(([key, label]) => (
                <button key={key} onClick={() => setFbTab(key)} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, background: fbTab === key ? "rgba(255,255,255,0.08)" : "transparent", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: fbTab === key ? "#fff" : "rgba(255,255,255,0.44)", fontFamily: "inherit", boxShadow: fbTab === key ? "0 1px 2px rgba(0,0,0,0.4)" : "none", transition: "all 140ms ease", whiteSpace: "normal", textAlign: "center", lineHeight: 1.3 }}>
                  {label}
                </button>
              ))}
            </div>

            <textarea
              value={fbText}
              onChange={e => setFbText(e.target.value)}
              placeholder={t("feedback.placeholder")}
              style={{ width: "100%", minHeight: 88, background: "rgba(255,255,255,0.04)", border: `1px solid ${fbText ? "rgba(252,60,68,0.5)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "11px 13px", color: "#fff", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, resize: "none", outline: "none", transition: "border-color 140ms ease, background 140ms ease" }}
            />

            {fbScreenshotPreview && (
              <div style={{ position: "relative", marginTop: 8, maxHeight: 200, overflowY: "auto", borderRadius: 8 }}>
                <img loading="eager" decoding="async" src={fbScreenshotPreview} alt="" style={{ width: "100%", display: "block" }} />
                <button onClick={() => { setFbScreenshot(null); setFbScreenshotPreview(null); }}
                  style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", color: "#fff", display: "grid", placeItems: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}

            <input
              ref={fbFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setFbScreenshot(file);
                  setFbScreenshotPreview(URL.createObjectURL(file));
                }
              }}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <button
                onClick={() => fbFileRef.current?.click()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: fbScreenshot ? "#FC3C44" : "rgba(255,255,255,0.44)", fontFamily: "inherit", fontSize: 12, fontWeight: 500, padding: "6px 4px", transition: "color 140ms ease" }}
                onMouseEnter={e => e.currentTarget.style.color = fbScreenshot ? "#FF505A" : "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = fbScreenshot ? "#FC3C44" : "rgba(255,255,255,0.44)"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                {t("feedback.screenshot")}
              </button>
              <button
                onClick={handleFbSubmit}
                disabled={!fbText.trim()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: fbText.trim() ? "#FC3C44" : "rgba(255,255,255,0.06)", color: fbText.trim() ? "#fff" : "rgba(255,255,255,0.44)", border: "none", cursor: fbText.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.005em", padding: "8px 14px", borderRadius: 8, boxShadow: fbText.trim() ? "0 4px 10px -3px rgba(252,60,68,0.5)" : "none", transition: "all 140ms ease" }}
                onMouseEnter={e => { if (fbText.trim()) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "#FF505A"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = fbText.trim() ? "#FC3C44" : "rgba(255,255,255,0.06)"; }}
              >
                {fbSent ? t("feedback.sent") : t("feedback.send")}
                {!fbSent && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>}
              </button>
            </div>
          </div>

          {/* 트렌딩 + 추천 프로젝트 */}
          {[
            { label: "트렌딩", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
            { label: "추천 프로젝트", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></svg> },
          ].map(({ label, icon }) => (
            <div key={label} style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0 14px" }}>
                {icon}
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.005em" }}>{label}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array(3).fill(null).map((_, i) => (
                  <div key={i} style={{ padding: "12px 10px", borderRadius: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "-0.01em", lineHeight: 1.35, marginBottom: 9, wordBreak: "keep-all" }}>아직 프로젝트가 없어요..</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }} />
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.15)" }}>— · — · —</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </aside>}

        </div>{/* outer grid */}

      </main>
    </div>
    <ShareModal
      isOpen={shareOpen}
      onClose={() => setShareOpen(false)}
      shareData={{
        type: "collabo",
        trackId: trackId,
        title: track?.title ?? "",
        category: track?.category ?? "",
        artist: track?.author ?? "",
        position: track?.position ?? "",
        coverUrl: track?.cover_url ?? null,
        grad: track?.thumb_bg ?? "linear-gradient(135deg,#7c3aed,#4c0519)",
      }}
    />
    </>
  );
}
