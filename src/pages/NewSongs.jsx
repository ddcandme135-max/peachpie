import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import RightSidebar from "../components/RightSidebar";
import { useTranslation } from "react-i18next";
import cdImg from "../assets/_-removebg-preview.png";
import Sidebar from "../components/Sidebar";
import { usePlayer } from "../context/PlayerContext";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import { fetchTracks } from "../lib/api";
import ShareModal from "../components/ShareModal";
import NewTrackModal from "../components/NewTrackModal";
import { ml } from "../lib/ml";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";

export const GRAD_FALLBACKS = [
  "radial-gradient(circle at 50% 30%,rgba(255,255,255,.18),transparent 60%),linear-gradient(180deg,#b91c1c,#450a0a)",
  "radial-gradient(circle at 70% 30%,rgba(125,211,252,.35),transparent 55%),linear-gradient(135deg,#0c4a6e,#082f49 60%,#020617)",
  "radial-gradient(circle at 30% 70%,rgba(216,180,254,.4),transparent 55%),linear-gradient(135deg,#4c1d95,#1e1b4b)",
  "radial-gradient(circle at 60% 40%,rgba(110,231,183,.3),transparent 55%),linear-gradient(135deg,#064e3b,#0a0a0a)",
  "radial-gradient(circle at 40% 60%,rgba(254,215,170,.35),transparent 60%),linear-gradient(180deg,#92400e,#1c1917)",
  "radial-gradient(circle at 70% 30%,rgba(251,113,133,.4),transparent 55%),linear-gradient(135deg,#831843,#1f0815)",
  "radial-gradient(circle at 30% 30%,rgba(94,234,212,.35),transparent 55%),linear-gradient(135deg,#134e4a,#042f2e)",
  "radial-gradient(circle at 50% 50%,rgba(147,197,253,.3),transparent 60%),linear-gradient(135deg,#1e3a8a,#0c0a1f)",
];


export const SONG_HEADERS = [
  { label: "",      align: "left" },
  { label: "제목",   align: "left" },
  { label: "아티스트",align: "left", paddingLeft: 72 },
  { label: "시간",   align: "center" },
  { label: "",      align: "left" },
];

