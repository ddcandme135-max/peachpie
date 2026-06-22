import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import { SongRow } from "./NewSongs";
import { usePlayer } from "../context/PlayerContext";
import { supabase } from "../lib/supabase";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const R = "#FC3C44";

const GRAD_FALLBACKS = [
  "linear-gradient(135deg,#7c2d12,#1a0a05)",
  "linear-gradient(135deg,#0c4a6e,#082f49)",
  "linear-gradient(135deg,#4c1d95,#1e1b4b)",
  "linear-gradient(135deg,#064e3b,#0a0a0a)",
  "linear-gradient(135deg,#831843,#1f0815)",
  "linear-gradient(135deg,#1e3a8a,#0c0a1f)",
];

function fmtDur(sec) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function totalDuration(tracks, lang = "ko") {
  const total = tracks.reduce((sum, t) => {
    const d = t.duration;
    if (!d) return sum;
    if (typeof d === "string" && d.includes(":")) {
      const [m, s] = d.split(":").map(Number);
      return sum + (m * 60 + (s || 0));
    }
    const sec = typeof d === "number" ? d : parseInt(d, 10);
    if (isNaN(sec)) return sum;
    return sum + (sec > 86400 ? Math.round(sec / 1000) : sec);
  }, 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (lang === "ko") return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  if (lang === "ja") return h > 0 ? `${h}時間 ${m}分` : `${m}分`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8 5.14c0-1.32 1.43-2.15 2.58-1.49l11.04 6.36c1.15.66 1.15 2.32 0 2.98L10.58 19.35C9.43 20.01 8 19.18 8 17.86z" transform="translate(-1.5 0)"/>
    </svg>
  );
}

function ShuffleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 3h5v5"/>
      <path d="M4 20 21 3"/>
      <path d="M21 16v5h-5"/>
      <path d="m15 15 6 6"/>
      <path d="M4 4l5 5"/>
    </svg>
  );
}

function TrackRow({ track, index, isActive, onPlay }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onPlay}
      style={{
        display: "grid",
        gridTemplateColumns: "44px 48px 1fr 1fr 100px 52px",
        alignItems: "center",
        gap: 12,
        padding: "7px 16px",
        borderRadius: 10,
        background: hov ? "rgba(255,255,255,0.05)" : isActive ? "rgba(252,60,68,0.08)" : "transparent",
        cursor: "pointer",
        transition: `background 120ms ${EASE}`,
      }}
    >
      {/* 번호 / 재생 */}
      <div style={{ display: "grid", placeItems: "center", color: isActive ? R : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {hov
          ? <span style={{ color: "#fff" }}><PlayIcon size={14} /></span>
          : <span style={{ color: isActive ? R : "rgba(255,255,255,0.35)" }}>{index + 1}</span>
        }
      </div>

      {/* 커버 */}
      <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: GRAD_FALLBACKS[index % GRAD_FALLBACKS.length] }}>
        {track.cover_url && (
          <img loading="eager" decoding="async" src={track.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
      </div>

      {/* 제목 + 아티스트 */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? R : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.title}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.artist ?? track.profiles?.username ?? "알 수 없음"}
        </div>
      </div>

      {/* 장르 */}
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {(() => { const g = track.genre; if (!g) return "—"; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "—" : g; } catch { return g; } } return g; })()}
      </div>

      {/* 시간 */}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
        {fmtDur(track.duration)}
      </div>

      {/* 빈 오른쪽 여백 */}
      <div />
    </div>
  );
}

