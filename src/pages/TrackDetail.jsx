import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Share2, Play, Pause } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ShareModal from "../components/ShareModal";
import { usePlayer } from "../context/PlayerContext";
import { supabase } from "../lib/supabase";
import { fetchTrackById } from "../lib/api";
import cdImg from "../assets/642AE0A8-7C25-4E26-B115-2B1537BA8590.jpeg 19-05-12-247.jpeg";
import cdImgNew from "../assets/_-removebg-preview.png";
import { useToast } from "../context/ToastContext";
import { useApp } from "../context/AppContext";
import { useTranslation } from "react-i18next";
import { useLang } from "../context/LangContext";
import { SongRow, GRAD_FALLBACKS } from "./NewSongs";
import { ml } from "../lib/ml";
import i18n from "../i18n";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";

const AV_COLORS = ["#0369a1","#7c3aed","#be185d","#16a34a","#b45309","#4c1d95","#0891b2","#9333ea"];

let _tdCdDeg = 0;
let _tdCdLastTs = null;

function CDPlayer({ coverUrl, grad, isPlaying, onToggle }) {
  const coverRef = useRef(null);
  const rafRef   = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      _tdCdLastTs = null;
      return;
    }
    const t0 = `rotate(${_tdCdDeg}deg)`;
    if (coverRef.current) coverRef.current.style.transform = t0;
    const animate = ts => {
      if (_tdCdLastTs !== null) {
        _tdCdDeg = (_tdCdDeg + ((ts - _tdCdLastTs) / 4000) * 360) % 360;
        const t = `rotate(${_tdCdDeg}deg)`;
        if (coverRef.current) coverRef.current.style.transform = t;
      }
      _tdCdLastTs = ts;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  return (
    <div style={{ position: "relative", width: 420, height: 420, flexShrink: 0, cursor: onToggle ? "pointer" : "default" }} onClick={onToggle}>
      <img loading="eager" decoding="async" src={cdImg} alt="cd" style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        objectFit: "contain",
        zIndex: 1,
      }} />
      {coverUrl && (
        <div ref={coverRef} style={{
          position: "absolute", inset: 0, zIndex: 2,
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: "89%",
          backgroundPosition: "81.8% 50%",
          WebkitMaskImage: "radial-gradient(circle closest-side at 53.5% 50%, transparent 27%, black 28%, black 93%, transparent 94%)",
          maskImage: "radial-gradient(circle closest-side at 53.5% 50%, transparent 27%, black 28%, black 93%, transparent 94%)",
          transformOrigin: "53.5% 50%",
        }} />
      )}
    </div>
  );
}


// function formatTime(isoString) { /* replaced by formatDate from LangContext */ }

function mapComment(row, myId, ownerAuthorId, i) {
  const username = row.profiles?.username ?? "알 수 없음";
  return {
    id:        row.id,
    authorId:  row.author_id,
    isMe:      row.author_id === myId,
    isOwner:   row.author_id === ownerAuthorId,
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

// ── Canvas Waveform ──────────────────────────────────────────
const BAR_W = 2;
const BAR_GAP = 1;
const STEP = BAR_W + BAR_GAP;
const H = 88;

function Waveform({ audioUrl, trackId }) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const [peaks, setPeaks]         = useState([]);
  const [canvasW, setCanvasW]     = useState(0);
  const [hoverRatio, setHoverRatio] = useState(null);
  const { progress, duration, seek, currentTrack } = usePlayer();
  const isCurrentTrack = currentTrack?.id === trackId;

  // Decode audio → extract peaks
  useEffect(() => {
    if (!audioUrl) return;
    let cancelled = false;
    let audioCtx;
    fetch(audioUrl, { priority: "low" })
      .then(r => r.arrayBuffer())
      .then(buf => {
        if (cancelled) return null;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx.decodeAudioData(buf);
      })
      .then(audioBuffer => {
        if (!audioBuffer || cancelled) return;

        // 1. 원본 PCM (L+R 채널 합산)
        const left  = audioBuffer.getChannelData(0);
        const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
        const length = left.length;

        // 2. 다운샘플링 - 블록 단위로 나누기
        const samples = 200;
        const blockSize = Math.floor(length / samples);

        // 3. Peak + RMS 블렌딩
        const values = Array.from({ length: samples }, (_, i) => {
          const start = i * blockSize;
          let posMax = 0, negMax = 0, sumSq = 0;
          for (let j = 0; j < blockSize; j++) {
            const v = (left[start + j] + right[start + j]) / 2;
            if (v > posMax) posMax = v;
            if (v < negMax) negMax = v;
            sumSq += v * v;
          }
          const peak = Math.max(posMax, Math.abs(negMax));
          const rms  = Math.sqrt(sumSq / blockSize);
          return Math.sqrt(peak * 0.6 + rms * 0.4);
        });

        // 4. 95th percentile 정규화
        const sorted = [...values].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(samples * 0.95)] || 0.001;
        const normalized = values.map(v => Math.min(v / p95, 1));

        // 5. 렌더링용 최소 높이 보장
        if (!cancelled) setPeaks(normalized.map(v => Math.max(0.04, v)));
        audioCtx.close();
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [audioUrl]);

  // ResizeObserver → canvasW
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCanvasW(entry.contentRect.width));
    ro.observe(el);
    setCanvasW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length || !canvasW) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvasW * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasW, H);

    const N = Math.floor(canvasW / STEP);
    const step = canvasW / N;
    const playedRatio = isCurrentTrack && duration ? progress / duration : 0;

    const displayPeaks = Array.from({ length: N }, (_, i) =>
      peaks[Math.round((i / N) * (peaks.length - 1))]
    );

    displayPeaks.forEach((v, i) => {
      const x = i * step;
      const h = Math.max(2, v * H * 0.65);
      const hMirror = h * 0.35;
      const played  = i / displayPeaks.length <= playedRatio;
      const hovered = hoverRatio !== null && i / displayPeaks.length <= hoverRatio && !played;

      const color       = played ? "#FC3C44" : hovered ? "rgba(255,255,255,0.55)" : "#fff";
      const colorMirror = played ? "rgba(252,60,68,0.3)" : hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.35)";

      // 위쪽 바
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, 64 - h, BAR_W, h, 1);
      ctx.fill();

      // 아래쪽 미러 바
      ctx.fillStyle = colorMirror;
      ctx.beginPath();
      ctx.roundRect(x, 64, BAR_W, hMirror, 1);
      ctx.fill();
    });
  }, [peaks, canvasW, progress, duration, isCurrentTrack, hoverRatio]);

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverRatio((e.clientX - rect.left) / rect.width);
  }

  function handleClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (duration) seek(ratio * duration);
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 88, cursor: "pointer", position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverRatio(null)}
      onClick={handleClick}
    >
      {peaks.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingBottom: 8 }}>
          <div style={{ width: "100%", height: 2, borderRadius: 1, background: "rgba(255,255,255,0.1)" }} />
        </div>
      )}
      <canvas ref={canvasRef} height={H} style={{ width: "100%", height: 88, display: "block", opacity: peaks.length ? 1 : 0 }} />
    </div>
  );
}

