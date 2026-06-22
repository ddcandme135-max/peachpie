import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Library, MessageCircle, LayoutList } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { supabase } from "../lib/supabase";
import { useApp as useUser } from "../context/AppContext";
import AuthModal from "./AuthModal";
import cdImg from "../assets/_-removebg-preview.png";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

let _sbCdDeg = 0;
let _sbCdLastTs = null;

function CDPlayer({ coverUrl, grad, isPlaying, size = 36 }) {
  const imgRef   = useRef(null);
  const coverRef = useRef(null);
  const rafRef   = useRef(null);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      _sbCdLastTs = null;
      return;
    }
    const t0 = `rotate(${_sbCdDeg}deg)`;
    if (imgRef.current)   imgRef.current.style.transform   = t0;
    if (coverRef.current) coverRef.current.style.transform = t0;
    const animate = ts => {
      if (_sbCdLastTs !== null) {
        _sbCdDeg = (_sbCdDeg + ((ts - _sbCdLastTs) / 4000) * 360) % 360;
        const t = `rotate(${_sbCdDeg}deg)`;
        if (imgRef.current)   imgRef.current.style.transform   = t;
        if (coverRef.current) coverRef.current.style.transform = t;
      }
      _sbCdLastTs = ts;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <img loading="eager" decoding="async" ref={imgRef} src={cdImg} alt="cd" style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        objectFit: "contain",
        transformOrigin: "center center",
        zIndex: 1,
      }} />
      {coverUrl && (
        <div ref={coverRef} style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          overflow: "hidden",
          zIndex: 2,
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
          maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)",
          transformOrigin: "center center",
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
  );
}

const PHASES = [0, 1.1, 2.3, 0.7, 1.8];
const SPEEDS = [0.42, 0.35, 0.50, 0.38, 0.45];
const MAX_H = 6;
const CY = 10;

