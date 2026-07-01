import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import cdImg from "../assets/_-removebg-preview.png";
import theWeekendImg from "../assets/The Weekend.png";
import drakeImg from "../assets/Kendrick.png";
import metroImg from "../assets/Metro Boomin.png";
import tylerImg from "../assets/Tyler the creator.png";
import stievieLacyImg from "../assets/Stievie Lacy.jpeg";
import tameImpalaImg from "../assets/Tame Impala.jpeg";
import { ChevronRight } from "lucide-react";
import HeroBanner from "../components/HeroBanner";
import MobileHome from "../components/MobileHome";
import Sidebar from "../components/Sidebar";
import ShareModal from "../components/ShareModal";
import NewProjectModal from "../components/NewProjectModal";
import { usePlayer } from "../context/PlayerContext";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { setCache } from "../lib/cache";
import { TruncTitle } from "./NewSongs";
import { ml } from "../lib/ml";
import { fetchForYou } from "../lib/api";
import { preloadCovers } from "../lib/preloadCovers";

const CATEGORY_LABEL = {
  "VOCAL":            "보컬",
  "PRODUCER":         "프로듀서",
  "LYRIC":            "작사&작곡",
  "FEATURING":        "피처링",
  "MIXING/MASTERING": "믹싱&마스터링",
  "SESSION":          "세션",
};

const ARTS = {
  1:  "radial-gradient(circle at 30% 40%,rgba(250,200,100,.4),transparent 50%),radial-gradient(circle at 70% 70%,rgba(200,80,80,.35),transparent 55%),linear-gradient(135deg,#1f2937,#0a0a0a)",
  2:  "radial-gradient(circle at 50% 30%,rgba(255,255,255,.18),transparent 60%),linear-gradient(180deg,#b91c1c,#450a0a)",
  3:  "radial-gradient(circle at 70% 30%,rgba(125,211,252,.35),transparent 55%),linear-gradient(135deg,#0c4a6e,#082f49 60%,#020617)",
  4:  "radial-gradient(circle at 30% 70%,rgba(216,180,254,.4),transparent 55%),linear-gradient(135deg,#4c1d95,#1e1b4b)",
  5:  "radial-gradient(circle at 60% 40%,rgba(110,231,183,.3),transparent 55%),linear-gradient(135deg,#064e3b,#0a0a0a)",
  6:  "radial-gradient(circle at 40% 60%,rgba(254,215,170,.35),transparent 60%),linear-gradient(180deg,#92400e,#1c1917)",
  7:  "radial-gradient(circle at 70% 30%,rgba(251,113,133,.4),transparent 55%),linear-gradient(135deg,#831843,#1f0815)",
  8:  "radial-gradient(circle at 30% 30%,rgba(94,234,212,.35),transparent 55%),linear-gradient(135deg,#134e4a,#042f2e)",
  9:  "radial-gradient(circle at 50% 50%,rgba(147,197,253,.3),transparent 60%),linear-gradient(135deg,#1e3a8a,#0c0a1f)",
  10: "radial-gradient(circle at 60% 30%,rgba(245,245,244,.25),transparent 60%),linear-gradient(135deg,#44403c,#0c0a09)",
  11: "radial-gradient(circle at 30% 70%,rgba(251,146,60,.4),transparent 55%),linear-gradient(135deg,#7c2d12,#1c0a05)",
  12: "radial-gradient(circle at 70% 70%,rgba(167,139,250,.4),transparent 60%),linear-gradient(135deg,#312e81,#020617)",
  13: "linear-gradient(180deg,#fef3c7,#f59e0b 50%,#78350f)",
  14: "radial-gradient(circle at 50% 30%,rgba(156,163,175,.3),transparent 55%),linear-gradient(135deg,#374151,#111827)",
  15: "radial-gradient(circle at 40% 60%,rgba(251,207,232,.35),transparent 55%),linear-gradient(135deg,#be185d,#4c0519)",
};


const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";

const GRAD_FALLBACKS = [
  "radial-gradient(circle at 50% 30%,rgba(255,255,255,.18),transparent 60%),linear-gradient(180deg,#b91c1c,#450a0a)",
  "radial-gradient(circle at 70% 30%,rgba(125,211,252,.35),transparent 55%),linear-gradient(135deg,#0c4a6e,#082f49 60%,#020617)",
  "radial-gradient(circle at 30% 70%,rgba(216,180,254,.4),transparent 55%),linear-gradient(135deg,#4c1d95,#1e1b4b)",
  "radial-gradient(circle at 60% 40%,rgba(110,231,183,.3),transparent 55%),linear-gradient(135deg,#064e3b,#0a0a0a)",
  "radial-gradient(circle at 40% 60%,rgba(254,215,170,.35),transparent 60%),linear-gradient(180deg,#92400e,#1c1917)",
  "radial-gradient(circle at 70% 30%,rgba(251,113,133,.4),transparent 55%),linear-gradient(135deg,#831843,#1f0815)",
  "radial-gradient(circle at 30% 30%,rgba(94,234,212,.35),transparent 55%),linear-gradient(135deg,#134e4a,#042f2e)",
  "radial-gradient(circle at 50% 50%,rgba(147,197,253,.3),transparent 60%),linear-gradient(135deg,#1e3a8a,#0c0a1f)",
];

function SectionHead({ title, arrow, onArrowClick, onPlus, plusLabel = "추가" }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div
        className="flex items-center gap-1.5"
        onClick={arrow ? onArrowClick : undefined}
        onMouseEnter={() => arrow && setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={arrow ? { cursor: "pointer" } : undefined}
      >
        <h2
          className="text-[26px] font-bold tracking-[-0.02em]"
          style={{ transition: "opacity 150ms", opacity: hov ? 0.7 : 1 }}
        >
          {title}
        </h2>
        {arrow && (
          <ChevronRight
            size={24}
            className="mb-[-2px]"
            style={{
              color: hov ? "#fff" : "rgba(255,255,255,0.6)",
              transform: hov ? "translateX(3px)" : "translateX(0)",
              transition: "color 150ms, transform 150ms",
            }}
          />
        )}
      </div>
      {onPlus && (
        <button
          type="button"
          onClick={onPlus}
          style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 22px", cursor: "pointer", borderRadius: 999, background: "#FF5A4D", color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", boxShadow: "0 10px 24px -8px rgba(255,90,77,0.5)", transition: "background 240ms", whiteSpace: "nowrap", flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = "#FF6B61"}
          onMouseLeave={e => e.currentTarget.style.background = "#FF5A4D"}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          {plusLabel}
        </button>
      )}
    </div>
  );
}

