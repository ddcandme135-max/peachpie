import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Search, Library, MessageCircle, Play, Pause, ChevronDown } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useApp } from "../context/AppContext";

// 모바일 홈 화면 — Apple Music 스타일 (Mobile-Home.html 디자인 적용)
const ACCENT = "#FC3C44";
const GLASS = { background: "rgba(30,30,34,0.45)", backdropFilter: "blur(32px) saturate(180%)", WebkitBackdropFilter: "blur(32px) saturate(180%)", boxShadow: "0 12px 36px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 1px rgba(255,255,255,0.12)" };
const FALLBACK = "linear-gradient(135deg,#3a3a44,#15151b)";

function Tile({ cover, title, subtitle, onClick, style }) {
  return (
    <div style={{ flex: "none", width: 160, cursor: "pointer", ...style }} onClick={onClick}>
      <div style={{ width: 160, height: 160, borderRadius: 14, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: cover ? "#000" : FALLBACK }}>
        {cover && <img loading="eager" decoding="async" src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 11, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>}
    </div>
  );
}

function PositionTile({ cover, label, onClick, style }) {
  return (
    <div style={{ flex: "none", width: 248, cursor: "pointer", ...style }} onClick={onClick}>
      <div style={{ width: 248, height: 330, borderRadius: 24, overflow: "hidden", position: "relative", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: cover ? "#000" : FALLBACK }}>
        {cover && <img loading="eager" decoding="async" src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 48%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>{label}</div>
      </div>
    </div>
  );
}

const GUTTER = 24;
// 첫/마지막 카드 인셋은 flex 자식 margin으로 처리(스크롤 flex 컨테이너는 padding-left가 무시됨)
const railStyle = { display: "flex", gap: 16, overflowX: "auto", paddingTop: 0, paddingBottom: 4, scrollbarWidth: "none", msOverflowStyle: "none" };
const edgeStyle = (i, len) => ({ marginLeft: i === 0 ? GUTTER : 0, marginRight: i === len - 1 ? GUTTER : 0 });

export default function MobileHome({ avatarUrl, sections = [] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { unreadCount } = useApp() ?? {};
  const { currentTrack, isPlaying, togglePlay, playNext, playTrack } = usePlayer();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(false); }, [currentTrack?.id]);

  function play(t, list) {
    playTrack({ id: t.id, title: t.title, artist: t.artist, author_id: t.author_id, cover_url: t.cover_url, audio_url: t.audio_url }, list);
  }

  function onCard(t, sec) {
    if (sec.type === "positions") navigate(`/position/${t.key.toLowerCase().replace(/\s/g, "-")}`);
    else if (sec.type === "collabo") navigate(`/project/${t.id}`, { state: { project: t } });
    else play(t, sec.cards);
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 8px" }}>
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>홈</span>
          <button onClick={() => navigate("/artist")} style={{ all: "unset", cursor: "pointer", width: 44, height: 44, borderRadius: 999, overflow: "hidden", flex: "none", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)", background: avatarUrl ? "#000" : FALLBACK, display: "grid", placeItems: "center" }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>}
          </button>
        </div>

        {/* 섹션: Collabo / New Songs / Recently Played / For You (빈 섹션도 표시) */}
        {sections.map(sec => (
          <section key={sec.title} style={{ marginTop: 28 }}>
            <div onClick={() => sec.route && navigate(sec.route)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 24px", marginBottom: 16, cursor: sec.route ? "pointer" : "default" }}>
              <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.03em" }}>{sec.title}</span>
              {sec.route && (
                <span style={{ color: "rgba(255,255,255,0.6)", display: "grid", placeItems: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              )}
            </div>
            {sec.cards.length > 0 ? (
              <div className="mh-rail" style={railStyle}>
                {sec.type === "positions"
                  ? sec.cards.map((t, i) => (
                      <PositionTile key={t.id ?? i} cover={t.cover_url} label={t.title} onClick={() => onCard(t, sec)} style={edgeStyle(i, sec.cards.length)} />
                    ))
                  : sec.cards.map((t, i) => (
                      <Tile key={t.id ?? i} cover={t.cover_url} title={t.title || t.position || "—"} subtitle={t.artist} onClick={() => onCard(t, sec)} style={edgeStyle(i, sec.cards.length)} />
                    ))}
              </div>
            ) : (
              <div style={{ padding: "4px 24px 8px", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>{sec.emptyText || "아직 없어요"}</div>
            )}
          </section>
        ))}
      </div>

      {/* floating dock */}
      <div style={{ position: "fixed", left: 12, right: 12, bottom: 14, zIndex: 100, display: "flex", flexDirection: "column", gap: 12 }}>
        {currentTrack && !collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 12px 0 10px", borderRadius: 26, ...GLASS }}>
            <div style={{ width: 42, height: 42, borderRadius: 9, flex: "none", overflow: "hidden", cursor: "pointer", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: currentTrack.cover_url ? "#000" : FALLBACK }}
              onClick={() => { const id = currentTrack.id; if (id) navigate(`/track/${id}`); }}>
              {currentTrack.cover_url && <img src={currentTrack.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.artist}</div>
            </div>
            <button onClick={() => setCollapsed(true)} aria-label="축소" style={{ all: "unset", cursor: "pointer", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.7)", flex: "none" }}>
              <ChevronDown size={22} />
            </button>
            <button onClick={togglePlay} aria-label="재생" style={{ all: "unset", cursor: "pointer", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", flex: "none" }}>
              {isPlaying ? <Pause size={26} fill="#fff" /> : <Play size={26} fill="#fff" />}
            </button>
            <button onClick={() => playNext?.()} aria-label="다음" style={{ all: "unset", cursor: "pointer", width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", flex: "none" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M14.6 6H17v12h-2.4zM4 6l9 6-9 6z" /></svg>
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", height: 66, borderRadius: 30, ...GLASS }}>
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
