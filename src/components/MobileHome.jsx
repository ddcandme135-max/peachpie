import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Search, Library, MessageCircle } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useApp } from "../context/AppContext";

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
  const { t } = useTranslation();
  const { unreadCount } = useApp() ?? {};
  const { currentTrack, isPlaying, togglePlay, playNext, playTrack } = usePlayer();

  function play(t, list) {
    playTrack({ id: t.id, title: t.title, artist: t.artist, author_id: t.author_id, cover_url: t.cover_url, audio_url: t.audio_url }, list);
  }

  // 사이드바와 동일한 메뉴
  const tabs = [
    { key: "home",    label: t("nav.home"),    to: "/",        Icon: Home },
    { key: "search",  label: t("nav.search"),  to: "/search",  Icon: Search },
    { key: "library", label: t("nav.library"), to: "/library", Icon: Library },
    { key: "chat",    label: t("nav.chat"),    to: "/chat",    Icon: MessageCircle, badge: unreadCount > 0 },
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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", height: 66, borderRadius: 22, ...GLASS }}>
          {tabs.map(tab => {
            const active = pathname === tab.to;
            return (
              <button key={tab.key} onClick={() => navigate(tab.to)} style={{ all: "unset", cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? ACCENT : "#fff" }}>
                <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
                  <tab.Icon size={24} strokeWidth={2} />
                  {tab.badge && <span style={{ position: "absolute", top: -2, right: -4, width: 7, height: 7, borderRadius: 999, background: ACCENT, boxShadow: "0 0 0 2px rgba(28,28,30,0.9)" }} />}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "-0.02em" }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
