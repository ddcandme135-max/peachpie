import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import NewListingModal from "../components/NewListingModal";
import ShareModal from "../components/ShareModal";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import cdImg from "../assets/_-removebg-preview.png";
import { ml, timeAgo } from "../lib/ml";
import { translateAdminTitle, translateAdminBody, isAdminPost } from "../lib/adminPostI18n";
import i18n from "../i18n";

/* ── CDPlayer (kept for external imports) ── */
export function CDPlayer({ coverUrl, avBg, size = 54 }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <img loading="eager" decoding="async" src={cdImg} alt="cd" style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "contain", zIndex: 1,
      }} />
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", zIndex: 2,
        background: coverUrl ? `url(${coverUrl}) center/cover` : avBg,
        WebkitMaskImage: "radial-gradient(circle, transparent 16%, black 17%)",
        maskImage: "radial-gradient(circle, transparent 16%, black 17%)",
      }} />
    </div>
  );
}

/* ── Design tokens ── */
const DUR   = "240ms";
const EASE  = "cubic-bezier(0.32,0.72,0,1)";
const R     = "#FF5A4D";   // semantic-critical
const POS   = "#5EE6A8";   // semantic-positive
const LIME  = "#C6F24E";
const MAG   = "#FF2E88";
const BLUE  = "#56A8FF";
const HL    = "rgba(255,255,255,0.08)";
const FG3   = "rgba(255,255,255,0.44)";
const ELEV  = "#18181B";

const GRADS = [
  "linear-gradient(135deg,#7c2d12,#1a0a05)",
  "linear-gradient(135deg,#4c1d95,#1e1b4b)",
  "linear-gradient(135deg,#831843,#1a0207)",
  "linear-gradient(135deg,#064e3b,#042f2e)",
  "linear-gradient(135deg,#1e3a8a,#0c0a1f)",
  "linear-gradient(135deg,#92400e,#451a03)",
  "linear-gradient(135deg,#0c4a6e,#082f49)",
  "linear-gradient(135deg,#4338ca,#1e1b4b)",
];

/* ── Category styles ── */
const CAT_STYLE = {
  "VOCAL":            { label: "Vocal",           color: "#f472b6", bg: "rgba(244,114,182,0.13)" },
  "PRODUCER":         { label: "Producer",         color: BLUE,      bg: "rgba(90,160,255,0.13)"  },
  "LYRIC":            { label: "Lyrics",           color: "#fbbf24", bg: "rgba(251,191,36,0.13)"  },
  "FEATURING":        { label: "Featuring",        color: "#4ade80", bg: "rgba(74,222,128,0.13)"  },
  "MIXING/MASTERING": { label: "Mixing/Mastering", color: "#a78bfa", bg: "rgba(167,139,250,0.13)" },
  "SESSION":          { label: "Session",          color: R,         bg: "rgba(252,60,68,0.13)"   },
};