function AlbumCard({ art, genre }) {
  return (
    <div className="cursor-pointer group" style={{ minWidth: 180 }}>
      <div
        className="w-full aspect-square rounded-xl transition-all duration-150 group-hover:-translate-y-0.5"
        style={{ background: ARTS[art] }}
      />
      <div className="pt-3 px-0.5">
        <span className="text-[16px] font-medium text-white">{genre}</span>
      </div>
    </div>
  );
}

function CollaboCard({ id, art, cover_url, position, title, artist }) {
  const navigate = useNavigate();
  const bgStyle = cover_url
    ? { backgroundImage: `url(${cover_url})`, backgroundSize: "cover", backgroundPosition: "center", height: 200 }
    : { background: ARTS[art] ?? ARTS[7], height: 200 };
  function handleClick() {
    if (id) navigate(`/project/${id}`, { state: { project: { id, title, artist, position, cover_url } } });
    else navigate("/project", { state: { title, author: artist, position, grad: ARTS[art] } });
  }
  return (
    <div
      className="cursor-pointer group flex-shrink-0"
      style={{ width: 380 }}
      onClick={handleClick}
    >
      <div
        className="w-full rounded-xl relative overflow-hidden transition-all duration-150 group-hover:-translate-y-0.5"
        style={{ height: 200, background: ARTS[art] ?? ARTS[7], position: "relative" }}
      >
        <span style={{ position: "absolute", bottom: 12, left: 12, fontSize: 26, fontWeight: 600, color: "#fff", zIndex: 1, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
          {position}
        </span>
      </div>
      <div className="px-0.5">
        <span className="block text-[15px] font-semibold text-white mt-3">{title}</span>
        <span className="block text-[13px] text-white/60 mt-0.5">{artist}</span>
      </div>
    </div>
  );
}

function SongCard({ art, title, artist }) {
  const { playTrack } = usePlayer();
  return (
    <div className="cursor-pointer group" style={{ minWidth: 180 }} onClick={() => playTrack({ title, artist, grad: ARTS[art] })}>
      <div
        className="w-full aspect-square rounded-xl transition-all duration-150 group-hover:-translate-y-0.5"
        style={{ background: ARTS[art] }}
      />
      <div className="pt-3 px-0.5">
        <span className="text-[15px] font-medium text-white block truncate">{title}</span>
        <span className="text-[13px] text-white/60 block truncate">{artist}</span>
      </div>
    </div>
  );
}

function PlaylistCard({ art, title, artists }) {
  return (
    <div className="cursor-pointer group flex-shrink-0" style={{ minWidth: 280, width: 280 }}>
      <div
        className="w-full rounded-xl relative overflow-hidden transition-transform duration-150 group-hover:-translate-y-0.5"
        style={{ background: ARTS[art], height: 373 }}
      >
       <div className="absolute inset-0 p-4 flex flex-col" style={{ transform: "translateZ(0)" }}>
          <div className="flex justify-end">
          </div>
          <div className="flex-1 flex items-center">
            <h3 className="text-3xl font-bold text-white leading-tight">{title}</h3>
          </div>
          <p className="text-[11px] text-white/70 line-clamp-2">{artists}</p>
        </div>
      </div>
    </div>
  );
}

function SongRowCard({ id, art, cover_url, title, artist, duration, genre, audio_url, author_id, profile_avatar, onShare }) {
  const [hov, setHov]     = useState(false);
  const [open, setOpen]   = useState(false);
  const [liked, setLiked] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const { playTrack, playNext, queue, setQueue, session: playerSession } = usePlayer();
  const { session } = useApp();
  const { showToast } = useToast();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const navigate  = useNavigate();
  const btnRef    = useRef(null);
  const popupRef  = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = e => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        (!popupRef.current || !popupRef.current.contains(e.target))
      ) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  function openMenu(e) {
    e.stopPropagation();
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, left: rect.right - 180 });
    setOpen(o => !o);
  }

  async function handleLike(e) {
    e.stopPropagation();
    const userId = session?.user?.id;
    if (!userId) return;
    const next = !liked;
    setLiked(next);
    if (next) {
      await supabase.from("likes").insert({ user_id: userId, track_id: id });
      showToast(ml("k004"), "success", async () => {
        setLiked(false);
        await supabase.from("likes").delete().eq("user_id", userId).eq("track_id", id);
      }, "heart");
    } else {
      await supabase.from("likes").delete().eq("user_id", userId).eq("track_id", id);
      showToast(ml("k001"), "info", async () => {
        setLiked(true);
        await supabase.from("likes").insert({ user_id: userId, track_id: id });
      }, "heart-off");
    }
  }

  function handlePlayNext(e) {
    e.stopPropagation();
    playNext({ id, title, artist, author_id, cover_url, audio_url, grad: ARTS[art] ?? ARTS[1], genre, duration });
    showToast(ml("k008"), "success", () => {
      setQueue(prev => { const i = prev.findIndex(t => t.id === id); return i !== -1 ? prev.filter((_, idx) => idx !== i) : prev; });
    });
  }

  const CDThumb = (
    <div style={{ width: 48, height: 48, position: "relative", flexShrink: 0 }}>
      <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1, transform: "scale(1.0)" }} />
      {cover_url && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          backgroundImage: `url(${cover_url})`,
          backgroundSize: "cover", backgroundPosition: "center",
          WebkitMaskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
          maskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
        borderRadius: "50%",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
        maskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
      }} />
    </div>
  );

  const MENU = [
    { label: "좋아요", color: liked ? "#f472b6" : "#fff", onClick: handleLike, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { label: "플레이리스트 추가", color: "#fff", onClick: e => e.stopPropagation(), icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/><line x1="19" y1="15" x2="19" y2="21"/><line x1="16" y1="18" x2="22" y2="18"/></svg> },
    { label: "바로 다음 재생", color: "#fff", onClick: handlePlayNext, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg> },
  ];

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => playTrack({ id, title, artist, author_id, cover_url, audio_url, grad: ARTS[art] ?? ARTS[1], genre, duration })}
      style={{ display: "grid", gridTemplateColumns: "48px 1fr auto auto", gap: 14, alignItems: "center", padding: "10px", borderRadius: 10, cursor: "pointer", background: hov ? "rgba(255,255,255,0.05)" : "transparent", transition: "background 120ms" }}>
      {CDThumb}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); if (author_id) navigate(`/profile/${author_id}`); }}
          style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: author_id ? "pointer" : "default" }}
          onMouseEnter={e => { if (author_id) e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}
        >{artist}</div>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{duration}</div>
      <div onClick={e => e.stopPropagation()}>
        <button
          ref={btnRef}
          onClick={openMenu}
          style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.5)", background: open ? "rgba(255,255,255,0.08)" : "transparent", border: "none", cursor: "pointer", opacity: hov || open ? 1 : 0, transition: "opacity 120ms ease, background 120ms" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>
        </button>
        {open && (
          <div ref={popupRef} style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 1000, background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, minWidth: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.7)", padding: 6 }}>
            {MENU.map(item => (
              <div key={item.label} onClick={item.onClick}
                style={{ padding: "9px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500, color: item.color, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                {item.icon}
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SongSquareCard({ c, i, cards = [], source }) {
  const [hov, setHov] = useState(false);
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  function handleClick() {
    if (source) sessionStorage.setItem("playSource", source);
    const trackList = cards.map(t => ({ id: t.id, title: t.title, artist: t.artist, cover_url: t.cover_url, audio_url: t.audio_url }));
    playTrack({ id: c.id, title: c.title, artist: c.artist, author_id: c.author_id, cover_url: c.cover_url, audio_url: c.audio_url }, trackList);
  }
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={handleClick}
      style={{ flexShrink: 0, width: 170, cursor: "pointer", scrollSnapAlign: "start" }}
    >
      <div style={{
        width: 170, height: 170, position: "relative",
        transform: hov ? "translateY(-7px)" : "translateY(0)",
        transition: "transform 200ms cubic-bezier(0.2,0.7,0.2,1)",
      }}>
        {/* CD base */}
        <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1, transform: "scale(1.0)" }} />
        {/* Cover on disc */}
        {c.cover_url && (
          <div style={{
            position: "absolute", inset: "-2px", zIndex: 2,
            backgroundImage: `url(${c.cover_url})`,
            backgroundSize: "95.5%", backgroundPosition: "center",
            WebkitMaskImage: "radial-gradient(circle at 50% 49.8%, transparent 19px, black 20px), radial-gradient(circle at 50% 49.8%, black, black 82px, transparent 85px)",
            WebkitMaskComposite: "source-in, source-over",
            maskImage: "radial-gradient(circle at 50% 49.8%, transparent 19px, black 20px), radial-gradient(circle at 50% 49.8%, black, black 82px, transparent 85px)",
            maskComposite: "intersect, add",
          }} />
        )}
        {/* Border ring */}
        {/* 외곽 은빛 링 */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          borderRadius: "50%",
          background: "radial-gradient(circle closest-side, transparent 97.5%, rgba(200,210,230,0.25) 98.5%, rgba(160,170,195,0.15) 100%)",
        }} />
        {/* 테두리 하이라이트 + 깊이 */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
          borderRadius: "50%", overflow: "hidden",
          boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.3), inset 0 0 8px rgba(0,0,0,0.4), inset 0 -1px 2px rgba(255,255,255,0.1)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
          maskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
        }} />
      </div>
      <div style={{ paddingTop: 12, paddingLeft: 4, paddingRight: 4 }}>
        <TruncTitle text={c.title} style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }} />
        <div
          onClick={e => { e.stopPropagation(); c.author_id && navigate(`/profile/${c.author_id}`); }}
          style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: c.author_id ? "pointer" : "default", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          onMouseEnter={e => { if (c.author_id) e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}
        >{c.artist}</div>
      </div>
    </div>
  );
}

