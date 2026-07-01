import { useNavigate } from "react-router-dom";
import { CDCover } from "./MobileHome";
import MobileDock from "./MobileDock";

const ACCENT = "#FC3C44";
const FALLBACK = "linear-gradient(135deg,#3a3a44,#15151b)";
const MoreIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;

function RankRow({ cover, round, cd, title, subtitle, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", cursor: "pointer" }}>
      {cd ? (
        <CDCover cover={cover || null} size={50} />
      ) : (
        <div style={{ width: 50, height: 50, borderRadius: round ? 999 : 10, flex: "none", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: typeof cover === "string" && cover.startsWith("linear") ? cover : cover ? "#000" : FALLBACK }}>
          {cover && !cover.startsWith?.("linear") && <img loading="eager" decoding="async" src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
      </div>
      <span style={{ color: "rgba(255,255,255,0.35)", flex: "none" }}><MoreIcon /></span>
    </div>
  );
}

// 데스크톱 우측 사이드바 Post 아이템과 동일: 제목 + 원형 작성자 아바타 + "이름 · 시간 · 카테고리"
function PostRow({ p, onClick, first }) {
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", gap: 10, padding: first ? "2px 0 16px" : "16px 0", borderTop: first ? "none" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.32, wordBreak: "keep-all", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.title || "(제목 없음)"}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", flex: "none", overflow: "hidden", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, color: "#fff", background: p.avatarUrl ? "#000" : (p.avBg || FALLBACK), boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          {p.avatarUrl ? <img loading="eager" decoding="async" src={p.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (p.letter || "?")}
        </div>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <b style={{ color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>{p.name}</b>{p.time ? ` · ${p.time}` : ""}{p.cat ? ` · ${p.cat}` : ""}
        </span>
        <span style={{ color: "rgba(255,255,255,0.35)", flex: "none" }}><MoreIcon /></span>
      </div>
    </div>
  );
}

export default function MobileSearch({ inputVal, setInputVal, activeTab, setActiveTab, music = [], artists = [], posts = [], query = "", playTrack }) {
  const navigate = useNavigate();
  const hasQuery = !!query.trim();

  const segs = [
    { key: "song", label: "Music" },
    { key: "artist", label: "Artists" },
    { key: "project", label: "Post" },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#000", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`.ms-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* header */}
      <div style={{ flex: "none", padding: "14px 24px 12px" }}>
        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>검색</span>
      </div>

      {/* search bar */}
      <div style={{ flex: "none", margin: "10px 24px 22px", display: "flex", alignItems: "center", gap: 11, height: 50, padding: "0 18px", borderRadius: 999, background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="아티스트, 곡, 앨범, 콜라보 검색"
          style={{ all: "unset", flex: 1, minWidth: 0, fontSize: 16, color: "#fff" }} />
      </div>

      {/* section tabs */}
      <nav style={{ flex: "none", display: "flex", alignItems: "center", padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {segs.map((s, i) => (
          <div key={s.key} style={{ display: "contents" }}>
            <button onClick={() => setActiveTab(s.key)} style={{ all: "unset", cursor: "pointer", position: "relative", padding: "0 0 13px", display: "flex", alignItems: "center", fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: activeTab === s.key ? "#fff" : "rgba(255,255,255,0.5)" }}>
              {s.label}
              {activeTab === s.key && <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -1, width: 22, height: 3, borderRadius: 2, background: ACCENT }} />}
            </button>
            {i < segs.length - 1 && <span style={{ flex: 1 }} />}
          </div>
        ))}
      </nav>

      {/* body */}
      <div className="ms-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 24px 150px" }}>
        {activeTab === "song" && (music.length ? music.map((m, i) => (
          <RankRow key={m.id ?? i} cd cover={m.cover_url} title={m.title} subtitle={m.artist}
            onClick={() => playTrack?.({ id: m.id, title: m.title, artist: m.artist, author_id: m.author_id, cover_url: m.cover_url, audio_url: m.audio_url }, music)} />
        )) : <Empty hasQuery={hasQuery} />)}

        {activeTab === "artist" && (artists.length ? artists.map((a, i) => (
          <RankRow key={a.supabaseId ?? i} round cover={a.avatar_url || a.gradient} title={a.name} subtitle={a.id}
            onClick={() => a.supabaseId && navigate(`/profile/${a.supabaseId}`)} />
        )) : <Empty hasQuery={hasQuery} />)}

        {activeTab === "project" && (posts.length ? posts.map((p, i) => (
          <PostRow key={p.id ?? i} p={p} first={i === 0} onClick={() => p.id && navigate(`/post/${p.id}`)} />
        )) : <Empty hasQuery={hasQuery} />)}
      </div>

      <MobileDock />
    </div>
  );
}

function Empty({ hasQuery }) {
  return <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>{hasQuery ? "검색 결과가 없어요" : "검색어를 입력해보세요"}</div>;
}
