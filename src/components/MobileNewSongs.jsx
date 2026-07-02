import { useNavigate } from "react-router-dom";
import { CDCover } from "./MobileHome";
import { SongActionMenu } from "../pages/NewSongs";
import { ml } from "../lib/ml";

// 모바일 New Songs — 데스크톱과 동일하게 음원을 세로 리스트로 표시
function Row({ s, isMe, onEdit, onDelete, onShare, onPlay, divider }) {
  return (
    <div onClick={onPlay} style={{ display: "flex", alignItems: "center", gap: 13, cursor: "pointer" }}>
      <CDCover cover={s.cover_url || null} size={52} />
      {/* 구분선은 썸네일 이후부터 표시(썸네일 아래로는 안 지나감) */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: divider ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff" }}>{s.title}</span>
            {s.isNew && <span style={{ flex: "none", fontSize: 9.5, fontWeight: 800, color: "#FC3C44", letterSpacing: "0.05em" }}>NEW</span>}
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</div>
        </div>
        <div onClick={e => e.stopPropagation()} style={{ flex: "none", display: "grid", placeItems: "center" }}>
          <SongActionMenu s={s} isMe={isMe} onEdit={onEdit} onDelete={onDelete} onShare={onShare} />
        </div>
      </div>
    </div>
  );
}

export default function MobileNewSongs({ tracks = [], loading, myId, onEdit, onDelete, onShare, onUpload, playTrack }) {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100dvh", background: "#000", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`.mns-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* header */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button onClick={() => navigate(-1)} aria-label="뒤로" style={{ all: "unset", cursor: "pointer", width: 38, height: 38, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", color: "#fff", background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 5-7 7 7 7" /></svg>
          </button>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ml("k121")}</span>
        </div>
        <button onClick={onUpload} aria-label={ml("k026")} style={{ all: "unset", cursor: "pointer", width: 42, height: 42, borderRadius: 999, flex: "none", display: "grid", placeItems: "center", color: "#fff", background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      {/* list */}
      <div className="mns-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 20px 150px" }}>
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.06)", flex: "none" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: "55%", borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ height: 12, width: "35%", borderRadius: 6, background: "rgba(255,255,255,0.05)", marginTop: 8 }} />
              </div>
            </div>
          ))
        ) : tracks.length ? tracks.map((s, i) => (
          <Row
            key={s.id}
            s={s}
            isMe={myId === s.author_id}
            onEdit={() => onEdit?.(s)}
            onDelete={() => onDelete?.(s)}
            onShare={() => onShare?.(s)}
            onPlay={() => {
              sessionStorage.setItem("playSource", "new-songs");
              playTrack?.({ id: s.id, title: s.title, artist: s.artist, cover_url: s.cover_url, audio_url: s.audio_url, grad: s.grad, type: s.type, genre: s.genre, duration: s.duration });
            }}
            divider={i < tracks.length - 1}
          />
        )) : (
          <div style={{ padding: "60px 0", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>아직 음원이 없어요</div>
        )}
      </div>
    </div>
  );
}
