import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";

// 모바일(≤768px) 하단 탭 네비게이션 — 홈 / 검색 / New Songs / 프로필
export default function MobileNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { profile } = useApp() ?? {};
  const avatarUrl = profile?.avatar_url ?? null;

  const ICON = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };

  const items = [
    {
      key: "home", label: "홈", to: "/",
      active: pathname === "/",
      icon: <svg {...ICON}><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
    },
    {
      key: "search", label: "검색", to: "/search",
      active: pathname.startsWith("/search"),
      icon: <svg {...ICON}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
    },
    {
      key: "songs", label: "New Songs", to: "/new-songs",
      active: pathname === "/new-songs",
      icon: <svg {...ICON}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
    },
    {
      key: "profile", label: "프로필", to: "/artist",
      active: pathname === "/artist" || pathname.startsWith("/profile/"),
      icon: avatarUrl
        ? <img src={avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
        : <svg {...ICON}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
    },
  ];

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: 60, background: "rgba(0,1,13,0.95)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      zIndex: 100,
    }}>
      {items.map(it => (
        <button key={it.key} onClick={() => navigate(it.to)}
          style={{ all: "unset", cursor: "pointer", flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, color: it.active ? "#fff" : "rgba(255,255,255,0.5)" }}>
          {it.icon}
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "-0.01em" }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
