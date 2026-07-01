import { useState, useEffect } from "react";
import RightSidebar from "../components/RightSidebar";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import MobileLibrary from "../components/MobileLibrary";
import { useIsMobile } from "../lib/useIsMobile";
import { usePlayer } from "../context/PlayerContext";
import { useApp } from "../context/AppContext";
import { Play, X } from "lucide-react";
import PlaylistCreateModal from "../components/PlaylistCreateModal";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import { SongRow } from "./NewSongs";
import { PostCard, mapDbPost } from "./CollabFeed";
import { ml } from "../lib/ml";
import { ob } from "../lib/onboardingI18n";
import { preloadCovers } from "../lib/preloadCovers";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";
const R = "#FC3C44";


const PLAYLIST_GRADS = [
  "linear-gradient(135deg,#7c2d12,#1c0a05)",
  "linear-gradient(135deg,#312e81,#0c0a1f)",
  "linear-gradient(135deg,#064e3b,#0a0a0a)",
  "linear-gradient(135deg,#831843,#1f0815)",
  "linear-gradient(135deg,#1e3a8a,#0c0a1f)",
  "linear-gradient(135deg,#4c1d95,#1e1b4b)",
];

const GRAD_FALLBACKS = [
  "linear-gradient(135deg,#7c2d12,#1a0a05)",
  "linear-gradient(135deg,#4c1d95,#1e1b4b)",
  "linear-gradient(135deg,#831843,#1a0207)",
  "linear-gradient(135deg,#064e3b,#042f2e)",
  "linear-gradient(135deg,#1e3a8a,#0c0a1f)",
  "linear-gradient(135deg,#92400e,#451a03)",
  "linear-gradient(135deg,#0c4a6e,#082f49)",
  "linear-gradient(135deg,#4338ca,#1e1b4b)",
];



function parseGenre(g) {
  if (!g) return "—";
  if (typeof g === "string" && g.startsWith("[")) {
    try { const p = JSON.parse(g); return Array.isArray(p) ? (p[0] ?? "—") : g; } catch { return g; }
  }
  return g;
}

function parseDuration(d) {
  if (!d) return "—";
  if (typeof d === "string" && d.includes(":")) return d;
  const sec = typeof d === "number" ? d : parseInt(d, 10);
  return isNaN(sec) ? "—" : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

function mapTrackRow(t) {
  const base = {
    id: t.id,
    author_id: t.author_id ?? null,
    title: t.title ?? "",
    artist: t.profiles?.username ?? t.artist ?? "아티스트",
    grad: t.grad ?? GRAD_FALLBACKS[0],
    cover_url: t.cover_url ?? null,
    audio_url: t.audio_url ?? null,
    genre: parseGenre(t.genre),
    description: t.description ?? "",
  };
  if (t.type === "project") return { ...base, position: t.position ?? "", avatarUrl: t.profiles?.avatar_url ?? null, desc: base.description };
  return { ...base, type: "Single", duration: parseDuration(t.duration) };
}


/* ─────────── Project Card ─────────── */
function LikedProjectCard({ p, i }) {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  const { playTrack } = usePlayer();
  const grad = p.grad ?? GRAD_FALLBACKS[i % GRAD_FALLBACKS.length];

  return (
    <div onClick={() => navigate(`/project/${p.id}`, { state: { project: p } })} style={{ cursor: "pointer" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: "100%", aspectRatio: "1", borderRadius: 18, position: "relative", overflow: "hidden",
          background: p.cover_url ? "#000" : grad,
          boxShadow: "0 18px 40px -18px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)",
          transform: hov ? "translateY(-4px)" : "translateY(0)",
          transition: `transform 200ms ${EASE}`,
        }}
      >
        {p.cover_url && <img loading="eager" decoding="async" src={p.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        {/* shimmer */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 24% 14%, rgba(255,255,255,0.22), transparent 55%)", pointerEvents: "none" }} />
        {/* play */}
        <div
          onClick={e => { e.stopPropagation(); playTrack(p); }}
          style={{
            position: "absolute", right: 12, bottom: 12, zIndex: 2,
            width: 44, height: 44, borderRadius: 999, cursor: "pointer",
            display: "grid", placeItems: "center", color: "#000",
            background: "rgba(255,255,255,0.94)", boxShadow: "0 8px 20px -6px rgba(0,0,0,0.5)",
            opacity: hov ? 1 : 0, transform: hov ? "none" : "translateY(8px) scale(0.9)",
            transition: "opacity 220ms, transform 220ms",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 17, height: 17, marginLeft: 2 }}><polygon points="6 4 20 12 6 20 6 4" /></svg>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginTop: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.artist}</div>
    </div>
  );
}


/* ─────────── Empty State ─────────── */
function EmptyState({ label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "80px 0", color: "rgba(255,255,255,0.45)", textAlign: "center" }}>
      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13.5 }}>아직 아무것도 없어요</div>
      </div>
    </div>
  );
}