export const POSITION_COLORS = {
  "VOCAL":      "#A13232",
  "SESSION":    "#CC86EF",
  "FEATURING":  "#F9A64E",
  "MIXING":     "#7CC0F2",
  "MASTERING":  "#9E81F6",
  "PRODUCER":   "#973570",
  "BEAT MAKER": "#A3CF9D", "BEATMAKER": "#A3CF9D",
};
export const DEFAULT_POS_COLOR = "#9E81F6";


const COVER_GRADS = [
  "radial-gradient(60% 80% at 35% 35%,#fc3c44 0%,#7c0a12 50%,#1a0307 100%)",
  "radial-gradient(70% 80% at 70% 30%,#1e3a8a 0%,#0c0a1f 50%,#020617 100%)",
  "radial-gradient(60% 80% at 30% 60%,#7c2d12 0%,#3a1308 50%,#0a0301 100%)",
  "radial-gradient(70% 80% at 60% 40%,#be185d 0%,#4c0519 50%,#1a0207 100%)",
  "radial-gradient(60% 80% at 40% 50%,#0c4a6e 0%,#082f49 50%,#020617 100%)",
  "radial-gradient(70% 80% at 50% 50%,#064e3b 0%,#0a2f25 50%,#020c08 100%)",
];

export const FACE_GRADS = [
  "radial-gradient(circle at 35% 35%,#ffb96b 0%,#e8743a 35%,#7c2d12 100%)",
  "radial-gradient(circle at 35% 35%,#ffe27a 0%,#f59e0b 40%,#451a03 100%)",
  "radial-gradient(circle at 35% 35%,#fda4af 0%,#e11d48 40%,#4c0519 100%)",
  "radial-gradient(circle at 35% 35%,#a5b4fc 0%,#4338ca 40%,#1e1b4b 100%)",
];

