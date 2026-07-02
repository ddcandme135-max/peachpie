import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Search, Library, MessageCircle, Play, Pause, ChevronDown } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useApp } from "../context/AppContext";
import { CDCover } from "./MobileHome";

const ACCENT = "#FC3C44";
const GLASS = { background: "rgba(50,50,58,0.14)", backdropFilter: "blur(30px) saturate(200%)", WebkitBackdropFilter: "blur(30px) saturate(200%)", boxShadow: "0 12px 36px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 1px rgba(255,255,255,0.16)" };

// 홈·검색 등 모바일 페이지 공용 하단 독 (미니 플레이어 + 탭바 + 축소 회전 CD)
export default function MobileDock() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { unreadCount } = useApp() ?? {};
  const { currentTrack, isPlaying, togglePlay, playNext } = usePlayer();
  // 축소 상태를 세션에 유지 → 페이지 이동해도 유지. 곡이 실제로 바뀔 때만 펼침.
  const [collapsed, setCollapsed] = useState(() => sessionStorage.getItem("mp_collapsed") === "1");
  useEffect(() => { sessionStorage.setItem("mp_collapsed", collapsed ? "1" : "0"); }, [collapsed]);
  const prevTrackId = useRef(currentTrack?.id);
  useEffect(() => {
    if (prevTrackId.current !== currentTrack?.id) {
      prevTrackId.current = currentTrack?.id;
      setCollapsed(false);
    }
  }, [currentTrack?.id]);

  const tabs = [
    { key: "home", label: t("nav.home"), to: "/", Icon: Home },
    { key: "search", label: t("nav.search"), to: "/search", Icon: Search },
    { key: "library", label: t("nav.library"), to: "/library", Icon: Library },
    { key: "chat", label: t("nav.chat"), to: "/chat", Icon: MessageCircle, badge: unreadCount > 0 },
  ];

  return (
    <>
      <style>{`@keyframes mhspin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position: "fixed", left: 12, right: 12, bottom: 14, zIndex: 100, display: "flex", flexDirection: "column", gap: 12 }}>
        {currentTrack && !collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 12px 0 10px", borderRadius: 26, ...GLASS }}>
            <div style={{ flex: "none", cursor: "pointer" }}
              onClick={() => { const id = currentTrack.id; if (id) navigate(`/track/${id}`); }}>
              <CDCover cover={currentTrack.cover_url} size={42} spinning={isPlaying} />
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
              <svg width="22" height="22" viewBox="0 0 22 22">
                <polygon points="3,4 11,11 3,18" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <polygon points="12,4 20,11 12,18" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-around", height: 66, borderRadius: 30, ...GLASS }}>
            {tabs.map(tab => {
              const active = pathname === tab.to || (tab.to === "/search" && pathname.startsWith("/search"));
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
          {currentTrack && collapsed && (
            <button onClick={() => setCollapsed(false)} aria-label="플레이어 펼치기" style={{ all: "unset", cursor: "pointer", width: 66, height: 66, borderRadius: 999, flex: "none", display: "grid", placeItems: "center", ...GLASS, border: "2px solid rgba(255,255,255,0.9)" }}>
              <CDCover cover={currentTrack.cover_url} size={50} spinning={isPlaying} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
