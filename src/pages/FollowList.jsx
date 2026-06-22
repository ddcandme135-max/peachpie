import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { ml } from "../lib/ml";

const AV_COLORS = ["#0369a1","#7c3aed","#be185d","#16a34a","#b45309","#4c1d95","#0891b2","#9333ea"];

function Avatar({ person, index, size = 44 }) {
  return person.avatar_url
    ? <img loading="eager" decoding="async" src={person.avatar_url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: AV_COLORS[index % AV_COLORS.length], display: "grid", placeItems: "center", fontSize: Math.round(size * 0.38), fontWeight: 700, color: "#fff", flexShrink: 0 }}>
        {(person.username || "?")[0].toUpperCase()}
      </div>;
}

function PersonRow({ person, index, onNavigate, showUnfollow, onUnfollow, showRemove, onRemove, lang }) {
  const [hov, setHov]           = useState(false);
  const [btnHov, setBtnHov]     = useState(false);
  const [removeHov, setRemoveHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onNavigate}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 12px", borderRadius: 12, background: hov ? "rgba(255,255,255,0.05)" : "transparent", transition: "background 120ms", cursor: "pointer" }}
    >
      <Avatar person={person} index={index} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{person.username}</div>
        {person.handle && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>@{person.handle}</div>}
      </div>
      {showUnfollow && (
        <button
          onClick={e => { e.stopPropagation(); onUnfollow(); }}
          onMouseEnter={() => setBtnHov(true)} onMouseLeave={() => setBtnHov(false)}
          style={{ padding: "6px 14px", borderRadius: 999, background: btnHov ? "rgba(252,60,68,0.12)" : "rgba(255,255,255,0.08)", border: btnHov ? "1px solid rgba(252,60,68,0.3)" : "1px solid rgba(255,255,255,0.12)", color: btnHov ? "#fc8086" : "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "all 150ms" }}
        >
          {btnHov
            ? (ml("k110"))
            : (ml("k002"))}
        </button>
      )}
      {showRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          onMouseEnter={() => setRemoveHov(true)} onMouseLeave={() => setRemoveHov(false)}
          style={{ padding: "6px 14px", borderRadius: 999, background: removeHov ? "rgba(252,60,68,0.12)" : "rgba(255,255,255,0.08)", border: removeHov ? "1px solid rgba(252,60,68,0.3)" : "1px solid rgba(255,255,255,0.12)", color: removeHov ? "#fc8086" : "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "all 150ms" }}
        >
          {ml("k111")}
        </button>
      )}
    </div>
  );
}

export default function FollowListModal({ profileId, initialTab = "followers", myId, onClose, onFollowerDeleted }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";

  const [tab, setTab]             = useState(initialTab);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingFr, setLoadingFr] = useState(true);
  const [loadingFg, setLoadingFg] = useState(true);
  const [search, setSearch]       = useState("");

  const TABS = [
    { key: "followers", label: ml("k031"), count: followers.length },
    { key: "following", label: ml("k002"), count: following.length },
  ];

  useEffect(() => {
    if (!profileId) return;
    setLoadingFr(true);
    (async () => {
      const { data: rows } = await supabase.from("follows").select("follower_id").eq("following_id", profileId);
      const ids = (rows ?? []).map(r => r.follower_id).filter(Boolean);
      if (!ids.length) { setFollowers([]); setLoadingFr(false); return; }
      const { data } = await supabase.from("profiles").select("id, username, handle, avatar_url").in("id", ids);
      setFollowers(data ?? []);
      setLoadingFr(false);
    })();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    setLoadingFg(true);
    (async () => {
      const { data: rows } = await supabase.from("follows").select("following_id").eq("follower_id", profileId);
      const ids = (rows ?? []).map(r => r.following_id).filter(Boolean);
      if (!ids.length) { setFollowing([]); setLoadingFg(false); return; }
      const { data } = await supabase.from("profiles").select("id, username, handle, avatar_url").in("id", ids);
      setFollowing(data ?? []);
      setLoadingFg(false);
    })();
  }, [profileId]);

  async function unfollow(targetId) {
    const person = following.find(p => p.id === targetId);
    setFollowing(prev => prev.filter(p => p.id !== targetId));
    showToast(
      ml("k014"),
      "info",
      async () => {
        if (person) setFollowing(prev => [person, ...prev]);
        await supabase.from("follows").insert({ follower_id: myId, following_id: targetId });
      }
    );
    await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", targetId);
  }

  async function removeFollower(followerId) {
    setFollowers(prev => prev.filter(p => p.id !== followerId));
    onFollowerDeleted?.();
    await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", myId);
  }

  const isOwnProfile = !!myId && myId === profileId;
  const list    = tab === "followers" ? followers : following;
  const loading = tab === "followers" ? loadingFr : loadingFg;
  const q       = search.trim().toLowerCase();
  const filtered = q
    ? list.filter(p => (p.username ?? "").toLowerCase().includes(q) || (p.handle ?? "").toLowerCase().includes(q))
    : list;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 480, maxHeight: "72vh", background: "#141414", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* ── Header ── */}
        <div style={{ padding: "22px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {TABS.map(({ key, label, count }) => {
                const active = tab === key;
                return (
                  <button key={key} onClick={() => { setTab(key); setSearch(""); }}
                    style={{ background: "none", border: "none", borderBottom: active ? "2px solid #fff" : "2px solid transparent", color: active ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 15, fontWeight: 700, padding: "0 0 11px", marginBottom: -1, cursor: "pointer", fontFamily: "inherit", transition: "color 120ms", marginRight: 22, display: "inline-flex", alignItems: "baseline", gap: 6 }}
                  >
                    {label}
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)", color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", padding: "0 0 11px" }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 999, padding: "8px 14px", marginBottom: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={ml("k012")}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "inherit" }} />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: 0 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* ── 목록 ── */}
        <div style={{ overflowY: "auto", padding: "6px 12px 16px" }} className="no-scrollbar">
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
              {ml("k013")}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
              {q
                ? (ml("k016"))
                : tab === "followers"
                  ? (ml("k112"))
                  : (ml("k030"))}
            </div>
          ) : filtered.map((person, i) => (
            <PersonRow
              key={person.id}
              person={person}
              index={i}
              lang={lang}
              onNavigate={() => { onClose(); navigate(`/profile/${person.id}`); }}
              showUnfollow={tab === "following" && isOwnProfile}
              onUnfollow={() => unfollow(person.id)}
              showRemove={tab === "followers" && isOwnProfile}
              onRemove={() => removeFollower(person.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