// ── Icon SVGs ────────────────────────────────────────────────
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
const PlaySVG  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="#000"><polygon points="6 4 20 12 6 20 6 4"/></svg>;
const PauseSVG = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="#000"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;

// ── RecommendedSidebar ───────────────────────────────────────
function RecommendedRow({ t, onPlay, isPlaying, index }) {
  const [hov, setHov] = useState(false);
  const artist = t.profiles?.username ?? t.artist ?? "아티스트";
  const grad = AV_COLORS[index % AV_COLORS.length] ?? "#333";
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onPlay(t)}
      style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 10, alignItems: "center", padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: hov ? "rgba(255,255,255,0.05)" : "transparent", transition: "background 150ms", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div style={{ width: 44, height: 44, position: "relative", flexShrink: 0 }}>
        <img loading="eager" decoding="async" src={cdImgNew} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} />
        {t.cover_url && (
          <div style={{ position: "absolute", inset: 0, zIndex: 2, backgroundImage: `url(${t.cover_url})`, backgroundSize: "cover", backgroundPosition: "center", WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)", maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: "50%", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)", WebkitMaskImage: "radial-gradient(circle, transparent 18%, black 19%)", maskImage: "radial-gradient(circle, transparent 18%, black 19%)" }} />
        {isPlaying && (
          <div style={{ position: "absolute", inset: 0, zIndex: 4, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", borderRadius: "50%" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: isPlaying ? "#FC3C44" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artist}</div>
      </div>
    </div>
  );
}

function RecommendedSidebar({ tracks, playTrack, currentTrack, isPlaying }) {
  if (!tracks.length) return null;
  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", margin: "0 0 12px 10px" }}>다음 트랙</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {tracks.map(t => (
          <RecommendedRow
            key={t.id}
            t={t}
            isPlaying={currentTrack?.id === t.id && isPlaying}
            onPlay={track => playTrack({
              id: track.id,
              title: track.title,
              artist: track.profiles?.username ?? track.artist ?? "아티스트",
              cover_url: track.cover_url ?? null,
              audio_url: track.audio_url ?? null,
              grad: "linear-gradient(135deg,#be185d,#4c0519)",
            })}
          />
        ))}
      </div>
    </div>
  );
}