function SongActionMenu({ s, onOpenChange, isMe, onEdit, onDelete, onShare }) {
  const [open, setOpen]   = useState(false);
  const notify = (v) => { setOpen(v); onOpenChange?.(v); };
  const [liked, setLiked] = useState(false);
  const [pos, setPos]     = useState({ top: 0, right: 0 });
  const [playlists, setPlaylists]   = useState([]);
  const [showPlSub, setShowPlSub]   = useState(false);
  const [subPos, setSubPos]         = useState({ top: 0, right: 0 });
  const { playNext, setQueue } = usePlayer();
  const { session } = useApp();
  const { showToast } = useToast();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const btnRef      = useRef(null);
  const popupRef    = useRef(null);
  const plItemRef   = useRef(null);
  const subMenuRef  = useRef(null);
  const plHideTimer = useRef(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !s.id) return;
    supabase.from("likes").select("id").eq("user_id", userId).eq("track_id", s.id).maybeSingle()
      .then(({ data }) => { if (data) setLiked(true); });
  }, [session, s.id]);

  useEffect(() => {
    if (!open) return;
    const fn = e => {
      if (btnRef.current && !btnRef.current.contains(e.target) &&
          (!popupRef.current || !popupRef.current.contains(e.target)) &&
          (!subMenuRef.current || !subMenuRef.current.contains(e.target)))
        notify(false);
    };
    const updatePos = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popupH = popupRef.current?.offsetHeight ?? 180;
      const top = window.innerHeight - rect.bottom < popupH + 8
        ? rect.top - popupH - 4
        : rect.bottom + 4;
      setPos({ top: Math.max(8, top), right: window.innerWidth - rect.right });
    };
    document.addEventListener("mousedown", fn);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", fn);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  function handleOpen(e) {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) { notify(!open); return; }
    const popupH = 180;
    const top = window.innerHeight - rect.bottom < popupH + 8
      ? rect.top - popupH - 4
      : rect.bottom + 4;
    setPos({ top: Math.max(8, top), right: window.innerWidth - rect.right });
    notify(!open);
  }

  async function handleLike(e) {
    e.stopPropagation();
    const userId = session?.user?.id;
    if (!userId) return;
    const next = !liked;
    setLiked(next);
    if (next) {
      await supabase.from("likes").insert({ user_id: userId, track_id: s.id });
      showToast(ml("k004"), "success", async () => {
        setLiked(false);
        await supabase.from("likes").delete().eq("user_id", userId).eq("track_id", s.id);
      }, "heart");
    } else {
      await supabase.from("likes").delete().eq("user_id", userId).eq("track_id", s.id);
      showToast(ml("k001"), "info", async () => {
        setLiked(true);
        await supabase.from("likes").insert({ user_id: userId, track_id: s.id });
      }, "heart-off");
    }
  }

  async function fetchPlaylists() {
    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess?.user) return;
    const { data } = await supabase.from("playlists").select("id, title, cover_url").eq("author_id", sess.user.id).order("created_at", { ascending: false });
    setPlaylists(data ?? []);
  }

  function handlePlEnter() {
    clearTimeout(plHideTimer.current);
    setShowPlSub(true);
    if (playlists.length === 0) fetchPlaylists();
    const itemRect = plItemRef.current?.getBoundingClientRect();
    const popupRect = popupRef.current?.getBoundingClientRect();
    if (itemRect && popupRect) {
      setSubPos({ top: pos.top, right: window.innerWidth - popupRect.left + 4 });
    }
  }

  function handlePlLeave() {
    plHideTimer.current = setTimeout(() => setShowPlSub(false), 120);
  }

  async function addToPlaylist(playlistId) {
    const { data: { session: sess } } = await supabase.auth.getSession();
    if (!sess?.user) return;
    const { data: existing } = await supabase.from("playlist_tracks").select("track_id").eq("playlist_id", playlistId).eq("track_id", s.id).maybeSingle();
    if (existing) {
      notify(false);
      showToast(ml("k009"), "info");
      return;
    }
    const { data: last } = await supabase.from("playlist_tracks").select("position").eq("playlist_id", playlistId).order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("playlist_tracks").insert({ playlist_id: playlistId, track_id: s.id, position: (last?.position ?? 0) + 1 });
    notify(false);
    if (error) {
      showToast(lang === "ko" ? "추가 실패: " + error.message : "Failed: " + error.message, "error");
    } else {
      showToast(ml("k010"), "success", async () => {
        await supabase.from("playlist_tracks").delete().eq("playlist_id", playlistId).eq("track_id", s.id);
      });
    }
  }

  function handlePlayNext(e) {
    e.stopPropagation();
    const track = { id: s.id, title: s.title, artist: s.artist, author_id: s.author_id, cover_url: s.cover_url, audio_url: s.audio_url, grad: s.grad, genre: s.genre, duration: s.duration };
    playNext(track);
    showToast(ml("k008"), "success", () => {
      setQueue(prev => { const i = prev.findIndex(t => t.id === s.id); return i !== -1 ? prev.filter((_, idx) => idx !== i) : prev; });
    });
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{ width: 28, height: 28, borderRadius: 8, background: open ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "inherit" }}
      >···</button>
      {open && (
        <div ref={popupRef} onClick={e => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, right: pos.right, background: "rgba(20,20,22,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 4, minWidth: 140, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 9999 }}
        >
          {isMe && onEdit && <div onClick={e => { e.stopPropagation(); notify(false); onEdit(); }} style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>{ml("k035")}</div>}
          {isMe && onDelete && <div onClick={e => { e.stopPropagation(); notify(false); onDelete(); }} style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#FC3C44", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(252,60,68,0.08)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>{ml("k015")}</div>}
          {!isMe && <div onClick={handleLike} style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: liked ? "#f472b6" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{ml("k036")}</div>}
          <div onClick={e => { e.stopPropagation(); notify(false); onShare?.(); }} style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {ml("k037")}
          </div>
          {!isMe && (
            <div ref={plItemRef} onMouseEnter={handlePlEnter} onMouseLeave={handlePlLeave}
              style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: showPlSub ? "rgba(255,255,255,0.07)" : "transparent", transition: "background 120ms" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/><line x1="19" y1="15" x2="19" y2="21"/><line x1="16" y1="18" x2="22" y2="18"/></svg>
                {ml("k038")}
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          )}
          {!isMe && <div onClick={handlePlayNext} style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>{ml("k039")}</div>}
        </div>
      )}
      {open && showPlSub && (
            <div
              ref={subMenuRef}
              onMouseEnter={() => clearTimeout(plHideTimer.current)}
              onMouseLeave={() => setShowPlSub(false)}
              style={{ position: "fixed", top: subPos.top, right: subPos.right, background: "rgba(20,20,22,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 4, minWidth: 180, maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 10000 }}
            >
              {playlists.length === 0 ? (
                <div style={{ padding: "10px 12px", fontSize: 12.5, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
                  {ml("k011")}
                </div>
              ) : playlists.map(pl => (
                <div key={pl.id} onClick={e => { e.stopPropagation(); addToPlaylist(pl.id); }}
                  style={{ padding: "7px 10px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 6, overflow: "hidden", background: pl.cover_url ? "#000" : "rgba(255,255,255,0.08)", flexShrink: 0, display: "grid", placeItems: "center" }}>
                    {pl.cover_url
                      ? <img loading="eager" decoding="async" src={pl.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    }
                  </div>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.title}</span>
                </div>
              ))}
            </div>
          )}
    </>
  );
}
export function TruncTitle({ text, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function fit() {
      el.textContent = text ?? "";
      if (el.scrollWidth <= el.clientWidth) return;
      let lo = 0, hi = (text ?? "").length;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        el.textContent = text.slice(0, mid) + "..";
        if (el.scrollWidth <= el.clientWidth) lo = mid;
        else hi = mid;
      }
      el.textContent = text.slice(0, lo) + "..";
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  return <div ref={ref} style={{ whiteSpace: "nowrap", overflow: "hidden", ...style }}>{text}</div>;
}

export function SongRow({ s, isNew, isMe, onEdit, onDelete, sidebarOpen, showGenre, source, onShare, hideDuration, noPad }) {
  const [hov, setHov] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { playTrack } = usePlayer();
  const navigate = useNavigate();

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => {
        if (source) sessionStorage.setItem("playSource", source);
        playTrack({ id: s.id, title: s.title, artist: s.artist, cover_url: s.cover_url, audio_url: s.audio_url, grad: s.grad, type: s.type, genre: s.genre, duration: s.duration });
      }}
      style={{
        display: "grid",
        gridTemplateColumns: hideDuration ? (showGenre ? "68px 1fr 1fr 1fr 32px" : "68px 1fr 1fr 32px") : (showGenre ? "68px 1fr 1fr 1fr 60px 32px" : "68px 1fr 1fr 60px 32px"),
        gap: 14,
        alignItems: "center",
        padding: "9px 12px",
        borderRadius: 10,
        cursor: "pointer",
        background: hov || menuOpen ? "rgba(255,255,255,0.04)" : "transparent",
        transition: "background 150ms",
      }}
    >
      <div style={{ width: 58, height: 58, position: "relative", flexShrink: 0 }}>
        <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} />
        {/* 그라데이션 베이스 — 커버 로딩 중에도 빈 CD가 아닌 색 디스크 표시 */}
        <div style={{ position: "absolute", inset: 0, zIndex: 2, background: s.grad ?? GRAD_FALLBACKS[0], WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)", maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)" }} />
        {s.cover_url && (
          <img src={s.cover_url} alt="" loading="eager" decoding="async" fetchpriority="high" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 3, WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)", maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", borderRadius: "50%", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)", WebkitMaskImage: "radial-gradient(circle, transparent 18%, black 19%)", maskImage: "radial-gradient(circle, transparent 18%, black 19%)" }} />
      </div>

      <div style={{ minWidth: 0 }}>
        <TruncTitle text={s.title} style={{ fontSize: 14.5, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }} />
        {isNew && <span style={{ fontSize: 10, fontWeight: 700, color: "#FC3C44", letterSpacing: "0.04em", marginTop: 2, display: "block" }}>NEW</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", minWidth: 0, paddingLeft: noPad ? 0 : (sidebarOpen ? 96 : 120), transition: `padding-left ${DURATION} ${EASE}` }}>
        <div
          onClick={e => { e.stopPropagation(); if (s.author_id) navigate(`/profile/${s.author_id}`); }}
          style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: s.author_id ? "pointer" : "default", transition: "color 120ms" }}
          onMouseEnter={e => { if (s.author_id) e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.55)"}
        >{s.artist}</div>
      </div>

      {showGenre && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          {s.genre && s.genre !== "—"
            ? <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>{s.genre}</span>
            : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12.5 }}>—</span>
          }
        </div>
      )}

      {!hideDuration && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{s.duration ?? "—"}</div>}

      <div onClick={e => e.stopPropagation()}>
        <SongActionMenu s={s} isMe={isMe} onEdit={onEdit} onDelete={onDelete} onShare={onShare} onOpenChange={setMenuOpen} />
      </div>
    </div>
  );
}