function SidebarWaveform({ isPlaying }) {
  const [heights, setHeights] = useState([5, 8, 12, 8, 5]);

  useEffect(() => {
    if (!isPlaying) {
      setHeights([1, 1, 1, 1, 1]);
      return;
    }
    let start = null;
    let raf;
    const animate = (ts) => {
      if (!start) start = ts;
      const t = (ts - start) / 1000;
      setHeights(PHASES.map((p, i) =>
        MAX_H * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / SPEEDS[i] + p)))
      ));
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  return (
    <div style={{
      position: "absolute", inset: 0, borderRadius: 8,
      background: "rgba(0,0,0,0.38)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="23" height="20" viewBox="0 0 23 20">
        {heights.map((h, i) => (
          <line
            key={i}
            x1={i * 5 + 1.5} x2={i * 5 + 1.5}
            y1={CY - h / 2} y2={CY + h / 2}
            stroke="white" strokeWidth={3} strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}

export default function Sidebar({ isOpen, setIsOpen, showPlayer }) {
  const { currentTrack, isPlaying, sidebarPlayer, setSidebarPlayer, togglePlay } = usePlayer();
  const [cdHover, setCdHover] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { session, profile, loading, unreadCount } = useUser();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileHover, setProfileHover]  = useState(false);

  useEffect(() => {
    sessionStorage.setItem("sidebar_open", isOpen ? "1" : "0");
    window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: { isOpen } }));
  }, [isOpen]);

  const menuItems = [
    { icon: Home,          label: t("nav.home"),    path: "/" },
    { icon: Search,        label: t("nav.search"),  path: "/search" },
    { icon: Library,       label: t("nav.library"), path: "/library" },
    { icon: MessageCircle, label: t("nav.chat"),    path: "/chat", badge: unreadCount > 0 },
  ];

  const user = session?.user;
  const displayName   = profile?.username || user?.email?.split("@")[0] || "";
  const displayHandle = profile?.handle ? `@${profile.handle}` : `@${displayName}`;
  const displayEmail  = user?.email || "";
  const avatarUrl     = profile?.avatar_url || null;
  const avatarInitial = (displayName[0] || "U").toUpperCase();

  const myProfileState = {
    name: displayName,
    id: displayHandle,
    gradient: "linear-gradient(135deg,#FC3C44,#7c2d12)",
    initial: avatarInitial,
    isMe: true,
  };

  function handleProfileClick() {
    if (loading) return;
    if (session) navigate("/artist", { state: myProfileState });
    else setAuthModalOpen(true);
  }

  async function handleSignOut(e) {
    e.stopPropagation();
    await supabase.auth.signOut();
  }

  return (
    <>
      {authModalOpen && (
        <AuthModal onClose={() => setAuthModalOpen(false)} />
      )}

      <div
        className={`fixed top-0 left-0 h-screen flex items-center z-50 py-6
transition-[width] duration-[600ms] ease-[cubic-bezier(0.32,0.72,0,1)]
${isOpen ? "w-[290px]" : "w-[100px]"}`}
        style={{ willChange: "transform", transform: "translateZ(0)", pointerEvents: "none" }}
      >
        <div
          className={`h-[85%]
text-white
rounded-2xl border border-white/[0.06]
flex flex-col
transition-[width] duration-[600ms] ease-[cubic-bezier(0.32,0.72,0,1)]
${isOpen ? "w-[210px] p-4" : "w-[72px] p-2"}`}
          style={{ pointerEvents: "auto", background: "rgba(28,28,30,0.85)", backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)" }}
        >
          {/* 상단 */}
          <div className={`flex items-center mb-6 ${isOpen ? "justify-between" : "justify-center"}`}>
            <div
              className="text-lg font-semibold overflow-hidden whitespace-nowrap"
              style={{
                opacity: isOpen ? 1 : 0,
                width: isOpen ? "auto" : 0,
                transition: "opacity 600ms cubic-bezier(0.32,0.72,0,1), width 600ms cubic-bezier(0.32,0.72,0,1)",
              }}
            >
              <span style={{ fontFamily: "'Agbalumo', cursive", color: "#F5854D", fontSize: 28, fontWeight: 400, letterSpacing: "0.01em", marginLeft: 8 }}>Bridge</span>
            </div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white/60 hover:text-white transition-all duration-300 hover:scale-125 outline-none"
            >
              <span style={{ fontSize: "2.6rem", lineHeight: 1 }}>{isOpen ? "‹" : "›"}</span>
            </button>
          </div>

          {/* 메뉴 */}
          <div className="flex flex-col gap-5">
            {menuItems.map((item, i) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={i}
                  to={item.path}
                  className={`flex items-center py-2 rounded-xl outline-none
  ${isOpen ? "pl-2 pr-3" : "px-0 justify-center"}
  ${isActive ? "text-white bg-white/10" : "text-white/60 hover:text-white"}
  cursor-pointer transition-all duration-300 ease-out
  hover:scale-110 hover:-translate-y-1`}
                >
                  <span className="w-6 flex justify-start" style={{ position: "relative" }}>
                    <Icon size={20} />
                    {item.badge && (
                      <span style={{ position: "absolute", top: -2, right: -3, width: 7, height: 7, borderRadius: "50%", background: "#fff", boxShadow: "0 0 6px rgba(255,255,255,0.5)" }} />
                    )}
                  </span>
                  {isOpen && <span className="ml-2 whitespace-nowrap">{item.label}</span>}
                </Link>
              );
            })}

            {/* 사이드바 플레이어 */}
            {(showPlayer || sidebarPlayer) && currentTrack && (
              <div style={{
                marginTop: 4,
                padding: isOpen ? "10px 6px" : "6px 4px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center",
                gap: isOpen ? 10 : 0, overflow: "hidden",
                transition: "gap 600ms cubic-bezier(0.32,0.72,0,1)",
                justifyContent: isOpen ? "flex-start" : "center",
              }}>
                <div
                  onClick={e => { e.stopPropagation(); togglePlay(); }}
                  onMouseEnter={() => setCdHover(true)}
                  onMouseLeave={() => setCdHover(false)}
                  style={{ cursor: "pointer", flexShrink: 0, position: "relative", width: 36, height: 36 }}
                >
                  <CDPlayer coverUrl={currentTrack.cover_url} grad={currentTrack.grad} isPlaying={isPlaying} size={36} />
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%", zIndex: 10,
                    display: "grid", placeItems: "center",
                    background: "rgba(0,0,0,0.5)", color: "#fff",
                    opacity: cdHover ? 1 : 0, transition: "opacity 150ms", pointerEvents: "none",
                  }}>
                    {isPlaying
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><polygon points="6 4 20 12 6 20 6 4"/></svg>}
                  </div>
                </div>
                <div
                  onClick={() => setSidebarPlayer(false)}
                  title={t("player.restore") ?? ""}
                  style={{
                    minWidth: 0, flex: 1, cursor: "pointer",
                    opacity: isOpen ? 1 : 0,
                    width: isOpen ? "auto" : 0,
                    overflow: "hidden",
                    transition: "opacity 400ms, width 600ms cubic-bezier(0.32,0.72,0,1)",
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentTrack.title}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                    {currentTrack.artist}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 언어 선택 */}
          <div style={{ marginTop: "auto", paddingBottom: 4 }}>
            <LanguageSwitcher isOpen={isOpen} />
          </div>

          {/* 하단 — 프로필 / 로그인 */}
          <div
            onMouseEnter={() => setProfileHover(true)}
            onMouseLeave={() => setProfileHover(false)}
          >
            <div
              onClick={handleProfileClick}
              style={{
                display: "flex", alignItems: "center",
                gap: isOpen ? 10 : 0,
                padding: "8px", borderRadius: 10, cursor: "pointer",
                background: profileHover ? "rgba(255,255,255,0.05)" : "transparent",
                transition: "background 120ms",
                justifyContent: isOpen ? "flex-start" : "center",
              }}
            >
              {/* 아바타 */}
              {loading ? (
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  flexShrink: 0,
                }} />
              ) : session ? (
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "linear-gradient(135deg,#FC3C44,#7c2d12)",
                  flexShrink: 0, display: "grid", placeItems: "center",
                  fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden",
                }}>
                  {avatarUrl
                    ? <img loading="eager" decoding="async" src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : avatarInitial}
                </div>
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  flexShrink: 0, display: "grid", placeItems: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.45)">
                    <path d="M12 12c2.7 0 5-2.2 5-5s-2.3-5-5-5-5 2.2-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
                  </svg>
                </div>
              )}

              {/* 이름 / 이메일 */}
              {isOpen && (
                <div style={{ minWidth: 0, flex: 1 }}>
                  {loading ? (
                    <>
                      <div style={{ height: 11, borderRadius: 4, background: "rgba(255,255,255,0.08)", width: "65%", marginBottom: 5 }} />
                      <div style={{ height: 9,  borderRadius: 4, background: "rgba(255,255,255,0.05)", width: "45%" }} />
                    </>
                  ) : session ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {displayHandle}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>{t("auth.login")}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", whiteSpace: "nowrap" }}>{t("auth.loginPrompt")}</div>
                    </>
                  )}
                </div>
              )}

              {/* 로그아웃 버튼 */}
              {isOpen && session && profileHover && (
                <button
                  onClick={handleSignOut}
                  title={t("auth.logout")}
                  style={{
                    background: "none", border: "none", outline: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.35)", padding: 4,
                    display: "flex", flexShrink: 0, borderRadius: 6,
                    transition: "color 120ms",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.75)"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
