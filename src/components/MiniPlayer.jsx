import { useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, Heart, ListPlus, Share2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useTranslation } from "react-i18next";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import cdImg from "../assets/_-removebg-preview.png";
import ShareModal from "./ShareModal";
import { ml } from "../lib/ml";

function CollapseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4 14 10 14 10 20"/>
      <polyline points="20 10 14 10 14 4"/>
      <line x1="14" y1="10" x2="21" y2="3"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  );
}

function SkipPrevIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      <polygon points="10,4 2,11 10,18" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <polygon points="19,4 11,11 19,18" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function SkipNextIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22">
      <polygon points="3,4 11,11 3,18" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <polygon points="12,4 20,11 12,18" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Waveform({ isPlaying, width = 120 }) {
  const bars = useMemo(() =>
    Array.from({ length: 20 }, () => ({
      h: Math.random() * 24 + 4,
      dur: (Math.random() * 0.5 + 0.35).toFixed(2),
      delay: (Math.random() * 0.5).toFixed(2),
    })), []
  );

  const color = isPlaying ? "#FC3C44" : "rgba(255,255,255,0.3)";
  const barW = 3, gap = 2, svgH = 36, centerY = 18;

  return (
    <>
      <style>{`
        @keyframes waveBar {
          0%   { transform: scaleY(1); }
          100% { transform: scaleY(0.15); }
        }
      `}</style>
      <svg width={width} height={svgH} viewBox="0 0 120 36" style={{ display: "block" }}>
        {bars.map((bar, i) => {
          const x = i * (barW + gap) + barW / 2;
          return (
            <line
              key={i}
              x1={x} y1={centerY - bar.h / 2}
              x2={x} y2={centerY + bar.h / 2}
              stroke={color}
              strokeWidth={barW}
              strokeLinecap="round"
              style={{
                transition: "stroke 300ms",
                ...(isPlaying ? {
                  animation: `waveBar ${bar.dur}s ${bar.delay}s ease-in-out infinite alternate`,
                  transformBox: "fill-box",
                  transformOrigin: "center",
                } : {}),
              }}
            />
          );
        })}
      </svg>
    </>
  );
}

let _mpCdDeg = 0;
let _mpCdLastTs = null;

function CDPlayer({ coverUrl, grad, isPlaying, size = 288 }) {
  const imgRef   = useRef(null);
  const coverRef = useRef(null);
  const rafRef   = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      _mpCdLastTs = null;
      return;
    }
    const t0 = `rotate(${_mpCdDeg}deg)`;
    if (imgRef.current)   imgRef.current.style.transform   = t0;
    if (coverRef.current) coverRef.current.style.transform = t0;
    const animate = ts => {
      if (_mpCdLastTs !== null) {
        _mpCdDeg = (_mpCdDeg + ((ts - _mpCdLastTs) / 4000) * 360) % 360;
        const t = `rotate(${_mpCdDeg}deg)`;
        if (imgRef.current)   imgRef.current.style.transform   = t;
        if (coverRef.current) coverRef.current.style.transform = t;
      }
      _mpCdLastTs = ts;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <img loading="eager" decoding="async" ref={imgRef} src={cdImg} alt="cd" style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        objectFit: "contain",
        transformOrigin: "center center",
        zIndex: 1,
        mixBlendMode: "screen",
      }} />
      {coverUrl && (
        <div ref={coverRef} style={{
          position: "absolute", inset: 0,
          zIndex: 2,
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
          maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
          transformOrigin: "center center",
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
        borderRadius: "50%", overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
        WebkitMaskImage: "radial-gradient(circle, transparent 18%, black 19%)",
        maskImage: "radial-gradient(circle, transparent 18%, black 19%)",
      }} />
    </div>
  );
}

function TruncTitle({ text, maxWidth }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = text;
    if (el.scrollWidth <= el.clientWidth) return;
    let lo = 0, hi = text.length;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      el.textContent = text.slice(0, mid) + "..";
      if (el.scrollWidth <= el.clientWidth) lo = mid;
      else hi = mid;
    }
    el.textContent = text.slice(0, lo) + "..";
  }, [text, maxWidth]);
  return <span ref={ref} style={{ overflow: "hidden", whiteSpace: "nowrap", minWidth: 0 }}>{text}</span>;
}

