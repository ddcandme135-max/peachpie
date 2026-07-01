import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import MobileSearch from "../components/MobileSearch";
import { useIsMobile } from "../lib/useIsMobile";
import { usePlayer } from "../context/PlayerContext";
import { supabase } from "../lib/supabase";
import { PostCard, mapDbPost } from "./CollabFeed";
import { SongRow, SONG_HEADERS, GRAD_FALLBACKS } from "./NewSongs";
import cdImg from "../assets/_-removebg-preview.png";
import { ml } from "../lib/ml";
import { ob } from "../lib/onboardingI18n";
import { preloadCovers } from "../lib/preloadCovers";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";
const ADMIN_ID = "a44420e9-826b-4b55-ae14-63950e111495";

const PROFILE_GRADIENTS = [
  "linear-gradient(135deg,#34d399,#064e3b)",
  "linear-gradient(135deg,#818cf8,#1e1b4b)",
  "linear-gradient(135deg,#fbbf24,#92400e)",
  "linear-gradient(135deg,#5ad7ff,#1e3a8a)",
  "linear-gradient(135deg,#c084fc,#4c1d95)",
  "linear-gradient(135deg,#f472b6,#831843)",
  "linear-gradient(135deg,#84cc16,#1a2e05)",
  "linear-gradient(135deg,#2dd4bf,#134e4a)",
];

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
        <path d="M12 3a9 9 0 0 1 9 9">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

function SectionTitle({ children, count }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
      <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>{children}</span>
      {count > 0 && <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>{count}</span>}
    </div>
  );
}