export function formatTime(iso, lang = "ko") {
  if (!iso) return "";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "";
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (lang === "ja") {
    if (diff < 0 || min < 1) return "たった今";
    if (min < 60) return `${min}分前`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}時間前`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}日前`;
    if (d < 30) return `${Math.floor(d / 7)}週間前`;
    return `${Math.floor(d / 30)}ヶ月前`;
  }
  if (lang === "en") {
    if (diff < 0 || min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  }
  if (diff < 0 || min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주 전`;
  return `${Math.floor(d / 30)}개월 전`;
}

export function mapDbPost(p) {
  const cs = CAT_STYLE[p.category] ?? { label: p.category ?? "", color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.07)" };
  const name = p.profiles?.username ?? "아티스트";
  const handle = p.profiles?.handle ? `@${p.profiles.handle}` : `@${name.toLowerCase().replace(/\s/g, "")}`;
  return {
    id: p.id, isDummy: false,
    cat: cs.label, catColor: cs.color,
    name, handle, vrf: false,
    time: formatTime(p.created_at),
    createdAt: p.created_at ?? null,
    avBg: "linear-gradient(135deg,#fc3c44,#7c0a12)",
    letter: (name[0] ?? "A").toUpperCase(),
    avatarUrl: p.profiles?.avatar_url ?? null,
    author_id: p.author_id,
    title: p.title ?? "",
    text: p.description ?? "",
    coverUrl: (() => { try { const v = p.image_url; if (!v) return null; const a = JSON.parse(v); return Array.isArray(a) ? null : v; } catch { return p.image_url ?? null; } })(),
    imageUrl: (() => { try { const v = p.image_url; if (!v) return null; const a = JSON.parse(v); return Array.isArray(a) ? null : v; } catch { return p.image_url ?? null; } })(),
    grid: (() => { try { const v = p.image_url; if (!v) return null; const a = JSON.parse(v); return Array.isArray(a) ? a : null; } catch { return null; } })(),
    audioUrl: p.audio_url ?? null,
    audioName: p.audio_name ?? null,
    audioDuration: p.audio_duration ?? null,
    linkUrl: p.link_url ?? p.linkUrl ?? null,
    genre: p.genre ?? "",
    tags: p.genre ? p.genre.split(",").map(s => s.trim()).filter(Boolean).map(t => [t, "mag"]) : [],
    likes: p.like_count ?? 0,
    cmts: p.comment_count ?? 0,
    rt: 0,
    view_count: p.view_count ?? 0,
    liked: false,
  };
}

// 본문 인라인 링크 칩 (포스트 카드 / 상세 페이지 공통)
export function LinkPill({ url }) {
  if (!url) return null;
  let domain = url;
  try { domain = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, ""); } catch {}
  const FAV_COLORS = ["#2463EB", "#1DB954", "#FF2E88", "#F5854D", "#7C3AED", "#0EA5E9"];
  const ch = (domain[0] ?? "?").toUpperCase();
  const color = FAV_COLORS[domain.length % FAV_COLORS.length];
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 12px 0 10px", borderRadius: 999, background: "#161618", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", maxWidth: "100%", verticalAlign: "middle" }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, flex: "none", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700, color: "#fff", background: color }}>{ch}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{domain}</span>
    </a>
  );
}

/* ── Dummy posts (10개, design file 기준) ── */
const DUMMY_POSTS = [
  { id:"d0", isDummy:true, name:"Deon",        handle:"@deon",     time:"1주",  vrf:true,  avBg:GRADS[1], letter:"D", avatarUrl:null, author_id:null,
    title:"Ty Dolla Sign & Wiz Khalifa 무드", text:"다크 트랩 비트 거의 완성. 메인 벌스 함께 갈 보컬 찾습니다.",
    mediaType:"one", mediaGrad:GRADS[0], grid:null, track:null,
    tags:[["보컬","mag"],["Hip-hop","lime"]], cmts:1, rt:4, likes:3, liked:true,  view_count:159   },
  { id:"d1", isDummy:true, name:"K Dott",       handle:"@kdott",    time:"3시간", vrf:true,  avBg:GRADS[2], letter:"K", avatarUrl:null, author_id:null,
    title:"", text:"Octaine 스타일 808 비트팩 두 번째. 들어보고 합류 의향 있으면 DM 주세요.",
    mediaType:null, mediaGrad:null, grid:null,
    track:{ tt:"SDP_INTERLUDE_Extended", ts:"K Dott · 5:28", grad:GRADS[1] },
    tags:[["믹싱","mag"]], cmts:2, rt:2, likes:2, liked:false, view_count:144   },
  { id:"d2", isDummy:true, name:"Park Ji-min",  handle:"@jimin",    time:"5시간", vrf:false, avBg:GRADS[3], letter:"P", avatarUrl:null, author_id:null,
    title:"", text:"네오소울 EP 작업하실 분 구합니다. 레퍼런스는 SZA · SOS. 따뜻한 톤 좋아하시는 분이면 좋겠어요.",
    mediaType:null, mediaGrad:null, grid:null, track:null,
    tags:[["보컬","mag"],["R&B","lime"]], cmts:0, rt:1, likes:8, liked:false, view_count:92    },
  { id:"d3", isDummy:true, name:"Noeullight",   handle:"@noeul",    time:"1일",  vrf:true,  avBg:GRADS[4], letter:"N", avatarUrl:null, author_id:null,
    title:"Dawn FM 무드 신스팝 5곡", text:"믹싱·마스터링 후반 작업 함께하실 분. 데모 첨부합니다.",
    mediaType:null, mediaGrad:null, grid:[GRADS[4],GRADS[7]], track:null,
    tags:[["마스터링","mag"]], cmts:11, rt:12, likes:34, liked:false, view_count:1200  },
  { id:"d4", isDummy:true, name:"Mira Sato",    handle:"@mira",     time:"2일",  vrf:false, avBg:GRADS[5], letter:"M", avatarUrl:null, author_id:null,
    title:"", text:"시티팝 프로젝트 베이시스트 세션 모집. 도쿄/서울 원격 병행 가능.",
    mediaType:"tall", mediaGrad:GRADS[6], grid:null, track:null,
    tags:[["베이스","lime"]], cmts:5, rt:6, likes:21, liked:false, view_count:430   },
  { id:"d5", isDummy:true, name:"Greyline",     handle:"@greyline",  time:"3일",  vrf:false, avBg:GRADS[6], letter:"G", avatarUrl:null, author_id:null,
    title:"", text:"로파이 R&B 인스트루멘탈 모음. 가사 붙이실 작사가 찾습니다. 수익 배분 협의.",
    mediaType:null, mediaGrad:null, grid:null,
    track:{ tt:"Slow Burn (Inst.)", ts:"Greyline · 3:56", grad:GRADS[2] },
    tags:[["작사","mag"],["Lo-fi","lime"]], cmts:3, rt:2, likes:14, liked:false, view_count:287   },
  { id:"d6", isDummy:true, name:"Halo Boys",    handle:"@haloboys",  time:"4일",  vrf:true,  avBg:GRADS[7], letter:"H", avatarUrl:null, author_id:null,
    title:"", text:"풀 밴드 정규 1집 멤버 모집. 드럼·키보드 자리 남았어요. 장기 합주 가능한 분 우대.",
    mediaType:"one", mediaGrad:GRADS[4], grid:null, track:null,
    tags:[["드럼","mag"],["키보드","lime"]], cmts:8, rt:9, likes:52, liked:false, view_count:2400  },
  { id:"d7", isDummy:true, name:"Deon",         handle:"@deon",      time:"5일",  vrf:true,  avBg:GRADS[1], letter:"D", avatarUrl:null, author_id:null,
    title:"", text:"스튜디오 세션 끝. 다음 트랙 프로듀서 한 명 더 필요합니다. 트랩/드릴 가능하신 분.",
    mediaType:null, mediaGrad:null, grid:null, track:null,
    tags:[["프로듀서","lime"]], cmts:4, rt:3, likes:18, liked:false, view_count:511   },
  { id:"d8", isDummy:true, name:"Velvet Loop",  handle:"@velvet",    time:"6일",  vrf:false, avBg:GRADS[3], letter:"V", avatarUrl:null, author_id:null,
    title:"", text:"어쿠스틱 세션 라이브 트래킹 도와주실 기타리스트 모집. 한 곡, 하루 일정.",
    mediaType:"one", mediaGrad:GRADS[3], grid:null, track:null,
    tags:[["기타","lime"]], cmts:6, rt:4, likes:27, liked:false, view_count:690   },
  { id:"d9", isDummy:true, name:"Sangmin Kim",  handle:"@sangmin",   time:"1주",  vrf:true,  avBg:GRADS[5], letter:"S", avatarUrl:null, author_id:null,
    title:"Velvet Hour LP 크레딧 공개", text:"참여해주신 모든 분들 감사합니다. 다음 프로젝트도 곧.",
    mediaType:null, mediaGrad:null, grid:[GRADS[1],GRADS[5]], track:null,
    tags:[["완료","mag"]], cmts:14, rt:22, likes:88, liked:false, view_count:3100  },
];

/* ── Icons ── */
const ICO = {
  menu:     <svg viewBox="0 0 24 24" fill="currentColor" style={{width:17,height:17}}><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>,
  reply:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  rt:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  like:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  likeOn:   <svg viewBox="0 0 24 24" fill={R} stroke={R} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  view:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}><line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="7"/><line x1="18" y1="20" x2="18" y2="11"/></svg>,
  bookmark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  share:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>,
  play:     <svg viewBox="0 0 24 24" fill="currentColor" style={{width:15,height:15,marginLeft:2}}><polygon points="6 4 20 12 6 20 6 4"/></svg>,
  pause:    <svg viewBox="0 0 24 24" fill="currentColor" style={{width:15,height:15}}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>,
  plus:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M12 5v14"/><path d="M5 12h14"/></svg>,
};

const VF_BADGE = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={MAG} style={{ flexShrink: 0 }}>
    <path d="M12 1l2.4 2.1 3.1-.5 1.3 2.9 2.9 1.3-.5 3.1L23 12l-2.1 2.4.5 3.1-2.9 1.3-1.3 2.9-3.1-.5L12 23l-2.4-2.1-3.1.5-1.3-2.9L2.3 17l.5-3.1L1 12l2.1-2.4-.5-3.1 2.9-1.3 1.3-2.9 3.1.5z"/>
    <path d="M10.2 14.6l-2.3-2.3 1.1-1.1 1.2 1.2 3.5-3.5 1.1 1.1z" fill="#0E0E10"/>
  </svg>
);

function fmtViewCount(n) {
  if (typeof n === "string") return n;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/* ── PostCard ── */
export function PostCard({ p, idx, onNavigate, onShare, isMe, onEdit, onDelete, onUnlike }) {
  const [hov, setHov]           = useState(false);
  const [liked, setLiked]       = useState(p.liked ?? false);
  const [likeCount, setLikeCount] = useState(p.likes ?? 0);
  const [viewCount, setViewCount] = useState(p.view_count ?? 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [reportCategory, setReportCategory] = useState(0);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [myId, setMyId] = useState(null);
  const { t, i18n } = useTranslation();
  const displayTime = p.createdAt ? timeAgo(p.createdAt) : (p.time ?? "");
  // 관리자 글은 현재 언어로 제목/본문 치환
  const dTitle = translateAdminTitle(p, i18n.language);
  const dText = translateAdminBody(p, i18n.language);
  // 내 게시물 여부 — 명시적 isMe prop 또는 로그인 사용자와 작성자 비교로 판단
  const mine = isMe || (!p.isDummy && !!myId && !!p.author_id && myId === p.author_id);
  const audioRef = useRef(null);
  const menuBtnRef  = useRef(null);
  const menuPopRef  = useRef(null);
  const cardRef     = useRef(null);
  const viewedRef   = useRef(false);
  const { showToast } = useToast();

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const fn = e => {
      if (menuBtnRef.current?.contains(e.target)) return;
      if (menuPopRef.current?.contains(e.target)) return;
      setMoreOpen(false);
    };
    const close = () => setMoreOpen(false);
    document.addEventListener("mousedown", fn);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", fn);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (p.isDummy || !p.id) return;
    supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", p.id)
      .then(({ count }) => setLikeCount(count ?? 0));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from("likes").select("id").eq("user_id", session.user.id).eq("post_id", p.id)
        .maybeSingle().then(({ data }) => setLiked(!!data));
    });
  }, [p.id]);

  useEffect(() => {
    if (p.isDummy || !p.author_id) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      setMyId(session.user.id);
      supabase.from("follows").select("follower_id")
        .eq("follower_id", session.user.id).eq("following_id", p.author_id)
        .maybeSingle().then(({ data }) => setIsFollowing(!!data));
    });
  }, [p.author_id]);

  useEffect(() => {
    if (p.isDummy || !p.id) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !viewedRef.current) {
        viewedRef.current = true;
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session?.user || session.user.id === p.author_id) return;
          supabase.rpc("increment_view_count", { post_id: p.id })
            .then(({ error }) => { if (!error) setViewCount(n => n + 1); });
        });
      }
    }, { threshold: 0.5 });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [p.id]);

  async function toggleLike(e) {
    e.stopPropagation();
    if (p.isDummy || !p.id) { setLiked(v => !v); setLikeCount(n => liked ? n - 1 : n + 1); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { showToast(ml("k103"), "error"); return; }
    const uid = session.user.id;
    if (liked) {
      setLiked(false); setLikeCount(n => Math.max(0, n - 1));
      await supabase.from("likes").delete().eq("user_id", uid).eq("post_id", p.id);
      onUnlike?.();
      showToast(ml("k007"), "info", async () => {
        setLiked(true); setLikeCount(n => n + 1);
        await supabase.from("likes").insert({ user_id: uid, post_id: p.id });
      }, "heart-off");
    } else {
      setLiked(true); setLikeCount(n => n + 1);
      await supabase.from("likes").insert({ user_id: uid, post_id: p.id });
      showToast(ml("k017"), "success", async () => {
        setLiked(false); setLikeCount(n => Math.max(0, n - 1));
        await supabase.from("likes").delete().eq("user_id", uid).eq("post_id", p.id);
      }, "heart");
    }
  }

  /* media block — 16:10 fixed ratio */
  function renderMedia() {
    const OVERLAY = <div style={{ position: "absolute", inset: 0, background: "radial-gradient(130% 90% at 26% 12%, rgba(255,255,255,0.10), transparent 55%)", pointerEvents: "none" }} />;
    if (p.grid?.length) {
      return (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${HL}`, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {p.grid.map((src, i) => (
              <div key={i} style={{ height: 220, overflow: "hidden", background: src.startsWith("http") ? "#000" : src }}>
                {src.startsWith("http") && <img loading="eager" decoding="async" src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (p.mediaType && p.mediaGrad) {
      return (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 260, background: p.mediaGrad, boxShadow: `inset 0 0 0 1px ${HL}`, marginBottom: 12 }}>
          {OVERLAY}
        </div>
      );
    }
    if (p.imageUrl) {
      return (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", maxHeight: 280, boxShadow: `inset 0 0 0 1px ${HL}`, marginBottom: 12 }}>
          <img loading="eager" decoding="async" src={p.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {OVERLAY}
        </div>
      );
    }
    if (p.coverUrl) {
      return (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", maxHeight: 280, boxShadow: `inset 0 0 0 1px ${HL}`, marginBottom: 12 }}>
          <img loading="eager" decoding="async" src={p.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {OVERLAY}
        </div>
      );
    }
    return null;
  }

  /* track player — clean mini player */
  function renderTrack() {
    const fmtDur = (d) => { if (!d) return null; if (typeof d === "string" && d.includes(":")) return d; const s = typeof d === "number" ? d : parseInt(d, 10); return isNaN(s) ? null : `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; };
    const trk = p.track ?? (p.audioUrl ? { tt: p.audioName ? p.audioName.replace(/\.[^.]+$/, "") : "음원", ts: fmtDur(p.audioDuration), grad: p.avBg } : null);
    if (!trk) return null;
    return (
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 14px 12px", padding: 10, borderRadius: 12, background: "#18181B", boxShadow: `inset 0 0 0 1px ${HL}`, overflow: "hidden", minWidth: 0, width: "auto", maxWidth: "100%" }}>
        <div style={{ width: 42, height: 42, borderRadius: 8, flexShrink: 0, background: "linear-gradient(160deg,#ff2d55 0%,#fc3c44 60%,#c8162a 100%)", display: "grid", placeItems: "center", boxShadow: `inset 0 0 0 1px ${HL}` }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M12 3v11.26A3.5 3.5 0 1 0 14 17V8h4.5V3H12z"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.015em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff" }}>{trk.tt}</div>
          <div style={{ fontSize: 12, color: FG3, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{trk.ts}</div>
        </div>
        <button
          onClick={e => {
            e.stopPropagation();
            if (!p.audioUrl) return;
            if (!audioRef.current) audioRef.current = new Audio(p.audioUrl);
            if (isPlaying) {
              audioRef.current.pause();
              setIsPlaying(false);
            } else {
              audioRef.current.play();
              setIsPlaying(true);
              audioRef.current.onended = () => setIsPlaying(false);
            }
          }}
          style={{ all: "unset", width: 36, height: 36, borderRadius: 999, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, background: R, color: "#fff", transition: `filter ${DUR}, transform 120ms` }}
          onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
          onMouseLeave={e => e.currentTarget.style.filter = "none"}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, marginLeft: isPlaying ? 0 : 2 }}>
            {isPlaying
              ? <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>
              : <polygon points="6 4 20 12 6 20 6 4"/>
            }
          </svg>
        </button>
      </div>
    );
  }

  /* action button */
  const ActBtn = ({ type, count, active, onClick: handleClick }) => {
    const [hv, setHv] = useState(false);
    const colors = {
      reply:    { h: BLUE,  bg: "rgba(86,168,255,0.12)"  },
      rt:       { h: POS,   bg: "rgba(94,230,168,0.12)"  },
      like:     { h: R,     bg: "rgba(255,90,77,0.12)"   },
      view:     { h: LIME,  bg: "rgba(198,242,78,0.12)"  },
      bookmark: { h: "rgba(255,255,255,0.9)", bg: "rgba(255,255,255,0.08)" },
      share:    { h: "rgba(255,255,255,0.9)", bg: "rgba(255,255,255,0.08)" },
    };
    const c = colors[type] ?? colors.reply;
    const isIcon = type === "bookmark" || type === "share";
    const icon = type === "reply" ? ICO.reply : type === "rt" ? ICO.rt : type === "like" ? (active ? ICO.likeOn : ICO.like) : type === "view" ? ICO.view : type === "bookmark" ? ICO.bookmark : ICO.share;
    return (
      <button
        onClick={e => { e.stopPropagation(); handleClick?.(e); }}
        onMouseEnter={() => setHv(true)}
        onMouseLeave={() => setHv(false)}
        style={{
          all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
          height: 32, padding: isIcon ? "0" : "0 7px",
          ...(isIcon && { width: 32, justifyContent: "center" }),
          borderRadius: 999, fontSize: 13, fontVariantNumeric: "tabular-nums",
          color: active ? R : (hv ? (type === "like" ? c.h : "#fff") : "rgba(255,255,255,0.72)"),
          background: hv ? (type === "like" ? c.bg : "rgba(255,255,255,0.06)") : "transparent",
          transition: `color ${DUR}, background ${DUR}`,
        }}
      >
        {icon}{count != null && <span>{fmtViewCount(count)}</span>}
      </button>
    );
  };

  return (
    <>
      <article
        ref={cardRef}
        onClick={() => !p.isDummy && p.id && onNavigate?.(`/post/${p.id}`)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: "100%",
          background: "#0E0E10",
          border: `1px solid ${hov ? "rgba(255,255,255,0.14)" : HL}`,
          borderRadius: 18,
          overflow: "hidden",
          position: "relative",
          cursor: p.isDummy || !p.id ? "default" : "pointer",
          transform: hov ? "translateY(-2px)" : "translateY(0)",
          transition: `border-color ${DUR}, transform ${DUR} cubic-bezier(0.32,0.72,0,1)`,
        }}
      >
        {/* Header + text */}
        <div style={{ padding: "12px 14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999, overflow: "hidden", flexShrink: 0,
              background: p.avBg, boxShadow: `inset 0 0 0 1px ${HL}`,
              display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, color: "#fff",
            }}>
              {p.avatarUrl ? <img loading="eager" decoding="async" src={p.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.letter}
            </div>
            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.015em", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name}{p.vrf && VF_BADGE}
              </div>
              <div style={{ fontSize: 12, color: FG3, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.handle} · {displayTime}
              </div>
            </div>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button ref={menuBtnRef} onClick={e => {
                  e.stopPropagation();
                  const r = menuBtnRef.current?.getBoundingClientRect();
                  if (r) setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
                  setMoreOpen(o => !o);
                }}
                style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", color: FG3, transition: `background ${DUR}, color ${DUR}` }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = FG3; }}
              >{ICO.menu}</button>
              {moreOpen && createPortal(
                <div ref={menuPopRef} onClick={e => e.stopPropagation()}
                  style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999, background: "#1c1c1e", borderRadius: 14, border: `1px solid ${HL}`, padding: 4, minWidth: 160, boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
                  {mine ? (
                    <>
                      <div onClick={() => { setMoreOpen(false); onEdit?.(); }}
                        style={{ padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                        {t("comment.edit")}
                      </div>
                      <div style={{ height: 1, background: HL, margin: "4px 0" }} />
                      <div onClick={() => { setMoreOpen(false); onDelete?.(); }}
                        style={{ padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500, color: R, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,90,77,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        {t("comment.delete")}
                      </div>
                    </>
                  ) : (
                    <>
                      {!isAdminPost(p) && (<>
                      <div onClick={async () => {
                        setMoreOpen(false);
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.user || !p.author_id) return;
                        const myId = session.user.id;
                        if (isFollowing) {
                          setIsFollowing(false);
                          await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", p.author_id);
                          showToast(ml("unfollowedHandle", { handle: p.handle }), "info", async () => {
                            setIsFollowing(true);
                            await supabase.from("follows").insert({ follower_id: myId, following_id: p.author_id });
                          }, "user-minus");
                        } else {
                          setIsFollowing(true);
                          await supabase.from("follows").insert({ follower_id: myId, following_id: p.author_id });
                          showToast(ml("followedHandle", { handle: p.handle }), "success", async () => {
                            setIsFollowing(false);
                            await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", p.author_id);
                          }, "user-plus");
                        }
                      }}
                        style={{ padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        {isFollowing
                          ? (ml("unfollowHandle", { handle: p.handle }))
                          : (ml("followHandle", { handle: p.handle }))}
                      </div>
                      <div style={{ height: 1, background: HL, margin: "4px 0" }} />
                      </>)}
                      <div onClick={() => { setMoreOpen(false); setReportOpen(true); }}
                        style={{ padding: "10px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500, color: R, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,90,77,0.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                        {t("chat.reportPost")}
                      </div>
                    </>
                  )}
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Title + body */}
          {dTitle && (
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.2, color: "#fff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>
              {dTitle}
            </h3>
          )}
          {dText && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "keep-all" }}>
              {dText}
            </p>
          )}
          {p.linkUrl && (
            <div style={{ margin: "0 0 12px" }}>
              <LinkPill url={p.linkUrl} />
            </div>
          )}
        </div>

        {/* Media */}
        {(p.grid?.length || p.mediaType) && (
          <div style={{ margin: "10px 14px 0" }}>{renderMedia()}</div>
        )}
        {(p.imageUrl || p.coverUrl) && !p.mediaType && !p.grid?.length && (
          <div style={{ margin: "14px 14px 0" }}>{renderMedia()}</div>
        )}

        {/* Track */}
        {renderTrack()}

        {/* Tags */}
        {p.tags?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "0 14px 8px" }}>
            {p.tags.map(([tag, dot], i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 25, padding: "0 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: "-0.015em", color: "rgba(255,255,255,0.72)", background: ELEV, boxShadow: `inset 0 0 0 1px ${HL}`, whiteSpace: "nowrap" }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, flexShrink: 0, background: dot === "lime" ? LIME : MAG }} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "4px 10px 4px", marginTop: 2 }} onClick={e => e.stopPropagation()}>
          <ActBtn type="reply" count={p.cmts}    onClick={() => !p.isDummy && p.id && onNavigate?.(`/post/${p.id}`)} />
          <ActBtn type="like"  count={likeCount} active={liked} onClick={toggleLike} />
          <ActBtn type="share" onClick={() => onShare?.(p)} />
        </div>
      </article>

      {/* Report modal */}
      {reportOpen && createPortal(
        <div onClick={() => setReportOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 400, background: "#141414", borderRadius: 20, border: `1px solid ${HL}`, padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>{t("chat.reportPost")}</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: FG3, display: "block", marginBottom: 8 }}>{t("chat.reportType")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {t("chat.reportCategories", { returnObjects: true }).map((cat, i) => (
                  <button key={i} onClick={() => setReportCategory(i)}
                    style={{ padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: reportCategory === i ? R : "rgba(255,255,255,0.08)", color: reportCategory === i ? "#fff" : "rgba(255,255,255,0.6)", transition: "all 150ms" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: FG3, display: "block", marginBottom: 8 }}>{t("chat.reportDetail")}</label>
              <textarea value={reportContent} onChange={e => setReportContent(e.target.value)} rows={4}
                placeholder={t("chat.reportPlaceholder")}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setReportOpen(false)}
                style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {t("chat.cancel")}
              </button>
              <button disabled={reportSubmitting || !reportContent.trim()}
                onClick={async () => {
                  setReportSubmitting(true);
                  const { data: { session } } = await supabase.auth.getSession();
                  await supabase.from("reports").insert({ type: "report", category: t("chat.reportCategories", { returnObjects: true })[reportCategory], content: reportContent.trim(), target_type: "post", target_id: p.id, reporter_id: session?.user?.id ?? null });
                  setReportSubmitting(false); setReportOpen(false); setReportContent("");
                }}
                style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: reportContent.trim() ? R : "rgba(255,90,77,0.3)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: reportContent.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                {reportSubmitting ? t("chat.reporting") : t("chat.reportSubmit")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ── FILTER_CATS ── */
const FILTER_CATS = [
  { label: "전체", cat: null },
  { label: "보컬", cat: "VOCAL" },
  { label: "프로듀서", cat: "PRODUCER" },
  { label: "작사·작곡", cat: "LYRIC" },
  { label: "피처링", cat: "FEATURING" },
  { label: "믹싱·마스터링", cat: "MIXING/MASTERING" },
  { label: "세션", cat: "SESSION" },
];

/* ── Page ── */
export default function CollabFeed() {
  const { state } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [dbPosts, setDbPosts]         = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [activeTab, setActiveTab]     = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(state?.filter ?? null);
  const [modalOpen, setModalOpen]     = useState(false);
  const [sharePost, setSharePost]     = useState(null);
  const [myId, setMyId]               = useState(null);
  const [editPost, setEditPost]       = useState(null);
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const navigate = useNavigate();
  const pad = sidebarOpen ? 290 : 140;

  const TABS = [
    { key: "latest",    label: ml("k137")    },
    { key: "popular",   label: ml("k138")   },
    { key: "following", label: ml("k027") },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setMyId(session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    setFeedLoading(true);
    async function load() {
      if (activeTab === "latest") {
        const { data } = await supabase.from("posts")
          .select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)")
          .order("created_at", { ascending: false }).limit(50);
        setDbPosts((data ?? []).map(mapDbPost));
      } else if (activeTab === "popular") {
        const { data: likeRows } = await supabase.from("likes").select("post_id").not("post_id", "is", null);
        const likeMap = {};
        (likeRows ?? []).forEach(r => { if (r.post_id) likeMap[r.post_id] = (likeMap[r.post_id] ?? 0) + 1; });
        const topIds = Object.entries(likeMap).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([id]) => id);
        if (!topIds.length) { setDbPosts([]); setFeedLoading(false); return; }
        const { data } = await supabase.from("posts")
          .select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)").in("id", topIds);
        const byId = {};
        (data ?? []).forEach(p => { byId[p.id] = p; });
        setDbPosts(topIds.map(id => byId[id]).filter(Boolean).map(mapDbPost));
      } else if (activeTab === "following") {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setDbPosts([]); setFeedLoading(false); return; }
        const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", session.user.id);
        const ids = (follows ?? []).map(f => f.following_id);
        if (!ids.length) { setDbPosts([]); setFeedLoading(false); return; }
        const { data } = await supabase.from("posts")
          .select("*, profiles!posts_author_id_fkey(username, handle, avatar_url)")
          .in("author_id", ids).order("created_at", { ascending: false }).limit(50);
        setDbPosts((data ?? []).map(mapDbPost));
      }
      setFeedLoading(false);
    }
    load();
  }, [activeTab]);

  const filtered = searchQuery.trim()
    ? dbPosts.filter(p => {
        const q = searchQuery.toLowerCase();
        return p.title?.toLowerCase().includes(q) || p.text?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q);
      })
    : dbPosts;

  /* merge dummy + real posts, alternate between columns */
  const allPosts = [...DUMMY_POSTS, ...filtered];
  const leftPosts  = allPosts.filter((_, i) => i % 2 === 0);
  const rightPosts = allPosts.filter((_, i) => i % 2 !== 0);

  const commonCardProps = (p) => ({
    onNavigate: navigate,
    onShare: setSharePost,
    isMe: !!(myId && myId === p.author_id),
    onEdit: p.isDummy || !p.id ? undefined : () => setEditPost(p),
    onDelete: p.isDummy || !p.id ? undefined : async () => {
      await supabase.from("posts").delete().eq("id", p.id);
      setDbPosts(prev => prev.filter(post => post.id !== p.id));
    },
  });

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "#000000", display: "flex", flexDirection: "column" }}>
      <style>{`
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 999px; border: 3px solid transparent; background-clip: content-box; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); background-clip: content-box; }
        .cf-tab { all: unset; cursor: pointer; flex: 1; text-align: center; padding: 18px 0 16px; position: relative; font-size: 14px; font-weight: 700; letter-spacing: -0.015em; color: rgba(255,255,255,0.44); transition: color 240ms, background 240ms; }
        .cf-tab:hover { color: #fff; background: rgba(255,255,255,0.04); }
        .cf-tab.on { color: #fff; }
        .cf-tab::after { content: ""; position: absolute; left: 50%; transform: translateX(-50%) scaleX(0); bottom: -1px; width: 56px; height: 3.5px; border-radius: 3px; background: ${R}; transition: transform 240ms cubic-bezier(0.32,0.72,0,1); }
        .cf-tab.on::after { transform: translateX(-50%) scaleX(1); }
      `}</style>

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div style={{ marginLeft: pad, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", transition: "margin-left 600ms cubic-bezier(0.16,1,0.3,1)" }}>
        {/* Header */}
        <header style={{ flexShrink: 0, padding: "22px 40px 40px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
            {ml("k104")}
          </h1>
          <label style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 16px", borderRadius: 999, flex: 1, maxWidth: 500, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", cursor: "text" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 15 }}
              placeholder={lang === "ko" ? "제목, 내용, 아티스트 검색" : "Search"}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: FG3, display: "flex", padding: 0, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </label>
          <button onClick={() => setModalOpen(true)}
            style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 22px", cursor: "pointer", borderRadius: 999, background: R, color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", boxShadow: "0 10px 24px -8px rgba(255,90,77,0.5)", whiteSpace: "nowrap", transition: `background ${DUR}` }}
            onMouseEnter={e => e.currentTarget.style.background = "#FF6B61"}
            onMouseLeave={e => e.currentTarget.style.background = R}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {ICO.plus}{lang === "ko" ? "공고 작성" : "Post listing"}
          </button>
        </header>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <nav style={{
            flexShrink: 0, display: "flex",
            background: "#000000",
            borderBottom: `1px solid ${HL}`,
            zIndex: 20,
          }}>
            {TABS.map(({ key, label }) => (
              <button key={key} className={`cf-tab${activeTab === key ? " on" : ""}`} onClick={() => setActiveTab(key)}>
                {label}
              </button>
            ))}
          </nav>

          {feedLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${HL}`, borderTopColor: R, animation: "spin 0.8s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
              <div style={{ overflowY: "auto", overscrollBehavior: "contain", borderRight: `1px solid ${HL}`, scrollbarWidth: "thin", padding: "12px 12px 0", minWidth: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {leftPosts.map((p, i) => (
                    <PostCard key={p.id ?? `l${i}`} p={p} idx={i} {...commonCardProps(p)} />
                  ))}
                </div>
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.24)", fontSize: 13, padding: "30px 0" }}>
                  — {lang === "ko" ? "모든 공고를 확인했어요" : "You've seen all listings"} —
                </div>
              </div>
              <div style={{ overflowY: "auto", overscrollBehavior: "contain", scrollbarWidth: "thin", padding: "12px 12px 0", minWidth: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rightPosts.map((p, i) => (
                    <PostCard key={p.id ?? `r${i}`} p={p} idx={i} {...commonCardProps(p)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewListingModal
        open={modalOpen || !!editPost}
        onClose={() => { setModalOpen(false); setEditPost(null); }}
        editData={editPost}
        onSaved={editPost ? (fresh) => {
          if (!fresh?.id) return;
          setDbPosts(prev => prev.map(p => p.id === fresh.id ? mapDbPost(fresh) : p));
        } : undefined}
      />
      <ShareModal
        isOpen={!!sharePost}
        onClose={() => setSharePost(null)}
        shareData={{
          type: "post",
          postId: sharePost?.id,
          title: sharePost?.title,
          text: sharePost?.text,
          category: sharePost?.cat,
          catColor: sharePost?.catColor,
          author: sharePost?.name,
          avatarUrl: sharePost?.avatarUrl,
          time: sharePost?.time,
          imageUrl: sharePost?.imageUrl ?? null,
          audioUrl: sharePost?.audioUrl ?? null,
          audioName: sharePost?.audioName ?? null,
        }}
      />
    </div>
  );
}
