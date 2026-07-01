import { useNavigate } from "react-router-dom";
import { CDCover } from "./MobileHome";
import MobileDock from "./MobileDock";

const ACCENT = "#FC3C44";
const FALLBACK = "linear-gradient(135deg,#3a3a44,#15151b)";

const HeartIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
const GridIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>;
const ListIcon = (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15V6" /><path d="M19 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><path d="M12 12H3" /><path d="M16 6H3" /><path d="M12 18H3" /></svg>;

function EmptyState({ Icon, title, subtitle, button, onButton, noIcon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: "62vh" }}>
      {!noIcon && (
        <div style={{ width: 88, height: 88, borderRadius: 24, display: "grid", placeItems: "center", marginBottom: 22, background: "radial-gradient(140% 120% at 30% 18%, rgba(255,90,77,0.2), transparent 60%), rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          <Icon style={{ width: 38, height: 38, color: ACCENT }} />
        </div>
      )}
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 8, maxWidth: "26ch", lineHeight: 1.5 }}>{subtitle}</div>
      <button onClick={onButton} style={{ all: "unset", cursor: "pointer", marginTop: 22, height: 46, padding: "0 28px", borderRadius: 999, background: ACCENT, color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", display: "inline-flex", alignItems: "center" }}>{button}</button>
    </div>
  );
}

function SongRow({ s, onPlay }) {
  return (
    <div onClick={onPlay} style={{ display: "flex", alignItems: "center", gap: 14, padding: "9px 0", cursor: "pointer" }}>
      <CDCover cover={s.cover_url || null} size={50} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</div>
      </div>
    </div>
  );
}

function PostRow({ p, onClick, first }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: first ? "2px 0 14px" : "14px 0", borderTop: first ? "none" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
      <div style={{ width: 48, height: 48, borderRadius: 10, flex: "none", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: p.coverUrl ? "#000" : (p.avBg || FALLBACK) }}>
        {p.coverUrl && <img loading="eager" decoding="async" src={p.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title || "(제목 없음)"}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name ?? "아티스트"}{p.cat ? ` · ${p.cat}` : ""}</div>
      </div>
    </div>
  );
}

function PlaylistItem({ pl, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <div style={{ width: "100%", aspectRatio: "1", borderRadius: 14, overflow: "hidden", background: pl.cover_url ? "#000" : (pl.grad || FALLBACK), boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
        {pl.cover_url && <img loading="eager" decoding="async" src={pl.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name || pl.title}</div>
      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{pl.count ?? 0}곡</div>
    </div>
  );
}

export default function MobileLibrary({ likedSongs = [], posts = [], playlists = [], activeTab, setActiveTab, playTrack, onCreatePlaylist }) {
  const navigate = useNavigate();

  const segs = [
    { key: "songs", label: "좋아요", Icon: HeartIcon },
    { key: "projects", label: "포스트", Icon: GridIcon },
    { key: "playlists", label: "플레이리스트", Icon: ListIcon },
  ];

  return (
    <div style={{ minHeight: "100dvh", background: "#000", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`.ml-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* header */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 12px" }}>
        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>라이브러리</span>
        <button onClick={onCreatePlaylist} aria-label="새 플레이리스트" style={{ all: "unset", cursor: "pointer", width: 42, height: 42, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      {/* section tabs */}
      <nav style={{ flex: "none", display: "flex", alignItems: "center", padding: "0 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {segs.map((s, i) => (
          <div key={s.key} style={{ display: "contents" }}>
            <button onClick={() => setActiveTab(s.key)} style={{ all: "unset", cursor: "pointer", position: "relative", padding: "0 0 13px", display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: activeTab === s.key ? "#fff" : "rgba(255,255,255,0.5)" }}>
              <s.Icon style={{ width: 16, height: 16 }} />
              {s.label}
              {activeTab === s.key && <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -1, width: 22, height: 3, borderRadius: 2, background: ACCENT }} />}
            </button>
            {i < segs.length - 1 && <span style={{ flex: 1 }} />}
          </div>
        ))}
      </nav>

      {/* body */}
      <div className="ml-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 24px 150px" }}>
        {activeTab === "songs" && (likedSongs.length ? likedSongs.map(s => (
          <SongRow key={s.id} s={s} onPlay={() => playTrack?.({ id: s.id, title: s.title, artist: s.artist, author_id: s.author_id, cover_url: s.cover_url, audio_url: s.audio_url }, likedSongs)} />
        )) : (
          <EmptyState noIcon title="좋아요한 음원이 없어요" subtitle="마음에 드는 트랙에 하트를 눌러 보관하세요." button="둘러보기" onButton={() => navigate("/new-songs")} />
        ))}

        {activeTab === "projects" && (posts.length ? posts.map((p, i) => (
          <PostRow key={p.id} p={p} first={i === 0} onClick={() => p.id && navigate(`/post/${p.id}`)} />
        )) : (
          <EmptyState noIcon title="좋아요한 포스트가 없어요" subtitle="마음에 드는 콜라보 포스트에 좋아요를 눌러 보관하세요." button="둘러보기" onButton={() => navigate("/board")} />
        ))}

        {activeTab === "playlists" && (playlists.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {playlists.map(pl => <PlaylistItem key={pl.id} pl={pl} onClick={() => navigate(`/playlist/${pl.id}`)} />)}
          </div>
        ) : (
          <EmptyState noIcon title="플레이리스트가 없어요" subtitle="좋아하는 트랙을 모아 나만의 흐름을 만들어요." button="플레이리스트 만들기" onButton={onCreatePlaylist} />
        ))}
      </div>

      <MobileDock />
    </div>
  );
}
