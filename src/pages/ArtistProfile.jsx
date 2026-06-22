import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import RightSidebar from "../components/RightSidebar";
import { usePlayer } from "../context/PlayerContext";
import { useApp as useUser } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import FollowListModal from "./FollowList";
import ShareModal from "../components/ShareModal";
import { useToast } from "../context/ToastContext";
import NewListingModal from "../components/NewListingModal";
import NewProjectModal from "../components/NewProjectModal";
import NewTrackModal from "../components/NewTrackModal";
import { SongRow as NewSongRow, SONG_HEADERS } from "./NewSongs";
import { PostCard, mapDbPost } from "./CollabFeed";
import * as faceapi from 'face-api.js';
import { ml } from "../lib/ml";
import { ob } from "../lib/onboardingI18n";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";

const POSITION_COLORS = {
  "VOCAL":             "#A13232", "보컬":        "#A13232",
  "PRODUCER":          "#973570", "프로듀서":     "#973570",
  "GUITAR":            "#84ADEF", "기타":        "#84ADEF",
  "BASS":              "#9E81F6", "베이스":       "#9E81F6",
  "KEYBOARD":          "#CC86EF", "키보드":       "#CC86EF",
  "VIOLIN":            "#F9A64E", "바이올린":      "#F9A64E",
  "MIXING/MASTERING":  "#7CC0F2", "믹싱&마스터링": "#7CC0F2", "MIXING & MASTERING": "#7CC0F2",
  "RECORDING":         "#84ADEF", "레코딩":       "#84ADEF",
  "BEAT MAKER":        "#9E81F6", "비트메이커":    "#9E81F6",
  "LYRICS":            "#CC86EF", "작사&작곡":    "#CC86EF", "LYRIC": "#CC86EF",
  "FEATURING":         "#9E81F6", "피처링":       "#9E81F6",
};
const DEFAULT_POS_COLOR = "#9E81F6";

const POSITION_MAP = {
  "보컬": "VOCAL", "프로듀서": "PRODUCER", "기타": "GUITAR", "베이스": "BASS",
  "키보드": "KEYBOARD", "바이올린": "VIOLIN", "믹싱&마스터링": "MIXING/MASTERING",
  "믹싱 & 마스터링": "MIXING/MASTERING", "레코딩": "RECORDING", "비트메이커": "BEAT MAKER",
  "작사&작곡": "LYRICS", "작사 & 작곡": "LYRICS", "피처링": "FEATURING", "세션": "SESSION", "드럼": "DRUMS",
};
function toEnPosition(pos) { if (!pos) return pos; return POSITION_MAP[pos.trim()] ?? pos; }

const FACE_GRADS = [
  "radial-gradient(circle at 35% 35%,#ffb96b 0%,#e8743a 35%,#7c2d12 100%)",
  "radial-gradient(circle at 35% 35%,#ffe27a 0%,#f59e0b 40%,#451a03 100%)",
  "radial-gradient(circle at 35% 35%,#fda4af 0%,#e11d48 40%,#4c0519 100%)",
  "radial-gradient(circle at 35% 35%,#a5b4fc 0%,#4338ca 40%,#1e1b4b 100%)",
  "radial-gradient(circle at 35% 35%,#6ee7b7 0%,#059669 40%,#064e3b 100%)",
  "radial-gradient(circle at 35% 35%,#fcd34d 0%,#d97706 40%,#451a03 100%)",
];

const GRAD_FALLBACKS = [
  "linear-gradient(135deg,#b91c1c,#450a0a)",
  "linear-gradient(135deg,#1e3a8a,#0c0a1f)",
  "linear-gradient(135deg,#4c1d95,#1e1b4b)",
  "linear-gradient(135deg,#134e4a,#042f2e)",
  "linear-gradient(135deg,#831843,#1f0815)",
  "linear-gradient(135deg,#92400e,#1c1917)",
];



const TAB_KEYS = ["songs", "projects", "posts", "playlists"];

const MOCK_FOLLOWING = [
  { name: "SZA",           id: "@sza",          initial: "S", gradient: "linear-gradient(135deg,#7c3aed,#1e1b4b)" },
  { name: "Tyler the Creator", id: "@tylerthecreator", initial: "T", gradient: "linear-gradient(135deg,#065f46,#022c22)" },
  { name: "Kendrick Lamar",id: "@kendricklamar", initial: "K", gradient: "linear-gradient(135deg,#1e3a8a,#0c0a1f)" },
  { name: "Solange",       id: "@solange",       initial: "S", gradient: "linear-gradient(135deg,#92400e,#1c1917)" },
  { name: "Blood Orange",  id: "@bloodorange",   initial: "B", gradient: "linear-gradient(135deg,#9f1239,#4c0519)" },
  { name: "Steve Lacy",    id: "@stevelacy",     initial: "S", gradient: "linear-gradient(135deg,#064e3b,#042f2e)" },
  { name: "Childish Gambino", id: "@childishgambino", initial: "C", gradient: "linear-gradient(135deg,#831843,#1f0815)" },
  { name: "Syd",           id: "@syd",           initial: "S", gradient: "linear-gradient(135deg,#4c1d95,#1e1b4b)" },
];



function FollowBadge({ artist }) {
  const { toggleFollow, isFollowing } = usePlayer();
  const followed = isFollowing(artist);
  return (
    <button
      onClick={e => { e.stopPropagation(); toggleFollow(artist); }}
      style={{ padding: "6px 14px", borderRadius: 999, background: followed ? "rgba(255,255,255,0.1)" : "#FC3C44", border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "background 150ms" }}
    >
      {followed ? "팔로잉" : "팔로우"}
    </button>
  );
}

function FollowingStatButton({ count, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "baseline", gap: 5, cursor: "pointer" }}
    >
      <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{count}</span>
      <span style={{ fontSize: 13, color: hov ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)", transition: "color 150ms", textDecoration: hov ? "underline" : "none" }}>팔로우</span>
    </div>
  );
}

const CATEGORY_TO_POSITION = {
  "VOCAL": "Vocal", "PRODUCER": "Producer", "LYRIC": "Lyrics",
  "MIXING/MASTERING": "Mixing/Mastering", "SESSION": "Recording", "FEATURING": "",
};

function MoreMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = e => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        (!popupRef.current || !popupRef.current.contains(e.target))
      ) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  function handleOpen(e) {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(o => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: open ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)",
          border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.7)", display: "grid", placeItems: "center",
          fontSize: 15, fontWeight: 700, letterSpacing: "0.08em",
          fontFamily: "inherit",
        }}
      >···</button>
      {open && (
        <div
          ref={popupRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            background: "rgba(20,20,22,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: 4,
            minWidth: 110,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }}
            style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >수정</div>
          <div
            onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
            style={{ padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: "#FC3C44", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(252,60,68,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >삭제</div>
        </div>
      )}
    </>
  );
}


function PlaylistProfileCard({ pl, i, navigate }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ cursor: "pointer" }} onClick={() => navigate(`/playlist/${pl.id}`)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        width: "100%", aspectRatio: "1/1", borderRadius: 14, position: "relative", overflow: "hidden",
        background: pl.cover_url ? "#000" : GRAD_FALLBACKS[i % GRAD_FALLBACKS.length],
        boxShadow: "0 18px 40px -18px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 200ms cubic-bezier(0.2,0.7,0.2,1)",
      }}>
        {pl.cover_url
          ? <img loading="eager" decoding="async" src={pl.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
        }
        <button
          onClick={e => e.stopPropagation()}
          style={{ position: "absolute", right: 10, bottom: 10, zIndex: 2, width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#000", background: "rgba(255,255,255,0.94)", boxShadow: "0 8px 20px -6px rgba(0,0,0,0.5)", opacity: hov ? 1 : 0, transform: hov ? "none" : "translateY(8px) scale(0.9)", transition: "opacity 220ms, transform 220ms" }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15, marginLeft: 2 }}><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.title}</div>
    </div>
  );
}

function ProjectCard({ p, index, isMe, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  const grad = GRAD_FALLBACKS[index % GRAD_FALLBACKS.length];

  return (
    <div
      onClick={() => navigate(`/project/${p.id}`, { state: { project: p } })}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: "pointer" }}
    >
      {/* square cover */}
      <div style={{
        width: "100%", aspectRatio: "1/1", borderRadius: 18, position: "relative", overflow: "hidden",
        background: p.cover_url ? "#000" : grad,
        boxShadow: "0 18px 40px -18px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)",
        transform: hov ? "translateY(-4px)" : "none",
        transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
      }}>
        {p.cover_url && <img loading="eager" decoding="async" src={p.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 24% 14%, rgba(255,255,255,0.2), transparent 55%)", pointerEvents: "none" }} />
        {/* status badge */}
        <span style={{ position: "absolute", top: 12, left: 12, zIndex: 2, display: "inline-flex", alignItems: "center", gap: 5, height: 24, padding: "0 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(252,60,68,0.9)", color: "#fff", backdropFilter: "blur(8px)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
          모집 중
        </span>
        {/* play button */}
        <button
          onClick={e => e.stopPropagation()}
          style={{ position: "absolute", right: 12, bottom: 12, zIndex: 2, width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#000", background: "rgba(255,255,255,0.94)", boxShadow: "0 8px 20px -6px rgba(0,0,0,0.5)", opacity: hov ? 1 : 0, transform: hov ? "translateY(0) scale(1)" : "translateY(8px) scale(0.9)", transition: "opacity 220ms, transform 220ms cubic-bezier(0.32,0.72,0,1)" }}>
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 17, height: 17, marginLeft: 2 }}><polygon points="6 4 20 12 6 20 6 4"/></svg>
        </button>
        {isMe && (
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }} onClick={e => e.stopPropagation()}>
            <MoreMenu onEdit={onEdit} onDelete={onDelete} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginTop: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff" }}>{p.title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.genre ?? ""}</div>
    </div>
  );
}



export default function ArtistProfile() {
  const { state } = useLocation();
  const { id: urlProfileId } = useParams();
  const navigate = useNavigate();
  const { followingArtists, toggleFollow, isFollowing } = usePlayer();
  const { refreshProfile } = useUser();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const projectRowRefs = useRef([]);

  const _tabKey = `tab_artist_${urlProfileId ?? "me"}`;
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem(_tabKey) ?? "songs");
  useEffect(() => { sessionStorage.setItem(_tabKey, activeTab); }, [activeTab, _tabKey]);
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const TABS = [
    { key: "songs",     label: ml("k128"), icon: <path d="M12 3v11.26A3.5 3.5 0 1 0 14 17V8h4.5V3H12z" fill="currentColor" stroke="none"/> },
    { key: "projects",  label: ml("k125"), icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></> },
    { key: "playlists", label: ml("k136"), icon: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
  ];
  const pad = isOpen ? 220 : 90;

  useEffect(() => {
    projectRowRefs.current.forEach(el => {
      if (!el || el.scrollLeft === 0) return;
      const start = el.scrollLeft;
      const t0 = performance.now();
      const dur = 320;
      const ease = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
      const step = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.scrollLeft = start * (1 - ease(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, [isOpen]);

  // URL-loaded profile (for /profile/:id route)
  const [urlProfile, setUrlProfile] = useState(null);
  const [isUrlMe, setIsUrlMe] = useState(false);

  const isMe = urlProfileId ? isUrlMe : !!state?.isMe;
  const targetProfileId = urlProfileId ?? state?.supabaseId ?? null;

  const baseArtist = {
    name:      state?.name ?? state?.username ?? "아티스트",
    id:        state?.id ?? (state?.handle ? `@${state.handle}` : ""),
    gradient:  state?.gradient ?? "linear-gradient(135deg,#34d399,#064e3b)",
    initial:   (state?.name ?? state?.username ?? "아")[0]?.toUpperCase() ?? "?",
    avatar_url: state?.avatar_url ?? null,
  };
  const artist = (urlProfileId && urlProfile) ? {
    name:      urlProfile.username ?? urlProfile.handle ?? "아티스트",
    id:        urlProfile.handle ? `@${urlProfile.handle}` : "",
    gradient:  "linear-gradient(135deg,#34d399,#064e3b)",
    initial:   (urlProfile.username ?? urlProfile.handle ?? "?")[0].toUpperCase(),
    avatar_url: urlProfile.avatar_url ?? null,
  } : urlProfileId ? {
    name: "",
    id: "",
    gradient: "linear-gradient(135deg,#34d399,#064e3b)",
    initial: "?",
    avatar_url: null,
  } : baseArtist;

  const [dbSongs,     setDbSongs]     = useState([]);
  const [dbProjects,  setDbProjects]  = useState([]);
  const [dbPosts,     setDbPosts]     = useState([]);
  const [dbPlaylists, setDbPlaylists] = useState([]);
  const [tabLoading, setTabLoading] = useState(true);

  const [profileLoading, setProfileLoading] = useState(urlProfileId ? true : !!state?.isMe);
  const [editOpen, setEditOpen]           = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState("");
  const [profileName, setProfileName]     = useState("");
  const [profileId, setProfileId]         = useState("");
  const [profileBio, setProfileBio]       = useState("");
  const [profileImage, setProfileImage]   = useState(null);
  const [profileWebsite, setProfileWebsite] = useState("");
  const fileInputRef = useRef(null);

  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [followingSearch, setFollowingSearch]       = useState("");

  const [myId, setMyId]                   = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowed, setIsFollowed]       = useState(false);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListTab, setFollowListTab]   = useState("followers");
  const [shareOpen, setShareOpen]           = useState(false);
  const [deleteConfirm, setDeleteConfirm]   = useState(null); // { type, id, title }
  const [deleting, setDeleting]             = useState(false);
  const [listingModalOpen, setListingModalOpen]   = useState(false);
  const [editingPost, setEditingPost]             = useState(null);
  const [editingSong, setEditingSong]             = useState(null);
  const [editingProject, setEditingProject]       = useState(null);
  const profileRef = useRef(null);
  const [profileHeight, setProfileHeight] = useState(300);

  useEffect(() => {
    if (profileRef.current) {
      setProfileHeight(profileRef.current.offsetHeight);
    }
  }, [profileLoading, editOpen]);

  useEffect(() => {
    document.body.style.overflow = editOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [editOpen]);

  // 현재 로그인 유저 ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMyId(session?.user?.id ?? null);
    });
  }, []);

  // 팔로워/팔로잉 카운트
  // - 내 프로필(/artist + state.isMe): targetProfileId가 null이므로 myId 사용
  // - 상대방 프로필(/profile/:id): targetProfileId 사용
  useEffect(() => {
    if (!urlProfileId) return;
    setUrlProfile(null);
    setDbSongs([]);
    setDbProjects([]);
    setDbPosts([]);
    setDbPlaylists([]);
  }, [urlProfileId]);

  useEffect(() => {
    const pid = targetProfileId ?? (isMe ? myId : null);
    if (!pid) return;
    // 팔로워: pid를 팔로우하는 사람 수 (following_id = pid)
    supabase.from("follows").select("*", { count: "exact", head: true })
      .eq("following_id", pid)
      .then(({ count }) => setFollowerCount(count ?? 0));
    // 팔로잉: pid가 팔로우하는 사람 수 (follower_id = pid)
    supabase.from("follows").select("*", { count: "exact", head: true })
      .eq("follower_id", pid)
      .then(({ count }) => setFollowingCount(count ?? 0));
  }, [targetProfileId, myId, isMe]);

  // 내가 팔로우했는지 여부
  useEffect(() => {
    if (!targetProfileId || !myId || myId === targetProfileId) return;
    supabase.from("follows")
      .select("follower_id")
      .eq("follower_id", myId)
      .eq("following_id", targetProfileId)
      .maybeSingle()
      .then(({ data }) => setIsFollowed(!!data));
  }, [targetProfileId, myId]);

  // 음원 / 프로젝트 / 공고 데이터 fetch + 실시간
  useEffect(() => {
    const pid = urlProfileId ?? targetProfileId ?? myId;
    if (!pid) return;

    setDbSongs([]);
    setDbProjects([]);
    setDbPosts([]);
    setDbPlaylists([]);
    setTabLoading(true);

    Promise.all([
      supabase.from("tracks").select("*, profiles!tracks_author_id_fkey(username, avatar_url)").eq("author_id", pid).eq("type", "song").order("created_at", { ascending: false }),
      supabase.from("projects").select("*").eq("author_id", pid).order("created_at", { ascending: false }),
      supabase.from("posts").select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)").eq("author_id", pid).order("created_at", { ascending: false }),
      supabase.from("playlists").select("id, title, cover_url, created_at, author_id").eq("author_id", pid).eq("is_public", true).order("created_at", { ascending: false }),
    ]).then(([{ data: songs }, { data: projects }, { data: posts }, { data: playlists }]) => {
      setDbSongs(songs ?? []);
      setDbProjects(projects ?? []);
      setDbPosts((posts ?? []).map(mapDbPost));
      setDbPlaylists(playlists ?? []);
      setTabLoading(false);
    }).catch(() => {
      setTabLoading(false);
    });

    const tracksSub = supabase.channel(`profile-tracks-${pid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tracks", filter: `author_id=eq.${pid}` }, ({ new: t }) => {
        if (t.type === "song") setDbSongs(prev => [t, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tracks", filter: `author_id=eq.${pid}` }, ({ new: t }) => {
        if (t.type === "song") setDbSongs(prev => prev.map(s => s.id === t.id ? { ...s, ...t } : s));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tracks", filter: `author_id=eq.${pid}` }, ({ old: t }) => {
        setDbSongs(prev => prev.filter(s => s.id !== t.id));
      })
      .subscribe();

    const projectsSub = supabase.channel(`profile-projects-${pid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "projects", filter: `author_id=eq.${pid}` }, ({ new: p }) => {
        setDbProjects(prev => [p, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects", filter: `author_id=eq.${pid}` }, ({ new: p }) => {
        setDbProjects(prev => prev.map(proj => proj.id === p.id ? { ...proj, ...p } : proj));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "projects", filter: `author_id=eq.${pid}` }, ({ old: p }) => {
        setDbProjects(prev => prev.filter(proj => proj.id !== p.id));
      })
      .subscribe();

    const POST_COLS = "*, profiles!posts_author_id_fkey(username, handle, avatar_url)";
    const postsSub = supabase.channel(`profile-posts-${pid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts", filter: `author_id=eq.${pid}` }, ({ new: p }) => {
        setDbPosts(prev => [mapDbPost(p), ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts", filter: `author_id=eq.${pid}` }, async ({ new: p }) => {
        const { data } = await supabase.from("posts").select(POST_COLS).eq("id", p.id).single();
        if (data) setDbPosts(prev => prev.map(post => post.id === data.id ? mapDbPost(data) : post));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts", filter: `author_id=eq.${pid}` }, ({ old: p }) => {
        setDbPosts(prev => prev.filter(post => post.id !== p.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tracksSub);
      supabase.removeChannel(projectsSub);
      supabase.removeChannel(postsSub);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProfileId, targetProfileId, myId]);

  // /profile/:id 라우트 — URL에서 프로필 id를 받아 Supabase로 불러오기
  useEffect(() => {
    if (!urlProfileId) return;
    setUrlProfile(null);
    setIsUrlMe(false);
    setProfileLoading(true);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user?.id;

      // 1차: profiles 직접 조회
      let data = null;
      const { data: direct, error: directErr } = await supabase
        .from("profiles")
        .select("id, username, handle, bio, website, avatar_url")
        .eq("id", urlProfileId.toString())
        .maybeSingle();
      console.log("[ArtistProfile] 1차 직접조회:", direct, directErr?.message);
      data = direct;

      // 2차 fallback: tracks join으로 우회
      if (!data) {
        const { data: trackRow, error: trackErr } = await supabase
          .from("tracks")
          .select("profiles(id, username, handle, bio, website, avatar_url)")
          .eq("author_id", urlProfileId)
          .limit(1)
          .maybeSingle();
        console.log("[ArtistProfile] 2차 tracks join:", trackRow, trackErr?.message);
        data = trackRow?.profiles ?? null;
      }

      if (data) {
        setUrlProfile(data);
        const mine = data.id === myId;
        setIsUrlMe(mine);
        setProfileName(data.username ?? "");
        setProfileId(data.handle ? `@${data.handle}` : (data.username ? `@${data.username}` : ""));
        setProfileBio(data.bio ?? "");
        setProfileWebsite(data.website ?? "");
        setProfileImage(data.avatar_url ?? null);
      }
      setProfileLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProfileId]);

  // /artist 라우트 — state 기반 프로필
  useEffect(() => {
    if (urlProfileId) return;
    if (!isMe) {
      setProfileName(artist.name);
      setProfileId(artist.id ?? "");
      setProfileBio("인디 R&B · 얼터너티브 소울 아티스트.");
      return;
    }
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setProfileLoading(false); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, handle, bio, website, avatar_url")
        .eq("id", uid)
        .single();

      if (error) {
        console.error("프로필 로드 오류:", error.message);
        const emailName = session.user.email?.split("@")[0] ?? "나의 프로필";
        setProfileName(emailName);
        setProfileId(`@${emailName}`);
        setProfileLoading(false);
        return;
      }

      setProfileName(data.username    ?? "");
      setProfileId(data.handle        ? `@${data.handle}` : `@${data.username ?? ""}`);
      setProfileBio(data.bio          ?? "");
      setProfileWebsite(data.website  ?? "");
      setProfileImage(data.avatar_url ?? null);
      setProfileLoading(false);
    }
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.isMe]);

  async function saveProfile() {
    setSaving(true);
    setSaveError("");

    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setSaveError("로그인이 필요합니다.");
      setSaving(false);
      return;
    }

    let avatarUrl = profileImage?.startsWith("blob:") ? null : (profileImage ?? null);

    if (profileImage?.startsWith("blob:")) {
      // blob → File 변환
      let blob, mimeType, ext;
      try {
        const resp = await fetch(profileImage);
        blob       = await resp.blob();
        mimeType   = blob.type || "image/jpeg";
        ext        = (mimeType.split("/")[1] || "jpg").replace("jpeg", "jpg");
      } catch (e) {
        setSaveError(`이미지 파일을 읽을 수 없습니다: ${e.message}`);
        setSaving(false);
        return;
      }

      // 기존 아바타 파일 모두 삭제 (uid 포함한 파일명)
      const { data: existingFiles } = await supabase.storage
        .from("avatars")
        .list("", { search: uid });
      if (existingFiles?.length) {
        await supabase.storage.from("avatars").remove(existingFiles.map(f => f.name));
      }

      // timestamp로 파일명 고유화 → 브라우저 캐시 무효화
      const newPath = `avatar_${uid}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(newPath, blob, { contentType: mimeType });

      if (uploadErr) {
        setSaveError(`이미지 업로드 실패: ${uploadErr.message}`);
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(newPath);
      avatarUrl = urlData.publicUrl;
      setProfileImage(avatarUrl);
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: uid, username: profileName, handle: profileId.replace(/^@/, ""), bio: profileBio, website: profileWebsite, avatar_url: avatarUrl },
        { onConflict: "id" }
      );

    if (error) {
      setSaveError(`저장 실패: ${error.message}`);
      setSaving(false);
      return;
    }

    setUrlProfile(prev => ({
      ...(prev ?? {}),
      username: profileName,
      handle: profileId.replace(/^@/, ""),
      bio: profileBio,
      website: profileWebsite,
      avatar_url: avatarUrl,
    }));
    setProfileImage(avatarUrl ? avatarUrl + "?t=" + Date.now() : null);
    refreshProfile();
    setSaving(false);
    setEditOpen(false);
  }

  async function toggleFollowSupabase() {
    if (!myId || !targetProfileId || myId === targetProfileId) return;
    const next = !isFollowed;
    setIsFollowed(next);
    // 상대방 팔로워 수 즉시 반영 (following_id = targetProfileId 카운트)
    setFollowerCount(n => next ? n + 1 : n - 1);
    // 상대방의 팔로잉 수는 내가 누군가를 팔로우해도 변하지 않음 (follower_id = targetProfileId 카운트)
    if (next) {
      showToast(ml("k085"), "success", async () => {
        setIsFollowed(false);
        setFollowerCount(n => n - 1);
        await supabase.from("follows").delete()
          .eq("follower_id", myId)
          .eq("following_id", targetProfileId);
        showToast(ml("k014"), "info", undefined, "user-minus");
      }, "user-plus");
      await supabase.from("follows").insert({ follower_id: myId, following_id: targetProfileId });
    } else {
      showToast(ml("k014"), "info", async () => {
        setIsFollowed(true);
        setFollowerCount(n => n + 1);
        await supabase.from("follows").insert({ follower_id: myId, following_id: targetProfileId });
      }, "user-minus");
      await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", targetProfileId);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm || deleting) return;
    setDeleting(true);
    const { type, id } = deleteConfirm;
    const table = type === "post" ? "posts" : type === "project" ? "projects" : "tracks";

    // 삭제 전 전체 데이터 저장 (되돌리기용)
    const { data: snapshot } = await supabase.from(table).select("*").eq("id", id).single();

    await supabase.from(table).delete().eq("id", id);

    if (type === "song") {
      setDbSongs(prev => prev.filter(s => s.id !== id));
      showToast(ml("k086"), "info", snapshot ? async () => {
        const { id: _, ...data } = snapshot;
        const { data: restored } = await supabase.from("tracks").insert({ ...data, id }).select().single();
        if (restored) setDbSongs(prev => [restored, ...prev]);
      } : undefined, "trash");
    } else if (type === "project") {
      setDbProjects(prev => prev.filter(p => p.id !== id));
      showToast(ml("k087"), "info", snapshot ? async () => {
        const { id: _, ...data } = snapshot;
        const { data: restored } = await supabase.from("projects").insert({ ...data, id }).select().single();
        if (restored) setDbProjects(prev => [restored, ...prev]);
      } : undefined, "trash");
    } else {
      setDbPosts(prev => prev.filter(p => p.id !== id));
      showToast(ml("k088"), "info", snapshot ? async () => {
        const { id: _, created_at: __, updated_at: ___, like_count: ____, comment_count: _____, view_count: ______, ...data } = snapshot;
        const { data: restored } = await supabase.from("posts").insert({ ...data, id }).select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)").single();
        if (restored) setDbPosts(prev => [mapDbPost(restored), ...prev]);
      } : undefined, "trash");
    }

    setDeleting(false);
    setDeleteConfirm(null);
  }

  function handleEditSong(s) {
    setEditingSong({ id: s.id, title: s.title, genre: s.genre, cover_url: s.cover_url, audio_url: s.audio_url, audio_name: s.audio_name ?? null, duration: s.duration });
  }
  function handleEditProject(p) {
    setEditingProject({ id: p.id, title: p.title, description: p.description, genre: p.genre, cover_url: p.cover_url, position: p.position ?? "" });
  }
  async function handleEditPost(p) {
    const { data } = await supabase.from("posts").select("*").eq("id", p.id).single();
    setEditingPost(data ?? p);
    setListingModalOpen(true);
  }

  function handlePostSaved() {
    const pid = urlProfileId ?? targetProfileId ?? myId;
    if (!pid) return;
    setDbPosts([]);
    supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)")
      .eq("author_id", pid)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setDbPosts(data.map(mapDbPost)); });
  }

  const displayName = isMe ? profileName : artist.name;
  const displayId   = isMe ? profileId   : artist.id;
  const displayBio  = isMe ? profileBio  : profileBio;

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "10px 14px", color: "#fff",
    fontSize: 14, fontFamily: "inherit", outline: "none",
  };

  const sk = { background: "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)", backgroundSize: "600px 100%", animation: "shimmer 1.4s infinite linear" };
  const avatarSrc = isMe ? profileImage : artist.avatar_url;

  if (urlProfileId && !urlProfile) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #FC3C44", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#000000", overflowX: "hidden" }}>
      <style>{`@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {followListOpen && (
        <FollowListModal
          profileId={targetProfileId ?? myId}
          initialTab={followListTab}
          myId={myId}
          onClose={() => setFollowListOpen(false)}
          onFollowerDeleted={() => setFollowerCount(n => Math.max(0, n - 1))}
        />
      )}

      <NewListingModal
        open={listingModalOpen}
        onClose={() => { setListingModalOpen(false); setEditingPost(null); }}
        editData={editingPost}
        onSaved={handlePostSaved}
      />

      <NewProjectModal
        open={!!editingProject}
        onClose={() => setEditingProject(null)}
        editData={editingProject}
        onSaved={(fresh) => {
          if (!fresh?.id) return;
          setDbProjects(prev => prev.map(p => p.id === fresh.id ? { ...p, ...fresh } : p));
          setEditingProject(null);
        }}
      />

      <NewTrackModal
        open={!!editingSong}
        onClose={() => setEditingSong(null)}
        editData={editingSong}
        onSaved={updated => {
          if (!updated) return;
          const normGenre = (() => { const g = Array.isArray(updated.genre) ? updated.genre[0] : updated.genre; if (!g) return "—"; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "—" : g; } catch { return g; } } return g; })();
          const normDur = (() => { const d = updated.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const sec = typeof d === "number" ? d : parseInt(d, 10); return isNaN(sec) ? "—" : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; })();
          setDbSongs(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated, genre: normGenre, duration: normDur } : s));
          setEditingSong(null);
        }}
      />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareData={{
          type: "profile", userId: targetProfileId ?? myId,
          username: isMe ? profileName : artist.name,
          handle: isMe ? profileId.replace(/^@/, "") : (urlProfile?.handle ?? (artist.id ? artist.id.replace(/^@/, "") : "")),
          avatar_url: isMe ? profileImage : (artist.avatar_url ?? null),
          coverUrl: isMe ? profileImage : (artist.avatar_url ?? null),
          title: isMe ? profileName : artist.name,
        }}
      />

      {deleteConfirm && (
        <div onClick={() => !deleting && setDeleteConfirm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 360, background: "#141414", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{ml("k089")}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 24, lineHeight: 1.6 }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>"{deleteConfirm.title}"</span>{ml("k090")}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{ml("k005")}</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: deleting ? "rgba(252,60,68,0.45)" : "#FC3C44", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 150ms" }}>{deleting ? (ml("k091")) : (ml("k015"))}</button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div onClick={() => setEditOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 480, background: "#141414", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 28px", letterSpacing: "-0.02em" }}>{ml("k028")}</h2>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div onClick={() => !saving && fileInputRef.current?.click()} style={{ position: "relative", width: 140, height: 140, borderRadius: "50%", cursor: saving ? "default" : "pointer" }}>
                {profileImage ? (
                  <img loading="eager" decoding="async" src={profileImage} alt="profile" style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "contain", background: "#000" }} />
                ) : (
                  <div style={{ width: 140, height: 140, borderRadius: "50%", background: artist.gradient, display: "grid", placeItems: "center", fontSize: 46, fontWeight: 700, color: "#fff" }}>{profileName?.[0]?.toUpperCase() ?? "나"}</div>
                )}
                {saving ? (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9" strokeOpacity="0.25"/><path d="M12 3a9 9 0 0 1 9 9"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/></path></svg>
                  </div>
                ) : (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = "";
                  const src = URL.createObjectURL(file);
                  const img = new Image();
                  img.src = src;
                  await new Promise(r => { img.onload = r; });
                  const W = img.naturalWidth, H = img.naturalHeight;
                  let x, y, size;
                  try {
                    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
                    const detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions());
                    if (detections.length > 0) {
                      const box = detections[0].box;
                      const padding = Math.max(box.width, box.height) * 1.2;
                      x = Math.max(0, box.x - padding);
                      y = Math.max(0, box.y - padding);
                      size = box.width + padding * 2;
                    } else {
                      size = Math.min(W, H);
                      x = (W - size) / 2;
                      y = (H - size) / 2;
                    }
                  } catch {
                    size = Math.min(W, H);
                    x = (W - size) / 2;
                    y = (H - size) / 2;
                  }
                  // 경계 초과 방지
                  size = Math.min(size, W, H);
                  x = Math.max(0, Math.min(x, W - size));
                  y = Math.max(0, Math.min(y, H - size));
                  const canvas = document.createElement('canvas');
                  canvas.width = 400; canvas.height = 400;
                  const ctx = canvas.getContext('2d');
                  ctx.clearRect(0, 0, 400, 400);
                  ctx.drawImage(img, x, y, size, size, 0, 0, 400, 400);
                  canvas.toBlob(blob => { if (blob) setProfileImage(URL.createObjectURL(blob)); }, 'image/jpeg', 0.95);
                }} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6 }}>{ml("k029")}</label>
                <input value={profileName} onChange={e => setProfileName(e.target.value)} style={inputStyle} placeholder={ml("k029")} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6 }}>{ml("k092")}</label>
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", padding: "0 14px" }}>
                  <span style={{ color: "#fff", fontSize: 14, userSelect: "none" }}>@</span>
                  <input value={profileId.replace(/^@/, "")} onChange={e => setProfileId("@" + e.target.value.replace(/^@+/, ""))} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "inherit", padding: "10px 0 10px 4px" }} placeholder="아이디" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 6 }}>{ml("k093")}</label>
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", padding: "0 14px" }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  <input value={profileWebsite} onChange={e => setProfileWebsite(e.target.value)} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "inherit", padding: "10px 0 10px 8px" }} placeholder="https://yoursite.com" />
                </div>
              </div>
            </div>
            {saveError && <div style={{ marginTop: 16, padding: "9px 13px", borderRadius: 8, background: "rgba(252,60,68,0.1)", border: "1px solid rgba(252,60,68,0.2)", color: "#fc8086", fontSize: 12.5 }}>{saveError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
              <button onClick={() => { setEditOpen(false); setSaveError(""); }} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{ml("k005")}</button>
              <button onClick={saveProfile} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: saving ? "rgba(252,60,68,0.45)" : "#FC3C44", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 150ms" }}>{saving ? (ml("k094")) : (ml("k095"))}</button>
            </div>
          </div>
        </div>
      )}

      {followingModalOpen && (
        <div onClick={() => { setFollowingModalOpen(false); setFollowingSearch(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, maxHeight: "70vh", background: "#141414", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "24px 28px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>{ml("k002")}</h2>
                <button onClick={() => { setFollowingModalOpen(false); setFollowingSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", padding: 4 }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "8px 14px" }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input value={followingSearch} onChange={e => setFollowingSearch(e.target.value)} placeholder={ml("k012")} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 14, fontFamily: "inherit" }} />
                {followingSearch && <button onClick={() => setFollowingSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", padding: 0 }}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
              </div>
            </div>
            {(() => {
              const raw = isMe ? followingArtists : MOCK_FOLLOWING;
              const q = followingSearch.trim().toLowerCase();
              const list = q ? raw.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) : raw;
              return (
                <div style={{ overflowY: "auto", padding: "8px 12px 16px" }}>
                  {list.length === 0 ? (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14, padding: "48px 0" }}>{q ? (ml("k016")) : (ml("k030"))}</div>
                  ) : list.map((a, i) => (
                    <div key={i} onClick={() => { setFollowingModalOpen(false); navigate("/artist", { state: a }); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", borderRadius: 12, cursor: "pointer", transition: "background 120ms" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ width: 46, height: 46, borderRadius: "50%", background: a.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{a.initial}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{a.id}</div>
                      </div>
                      {isMe ? (
                        <button onClick={e => { e.stopPropagation(); toggleFollow(a); }} style={{ padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>{ml("k002")}</button>
                      ) : <FollowBadge artist={a} />}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <div style={{ marginLeft: pad, transition: `margin-left ${DURATION} ${EASE}`, display: "flex", alignItems: "flex-start", minWidth: 900 }}>
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* ===== PROFILE ===== */}
        <div style={{ paddingTop: 78, paddingLeft: 16, paddingRight: 24 }}>
          <div ref={profileRef} style={{ display: "flex", justifyContent: "center" }}>
            {profileLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 72, paddingBottom: 48 }}>
                <div style={{ ...sk, width: 150, height: 150, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ ...sk, width: 200, height: 28, borderRadius: 8 }} />
                  <div style={{ ...sk, width: 120, height: 16, borderRadius: 8 }} />
                  <div style={{ display: "flex", gap: 28 }}>
                    <div style={{ ...sk, width: 70, height: 16, borderRadius: 8 }} />
                    <div style={{ ...sk, width: 70, height: 16, borderRadius: 8 }} />
                  </div>
                  <div style={{ ...sk, width: 280, height: 36, borderRadius: 8 }} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 36, paddingBottom: 48 }}>

                {/* 좌: avatar + 편집버튼 */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 150, height: 150, borderRadius: "50%", position: "relative", overflow: "hidden", background: "#000", boxShadow: "0 24px 64px -16px rgba(0,0,0,0.7), inset 0 0 0 1.5px rgba(255,255,255,0.14)" }}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" loading="eager" decoding="async" fetchpriority="high" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 52, fontWeight: 900, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.92)" }}>{artist.initial}</div>
                    )}
                    {!avatarSrc && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 28% 16%, rgba(255,255,255,0.28), transparent 52%)", pointerEvents: "none" }} />}
                  </div>
                  {isMe ? (
                    <button onClick={() => setEditOpen(true)}
                      style={{ all: "unset", cursor: "pointer", height: 36, width: 220, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", background: "rgba(255,255,255,0.08)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)", transition: "background 160ms, transform 100ms", position: "absolute", left: 80, top: 190 }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
                      onMouseUp={e => { e.currentTarget.style.transform = "none"; }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                      {ml("k028")}
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 10, position: "absolute", left: -10, top: 190 }}>
                      <button onClick={toggleFollowSupabase}
                        style={{ all: "unset", cursor: "pointer", height: 36, width: 220, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", background: isFollowed ? "rgba(255,255,255,0.05)" : "#FC3C44", color: "#fff", boxShadow: isFollowed ? "inset 0 0 0 1px rgba(255,255,255,0.18)" : "0 10px 26px -10px rgba(252,60,68,0.6)", transition: "background 160ms, transform 100ms" }}
                        onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
                        onMouseUp={e => { e.currentTarget.style.transform = "none"; }}
                      >
                        {isFollowed ? (ml("k002")) : (ml("k096"))}
                      </button>
                      <button onClick={() => navigate("/chat", { state: { userId: targetProfileId, username: artist.name, handle: urlProfile?.handle ?? null, avatarUrl: artist.avatar_url ?? null } })}
                        style={{ all: "unset", cursor: "pointer", height: 36, width: 220, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", background: "rgba(255,255,255,0.05)", color: "#fff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)", transition: "background 160ms, transform 100ms" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                        onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
                        onMouseUp={e => { e.currentTarget.style.transform = "none"; }}
                      >
                        {ml("k097")}
                      </button>
                    </div>
                  )}
                </div>

                {/* 우: info */}
                <div style={{ minWidth: 0, paddingTop: 16 }}>
                  {/* row 1: 이름 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
                    <h1 style={{ margin: 0, fontSize: "clamp(20px, 2.2vw, 30px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff" }}>{displayName}</h1>
                  </div>

                  {/* row 2: 아이디 */}
                  <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "-0.01em", marginBottom: 18 }}>{displayId}</div>

                  {/* row 3: stats */}
                  <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: displayBio ? 18 : 0 }}>
                    {[
                      { value: followerCount, label: ml("k031"), onClick: () => { setFollowListOpen(true); setFollowListTab("followers"); } },
                      { value: followingCount, label: ml("k002"), onClick: () => { setFollowListOpen(true); setFollowListTab("following"); } },
                    ].map((stat, i) => (
                      <div key={i} onClick={stat.onClick} style={{ display: "flex", alignItems: "baseline", gap: 6, cursor: "pointer" }}>
                        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: "#fff" }}>{stat.value}</span>
                        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* row 4: bio */}
                  {displayBio && (
                    <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", margin: 0, wordBreak: "keep-all", letterSpacing: "-0.01em" }}>{displayBio}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== TABS (Instagram style) ===== */}
        <div style={{ position: "sticky", top: 0, zIndex: 20, marginTop: 60, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(22px) saturate(150%)", WebkitBackdropFilter: "blur(22px) saturate(150%)" }}>
          <div style={{ display: "flex" }}>
            {TABS.map(({ key, label, icon }) => {
              const active = activeTab === key;
              const count = key === "songs" ? dbSongs.length : key === "playlists" ? dbPlaylists.length : dbPosts.length;
              return (
                <button key={key} onClick={() => setActiveTab(key)}
                  style={{
                    all: "unset", cursor: "pointer", flex: 1,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    height: 50,
                    color: active ? "#fff" : "rgba(255,255,255,0.4)",
                    fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                    transition: "color 160ms",
                  }}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 7, height: "100%", boxSizing: "border-box",
                    borderBottom: active ? "2px solid #FC3C44" : "2px solid transparent",
                  }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                    <span>{label}</span>
                    {!tabLoading && <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.65 }}>{count}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== CONTENT (음원) ===== */}
        <div style={{ padding: (activeTab === "projects" || activeTab === "playlists") ? "28px 24px 0 16px" : "28px 24px 96px 16px" }}>
          {tabLoading ? (
            activeTab === "projects" ? null : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "grid", gridTemplateColumns: "68px 1fr 1fr 60px 32px", gap: 14, padding: "6px 12px", marginBottom: 4 }}>
                  {[
                    { label: "" },
                    { label: ml("k122") },
                    { label: ml("k006") },
                    { label: ml("k123") },
                    { label: "" },
                  ].map((h, i) => (
                    <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em", paddingLeft: i === 2 ? (isOpen ? 96 : 120) : 0, transition: i === 2 ? `padding-left ${DURATION} ${EASE}` : undefined }}>{h.label}</div>
                  ))}
                </div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "68px 1fr 1fr 60px 32px", gap: 14, padding: "10px 12px", alignItems: "center" }}>
                    <div style={{ ...sk, width: 58, height: 58, borderRadius: "50%" }} />
                    <div style={{ ...sk, height: 14, borderRadius: 6 }} />
                    <div style={{ ...sk, height: 14, borderRadius: 6 }} />
                    <div style={{ ...sk, height: 14, borderRadius: 6 }} />
                    <div />
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              {activeTab === "songs" && (
                dbSongs.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, minHeight: "38vh", width: "100%" }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                      {ob("noUploadedSongs", lang)}
                    </div>
                    {isMe && (
                      <button onClick={() => navigate("/new-songs", { state: { openUpload: true } })}
                        style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 22px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", transition: "background 160ms" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                      >
                        {ob("uploadSong", lang)}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dbSongs.map((s, i) => (
                      <div key={s.id} style={{ borderBottom: i < dbSongs.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                        <NewSongRow s={{ ...s, artist: s.profiles?.username ?? s.artist ?? "아티스트", grad: GRAD_FALLBACKS[i % GRAD_FALLBACKS.length], genre: (() => { const g = Array.isArray(s.genre) ? s.genre[0] : s.genre; if (!g) return "—"; if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? p[0] ?? "—" : g; } catch { return g; } } return g; })(), duration: (() => { const d = s.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const sec = typeof d === "number" ? d : parseInt(d, 10); return isNaN(sec) ? "—" : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`; })() }} isMe={isMe} sidebarOpen={isOpen} showGenre={!isOpen}
                          onEdit={() => handleEditSong(s)}
                          onDelete={() => setDeleteConfirm({ type: "song", id: s.id, title: s.title })}
                        />
                      </div>
                    ))}
                  </div>
                )
              )}

            </>
          )}
          {/* ===== 프로젝트 ===== */}
          {activeTab === "projects" && (() => {
            if (tabLoading) return (
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                  {[...Array(2)].map((_, i) => <div key={i} style={{ ...sk, height: 180, borderRadius: 18 }} />)}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                  {[...Array(2)].map((_, i) => <div key={i} style={{ ...sk, height: 180, borderRadius: 18 }} />)}
                </div>
              </div>
            );
            if (dbPosts.length === 0) return (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, minHeight: "38vh", width: "100%" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                  {ob("noUploadedProjects", lang)}
                </div>
              </div>
            );
            const left = dbPosts.filter((_, i) => i % 2 === 0);
            const right = dbPosts.filter((_, i) => i % 2 !== 0);
            return (
              <div style={{ display: "flex", gap: 16, paddingBottom: 40, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  {left.map((p, i) => <PostCard key={p.id} p={p} idx={i} onNavigate={navigate} isMe={isMe} onEdit={() => handleEditPost(p)} onDelete={() => setDeleteConfirm({ type: "post", id: p.id, title: p.title })} />)}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  {right.map((p, i) => <PostCard key={p.id} p={p} idx={i} onNavigate={navigate} isMe={isMe} onEdit={() => handleEditPost(p)} onDelete={() => setDeleteConfirm({ type: "post", id: p.id, title: p.title })} />)}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ===== 플레이리스트 ===== */}
        {activeTab === "playlists" && (
          tabLoading ? (
            <div style={{ padding: "12px 24px 80px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 178px)", gap: 20 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 14, background: "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)", backgroundSize: "600px 100%", animation: "shimmer 1.4s infinite linear" }} />
                    <div style={{ marginTop: 10, height: 14, borderRadius: 6, background: "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)", backgroundSize: "600px 100%", animation: "shimmer 1.4s infinite linear" }} />
                  </div>
                ))}
              </div>
            </div>
          ) : dbPlaylists.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, minHeight: "38vh", width: "100%" }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                {ob("noPlaylists", lang)}
              </div>
              {isMe && (
                <button onClick={() => navigate("/library", { state: { openPlaylistCreate: true } })}
                  style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 22px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", transition: "background 160ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.14)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                >
                  {ob("addPlaylist", lang)}
                </button>
              )}
            </div>
          ) : (
            <div style={{ padding: "12px 24px 80px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 178px)", gap: 20 }}>
                {dbPlaylists.map((pl, i) => (
                  <PlaylistProfileCard key={pl.id} pl={pl} i={i} navigate={navigate} />
                ))}
              </div>
            </div>
          )
        )}

        {/* ===== 공고 ===== */}
        {activeTab === "posts" && (
          tabLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginLeft: -40, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", padding: "18px 18px 0" }}>
                {[...Array(2)].map((_, i) => <div key={i} style={{ ...sk, height: 180, borderRadius: 18, marginBottom: 18 }} />)}
              </div>
              <div style={{ padding: "18px 18px 0" }}>
                {[...Array(2)].map((_, i) => <div key={i} style={{ ...sk, height: 180, borderRadius: 18, marginBottom: 18 }} />)}
              </div>
            </div>
          ) : dbPosts.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14, padding: "64px 0" }}>{ml("k101")}</div>
          ) : (() => {
            const leftPosts  = dbPosts.filter((_, i) => i % 2 === 0);
            const rightPosts = dbPosts.filter((_, i) => i % 2 !== 0);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginLeft: -40, borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: 80 }}>
                <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  {leftPosts.map((p, i) => (
                    <PostCard key={p.id} p={p} idx={i} onNavigate={navigate} isMe={isMe}
                      onEdit={() => handleEditPost(p)}
                      onDelete={() => setDeleteConfirm({ type: "post", id: p.id, title: p.title })}
                    />
                  ))}
                </div>
                <div>
                  {rightPosts.map((p, i) => (
                    <PostCard key={p.id} p={p} idx={i} onNavigate={navigate} isMe={isMe}
                      onEdit={() => handleEditPost(p)}
                      onDelete={() => setDeleteConfirm({ type: "post", id: p.id, title: p.title })}
                    />
                  ))}
                </div>
              </div>
            );
          })()
        )}

      </main>
      <RightSidebar width={320} activeTab={activeTab} page={activeTab === "songs" ? undefined : "profile"} />
      </div>
    </div>
  );
}
