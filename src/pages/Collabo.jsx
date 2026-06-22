import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import Pagination from "../components/Pagination";
import { supabase } from "../lib/supabase";
import { CollaboGrid, POSITION_COLORS, DEFAULT_POS_COLOR } from "./Home";
import { ml } from "../lib/ml";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";

const POSITION_MAP = {
  "보컬": "VOCAL", "프로듀서": "PRODUCER", "기타": "GUITAR", "베이스": "BASS",
  "키보드": "KEYBOARD", "바이올린": "VIOLIN", "믹싱&마스터링": "MIXING/MASTERING",
  "믹싱 & 마스터링": "MIXING/MASTERING", "레코딩": "RECORDING", "비트메이커": "BEAT MAKER",
  "작사&작곡": "LYRICS", "작사 & 작곡": "LYRICS", "피처링": "FEATURING", "세션": "SESSION", "드럼": "DRUMS",
};
function toEnPosition(pos) { if (!pos) return pos; return POSITION_MAP[pos.trim()] ?? pos; }

export default function Collabo() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const [isOpen, setIsOpen]             = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [page, setPage]                 = useState(1);
  const [dbItems, setDbItems]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const PER_PAGE = 6;
  const pad = isOpen ? 220 : 90;

  useEffect(() => {
    (async () => {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      const authorIds = [...new Set((projectsData ?? []).map(p => p.author_id).filter(Boolean))];
      const { data: profilesData } = authorIds.length
        ? await supabase.from("profiles").select("id, username, handle, avatar_url").in("id", authorIds)
        : { data: [] };
      const profileMap = {};
      profilesData?.forEach(p => { profileMap[p.id] = p; });

      setDbItems((projectsData ?? []).map(t => ({
        id: t.id,
        position: toEnPosition(t.position ?? ""),
        genre: t.genre ?? "",
        title: t.title,
        description: t.description ?? t.content ?? "",
        artist: profileMap[t.author_id]?.username ?? "아티스트",
        artistHandle: profileMap[t.author_id]?.handle ?? null,
        avatarUrl: profileMap[t.author_id]?.avatar_url ?? null,
        createdAt: t.created_at ?? null,
        cover_url: t.cover_url ?? null,
      })));
      setLoading(false);
    })();
  }, []);

  const allItems = state?.newItem ? [state.newItem, ...dbItems] : dbItems;
  const positions = [...new Set(allItems.map(c => c.position).filter(Boolean))];
  const filteredItems = activeFilter ? allItems.filter(c => c.position === activeFilter) : allItems;
  const totalPages = Math.ceil(filteredItems.length / PER_PAGE);
  const items = filteredItems.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div style={{ minHeight: "100vh", background: "#000000", overflowX: "clip" }}>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div style={{ marginLeft: pad, transition: `margin-left ${DURATION} ${EASE}` }}>
        <main style={{ paddingTop: 32, paddingBottom: 80 }}>

          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingLeft: 32 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", color: "#fff", flexShrink: 0, transition: "background 120ms" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
            </button>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
              {ml("k032")}
            </h1>
          </div>

          {/* 포지션 필터 */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, paddingLeft: 32 }}>
            {[null, ...positions].map(pos => {
              const isActive = activeFilter === pos;
              const color = pos ? (POSITION_COLORS[pos] ?? DEFAULT_POS_COLOR) : "#fff";
              return (
                <button
                  key={pos ?? "all"}
                  onClick={() => { setActiveFilter(pos); setPage(1); }}
                  style={{
                    all: "unset", cursor: "pointer",
                    height: 34, padding: "0 16px", borderRadius: 999,
                    fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em",
                    background: isActive ? (pos ? color : "#fff") : "rgba(255,255,255,0.06)",
                    color: isActive ? "#000" : "rgba(255,255,255,0.55)",
                    boxShadow: isActive ? `0 4px 14px -4px ${pos ? color : "#fff"}88` : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                    transition: "all 160ms ease",
                    display: "inline-flex", alignItems: "center",
                  }}
                >
                  {pos ?? (ml("k105"))}
                </button>
              );
            })}
          </div>

          {/* 카드 그리드 */}
          <CollaboGrid
            cards={items}
            emptyText={ml("k033")}
            pad={pad}
            duration={DURATION}
            ease={EASE}
            loading={loading}
          />

          <div style={{ paddingLeft: 32, paddingRight: 48, marginTop: 24 }}>
            <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); window.scrollTo(0, 0); }} />
          </div>
        </main>
      </div>
    </div>
  );
}