function getMonogram(title) {
  const words = (title || "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (title || "##").slice(0, 2).toUpperCase();
}

const POSITIONS = [
  { key: "VOCAL",         label: "Vocal",        img: theWeekendImg,  imgScale: 1.12, textColor: "#F49D9D" },
  { key: "RAPPER",        label: "Rapper",        img: drakeImg,      imgTop: -8,    textColor: "#E89464" },
  { key: "MUSIC CREATOR", label: "Music Creator", img: tylerImg,    imgTop: -10, textAlign: "flex-end", textColor: "#F2DE7E" },
  { key: "PRODUCER",      label: "Producer",      img: metroImg,      imgTop: -22,   textColor: "#B4E6F2" },
  { key: "ENGINEER",      label: "Engineer",      img: tameImpalaImg, textColor: "#B7F3A1" },
];

const PCARD_STYLES = {
  "VOCAL":         { grad: "linear-gradient(160deg,#ff5468,#7a0f1c)", dot: "#FF2E88" },
  "RAPPER":        { grad: "linear-gradient(160deg,#ff9a3c,#7a3a0a)", dot: "#FF9A3C" },
  "PRODUCER":      { grad: "linear-gradient(160deg,#c6f24e,#3f5410)", dot: "#C6F24E" },
  "SESSION":       { grad: "linear-gradient(160deg,#56a8ff,#0c2f5a)", dot: "#56A8FF" },
  "ENGINEER":      { grad: "linear-gradient(160deg,#5ee6a8,#064e3b)", dot: "#5EE6A8" },
  "MUSIC CREATOR": { grad: "linear-gradient(160deg,#b388ff,#2a1a4d)", dot: "#B388FF" },
};
const PCARD_DEFAULT = { grad: "linear-gradient(160deg,#888,#222)", dot: "rgba(255,255,255,0.5)" };

function PositionCard({ position, onPlus }) {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  const s = PCARD_STYLES[position.key] ?? PCARD_DEFAULT;

  return (
    <article
      onClick={() => navigate(`/position/${position.key.toLowerCase().replace(/\s/g, "-")}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", flexShrink: 0, width: 248, height: 330,
        borderRadius: 24, overflow: "hidden", cursor: "pointer",
        scrollSnapAlign: "start",
        background: s.grad,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 240ms cubic-bezier(0.32,0.72,0,1)",
      }}
    >
      {position.img && (
        <img
          src={position.img}
          alt=""
          style={{
            position: "absolute",
            top: position.imgTop ?? 0, left: 0, right: 0, bottom: 0,
            width: "100%",
            height: position.imgTop ? `calc(100% + ${-position.imgTop}px)` : "100%",
            objectFit: "cover",
            objectPosition: position.imgPosition ?? "center top",
            imageRendering: "high-quality",
            ...(position.imgScale && { transform: `scale(${position.imgScale})`, transformOrigin: "center top" }),
          }}
        />
      )}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3,
        height: 100,
        backdropFilter: "blur(20px) brightness(0.7)",
        WebkitBackdropFilter: "blur(20px) brightness(0.7)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 45%)",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 45%)",
      }} />
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 20, zIndex: 4,
        display: "flex", justifyContent: position.textAlign ?? "center", paddingRight: position.textAlign === "flex-end" ? 36 : 0,
      }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: position.textColor ?? "#fff" }}>
          {position.label}
        </div>
      </div>
    </article>
  );
}

export function CollaboGridCard({ c, i }) {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  const pos = c.position || "";
  const cardStyle = PCARD_STYLES[pos.toUpperCase()] ?? PCARD_STYLES[pos] ?? PCARD_DEFAULT;

  return (
    <article
      onClick={() => c.id && navigate(`/project/${c.id}`, { state: { project: c } })}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", flexShrink: 0, width: 248, height: 360,
        borderRadius: 24, overflow: "hidden", cursor: "pointer",
        scrollSnapAlign: "start",
        background: c.cover_url ? "#000" : cardStyle.grad,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 240ms cubic-bezier(0.32,0.72,0,1)",
      }}
    >
      {c.cover_url && (
        <img loading="eager" decoding="async" src={c.cover_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      )}
      {!c.cover_url && c.avatarUrl && (
        <img loading="eager" decoding="async" src={c.avatarUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.45 }} />
      )}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3,
        padding: "16px 18px 17px",
        background: "rgba(22,22,24,0.62)",
        backdropFilter: "blur(32px) saturate(140%)",
        WebkitBackdropFilter: "blur(32px) saturate(140%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1, color: "#fff" }}>
          {pos || c.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 7, fontSize: 13, color: "rgba(255,255,255,0.72)", letterSpacing: "-0.015em" }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, flexShrink: 0, background: cardStyle.dot }} />
          {c.artist}{c.genre ? ` · ${c.genre}` : ""}
        </div>
      </div>
    </article>
  );
}


const SHIMMER = {
  background: "linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 75%)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.4s infinite linear",
};

export function CollaboGrid({ cards, emptyText = "아직 프로젝트가 없습니다", pad = 0, duration = "0ms", ease = "ease", loading = false }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollLeft === 0) return;
    const start = el.scrollLeft;
    const t0 = performance.now();
    const dur = 320;
    const easeFn = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.scrollLeft = start * (1 - easeFn(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [pad]);

  if (loading) {
    return (
      <div className="no-scrollbar" style={{ overflowX: "auto", marginLeft: -pad, paddingLeft: pad, paddingRight: 48, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div style={{ display: "flex", gap: 18, paddingBottom: 18 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: 248, height: 360, borderRadius: 24, ...SHIMMER }} />
          ))}
        </div>
      </div>
    );
  }
  if (cards.length === 0) {
    return (
      <div style={{ paddingLeft: 32, paddingRight: 32 }}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "24px 0" }}>{emptyText}</p>
      </div>
    );
  }
  return (
    <div ref={scrollRef} className="no-scrollbar" style={{
      display: "flex", gap: 18, overflowX: "auto", overflowY: "visible",
      marginLeft: -pad, paddingLeft: pad, paddingRight: 48,
      paddingTop: 4, paddingBottom: 18,
      scrollSnapType: "x mandatory",
      scrollbarWidth: "none", msOverflowStyle: "none",
      transition: `margin-left ${duration} ${ease}, padding-left ${duration} ${ease}`,
    }}>
      {cards.map((c, i) => (
        <CollaboGridCard key={c.id ?? i} c={c} i={i} />
      ))}
    </div>
  );
}

// 포지션 카드 가로 스크롤 행 — 사이드바 토글 시 스크롤 위치 보정 (SongScrollRow와 동일 모션)
function PositionScrollRow({ pad, duration, ease, onPlus }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollLeft === 0) return;
    const start = el.scrollLeft;
    const t0 = performance.now();
    const dur = 320;
    const easeFn = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.scrollLeft = start * (1 - easeFn(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [pad]);

  return (
    <div ref={scrollRef} className="no-scrollbar" style={{ overflowX: "auto", marginLeft: -pad, paddingLeft: pad, paddingRight: 48, paddingTop: 4, paddingBottom: 18, scrollbarWidth: "none", msOverflowStyle: "none", transition: `margin-left ${duration} ${ease}, padding-left ${duration} ${ease}`, willChange: "transform", transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${POSITIONS.length}, 248px)`, gap: 18, width: "fit-content" }}>
        {POSITIONS.map(pos => (
          <PositionCard key={pos.key} position={pos} onPlus={onPlus} />
        ))}
      </div>
    </div>
  );
}


// PostCardV3 — reserved for future use
function PostCardV3({ c }) {
  const [hov, setHov]   = useState(false);
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();
  const cardStyle = PCARD_STYLES[c.position?.toUpperCase()] ?? PCARD_DEFAULT;

  function formatAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    if (d === 1) return "어제";
    if (d < 7) return `${d}일 전`;
    return `${Math.floor(d / 7)}주 전`;
  }

  const ACT_BASE = { all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 10px", borderRadius: 999, fontSize: 12, fontVariantNumeric: "tabular-nums", transition: "color 240ms, background 240ms" };

  return (
    <article
      onClick={() => c.id && navigate(`/project/${c.id}`, { state: { project: c } })}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0, width: 360, scrollSnapAlign: "start",
        background: "#0E0E10",
        border: `1px solid ${hov ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 18, overflow: "hidden", cursor: "pointer",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition: "border-color 240ms cubic-bezier(0.32,0.72,0,1), transform 240ms cubic-bezier(0.32,0.72,0,1)",
      }}
    >
      {/* header */}
      <div style={{ padding: "16px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 999, flexShrink: 0, overflow: "hidden",
            background: c.avatarUrl ? "#26262c" : cardStyle.grad,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
          }}>
            {c.avatarUrl && <img loading="eager" decoding="async" src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {c.artist}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.44)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {c.artistHandle ? `@${c.artistHandle}` : c.artist}{c.createdAt ? ` · ${formatAgo(c.createdAt)}` : ""}
            </div>
          </div>
          <button onClick={e => e.stopPropagation()} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.44)", transition: "background 240ms, color 240ms" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.44)"; }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 17, height: 17 }}>
              <circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>
            </svg>
          </button>
        </div>

        <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.2, color: "#fff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>
          {c.title}
        </h3>
        {c.description && (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>
            {c.description}
          </p>
        )}
      </div>

      {/* media */}
      {c.cover_url && (
        <div style={{
          position: "relative", margin: "0 18px", borderRadius: 12, overflow: "hidden",
          aspectRatio: "16 / 10",
          backgroundImage: `url(${c.cover_url})`, backgroundSize: "cover", backgroundPosition: "center",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(130% 90% at 26% 12%, rgba(255,255,255,0.10), transparent 55%)", pointerEvents: "none" }} />
        </div>
      )}

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", padding: "6px 10px 8px", marginTop: 6 }} onClick={e => e.stopPropagation()}>
        <button
          style={{ ...ACT_BASE, color: "rgba(255,255,255,0.44)" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#56A8FF"; e.currentTarget.style.background = "rgba(86,168,255,0.10)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.44)"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, strokeWidth: 1.8 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {c.comment_count ?? 0}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
          style={{ ...ACT_BASE, color: liked ? "#FF5A4D" : "rgba(255,255,255,0.44)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,90,77,0.10)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <svg viewBox="0 0 24 24" fill={liked ? "#FF5A4D" : "none"} stroke={liked ? "#FF5A4D" : "currentColor"} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, strokeWidth: 1.8 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <div style={{ flex: 1 }} />
        {c.position && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)", color: cardStyle.dot, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", letterSpacing: "0.02em" }}>
            {c.position}
          </span>
        )}
      </div>
    </article>
  );
}


function SongScrollRow({ cards, emptyText = "아직 업로드된 음원이 없습니다", pad = 0, duration = "0ms", ease = "ease", loading = false, source }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollLeft === 0) return;
    const start = el.scrollLeft;
    const t0 = performance.now();
    const dur = 320;
    const easeFn = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const step = now => {
      const p = Math.min((now - t0) / dur, 1);
      el.scrollLeft = start * (1 - easeFn(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [pad]);

  if (loading) {
    return (
      <div className="no-scrollbar" style={{ overflowX: "auto", marginLeft: -pad, paddingLeft: pad, paddingRight: 48, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div style={{ display: "flex", gap: 20, width: "fit-content", paddingBottom: 8 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ flexShrink: 0 }}>
              <div style={{ width: 170, height: 170, borderRadius: 12, ...SHIMMER }} />
              <div style={{ width: 140, height: 14, borderRadius: 6, marginTop: 12, ...SHIMMER }} />
              <div style={{ width: 100, height: 12, borderRadius: 6, marginTop: 6, ...SHIMMER }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (cards.length === 0) {
    return (
      <div style={{ paddingLeft: 32, paddingRight: 32 }}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "24px 0" }}>{emptyText}</p>
      </div>
    );
  }
  return (
    <div ref={scrollRef} className="no-scrollbar" style={{ overflowX: "auto", marginLeft: -pad, paddingLeft: pad, paddingRight: 48, paddingTop: 8, paddingBottom: 8, scrollbarWidth: "none", msOverflowStyle: "none", transition: `margin-left ${duration} ${ease}, padding-left ${duration} ${ease}`, willChange: "transform", transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cards.length}, 170px)`, gap: 36, width: "fit-content", paddingBottom: 8, transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}>
        {cards.map((c, i) => <SongSquareCard key={c.id ?? i} c={c} i={i} cards={cards} source={source} />)}
      </div>
    </div>
  );
}