// ── ReplyItem ─────────────────────────────────────────────────
function ReplyItem({ r, onDelete, onEdit, onReply, parentId, currentUser, currentUserAvatar, lang }) {
  const [hov, setHov]           = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(r.text);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const replyRef = useRef(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuRef  = useRef(null);

  useEffect(() => { if (showReplyInput) replyRef.current?.focus(); }, [showReplyInput]);

  function handleReply() { setReplyText(`@${r.author} `); setShowReplyInput(true); }
  async function submitReply() {
    const v = replyText.trim();
    if (!v) return;
    await onReply(parentId, v);
    setReplyText(""); setShowReplyInput(false);
  }
  function getTimeAgo(isoString) {
    if (!isoString) return "";
    const dt = new Date(isoString);
    const diff = Date.now() - dt.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return ml("k043");
    if (min < 60) return i18n.t("time.minutesAgo", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return i18n.t("time.hoursAgo", { n: h });
    const d = Math.floor(h / 24);
    if (d === 1) return ml("k044");
    if (d < 7) return i18n.t("time.daysAgo", { n: d });
    return new Intl.DateTimeFormat(lang, { month: "long", day: "numeric" }).format(dt);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const fn = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [menuOpen]);

  function submitEdit() {
    const v = editText.trim();
    if (v) onEdit(r.id, v);
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
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{getTimeAgo(r.createdAt)}</span>
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
        {currentUser && !editing && (
          <button onClick={handleReply} style={{ marginTop: 7, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color 120ms" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>{ml("k131")}</button>
        )}
        {showReplyInput && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: currentUserAvatar ? "#000" : "#FC3C44", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                {currentUserAvatar ? <img loading="eager" decoding="async" src={currentUserAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "나"}
              </div>
              <input ref={replyRef} value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submitReply(); if (e.key === "Escape") setShowReplyInput(false); }} placeholder={`@${r.author}`} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 13 }} />
              <button onClick={() => setShowReplyInput(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.cancel")}</button>
              <button onClick={submitReply} style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: "50%", background: replyText.trim() ? "#fff" : "rgba(255,255,255,0.08)", border: "none", cursor: replyText.trim() ? "pointer" : "default", color: replyText.trim() ? "#000" : "rgba(255,255,255,0.25)", transition: "all 150ms", flexShrink: 0 }}>
                <SendSVG />
              </button>
            </div>
          </div>
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

// ── CommentItem ──────────────────────────────────────────────
function CommentItem({ c, replies = [], onLike, onDelete, onEdit, onReply, currentUser, currentUserAvatar, lang }) {
  const [hov, setHov]                     = useState(false);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [editing, setEditing]             = useState(false);
  const [editText, setEditText]           = useState(c.text);
  const { t, i18n } = useTranslation();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText]         = useState("");
  const [showReplies, setShowReplies]     = useState(false);
  const navigate  = useNavigate();
  const menuRef   = useRef(null);
  const replyRef  = useRef(null);
  const isMe = !!c.isMe;
  function getTimeAgo(isoString) {
    if (!isoString) return "";
    const dt = new Date(isoString);
    const diff = Date.now() - dt.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return ml("k043");
    if (min < 60) return i18n.t("time.minutesAgo", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return i18n.t("time.hoursAgo", { n: h });
    const d = Math.floor(h / 24);
    if (d === 1) return ml("k044");
    if (d < 7) return i18n.t("time.daysAgo", { n: d });
    return new Intl.DateTimeFormat(lang, { month: "long", day: "numeric" }).format(dt);
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
      {/* main row */}
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display: "flex", gap: 16, padding: "20px 16px", borderRadius: 14, background: hov ? "rgba(255,255,255,0.03)" : "transparent", transition: "background 120ms" }}
      >
        <div onClick={goProfile} style={{ width: 42, height: 42, borderRadius: "50%", background: c.avBg, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700, color: "#fff", cursor: isMe ? "default" : "pointer", overflow: "hidden" }}>
          {c.avatarUrl ? <img loading="eager" decoding="async" src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : c.letter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span onClick={goProfile} style={{ fontSize: 14, fontWeight: 700, color: "#fff", cursor: isMe ? "default" : "pointer" }} onMouseEnter={e => { if (!isMe) e.currentTarget.style.textDecoration = "underline"; }} onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}>{c.author}</span>
            {c.isOwner && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#FC3C44", background: "rgba(252,60,68,0.2)", padding: "2px 7px", borderRadius: 5, letterSpacing: "0.04em" }}>OWNER</span>}
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{getTimeAgo(c.createdAt)}</span>
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
            <button onClick={handleReply} style={{ marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0, transition: "color 120ms" }} onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>답글</button>
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
            <HeartSVG filled={c.liked} />
            <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{c.likes}</span>
          </button>
        )}
      </div>

      {/* reply input */}
      {showReplyInput && (
        <div style={{ paddingLeft: 58, paddingRight: 16, paddingBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: currentUserAvatar ? "#000" : "#FC3C44", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
              {currentUserAvatar ? <img loading="eager" decoding="async" src={currentUserAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "나"}
            </div>
            <input ref={replyRef} value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submitReply(); if (e.key === "Escape") setShowReplyInput(false); }} placeholder={`@${c.author}${"에게 답글..."}`} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 13 }} />
            <button onClick={() => setShowReplyInput(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t("comment.cancel")}</button>
            <button onClick={submitReply} style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "50%", background: replyText.trim() ? "#fff" : "rgba(255,255,255,0.08)", border: "none", cursor: replyText.trim() ? "pointer" : "default", color: replyText.trim() ? "#000" : "rgba(255,255,255,0.25)", transition: "all 150ms", flexShrink: 0 }}>
              <SendSVG />
            </button>
          </div>
        </div>
      )}

      {/* replies */}
      {replies.length > 0 && (
        <div style={{ paddingLeft: 58, paddingRight: 16, paddingBottom: 8 }}>
          <button onClick={() => setShowReplies(v => !v)} style={{ background: "none", border: "none", color: "#FC3C44", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "4px 0", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showReplies ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}><polyline points="6 9 12 15 18 9"/></svg>
            {ml("k132")} {replies.length}{lang === "ko" ? "개" : ""} {showReplies ? (ml("k133")) : (ml("k134"))}
          </button>
          {showReplies && (
            <div style={{ marginTop: 8 }}>
              {replies.map(r => (
                <ReplyItem key={r.id} r={r} onDelete={onDelete} onEdit={onEdit} onReply={onReply} parentId={c.id} currentUser={currentUser} currentUserAvatar={currentUserAvatar} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Color extraction ─────────────────────────────────────────

// ── Fullscreen Player ─────────────────────────────────────────
function FullscreenPlayer({ onClose, track }) {
  const { isPlaying, progress, duration, togglePlay, seek, toggleLike, isLiked } = usePlayer();
  const liked     = isLiked(track);
  const progRef   = useRef(null);
  const pct       = duration > 0 ? (progress / duration) * 100 : 0;
  const navigate  = useNavigate();

  function fmt(s) {
    if (!s || !isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  function handleSeek(e) {
    const rect = progRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return;
    seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
  }

  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, overflow: "hidden" }}>
      {track?.cover_url && (
        <img
          src={track.cover_url}
          alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            filter: "blur(30px)",
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1 }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 32px 64px", userSelect: "none" }}>

        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 24, right: 28, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", display: "grid", placeItems: "center", backdropFilter: "blur(8px)" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Album art */}
        <div style={{ marginBottom: 40 }}>
          <CDPlayer coverUrl={displayTrack.cover_url} grad={displayTrack.grad} isPlaying={isThisPlaying} />
        </div>

        {/* Title + artist + like */}
        <div style={{ width: "100%", maxWidth: 380, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track?.title}</div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track?.artist}</div>
            </div>
            <button
              onClick={() => toggleLike(track)}
              style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: "4px 0", color: liked ? "#FC3C44" : "rgba(255,255,255,0.45)", transition: "color 150ms" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? "#FC3C44" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Progress */}
        <div style={{ width: "100%", maxWidth: 380, marginBottom: 32 }}>
          <div ref={progRef} onClick={handleSeek} style={{ height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 999, cursor: "pointer", position: "relative", marginBottom: 10 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#fff", borderRadius: 999, transition: "width 200ms linear" }} />
            <div style={{ position: "absolute", top: "50%", left: `${pct}%`, transform: "translate(-50%,-50%)", width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>
            <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button onClick={() => {}} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6, padding: 8 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="white"><polygon points="10,4 2,11 10,18"/><polygon points="19,4 11,11 19,18"/></svg>
          </button>
          <button
            onClick={togglePlay}
            style={{ width: 70, height: 70, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", transition: "transform 100ms" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {isPlaying
              ? <svg width="26" height="26" viewBox="0 0 24 24" fill="#000"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="26" height="26" viewBox="0 0 24 24" fill="#000"><polygon points="6 4 20 12 6 20 6 4"/></svg>}
          </button>
          <button onClick={() => {}} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6, padding: 8 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="white"><polygon points="3,4 11,11 3,18"/><polygon points="12,4 20,11 12,18"/></svg>
          </button>
        </div>

      </div>
    </div>
  );
}


// ── TrackDetail ──────────────────────────────────────────────
export default function TrackDetail() {
  const { id: trackId } = useParams();
  const navigate  = useNavigate();
  const { state: navState } = useLocation();
  const { playTrack, togglePlay, currentTrack, currentTrackRef, isPlaying, progress, duration, queue, upNextTracks, seek, playNext, playPrev } = usePlayer();
  const progRef = useRef(null);
  const { showToast } = useToast();
  const { profile: appProfile } = useApp();
  const { t, i18n } = useTranslation();
  const { lang } = useLang();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    const handler = (lng) => setCurrentLang(lng);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, [i18n]);

  function getTimeAgo(isoString) {
    if (!isoString) return "";
    const dt = new Date(isoString);
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
  const [isOpen, setIsOpen]          = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [track, setTrack]            = useState(navState?.track ?? null);
  const [shareOpen, setShareOpen]    = useState(false);
  const [liked, setLiked]            = useState(false);
  const [likeCount, setLikeCount]    = useState(0);
  const [comments, setComments]      = useState([]);
  const [cueHidden, setCueHidden]    = useState(false);
  const leftScrollRef = useRef(null);
  const upNextRef     = useRef(null);

  const isCurrentTrack = currentTrack?.id === trackId;
  const isThisPlaying  = isCurrentTrack && isPlaying;
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const currentUserRef    = useRef(null);
  const sendingRef        = useRef(false);
  const ownerAuthorIdRef  = useRef(null);
  const isComposing       = useRef(false);
  const currentUserAvatar = appProfile?.avatar_url ?? null;
  const [input, setInput]          = useState("");
  const [collaborators, setCollaborators]       = useState([]);
  const [trackList, setTrackList] = useState(navState?.trackList ?? []);
  const [recommendedTracks, setRecommendedTracks] = useState([
    { id: "d1", title: "Sample Track 1", artist: "아티스트", cover_url: null, duration: "3:24" },
    { id: "d2", title: "Sample Track 2", artist: "아티스트", cover_url: null, duration: "2:58" },
    { id: "d3", title: "Sample Track 3", artist: "아티스트", cover_url: null, duration: "4:11" },
    { id: "d4", title: "Sample Track 4", artist: "아티스트", cover_url: null, duration: "3:45" },
    { id: "d5", title: "Sample Track 5", artist: "아티스트", cover_url: null, duration: "2:33" },
    { id: "d6", title: "Sample Track 6", artist: "아티스트", cover_url: null, duration: "3:07" },
  ]);
  const pad = isOpen ? 240 : 80;

  const topLevel = comments.filter(c => !c.parentId);
  const repliesMap = {};
  comments.filter(c => c.parentId).forEach(r => {
    if (!repliesMap[r.parentId]) repliesMap[r.parentId] = [];
    repliesMap[r.parentId].push(r);
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      currentUserRef.current = user;
    });
  }, []);

  useEffect(() => {
    setTrack(null);
    setComments([]);
  }, [trackId]);

  useEffect(() => {
    if (!trackId) return;
    let mounted = true;
    Promise.allSettled([
      supabase.from("likes").select("*", { count: "exact", head: true }).eq("track_id", trackId),
      supabase.from("tracks").select("id, title, artist, cover_url, duration, audio_url, profiles(username)").eq("type", "song").neq("id", trackId).order("created_at", { ascending: false }).limit(6),
      supabase.from("tracks").select("id").eq("type", "song").order("created_at", { ascending: false }).limit(20),
    ]).then(([likesCount, recommended, tList]) => {
      if (!mounted) return;
      if (likesCount.status === "fulfilled") setLikeCount(likesCount.value.count ?? 0);
      if (recommended.status === "fulfilled" && recommended.value.data?.length) setRecommendedTracks(recommended.value.data);
      if (tList.status === "fulfilled" && tList.value.data) setTrackList(tList.value.data.map(t => t.id));
    });
    return () => { mounted = false; };
  }, [trackId]);

  useEffect(() => {
    if (!trackId || !currentUser) return;
    supabase.from("likes").select("id")
      .eq("user_id", currentUser.id).eq("track_id", trackId)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [trackId, currentUser?.id]);

  useEffect(() => {
    const ids = (track?.collaborators ?? []).filter(Boolean);
    if (!ids.length) { setCollaborators([]); return; }
    supabase.from("profiles").select("id, username, avatar_url, handle")
      .in("id", ids)
      .then(({ data }) => setCollaborators(data ?? []));
  }, [track?.id]);

  useEffect(() => {
    if (!trackId) return;
    fetchTrackById(trackId).then(({ data }) => {
      if (data) {
        setTrack(prev => ({
          ...prev,
          ...data,
          artist: data.profiles?.username ?? data.artist ?? "아티스트",
          grad: data.cover_url
            ? "linear-gradient(135deg,#1a1a1a,#0a0a0a)"
            : "linear-gradient(135deg,#be185d,#4c0519)",
          uploadTime: data.created_at ?? "",
        }));
      }
    });
  }, [trackId]);


  useEffect(() => {
    if (!track) return;
    if (currentTrack?.id === track.id) return;
    playTrack({
      id: track.id,
      title: track.title ?? "",
      artist: track.artist ?? "아티스트",
      grad: track.grad ?? "linear-gradient(135deg,#be185d,#4c0519)",
      cover_url: track.cover_url ?? null,
      audio_url: track.audio_url ?? null,
    }, navState?.trackList?.length > 0 ? navState.trackList : undefined);
  }, [track?.id]);

  useEffect(() => {
    if (!currentTrack) return;
    if (!track) return;
    if (currentTrack.id === trackId) return;
    navigate(`/song/${currentTrack.id}`, { state: { track: currentTrack, trackList: queue }, replace: true });
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!trackId) { setCommentsLoading(false); return; }
    let mounted = true;

    async function loadComments() {
      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user?.id ?? null;
      const [{ data: trackData }, { data, error }] = await Promise.all([
        supabase.from("tracks").select("author_id").eq("id", trackId).single(),
        supabase.from("comments")
          .select("id, parent_id, author_id, content, created_at, profiles(username, avatar_url)")
          .eq("track_id", trackId)
          .order("created_at", { ascending: true }),
      ]);
      if (!mounted) return;
      const ownerAuthorId = trackData?.author_id ?? null;
      ownerAuthorIdRef.current = ownerAuthorId;
      if (!error && data) setComments(sortNewest(data.map((row, i) => mapComment(row, myId, ownerAuthorId, i))));
      setCommentsLoading(false);
    }

    loadComments();

    const channel = supabase
      .channel(`comments:${trackId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `track_id=eq.${trackId}` },
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
        { event: "DELETE", schema: "public", table: "comments", filter: `track_id=eq.${trackId}` },
        (payload) => {
          if (!mounted) return;
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "comments", filter: `track_id=eq.${trackId}` },
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

  async function toggleLike() {
    if (!currentUser) return;
    const next = !liked;
    setLiked(next);
    setLikeCount(n => next ? n + 1 : n - 1);
    if (next) {
      showToast(ml("k004"), "success", async () => {
        setLiked(false);
        setLikeCount(n => n - 1);
        await supabase.from("likes").delete().eq("user_id", currentUser.id).eq("track_id", trackId);
        showToast(ml("k001"), "info", undefined, "heart-off");
      }, "heart");
      await supabase.from("likes").insert({ user_id: currentUser.id, track_id: trackId });
    } else {
      await supabase.from("likes").delete().eq("user_id", currentUser.id).eq("track_id", trackId);
      showToast(ml("k001"), "info", async () => {
        setLiked(true);
        setLikeCount(n => n + 1);
        await supabase.from("likes").insert({ user_id: currentUser.id, track_id: trackId });
      });
    }
  }

  async function sendComment() {
    const text = input.trim();
    if (!text || !currentUser || !trackId || sendingRef.current) return;
    sendingRef.current = true;
    setInput("");
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ author_id: currentUser.id, track_id: trackId, content: text })
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
        .insert({ author_id: currentUser.id, track_id: trackId, content: text, parent_id: parentId })
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

  if (!track) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #FC3C44", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  const displayTrack = track ?? {};

  function fmt(s) {
    if (!s || !isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  function doPlay() {
    if (isCurrentTrack) { togglePlay(); }
    else { playTrack({ id: track?.id ?? trackId, title: displayTrack.title, artist: displayTrack.artist, grad: displayTrack.grad, cover_url: displayTrack.cover_url ?? null, audio_url: track?.audio_url ?? null }); }
  }

  function handleSeek(e) {
    const rect = progRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return;
    seek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
  }

  const genreLabel = (() => { const g = displayTrack.genre; if (!g) return null; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? null : g; } catch { return g; } } return g; })();

  return (
    <>
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div style={{ marginLeft: pad, transition: `margin-left ${DURATION} ${EASE}`, display: "grid", gridTemplateColumns: isOpen ? "440px 1fr" : "440px 1fr 280px", height: "100vh", overflow: "hidden" }}>


        {/* ── LEFT: player + up next ── */}
        <section ref={leftScrollRef} onScroll={e => setCueHidden(e.currentTarget.scrollTop > 40)} style={{ position: "relative", overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.08)", background: "#000000" }}>

          {/* Player content */}
          <div style={{ position: "relative", zIndex: 1, padding: "0 34px 0", minHeight: "calc(100vh - 40px)", boxSizing: "border-box" }}>

            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 80, marginBottom: 0 }}>
              <button onClick={() => navigate(-1)}
                style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", transition: "color 150ms" }}
                onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                {t("common.back")}
              </button>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={toggleLike}
                  style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", color: liked ? "#FC3C44" : "rgba(255,255,255,0.6)", transition: "background 150ms, color 150ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
                <button onClick={() => setShareOpen(true)}
                  style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.6)", transition: "background 150ms, color 150ms" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
                <button
                  style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.6)", transition: "background 150ms, color 150ms" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
                </button>
              </div>
            </div>

            {/* Square album cover */}
            <div style={{ width: "95%", aspectRatio: "1/1", margin: "0 auto", borderRadius: 16, overflow: "hidden", position: "relative", boxShadow: "0 30px 70px -22px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.08)", background: displayTrack.grad ?? "#1a1a1a" }}>
              {displayTrack.cover_url && <img loading="eager" decoding="async" src={displayTrack.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              {isThisPlaying && (
                <div style={{ position: "absolute", left: 14, bottom: 14, display: "flex", alignItems: "flex-end", gap: 3, height: 18, padding: "7px 9px", borderRadius: 999, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}>
                  <style>{`@keyframes eqBar{from{height:4px}to{height:16px}}.eq-i{width:3px;border-radius:2px;background:#FC3C44;animation:eqBar .9s ease-in-out infinite alternate}.eq-i:nth-child(2){animation-delay:-.3s}.eq-i:nth-child(3){animation-delay:-.6s}.eq-i:nth-child(4){animation-delay:-.15s}`}</style>
                  <i className="eq-i" style={{ height: 10 }} /><i className="eq-i" style={{ height: 16 }} /><i className="eq-i" style={{ height: 7 }} /><i className="eq-i" style={{ height: 13 }} />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div style={{ marginTop: 22 }}>
              <h1 style={{ margin: "13px 0 0", fontSize: "clamp(22px, 2vw, 30px)", fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.2, color: "#fff", wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {displayTrack.title}
              </h1>
              <div
                onClick={() => displayTrack.author_id && navigate(`/profile/${displayTrack.author_id}`, { state: { name: displayTrack.profiles?.username ?? displayTrack.artist, avatar_url: displayTrack.profiles?.avatar_url ?? null } })}
                style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 13, cursor: "pointer", padding: "5px 12px 5px 5px", borderRadius: 999, width: "fit-content", transition: "background 150ms" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#5ad7ff,#1e3a8a)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                  {displayTrack.profiles?.avatar_url ? <img loading="eager" decoding="async" src={displayTrack.profiles.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (displayTrack.artist?.[0] ?? "A").toUpperCase()}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff" }}>{displayTrack.artist}</span>
                  {displayTrack.uploadTime && (
                    <>
                      <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>·</span>
                      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>{new Intl.DateTimeFormat(i18n.language, { month: "long", day: "numeric" }).format(new Date(displayTrack.uploadTime))}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Scrubber */}
            <div style={{ marginTop: 22 }}>
              <div ref={progRef} onClick={handleSeek}
                style={{ position: "relative", height: 6, borderRadius: 999, background: "rgba(255,255,255,0.18)", cursor: "pointer", transition: "height 150ms" }}
                onMouseEnter={e => e.currentTarget.style.height = "9px"}
                onMouseLeave={e => e.currentTarget.style.height = "6px"}
              >
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 999, background: "rgba(255,255,255,0.7)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 11, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", letterSpacing: "0.01em" }}>{fmt(progress)}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "rgba(255,255,255,0.4)", letterSpacing: "0.01em" }}>-{fmt(Math.max(0, duration - progress))}</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginTop: 6, marginBottom: 4 }}>
              <button onClick={() => playPrev()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", opacity: 0.7, padding: "4px 10px" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
                <svg width="36" height="36" viewBox="0 0 22 22"><polygon points="10,4 2,11 10,18" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/><polygon points="19,4 11,11 19,18" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
              </button>
              <button onClick={doPlay} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 10px", opacity: 0.9 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.9}>
                {isThisPlaying
                  ? <svg width="44" height="44" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="2"/><rect x="14" y="4" width="4" height="16" rx="2"/></svg>
                  : <svg width="44" height="44" viewBox="0 0 24 24"><path fill="white" d="M6 4.5a1.5 1.5 0 0 1 2.28-1.28l12 7.5a1.5 1.5 0 0 1 0 2.56l-12 7.5A1.5 1.5 0 0 1 6 19.5z"/></svg>}
              </button>
              <button onClick={() => playNext()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", opacity: 0.7, padding: "4px 10px" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
                <svg width="36" height="36" viewBox="0 0 22 22"><polygon points="3,4 11,11 3,18" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/><polygon points="12,4 20,11 12,18" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>

          {/* Up Next (inline when sidebar open) */}
          {isOpen && (
            <div ref={upNextRef} style={{ position: "relative", zIndex: 1, padding: "26px 22px 44px", marginTop: 26 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "0 10px" }}>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff" }}>
                  {currentLang === "ko" ? "다음 트랙" : currentLang === "ja" ? "次のトラック" : "Up Next"}
                </span>
                <span
                  onClick={() => { const src = sessionStorage.getItem("playSource"); navigate(src === "recentlyPlayed" ? "/recently-played" : "/new-songs"); }}
                  style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", cursor: "pointer", transition: "color 150ms" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
                >
                  {currentLang === "ko" ? "전체 보기" : currentLang === "ja" ? "すべて見る" : "View All"}
                </span>
              </div>
              {upNextTracks.map((t, i) => (
                <RecommendedRow key={t.id} t={t} index={i} isPlaying={currentTrack?.id === t.id && isPlaying}
                  onPlay={track => playTrack({ id: track.id, title: track.title, artist: track.profiles?.username ?? track.artist ?? "아티스트", cover_url: track.cover_url ?? null, audio_url: track.audio_url ?? null })}
                />
              ))}
            </div>
          )}

          {/* Floating "next track" handle */}
          {isOpen && (
            <div style={{ position: "sticky", bottom: 10, zIndex: 5, display: "flex", justifyContent: "center", paddingRight: 16, pointerEvents: "none", marginTop: -76, opacity: cueHidden ? 0 : 1, transition: "opacity 150ms" }}>
              <button
                className="d-handle"
                onClick={() => upNextRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                aria-label="다음 트랙 열기"
                style={{
                  all: "unset", boxSizing: "border-box", cursor: "pointer", pointerEvents: cueHidden ? "none" : "auto",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "14px 18px 8px",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", color: "rgba(255,255,255,0.6)", transition: "color 150ms" }} className="d-lab">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "cueBob 1.3s ease-in-out infinite" }}><polyline points="6 9 12 15 18 9"/></svg>
                  {currentLang === "ko" ? `다음 트랙 ${upNextTracks.length}곡` : currentLang === "ja" ? `次のトラック ${upNextTracks.length}曲` : `Up Next · ${upNextTracks.length}`}
                </span>
                <style>{`@keyframes cueBob{0%,100%{transform:translateY(-2px)}50%{transform:translateY(2px)}}.d-handle:active{transform:scale(0.98);}.d-handle:hover .d-grip{background:rgba(255,255,255,0.45)!important;}.d-handle:hover .d-lab{color:#fff!important;}`}</style>
              </button>
            </div>
          )}

        </section>

        {/* ── RIGHT: comments ── */}
        <section style={{ display: "flex", flexDirection: "column", height: "100vh", minWidth: 0, background: "#000000" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 40px", height: 80, flexShrink: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>{t("comment.count")}</span>
            <span style={{ fontSize: 13, color: "#FC3C44", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{comments.length}</span>
          </div>

          {/* Scrollable panel */}
          <div style={{ flex: 1, overflowY: "auto", padding: "22px 40px 60px", minHeight: 0 }}>
            {/* Composer */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0 22px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "#FC3C44", display: "grid", placeItems: "center", overflow: "hidden" }}>
                {currentUserAvatar ? <img loading="eager" decoding="async" src={currentUserAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{appProfile?.username?.[0]?.toUpperCase() ?? "나"}</span>}
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 8px 0 16px", borderRadius: 999, background: "rgba(255,255,255,0.05)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                  onCompositionStart={() => { isComposing.current = true; }}
                  onCompositionEnd={() => { isComposing.current = false; }}
                  onKeyDown={e => { if (e.key === "Enter" && !isComposing.current) { e.preventDefault(); sendComment(); } }}
                  placeholder={currentUser ? t("comment.placeholder") : t("comment.placeholderLogin")}
                  disabled={!currentUser}
                  style={{ all: "unset", flex: 1, minWidth: 0, fontSize: 14, color: "#fff", opacity: currentUser ? 1 : 0.4 }}
                />
                <button onClick={sendComment}
                  style={{ all: "unset", cursor: input.trim() ? "pointer" : "not-allowed", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", background: input.trim() ? "#FC3C44" : "rgba(255,255,255,0.06)", flexShrink: 0, transition: "background 150ms" }}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
                </button>
              </div>
            </div>

            {/* Comments */}
            {commentsLoading ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13, paddingTop: 32 }}>{t("comment.loading")}</div>
            ) : comments.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: 14 }}>{t("comment.empty")}</div>
            ) : (
              topLevel.map(c => (
                <CommentItem key={c.id + currentLang} c={c} replies={repliesMap[c.id] ?? []}
                  onLike={likeComment} onDelete={deleteComment} onEdit={editComment}
                  onReply={sendReply} currentUser={currentUser} currentUserAvatar={currentUserAvatar}
                  lang={currentLang} />
              ))
            )}
          </div>
        </section>

        {/* ── RIGHT SIDEBAR: Up Next (only when sidebar collapsed) ── */}
        {!isOpen && (
        <section style={{ display: "flex", flexDirection: "column", height: "100vh", borderLeft: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 20px", height: 80, flexShrink: 0, background: "transparent", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff" }}>
              {currentLang === "ko" ? "다음 트랙" : currentLang === "ja" ? "次のトラック" : "Up Next"}
            </span>
            <span
              onClick={() => { const src = sessionStorage.getItem("playSource"); navigate(src === "recentlyPlayed" ? "/recently-played" : "/new-songs"); }}
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", cursor: "pointer", transition: "color 150ms" }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
            >
              {currentLang === "ko" ? "전체 보기" : currentLang === "ja" ? "すべて見る" : "View All"}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 40px" }}>
            {upNextTracks.map((t, i) => (
              <RecommendedRow key={t.id} t={t} index={i} isPlaying={currentTrack?.id === t.id && isPlaying}
                onPlay={track => playTrack({ id: track.id, title: track.title, artist: track.profiles?.username ?? track.artist ?? "아티스트", cover_url: track.cover_url ?? null, audio_url: track.audio_url ?? null })}
              />
            ))}
          </div>
        </section>
        )}

      </div>
    </div>
    <ShareModal
      isOpen={shareOpen}
      onClose={() => setShareOpen(false)}
      shareData={{
        type: displayTrack.type ?? "song",
        trackId: trackId,
        title: displayTrack.title,
        artist: displayTrack.artist,
        coverUrl: displayTrack.cover_url ?? null,
        grad: displayTrack.grad,
      }}
    />
    </>
  );
}
