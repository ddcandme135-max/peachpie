import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import Pagination from "../components/Pagination";
import { fetchPosts } from "../lib/api";
import { ml } from "../lib/ml";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "600ms";

const FILTER_COLORS = {
  "전체":          { bg: "rgba(252,60,68,0.15)",  color: "#FC3C44" },
  "보컬":          { bg: "rgba(244,114,182,0.15)", color: "#f472b6" },
  "프로듀서":      { bg: "rgba(56,189,248,0.15)",  color: "#38bdf8" },
  "작사&작곡":     { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  "피처링":        { bg: "rgba(74,222,128,0.15)",  color: "#4ade80" },
  "믹싱&마스터링": { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
};

const FILTER_TO_CATEGORY = {
  "보컬":          "VOCAL",
  "프로듀서":      "PRODUCER",
  "작사&작곡":     "LYRIC",
  "피처링":        "FEATURING",
  "믹싱&마스터링": "MIXING/MASTERING",
};

const CATEGORY_TO_FILTER = {
  "VOCAL":            "보컬",
  "PRODUCER":         "프로듀서",
  "LYRIC":            "작사&작곡",
  "FEATURING":        "피처링",
  "MIXING/MASTERING": "믹싱&마스터링",
};

const FILTERS = ["전체", "보컬", "프로듀서", "작사&작곡", "피처링", "믹싱&마스터링"];

function mapPost(p) {
  const author = p.profiles?.username ?? "아티스트";
  return {
    ...p,
    tag: CATEGORY_TO_FILTER[p.category] ?? p.category,
    author,
    letter: (author[0] ?? "A").toUpperCase(),
    avatarUrl: p.profiles?.avatar_url ?? null,
    avBg: "#7c3aed",
    thumbBg: p.thumb_bg || "linear-gradient(135deg,#1a0533,#4a1a7a)",
    icon: p.icon || "🎤",
    genres: p.genre ? [p.genre] : [],
    deadline: p.deadline ?? "상시 모집",
    time: new Date(p.created_at).toLocaleDateString("ko-KR"),
    likes: p.like_count ?? 0,
    comments: p.comment_count ?? 0,
  };
}

const HeartIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function CollaboBoard() {
  const [isOpen, setIsOpen] = useState(() => sessionStorage.getItem("sidebar_open") !== "0");
  const [dbPosts, setDbPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const PER_PAGE = 12;
  const pad = isOpen ? 290 : 116;

  const FILTER_KEYS = ["all", "vocal", "producer", "lyrics", "featuring", "mixing"];
  const FILTER_LABELS = {
    all:       ml("k139"),
    vocal:     ml("k140"),
    producer:  ml("k141"),
    lyrics:    ml("k142"),
    featuring: ml("k143"),
    mixing:    ml("k106"),
  };
  const KO_FILTERS = ["전체", "보컬", "프로듀서", "작사&작곡", "피처링", "믹싱&마스터링"];
  const KEY_TO_KO = Object.fromEntries(FILTER_KEYS.map((k, i) => [k, KO_FILTERS[i]]));

  useEffect(() => {
    fetchPosts({ limit: 50 }).then(({ data, error }) => {
      console.log("[CollaboBoard] fetchPosts →", data, error);
      if (data) setDbPosts(data.map(mapPost));
      setLoading(false);
    });
  }, []);

  const activeFilterKo = KEY_TO_KO[activeFilter] ?? "전체";
  const filteredPosts = activeFilter === "all"
    ? dbPosts
    : dbPosts.filter(p => p.category === FILTER_TO_CATEGORY[activeFilterKo]);

  const totalPages = Math.ceil(filteredPosts.length / PER_PAGE);
  const visiblePosts = filteredPosts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div style={{ minHeight: "100vh", background: "#000000", overflowX: "auto" }}>
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main style={{
        paddingLeft: pad, paddingRight: 48, paddingTop: 32, paddingBottom: 80,
        transition: `padding-left ${DURATION} ${EASE}`,
        minWidth: 1100,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: 500,
            fontFamily: "inherit", padding: "0 0 20px 0",
            transition: "color 120ms",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {ml("k107")}
        </button>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 24 }}>
          {ml("k108")}
        </h1>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {FILTER_KEYS.map(key => {
            const active = activeFilter === key;
            const fc = FILTER_COLORS[KO_FILTERS[FILTER_KEYS.indexOf(key)]];
            return (
              <button
                key={key}
                onClick={() => { setActiveFilter(key); setPage(1); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: active ? `1px solid ${fc.color}` : "1px solid rgba(255,255,255,0.15)",
                  background: active ? fc.bg : "transparent",
                  color: active ? fc.color : "rgba(255,255,255,0.5)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 100ms",
                  fontFamily: "inherit",
                }}
              >
                {FILTER_LABELS[key]}
              </button>
            );
          })}
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "#FC3C44", animation: "spin 0.7s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {!loading && filteredPosts.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 64, fontSize: 15, color: "rgba(255,255,255,0.3)" }}>
            {ml("k109")}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {visiblePosts.map((p, i) => {
            const tagStyle = FILTER_COLORS[CATEGORY_TO_FILTER[p.category] ?? "전체"];
            const accent = tagStyle?.color ?? "rgba(255,255,255,0.5)";
            return (
              <div
                key={p.id ?? i}
                onClick={() => {
                  console.log("post.id:", p.id);
                  if (p.id) navigate(`/post/${p.id}`, { state: { post: p } });
                }}
                style={{
                  display: "flex",
                  gap: 20,
                  padding: 20,
                  borderRadius: 20,
                  cursor: "pointer",
                  background: `linear-gradient(135deg, ${accent}22 0%, ${accent}0f 40%, ${accent}06 100%), linear-gradient(160deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.05) 40%, rgba(10,10,14,0.18) 100%)`,
                  backdropFilter: "blur(28px) saturate(135%)",
                  WebkitBackdropFilter: "blur(28px) saturate(135%)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 20px 60px -16px rgba(0,0,0,0.5)",
                  transition: "transform 220ms cubic-bezier(0.32,0.72,0,1), box-shadow 220ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 28px 70px -16px rgba(0,0,0,0.6)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 20px 60px -16px rgba(0,0,0,0.5)"; }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: 96, height: 96, borderRadius: 16,
                  background: "#1a1a2e",
                  display: "grid", placeItems: "center",
                  fontSize: 30, flexShrink: 0,
                }}>
                  <span>{p.icon}</span>
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ marginBottom: 6 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                        padding: "2px 8px", borderRadius: 6,
                        background: tagStyle.bg, color: tagStyle.color,
                      }}>
                        {p.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", lineHeight: 1.35, letterSpacing: "-0.02em", marginBottom: 8 }}>
                      {p.title}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                      {p.genres.map(g => (
                        <span key={g} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
                          {g}
                        </span>
                      ))}
                      {p.deadline && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(252,60,68,0.1)", color: "#fc8086" }}>
                          마감 {p.deadline}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.35)", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: p.avBg, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0, overflow: "hidden",
                      }}>
                        {p.avatarUrl
                          ? <img loading="eager" decoding="async" src={p.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : p.letter}
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{p.author}</span>
                    </div>
                    <span>·</span>
                    <span>{p.time}</span>
                    <span>·</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><HeartIcon />{p.likes}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><CommentIcon />{p.comments}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); window.scrollTo(0, 0); }} />
      </main>
    </div>
  );
}