const TABLE_HEADERS = [
  { label: "",        align: "left" },
  { label: "제목",     align: "left" },
  { label: "아티스트",  align: "left", paddingLeft: 72 },
  { label: "장르",     align: "center" },
  { label: "시간",     align: "center" },
  { label: "",        align: "left" },
];

function SongActionMenu({ c }) {
  const [open, setOpen]   = useState(false);
  const [liked, setLiked] = useState(false);
  const [pos, setPos]     = useState({ top: 0, right: 0 });
  const { playNext, setQueue } = usePlayer();
  const { session } = useApp();
  const { showToast } = useToast();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const btnRef   = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = e => {
      if (btnRef.current && !btnRef.current.contains(e.target) &&
          (!popupRef.current || !popupRef.current.contains(e.target)))
        setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  function handleOpen(e) {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(o => !o);
  }

  async function handleLike(e) {
    e.stopPropagation();
    const userId = session?.user?.id;
    if (!userId) return;
    const next = !liked;
    setLiked(next);
    if (next) {
      await supabase.from("likes").insert({ user_id: userId, track_id: c.id });
      showToast(ml("k004"), "success", async () => {
        setLiked(false);
        await supabase.from("likes").delete().eq("user_id", userId).eq("track_id", c.id);
      }, "heart");
    } else {
      await supabase.from("likes").delete().eq("user_id", userId).eq("track_id", c.id);
      showToast(ml("k001"), "info", async () => {
        setLiked(true);
        await supabase.from("likes").insert({ user_id: userId, track_id: c.id });
      }, "heart-off");
    }
  }

  function handlePlayNext(e) {
    e.stopPropagation();
    playNext({ id: c.id, title: c.title, artist: c.artist, author_id: c.author_id, cover_url: c.cover_url, audio_url: c.audio_url, grad: c.grad, genre: c.genre, duration: c.duration });
    showToast(ml("k008"), "success", () => {
      setQueue(prev => { const i = prev.findIndex(t => t.id === c.id); return i !== -1 ? prev.filter((_, idx) => idx !== i) : prev; });
    });
  }

  return (
    <>
      <button ref={btnRef} onClick={handleOpen}
        style={{ width: 28, height: 28, borderRadius: 8, background: open ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "inherit" }}
      >···</button>
      {open && (
        <div ref={popupRef} onClick={e => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, right: pos.right, background: "rgba(20,20,22,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 4, minWidth: 140, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 9999 }}
        >
          <div onClick={handleLike} style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: liked ? "#f472b6" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>좋아요</div>
          <div onClick={e => e.stopPropagation()} style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/><line x1="19" y1="15" x2="19" y2="21"/><line x1="16" y1="18" x2="22" y2="18"/></svg>플레이리스트 추가</div>
          <div onClick={handlePlayNext} style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>바로 다음 재생</div>
        </div>
      )}
    </>
  );
}

function SongTableRow({ c }) {
  const [hov, setHov] = useState(false);
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => playTrack({ id: c.id, title: c.title, artist: c.artist, cover_url: c.cover_url, audio_url: c.audio_url, grad: c.grad, genre: c.genre, duration: c.duration })}
      style={{ display: "grid", gridTemplateColumns: "68px 1fr 1fr 120px 60px 32px", gap: 14, alignItems: "center", padding: "9px 12px", borderRadius: 10, cursor: "pointer", background: hov ? "rgba(255,255,255,0.04)" : "transparent", transition: "background 120ms" }}>
      <div style={{ width: 64, height: 64, position: "relative", flexShrink: 0 }}>
        <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1, transform: "scale(1.0)" }} />
        {c.cover_url && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            borderRadius: "50%", overflow: "hidden",
            backgroundImage: `url(${c.cover_url})`,
            backgroundSize: "cover", backgroundPosition: "center",
            WebkitMaskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
            maskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
          }} />
        )}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          borderRadius: "50%", overflow: "hidden",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
          maskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
        }} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
      <div
        onClick={e => { e.stopPropagation(); if (c.author_id) navigate(`/profile/${c.author_id}`); }}
        style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: c.author_id ? "pointer" : "default", paddingLeft: 72 }}
        onMouseEnter={e => { if (c.author_id) e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
      >{c.artist}</div>
      <div style={{ overflow: "hidden", display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", whiteSpace: "nowrap", display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{c.genre || "—"}</span>
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", textAlign: "center" }}>{c.duration ?? "—"}</div>
      <div onClick={e => e.stopPropagation()} style={{ display: "grid", placeItems: "center" }}>
        <SongActionMenu c={c} />
      </div>
    </div>
  );
}

function SongTableList({ cards, emptyText = "아직 업로드된 음원이 없습니다", pad = 0 }) {
  if (cards.length === 0) return <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "24px 12px" }}>{emptyText}</p>;
  return (
    <div style={{ marginLeft: -pad, paddingLeft: pad + 40, paddingRight: 80 }}>
      <div style={{ display: "grid", gridTemplateColumns: "68px 1fr 1fr 120px 60px 32px", gap: 14, padding: "6px 12px", marginBottom: 4 }}>
        {TABLE_HEADERS.map((h, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", textAlign: h.align, paddingLeft: h.paddingLeft ?? 0 }}>{h.label}</div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {cards.map((c, i) => <SongTableRow key={c.id ?? i} c={c} />)}
      </div>
    </div>
  );
}

function SongGrid({ cards, emptyText = "아직 업로드된 음원이 없습니다", pad = 0, onShare }) {
  if (cards.length === 0) {
    return (
      <div style={{ paddingLeft: pad }}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "24px 12px" }}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div style={{ marginLeft: -pad, paddingLeft: pad, paddingRight: 48, paddingTop: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "repeat(3, auto)", gridAutoFlow: "column", columnGap: 24, rowGap: 4 }}>
        {cards.slice(0, 6).map((c, i) => (
          <SongRowCard
            key={c.id ?? i}
            id={c.id}
            art={(i % 15) + 1}
            cover_url={c.cover_url}
            title={c.title}
            artist={c.artist}
            author_id={c.author_id}
            duration={c.duration}
            genre={c.genre}
            audio_url={c.audio_url}
            onShare={onShare}
          />
        ))}
      </div>
    </div>
  );
}

function CardRow({ cards, type, emptyText = "아직 등록된 항목이 없습니다", onShare }) {
  if (cards.length === 0) {
    return (
      <div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "24px 0" }}>{emptyText}</p>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 24, rowGap: 4 }}>
      {cards.slice(0, 8).map((c, i) => (
        <SongRowCard
          key={c.id ?? i}
          id={c.id}
          title={c.title}
          artist={c.artist}
          author_id={c.author_id}
          cover_url={c.cover_url}
          audio_url={c.audio_url}
          duration={c.duration}
          genre={c.genre}
          art={i + 1}
          onShare={onShare}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const [ready, setReady]                     = useState(false);
  const [isOpen, setIsOpen]                   = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [newProjectOpen, setNewProjectOpen]   = useState(false);
  const [collaboTracks, setCollaboTracks]     = useState([]);
  const [songTracks, setSongTracks]           = useState([]);
  const { recentlyPlayed, setQueue } = usePlayer();
  const [enrichedRecent, setEnrichedRecent]   = useState(() => recentlyPlayed ?? []);
  const [collaboLoading, setCollaboLoading]   = useState(true);
  const [songsLoading, setSongsLoading]       = useState(true);
  const [shareTrack, setShareTrack]           = useState(null);
  const [forYouTracks, setForYouTracks]       = useState([]);
  const [forYouLoading, setForYouLoading]     = useState(true);
  const [isMobile, setIsMobile]               = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (songTracks.length > 0) {
      setQueue(songTracks);
    }
  }, [songTracks]);
  const { profile, session, deletedTrackIds } = useApp();
  const myId = session?.user?.id;
  const pad = isOpen ? 260 : 120;
  const navigate = useNavigate();

  useEffect(() => {
    if (!recentlyPlayed.length) { setEnrichedRecent([]); return; }
    const ids = recentlyPlayed.filter(t => t.id && !String(t.id).startsWith("temp")).map(t => t.id);
    if (!ids.length) { setEnrichedRecent(recentlyPlayed); return; }
    supabase.from("tracks").select("id, duration, genre, author_id").in("id", ids).then(({ data }) => {
      const map = {};
      const existingIds = new Set();
      (data ?? []).forEach(t => { map[t.id] = t; existingIds.add(t.id); });
      setEnrichedRecent(recentlyPlayed
        .filter(t => !t.id || String(t.id).startsWith("temp") || existingIds.has(t.id))
        .map(t => ({
          ...t,
          duration:  (() => { const d = map[t.id]?.duration ?? t.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const s = typeof d === "number" ? d : parseInt(d, 10); return isNaN(s) ? "—" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; })(),
          genre:     (() => { const g = map[t.id]?.genre ?? t.genre; const v = Array.isArray(g) ? g[0] : g; if (!v) return ""; if (typeof v === "string" && v.startsWith("[")) { try { const p = JSON.parse(v); return Array.isArray(p) ? p[0] ?? "" : v; } catch { return v; } } return v; })(),
          author_id: map[t.id]?.author_id ?? t.author_id ?? null,
        })));
    });
  }, [recentlyPlayed]);

  useEffect(() => {
    Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(6),
      supabase.from("tracks").select("id, title, genre, duration, cover_url, artist, audio_url, author_id, profiles!tracks_author_id_fkey(username)").eq("type", "song").order("created_at", { ascending: false }).limit(7),
    ]).then(async ([collaboRes, songsRes]) => {
      if (collaboRes?.data) {
        const projectsData = collaboRes.data;
        const authorIds = [...new Set(projectsData.map(p => p.author_id).filter(Boolean))];
        const { data: profilesData } = authorIds.length
          ? await supabase.from("profiles").select("id, username, handle, avatar_url").in("id", authorIds)
          : { data: [] };
        const profileMap = {};
        profilesData?.forEach(p => { profileMap[p.id] = p; });
        const mapped = projectsData.map(t => ({
          id: t.id,
          position: t.position || t.genre || "",
          genre: t.genre || "",
          title: t.title,
          description: t.description ?? t.content ?? "",
          artist: profileMap[t.author_id]?.username ?? "아티스트",
          author_id: t.author_id ?? null,
          artistHandle: profileMap[t.author_id]?.handle ?? null,
          avatarUrl: profileMap[t.author_id]?.avatar_url ?? null,
          createdAt: t.created_at ?? null,
          cover_url: t.cover_url ?? null,
          tracks: Array.isArray(t.tracks) ? t.tracks : [],
          comment_count: t.comment_count ?? 0,
        }));
        setCollaboTracks(mapped);
        setCache("home-collabo", mapped);
      }
      setCollaboLoading(false);
      if (songsRes?.data) {
        const mapped = songsRes.data.map(t => ({
          id:        t.id,
          title:     t.title,
          artist:    t.profiles?.username ?? t.artist ?? "아티스트",
          author_id: t.author_id ?? null,
          genre:     (() => { const g = Array.isArray(t.genre) ? t.genre[0] : t.genre; if (!g) return ""; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "" : g; } catch { return g; } } return g; })(),
          type:      "Single",
          duration:  (() => { const d = t.duration; if (!d) return "--:--"; if (typeof d === "string" && d.includes(":")) return d; const s = typeof d === "number" ? d : parseInt(d, 10); return isNaN(s) ? "--:--" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; })(),
          cover_url: t.cover_url ?? null,
          audio_url: t.audio_url ?? null,
        }));
        setSongTracks(mapped);
        setCache("home-songs", mapped);
      }
      setSongsLoading(false);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const projectsChannel = supabase
      .channel("home-projects-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "projects" },
        (payload) => {
          if (!mounted) return;
          const t = payload.new;
          setCollaboTracks(prev => [{
            id: t.id,
            position: t.position || t.genre || "프로젝트",
            genre: t.genre ?? "",
            title: t.title,
            artist: "아티스트",
            cover_url: t.cover_url ?? null,
          }, ...prev].slice(0, 6));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "projects" },
        (payload) => {
          if (!mounted) return;
          setCollaboTracks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    const songsChannel = supabase
      .channel("home-songs-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tracks" },
        (payload) => {
          if (!mounted) return;
          const t = payload.new;
          if (t.type === "song") {
            setSongTracks(prev => [{
              id: t.id,
              title: t.title,
              artist: t.artist ?? "아티스트",
              author_id: t.author_id ?? null,
              genre: (() => { const g = Array.isArray(t.genre) ? t.genre[0] : t.genre; if (!g) return ""; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "" : g; } catch { return g; } } return g; })(),
              type: "Single",
              duration: (() => { const d = t.duration; if (!d) return "--:--"; if (typeof d === "string" && d.includes(":")) return d; const s = typeof d === "number" ? d : parseInt(d, 10); return isNaN(s) ? "--:--" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; })(),
              cover_url: t.cover_url ?? null,
              audio_url: t.audio_url ?? null,
            }, ...prev].slice(0, 7));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tracks" },
        (payload) => {
          if (!mounted) return;
          setSongTracks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(songsChannel);
    };
  }, []);

  // For You — 좋아요·최근 재생 장르 기반 개인화 추천 (fetchForYou)
  useEffect(() => {
    const userId = session?.user?.id;
    fetchForYou({ userId, recentlyPlayed, limit: 7 }).then(({ data }) => {
      setForYouTracks((data ?? []).map((t, i) => ({
        id: t.id,
        title: t.title,
        artist: t.profiles?.username ?? t.artist ?? "아티스트",
        author_id: t.author_id,
        genre: Array.isArray(t.genre) ? t.genre[0] : (t.genre ?? ""),
        duration: typeof t.duration === "string" ? t.duration : "--:--",
        cover_url: t.cover_url ?? null,
        audio_url: t.audio_url ?? null,
        grad: GRAD_FALLBACKS[i % GRAD_FALLBACKS.length],
      })));
      setForYouLoading(false);
    });
  }, [session?.user?.id, recentlyPlayed?.length]);

  const sections = [
    { title: "Collabo Post",             cards: collaboTracks.filter(t => !deletedTrackIds.has(t.id)),  type: "collabo",      loading: collaboLoading, arrow: false, route: "/collabo",          emptyText: ml("k033") },
    { title: ml("k113"),               cards: songTracks.filter(t => !deletedTrackIds.has(t.id)),     type: "songs-scroll", loading: songsLoading,   arrow: true, route: "/new-songs" },
    { title: ml("k034"), cards: enrichedRecent.filter(t => !deletedTrackIds.has(t.id) && !t.isProject && t.audio_url).map(c => ({ ...c, artist: c.author_id === myId ? (profile?.username ?? c.artist) : c.artist })), type: "songs-scroll", loading: false, arrow: true, route: "/recently-played", emptyText: ml("k114") },
    { title: "For You", cards: forYouTracks.filter(t => !deletedTrackIds.has(t.id)), type: "songs-scroll", loading: forYouLoading, arrow: true, route: "/for-you", emptyText: ml("k114") },
  ];

  const shiftedSections = sections.filter(s => s.type === "collabo");
  const fixedSections   = sections.filter(s => s.type !== "collabo");

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #FC3C44", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (isMobile) {
    const mobileSections = [
      { title: "Collabo", type: "positions", route: "/board", cards: POSITIONS.map(p => ({ id: p.key, key: p.key, title: p.label, cover_url: p.img })) },
      ...sections.filter(s => s.type !== "collabo"),
    ];
    return <MobileHome avatarUrl={profile?.avatar_url ?? null} sections={mobileSections} />;
  }

  return (
    <>
    <div className="min-h-screen bg-[#000000]" style={{ overflowX: "clip" }}>
      <style>{`@keyframes shimmer { 0% { background-position: -600px 0 } 100% { background-position: 600px 0 } }`}</style>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Banner + Collabo: 사이드바와 함께 밀림 */}
      <div style={{ marginLeft: pad, transition: `margin-left ${DURATION} ${EASE}` }}>
        {!isMobile && <HeroBanner padLeft={pad} />}
        <div className="mt-10">
          {shiftedSections.map(({ title, cards, type, arrow, route, emptyText, loading }) => (
            <section key={title} className="pt-12">
              <div className="px-8">
                <SectionHead title={title} arrow={arrow} onArrowClick={() => navigate(route)} />
                {cards.length > 6 && (
                  <button
                    onClick={() => navigate("/collabo-board")}
                    style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", borderRadius: 8, transition: "color 120ms" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
                  >전체 보기</button>
                )}
              </div>
              <PositionScrollRow pad={pad} duration={DURATION} ease={EASE} onPlus={() => setNewProjectOpen(true)} />
            </section>
          ))}
        </div>
      </div>

      {/* New Songs / Recently Played: 제자리 고정, 트랙 제목만 줄어듦 */}
      <div className="pb-20" style={{ marginLeft: pad, transition: `margin-left ${DURATION} ${EASE}` }}>
       {fixedSections.map(({ title, cards, type, arrow, route, emptyText, loading }) => (
          <section key={title} className="pt-12">
            <div className="px-8">
              <SectionHead title={title} arrow={arrow} onArrowClick={() => navigate(route)} />
            </div>
            {type === "songs-scroll"
              ? <SongScrollRow cards={cards} emptyText={emptyText} pad={pad} duration={DURATION} ease={EASE} loading={loading} source={route === "/recently-played" ? "recentlyPlayed" : "newSongs"} />
              : type === "songs-table"
              ? <SongTableList cards={cards} emptyText={emptyText} pad={pad} />
              : <SongGrid cards={cards} emptyText={emptyText} pad={pad} onShare={setShareTrack} />
            }
          </section>
        ))}
      </div>

      <footer style={{ textAlign: "center", padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
        <Link to="/privacy" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "underline" }}>{t("privacy.title")}</Link>
      </footer>
    </div>
    <ShareModal
      isOpen={!!shareTrack}
      onClose={() => setShareTrack(null)}
      shareData={{
        type: "song",
        trackId: shareTrack?.id,
        title: shareTrack?.title,
        artist: shareTrack?.artist,
        coverUrl: shareTrack?.cover_url ?? null,
      }}
    />
    <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </>
  );
}