/* ─────────── Main Page ─────────── */
export default function Library() {
  const [isOpen, setIsOpen]     = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("tab_library") ?? "songs");
  useEffect(() => { sessionStorage.setItem("tab_library", activeTab); }, [activeTab]);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const { likedTracks, playTrack } = usePlayer();
  const { deletedTrackIds, deletedPostIds } = useApp();
  const isMobile = useIsMobile();
  const [playlists, setPlaylists]       = useState([]);
  const [likedSongs, setLikedSongs]     = useState([]);
  const [likedProjects, setLikedProjects] = useState([]);
  const [likedPosts, setLikedPosts]     = useState([]);
  const [dataLoading, setDataLoading]   = useState(true);

  useEffect(() => {
    let mounted = true;
    let channel = null;

    const POST_COLS  = "id, title, description, category, genre, image_url, audio_url, audio_name, audio_duration, like_count, comment_count, created_at, author_id, profiles!posts_author_id_fkey(username, avatar_url)";
    const TRACK_COLS = "id, title, artist, cover_url, type, grad, audio_url, genre, duration, position, description, author_id, profiles!tracks_author_id_fkey(username, avatar_url)";

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) { setDataLoading(false); return; }
      const myId = session.user.id;

      const [{ data: likedPostIds }, { data: likedTrackIds }] = await Promise.all([
        supabase.from("likes").select("post_id").eq("user_id", myId).not("post_id", "is", null),
        supabase.from("likes").select("track_id").eq("user_id", myId).not("track_id", "is", null),
      ]);
      if (!mounted) return;

      const postIds  = (likedPostIds  ?? []).map(l => l.post_id).filter(Boolean);
      const trackIds = (likedTrackIds ?? []).map(l => l.track_id).filter(Boolean);

      const [postRows, trackRows] = await Promise.all([
        postIds.length
          ? supabase.from("posts").select(POST_COLS).in("id", postIds).then(r => r.data ?? [])
          : Promise.resolve([]),
        trackIds.length
          ? supabase.from("tracks").select(TRACK_COLS).in("id", trackIds).then(r => r.data ?? [])
          : Promise.resolve([]),
      ]);
      if (!mounted) return;

      const mappedPosts = postRows.map(mapDbPost);
      const songs = [], projects = [];
      for (const t of trackRows) {
        if (t.type === "project") projects.push(mapTrackRow(t));
        else songs.push(mapTrackRow(t));
      }

      preloadCovers(songs);
      setLikedPosts(mappedPosts);
      setLikedSongs(songs);
      setLikedProjects(projects);
      setDataLoading(false);

      // 플레이리스트 로드
      const { data: plRows } = await supabase
        .from("playlists")
        .select("id, title, description, cover_url, created_at, is_public")
        .eq("author_id", myId)
        .order("created_at", { ascending: false });
      const plIds = (plRows ?? []).map(p => p.id);
      const trackCounts = {};
      if (plIds.length) {
        const { data: ptRows } = await supabase
          .from("playlist_tracks")
          .select("playlist_id")
          .in("playlist_id", plIds);
        (ptRows ?? []).forEach(r => {
          trackCounts[r.playlist_id] = (trackCounts[r.playlist_id] ?? 0) + 1;
        });
      }
      if (!mounted) return;
      setPlaylists((plRows ?? []).map((pl, i) => ({
        ...pl,
        name: pl.title,
        count: trackCounts[pl.id] ?? 0,
        grad: PLAYLIST_GRADS[i % PLAYLIST_GRADS.length],
      })));

      channel = supabase
        .channel(`library-likes-${myId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "likes", filter: `user_id=eq.${myId}` },
          async (payload) => {
            if (!mounted) return;
            if (payload.eventType === "INSERT") {
              const { post_id, track_id } = payload.new;
              if (post_id) {
                const { data: p } = await supabase.from("posts").select(POST_COLS).eq("id", post_id).single();
                if (mounted && p) setLikedPosts(prev => [...prev, mapDbPost(p)]);
              }
              if (track_id) {
                const { data: t } = await supabase.from("tracks").select(TRACK_COLS).eq("id", track_id).single();
                if (mounted && t) {
                  if (t.type === "project") setLikedProjects(prev => [...prev, mapTrackRow(t)]);
                  else setLikedSongs(prev => [...prev, mapTrackRow(t)]);
                }
              }
            }
            if (payload.eventType === "DELETE") {
              const { post_id, track_id } = payload.old;
              if (post_id) setLikedPosts(prev => prev.filter(p => p.id !== post_id));
              if (track_id) {
                setLikedSongs(prev => prev.filter(s => s.id !== track_id));
                setLikedProjects(prev => prev.filter(p => p.id !== track_id));
              }
            }
          }
        )
        .subscribe();
    }

    load();
    return () => { mounted = false; if (channel) supabase.removeChannel(channel); };
  }, []);

  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const { state } = useLocation();

  // 프로필 온보딩 등에서 openPlaylistCreate로 진입 시 플레이리스트 탭 + 생성 모달 자동 오픈
  useEffect(() => {
    if (state?.openPlaylistCreate) {
      setActiveTab("playlists");
      setPlaylistModalOpen(true);
      navigate(".", { replace: true, state: null });
    }
  }, [state?.openPlaylistCreate]);

  const pad = isOpen ? 220 : 90;

  function handlePlaylistCreated(pl) {
    setPlaylists(prev => [{
      ...pl, name: pl.title, count: 0,
      grad: PLAYLIST_GRADS[prev.length % PLAYLIST_GRADS.length],
    }, ...prev]);
    showToast(ml("k115"), "success", async () => {
      await supabase.from("playlists").delete().eq("id", pl.id);
      setPlaylists(prev => prev.filter(p => p.id !== pl.id));
    }, "list-music");
    navigate(`/playlist/${pl.id}`);
  }

  async function deletePlaylist(id) {
    await supabase.from("playlists").delete().eq("id", id);
    setPlaylists(prev => prev.filter(p => p.id !== id));
    showToast(ml("k116"), "info", undefined, "trash");
  }

  const TABS = [
    { id: "songs",     label: ml("k144"),   count: likedSongs.length, icon: <path d="M12 3v11.26A3.5 3.5 0 1 0 14 17V8h4.5V3H12z" fill="currentColor" stroke="none"/> },
    { id: "projects",  label: lang === "ko" ? "포스트" : lang === "ja" ? "投稿" : "Post",      count: likedPosts.filter(p => !deletedPostIds.has(p.id)).length, icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></> },
    { id: "playlists", label: ml("k136"),     count: playlists.length, icon: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
  ];

  if (isMobile) {
    const songs = likedSongs.filter(s => !deletedTrackIds.has(s.id));
    const posts = likedPosts.filter(p => !deletedPostIds.has(p.id));
    return (
      <>
        <MobileLibrary
          likedSongs={songs} posts={posts} playlists={playlists}
          activeTab={activeTab} setActiveTab={setActiveTab}
          playTrack={playTrack} onCreatePlaylist={() => setPlaylistModalOpen(true)}
        />
        {playlistModalOpen && (
          <PlaylistCreateModal onClose={() => setPlaylistModalOpen(false)} onCreate={handlePlaylistCreated} />
        )}
      </>
    );
  }

  return (
    <>
    <div style={{ minHeight: "100vh", background: "#000000", overflowX: "auto" }}>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div style={{ paddingLeft: pad, transition: `padding-left ${DURATION} ${EASE}`, minWidth: 1100, display: "flex", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── Sticky Header ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "#000000",
        }}>
          <div style={{ padding: "0 48px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "30px 0 20px", minHeight: 44, boxSizing: "content-box" }}>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, whiteSpace: "nowrap" }}>{ml("k117")}</h1>
              {activeTab === "playlists" && playlists.length > 0 && (
                <button onClick={() => setPlaylistModalOpen(true)}
                  style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 22px", cursor: "pointer", borderRadius: 999, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", transition: "background 200ms", whiteSpace: "nowrap", flexShrink: 0, boxSizing: "border-box" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                  onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  {ml("k118")}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <div style={{ padding: "8px 24px 0 12px" }}>

          {/* Tabs (Instagram style) */}
          <div style={{ display: "flex", marginTop: 28, marginBottom: 28 }}>
            {TABS.map(t => {
              const on = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  style={{
                    all: "unset", cursor: "pointer", flex: 1,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    height: 50,
                    color: on ? "#fff" : "rgba(255,255,255,0.4)",
                    fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                    transition: "color 160ms",
                  }}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 7, height: "100%", boxSizing: "border-box",
                    borderBottom: on ? "2px solid #FC3C44" : "2px solid transparent",
                  }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
                    <span>{t.label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.65 }}>{t.count}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── 좋아요 음원 ── */}
          {activeTab === "songs" && (
            dataLoading ? null :
            likedSongs.filter(s => !deletedTrackIds.has(s.id)).length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, minHeight: "62vh", width: "100%" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                  {ob("noLikedSongs", lang)}
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
              <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 96, paddingTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: !isOpen ? "68px 1fr 1fr 1fr 60px 32px" : "68px 1fr 1fr 60px 32px", gap: 14, padding: "6px 12px", marginBottom: 4, transition: "grid-template-columns 200ms" }}>
                  {[
                    { label: "" },
                    { label: ml("k122") },
                    { label: ml("k006") },
                    ...(!isOpen ? [{ label: ml("k003") }] : []),
                    { label: ml("k123"), align: "center" },
                    { label: "" },
                  ].map((h, i) => (
                    <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", paddingLeft: i === 2 ? (isOpen ? 96 : 120) : 0, textAlign: (!isOpen && i === 3) || (!isOpen ? i === 4 : i === 3) ? "center" : "left", transition: i === 2 ? `padding-left ${DURATION} ${EASE}` : undefined }}>{h.label}</div>
                  ))}
                </div>
                {likedSongs.filter(s => !deletedTrackIds.has(s.id)).map((s, i, arr) => (
                  <div key={s.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                    <SongRow s={s} sidebarOpen={isOpen} showGenre={!isOpen} />
                  </div>
                ))}
              </div>
            )
          )}

        </div>

        {/* ── 플레이리스트 ── */}
        {activeTab === "playlists" && (
          playlists.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, minHeight: "62vh", width: "100%", padding: "0 24px 0 12px", boxSizing: "border-box" }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                {ob("noPlaylists", lang)}
              </div>
              <button onClick={() => setPlaylistModalOpen(true)}
                style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 22px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", transition: "background 160ms" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              >
                {ob("create", lang)}
              </button>
            </div>
          ) : (
            <div style={{ padding: "12px 24px 80px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 178px)", gap: 20 }}>
                {playlists.map((pl, i) => (
                  <PlaylistCard key={pl.id} pl={pl} i={i} onDelete={deletePlaylist} onNavigate={id => navigate(`/playlist/${id}`)} />
                ))}
              </div>
            </div>
          )
        )}

        {/* ── 프로젝트 ── */}
        {activeTab === "projects" && (
          dataLoading ? null :
          (() => {
            const posts = likedPosts.filter(p => !deletedPostIds.has(p.id));
            const left  = posts.filter((_, i) => i % 2 === 0);
            const right = posts.filter((_, i) => i % 2 !== 0);
            return posts.length === 0
              ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, minHeight: "62vh", width: "100%" }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                    {ob("noProjects", lang)}
                  </div>
                </div>
              )
              : (
              <div style={{ display: "flex", gap: 16, padding: "12px 24px 40px 12px", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  {left.map((p, i) => <PostCard key={p.id} p={p} idx={i} onNavigate={navigate} onUnlike={() => setLikedPosts(prev => prev.filter(x => x.id !== p.id))} />)}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  {right.map((p, i) => <PostCard key={p.id} p={p} idx={i} onNavigate={navigate} onUnlike={() => setLikedPosts(prev => prev.filter(x => x.id !== p.id))} />)}
                </div>
              </div>
            );
          })()
        )}


        </div>{/* flex:1 wrapper */}
        <RightSidebar width={320} activeTab={activeTab} />
      </div>
    </div>

    {playlistModalOpen && (
      <PlaylistCreateModal
        onClose={() => setPlaylistModalOpen(false)}
        onCreate={handlePlaylistCreated}
      />
    )}
    </>
  );
}

function PlaylistCard({ pl, i, onDelete, onNavigate }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position: "relative", cursor: "pointer" }} onClick={() => onNavigate(pl.id)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        aspectRatio: "1", borderRadius: 14,
        background: pl.cover_url ? "#000" : "rgba(255,255,255,0.06)",
        marginBottom: 10, position: "relative", overflow: "hidden",
        boxShadow: "0 18px 40px -18px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 200ms cubic-bezier(0.2,0.7,0.2,1)",
      }}>
        {pl.cover_url
          ? <img loading="eager" decoding="async" src={pl.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
        }
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2, overflow: "hidden" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{pl.name}</div>
        {!pl.is_public && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#a7a7a7" style={{ flexShrink: 0 }} aria-hidden="true">
            <path d="M17 9V7a5 5 0 0 0-10 0v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3zM9 7a3 3 0 0 1 6 0v2H9zm4 9.7V18a1 1 0 0 1-2 0v-1.3a1.5 1.5 0 1 1 2 0z"/>
          </svg>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(pl.id); }}
        style={{
          position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%",
          background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
          opacity: hov ? 1 : 0, transition: "opacity 150ms",
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
