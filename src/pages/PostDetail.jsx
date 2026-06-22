import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import ShareModal from "../components/ShareModal";
import { supabase } from "../lib/supabase";
import { fetchPostById } from "../lib/api";
import { CDPlayer, LinkPill } from "./CollabFeed";
import { translateAdminTitle, translateAdminBody, isAdminPost } from "../lib/adminPostI18n";
import { useToast } from "../context/ToastContext";
import { useApp } from "../context/AppContext";
import { ml } from "../lib/ml";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";

const AV_COLORS = ["#0369a1","#7c3aed","#be185d","#16a34a","#b45309","#4c1d95","#0891b2","#9333ea"];

const TAG_COLORS = {
  "VOCAL":            { bg: "rgba(244,114,182,0.15)", color: "#f472b6" },
  "PRODUCER":         { bg: "rgba(56,189,248,0.15)",  color: "#38bdf8" },
  "LYRIC":            { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  "FEATURING":        { bg: "rgba(74,222,128,0.15)",  color: "#4ade80" },
  "MIXING/MASTERING": { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
  "SESSION":          { bg: "rgba(252,60,68,0.15)",   color: "#FC3C44" },
};

const CATEGORY_LABEL = {
  "VOCAL": "보컬", "PRODUCER": "프로듀서", "LYRIC": "작사&작곡",
  "FEATURING": "피처링", "MIXING/MASTERING": "믹싱&마스터링", "SESSION": "세션",
};

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
          <div key={i} style={{ flex: 1, borderRadius: 2, minWidth: 2, height: `${h}%`, background: "linear-gradient(180deg,#FC3C44 0%,#ff2e88 100%)", opacity: played ? 1 : 0.15, transition: "opacity 60ms" }} />
        );
      })}
    </div>
  );
}

