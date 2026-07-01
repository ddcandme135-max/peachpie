import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import MobileNav from "../components/MobileNav";
import { useIsMobile } from "../lib/useIsMobile";
import { usePlayer } from "../context/PlayerContext";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { SongRow } from "./NewSongs";
import { fetchForYou } from "../lib/api";
import { ml } from "../lib/ml";
import { ob } from "../lib/onboardingI18n";
import { preloadCovers } from "../lib/preloadCovers";

const EASE     = "cubic-bezier(0.16, 1, 0.3, 1)";
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

function parseDur(d) {
  if (!d) return "—";
  if (typeof d === "string" && d.includes(":")) return d;
  const sec = typeof d === "number" ? d : parseInt(d, 10);
  return isNaN(sec) ? "—" : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function parseGenre(g) {
  if (!g) return "—";
  const v = Array.isArray(g) ? g[0] : g;
  if (!v) return "—";
  if (typeof v === "string" && v.startsWith("[")) { try { const p = JSON.parse(v); return Array.isArray(p) ? p[0] ?? "—" : v; } catch { return v; } }
  return v;
}

export default function ForYou() {
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(null);
  const { recentlyPlayed } = usePlayer();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const pad = isMobile ? 0 : (isOpen ? 220 : 90);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setMyId(session?.user?.id ?? null));
  }, []);

  // 좋아요·최근 재생 장르 기반 개인화 추천 (fetchForYou)
  useEffect(() => {
    let mounted = true;
    fetchForYou({ userId: myId, recentlyPlayed, limit: 25 }).then(({ data }) => {
      if (!mounted) return;
      const recs = (data ?? []).map((t, i) => ({
        id:        t.id,
        title:     t.title,
        artist:    t.profiles?.username ?? t.artist ?? "아티스트",
        author_id: t.author_id ?? null,
        grad:      GRAD_FALLBACKS[i % GRAD_FALLBACKS.length],
        genre:     parseGenre(t.genre),
        type:      "Single",
        duration:  parseDur(t.duration),
        cover_url: t.cover_url ?? null,
        audio_url: t.audio_url ?? null,
      }));
      preloadCovers(recs); setTracks(recs); setLoading(false);
    });
    return () => { mounted = false; };
  }, [myId, recentlyPlayed?.length]);

  const showGenre = !isOpen;
  const title = lang === "ko" ? "추천 음원" : lang === "ja" ? "あなたへのおすすめ" : "For You";

  return (
    <div style={{ minHeight: "100vh", background: "#000000" }}>
      {!isMobile && <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />}

      <div style={{ marginLeft: pad, transition: `margin-left ${DURATION} ${EASE}`, display: "flex", alignItems: "flex-start", minWidth: isMobile ? 0 : 900 }}>
        <main style={{ flex: 1, minWidth: 0, paddingBottom: isMobile ? 80 : 96 }}>

          <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(22px) saturate(150%)", WebkitBackdropFilter: "blur(22px) saturate(150%)" }}>
            <div style={{ padding: "20px 24px 14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={() => navigate(-1)}
                style={{ all: "unset", cursor: "pointer", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0, transition: "background 120ms" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
              </button>
              <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, letterSpacing: "-0.03em" }}>{title}</h1>
            </div>
          </div>

          <div style={{ padding: "20px 16px 0" }}>
            {loading ? null : tracks.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, minHeight: "38vh", width: "100%" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                  {ob("browse", lang)}
                </div>
                <button onClick={() => navigate("/new-songs")}
                  style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 22px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", transition: "background 160ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                >
                  {ob("browse", lang)}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: showGenre ? "68px 1fr 1fr 1fr 60px 32px" : "68px 1fr 1fr 60px 32px", gap: 14, padding: "6px 12px", marginBottom: 4, transition: "grid-template-columns 200ms" }}>
                  {[
                    { label: "" },
                    { label: ml("k122") },
                    { label: ml("k006") },
                    ...(showGenre ? [{ label: ml("k003"), align: "center" }] : []),
                    { label: ml("k123"), align: "center" },
                    { label: "" },
                  ].map((h, i) => (
                    <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", paddingLeft: i === 2 ? (isOpen ? 96 : 120) : 0, textAlign: h.align ?? "left", transition: i === 2 ? `padding-left ${DURATION} ${EASE}` : undefined }}>{h.label}</div>
                  ))}
                </div>
                {tracks.map((s, i) => (
                  <div key={s.id} style={{ borderBottom: i < tracks.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                    <SongRow s={s} sidebarOpen={isOpen} showGenre={showGenre} isMe={myId === s.author_id} source="forYou" />
                  </div>
                ))}
              </>
            )}
          </div>
        </main>

        {!isMobile && <RightSidebar width={320} activeTab="songs" page="for-you" />}
      </div>
      {isMobile && <MobileNav />}
    </div>
  );
}
