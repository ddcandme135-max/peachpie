import { useState, useRef, useEffect } from "react";
import { CDPlayer } from "./CollabFeed";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MobileDock from "../components/MobileDock";
import { useIsMobile } from "../lib/useIsMobile";
import AttachMenu from "../components/AttachMenu";
import { Plus, Smile, Mic, Send, X, Paperclip, PencilLine, CornerUpLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LangContext";
import { ably } from "../lib/ably";
import { ml } from "../lib/ml";
import { translateAdminText } from "../lib/adminPostI18n";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "900ms";

// 삭제된 관리자 시스템 메시지 발신자 — 남아있는 메시지를 대화 목록에서 숨김
const LEGACY_SYSTEM_SENDER_ID = "aace8d83-2462-4c0e-8cbb-253d535001e0";

const AV_GRADS = {
  gA: "linear-gradient(135deg,#312e81,#0c0a1f)",
  gB: "linear-gradient(135deg,#7c2d12,#1c0a05)",
  gC: "linear-gradient(135deg,#134e4a,#042f2e)",
  gD: "linear-gradient(135deg,#831843,#1f0815)",
  gE: "linear-gradient(135deg,#4c1d95,#1e1b4b)",
  gF: "linear-gradient(135deg,#be185d,#4c0519)",
  me: "linear-gradient(135deg,#1a0f1f,#2a1a30)",
  g1: "linear-gradient(135deg,#1f2937,#0f172a)",
  g2: "linear-gradient(135deg,#4c1d95,#831843)",
  g3: "linear-gradient(135deg,#0e7490,#164e63)",
};
const AV_KEYS = Object.keys(AV_GRADS);

function Spinner({ size = 32, opacity = 0.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${opacity})`} strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M12 3a9 9 0 0 1 9 9">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function UserIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(255,255,255,0.45)">
      <path d="M12 12c2.7 0 5-2.2 5-5s-2.3-5-5-5-5 2.2-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
    </svg>
  );
}

function Av({ av, size = 56, online = false, avatarUrl = null }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: AV_GRADS[av] || AV_GRADS.gA, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {avatarUrl ? (
          <img loading="eager" decoding="async" src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <UserIcon size={size * 0.52} />
        )}
      </div>
      {online && <div style={{ position: "absolute", right: 1, bottom: 1, width: 12, height: 12, borderRadius: "50%", background: "#28C840", border: "2px solid #000000" }} />}
    </div>
  );
}

function IconBtn({ children, size = 38, onClick }) {
  return (
    <button onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center", background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
      {children}
    </button>
  );
}

const NEW_AV_CYCLE = ["g1", "g2", "g3", "gA", "gB", "gC"];

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
const DEFAULT_POS_COLOR = "#9E81F6";

const SHARE_BADGE = {
  post:    { icon: "📢", label: "공고",          color: "#34C759", bg: "rgba(52,199,89,0.12)" },
  project: { icon: "🎵", label: "프로젝트",      color: "#FC3C44", bg: "rgba(252,60,68,0.12)" },
  collabo: { icon: "🤝", label: "협업 프로젝트",  color: "#FC3C44", bg: "rgba(252,60,68,0.12)" },
  song:    { icon: "🎧", label: "음원",          color: "#5856D6", bg: "rgba(88,86,214,0.12)" },
  track:   { icon: "🎧", label: "음원",          color: "#5856D6", bg: "rgba(88,86,214,0.12)" },
  profile: { icon: "👤", label: "아티스트 프로필", color: "#FF9F0A", bg: "rgba(255,159,10,0.12)" },
};

const SYSTEM_MSG_KEYS = ["welcome", "beta_update", "collab_feed", "feedback_request", "announcement"];

function parseContent(content) {
  if (!content) return { type: "text", text: content };
  if (content.startsWith("{")) {
    try {
      const p = JSON.parse(content);
      if (p.type === "system") return p;
      if (p.type === "post" || p.type === "track" || p.type === "project" || p.type === "song" || p.type === "collabo" || p.type === "profile" || p.type === "text" || p.type === "reply") return p;
    } catch (e) {}
  }
  if (SYSTEM_MSG_KEYS.includes(content.trim())) return { type: "system", key: content.trim() };
  if (content.includes("/chat-images/")) return { type: "image", imageUrl: content };
  if (content.includes("/chat-files/"))  return { type: "file", fileUrl: content, fileName: content.split("/").pop() };
  return { type: "text", text: content };
}

function toPreviewText(content) {
  if (!content) return content;

  if (content?.includes("/chat-images/")) return "Sent a Photo.";
  if (content?.includes("/chat-files/")) return "📎";

  if (content.startsWith("{")) {
    try {
      const p = JSON.parse(content);

      if (p.type === "system") return "📢";

      if (p.type === "track" || p.type === "song") {
        return "Shared Songs.";
      }

      if (p.type === "project" || p.type === "collabo") {
        return "Shared Projects.";
      }

      if (p.type === "post") {
        return "Shared Post.";
      }

      if (p.type === "profile") {
        return "Sent a Profile.";
      }

      if (p.type === "reply") {
        return p.text ?? "";
      }

    } catch (e) {}
  }

  return content;
}

const formatDividerTime = (dateString, lang = "ko") => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const isEn = lang !== "ko" && lang !== "ja";
  return new Intl.DateTimeFormat(lang, {
    month: isEn ? "long" : "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

// 같은 방향 + 2분 이내 연속 메시지를 그룹으로 묶는다.
// created_at 없는 메시지는 항상 새 그룹 시작으로 처리.
function computeGroups(msgs) {
  const TWO_MIN = 2 * 60 * 1000;
  const TWO_HOUR = 2 * 60 * 60 * 1000;

  return msgs.map((msg, i) => {
    const prev = msgs[i - 1];
    const next = msgs[i + 1];

    const linkedToPrev =
      !!prev &&
      prev.dir === msg.dir &&
      !!msg.created_at &&
      !!prev.created_at &&
      new Date(msg.created_at) - new Date(prev.created_at) < TWO_MIN;

    const linkedToNext =
      !!next &&
      next.dir === msg.dir &&
      !!next.created_at &&
      !!msg.created_at &&
      new Date(next.created_at) - new Date(msg.created_at) < TWO_MIN;

    const showTimeDivider =
      !prev ||
      !msg.created_at ||
      !prev.created_at ||
      new Date(msg.created_at) - new Date(prev.created_at) > TWO_HOUR ||
      new Date(msg.created_at).toDateString() !==
        new Date(prev.created_at).toDateString();

    return {
      ...msg,
      isFirst: !linkedToPrev,
      isLast: !linkedToNext,
      showTimeDivider,
    };
  });
}

// 그룹 내 위치에 따라 버블 모서리 반경 결정
function bubbleRadius(dir, isFirst, isLast) {
  const R = 18, S = 4;
  if (dir === "in") {
    return {
      borderTopLeftRadius:     isFirst ? R : S,
      borderTopRightRadius:    R,
      borderBottomRightRadius: R,
      borderBottomLeftRadius:  isLast  ? R : S,
    };
  }
  return {
    borderTopLeftRadius:     R,
    borderTopRightRadius:    isFirst ? R : S,
    borderBottomRightRadius: isLast  ? R : S,
    borderBottomLeftRadius:  R,
  };
}

export default function Chat() {
  const { refreshUnreadCount } = useApp();
  const { showToast } = useToast();
  const { lang } = useLang();
  const { t, i18n } = useTranslation();

  function getTimeAgo(isoString) {
    if (!isoString) return "";
    const dt = new Date(isoString);
    const diff = Date.now() - dt.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("time.justNow");
    if (min < 60) return t("time.minutesAgo", { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t("time.hoursAgo", { n: h });
    const d = Math.floor(h / 24);
    if (d === 1) return t("time.yesterday");
    if (d < 7) return t("time.daysAgo", { n: d });
    return new Intl.DateTimeFormat(i18n.language, { month: "long", day: "numeric" }).format(dt);
  }
  const [isOpen, setIsOpen]           = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const isMobile = useIsMobile();
  const [activeId, setActiveId]       = useState(null);
  const [convos, setConvos]           = useState([]);
  const [messagesMap, setMessagesMap] = useState({});
  const [input, setInput]             = useState("");
  const [attachOpen, setAttachOpen]   = useState(false);
  const [convosLoading, setConvosLoading]     = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [viewingImage, setViewingImage]       = useState(null);
  const [composeOpen, setComposeOpen]         = useState(false);
  const [chatMenuOpen, setChatMenuOpen]       = useState(false);
  const [deleteChatConfirm, setDeleteChatConfirm] = useState(false);
  const [searchOpen, setSearchOpen]           = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [searchResults, setSearchResults]     = useState([]);
  const [searchIndex, setSearchIndex]         = useState(0);
  const [reportOpen, setReportOpen]           = useState(false);
  const [reportContent, setReportContent]     = useState("");
  const [reportCategory, setReportCategory]   = useState(0);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [composeQuery, setComposeQuery]       = useState("");
  const [composeResults, setComposeResults]   = useState([]);
  const [composeSearching, setComposeSearching] = useState(false);
  const [defaultUsers, setDefaultUsers]       = useState([]);
  const [convSearch, setConvSearch]           = useState("");
  const [hoveredMsgId, setHoveredMsgId]       = useState(null);
  const [editingId, setEditingId]             = useState(null);
  const [editingText, setEditingText]         = useState("");
  const [replyingTo, setReplyingTo]           = useState(null);

  const [myId, setMyId]               = useState(null);
  const bodyRef              = useRef(null);
  const editInputRef         = useRef(null);
  const triggerRef           = useRef(null);
  const menuBtnRef           = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const inputRef             = useRef(null);
  const activeIdRef          = useRef(null);
  const myIdRef              = useRef(null);
  const msgChannelRef        = useRef(null);
  const seenMsgIdsRef        = useRef(new Set());
  const reconnectTimerRef    = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isSendingRef         = useRef(false);
  const convosRef            = useRef([]);  // stale closure 방지
  const lastSeenAtRef        = useRef(null);
  const heartbeatRef         = useRef(null);
  const ablyChannelsRef      = useRef({});
  const rtChannelsRef        = useRef({});
  const hideHoverTimerRef    = useRef(null);
  const subscribeToConvRef   = useRef(null);
  const isComposing          = useRef(false);

  const navigate   = useNavigate();
  const { state: navState } = useLocation();
  const pad = isOpen ? 248 : 110;

  const messages = messagesMap[activeId] || [];
  const active   = convos.find(c => c.id === activeId);

  // convos 변경될 때마다 ref 동기화
  useEffect(() => { convosRef.current = convos; }, [convos]);

  useEffect(() => {
    if (!bodyRef.current) return;
    const el = bodyRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!messagesLoading && bodyRef.current)
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messagesLoading]);

  useEffect(() => {
    if (bodyRef.current)
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [activeId]);

  useEffect(() => {
    if (!activeId || !myId) return;
    supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", myId)
      .eq("conversation_id", activeId)
      .eq("is_read", false)
      .then(({ error }) => {
        if (!error) {
          setConvos(prev => prev.map(c => c.id === activeId ? { ...c, unread: false } : c));
          refreshUnreadCount();
        }
      });
  }, [activeId, myId]);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      @keyframes slideUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes msgIn      { from{opacity:0;transform:translateY(6px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
      @keyframes imgScale   { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
      @keyframes actionsIn  { from{opacity:0;transform:translateX(4px)} to{opacity:1;transform:translateX(0)} }
    `;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    if (editingId === null || !editInputRef.current) return;
    const el = editInputRef.current;
    el.textContent = editingText;
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  // editingText는 editingId 세팅 시점에 고정되므로 deps에서 의도적으로 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  async function markConvoAsRead(convId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", convId)
      .eq("receiver_id", session.user.id)
      .eq("is_read", false);
  }

  function openConvo(id) {
    setActiveId(id);
    setConvos(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
    setTimeout(() => inputRef.current?.focus(), 50);
    markConvoAsRead(id).then(() => refreshUnreadCount());
  }

  function addMessage(id, msg) {
    setMessagesMap(prev => ({ ...prev, [id]: [...(prev[id] || []), msg] }));
  }

  function getConvId(myId, convo) {
    if (convo?.conversationId) return convo.conversationId;
    const partnerId = convo?.supabaseId ?? null;
    if (partnerId) return [myId, partnerId].sort().join("_");
    return `${myId}_mock_${convo?.id}`;
  }


  function updateConvoPreview(id, text, time, isoTimestamp, reorder = true, lastSentByMe) {
    const sortAt = isoTimestamp ?? new Date().toISOString();
    setConvos(prev => {
      const updated = prev.map(c => {
        if (c.id !== id) return c;
        const next = { ...c, preview: text, time, _sortAt: sortAt };
        if (lastSentByMe !== undefined) next.lastSentByMe = lastSentByMe;
        return next;
      });
      if (!reorder) return updated;
      const idx = updated.findIndex(c => c.id === id);
      if (idx <= 0) return updated;
      return [updated[idx], ...updated.slice(0, idx), ...updated.slice(idx + 1)];
    });
  }

  useEffect(() => {
    async function loadConversations() {
      setConvosLoading(true);
      try {

      // Safari: localStorage 준비 전에 getSession()이 null을 반환할 수 있어 재시도
      let session = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) { session = data.session; break; }
        if (attempt < 3) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
      if (!session?.user) { setConvosLoading(false); return; }

      const myId = session.user.id;
      myIdRef.current = myId;
      setMyId(myId);

      const { data: msgs, error } = await supabase
        .from("messages")
        .select("conversation_id, sender_id, receiver_id, content, created_at")
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order("created_at", { ascending: false });

      if (error) { console.log("[Chat] 대화 목록 로드 실패:", error.message); setConvosLoading(false); return; }

      let loaded = [];

      if (msgs?.length) {
        const latestByConvId = {};
        for (const msg of msgs) {
          if (!latestByConvId[msg.conversation_id]) latestByConvId[msg.conversation_id] = msg;
        }
        const convEntries = Object.values(latestByConvId);

        const partnerIds = [...new Set(
          convEntries.map(m => {
            const pid = m.sender_id === myId ? m.receiver_id : m.sender_id;
            if (pid) return pid;
            // receiver_id가 null인 경우(통화 기록 등 엣지케이스) conversation_id에서 추출
            const parts = (m.conversation_id ?? "").split("_");
            return parts.length === 2 ? (parts.find(p => p !== myId) ?? null) : null;
          }).filter(Boolean)
        )];
        let profileMap = {};
        if (partnerIds.length) {
          // Safari에서 쿼리가 간헐적으로 실패하는 경우 재시도
          let profiles = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const { data, error: profErr } = await supabase
              .from("profiles")
              .select("id, username, handle, avatar_url")
              .in("id", partnerIds);
            console.log("[Chat] profiles 조회 결과:", data, profErr);
            if (data?.length) { profiles = data; break; }
            if (!profErr) break; // 에러 없이 빈 배열이면 재시도 불필요
            if (attempt < 2) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
          }
          profiles?.forEach(p => { profileMap[p.id] = p; });
        }

        loaded = convEntries
          .map((msg, i) => {
            const directPid = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
            const partnerId = directPid ?? (() => {
              const parts = (msg.conversation_id ?? "").split("_");
              return parts.length === 2 ? (parts.find(p => p !== myId) ?? null) : null;
            })();
            const profile   = profileMap[partnerId];
            let preview = "";
            try { preview = toPreviewText(msg.content); } catch (e) {}
            const convId = msg.conversation_id
              ?? (partnerId ? [myId, partnerId].sort().join("_") : null);
            return {
              id:             convId,
              conversationId: convId,
              name:           profile?.username ?? profile?.handle ?? t("chat.unknown"),
              handle:         profile?.handle ? `@${profile.handle}` : null,
              av:             AV_KEYS[i % AV_KEYS.length],
              supabaseId:     partnerId,
              avatarUrl:      profile?.avatar_url ?? null,
              preview,
              time:           msg.created_at,
              _sortAt:        msg.created_at,
              lastSentByMe:   msg.sender_id === myId,
            };
          })
          .filter(c => c.supabaseId !== LEGACY_SYSTEM_SENDER_ID)
          .sort((a, b) => new Date(b._sortAt) - new Date(a._sortAt));

        if (loaded.length) {
          const { data: unreadMsgs } = await supabase
            .from("messages")
            .select("conversation_id")
            .eq("receiver_id", myId)
            .eq("is_read", false);
          const unreadSet = new Set(unreadMsgs?.map(m => m.conversation_id) ?? []);
          loaded = loaded.map(c => ({ ...c, unread: unreadSet.has(c.conversationId) }));
        }
      }

      const finalActiveId = loaded.length ? loaded[0].id : null;

      setConvos(loaded.map(c =>
        finalActiveId !== null && c.id === finalActiveId ? { ...c, unread: false } : c
      ));
      if (finalActiveId !== null) {
        setActiveId(finalActiveId);
        supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", finalActiveId)
          .eq("receiver_id", myId)
          .eq("is_read", false)
          .then(() => refreshUnreadCount());
      }
      setConvosLoading(false);
      } catch (err) {
        console.error("[Chat] loadConversations 오류:", err);
        setConvosLoading(false);
      }
    }

    loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // navState.userId → convosLoading 완료 후 placeholder 생성 or 기존 대화 선택
  useEffect(() => {
    if (convosLoading) return;
    if (!navState?.userId) return;

    const myId = myIdRef.current;
    if (!myId) return;

    console.log("navState 확인:", navState);

    const partnerId = navState.userId;
    const convId    = [myId, partnerId].sort().join("_");

    const existing = convosRef.current.find(c =>
      c.conversationId === convId || c.supabaseId === partnerId
    );

    if (existing) {
      setActiveId(existing.id);
    } else {
      const placeholder = {
        id:             convId,
        conversationId: convId,
        name:           navState.username ?? t("chat.unknown"),
        handle:         navState.handle ? `@${navState.handle}` : null,
        av:             AV_KEYS[convosRef.current.length % AV_KEYS.length],
        supabaseId:     partnerId,
        avatarUrl:      navState.avatarUrl ?? null,
        preview:        t("chat.startConversationPreview"),
        time:           "",
        _sortAt:        new Date().toISOString(),
      };
      console.log("placeholder 생성:", placeholder);
      setConvos(prev => [placeholder, ...prev.filter(c => c.id !== convId)]);
      setActiveId(convId);
    }
    setTimeout(() => inputRef.current?.focus(), 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convosLoading]);

  // 대화방 선택 시 메시지 로드 - convosRef 사용으로 stale closure 방지
  useEffect(() => {
    if (activeId === null) return;

    async function loadDbMessages() {
      setMessagesLoading(true);
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) { console.log("[Chat] 세션 오류:", sessionErr.message); setMessagesLoading(false); return; }
      if (!session?.user) { setMessagesLoading(false); return; }

      const myId        = session.user.id;
      const activeConvo = convosRef.current.find(c => c.id === activeId);
      const convId      = getConvId(myId, activeConvo);
      const partnerId   = activeConvo?.supabaseId ?? null;

      // conversation_id로 조회 후 없으면 sender/receiver 쌍으로 fallback
      let data, error;
      ({ data, error } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true }));

      if (!error && (!data?.length) && partnerId) {
        ({ data, error } = await supabase
          .from("messages")
          .select("id, sender_id, content, created_at")
          .or(
            `and(sender_id.eq.${partnerId},receiver_id.eq.${myId}),` +
            `and(sender_id.eq.${myId},receiver_id.eq.${partnerId})`
          )
          .order("created_at", { ascending: true }));
      }

      if (error) { console.log("[Chat] 메시지 불러오기 실패:", error.message); setMessagesLoading(false); return; }
      if (!data?.length) { setMessagesLoading(false); return; }

      const dbMsgs = data.map(m => {
        const dir    = m.sender_id === myId ? "out" : "in";
        const parsed = parseContent(m.content);
        if (parsed.type === "system") return { id: m.id, dir, systemKey: parsed.key, created_at: m.created_at };
        if (parsed.type === "image") return { id: m.id, dir, imageUrl: parsed.imageUrl, created_at: m.created_at };
        if (parsed.type === "file")  return { id: m.id, dir, fileUrl: parsed.fileUrl, fileName: parsed.fileName, created_at: m.created_at };
        if (parsed.type === "post" || parsed.type === "project")                 return { id: m.id, dir, sharedProject: parsed, created_at: m.created_at };
        if (parsed.type === "track" || parsed.type === "song" || parsed.type === "collabo") return { id: m.id, dir, sharedTrack: parsed, created_at: m.created_at };
        if (parsed.type === "profile")                                           return { id: m.id, dir, sharedProfile: parsed, created_at: m.created_at };
        if (parsed.type === "reply")  return { id: m.id, dir, text: parsed.text, replyTo: parsed.replyTo, created_at: m.created_at };
        return { id: m.id, dir, text: parsed.text ?? m.content, edited: parsed.edited ?? false, created_at: m.created_at };
      });

      data.forEach(m => seenMsgIdsRef.current.add(m.id));
      setMessagesMap(prev => ({ ...prev, [activeId]: dbMsgs }));

      const last = data[data.length - 1];
      updateConvoPreview(activeId, toPreviewText(last.created_at ? last.content : last.content), last.created_at, last.created_at, false, last.sender_id === myId);
      setMessagesLoading(false);
    }

    loadDbMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function sendFile(file) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const myId  = session.user.id;
    const tmpId = Date.now();

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${file.name.split(".").pop()}`;
    addMessage(activeId, { id: tmpId, dir: "out", fileName, uploading: true });

    const path = `${myId}/${fileName}`;
    const { error: uploadErr } = await supabase.storage.from("chat-files").upload(path, file);
    if (uploadErr) {
      console.log("[Chat] 파일 업로드 실패:", uploadErr.message);
      setMessagesMap(prev => ({ ...prev, [activeId]: (prev[activeId] || []).filter(m => m.id !== tmpId) }));
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
    const url = urlData.publicUrl;

    setMessagesMap(prev => ({
      ...prev,
      [activeId]: (prev[activeId] || []).map(m => m.id === tmpId ? { ...m, fileUrl: url, uploading: false, created_at: new Date().toISOString() } : m),
    }));

    const activeConvo  = convosRef.current.find(c => c.id === activeId);
    const convId       = getConvId(myId, activeConvo);
    const fileReceiver = activeConvo?.supabaseId ?? null;
    const { data: insertedFile } = await supabase.from("messages").insert({
      sender_id: myId, receiver_id: fileReceiver,
      content: url, conversation_id: convId,
    }).select("id, created_at").single();

    if (insertedFile) {
      try {
        const ablyCh = ably.channels.get(`conv-${convId}`);
        ablyCh.publish("message", {
          id: insertedFile.id,
          sender_id: myId,
          receiver_id: fileReceiver,
          content: url,
          conversation_id: convId,
          created_at: insertedFile.created_at,
        });
      } catch (e) {}
    }

    const now = new Date().toISOString();
    updateConvoPreview(activeId, t("chat.sentFile"), now, now, true, true);
  }

  async function sendImage(file) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const myId  = session.user.id;
    const tmpId = Date.now();

    addMessage(activeId, { id: tmpId, dir: "out", uploading: true });

    const ext  = file.name.split(".").pop() || "jpg";
    const path = `${myId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("chat-images")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadErr) {
      console.log("[Chat] 이미지 업로드 실패:", uploadErr.message);
      setMessagesMap(prev => ({ ...prev, [activeId]: (prev[activeId] || []).filter(m => m.id !== tmpId) }));
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
    const url = urlData.publicUrl;

    const activeConvo = convosRef.current.find(c => c.id === activeId);
    const convId      = getConvId(myId, activeConvo);
    const receiverId = activeConvo?.supabaseId ?? null;
    const { data: insertedMsg, error: insertErr } = await supabase.from("messages").insert({
      sender_id: myId, receiver_id: receiverId,
      content: url, conversation_id: convId,
    }).select("id, created_at").single();

    if (insertErr) {
      console.log("[Chat] 이미지 메시지 저장 실패:", insertErr.message);
      setMessagesMap(prev => ({ ...prev, [activeId]: (prev[activeId] || []).filter(m => m.id !== tmpId) }));
      return;
    }

    setMessagesMap(prev => ({
      ...prev,
      [activeId]: (prev[activeId] || []).map(m => m.id === tmpId ? { ...m, imageUrl: url, uploading: false, created_at: new Date().toISOString() } : m),
    }));

    if (insertedMsg) {
      try {
        const ablyCh = ably.channels.get(`conv-${convId}`);
        ablyCh.publish("message", {
          id: insertedMsg.id,
          sender_id: myId,
          receiver_id: receiverId,
          content: url,
          conversation_id: convId,
          created_at: insertedMsg.created_at,
        });
      } catch (e) {}
    }

    const now = new Date().toISOString();
    updateConvoPreview(activeId, "Sent a Photo.", now, now, true, true);
  }

  async function handleDeleteMsg(convId, msgId) {
    setMessagesMap(prev => ({
      ...prev,
      [convId]: (prev[convId] || []).filter(m => m.id !== msgId),
    }));
    await supabase.from("messages").delete().eq("id", msgId);

    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content, created_at, sender_id")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    try {
      ably.channels.get(`conv-${convId}`).publish("message-deleted", {
        messageId: msgId,
        conversation_id: convId,
        lastContent: lastMsg?.content ?? "",
        lastCreatedAt: lastMsg?.created_at ?? null,
        lastSenderId: lastMsg?.sender_id ?? null,
      });
    } catch (e) {}

    if (lastMsg) {
      const myId = myIdRef.current;
      updateConvoPreview(
        convId,
        toPreviewText(lastMsg.content),
        lastMsg.created_at,
        lastMsg.created_at,
        false,
        lastMsg.sender_id === myId
      );
    } else {
      updateConvoPreview(convId, "", "", null, false, false);
    }
  }

  async function handleEditSave(convId, msgId) {
    const newText = (editInputRef.current?.innerText ?? "").trim();
    if (!newText) { setEditingId(null); return; }
    const newContent = JSON.stringify({ type: "text", text: newText, edited: true });
    setMessagesMap(prev => ({
      ...prev,
      [convId]: (prev[convId] || []).map(m =>
        m.id === msgId ? { ...m, text: newText, edited: true } : m
      ),
    }));
    setEditingId(null);
    await supabase.from("messages").update({ content: newContent }).eq("id", msgId);
    try {
      ably.channels.get(`conv-${convId}`).publish("edit", { msgId, content: newContent, conversation_id: convId });
    } catch (e) {}
  }

  async function send() {
    if (!input.trim() || isSendingRef.current) return;
    isSendingRef.current = true;

    const text   = input.trim();
    const sentAt = new Date().toISOString();
    const content = replyingTo
      ? JSON.stringify({ type: "reply", replyTo: replyingTo, text })
      : text;
    const tempId = `temp_${Date.now()}`;
    addMessage(activeId, { id: tempId, dir: "out", text, replyTo: replyingTo ?? undefined, created_at: sentAt });
    updateConvoPreview(activeId, text, sentAt, sentAt, true, true);
    setInput("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.blur();
      setTimeout(() => inputRef.current?.focus(), 10);
    }
    setReplyingTo(null);

    try {
      let myId = myIdRef.current;
      if (!myId) {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr || !session?.user) return;
        myId = session.user.id;
        myIdRef.current = myId;
      }

      const activeConvo = convosRef.current.find(c => c.id === activeId);
      const receiverId  = activeConvo?.supabaseId ?? null;
      const convId      = getConvId(myId, activeConvo);

      const { data: insertedMsg, error } = await supabase
        .from("messages")
        .insert({ sender_id: myId, receiver_id: receiverId, content, conversation_id: convId })
        .select("id, created_at")
        .single();

      if (error) {
        console.log("[Chat] 메시지 저장 실패:", error.message, error);
      } else if (insertedMsg) {
        seenMsgIdsRef.current.add(insertedMsg.id);
        setMessagesMap(prev => ({
          ...prev,
          [activeId]: (prev[activeId] || []).map(m => m.id === tempId ? { ...m, id: insertedMsg.id } : m),
        }));
        try {
          const ablyCh = ably.channels.get(`conv-${convId}`);
          ablyCh.publish("message", {
            id: insertedMsg.id,
            sender_id: myId,
            receiver_id: receiverId,
            content,
            conversation_id: convId,
            created_at: insertedMsg.created_at,
          });
        } catch (e) {
          console.log("[Chat] Ably publish 실패:", e);
        }
      }
    } finally {
      isSendingRef.current = false;
    }
  }

  // Ably 메시지 구독 + Supabase backfill (visibility/focus/reconnect)
  useEffect(() => {
    let mounted = true;
    const cleanupObj = { listeners: null };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted || !session?.user) return;

      const myId = session.user.id;
      myIdRef.current = myId;
      lastSeenAtRef.current = new Date().toISOString();

      function handleIncomingMsg(msg) {
        if (seenMsgIdsRef.current.has(msg.id)) return;
        seenMsgIdsRef.current.add(msg.id);
        if (msg.created_at > (lastSeenAtRef.current ?? "")) {
          lastSeenAtRef.current = msg.created_at;
        }

        const convId   = msg.conversation_id;
        const isActive = convId === activeIdRef.current;

        const parsed = parseContent(msg.content);
        let inMsg;
        if (parsed.type === "system")     inMsg = { id: msg.id, dir: "in", systemKey: parsed.key, created_at: msg.created_at };
        else if (parsed.type === "image") inMsg = { id: msg.id, dir: "in", imageUrl: parsed.imageUrl, created_at: msg.created_at };
        else if (parsed.type === "file")  inMsg = { id: msg.id, dir: "in", fileUrl: parsed.fileUrl, fileName: parsed.fileName, created_at: msg.created_at };
        else if (parsed.type === "post" || parsed.type === "project")                 inMsg = { id: msg.id, dir: "in", sharedProject: parsed, created_at: msg.created_at };
        else if (parsed.type === "track" || parsed.type === "song" || parsed.type === "collabo") inMsg = { id: msg.id, dir: "in", sharedTrack: parsed, created_at: msg.created_at };
        else if (parsed.type === "profile")                                           inMsg = { id: msg.id, dir: "in", sharedProfile: parsed, created_at: msg.created_at };
        else if (parsed.type === "reply")  inMsg = { id: msg.id, dir: "in", text: parsed.text, replyTo: parsed.replyTo, created_at: msg.created_at };
        else                              inMsg = { id: msg.id, dir: "in", text: parsed.text ?? msg.content, edited: parsed.edited ?? false, created_at: msg.created_at };

        setMessagesMap(prev => {
          const existing = prev[convId] || [];
          if (existing.some(m => m.id === inMsg.id)) return prev;
          return { ...prev, [convId]: [...existing, inMsg] };
        });

        setConvos(prev => {
          const updated = prev.map(c =>
            (c.id === convId || c.conversationId === convId)
              ? { ...c, unread: !isActive && c.id !== activeIdRef.current && c.conversationId !== activeIdRef.current, preview: toPreviewText(msg.content), time: msg.created_at, _sortAt: msg.created_at, lastSentByMe: false }
              : c
          );
          const idx = updated.findIndex(c => c.id === convId || c.conversationId === convId);
          if (idx > 0) return [updated[idx], ...updated.slice(0, idx), ...updated.slice(idx + 1)];
          return updated;
        });

        if (isActive) {
          supabase.from("messages").update({ is_read: true }).eq("id", msg.id).eq("receiver_id", myId)
            .then(() => refreshUnreadCount());
        }
      }

      async function backfill() {
        if (!lastSeenAtRef.current) return;
        const { data } = await supabase
          .from("messages")
          .select("id, sender_id, receiver_id, content, created_at, conversation_id")
          .eq("receiver_id", myId)
          .gt("created_at", lastSeenAtRef.current)
          .order("created_at", { ascending: true });
        if (!data?.length) return;
        for (const msg of data) handleIncomingMsg(msg);
      }

      // conversation_id로 Ably 채널 구독 (중복 방지)
      function subscribeToConv(convId) {
        if (!convId || ablyChannelsRef.current[convId]) return;
        const ch = ably.channels.get(`conv-${convId}`);
        ch.subscribe("message", (ablyMsg) => {
          if (!mounted) return;
          const msg = ablyMsg.data;
          if (msg.sender_id === myId) return;
          if (msg.receiver_id !== myId) return;
          handleIncomingMsg(msg);
        });
        ch.subscribe("message-deleted", (ablyMsg) => {
          if (!mounted) return;
          const { messageId, conversation_id, lastContent, lastCreatedAt, lastSenderId } = ablyMsg.data;
          setMessagesMap(prev => ({
            ...prev,
            [conversation_id]: (prev[conversation_id] || []).filter(m => m.id !== messageId),
          }));
          if (lastCreatedAt) {
            updateConvoPreview(
              conversation_id,
              toPreviewText(lastContent),
              lastCreatedAt,
              lastCreatedAt,
              false,
              lastSenderId === myIdRef.current
            );
          } else {
            updateConvoPreview(conversation_id, "", "", null, false, false);
          }
        });
        if (!rtChannelsRef.current[convId]) {
          const rtCh = supabase.channel(`rt-delete-${convId}`)
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
              if (!mounted) return;
              const deletedId = payload.old?.id;
              if (!deletedId) return;
              setMessagesMap(prev => ({
                ...prev,
                [convId]: (prev[convId] || []).filter(m => m.id !== deletedId),
              }));
            })
            .subscribe();
          rtChannelsRef.current[convId] = rtCh;
        }
        ch.subscribe("edit", (ablyMsg) => {
          if (!mounted) return;
          const { msgId, content, conversation_id } = ablyMsg.data;
          const parsed = parseContent(content);
          setMessagesMap(prev => ({
            ...prev,
            [conversation_id]: (prev[conversation_id] || []).map(m =>
              m.id === msgId ? { ...m, text: parsed.text ?? content, edited: true } : m
            ),
          }));
        });
        ablyChannelsRef.current[convId] = ch;
      }

      subscribeToConvRef.current = subscribeToConv;
      // 이미 로드된 대화방 채널 구독
      convosRef.current.forEach(c => subscribeToConv(c.conversationId ?? c.id));

      // Ably 재연결 시 누락 메시지 backfill
      function onAblyConnected() {
        if (!mounted) return;
        backfill();
      }
      ably.connection.on("connected", onAblyConnected);

      // 10초 heartbeat backfill (Realtime 누락 빠른 복구)
      heartbeatRef.current = setInterval(() => {
        if (!mounted) return;
        backfill();
      }, 10_000);

      function onVisibilityChange() {
        if (document.visibilityState === "visible") backfill();
      }
      function onFocus() { backfill(); }

      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("focus", onFocus);

      if (!mounted) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("focus", onFocus);
        ably.connection.off("connected", onAblyConnected);
      } else {
        cleanupObj.listeners = () => {
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.removeEventListener("focus", onFocus);
          ably.connection.off("connected", onAblyConnected);
        };
      }
    });

    return () => {
      mounted = false;
      clearInterval(heartbeatRef.current);
      Object.values(ablyChannelsRef.current).forEach(ch => {
        try { ch.unsubscribe(); } catch (e) {}
      });
      ablyChannelsRef.current = {};
      Object.values(rtChannelsRef.current).forEach(ch => {
        try { supabase.removeChannel(ch); } catch (e) {}
      });
      rtChannelsRef.current = {};
      subscribeToConvRef.current = null;
      cleanupObj.listeners?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // convos 목록 변경 시 새 대화방 채널 구독
  useEffect(() => {
    convos.forEach(c => {
      const convId = c.conversationId ?? c.id;
      subscribeToConvRef.current?.(convId);
    });
  }, [convos]);

  // 컴포즈 모달 열릴 때 가입 순서대로 추천 아티스트 로드
  useEffect(() => {
    if (!composeOpen) return;
    async function loadDefaultUsers() {
      const { data: { session } } = await supabase.auth.getSession();
      const myId = session?.user?.id;
      let query = supabase
        .from("profiles")
        .select("id, username, handle, avatar_url")
        .not("username", "is", null)
        .order("created_at", { ascending: true })
        .limit(4);
      if (myId) query = query.neq("id", myId);
      const { data } = await query;
      setDefaultUsers(data ?? []);
    }
    loadDefaultUsers();
  }, [composeOpen]);

  // 1분마다 대화 리스트 시간 갱신 ("방금" → "1분" → "2분" 등)
  useEffect(() => {
    const timer = setInterval(() => {
      setConvos(prev => prev.map(c => ({ ...c, time: c._sortAt })));
    }, 60000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex", overflowX: "hidden" }}>
      {!isMobile && <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} showPlayer />}
      {isMobile && !activeId && <MobileDock />}

      {/* 채팅 메뉴 드롭다운 */}
      {chatMenuOpen && (
        <div onClick={() => setChatMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 400 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, width: 200, background: "#1c1c1e", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", padding: "4px 0", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", overflow: "hidden" }}>
            <div onClick={() => { setChatMenuOpen(false); setSearchOpen(true); }}
              style={{ padding: "11px 16px", fontSize: 14, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              {t("chat.searchMessages")}
            </div>
            <div onClick={() => { setChatMenuOpen(false); setReportOpen(true); }}
              style={{ padding: "11px 16px", fontSize: 14, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              {t("chat.reportUser")}
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
            <div onClick={() => { setChatMenuOpen(false); setDeleteChatConfirm(true); }}
              style={{ padding: "11px 16px", fontSize: 14, color: "#FC3C44", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(252,60,68,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              {t("chat.deleteChat")}
            </div>
          </div>
        </div>
      )}

      {/* 대화 삭제 확인 모달 */}
      {deleteChatConfirm && (
        <div onClick={() => setDeleteChatConfirm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 401, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 320, background: "#141414", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", padding: "28px 24px 20px", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{t("chat.deleteChatConfirm")}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 24 }}>{t("chat.deleteChatDesc")}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteChatConfirm(false)}
                style={{ flex: 1, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {t("chat.cancel")}
              </button>
              <button onClick={async () => {
                  if (!activeId) return;
                  await supabase.from("messages").delete().eq("conversation_id", activeId);
                  setDeleteChatConfirm(false);
                  setActiveId(null);
                  setConvos(prev => prev.filter(c => c.id !== activeId));
                  setMessagesMap(prev => { const n = { ...prev }; delete n[activeId]; return n; });
                  navigate("/chat");
                }}
                style={{ flex: 1, height: 44, borderRadius: 12, background: "#FC3C44", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t("chat.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신고 모달 */}
      {reportOpen && (
        <div onClick={() => setReportOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 400, background: "#141414", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", padding: 32, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>{t("chat.reportUser")}</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 8 }}>{t("chat.reportType")}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {t("chat.reportCategories", { returnObjects: true }).map((cat, idx) => (
                  <button key={idx} onClick={() => setReportCategory(idx)}
                    style={{ padding: "6px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: reportCategory === idx ? "#FC3C44" : "rgba(255,255,255,0.08)", color: reportCategory === idx ? "#fff" : "rgba(255,255,255,0.6)", transition: "all 150ms" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 8 }}>{t("chat.reportDetail")}</label>
              <textarea value={reportContent} onChange={e => setReportContent(e.target.value)} rows={4}
                placeholder={t("chat.reportPlaceholder")}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setReportOpen(false)}
                style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {t("chat.cancel")}
              </button>
              <button
                disabled={reportSubmitting || !reportContent.trim()}
                onClick={async () => {
                  setReportSubmitting(true);
                  const { data: { session } } = await supabase.auth.getSession();
                  await supabase.from("reports").insert({
                    type: "report",
                    category: t("chat.reportCategories", { returnObjects: true })[reportCategory],
                    content: reportContent.trim(),
                    target_type: "user",
                    target_id: active?.supabaseId ?? null,
                    reporter_id: session?.user?.id ?? null,
                  });
                  setReportSubmitting(false);
                  setReportOpen(false);
                  setReportContent("");
                  setReportCategory(0);
                  showToast(ml("k102"), "warn", undefined, "shield");
                }}
                style={{ flex: 1, padding: "11px 0", borderRadius: 12, background: reportContent.trim() ? "#FC3C44" : "rgba(252,60,68,0.3)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: reportContent.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                {reportSubmitting ? t("chat.reporting") : t("chat.reportSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 200ms ease both",
          }}
        >
          <button
            onClick={() => setViewingImage(null)}
            style={{
              position: "absolute", top: 20, right: 24,
              background: "rgba(255,255,255,0.12)", border: "none",
              borderRadius: "50%", width: 40, height: 40,
              display: "grid", placeItems: "center",
              cursor: "pointer", color: "#fff",
            }}
          >
            <X size={20} />
          </button>
          <img
            src={viewingImage} alt="전체화면"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              borderRadius: 12, objectFit: "contain",
              animation: "imgScale 220ms ease both",
            }}
          />
        </div>
      )}

      {/* 새 메시지 작성 모달 */}
      {composeOpen && (
        <div
          onClick={() => { setComposeOpen(false); setComposeQuery(""); setComposeResults([]); }}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: isMobile ? "#000" : "rgba(0,0,0,0.6)", backdropFilter: isMobile ? "none" : "blur(4px)",
            display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: isMobile ? "stretch" : "center",
            animation: "fadeIn 150ms ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: isMobile ? "100vw" : 420, maxWidth: isMobile ? "none" : 420, height: isMobile ? "100dvh" : "auto",
              display: "flex", flexDirection: "column",
              background: isMobile ? "#000" : "#1a1a2e",
              border: isMobile ? "none" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: isMobile ? 0 : 16, overflow: "hidden",
              boxShadow: isMobile ? "none" : "0 24px 64px rgba(0,0,0,0.8)",
              animation: isMobile ? "none" : "slideUp 200ms ease both",
            }}
          >
            {/* 모달 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "calc(env(safe-area-inset-top) + 18px) 20px 16px" : "20px 20px 16px" }}>
              <div style={{ fontSize: isMobile ? 20 : 16, fontWeight: 700, color: "#fff" }}>{t("chat.newMessage")}</div>
              <button
                onClick={() => { setComposeOpen(false); setComposeQuery(""); setComposeResults([]); }}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 검색 입력 */}
            <div style={{ padding: "0 20px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 44, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                  autoFocus
                  placeholder={t("chat.searchPlaceholder")}
                  value={composeQuery}
                  onChange={async e => {
                    const q = e.target.value;
                    setComposeQuery(q);
                    if (!q.trim()) { setComposeResults([]); return; }
                    setComposeSearching(true);
                    const { data: { session } } = await supabase.auth.getSession();
                    const myId = session?.user?.id;
                    const { data } = await supabase
                      .from("profiles")
                      .select("id, username, handle, avatar_url")
                      .or(`username.ilike.%${q}%,handle.ilike.%${q}%`)
                      .limit(10);
                    setComposeResults((data ?? []).filter(p => p.id !== myId));
                    setComposeSearching(false);
                  }}
                  style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 14, width: "100%" }}
                />
                {composeSearching && <Spinner size={16} opacity={0.4} />}
              </div>
            </div>

            {/* 검색 결과 / 기본 추천 */}
            <div style={{ maxHeight: isMobile ? "none" : 300, flex: isMobile ? 1 : "none", overflowY: "auto", padding: "0 12px 16px" }}>
              {composeResults.length === 0 && composeQuery.trim() && !composeSearching && (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, paddingTop: 24 }}>{t("chat.noResults")}</div>
              )}
              {(composeQuery.trim() ? composeResults : defaultUsers).map(p => (
                <div
                  key={p.id}
                  onClick={async () => {
                    setComposeOpen(false);
                    setComposeQuery("");
                    setComposeResults([]);
                    let myId = myIdRef.current;
                    if (!myId) { const { data: { session } } = await supabase.auth.getSession(); myId = session?.user?.id; }
                    if (!myId) return;
                    const convId = [myId, p.id].sort().join("_");
                    const existing = convosRef.current.find(c => c.conversationId === convId || c.supabaseId === p.id);
                    if (existing) {
                      openConvo(existing.id);
                    } else {
                      const placeholder = {
                        id: convId, conversationId: convId,
                        name: p.username ?? p.handle ?? t("chat.unknown"),
                        handle: p.handle ? `@${p.handle}` : null,
                        av: AV_KEYS[convosRef.current.length % AV_KEYS.length],
                        supabaseId: p.id,
                        avatarUrl: p.avatar_url ?? null,
                        preview: t("chat.startConversationPreview"), time: "",
                        _sortAt: new Date().toISOString(),
                      };
                      setConvos(prev => [placeholder, ...prev.filter(c => c.id !== convId)]);
                      setActiveId(convId);
                      setTimeout(() => inputRef.current?.focus(), 80);
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 10, cursor: "pointer", transition: "background 100ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <Av av={AV_KEYS[0]} size={38} avatarUrl={p.avatar_url} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{p.username ?? p.handle}</div>
                    {p.handle && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>@{p.handle}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, paddingLeft: isMobile ? 0 : pad, transition: `padding-left ${DURATION} ${EASE}`, display: "flex", height: isMobile ? "100dvh" : "100vh", minWidth: isMobile ? 0 : 900 }}>

        {/* Conversation panel */}
        <div style={{ width: isMobile ? "100%" : 380, flexShrink: 0, borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.08)", display: (isMobile && activeId) ? "none" : "flex", flexDirection: "column", height: isMobile ? "100dvh" : "100vh", paddingLeft: 4 }}>

          <div style={{ padding: "28px 24px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{ml("k097")}</div>
            {isMobile ? (
              <button onClick={() => setComposeOpen(true)} aria-label="새 메시지" style={{ all: "unset", cursor: "pointer", width: 42, height: 42, borderRadius: 999, display: "grid", placeItems: "center", color: "#fff", background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
            ) : (
              <IconBtn onClick={() => setComposeOpen(true)}>
                <PencilLine size={20} />
              </IconBtn>
            )}
          </div>

          <div style={isMobile
            ? { margin: "12px 12px 20px 8px", display: "flex", alignItems: "center", gap: 11, padding: "0 18px", height: 50, background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", borderRadius: 999 }
            : { margin: "12px 24px 24px", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 42, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 999 }}>
            <svg width={isMobile ? 20 : 15} height={isMobile ? 20 : 15} viewBox="0 0 24 24" fill="none" stroke={isMobile ? "#fff" : "rgba(255,255,255,0.45)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              placeholder={isMobile ? t("chat.searchPlaceholder") : t("chat.searchConversations")}
              value={convSearch}
              onChange={e => setConvSearch(e.target.value)}
              style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: isMobile ? 16 : 14, width: "100%" }}
            />
          </div>

          <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: isMobile ? "0 8px 100px" : "0 8px 24px" }}>
            {convosLoading ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
                <Spinner size={28} opacity={0.3} />
              </div>
            ) : convos.length === 0 ? (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13, paddingTop: 48 }}>
                {t("chat.noConversations")}
              </div>
            ) : convos.filter(c => !convSearch.trim() || c.name?.toLowerCase().includes(convSearch.trim().toLowerCase())).map(c => (
              <div key={c.id} onClick={() => openConvo(c.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderRadius: 8, cursor: "pointer", background: activeId === c.id ? "rgba(255,255,255,0.06)" : "transparent", transition: "background 120ms ease" }}
                onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.background = "transparent"; }}
              >
                <div onClick={isMobile ? undefined : (e => { e.stopPropagation(); c.supabaseId ? navigate(`/profile/${c.supabaseId}`) : navigate("/artist", { state: { name: c.name } }); })} style={{ cursor: "pointer" }}>
                  <Av av={c.av} size={56} online={c.online} avatarUrl={c.avatarUrl} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 14.5, fontWeight: c.unread ? 700 : 600, color: "#fff" }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: c.unread ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: c.unread ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
       
       {c.lastSentByMe
  ? `${t("chat.youPrefix")} ${toPreviewText(c.preview)}`
  : toPreviewText(c.preview)}

                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>{getTimeAgo(c.time)}</div>
                  {c.unread && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FC3C44", boxShadow: "0 0 8px rgba(252,60,68,0.5)" }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat thread */}
        <div style={{ flex: 1, display: (isMobile && !activeId) ? "none" : "flex", flexDirection: "column", height: isMobile ? "100dvh" : "100vh", minWidth: 0, position: "relative" }}>

          {activeId === null ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>{t("chat.startConversation")}</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "12px 16px" : "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                {isMobile && (
                  <button onClick={() => setActiveId(null)} aria-label="뒤로" style={{ all: "unset", cursor: "pointer", width: 34, height: 34, marginLeft: -6, display: "grid", placeItems: "center", color: "#fff", flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                  </button>
                )}
                <div onClick={() => active?.supabaseId ? navigate(`/profile/${active.supabaseId}`) : navigate("/artist", { state: { name: active?.name } })} style={{ cursor: "pointer" }}>
                  <Av av={active?.av} size={40} online={active?.online} avatarUrl={active?.avatarUrl} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    onClick={() => active?.supabaseId ? navigate(`/profile/${active.supabaseId}`) : navigate("/artist", { state: { name: active?.name } })}
                    style={{ fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", display: "inline-block" }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                  >{active?.name}</div>
                  {active?.handle && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 0 }}>{active.handle}</div>}
                  {active?.online && <div style={{ fontSize: 12, color: "#28C840", marginTop: 1 }}>{t("chat.online")}</div>}
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <div ref={menuBtnRef} style={{ display: "inline-flex" }}>
                    <IconBtn onClick={() => {
                      const rect = menuBtnRef.current?.getBoundingClientRect();
                      if (rect) setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                      setChatMenuOpen(true);
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    </IconBtn>
                  </div>
                </div>
              </div>

              {/* 메시지 검색 패널 */}
              {searchOpen && (
                <div style={{ position: "absolute", top: 69, left: 0, right: 0, bottom: 0, background: "#0a0a0a", zIndex: 50, display: "flex", flexDirection: "column" }}>
                  {/* 검색창 */}
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        const q = e.target.value.trim().toLowerCase();
                        if (!q) { setSearchResults([]); return; }
                        const results = messages
                          .map((m, i) => ({ ...m, originalIndex: i }))
                          .filter(m => typeof m.text === "string" && m.text.toLowerCase().includes(q));
                        setSearchResults(results);
                      }}
                      placeholder={t("chat.searchInputPlaceholder")}
                      style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "8px 14px", color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit" }}
                    />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{t("chat.searchResultCount", { n: searchResults.length })}</span>
                    <button onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  {/* 결과 목록 */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                    {searchQuery && searchResults.length === 0 ? (
                      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14, paddingTop: 48 }}>{t("chat.searchNoResults")}</div>
                    ) : searchResults.map(m => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          setSearchResults([]);
                          setTimeout(() => {
                            const el = document.getElementById(`msg-${m.id}`);
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                            if (el?.style) {
                              el.style.background = "rgba(252,60,68,0.2)";
                              setTimeout(() => { if (el?.style) el.style.background = ""; }, 1500);
                            }
                          }, 100);
                        }}
                        style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                          {m.dir === "out" ? t("chat.me") : t("chat.other")} · {new Date(m.created_at ?? Date.now()).toLocaleDateString(i18n.language, { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* messages */}
              <div ref={bodyRef} className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
                {messagesLoading ? (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Spinner size={32} opacity={0.4} />
                  </div>
                ) : (
                  <>

                    {messages.length === 0 && (
                      <div style={{ alignSelf: "center", fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>
                        {t("chat.startConversation")}
                      </div>
                    )}

 {computeGroups(messages).map((msg, i) => {
  const isEditing = editingId === msg.id;
  const canEdit = msg.dir === "out" && msg.text !== undefined && !msg.uploading;
  const canAct = msg.dir === "out" && !msg.uploading && (
    msg.text !== undefined ||
    msg.imageUrl !== undefined ||
    msg.fileUrl !== undefined ||
    msg.sharedPost !== undefined ||
    msg.sharedTrack !== undefined ||
    msg.sharedProject !== undefined ||
    msg.sharedProfile !== undefined
  );
  const canReply = msg.dir === "in" && msg.text !== undefined && !msg.uploading;
  const showActions = canAct && hoveredMsgId === msg.id && !isEditing;
  const showReply = canReply && hoveredMsgId === msg.id;

  if (msg.systemKey) return (
    <div key={msg.id} style={{ display: "flex", flexDirection: "column", width: "100%", alignItems: "center", margin: "12px 0" }}>
      {msg.showTimeDivider && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontWeight: 500, marginBottom: 8 }}>
          {formatDividerTime(msg.created_at, lang)}
        </div>
      )}
      <div style={{ maxWidth: "72%", padding: "10px 16px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 1.5 }}>
        {t(`systemMsg.${msg.systemKey}`, msg.systemKey)}
      </div>
    </div>
  );

  return (
    <div key={msg.id} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* 시간 구분선 */}
      {msg.showTimeDivider && (
        <div style={{ display: "flex", justifyContent: "center", margin: "18px 0", fontSize: 11, color: "rgba(255,255,255,0.32)", fontWeight: 500 }}>
          {formatDividerTime(msg.created_at, lang)}
        </div>
      )}

      {/* 여기서부터 메시지 컨테이너 시작 (모든 내용을 감쌈) */}
      <div id={`msg-${msg.id}`}
        style={{
          display: "flex", gap: 8,
          maxWidth: "66%",
          alignSelf: msg.dir === "out" ? "flex-end" : "flex-start",
          flexDirection: msg.dir === "out" ? "row-reverse" : "row",
          animation: String(msg.id).startsWith("temp_") ? "msgIn 220ms ease both" : "none",
          marginTop: msg.isFirst && i > 0 ? 8 : 2,
          position: "relative",
          borderRadius: 18,
        }}
        onMouseEnter={() => { if (!canAct && !canReply) return; clearTimeout(hideHoverTimerRef.current); setHoveredMsgId(msg.id); }}
        onMouseLeave={() => { hideHoverTimerRef.current = setTimeout(() => setHoveredMsgId(null), 150); }}
      >
        {/* 아바타 영역 */}
        {msg.dir === "in" && (
          msg.isLast ? (
            <div
              onClick={() => active?.supabaseId ? navigate(`/profile/${active.supabaseId}`) : navigate("/artist", { state: { name: active?.name } })}
              style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: AV_GRADS[active?.av] || AV_GRADS.gA, alignSelf: "flex-end", cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {active?.avatarUrl && <img loading="eager" decoding="async" src={active.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
          ) : (
            <div style={{ width: 28, flexShrink: 0 }} />
          )
        )}

        {/* 메시지 내용 전체 영역 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: msg.dir === "out" ? "flex-end" : "flex-start", position: "relative" }}>
          {msg.replyTo && (
            <>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{t("chat.replyTo", { sender: msg.replyTo.sender })}</div>
              <div style={{ padding: "8px 12px", ...bubbleRadius("in", true, true), fontSize: 13, lineHeight: 1.4, wordBreak: "break-word", background: "rgba(255,255,255,0.08)", color: "#fff", opacity: 0.7, transform: "scale(0.95)", transformOrigin: "right center", marginBottom: 4, marginRight: 10, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {msg.replyTo.text}
              </div>
            </>
          )}

          {msg.edited && (
            <div style={{ fontSize: 11, color: "#fff", marginBottom: 5, alignSelf: (msg.text?.length ?? 0) <= 2 ? "center" : "flex-end", marginRight: (msg.text?.length ?? 0) > 2 ? 8 : 0 }}>{t("chat.edited")}</div>
          )}

          <div style={{ position: "relative", display: "flex" }}>
            <div style={{
              padding: (msg.track || msg.sharedPost || msg.sharedTrack || msg.sharedProject || msg.fileUrl || msg.imageUrl || msg.uploading) ? 6 : "10px 14px",
              ...bubbleRadius(msg.dir, msg.isFirst, msg.isLast),
              fontSize: 15, fontWeight: 450, lineHeight: 1.5, letterSpacing: "-0.005em", wordBreak: "break-word",
              background: (msg.imageUrl || msg.sharedPost || msg.sharedTrack || msg.sharedProject) ? "transparent" : msg.dir === "in" ? "rgba(255,255,255,0.08)" : "#FC3C44",
              color: "#fff",
              boxShadow: (msg.dir === "out" && !msg.imageUrl && !msg.sharedPost && !msg.sharedTrack && !msg.sharedProject) ? "0 6px 18px rgba(252,60,68,0.22)" : "none",
            }}>
              {isEditing ? (
                <div ref={editInputRef} contentEditable suppressContentEditableWarning onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleEditSave(activeId, msg.id); } if (e.key === "Escape") setEditingId(null); }} style={{ outline: "none", wordBreak: "break-word", whiteSpace: "pre-wrap", minWidth: 1 }} />
              ) : (
                msg.uploading ? <div style={{ padding: "8px 10px", opacity: 0.5 }}><Spinner size={18} opacity={0.7} /></div> 
                : msg.imageUrl ? <img loading="eager" decoding="async" src={msg.imageUrl} alt="사진" onClick={() => setViewingImage(msg.imageUrl)} style={{ maxWidth: 240, maxHeight: 240, borderRadius: 14, display: "block", objectFit: "cover", cursor: "zoom-in" }} />
                : msg.fileUrl ? <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff", padding: "6px 4px", minWidth: 200 }}><div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}><Paperclip size={16} color="white" /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.fileName}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{t("chat.fileDownload")}</div></div></a>
                : msg.sharedPost ? (() => {
                  const parsed = msg.sharedPost;
                  return (
                    <div
                      onClick={e => { e.stopPropagation(); navigate(`/post/${parsed.postId}`); }}
                      style={{ cursor: "pointer", width: 360, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 10px" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#fc3c44,#7c0a12)", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                          {parsed.avatarUrl
                            ? <img loading="eager" decoding="async" src={parsed.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : (parsed.author?.[0]?.toUpperCase() ?? "A")}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{parsed.author}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{parsed.time}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", padding: "0 16px 10px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {parsed.title}
                      </div>
                      {parsed.imageUrl && (
                        <img loading="eager" decoding="async" src={parsed.imageUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                      )}
                      {parsed.audioUrl && (
                        <div style={{ display: "flex", gap: 13, alignItems: "center", margin: "0 12px 12px", padding: 11, borderRadius: 18, background: "rgba(255,255,255,0.045)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)" }}>
                          <CDPlayer coverUrl={parsed.avatarUrl} avBg="linear-gradient(135deg,#fc3c44,#7c0a12)" size={54} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{parsed.audioName ?? parsed.title}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {[parsed.author, parsed.audioDuration != null && (() => { const m = Math.floor(parsed.audioDuration / 60); const s = parsed.audioDuration % 60; return `${m}:${String(s).padStart(2, "0")}`; })()].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                        </div>
                      )}
                      {!parsed.imageUrl && !parsed.audioUrl && parsed.text && (
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", padding: "0 16px 14px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {parsed.text}
                        </div>
                      )}
                    </div>
                  );
                })() : msg.sharedTrack ? (() => {
                  const st = msg.sharedTrack;
                  const trackPath = st.type === "collabo" ? `/project/${st.trackId}` : `/track/${st.trackId}`;
                  const avBg = st.grad ?? st.thumbBg ?? "linear-gradient(135deg,#fc3c44,#7c0a12)";
                  return (
                    <div
                      onClick={e => { e.stopPropagation(); navigate(trackPath); }}
                      style={{ display: "flex", gap: 13, alignItems: "center", padding: 11, borderRadius: 18, background: "rgba(255,255,255,0.045)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", cursor: "pointer", width: 300 }}
                    >
                      <CDPlayer coverUrl={st.coverUrl} avBg={avBg} size={54} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.title}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.artist}</div>
                      </div>
                    </div>
                  );
                })() : msg.sharedProject ? (() => {
                  const sp = msg.sharedProject;
                  const pid = sp.projectId ?? sp.trackId ?? sp.postId;
                  const ptitle = translateAdminText(sp.projectTitle ?? sp.title ?? "프로젝트", i18n.language);
                  return (
                    <div onClick={e => { e.stopPropagation(); navigate(`/post/${pid}`); }}
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, maxWidth: 280, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#60a5fa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "underline" }}>{ptitle}</span>
                    </div>
                  );
                })() : msg.sharedProfile ? (() => {
                  const badge = SHARE_BADGE.profile;
                  return <div onClick={() => navigate(`/profile/${msg.sharedProfile.userId}`)} style={{ width: 286, minHeight: 96, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 12, cursor: "pointer", userSelect: "none", overflow: "hidden", flexShrink: 0, boxShadow: "0 8px 30px rgba(0,0,0,0.28)" }}><div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", padding: "3px 8px", borderRadius: 999, background: badge.bg, color: badge.color, marginBottom: 10 }}>{badge.icon} {badge.label}</div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0, background: "#312e81", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "#fff" }}>{msg.sharedProfile.avatar_url ? <img loading="eager" decoding="async" src={msg.sharedProfile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (msg.sharedProfile.username?.[0] ?? "?").toUpperCase()}</div><div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}><div style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>{msg.sharedProfile.username}</div>{msg.sharedProfile.handle && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.42)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{msg.sharedProfile.handle}</div>}</div></div></div>;
                })() : msg.track ? (
                  <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 10, display: "flex", alignItems: "center", gap: 10, minWidth: 240 }}><div style={{ width: 46, height: 46, borderRadius: 8, flexShrink: 0, background: msg.track.grad, position: "relative" }}><div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 30%,rgba(255,255,255,0.18),transparent 60%)", borderRadius: 8 }} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{msg.track.name}</div><div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{msg.track.artist}</div></div><div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><polygon points="6 4 20 12 6 20 6 4" /></svg></div></div>
                ) : <>{msg.text}</>
              )}
            </div>
            {/* Action 버튼들 */}
            {showActions && (
             <div style={{ position: "absolute", right: "calc(100% + 6px)", top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 2 }}>
                {canEdit && <button onClick={() => { setEditingId(msg.id); setEditingText(msg.text); }} style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "#fff" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>}
                <button onClick={() => handleDeleteMsg(activeId, msg.id)} style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "#fff" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
             </div>
          )}
          {showReply && (
             <div style={{ position: "absolute", left: "calc(100% + 6px)", top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 2 }}>
                <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text, sender: active?.name ?? "상대방" })} style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}><CornerUpLeft size={13} /></button>
             </div>
          )}
          </div>
        </div>
      </div> {/* id="msg-${msg.id}" 닫힘 */}
    </div>
  );
})}
                  </>
                )}
              </div>

              {/* reply preview */}
              {replyingTo && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 0", flexShrink: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{t("chat.replyTo", { sender: replyingTo.sender })}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyingTo.text}</div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0, display: "grid", placeItems: "center", padding: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* composer */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px 14px", background: "#000000", flexShrink: 0 }}>
                {/* 이미지 */}
                <input type="file" accept="image/*" hidden ref={el => { if (el) el._imgRef = true; }} id="chat-img-input" onChange={e => { if (e.target.files[0]) { sendImage(e.target.files[0]); e.target.value = ""; } }} />
                <button onClick={() => document.getElementById("chat-img-input").click()}
                  style={{ width: 36, height: 36, display: "grid", placeItems: "center", background: "transparent", border: "none", color: "#fff", cursor: "pointer", flexShrink: 0 }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>
                  </svg>
                </button>

                {/* 파일 */}
                <input type="file" hidden id="chat-file-input" onChange={e => { if (e.target.files[0]) { sendFile(e.target.files[0]); e.target.value = ""; } }} />
                <button onClick={() => document.getElementById("chat-file-input").click()}
                  style={{ width: 36, height: 36, display: "grid", placeItems: "center", background: "transparent", border: "none", color: "#fff", cursor: "pointer", flexShrink: 0 }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </button>

                <input
                  ref={inputRef}
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onCompositionStart={() => { isComposing.current = true; }}
                  onCompositionEnd={e => {
                    isComposing.current = false;
                    if (e.data === "" && inputRef.current) {
                      inputRef.current.value = input;
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !isComposing.current) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t("chat.messagePlaceholder")}
                  style={{ flex: 1, height: 48, borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 450, padding: "0 20px" }}
                />

                {input.trim() && (
                  <button onClick={send} style={{ width: 36, height: 36, display: "grid", placeItems: "center", background: "#FC3C44", borderRadius: "50%", border: "none", color: "#fff", cursor: "pointer", flexShrink: 0, transition: "transform 120ms", boxShadow: "0 4px 12px rgba(252,60,68,0.4)" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

      </div>

    </div>
  );
}