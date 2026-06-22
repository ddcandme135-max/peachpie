import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import NewListingModal from "../components/NewListingModal";
import ShareModal from "../components/ShareModal";
import { supabase } from "../lib/supabase";
import { PostCard, mapDbPost } from "./CollabFeed";
import { isAdminPost } from "../lib/adminPostI18n";

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const HL   = "rgba(255,255,255,0.08)";
const R    = "#FF5A4D";

const POSITION_MAP = {
  "vocal":         { label: "Vocal",        textColor: "#F49D9D", dbKey: "VOCAL" },
  "rapper":        { label: "Rapper",       textColor: "#E89464", dbKey: "RAPPER" },
  "music-creator": { label: "Music Creator",textColor: "#F2DE7E", dbKey: "MUSIC CREATOR" },
  "producer":      { label: "Producer",     textColor: "#B4E6F2", dbKey: "PRODUCER" },
  "engineer":      { label: "Engineer",     textColor: "#B7F3A1", dbKey: "ENGINEER" },
};

export default function PositionPage() {
  const { key }    = useParams();
  const navigate   = useNavigate();
  const { i18n }   = useTranslation();
  const lang       = i18n.language?.slice(0, 2) ?? "en";
  const pos        = POSITION_MAP[key];

  const [sidebarOpen, setSidebarOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [posts, setPosts]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen]     = useState(false);
  const [sharePost, setSharePost]     = useState(null);
  const [myId, setMyId]               = useState(null);
  const [editPost, setEditPost]       = useState(null);
  const [sortBy, setSortBy]           = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [followingIds, setFollowingIds] = useState([]);
  const [likeCounts, setLikeCounts]   = useState({});

  const pad     = sidebarOpen ? 220 : 90;
  const feedRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setMyId(uid);
      if (uid) {
        supabase.from("follows").select("following_id").eq("follower_id", uid)
          .then(({ data }) => setFollowingIds((data ?? []).map(r => r.following_id)));
      }
    });
  }, []);

  useEffect(() => {
    if (!pos) return;
    let mounted = true;
    const COLS = "*, profiles!posts_author_id_fkey(username, handle, avatar_url)";
    setLoading(true);
    supabase.from("posts").select(COLS)
      .eq("category", pos.dbKey)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(async ({ data }) => {
        if (!mounted) return;
        const mapped = (data ?? []).map(mapDbPost);
        setPosts(mapped);
        setLoading(false);
        if (mapped.length > 0) {
          const ids = mapped.map(p => p.id);
          const { data: likeRows } = await supabase.from("likes").select("post_id").in("post_id", ids);
          const counts = {};
          (likeRows ?? []).forEach(r => { counts[r.post_id] = (counts[r.post_id] ?? 0) + 1; });
          if (mounted) setLikeCounts(counts);
        }
      });

    const sub = supabase.channel(`position-posts-${pos.dbKey}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, async ({ new: p }) => {
        if (!mounted) return;
        const { data } = await supabase.from("posts").select(COLS).eq("id", p.id).single();
        if (mounted && data) setPosts(prev => prev.map(post => post.id === data.id ? mapDbPost(data) : post));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, ({ old: p }) => {
        if (mounted) setPosts(prev => prev.filter(post => post.id !== p.id));
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(sub); };
  }, [key]);

  if (!pos) {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        존재하지 않는 포지션입니다.
      </div>
    );
  }

  let filtered = searchQuery.trim()
    ? posts.filter(p => {
        const q = searchQuery.toLowerCase();
        return p.title?.toLowerCase().includes(q) || p.text?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q);
      })
    : posts;
  const GENRE_MAP = {
    "힙합": ["힙합", "hip-hop", "hip hop", "trap", "rap"],
    "알앤비": ["알앤비", "r&b", "rnb", "soul"],
    "팝": ["팝", "pop", "k-pop", "kpop"],
    "인디": ["인디", "indie", "indie pop", "indie rock"],
  };

  if (genreFilter !== "all") {
    const keywords = GENRE_MAP[genreFilter] ?? [genreFilter.toLowerCase()];
    filtered = filtered.filter(p => {
      const genres = (p.genre ?? "").toLowerCase();
      return keywords.some(k => genres.includes(k));
    });
  }
  if (sortBy === "all") filtered = [...filtered].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
  if (sortBy === "popular") filtered = [...filtered].sort((a, b) => (likeCounts[b.id] ?? 0) - (likeCounts[a.id] ?? 0));
  if (sortBy === "following") filtered = filtered.filter(p => followingIds.includes(p.author_id));
  // 관리자(안내) 게시물은 항상 상단 고정
  filtered = [...filtered].sort((a, b) => (isAdminPost(b) ? 1 : 0) - (isAdminPost(a) ? 1 : 0));

  const { t } = useTranslation();
  const SORTS  = [
    { id: "all",       label: t("sidebar.sortAll"),       icon: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
    { id: "popular",   label: t("sidebar.sortPopular"),   icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> },
    { id: "following", label: t("sidebar.sortFollowing"), icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
  ];
  const GENRES = [{ id: "all", label: "All" }, { id: "힙합", label: "Hip-hop" }, { id: "알앤비", label: "R&B" }, { id: "팝", label: "Pop" }, { id: "인디", label: "Indie" }];

  function FilterOpt({ label, on, onClick }) {
    const [hov, setHov] = useState(false);
    return (
      <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{ display: "flex", alignItems: "center", height: 38, padding: "0 12px", borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: on ? 600 : 500, letterSpacing: "-0.015em", color: on || hov ? "#fff" : "rgba(255,255,255,0.72)", background: on || hov ? "rgba(255,255,255,0.04)" : "transparent", transition: "background 240ms, color 240ms" }}
      >
        {label}
        {on && <span style={{ width: 5, height: 5, borderRadius: 999, background: "#C6F24E", marginLeft: "auto", flexShrink: 0, boxShadow: "0 0 12px rgba(198,242,78,0.55)" }} />}
      </div>
    );
  }


  const SEC_H = (icon, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 8px" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{label}</span>
    </div>
  );

  const commonCardProps = (p) => ({
    onNavigate: navigate,
    onShare: setSharePost,
    isMe: !!(myId && myId === p.author_id),
    onEdit: p.isDummy || !p.id ? undefined : () => setEditPost(p),
    onDelete: p.isDummy || !p.id ? undefined : async () => {
      await supabase.from("posts").delete().eq("id", p.id);
      setPosts(prev => prev.filter(post => post.id !== p.id));
    },
  });

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "#000000", display: "flex", flexDirection: "column", gap: 16, scrollbarWidth: "none", msOverflowStyle: "none" }}>
      <style>{`
        ::-webkit-scrollbar { display: none; }
        .pp-tab { all: unset; }
      `}</style>

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div style={{ marginLeft: pad, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <header style={{ flexShrink: 0, padding: "22px 40px 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ all: "unset", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: `1px solid ${HL}`, cursor: "pointer", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0, transition: "background 120ms" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
            </button>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", color: pos.textColor ?? "#fff" }}>
              {pos.label}
            </h1>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 16px", borderRadius: 999, flex: 1, maxWidth: 500, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", cursor: "text" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 15 }}
              placeholder={t("position.searchPlaceholder")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", display: "flex", padding: 0, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </label>

          <button onClick={() => setModalOpen(true)}
            style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 22px", cursor: "pointer", borderRadius: 999, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", transition: "background 200ms", boxSizing: "border-box" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            {t("position.postListing")}
          </button>
        </header>

        {/* Divider */}
        <div style={{ height: 1, background: HL, marginLeft: 32, marginRight: 40, flexShrink: 0 }} />

        {/* feed + filter rail */}
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          {/* 왼쪽 컬럼: 정렬 탭 + 피드 */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>

            {/* 정렬 세그먼트 탭 (Library 스타일) */}
            <div style={{ display: "flex", flexShrink: 0, marginLeft: 12, marginRight: 24, marginBottom: 20 }}>
              {SORTS.map(s => {
                const on = sortBy === s.id;
                return (
                  <button key={s.id} onClick={() => setSortBy(s.id)}
                    style={{ all: "unset", cursor: "pointer", flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", height: 50, color: on ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", transition: "color 160ms" }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, height: "100%", boxSizing: "border-box", borderBottom: on ? "2px solid #FC3C44" : "2px solid transparent" }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
                      <span>{s.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${HL}`, borderTopColor: R, animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 15 }}>
                {lang === "ko" ? "아직 공고가 없습니다" : "No listings yet"}
              </div>
            ) : (
              <div ref={feedRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", scrollbarWidth: "none", msOverflowStyle: "none" }}>
                <div style={{ padding: "12px 24px 40px 12px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                    {filtered.filter((_, i) => i % 2 === 0).map((p, i) => <PostCard key={p.id ?? i} p={p} idx={i} {...commonCardProps(p)} />)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                    {filtered.filter((_, i) => i % 2 !== 0).map((p, i) => <PostCard key={p.id ?? i} p={p} idx={i} {...commonCardProps(p)} />)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter Rail */}
          <aside style={{ width: 228, flexShrink: 0 }}>
            <div style={{ position: "fixed", top: 116, width: 228, height: "calc(100vh - 116px)", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none", boxSizing: "border-box", background: "#16131a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px 18px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
              <div>
                {SEC_H(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>, lang === "ko" ? "포지션" : "Position")}
                {Object.entries(POSITION_MAP).map(([k, p]) => (
                  <FilterOpt key={k} label={p.label} on={key === k} onClick={() => navigate(`/position/${k}`)} />
                ))}
              </div>
              <div>
                {SEC_H(<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>, t("sidebar.genreLabel"))}
                {GENRES.map(g => <FilterOpt key={g.id} label={g.label} on={genreFilter === g.id} onClick={() => setGenreFilter(g.id)} />)}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <NewListingModal
        open={modalOpen || !!editPost}
        onClose={() => { setModalOpen(false); setEditPost(null); }}
        editData={editPost}
        category={pos.dbKey}
        onSaved={editPost ? async () => {
          const COLS = "*, profiles!posts_author_id_fkey(username, handle, avatar_url)";
          setPosts([]);
          const { data } = await supabase
            .from("posts")
            .select(COLS)
            .eq("category", pos.dbKey)
            .order("created_at", { ascending: false })
            .limit(50);
          if (data) setPosts(data.map(mapDbPost));
        } : undefined}
      />
      <ShareModal
        isOpen={!!sharePost}
        onClose={() => setSharePost(null)}
        shareData={{
          type: "project",
          projectId: sharePost?.id,
          projectTitle: sharePost?.title,
          projectPosition: sharePost?.cat,
          projectGenre: (sharePost?.genre ?? "").split(",")[0].trim(),
          // 공유 모달 미리보기용
          title: sharePost?.title,
          category: sharePost?.cat,
          coverUrl: sharePost?.imageUrl ?? sharePost?.coverUrl ?? null,
        }}
      />
    </div>
  );
}