export default function NewSongs() {
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [editTrack, setEditTrack] = useState(null);
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const { session } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { state } = useLocation();
  const pad = isOpen ? 220 : 90;

  // 페이지 진입 시 스크롤 최상단으로
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // 프로필 온보딩 등에서 openUpload로 진입 시 업로드 모달 자동 오픈
  useEffect(() => {
    if (state?.openUpload) {
      setUploadOpen(true);
      navigate(".", { replace: true, state: null });
    }
  }, [state?.openUpload]);

  useEffect(() => {
    setLoading(true);
    fetchTracks({ limit: 25 }).then(({ data }) => {
      // 커버 미리 로드(캐시 워밍) → 렌더 시 바로 표시
      (data ?? []).forEach(t => { if (t.cover_url) { const img = new Image(); img.src = t.cover_url; } });
      setTracks((data ?? []).map((t, i) => ({
        ...t,
        artist: t.profiles?.username ?? t.profiles?.handle ?? t.artist ?? "아티스트",
        grad: GRAD_FALLBACKS[i % GRAD_FALLBACKS.length],
        genre: (() => { const g = Array.isArray(t.genre) ? t.genre[0] : t.genre; if (!g) return "—"; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "—" : g; } catch { return g; } } return g; })(),
        duration: (() => { const d = t.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const sec = typeof d === "number" ? d : parseInt(d, 10); return isNaN(sec) ? "—" : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; })(),
      })));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("new-songs-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tracks" }, async (payload) => {
        const t = payload.new;
        if (t.type !== "song") return;
        let artist = t.artist ?? "아티스트";
        if (t.author_id) {
          const { data: prof } = await supabase.from("profiles").select("username, handle").eq("id", t.author_id).maybeSingle();
          artist = prof?.username ?? prof?.handle ?? artist;
        }
        const norm = {
          ...t,
          artist,
          grad: GRAD_FALLBACKS[0],
          genre: (() => { const g = Array.isArray(t.genre) ? t.genre[0] : t.genre; if (!g) return "—"; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "—" : g; } catch { return g; } } return g; })(),
          duration: (() => { const d = t.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const sec = typeof d === "number" ? d : parseInt(d, 10); return isNaN(sec) ? "—" : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; })(),
        };
        setTracks(prev => [norm, ...prev.filter(x => x.id !== norm.id)].slice(0, 25));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tracks" }, (payload) => {
        setTracks(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const myId = session?.user?.id;

  return (
    <div style={{ minHeight: "100vh", background: "#000000" }}>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <ShareModal isOpen={!!shareData} onClose={() => setShareData(null)} shareData={shareData} />
      <NewTrackModal
        open={!!editTrack || uploadOpen}
        onClose={() => { setUploadOpen(false); setEditTrack(null); }}
        editData={editTrack}
        onSaved={saved => {
          if (!saved) return;
          const norm = {
            ...saved,
            artist: saved.profiles?.username ?? saved.artist ?? "아티스트",
            grad: GRAD_FALLBACKS[0],
            genre: (() => { const g = Array.isArray(saved.genre) ? saved.genre[0] : saved.genre; if (!g) return "—"; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "—" : g; } catch { return g; } } return g; })(),
            duration: (() => { const d = saved.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const sec = typeof d === "number" ? d : parseInt(d, 10); return isNaN(sec) ? "—" : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; })(),
          };
          if (editTrack) {
            setTracks(prev => prev.map(t => t.id === norm.id ? { ...t, ...norm } : t));
          } else {
            setTracks(prev => [norm, ...prev].slice(0, 25));
          }
          setUploadOpen(false);
          setEditTrack(null);
        }}
      />

      <div style={{ marginLeft: pad, transition: `margin-left ${DURATION} ${EASE}`, display: "flex", alignItems: "flex-start", minWidth: 900 }}>
        <main style={{ flex: 1, minWidth: 0, paddingBottom: 96 }}>
          <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(22px) saturate(150%)", WebkitBackdropFilter: "blur(22px) saturate(150%)" }}>
            <div style={{ padding: "20px 24px 14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => navigate(-1)}
                  style={{ all: "unset", cursor: "pointer", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0, transition: "background 120ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
                </button>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em" }}>{ml("k121")}</h1>
              </div>
              {myId && (
                <button onClick={() => setUploadOpen(true)}
                  style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 18px", borderRadius: 999, background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em", border: "1px solid rgba(255,255,255,0.12)", transition: "background 150ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  {ml("k026")}
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: "0 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: !isOpen ? "68px 1fr 1fr 1fr 60px 32px" : "68px 1fr 1fr 60px 32px", gap: 14, padding: "6px 12px", marginBottom: 4, marginTop: 40, transition: "grid-template-columns 200ms" }}>
              {[
                { label: "" },
                { label: ml("k122") },
                { label: ml("k006") },
                ...(!isOpen ? [{ label: ml("k003") }] : []),
                { label: ml("k123") },
                { label: "" },
              ].map((h, i) => (
                <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", paddingLeft: i === 2 ? (isOpen ? 96 : 120) : 0, textAlign: ((!isOpen && i === 3) || (!isOpen ? i === 4 : i === 3)) ? "center" : "left", transition: i === 2 ? `padding-left ${DURATION} ${EASE}` : undefined }}>{h.label}</div>
              ))}
            </div>

            {loading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "68px 1fr 1fr 60px 32px", gap: 14, padding: "10px 12px", alignItems: "center" }}>
                  <div style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                  <div style={{ height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                  <div style={{ height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                  <div style={{ height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                  <div />
                </div>
              ))
            ) : tracks.map((s, i) => (
              <div key={s.id} style={{ borderBottom: i < tracks.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                <SongRow
                  s={s}
                  isMe={myId === s.author_id}
                  sidebarOpen={isOpen}
                  showGenre={!isOpen}
                  source="new-songs"
                  onEdit={() => setEditTrack({ id: s.id, title: s.title, genre: s.genre, cover_url: s.cover_url, audio_url: s.audio_url, audio_name: s.audio_name ?? null, duration: s.duration })}
                  onDelete={async () => {
                    const { data: snapshot } = await supabase.from("tracks").select("*").eq("id", s.id).single();
                    await supabase.from("tracks").delete().eq("id", s.id);
                    setTracks(prev => prev.filter(t => t.id !== s.id));
                    showToast(lang === "ko" ? "음원을 삭제했습니다" : "Track deleted", "info", snapshot ? async () => {
                      const { id: _, ...data } = snapshot;
                      const { data: restored } = await supabase.from("tracks").insert({ ...data, id: s.id }).select().single();
                      if (restored) setTracks(prev => [{ ...s }, ...prev]);
                    } : undefined);
                  }}
                  onShare={() => setShareData({ type: "track", trackId: s.id, title: s.title, coverUrl: s.cover_url, artist: s.artist })}
                />
              </div>
            ))}
          </div>
        </main>
        <RightSidebar width={320} activeTab="songs" page="new-songs" />
      </div>
    </div>
  );
}