export default function Playlist() {
  const { id: playlistId } = useParams();
  const navigate = useNavigate();
  const { playTrack, currentTrack, setQueue } = usePlayer();

  const { t, i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const [sidebarOpen, setSidebarOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  const pad = sidebarOpen ? 200 : 80;

  useEffect(() => {
    if (!playlistId) return;
    setLoading(true);

    (async () => {
      const { data: pl } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", playlistId)
        .single();

      const { data: ptRows } = await supabase
        .from("playlist_tracks")
        .select("track_id, position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });

      const trackIds = (ptRows ?? []).map(r => r.track_id).filter(Boolean);
      let fetchedTracks = [];
      if (trackIds.length) {
        const { data: trackData } = await supabase
          .from("tracks")
          .select("id, title, artist, cover_url, audio_url, duration, genre, author_id")
          .in("id", trackIds);
        const trackMap = {};
        (trackData ?? []).forEach(t => { trackMap[t.id] = t; });
        fetchedTracks = (ptRows ?? []).map(r => trackMap[r.track_id]).filter(Boolean);
      }

      if (pl?.author_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, handle, avatar_url")
          .eq("id", pl.author_id)
          .single();
        pl.profiles = prof ?? null;
      }

      setPlaylist(pl ?? null);
      setTracks(fetchedTracks);
      setLoading(false);
    })();
  }, [playlistId]);

  function handlePlay(startIndex = 0) {
    if (!tracks.length) return;
    const queue = tracks.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist ?? t.profiles?.username ?? "알 수 없음",
      cover_url: t.cover_url,
      audio_url: t.audio_url,
      duration: t.duration,
    }));
    setQueue(queue);
    playTrack(queue[startIndex]);
  }

  function handleShuffle() {
    if (!tracks.length) return;
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const queue = shuffled.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist ?? t.profiles?.username ?? "알 수 없음",
      cover_url: t.cover_url,
      audio_url: t.audio_url,
      duration: t.duration,
    }));
    setQueue(queue);
    playTrack(queue[0]);
  }

  const coverGrad = GRAD_FALLBACKS[(playlist?.id?.charCodeAt(0) ?? 0) % GRAD_FALLBACKS.length];
  const authorName = playlist?.profiles?.username ?? playlist?.profiles?.handle ?? "알 수 없음";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "grid", placeItems: "center" }}>
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
          <path d="M12 3a9 9 0 0 1 9 9">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", paddingLeft: pad }}>
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
          플레이리스트를 찾을 수 없습니다
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex" }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div style={{ paddingLeft: pad, transition: `padding-left 600ms ${EASE}`, flex: 1, minWidth: 0 }}>

        {/* ── Hero ── */}
        <div style={{ position: "relative", overflow: "hidden" }}>

          <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", padding: "32px 24px 40px 48px" }}>
            <button onClick={() => navigate(-1)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "8px 10px", borderRadius: 8, transition: "background 120ms, color 120ms", marginBottom: 16 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              {t("common.back")}
            </button>
            <div style={{ display: "flex", gap: 36, alignItems: playlist.description ? "flex-start" : "flex-end" }}>

              {/* 커버 */}
              <div style={{
                width: 220, height: 220, flexShrink: 0, borderRadius: 18,
                overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                background: playlist.cover_url ? "#000" : coverGrad,
              }}>
                {playlist.cover_url && (
                  <img loading="eager" decoding="async" src={playlist.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
              </div>

              {/* 메타 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ margin: "0 0 10px", fontSize: 42, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, wordBreak: "keep-all", display: "flex", alignItems: "center", gap: 12 }}>
                  {playlist.title ?? "제목 없음"}
                  {!playlist.is_public && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#a7a7a7" aria-hidden="true" style={{ flexShrink: 0, transform: "translateY(8px)" }}>
                      <path d="M17 9V7a5 5 0 0 0-10 0v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3zM9 7a3 3 0 0 1 6 0v2H9zm4 9.7V18a1 1 0 0 1-2 0v-1.3a1.5 1.5 0 1 1 2 0z"/>
                    </svg>
                  )}
                </h1>
                {playlist.description && (
                  <p style={{ margin: "0 0 14px", fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    {playlist.description}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.5)", flexWrap: "wrap" }}>
                  {playlist?.profiles?.avatar_url
                    ? <img loading="eager" decoding="async" src={playlist.profiles.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                  }
                  <span>{authorName}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                  <span>{lang === "ko" ? `${tracks.length}곡` : lang === "ja" ? `${tracks.length}曲` : `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`}</span>
                  {tracks.length > 0 && (
                    <>
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                      <span>{totalDuration(tracks, lang)}</span>
                    </>
                  )}
                </div>

                {/* 버튼 */}
                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <button
                    onClick={() => handlePlay(0)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      height: 38, padding: "0 36px", borderRadius: 999,
                      background: R, border: "none", color: "#fff",
                      fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      boxShadow: "0 8px 24px -6px rgba(252,60,68,0.55)",
                      transition: `background 150ms ${EASE}, transform 100ms`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FF505A"}
                    onMouseLeave={e => e.currentTarget.style.background = R}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <PlayIcon size={18} /><span style={{ marginLeft: -3 }}>{t("player.play")}</span>
                  </button>
                  <button
                    onClick={handleShuffle}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      height: 38, padding: "0 32px", borderRadius: 999,
                      background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      transition: `background 150ms ${EASE}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  >
                    <ShuffleIcon size={16} />{t("player.shuffle")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 트랙 리스트 ── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 24px 100px" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {tracks.map((track, i, arr) => (
              <div key={track.id} style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                <SongRow s={{ ...track, artist: track.artist ?? "아티스트", grad: GRAD_FALLBACKS[i % GRAD_FALLBACKS.length], duration: (() => { const d = track.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const sec = typeof d === "number" ? d : parseInt(d, 10); return isNaN(sec) ? "—" : `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,"0")}`; })(), genre: (() => { const g = track.genre; if (!g) return "—"; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "—" : g; } catch { return g; } } return g; })() }} sidebarOpen={sidebarOpen} showGenre={!sidebarOpen} />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <button
              onClick={() => navigate("/recently-played", { state: { addToPlaylist: playlistId } })}
              style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "none", border: "none", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "8px 0", opacity: 0.6, transition: "opacity 120ms" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "1"}
              onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
            >
              <span style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ width: 16, height: 16 }}><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </span>
              {t("playlist.addTrack")}
            </button>
          </div>
        </div>
      </div>
      <RightSidebar width={320} />
    </div>
  );
}
