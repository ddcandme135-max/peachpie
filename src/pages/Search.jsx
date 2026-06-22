import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { fetchTrending } from "../lib/api";
import { useApp } from "../context/AppContext";
import { usePlayer } from "../context/PlayerContext";
import cdImg from "../assets/_-removebg-preview.png";

const EASE     = "cubic-bezier(0.32,0.72,0,1)";
const DURATION = "600ms";

const GRADS = [
  "linear-gradient(135deg,#7c2d12,#1a0a05)",
  "linear-gradient(135deg,#4c1d95,#1e1b4b)",
  "linear-gradient(135deg,#831843,#1a0207)",
  "linear-gradient(135deg,#064e3b,#042f2e)",
  "linear-gradient(135deg,#1e3a8a,#0c0a1f)",
  "linear-gradient(135deg,#92400e,#451a03)",
  "linear-gradient(135deg,#0c4a6e,#082f49)",
  "linear-gradient(135deg,#4338ca,#1e1b4b)",
];


function avGrad(id) {
  if (!id) return GRADS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}

function RankRow({ rank, art, title, sub, round, cdThumb, onPlay, onFollow, followed, navigateTo, onNavigate }) {
  const navigate = useNavigate();
  return (
    <>
    <style>{`
      .rank-row { background: transparent; border-radius: 12px; }
      .rank-row:hover { background: rgba(255,255,255,0.05); }
      .rank-row:hover .rank-num { color: #FF505A !important; }
      .rank-row:hover .play-overlay { opacity: 1 !important; }
      .rank-arrow { opacity: 0; transform: translateX(-4px); transition: opacity 150ms, transform 150ms; }
      .rank-row:hover .rank-arrow { opacity: 1 !important; transform: translateX(0); }
    `}</style>
    <div
      className="rank-row"
      onClick={() => onNavigate ? onNavigate() : (navigateTo && navigate(navigateTo))}
      style={{ display: "flex", alignItems: "center", gap: 15, padding: "10px", cursor: "pointer", transition: "background 150ms" }}
    >
      <span className="rank-num" style={{ width: 20, flexShrink: 0, textAlign: "center", fontFamily: "Pretendard", fontSize: 15, fontWeight: 700, color: "#FC3C44", fontVariantNumeric: "tabular-nums", transition: "color 150ms" }}>{rank}</span>
      {cdThumb ? (
        <div style={{ width: 64, height: 64, position: "relative", flexShrink: 0 }}>
          <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} />
          {art?.url && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 2,
              backgroundImage: `url(${art.url})`,
              backgroundSize: "cover", backgroundPosition: "center",
              WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
              maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
            }} />
          )}
          <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: "50%", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)", WebkitMaskImage: "radial-gradient(circle, transparent 18%, black 19%)", maskImage: "radial-gradient(circle, transparent 18%, black 19%)" }} />
          {onPlay && (
            <div className="play-overlay" onClick={e => { e.stopPropagation(); onPlay(); }} style={{ position: "absolute", inset: 0, zIndex: 4, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.42)", opacity: 0, transition: "opacity 150ms", color: "#fff", borderRadius: "50%" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 1 }}><polygon points="6 4 20 12 6 20 6 4"/></svg>
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: 48, height: 48, borderRadius: round ? "50%" : 6, flexShrink: 0, position: "relative", overflow: "hidden", background: art?.bg ?? GRADS[0], boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          {art?.url && <img loading="eager" decoding="async" src={art.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          {onPlay && (
            <div className="play-overlay" onClick={e => { e.stopPropagation(); onPlay(); }} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.42)", opacity: 0, transition: "opacity 150ms", color: "#fff" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 1 }}><polygon points="6 4 20 12 6 20 6 4"/></svg>
            </div>
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
      </div>
      {onFollow && (
        <button
          onClick={e => { e.stopPropagation(); onFollow(); }}
          style={{ all: "unset", cursor: "pointer", height: 30, padding: "0 14px", borderRadius: 999, flexShrink: 0, whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 700, color: followed ? "#FC3C44" : "#fff", boxShadow: followed ? "inset 0 0 0 1px rgba(252,60,68,0.4)" : "inset 0 0 0 1px rgba(255,255,255,0.18)", background: followed ? "rgba(252,60,68,0.13)" : "transparent", transition: "background 150ms, color 150ms, box-shadow 150ms" }}
        >{followed ? "팔로잉" : "팔로우"}</button>
      )}
      <svg className="rank-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" stroke="rgba(255,255,255,0.7)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    </>
  );
}


export default function Search() {
  const { deletedTrackIds } = useApp();
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const { playTrack } = usePlayer();
  const navigate = useNavigate();

  const [query, setQuery]                     = useState("");
  const [tracks, setTracks]                   = useState([]);
  const [artists, setArtists]                 = useState([]);
  const [trending, setTrending]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [followed, setFollowed]               = useState({});
  const [recents, setRecents]                 = useState(() => {
    try { return JSON.parse(localStorage.getItem("search_recents") ?? "[]"); } catch { return []; }
  });

  const inputRef = useRef(null);
  const pad = isOpen ? 260 : 80;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: tRows }, { data: pRows }, { data: trendingData }] = await Promise.all([
        supabase.from("tracks").select("id, title, artist, cover_url, audio_url, grad, genre, duration, author_id").eq("type", "song").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("id, username, handle, avatar_url").order("created_at", { ascending: false }).limit(10),
        fetchTrending({ limit: 7 }),
      ]);
      setTracks(tRows ?? []);
      setArtists(pRows ?? []);
      setTrending(trendingData ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function saveRecents(list) {
    setRecents(list);
    localStorage.setItem("search_recents", JSON.stringify(list));
  }

  function addRecent(q) {
    if (!q.trim()) return;
    const next = [q, ...recents.filter(r => r !== q)].slice(0, 10);
    saveRecents(next);
  }

  function removeRecent(i) {
    saveRecents(recents.filter((_, idx) => idx !== i));
  }

  function handleSearch(q) {
    if (!q.trim()) return;
    addRecent(q.trim());
    navigate("/search-results", { state: { query: q.trim() } });
  }

  const filteredTracks  = tracks.filter(t => !deletedTrackIds?.has(t.id));
  const hasQuery        = query.trim().length > 0;

  const matchedTracks  = hasQuery ? filteredTracks.filter(t =>
    t.title?.toLowerCase().includes(query.toLowerCase()) ||
    t.artist?.toLowerCase().includes(query.toLowerCase())
  ) : [];
  const matchedArtists = hasQuery ? artists.filter(a =>
    a.username?.toLowerCase().includes(query.toLowerCase()) ||
    a.handle?.toLowerCase().includes(query.toLowerCase())
  ) : [];

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div style={{ paddingLeft: pad, transition: `padding-left ${DURATION} ${EASE}` }}>

        {/* ── Sticky header ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 30,
          margin: "0", padding: "22px 40px 18px",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(22px) saturate(150%)",
          WebkitBackdropFilter: "blur(22px) saturate(150%)",
        }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div
              onClick={() => inputRef.current?.focus()}
              style={{ display: "flex", alignItems: "center", gap: 12, height: 52, padding: "0 18px", borderRadius: 999, background: "#16161A", boxShadow: `inset 0 0 0 ${query ? "1.5px" : "1px"} ${query ? "rgba(252,60,68,0.55)" : "rgba(255,255,255,0.09)"}`, transition: "box-shadow .2s, background .2s", cursor: "text" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={query ? "#FC3C44" : "#fff"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transition: "stroke .2s" }}>
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSearch(query); }}
                placeholder="아티스트, 곡, 앨범, 협업 검색"
                style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 16.5, fontWeight: 500, letterSpacing: "-0.01em", fontFamily: "inherit" }}
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  style={{ all: "unset", width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer", color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.09)", flexShrink: 0 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          </div>
        </header>

        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px 96px" }}>

          {/* ── RESULTS ── */}
          {hasQuery && (
            <div style={{ marginTop: 26 }}>
              {matchedTracks.length === 0 && matchedArtists.length === 0 ? (
                <div style={{ padding: "70px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>'{query}' 검색 결과가 없어요</div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>다른 키워드로 검색해보세요</div>
                </div>
              ) : (
                <>
                  {matchedArtists.length > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>아티스트</span>
                        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>{matchedArtists.length}</span>
                      </div>
                      {matchedArtists.map((a, i) => (
                        <RankRow key={a.id} rank={i + 1} art={{ url: a.avatar_url, bg: avGrad(a.id) }} title={a.username ?? a.handle} sub={`@${a.handle ?? a.username}`} round onFollow={() => setFollowed(p => ({ ...p, [a.id]: !p[a.id] }))} followed={!!followed[a.id]} navigateTo={`/profile/${a.id}`} />
                      ))}
                    </>
                  )}
                  {matchedTracks.length > 0 && (
                    <div style={{ marginTop: matchedArtists.length ? 22 : 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>곡</span>
                        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>{matchedTracks.length}</span>
                      </div>
                      {matchedTracks.map((t, i) => (
                        <RankRow key={t.id} rank={i + 1} art={{ url: t.cover_url, bg: t.grad ?? avGrad(t.id) }} title={t.title} sub={t.artist} cdThumb onPlay={() => playTrack(t)} navigateTo={`/track/${t.id}`} onNavigate={() => navigate(`/track/${t.id}`, { state: { track: t } })} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── LANDING ── */}
          {!hasQuery && (
            <>
              {/* 최근 검색어 */}
              {recents.length > 0 && (
                <section style={{ marginTop: 34 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 11, marginBottom: 16 }}>
                    <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.025em" }}>최근 검색어</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                    {recents.map((r, i) => (
                      <span
                        key={i}
                        onClick={() => { setQuery(r); inputRef.current?.focus(); }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 8px 0 14px", borderRadius: 999, background: "rgba(255,255,255,0.045)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.7)", cursor: "pointer", whiteSpace: "nowrap", transition: "background .15s, color .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.045)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                      >
                        {r}
                        <span
                          onClick={e => { e.stopPropagation(); removeRecent(i); }}
                          style={{ width: 20, height: 20, borderRadius: 999, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </span>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* 트렌딩 */}
              {trending.length > 0 && (
                <section style={{ marginTop: 34 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                    <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>트렌딩</span>
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>이번 주 인기</span>
                  </div>
                  {trending.filter(item => item.kind === "track").map((item, i) => (
                    <RankRow
                      key={item.id}
                      rank={i + 1}
                      art={{ url: item.cover_url ?? null, bg: item.grad ?? avGrad(item.id) }}
                      title={item.title}
                      sub={item.profiles?.username ?? item.artist ?? ""}
                      cdThumb
                      onPlay={() => playTrack(item)}
                      onNavigate={() => navigate(`/track/${item.id}`, { state: { track: item } })}
                    />
                  ))}
                </section>
              )}

              {/* 지금 뜨는 */}
              <section style={{ marginTop: 34 }}>
                {loading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
                      <path d="M12 3a9 9 0 0 1 9 9"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite" /></path>
                    </svg>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 48px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Music</span>
                        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>최신 업로드순</span>
                      </div>
                      {filteredTracks.slice(0, 7).map((t, i) => (
                        <RankRow key={t.id} rank={i + 1} art={{ url: t.cover_url, bg: t.grad ?? avGrad(t.id) }} title={t.title} sub={t.artist} cdThumb onPlay={() => playTrack(t)} navigateTo={`/track/${t.id}`} onNavigate={() => navigate(`/track/${t.id}`, { state: { track: t } })} />
                      ))}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Artists</span>
                        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>최근 가입순</span>
                      </div>
                      {artists.slice(0, 7).map((a, i) => (
                        <RankRow key={a.id} rank={i + 1} art={{ url: a.avatar_url, bg: avGrad(a.id) }} title={a.username ?? a.handle} sub={`@${a.handle ?? a.username}`} cdThumb onFollow={() => setFollowed(p => ({ ...p, [a.id]: !p[a.id] }))} followed={!!followed[a.id]} navigateTo={`/profile/${a.id}`} />
                      ))}
                    </div>
                  </div>
                )}
              </section>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