function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetch(`https://api.linkpreview.net/?key=${import.meta.env.VITE_LINK_PREVIEW_API_KEY}&q=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => setPreview(data))
      .catch(() => {});
  }, [url]);

  if (!preview) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: "block", marginTop: 12, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", color: "inherit" }}>
      {preview.image && (
        <img loading="eager" decoding="async" src={preview.image} alt="" style={{ width: "100%", maxHeight: 240, objectFit: "cover", display: "block" }} />
      )}
      <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.04)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{preview.title}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{preview.description}</div>
        <div style={{ fontSize: 11, color: "#4a9eff", marginTop: 4 }}>{url}</div>
      </div>
    </a>
  );
}

function linkify(text) {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <span key={i}>
        <a
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: "#4a9eff", textDecoration: "underline", cursor: "pointer" }}
        >
          {part}
        </a>
        <LinkPreview url={part} />
      </span>
    ) : part
  );
}

function formatTime(iso, t, i18n) {
  if (!iso) return "";
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t ? t("time.justNow") : "방금";
  if (min < 60) return t ? t("time.minutesAgo", { n: min }) : `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return t ? t("time.hoursAgo", { n: h }) : `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d === 1) return t ? t("time.yesterday") : "어제";
  if (d < 7) return t ? t("time.daysAgo", { n: d }) : `${d}일 전`;
  return new Intl.DateTimeFormat(i18n?.language ?? "ko", { month: "long", day: "numeric" }).format(dt);
}

function mapPost(p, t, i18n) {
  const tagColor = TAG_COLORS[p.category] ?? { bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" };
  return {
    ...p,
    tag:        CATEGORY_LABEL[p.category] ?? p.category ?? "",
    tagBg:      tagColor.bg,
    tagColor:   tagColor.color,
    author:     p.profiles?.username ?? "아티스트",
    handle:     p.profiles?.handle ?? null,
    letter:     (p.profiles?.username?.[0] ?? "A").toUpperCase(),
    avatarUrl:  p.profiles?.avatar_url ?? null,
    avBg:       "#7c3aed",
    time:       formatTime(p.created_at, t, i18n),
    likes:      p.like_count ?? 0,
    view_count: p.view_count ?? 0,
  };
}

function mapComment(row, myId, postAuthorId, i, t, i18n) {
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
    time:      formatTime(row.created_at, t, i18n),
    createdAt: row.created_at,
    likes:     0,
    liked:     false,
  };
}

function sortNewest(arr) {
  return [...arr].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const HeartSVG = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const SendSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

function ReplyItem({ r, onDelete, onEdit }) {
  const [hov, setHov]           = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(r.text);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuRef  = useRef(null);

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
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{formatTime(r.createdAt, t, i18n)}</span>
        </div>
        {editing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitEdit(); if (e.key === "Escape") setEditing(false); }}
              style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
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
  const { t, i18n } = useTranslation();
  const [hov, setHov]                       = useState(false);
  const [menuOpen, setMenuOpen]             = useState(false);
  const [editing, setEditing]               = useState(false);
  const [editText, setEditText]             = useState(c.text);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText]           = useState("");
  const [showReplies, setShowReplies]       = useState(false);
  const navigate = useNavigate();
  const menuRef  = useRef(null);
  const replyRef = useRef(null);
  const isMe = !!c.isMe;

  function goProfile() { if (!isMe && c.authorId) navigate(`/profile/${c.authorId}`); }

  useEffect(() => {
    if (!menuOpen) return;
    const fn = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
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
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display: "flex", gap: 16, padding: "20px 16px", borderRadius: 14, background: hov ? "rgba(255,255,255,0.03)" : "transparent", transition: "background 120ms" }}>
        <div onClick={goProfile} style={{ width: 42, height: 42, borderRadius: "50%", background: c.avBg, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700, color: "#fff", cursor: isMe ? "default" : "pointer", overflow: "hidden" }}>
          {c.avatarUrl ? <img loading="eager" decoding="async" src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : c.letter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span onClick={goProfile} style={{ fontSize: 14, fontWeight: 700, color: "#fff", cursor: isMe ? "default" : "pointer" }}
              onMouseEnter={e => { if (!isMe) e.currentTarget.style.textDecoration = "underline"; }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}>{c.author}</span>
            {c.isOwner && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#FC3C44", background: "rgba(252,60,68,0.2)", padding: "2px 7px", borderRadius: 5, letterSpacing: "0.04em" }}>OWNER</span>}
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{formatTime(c.createdAt, t, i18n)}</span>
          </div>
          {editing ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitEdit(); if (e.key === "Escape") setEditing(false); }}
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none" }} />
              <button onClick={submitEdit} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, background: "#fff", color: "#000", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.save")}</button>
              <button onClick={() => { setEditing(false); setEditText(c.text); }} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.cancel")}</button>
            </div>
          ) : (
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: 0 }}>{c.text}</p>
          )}
          {currentUser && !editing && (
            <button onClick={handleReply} style={{ marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color 120ms" }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>{t("comment.reply")}</button>
          )}
        </div>
        {isMe ? (
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0, alignSelf: "flex-start", marginTop: 2 }}>
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: menuOpen ? "rgba(255,255,255,0.08)" : "none", border: "none", cursor: "pointer", color: hov || menuOpen ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", transition: "color 120ms, background 120ms" }}>
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
            <HeartSVG filled={c.liked} />
            <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{c.likes}</span>
          </button>
        )}
      </div>

      {/* 답글 입력 */}
      {showReplyInput && (
        <div style={{ paddingLeft: 58, paddingRight: 16, paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: currentUserAvatar ? "#000" : "#FC3C44", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
              {currentUserAvatar ? <img loading="eager" decoding="async" src={currentUserAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "나"}
            </div>
            <input ref={replyRef} value={replyText} onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitReply(); if (e.key === "Escape") setShowReplyInput(false); }}
              placeholder={`@${c.author}${t("comment.replyTo")}`}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 13 }} />
            <button onClick={() => setShowReplyInput(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.cancel")}</button>
            <button onClick={submitReply} style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "50%", background: replyText.trim() ? "#fff" : "rgba(255,255,255,0.08)", border: "none", cursor: replyText.trim() ? "pointer" : "default", color: replyText.trim() ? "#000" : "rgba(255,255,255,0.25)", transition: "all 150ms", flexShrink: 0 }}>
              <SendSVG />
            </button>
          </div>
        </div>
      )}

      {/* 답글 목록 */}
      {replies.length > 0 && (
        <div style={{ paddingLeft: 58, paddingRight: 16, paddingBottom: 8 }}>
          <button onClick={() => setShowReplies(v => !v)}
            style={{ background: "none", border: "none", color: "#FC3C44", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "4px 0", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showReplies ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {t("comment.reply")} {replies.length}{i18n.language.startsWith("ko") ? "개" : ""} {showReplies ? t("comment.fold") : t("comment.view")}
          </button>
          {showReplies && (
            <div style={{ marginTop: 8 }}>
              {replies.map(r => <ReplyItem key={r.id} r={r} onDelete={onDelete} onEdit={onEdit} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function PostDetail() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const { showToast } = useToast();
  const { profile: appProfile } = useApp();

  const [isOpen, setIsOpen]               = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [post, setPost]                   = useState(navState?.post ?? null);
  const [shareOpen, setShareOpen]         = useState(false);
  const [reportOpen, setReportOpen]       = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportCategory, setReportCategory] = useState(0);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [liked, setLiked]                 = useState(false);
  const [likeCount, setLikeCount]         = useState(0);
  const [comments, setComments]           = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [currentUser, setCurrentUser]     = useState(null);
  const [input, setInput]                 = useState("");

  const currentUserRef   = useRef(null);
  const sendingRef       = useRef(false);
  const ownerAuthorIdRef = useRef(null);
  const currentUserAvatar = appProfile?.avatar_url ?? null;

  const [viewingImage, setViewingImage] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const localAudioRef = useRef(new Audio());

  const pad = isOpen ? 248 : 110;
  const imageUrls = (() => {
    const raw = post?.cover_url ?? post?.image_url ?? null;
    if (!raw) return [];
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [raw]; } catch { return [raw]; }
  })();
  const imageUrl = imageUrls[0] ?? null;

  useEffect(() => () => { localAudioRef.current.pause(); localAudioRef.current.src = ""; }, []);

  function toggleAudio() {
    const audio = localAudioRef.current;
    if (!post?.audio_url) return;
    if (!audio.src || audio.src !== post.audio_url) {
      audio.src = post.audio_url;
      audio.ontimeupdate = () => { if (audio.duration > 0) setAudioProgress(audio.currentTime / audio.duration); };
      audio.onended = () => { setAudioPlaying(false); setAudioProgress(0); };
    }
    if (audioPlaying) { audio.pause(); setAudioPlaying(false); }
    else { audio.play().catch(() => {}); setAudioPlaying(true); }
  }

  function seekAudio(pct) {
    const audio = localAudioRef.current;
    if (audio.duration > 0) audio.currentTime = pct * audio.duration;
    setAudioProgress(pct);
  }

  // 로그인 유저
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      currentUserRef.current = user;
    });
  }, []);

  useEffect(() => {
    setPost(null);
    setComments([]);
    setLiked(false);
    setLikeCount(0);
  }, [postId]);

  function handleReport() {
    if (!currentUser) {
      showToast(ml("k040"), "error");
      return;
    }
    setReportOpen(true);
  }

  async function submitReport() {
    if (!currentUser || !reportContent.trim() || reportSubmitting) return;
    setReportSubmitting(true);
    await supabase.from("reports").insert({
      type: "report",
      category: t("chat.reportCategories", { returnObjects: true })[reportCategory],
      content: reportContent.trim(),
      target_type: "post",
      target_id: String(postId ?? ""),
      reporter_id: currentUser.id,
    });
    setReportSubmitting(false);
    setReportOpen(false);
    setReportContent("");
    setReportCategory(0);
    showToast(ml("k041"), "warn", undefined, "flag");
  }

  useEffect(() => {
    if (!postId) return;
    let mounted = true;
    fetchPostById(postId).then(({ data }) => {
      if (mounted && data) setPost(prev => mapPost({ ...(prev ?? {}), ...data }, t, i18n));
    });

    const sub = supabase.channel(`post-detail-${postId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts", filter: `id=eq.${postId}` }, async () => {
        if (!mounted) return;
        const { data } = await fetchPostById(postId);
        if (mounted && data) setPost(prev => mapPost({ ...(prev ?? {}), ...data }, t, i18n));
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(sub); };
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    Promise.allSettled([
      supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId),
      currentUser
        ? supabase.from("likes").select("id").eq("user_id", currentUser.id).eq("post_id", postId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]).then(([likesCount, myLike]) => {
      if (likesCount.status === "fulfilled") setLikeCount(likesCount.value.count ?? 0);
      if (myLike.status === "fulfilled") setLiked(!!myLike.value.data);
    });
  }, [postId, currentUser?.id]);

  // 댓글 로드 + Realtime (TrackDetail 패턴 그대로, track_id → post_id)
  useEffect(() => {
    if (!postId) { setCommentsLoading(false); return; }
    let mounted = true;

    async function loadComments() {
      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user?.id ?? null;
      const [{ data: postData }, { data, error }] = await Promise.all([
        supabase.from("posts").select("author_id").eq("id", postId).single(),
        supabase.from("comments")
          .select("id, parent_id, author_id, content, created_at, profiles(username, avatar_url)")
          .eq("post_id", postId)
          .order("created_at", { ascending: true }),
      ]);
      if (!mounted) return;
      const ownerAuthorId = postData?.author_id ?? null;
      ownerAuthorIdRef.current = ownerAuthorId;
      if (!error && data) setComments(sortNewest(data.map((row, i) => mapComment(row, myId, ownerAuthorId, i, t, i18n))));
      setCommentsLoading(false);
    }

    loadComments();

    const channel = supabase
      .channel(`post-comments:${postId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
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
            return sortNewest([...prev, mapComment(row, myId, ownerAuthorIdRef.current, prev.length, t, i18n)]);
          });
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        (payload) => {
          if (!mounted) return;
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
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
  }, [postId]);

  // 좋아요 토글
  async function toggleLike() {
    if (!currentUser) return;
    const next = !liked;
    setLiked(next);
    setLikeCount(n => next ? n + 1 : n - 1);
    if (next) {
      showToast(ml("k017"), "success", async () => {
        setLiked(false);
        setLikeCount(n => n - 1);
        await supabase.from("likes").delete().eq("user_id", currentUser.id).eq("post_id", postId);
        showToast(ml("k007"), "info", undefined, "heart-off");
      }, "heart");
      await supabase.from("likes").insert({ user_id: currentUser.id, post_id: postId });
    } else {
      await supabase.from("likes").delete().eq("user_id", currentUser.id).eq("post_id", postId);
      showToast(ml("k007"), "info", async () => {
        setLiked(true);
        setLikeCount(n => n + 1);
        await supabase.from("likes").insert({ user_id: currentUser.id, post_id: postId });
      }, "heart-off");
    }
  }

  function likeComment(id) {
    setComments(prev => prev.map(c =>
      c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c
    ));
  }

  async function deleteComment(id) {
    setComments(prev => prev.filter(c => c.id !== id));
    await supabase.from("comments").delete().eq("id", id);
    await supabase.rpc("decrement_comment", { pid: postId });
  }

  async function editComment(id, text) {
    setComments(prev => prev.map(c => c.id === id ? { ...c, text } : c));
    await supabase.from("comments").update({ content: text }).eq("id", id);
  }

  async function sendComment() {
    const text = input.trim();
    if (!text || !currentUser || !postId || sendingRef.current) return;
    sendingRef.current = true;
    setInput("");
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ author_id: currentUser.id, post_id: postId, content: text })
        .select("id, parent_id, author_id, content, created_at, profiles(username, avatar_url)")
        .single();
      if (!error && data) {
        setComments(prev => {
          if (prev.some(c => c.id === data.id)) return prev;
          return sortNewest([...prev, mapComment(data, currentUser.id, ownerAuthorIdRef.current, prev.length, t, i18n)]);
        });
        await supabase.rpc("increment_comment", { pid: postId });
      }
    } finally {
      sendingRef.current = false;
    }
  }

  async function sendReply(parentId, text) {
    if (!text || !currentUser || !postId || sendingRef.current) return;
    sendingRef.current = true;
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ author_id: currentUser.id, post_id: postId, content: text, parent_id: parentId })
        .select("id, parent_id, author_id, content, created_at, profiles(username, avatar_url)")
        .single();
      if (!error && data) {
        setComments(prev => {
          if (prev.some(c => c.id === data.id)) return prev;
          return sortNewest([...prev, mapComment(data, currentUser.id, ownerAuthorIdRef.current, prev.length, t, i18n)]);
        });
      }
    } finally {
      sendingRef.current = false;
    }
  }

  const topLevel  = comments.filter(c => !c.parentId);
  const repliesMap = {};
  comments.filter(c => c.parentId).forEach(r => {
    if (!repliesMap[r.parentId]) repliesMap[r.parentId] = [];
    repliesMap[r.parentId].push(r);
  });

  if (!post) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #FC3C44", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <>
    {viewingImage && (
      <div
        onClick={() => setViewingImage(null)}
        style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(0,0,0,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "pd-fade 200ms ease both",
        }}
      >
        <button
          onClick={() => setViewingImage(null)}
          style={{
            position: "absolute", top: 20, right: 24,
            background: "rgba(255,255,255,0.12)", border: "none",
            borderRadius: "50%", width: 40, height: 40,
            display: "grid", placeItems: "center",
            cursor: "pointer", color: "#fff",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img
          src={viewingImage}
          alt="전체화면"
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: "90vw", maxHeight: "90vh",
            borderRadius: 12, objectFit: "contain",
            animation: "pd-scale 220ms ease both",
          }}
        />
      </div>
    )}
    <div style={{ minHeight: "100vh", background: "#000000", overflowX: "auto" }}>
      <style>{`@keyframes recs-pulse{0%,100%{opacity:1}50%{opacity:.35}} @keyframes pd-fade{from{opacity:0}to{opacity:1}} @keyframes pd-scale{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}`}</style>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main style={{
        paddingLeft: pad, paddingRight: 0, paddingTop: 0, paddingBottom: 80,
        transition: `padding-left ${DURATION} ${EASE}`,
        minWidth: 900,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: isOpen ? 32 : 56, alignItems: "stretch", transition: `gap ${DURATION} ${EASE}, grid-template-columns ${DURATION} ${EASE}` }}>

        {/* ── LEFT: main content ── */}
        <div>

          {/* 뒤로가기 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 0 28px" }}>
            <button
              onClick={() => navigate(-1)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "8px 10px", borderRadius: 8, transition: "background 120ms, color 120ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              {t("common.back")}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={toggleLike}
                style={{ width: 36, height: 36, borderRadius: 10, background: liked ? "rgba(252,60,68,0.14)" : "rgba(255,255,255,0.05)", border: liked ? "1px solid rgba(252,60,68,0.3)" : "1px solid rgba(255,255,255,0.06)", color: liked ? "#FC3C44" : "#fff", display: "grid", placeItems: "center", cursor: currentUser ? "pointer" : "default", transition: "background 120ms, border-color 120ms" }}
                onMouseEnter={e => { if (currentUser) e.currentTarget.style.background = liked ? "rgba(252,60,68,0.22)" : "rgba(255,255,255,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = liked ? "rgba(252,60,68,0.14)" : "rgba(255,255,255,0.05)"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
              <button
                onClick={() => setShareOpen(true)}
                style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", transition: "background 120ms" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button
                onClick={handleReport}
                title="신고하기"
                style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", transition: "background 120ms" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              </button>
            </div>
          </div>

          {/* ── 아티스트 정보 ── */}
          <div
            onClick={() => { if (!isAdminPost(post) && post?.author_id) navigate(`/profile/${post.author_id}`); }}
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, cursor: (post?.author_id && !isAdminPost(post)) ? "pointer" : "default" }}
          >
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: post?.avBg ?? "#7c3aed", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
              {post?.avatarUrl
                ? <img loading="eager" decoding="async" src={post.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : post?.letter ?? "?"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{post?.author ?? ""}</div>
              {post?.handle && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>@{post.handle}</div>
              )}
            </div>
          </div>

          {/* ── 제목 ── */}
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.22, margin: "0 0 20px 0" }}>
            {translateAdminTitle(post, i18n.language)}
          </h1>

          {/* ── 본문 ── */}
          {(post?.description ?? post?.body ?? post?.content) && (
            <div style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, margin: "0 0 28px 0", whiteSpace: "pre-wrap" }}>
              {linkify(translateAdminBody({ ...post, text: post.description ?? post.body ?? post.content }, i18n.language))}
            </div>
          )}

          {/* ── 링크 ── */}
          {post?.link_url && (
            <div style={{ marginBottom: 24 }}>
              <LinkPill url={post.link_url} />
            </div>
          )}

          {/* ── 이미지 첨부 ── */}
          {imageUrls.length > 0 && (
            <div style={{ marginBottom: 24, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", maxWidth: 640 }}>
              {imageUrls.length === 1 ? (
                <img
                  src={imageUrls[0]}
                  alt=""
                  onClick={() => setViewingImage(imageUrls[0])}
                  style={{ width: "100%", display: "block", cursor: "zoom-in", objectFit: "cover" }}
                />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  {imageUrls.map((url, i) => (
                    <div key={i} style={{ height: 360, overflow: "hidden", background: "#000", cursor: "zoom-in" }} onClick={() => setViewingImage(url)}>
                      <img loading="eager" decoding="async" src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 음원 첨부 ── */}
          {post?.audio_url && (
            <div style={{ marginBottom: 28 }}>
              <div
                onClick={toggleAudio}
                style={{ display: "flex", gap: 13, alignItems: "center", padding: 11, borderRadius: 18, background: "rgba(255,255,255,0.045)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", cursor: "pointer", transition: "background 120ms", maxWidth: 520 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.045)"}
              >
                <div style={{ width: 54, height: 54, borderRadius: 10, flexShrink: 0, background: "linear-gradient(160deg,#ff2d55 0%,#fc3c44 60%,#c8162a 100%)", display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                    <path d="M12 3v11.26A3.5 3.5 0 1 0 14 17V8h4.5V3H12z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: audioPlaying ? "#FC3C44" : "#fff", transition: "color 120ms" }}>
                    {post.audio_name ?? post.title}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {post.audio_duration != null && (() => { const m = Math.floor(post.audio_duration / 60); const s = post.audio_duration % 60; return `${m}:${String(s).padStart(2, "0")}`; })()}
                  </div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: audioPlaying ? "rgba(252,60,68,0.15)" : "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", color: audioPlaying ? "#FC3C44" : "#fff", transition: "background 120ms, color 120ms" }}>
                  {audioPlaying
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── 장르 태그 ── */}
          {post?.genre && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
              {post.genre.split(",").map(s => s.trim()).filter(Boolean).map((g, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 26, padding: "0 10px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.72)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: "#FC3C44", flexShrink: 0 }} />
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* ── 통계 행 ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {likeCount}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {comments.length}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {formatTime(post?.created_at, t, i18n)}
            </span>
          </div>

          {/* ── 구분선 ── */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 32 }} />

          {/* ── 댓글 섹션 ── */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
              {t("project.comments")} · {comments.length}
            </div>

            {/* 댓글 입력 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", marginBottom: 16, borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: currentUserAvatar ? "#000" : "#FC3C44", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                {currentUserAvatar ? <img loading="eager" decoding="async" src={currentUserAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "나"}
              </div>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) sendComment(); }}
                placeholder={currentUser ? t("comment.placeholder") : t("comment.placeholderLogin")}
                disabled={!currentUser}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 14, opacity: currentUser ? 1 : 0.4 }}
              />
              <button
                onClick={sendComment}
                style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "50%", background: input.trim() ? "#fff" : "rgba(255,255,255,0.08)", border: "none", cursor: input.trim() ? "pointer" : "default", color: input.trim() ? "#000" : "rgba(255,255,255,0.25)", transition: "all 150ms", flexShrink: 0 }}
              >
                <SendSVG />
              </button>
            </div>

            {/* 댓글 목록 */}
            <div>
              {commentsLoading ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13, paddingTop: 32 }}>{t("comment.loading")}</div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13, paddingTop: 32 }}>{t("comment.empty")}</div>
              ) : (
                topLevel.map(c => (
                  <CommentItem key={c.id} c={c} replies={repliesMap[c.id] ?? []}
                    onLike={likeComment} onDelete={deleteComment} onEdit={editComment}
                    onReply={sendReply} currentUser={currentUser} currentUserAvatar={currentUserAvatar} />
                ))
              )}
            </div>
          </div>

        </div>
        {/* ── LEFT end ── */}

        {/* ── RIGHT: sidebar ── */}
        <RightSidebar activeTab="projects" />
        {/* ── RIGHT end ── */}

        </div>{/* grid end */}
      </main>
    </div>

    <ShareModal
      isOpen={shareOpen}
      onClose={() => setShareOpen(false)}
      shareData={{
        type: "post",
        postId: postId,
        title: post?.title ?? "",
        category: post?.tag ?? "",
        thumbBg: post?.thumbBg ?? "linear-gradient(135deg,#1a0533,#4a1a7a)",
      }}
    />

    {/* 신고 모달 */}
    {reportOpen && (
      <div onClick={() => setReportOpen(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()}
          style={{ width: 400, background: "#141414", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>{t("chat.reportPost")}</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 8 }}>{t("chat.reportType")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {t("chat.reportCategories", { returnObjects: true }).map((cat, idx) => (
                <button key={idx} onClick={() => setReportCategory(idx)}
                  style={{ padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: reportCategory === idx ? "#FC3C44" : "rgba(255,255,255,0.08)", color: reportCategory === idx ? "#fff" : "rgba(255,255,255,0.6)", transition: "all 150ms" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 8 }}>{t("chat.reportDetail")}</label>
            <textarea value={reportContent} onChange={e => setReportContent(e.target.value)} rows={4}
              placeholder={t("chat.reportPlaceholder")}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.6 }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setReportOpen(false)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {t("chat.cancel")}
            </button>
            <button
              disabled={reportSubmitting || !reportContent.trim()}
              onClick={submitReport}
              style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: reportContent.trim() ? "#FC3C44" : "rgba(252,60,68,0.3)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: reportContent.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
              {reportSubmitting ? t("chat.reporting") : t("chat.reportSubmit")}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
