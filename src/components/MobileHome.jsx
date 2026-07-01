import { useNavigate, useLocation } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

// 모바일 홈 화면 — Apple Music 스타일 (Mobile-Home.html 디자인 적용)
const ACCENT = "#FC3C44";
const GLASS = { background: "rgba(28,28,30,0.72)", backdropFilter: "blur(20px) saturate(140%)", WebkitBackdropFilter: "blur(20px) saturate(140%)", boxShadow: "0 12px 32px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)" };
const FALLBACK = "linear-gradient(135deg,#3a3a44,#15151b)";

function FeatureCard({ t, onPlay }) {
  return (
    <div style={{ flex: "none", width: 300, scrollSnapAlign: "start", cursor: "pointer" }} onClick={onPlay}>
      <div style={{ width: 300, height: 300, borderRadius: 18, overflow: "hidden", position: "relative", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: t.cover_url ? "#000" : FALLBACK }}>
        {t.cover_url && <img loading="eager" decoding="async" src={t.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 45%)" }} />
        <div style={{ position: "absolute", left: 18, right: 18, bottom: 16, zIndex: 2 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.82)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.artist}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 3, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
        </div>
      </div>
    </div>
  );
}

function Tile({ t, onPlay }) {
  return (
    <div style={{ flex: "none", width: 180, scrollSnapAlign: "start", cursor: "pointer" }} onClick={onPlay}>
      <div style={{ width: 180, height: 180, borderRadius: 14, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: t.cover_url ? "#000" : FALLBACK }}>
        {t.cover_url && <img loading="eager" decoding="async" src={t.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 11, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.artist}</div>
    </div>
  );
}

const railStyle = { display: "flex", gap: 16, overflowX: "auto", padding: "0 24px 4px", scrollSnapType: "x proximity", scrollbarWidth: "none", msOverflowStyle: "none" };

export default function MobileHome({ avatarUrl, featured = [], recent = [] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { currentTrack, isPlaying, togglePlay, playNext, playTrack } = usePlayer();

  function play(t, list) {
    playTrack({ id: t.id, title: t.title, artist: t.artist, author_id: t.author_id, cover_url: t.cover_url, audio_url: t.audio_url }, list);
  }

  const tabs = [
    { key: "home", label: "홈", to: "/", active: pathname === "/", icon: <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeLinejoin="round"><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" /></svg> },
    { key: "songs", label: "새로운 음악", to: "/new-songs", active: pathname === "/new-songs", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg> },
    { key: "radio", label: "라디오", to: "/for-you", active: pathname === "/for-you", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" /></svg> },
    { key: "library", label: "보관함", to: "/library", active: pathname === "/library", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg> },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#000", color: "#fff", fontFamily: "inherit" }}>
      <style>{`.mh-rail::-webkit-scrollbar{display:none}`}</style>

      <div style={{ overflowY: "auto", padding: "0 0 190px", minHeight: "100dvh" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 18px" }}>
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>홈</span>
          <button onClick={() => navigate("/artist")} style={{ all: "unset", cursor: "pointer", width: 44, height: 44, borderRadius: 999, overflow: "hidden", flex: "none", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)", background: avatarUrl ? "#000" : FALLBACK, display: "grid", placeItems: "center" }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>}
          </button>
        </div>

        {/* 인기 추천곡 */}
        {featured.length > 0 && (
          <section style={{ marginTop: 8 }}>
            <div style={{ padding: "0 24px", marginBottom: 16 }}>
              <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.03em" }}>인기 추천곡</span>
            </div>
            <div className="mh-rail" style={railStyle}>
              {featured.map(t => <FeatureCard key={t.id} t={t} onPlay={() => play(t, featured)} />)}
            </div>
          </section>
        )}

        {/* 최근 재생한 음악 */}
        {recent.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div onClick={() => navigate("/recently-played")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 24px", marginBottom: 16, cursor: "pointer" }}>
              <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.03em" }}>최근 재생한 음악</span>
              <span style={{ color: "rgba(255,255,255,0.6)", display: "grid", placeItems: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </span>
            </div>
            <div className="mh-rail" style={railStyle}>
              {recent.map(t => <Tile key={t.id} t={t} onPlay={() => play(t, recent)} />)}
            </div>
          </section>
        )}
      </div>

      {/* floating dock */}
      <div style={{ position: "fixed", left: 12, right: 12, bottom: 14, zIndex: 100, display: "flex", flexDirection: "column", gap: 12 }}>
        {currentTrack && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: 60, padding: "0 14px 0 10px", borderRadius: 20, ...GLASS }}>
            <div style={{ width: 42, height: 42, borderRadius: 9, flex: "none", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: currentTrack.cover_url ? "#000" : FALLBACK }}
              onClick={() => { const id = currentTrack.id; if (id) navigate(`/track/${id}`); }}>
              {currentTrack.cover_url && <img src={currentTrack.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.artist}</div>
            </div>
            <button onClick={togglePlay} aria-label="재생" style={{ all: "unset", cursor: "pointer", width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", flex: "none" }}>
              {isPlaying
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.2" /><rect x="14" y="4" width="4" height="16" rx="1.2" /></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14c0-1.32 1.43-2.15 2.58-1.49l11.04 6.36c1.15.66 1.15 2.32 0 2.98L10.58 19.35C9.43 20.01 8 19.18 8 17.86z" transform="translate(-1.5 0)" /></svg>}
            </button>
            <button onClick={() => playNext?.()} aria-label="다음" style={{ all: "unset", cursor: "pointer", width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", flex: "none" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M14.6 6H17v12h-2.4zM4 6l9 6-9 6z" /></svg>
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-around", height: 66, borderRadius: 22, ...GLASS }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => navigate(tab.to)} style={{ all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab.active ? ACCENT : "rgba(255,255,255,0.5)" }}>
                <span style={{ width: 24, height: 24, display: "grid", placeItems: "center" }}>{tab.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "-0.02em" }}>{tab.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => navigate("/search")} aria-label="검색" style={{ all: "unset", cursor: "pointer", width: 66, height: 66, borderRadius: 999, flex: "none", display: "grid", placeItems: "center", color: "#fff", ...GLASS }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
