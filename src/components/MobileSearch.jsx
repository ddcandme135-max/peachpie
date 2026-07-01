import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Library, MessageCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

const ACCENT = "#FC3C44";
const GLASS = { background: "rgba(50,50,58,0.14)", backdropFilter: "blur(30px) saturate(200%)", WebkitBackdropFilter: "blur(30px) saturate(200%)", boxShadow: "0 12px 36px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 1px rgba(255,255,255,0.16)" };
const FALLBACK = "linear-gradient(135deg,#3a3a44,#15151b)";
const MoreIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;

function RankRow({ rank, cover, round, title, subtitle, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 0", cursor: "pointer" }}>
      <span style={{ width: 16, textAlign: "center", flex: "none", fontSize: 15, fontWeight: 600, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{rank}</span>
      <div style={{ width: 50, height: 50, borderRadius: round ? 999 : 10, flex: "none", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: typeof cover === "string" && cover.startsWith("linear") ? cover : cover ? "#000" : FALLBACK }}>
        {cover && !cover.startsWith?.("linear") && <img loading="eager" decoding="async" src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
      </div>
      <span style={{ color: "rgba(255,255,255,0.35)", flex: "none" }}><MoreIcon /></span>
    </div>
  );
}

function PostRow({ p, onClick, first }) {
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", gap: 11, padding: first ? "2px 0 16px" : "16px 0", borderTop: first ? "none" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.32, wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title || "(제목 없음)"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, flex: "none", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: p.coverUrl ? "#000" : FALLBACK }}>
          {p.coverUrl && <img loading="eager" decoding="async" src={p.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <b style={{ color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>{p.name}</b>{p.time ? ` · ${p.time}` : ""}{p.cat ? ` · ${p.cat}` : ""}{p.cmts != null ? ` · ${p.cmts} posts` : ""}
        </span>
        <span style={{ color: "rgba(255,255,255,0.35)", flex: "none" }}><MoreIcon /></span>
      </div>
    </div>
  );
}

export default function MobileSearch({ inputVal, setInputVal, activeTab, setActiveTab, music = [], artists = [], posts = [], playTrack }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unreadCount } = useApp() ?? {};

  const segs = [
    { key: "song", label: "Music", count: music.length },
    { key: "artist", label: "Artists", count: artists.length },
    { key: "project", label: "Post", count: posts.length },
  ];

  const bottomTabs = [
    { key: "home", label: "홈", to: "/", Icon: Home },
    { key: "search", label: "검색", to: "/search", Icon: Search },
    { key: "library", label: "보관함", to: "/library", Icon: Library },
    { key: "chat", label: "채팅", to: "/chat", Icon: MessageCircle, badge: unreadCount > 0 },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#000", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`.ms-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* header */}
      <div style={{ flex: "none", padding: "14px 24px 12px" }}>
        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>검색</span>
      </div>

      {/* search bar */}
      <div style={{ flex: "none", margin: "0 24px 16px", display: "flex", alignItems: "center", gap: 11, height: 50, padding: "0 16px", borderRadius: 16, background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="아티스트, 곡, 앨범, 콜라보 검색"
          style={{ all: "unset", flex: 1, minWidth: 0, fontSize: 16, color: "#fff" }} />
      </div>

      {/* section tabs */}
      <nav style={{ flex: "none", display: "flex", alignItems: "center", padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {segs.map((s, i) => (
          <div key={s.key} style={{ display: "contents" }}>
            <button onClick={() => setActiveTab(s.key)} style={{ all: "unset", cursor: "pointer", position: "relative", padding: "0 0 13px", display: "flex", alignItems: "center", gap: 7, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: activeTab === s.key ? "#fff" : "rgba(255,255,255,0.5)" }}>
              {s.label}
              {s.count > 0 && <span style={{ fontSize: 12.5, fontWeight: 600, color: activeTab === s.key ? ACCENT : "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>{s.count}</span>}
              {activeTab === s.key && <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 3, borderRadius: 2, background: ACCENT }} />}
            </button>
            {i < segs.length - 1 && <span style={{ flex: 1 }} />}
          </div>
        ))}
      </nav>

      {/* body */}
      <div className="ms-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 24px 130px" }}>
        {activeTab === "song" && (music.length ? music.map((m, i) => (
          <RankRow key={m.id ?? i} rank={i + 1} cover={m.cover_url} title={m.title} subtitle={m.artist}
            onClick={() => playTrack?.({ id: m.id, title: m.title, artist: m.artist, author_id: m.author_id, cover_url: m.cover_url, audio_url: m.audio_url }, music)} />
        )) : <Empty />)}

        {activeTab === "artist" && (artists.length ? artists.map((a, i) => (
          <RankRow key={a.supabaseId ?? i} rank={i + 1} round cover={a.avatar_url || a.gradient} title={a.name} subtitle={a.id}
            onClick={() => a.supabaseId && navigate(`/profile/${a.supabaseId}`)} />
        )) : <Empty />)}

        {activeTab === "project" && (posts.length ? posts.map((p, i) => (
          <PostRow key={p.id ?? i} p={p} first={i === 0} onClick={() => p.id && navigate(`/post/${p.id}`)} />
        )) : <Empty />)}
      </div>

      {/* bottom tab bar */}
      <div style={{ position: "fixed", left: 12, right: 12, bottom: 14, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", height: 66, borderRadius: 30, ...GLASS }}>
          {bottomTabs.map(tab => {
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
      </div>
    </div>
  );
}

function Empty() {
  return <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>검색 결과가 없어요</div>;
}
