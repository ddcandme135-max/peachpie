import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { ably } from "../lib/ably";
import cdImg from "../assets/_-removebg-preview.png";
import { ml } from "../lib/ml";
import { translateAdminText } from "../lib/adminPostI18n";

export default function ShareModal({ isOpen, onClose, shareData }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const [convos, setConvos]         = useState([]);
  const [isRecommended, setIsRecommended] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [sentIds, setSentIds]       = useState(new Set());
  const [myId, setMyId]             = useState(null);

  useEffect(() => {
    if (!isOpen) { setSentIds(new Set()); setSearch(""); return; }
    load();
  }, [isOpen]);

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); return; }
    const uid = session.user.id;
    setMyId(uid);

    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", uid);

    const followingIds = (follows ?? []).map(f => f.following_id).filter(Boolean);

    if (followingIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, handle, avatar_url")
        .in("id", followingIds);

      setIsRecommended(false);
      setConvos((profiles ?? []).map(p => ({
        convId: [uid, p.id].sort().join("_"),
        partnerId: p.id,
        name: p.username ?? p.handle ?? "알 수 없음",
        handle: p.handle ?? null,
        avatarUrl: p.avatar_url ?? null,
      })));
    } else {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, handle, avatar_url")
        .neq("id", uid)
        .order("created_at", { ascending: false })
        .limit(3);

      setIsRecommended(true);
      setConvos((profiles ?? []).map(p => ({
        convId: [uid, p.id].sort().join("_"),
        partnerId: p.id,
        name: p.username ?? p.handle ?? "알 수 없음",
        handle: p.handle ?? null,
        avatarUrl: p.avatar_url ?? null,
      })));
    }
    setLoading(false);
  }

  async function send(convo) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const myId = session.user.id;
    const content = JSON.stringify(shareData);

    const { data: inserted } = await supabase
      .from("messages")
      .insert({ sender_id: myId, receiver_id: convo.partnerId, content, conversation_id: convo.convId })
      .select("id, created_at")
      .single();

    if (inserted) {
      try {
        ably.channels.get(`conv-${convo.convId}`).publish("message", {
          id: inserted.id, sender_id: myId, receiver_id: convo.partnerId,
          content, conversation_id: convo.convId, created_at: inserted.created_at,
        });
      } catch (e) {}
    }
    setSentIds(prev => new Set([...prev, convo.convId]));
  }

  if (!isOpen) return null;

  const POSITION_COLORS = {
    "VOCAL": "#A13232", "보컬": "#A13232",
    "PRODUCER": "#973570", "프로듀서": "#973570",
    "GUITAR": "#84ADEF", "기타": "#84ADEF",
    "BASS": "#9E81F6", "베이스": "#9E81F6",
    "KEYBOARD": "#CC86EF", "키보드": "#CC86EF",
    "VIOLIN": "#F9A64E", "바이올린": "#F9A64E",
    "MIXING/MASTERING": "#7CC0F2", "믹싱&마스터링": "#7CC0F2", "MIXING & MASTERING": "#7CC0F2",
    "RECORDING": "#84ADEF", "레코딩": "#84ADEF",
    "BEAT MAKER": "#9E81F6", "비트메이커": "#9E81F6",
    "LYRICS": "#CC86EF", "작사&작곡": "#CC86EF", "LYRIC": "#CC86EF",
    "FEATURING": "#9E81F6", "피처링": "#9E81F6",
  };
  const isCollabo = shareData.type === "collabo";
  const pos = shareData.position ?? "";
  const posLetter = pos[0]?.toUpperCase() ?? "";
  const posColor = POSITION_COLORS[pos.toUpperCase()] ?? POSITION_COLORS[pos] ?? "#9E81F6";
  const thumbStyle = shareData.coverUrl
    ? { backgroundImage: `url(${shareData.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: isCollabo ? "#000" : (shareData.grad ?? shareData.thumbBg ?? "#333") };

  const shareUrl = (() => {
    const o = window.location.origin;
    if (shareData.type === "project") return `${o}/post/${shareData.projectId}`;
    if (shareData.type === "collabo") return `${o}/project/${shareData.trackId ?? shareData.projectId}`;
    if (shareData.type === "track" || shareData.type === "song") return `${o}/track/${shareData.trackId}`;
    if (shareData.type === "post") return `${o}/post/${shareData.postId}`;
    if (shareData.type === "profile") return `${o}/profile/${shareData.userId}`;
    return o;
  })();

  const filtered = convos.filter(c =>
    !search.trim() ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.handle?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 150ms ease both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, background: "#14141e",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18, overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.85)",
          animation: "slideUp 200ms ease both",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 14px" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{ml("k080")}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* 프로젝트·게시물: 링크 / 그 외: 미리보기 */}
        {(shareData.type === "project" || shareData.type === "post") ? (
          <a href={shareUrl} onClick={onClose}
            style={{ textDecoration: "none", margin: "0 20px 14px", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "#60a5fa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "underline" }}>{translateAdminText(shareData.projectTitle ?? shareData.title ?? shareData.name ?? shareUrl, i18n.language)}</span>
          </a>
        ) : (
          <div style={{ margin: "0 20px 14px", padding: "12px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
            {isCollabo ? (
              <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, ...thumbStyle, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {!shareData.coverUrl && posLetter && (
                  <span style={{ fontFamily: "'Alfa Slab One', serif", fontSize: 24, lineHeight: 1, color: posColor, textTransform: "uppercase", userSelect: "none" }}>{posLetter}</span>
                )}
              </div>
            ) : (
              <div style={{ width: 52, height: 52, position: "relative", flexShrink: 0 }}>
                <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} />
                {shareData.coverUrl && (
                  <div style={{ position: "absolute", inset: 0, zIndex: 2, borderRadius: "50%", overflow: "hidden", backgroundImage: `url(${shareData.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center", WebkitMaskImage: "radial-gradient(circle, transparent 16%, black 17%)", maskImage: "radial-gradient(circle, transparent 16%, black 17%)" }} />
                )}
                <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: "50%", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)", WebkitMaskImage: "radial-gradient(circle, transparent 18%, black 19%)", maskImage: "radial-gradient(circle, transparent 18%, black 19%)" }} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{shareData.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shareData.artist ?? shareData.category ?? ""}</div>
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ padding: "0 20px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 42, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              autoFocus
              placeholder={ml("k012")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 14, width: "100%" }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ maxHeight: 280, overflowY: "auto", padding: "4px 12px 16px" }}>
          {!loading && filtered.length > 0 && isRecommended && (
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px 8px" }}>
              {ml("k081")}
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, paddingTop: 28 }}>
              {ml("k013")}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, paddingTop: 28 }}>
              {ml("k082")}
            </div>
          ) : filtered.map(c => (
            <div
              key={c.convId}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 8px", borderRadius: 10, transition: "background 100ms" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#312e81", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  {c.avatarUrl
                    ? <img loading="eager" decoding="async" src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : c.name[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  {c.handle && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>@{c.handle}</div>}
                </div>
              </div>
              <button
                onClick={() => send(c)}
                style={{
                  fontSize: 12, padding: "5px 14px", borderRadius: 20, flexShrink: 0,
                  fontFamily: "inherit", fontWeight: 600, cursor: "pointer", border: "none",
                  background: sentIds.has(c.convId) ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.1)",
                  color: sentIds.has(c.convId) ? "#4ade80" : "#fff",
                  transition: "all 150ms",
                }}
              >
                {sentIds.has(c.convId)
                  ? (ml("k083"))
                  : (ml("k084"))}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