function SongItem({ t, index }) {
  const { playTrack } = usePlayer();
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const grad = GRAD_FALLBACKS[index % GRAD_FALLBACKS.length];

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => playTrack({ id: t.id, title: t.title, artist: t.artist, cover_url: t.cover_url, audio_url: t.audio_url })}
      style={{ display: "grid", gridTemplateColumns: "20px 44px 1fr auto", gap: 12, alignItems: "center", padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: hov ? "rgba(255,255,255,0.05)" : "transparent", transition: "background 150ms" }}
    >
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{index + 1}</span>
      <div style={{ width: 44, height: 44, borderRadius: 6, flexShrink: 0, overflow: "hidden", background: t.cover_url ? "#000" : grad, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
        {t.cover_url && <img loading="eager" decoding="async" src={t.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.artist}</div>
      </div>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{t.duration ?? "—"}</span>
    </div>
  );
}

function ArtistTile({ a, profileId, name, handle, avatarUrl, gradient, myId, followingIds }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pid = profileId ?? a?.supabaseId;
  // 미리 받은 팔로우 Set으로 초기 상태 결정 → 처음부터 올바르게 표시(깜빡임 없음)
  const [override, setOverride] = useState(null); // null이면 prop 기준
  const following = override !== null ? override : !!(pid && followingIds?.has(pid));

  async function toggle(e) {
    e.stopPropagation();
    if (!myId || !pid || myId === pid) return;
    const next = !following;
    setOverride(next);
    if (next) {
      await supabase.from("follows").insert({ follower_id: myId, following_id: pid });
    } else {
      await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", pid);
    }
  }

  const displayName = name ?? a?.name ?? a?.username ?? a?.handle ?? "";
  const displayHandle = handle ?? a?.id ?? (a?.handle ? `@${a.handle}` : "");
  const avatar = avatarUrl ?? a?.avatar_url ?? null;
  const grad = gradient ?? a?.gradient ?? PROFILE_GRADIENTS[0];
  const initial = displayName[0]?.toUpperCase() ?? "?";
  return (
    <>
      <style>{`
        .a-tile{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:12px 8px;border-radius:16px;cursor:pointer;transition:background .18s;}
        .a-tile:hover{background:#1c1c1f;}
        .a-follow{all:unset;box-sizing:border-box;width:100%;margin-top:2px;height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#FC3C44;color:#fff;font-size:13px;font-weight:700;letter-spacing:-0.01em;cursor:pointer;transition:filter .15s,transform .12s cubic-bezier(0.32,0.72,0,1);}
        .a-follow:hover{filter:brightness(1.08);}
        .a-follow:active{transform:scale(0.98);}
        .a-follow.out{background:transparent;color:rgba(255,255,255,0.66);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.14);}
      `}</style>
      <div className="a-tile" onClick={() => pid && navigate(`/profile/${pid}`)}>
        <div style={{ width: 96, height: 96, borderRadius: 999, flexShrink: 0, overflow: "hidden", background: grad, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700, color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          {avatar ? <img loading="eager" decoding="async" src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
        </div>
        <div style={{ width: "100%", minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayHandle}</div>
        </div>
        <button
          className={`a-follow${following ? " out" : ""}`}
          onClick={toggle}
        >{following ? t("common.following") : t("common.follow")}</button>
      </div>
    </>
  );
}

function ProjectItem({ p, index }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const grad = GRAD_FALLBACKS[index % GRAD_FALLBACKS.length];
  return (
    <div onClick={() => navigate(`/project/${p.id}`, { state: { project: p } })} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ cursor: "pointer" }}>
      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 14, position: "relative", overflow: "hidden", background: p.cover_url ? "#000" : grad, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", transform: hov ? "translateY(-3px)" : "none", transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)" }}>
        {p.cover_url && <img loading="eager" decoding="async" src={p.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 24% 14%, rgba(255,255,255,0.15), transparent 55%)", pointerEvents: "none" }} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.author}</div>
    </div>
  );
}

export default function SearchResults() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { playTrack } = usePlayer();
  const [inputVal, setInputVal]             = useState(state?.query ?? "");
  const [isOpen, setIsOpen]                 = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [activeTab, setActiveTab]           = useState(() => sessionStorage.getItem("tab_search") ?? "song");
  useEffect(() => { sessionStorage.setItem("tab_search", activeTab); }, [activeTab]);
  const [artistResults, setArtistResults]   = useState([]);
  const [songResults, setSongResults]       = useState([]);
  const [projectResults, setProjectResults] = useState([]);
  const [postResults, setPostResults]       = useState([]);
  const [loading, setLoading]               = useState(false);
  const [trendTracks, setTrendTracks]       = useState([]);
  const [trendArtists, setTrendArtists]     = useState([]);
  const [landingLoading, setLandingLoading] = useState(true);
  const [recents, setRecents]               = useState(() => {
    try { return JSON.parse(localStorage.getItem("search_recents") ?? "[]"); } catch { return []; }
  });
  const [myId, setMyId]                     = useState(null);
  const [followingIds, setFollowingIds]     = useState(() => new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setMyId(uid);
      if (!uid) return;
      supabase.from("follows").select("following_id").eq("follower_id", uid)
        .then(({ data }) => setFollowingIds(new Set((data ?? []).map(r => r.following_id))));
    });
  }, []);

  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const TABS = [
    { key: "song",    label: ml("k128"),    count: songResults.length,    icon: <path d="M12 3v11.26A3.5 3.5 0 1 0 14 17V8h4.5V3H12z" fill="currentColor" stroke="none"/> },
    { key: "artist",  label: ml("k042"),  count: artistResults.length,    icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
    { key: "project", label: ml("k125"), count: projectResults.length,    icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></> },
  ];
  const inputRef = useRef(null);
  const isMobile = useIsMobile();
  const pad = isOpen ? 220 : 90;

  useEffect(() => { setInputVal(state?.query ?? ""); }, [state?.query]);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("tracks").select("id, title, artist, cover_url, audio_url, grad, genre, duration, author_id").eq("type", "song").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("id, username, handle, avatar_url").neq("id", ADMIN_ID).order("created_at", { ascending: false }).limit(10),
      ]);
      preloadCovers(t);
      setTrendTracks(t ?? []);
      setTrendArtists(p ?? []);
      setLandingLoading(false);
    })();
  }, []);

  function addRecent(q) {
    if (!q.trim()) return;
    const next = [q, ...recents.filter(r => r !== q)].slice(0, 10);
    setRecents(next);
    localStorage.setItem("search_recents", JSON.stringify(next));
  }

  function removeRecent(i) {
    const next = recents.filter((_, idx) => idx !== i);
    setRecents(next);
    localStorage.setItem("search_recents", JSON.stringify(next));
  }

  useEffect(() => {
    const query = (state?.query ?? "").trim();
    if (!query) { setLoading(false); return; }
    setLoading(true);

    (async () => {
      const fq = query.split("").join("%");
      const [{ data: profiles }, { data: posts }, { data: tracks }] = await Promise.all([
        supabase.from("profiles").select("id, username, handle, avatar_url").or(`username.ilike.%${fq}%,handle.ilike.%${fq}%`).neq("id", ADMIN_ID).order("created_at", { ascending: false }).limit(12),
        supabase.from("posts").select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)").ilike("title", `%${fq}%`).order("created_at", { ascending: false }).limit(12),
        supabase.from("tracks").select("id, title, type, genre, cover_url, audio_url, duration, author_id, profiles!tracks_author_id_fkey(username, handle)").eq("type", "song").ilike("title", `%${fq}%`).order("created_at", { ascending: false }).limit(12),
      ]);

      setArtistResults((profiles ?? []).map((p, i) => ({
        name: p.username ?? p.handle ?? "아티스트",
        id: p.handle ? `@${p.handle}` : `@${p.username ?? ""}`,
        supabaseId: p.id,
        initial: (p.username ?? p.handle ?? "?")[0].toUpperCase(),
        gradient: PROFILE_GRADIENTS[i % PROFILE_GRADIENTS.length],
        avatar_url: p.avatar_url ?? null,
      })));

      preloadCovers(tracks);
      setSongResults((tracks ?? []).map((t, i) => ({
        id: t.id, title: t.title,
        artist: t.profiles?.username ?? t.profiles?.handle ?? "아티스트",
        author_id: t.author_id ?? null,
        type: t.type ?? "Single",
        genre: (() => { const g = Array.isArray(t.genre) ? t.genre[0] : t.genre; if (!g) return "—"; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "—" : g; } catch { return g; } } return g; })(),
        cover_url: t.cover_url ?? null, audio_url: t.audio_url ?? null,
        duration: (() => { const d = t.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const s = typeof d === "number" ? d : parseInt(d, 10); return isNaN(s) ? "—" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`; })(),
        grad: t.cover_url ? `url(${t.cover_url}) center/cover` : GRAD_FALLBACKS[i % GRAD_FALLBACKS.length],
      })));

      setProjectResults((posts ?? []).map(mapDbPost));
      setLoading(false);
    })();
  }, [state?.query]);

  useEffect(() => {
    const trimmed = inputVal.trim();
    if (!trimmed || trimmed === (state?.query ?? "").trim()) return;
    const timer = setTimeout(() => {
      addRecent(trimmed);
      navigate("/search-results", { state: { query: trimmed } });
    }, 350);
    return () => clearTimeout(timer);
  }, [inputVal]);

  const hasAny = artistResults.length > 0 || songResults.length > 0 || projectResults.length > 0 || postResults.length > 0;

  if (isMobile) {
    const q = (state?.query ?? "").trim();
    const music = q ? songResults : (trendTracks ?? []).map(t => ({ id: t.id, title: t.title, artist: t.artist, cover_url: t.cover_url, audio_url: t.audio_url, author_id: t.author_id }));
    const artists = q ? artistResults : (trendArtists ?? []).map((p, i) => ({ name: p.username ?? p.handle ?? "아티스트", id: p.handle ? `@${p.handle}` : `@${p.username ?? ""}`, supabaseId: p.id, avatar_url: p.avatar_url ?? null, gradient: PROFILE_GRADIENTS[i % PROFILE_GRADIENTS.length] }));
    const posts = q ? projectResults : [];
    return (
      <MobileSearch
        inputVal={inputVal} setInputVal={setInputVal}
        activeTab={activeTab} setActiveTab={setActiveTab}
        music={music} artists={artists} posts={posts}
        query={q} playTrack={playTrack}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000000" }}>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div style={{ marginLeft: pad, transition: `margin-left ${DURATION} ${EASE}`, display: "flex", alignItems: "flex-start", minWidth: 900 }}>
        <main style={{ flex: 1, minWidth: 0 }}>

        {/* sticky 검색바 + 탭 */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(22px) saturate(150%)", WebkitBackdropFilter: "blur(22px) saturate(150%)" }}>
          <div style={{ padding: "22px 40px 18px" }}>
            <div style={{ maxWidth: 560, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, height: 52, padding: "0 18px", borderRadius: 999, background: "#16161A", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", cursor: "text" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke .2s" }}>
                  <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  ref={inputRef}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && inputVal.trim()) { addRecent(inputVal.trim()); navigate("/search-results", { state: { query: inputVal.trim() } }); } }}
                  placeholder={ml("k126")}
                  style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 16.5, fontWeight: 500, letterSpacing: "-0.01em", fontFamily: "inherit" }}
                />
                {inputVal && (
                  <button onClick={() => { setInputVal(""); navigate("/search-results"); }} style={{ all: "unset", width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer", color: "#fff", background: "rgba(255,255,255,0.09)", flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {state?.query && !loading && (
            <div style={{ padding: "4px 20px 4px" }}>
              <div style={{ display: "flex" }}>
                {TABS.map(({ key, label, count, icon }) => {
                  const active = activeTab === key;
                  return (
                    <button key={key} onClick={() => setActiveTab(key)}
                      style={{
                        all: "unset", cursor: "pointer", flex: 1,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        height: 50,
                        color: active ? "#fff" : "rgba(255,255,255,0.4)",
                        fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                        transition: "color 160ms",
                      }}
                    >
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 7, height: "100%", boxSizing: "border-box",
                        borderBottom: active ? "2px solid #FC3C44" : "2px solid transparent",
                      }}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                        <span>{label}</span>
                        <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.65 }}>{count}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "28px 24px 96px 16px" }}>
          {!state?.query ? (
            /* ── 랜딩 화면 ── */
            <div style={{ padding: "0 0 0 20px" }}>
              {recents.length > 0 && (
                <section style={{ marginBottom: 36 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 14 }}>{ml("k127")}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                    {recents.map((r, i) => (
                      <span key={i} onClick={() => { setInputVal(r); inputRef.current?.focus(); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 8px 0 14px", borderRadius: 999, background: "rgba(255,255,255,0.045)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.045)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                      >
                        {r}
                        <span onClick={e => { e.stopPropagation(); removeRecent(i); }}
                          style={{ width: 20, height: 20, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", cursor: "pointer" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </span>
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {landingLoading ? <Spinner /> : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 48px" }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>{ml("k128")} <span style={{ fontSize: 12.5, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>{ml("k129")}</span></div>
                    {trendTracks.map((t, i) => (
                      <div key={t.id} onClick={() => playTrack(t)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 10px", borderRadius: 10, cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ width: 20, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#FC3C44", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                        <div style={{ width: 44, height: 44, position: "relative", flexShrink: 0 }}>
                          <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} />
                          {t.cover_url ? (
                            <div style={{
                              position: "absolute", inset: 0, zIndex: 2,
                              backgroundImage: `url(${t.cover_url})`,
                              backgroundSize: "cover", backgroundPosition: "center",
                              WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
                              maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
                            }} />
                          ) : (
                            <div style={{
                              position: "absolute", inset: 0, zIndex: 2,
                              background: t.grad ?? GRAD_FALLBACKS[i % GRAD_FALLBACKS.length],
                              WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
                              maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
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
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{t.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>{ml("k042")} <span style={{ fontSize: 12.5, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>{ml("k130")}</span></div>
                    {trendArtists.map((a, i) => (
                      <div key={a.id} onClick={() => navigate(`/profile/${a.id}`)}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 10px", borderRadius: 10, cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ width: 20, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#FC3C44", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: PROFILE_GRADIENTS[i % PROFILE_GRADIENTS.length], boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>
                          {a.avatar_url ? <img loading="eager" decoding="async" src={a.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (a.username ?? a.handle ?? "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.username ?? a.handle}</div>
                          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{`@${a.handle ?? a.username}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : loading ? <Spinner /> : (
            <>
              {activeTab === "artist" && (
                artistResults.length === 0
                  ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "38vh", width: "100%" }}><div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>{ob("noResults", lang)}</div></div>
                  : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "20px 14px" }}>
                      {artistResults.map((a, i) => <ArtistTile key={a.supabaseId ?? i} a={a} myId={myId} followingIds={followingIds} />)}
                    </div>
              )}
              {activeTab === "song" && (
                songResults.length === 0
                  ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "38vh", width: "100%" }}><div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>{ob("noResults", lang)}</div></div>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {songResults.map((s, i) => (
                        <div key={s.id} style={{ borderBottom: i < songResults.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                          <SongRow s={s} sidebarOpen={isOpen} showGenre={!isOpen} />
                        </div>
                      ))}
                    </div>
              )}
              {activeTab === "project" && (
                projectResults.length === 0
                  ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "38vh", width: "100%" }}><div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>{ob("noResults", lang)}</div></div>
                  : <div style={{ display: "flex", gap: 16, paddingBottom: 40, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                        {projectResults.filter((_, i) => i % 2 === 0).map((p, i) => <PostCard key={p.id ?? i} p={p} idx={i} onNavigate={navigate} />)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                        {projectResults.filter((_, i) => i % 2 !== 0).map((p, i) => <PostCard key={p.id ?? i} p={p} idx={i} onNavigate={navigate} />)}
                      </div>
                    </div>
              )}
              {activeTab === "post" && (
                <div style={{ columnWidth: 360, columnGap: 20 }}>
                  {postResults.map((p, i) => <PostCard key={p.id ?? i} p={p} idx={i} onNavigate={navigate} />)}
                </div>
              )}
            </>
          )}
        </div>
        </main>
        {state?.query && <RightSidebar width={320} activeTab={activeTab === "project" ? "projects" : activeTab} page={activeTab === "artist" ? "profile" : undefined} />}
      </div>
    </div>
  );
}