function formatSec(s) {
  if (!s || !isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function MiniPlayer() {
  const { currentTrack, isPlaying, progress, duration, sidebarPlayer, setSidebarPlayer, togglePlay, seek, toggleLike, isLiked, queue, playNext, playPrev } = usePlayer();
  const liked = isLiked(currentTrack);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ bottom: 0, right: 0 });
  const [playlists, setPlaylists] = useState([]);
  const [showPlSub, setShowPlSub] = useState(false);
  const [subPos, setSubPos] = useState({ bottom: 0, right: 0 });
  const plItemRef = useRef(null);
  const subMenuRef = useRef(null);
  const plHideTimer = useRef(null);

  async function handleLikeToast(e) {
    e?.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid || !currentTrack?.id) { toggleLike(currentTrack); return; }
    const next = !liked;
    toggleLike(currentTrack);
    if (next) {
      await supabase.from("likes").insert({ user_id: uid, track_id: currentTrack.id });
      showToast(ml("k004"), "success", async () => {
        toggleLike(currentTrack);
        await supabase.from("likes").delete().eq("user_id", uid).eq("track_id", currentTrack.id);
      }, "heart");
    } else {
      await supabase.from("likes").delete().eq("user_id", uid).eq("track_id", currentTrack.id);
      showToast(ml("k001"), "info", async () => {
        toggleLike(currentTrack);
        await supabase.from("likes").insert({ user_id: uid, track_id: currentTrack.id });
      }, "heart-off");
    }
  }

  async function fetchPlaylists() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase.from("playlists").select("id, title, cover_url").eq("author_id", session.user.id).order("created_at", { ascending: false });
    setPlaylists(data ?? []);
  }

  function handlePlEnter() {
    clearTimeout(plHideTimer.current);
    setShowPlSub(true);
    if (playlists.length === 0) fetchPlaylists();
    const itemRect = plItemRef.current?.getBoundingClientRect();
    if (itemRect) setSubPos({ bottom: window.innerHeight - itemRect.bottom, right: window.innerWidth - itemRect.left + 6 });
  }

  function handlePlLeave() {
    plHideTimer.current = setTimeout(() => setShowPlSub(false), 140);
  }

  async function addToPlaylist(playlistId) {
    if (!currentTrack?.id) return;
    const { data: existing } = await supabase.from("playlist_tracks").select("track_id").eq("playlist_id", playlistId).eq("track_id", currentTrack.id).maybeSingle();
    setMenuOpen(false); setShowPlSub(false);
    if (existing) {
      showToast(ml("k009"), "info");
      return;
    }
    const { data: last } = await supabase.from("playlist_tracks").select("position").eq("playlist_id", playlistId).order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("playlist_tracks").insert({ playlist_id: playlistId, track_id: currentTrack.id, position: (last?.position ?? 0) + 1 });
    if (error) {
      showToast(lang === "ko" ? "추가 실패" : "Failed", "error");
    } else {
      showToast(ml("k010"), "success", async () => {
        await supabase.from("playlist_tracks").delete().eq("playlist_id", playlistId).eq("track_id", currentTrack.id);
      });
    }
  }
  const [barLeft, setBarLeft] = useState(0);
  const [barRight, setBarRight] = useState(0);
  const [titleMaxWidth, setTitleMaxWidth] = useState(200);
  const [progressHover, setProgressHover] = useState(false);
  const [sidebarW, setSidebarW] = useState(() => sessionStorage.getItem("sidebar_open") === "0" ? 100 : 290);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const menuWrapRef = useRef(null);
  const progressBarRef = useRef(null);
  const playerRef = useRef(null);
  const artRef = useRef(null);
  const waveRef = useRef(null);

  useLayoutEffect(() => {
    function measure() {
      if (!playerRef.current || !artRef.current || !waveRef.current) return;
      const player = playerRef.current.getBoundingClientRect();
      const art = artRef.current.getBoundingClientRect();
      const wave = waveRef.current.getBoundingClientRect();
      setBarLeft(art.left - player.left);
      setBarRight(player.right - wave.left);
      setTitleMaxWidth(wave.left - 60 - art.right);
    }
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [currentTrack, sidebarPlayer]);

  useEffect(() => {
    function handler(e) {
      setSidebarW(e.detail.isOpen ? 290 : 100);
    }
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = e => {
      if (menuRef.current?.contains(e.target)) return;
      if (menuWrapRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);


  if (!currentTrack || sidebarPlayer) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  function handleProgressClick(e) {
    e.stopPropagation();
    const rect = progressBarRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(frac * duration);
  }


  function handleNavigate() {
    if (!currentTrack) return;
    if (currentTrack?.fromProject) return;
    if (currentTrack?.id) navigate(`/track/${currentTrack.id}`, { state: { track: currentTrack } });
    else navigate("/track", { state: { ...currentTrack } });
  }

  return (
    <>
    <div
      ref={playerRef}
      onClick={handleNavigate}
      style={{
        cursor: "pointer",
        position: "fixed",
        bottom: 18,
        left: "50%",
        transform: `translateX(calc(-50% - ${60 + (290 - sidebarW) * 0.5}px))`,
        transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)",
        width: "min(720px, calc(100% - 36px))",
        boxSizing: "border-box",
        borderRadius: 999,
        height: 68,
        background: "rgba(20,20,24,0.72)",
        backdropFilter: "blur(32px) saturate(140%)",
        WebkitBackdropFilter: "blur(32px) saturate(140%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 18px 50px -18px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.04)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        paddingLeft: 12,
        paddingRight: 12,
        zIndex: 100,
      }}
    >
      {/* Album art */}
      <div ref={artRef} style={{ flexShrink: 0 }}>
        <CDPlayer coverUrl={currentTrack?.cover_url} grad={currentTrack?.grad} isPlaying={!!currentTrack && isPlaying} size={48} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <TruncTitle text={currentTrack?.title ?? ""} />
          {currentTrack && liked && <Heart size={11} fill="#FC3C44" stroke="#FC3C44" style={{ flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.44)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
          {currentTrack?.artist ?? ""}
        </div>
      </div>

      {/* Center: prev / play / next */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); playPrev(); }}
          aria-label="이전"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 6px" }}
        >
          <SkipPrevIcon />
        </button>
        <button
          onClick={e => { e.stopPropagation(); togglePlay(); }}
          aria-label="재생"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "#fff", padding: "4px 6px" }}
        >
          {isPlaying ? <Pause size={26} fill="#fff" /> : <Play size={26} fill="#fff" />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); playNext(); }}
          aria-label="다음"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 6px" }}
        >
          <SkipNextIcon />
        </button>
      </div>

      {/* End: collapse + three-dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 6, flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); setSidebarPlayer(true); }}
          title={t("player.moveToSidebar")}
          aria-label="사이드바로 이동"
          style={{ all: "unset", cursor: "pointer", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.66)", transition: "color .2s, background .2s" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.66)"; e.currentTarget.style.background = "none"; }}
        >
          <CollapseIcon />
        </button>
        <div ref={menuWrapRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            ref={menuBtnRef}
            onClick={e => {
              e.stopPropagation();
              const rect = menuBtnRef.current?.getBoundingClientRect();
              if (rect) setMenuPos({ bottom: window.innerHeight - rect.top + 10, right: window.innerWidth - rect.right });
              setMenuOpen(v => !v);
            }}
            aria-label="더 보기"
            style={{ all: "unset", cursor: "pointer", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.66)", transition: "color .2s, background .2s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.66)"; e.currentTarget.style.background = "none"; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
          </button>
          {menuOpen && createPortal(
            <div
              ref={menuRef}
              onClick={e => e.stopPropagation()}
              style={{
                position: "fixed", bottom: menuPos.bottom, right: menuPos.right,
                background: "rgba(30,30,30,0.5)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "6px 0", minWidth: 160,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                zIndex: 9999,
              }}
            >
              {/* 좋아요 */}
              <button
                onClick={e => { e.stopPropagation(); handleLikeToast(e); setMenuOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", background: "none", border: "none", color: liked ? "#f472b6" : "#fff", fontSize: 13, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <Heart size={15} fill={liked ? "#f472b6" : "none"} stroke={liked ? "#f472b6" : "currentColor"} />
                {liked ? t("player.like") + " 취소" : t("player.like")}
              </button>
              {/* 플레이리스트 추가 (호버 서브메뉴) */}
              <div
                ref={plItemRef}
                onMouseEnter={handlePlEnter}
                onMouseLeave={handlePlLeave}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "10px 16px", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", background: showPlSub ? "rgba(255,255,255,0.07)" : "none", transition: "background 120ms" }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}><ListPlus size={15} />{t("player.addToPlaylist")}</span>
                <ChevronRight size={14} style={{ opacity: 0.5 }} />
              </div>
              {/* 공유 */}
              <button
                onClick={e => { e.stopPropagation(); setShareOpen(true); setMenuOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#fff", fontSize: 13, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <Share2 size={15} />{t("player.share")}
              </button>
            </div>,
            document.body
          )}
          {menuOpen && showPlSub && createPortal(
            <div
              ref={subMenuRef}
              onClick={e => e.stopPropagation()}
              onMouseEnter={handlePlEnter}
              onMouseLeave={handlePlLeave}
              style={{
                position: "fixed", bottom: subPos.bottom, right: subPos.right,
                background: "rgba(30,30,30,0.5)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "6px 0", minWidth: 180,
                maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 10000,
              }}
            >
              {playlists.length === 0 ? (
                <div style={{ padding: "10px 16px", fontSize: 12.5, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
                  {ml("k011")}
                </div>
              ) : playlists.map(pl => (
                <div key={pl.id} onClick={e => { e.stopPropagation(); addToPlaylist(pl.id); }}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 12px", fontSize: 13, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 6, flexShrink: 0, overflow: "hidden", background: pl.cover_url ? "#000" : "rgba(255,255,255,0.1)" }}>
                    {pl.cover_url && <img loading="eager" decoding="async" src={pl.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.title}</span>
                </div>
              ))}
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>


    <ShareModal
      isOpen={shareOpen}
      onClose={() => setShareOpen(false)}
      shareData={{
        type: currentTrack?.type ?? "song",
        trackId: currentTrack?.id,
        title: currentTrack?.title,
        artist: currentTrack?.artist,
        coverUrl: currentTrack?.cover_url ?? null,
        grad: currentTrack?.grad,
      }}
    />
    </>
  );
}
