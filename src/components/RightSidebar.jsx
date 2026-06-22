import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { fetchTrending } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { usePlayer } from "../context/PlayerContext";
import cdImg from "../assets/_-removebg-preview.png";
import { preloadCovers } from "../lib/preloadCovers";

const ADMIN_ID = "a44420e9-826b-4b55-ae14-63950e111495";

// CD 썸네일 (음원 섹션)
function CdThumb({ coverUrl, size = 36 }) {
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} />
      {coverUrl && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center", WebkitMaskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)", maskImage: "radial-gradient(circle closest-side, transparent 22%, black 23%, black 95.8%, transparent 96.5%)" }} />
      )}
      <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: "50%", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)", WebkitMaskImage: "radial-gradient(circle, transparent 18%, black 19%)", maskImage: "radial-gradient(circle, transparent 18%, black 19%)" }} />
    </div>
  );
}

const GRADS = [
  "radial-gradient(circle at 30% 30%,rgba(255,170,90,0.45),transparent 60%),linear-gradient(135deg,#7c2d12,#1a0a05)",
  "radial-gradient(circle at 70% 40%,rgba(255,180,200,0.4),transparent 60%),linear-gradient(135deg,#be185d,#1a0207)",
  "linear-gradient(135deg,#1e3a8a,#0c0a1f)",
  "linear-gradient(135deg,#4c1d95,#1e1b4b)",
  "radial-gradient(circle at 50% 50%,rgba(94,232,160,0.3),transparent 60%),linear-gradient(135deg,#134e4a,#042f2e)",
  "radial-gradient(circle at 60% 30%,rgba(125,211,252,0.35),transparent 55%),linear-gradient(135deg,#0c4a6e,#020617)",
];


export default function RightSidebar({ width = 320, activeTab, page }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { playTrack, recentlyPlayed } = usePlayer();

  const [fbOpen, setFbOpen]   = useState(true);
  const [fbTab, setFbTab]     = useState("bug");
  const [fbText, setFbText]   = useState("");
  const [fbSent, setFbSent]   = useState(false);
  const [fbScreenshot, setFbScreenshot]                 = useState(null);
  const [fbScreenshotPreview, setFbScreenshotPreview]   = useState(null);
  const [trending, setTrending] = useState([]);
  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [recommendedArtists, setRecommendedArtists] = useState([]);
  const [myId, setMyId] = useState(null);
  const [followingIds, setFollowingIds] = useState(new Set());
  const fbFileRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setMyId(session?.user?.id ?? null);
    });
  }, []);

  // 미니 플레이어에 우측 사이드바 존재 알림
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("right-sidebar", { detail: { present: true } }));
    return () => window.dispatchEvent(new CustomEvent("right-sidebar", { detail: { present: false } }));
  }, []);

  useEffect(() => {
    if (!myId || page !== "profile") return;
    supabase.from("follows").select("following_id").eq("follower_id", myId)
      .then(({ data }) => {
        setFollowingIds(new Set((data ?? []).map(r => r.following_id)));
      });
  }, [myId, page]);

  async function toggleArtistFollow(e, artistId) {
    e.stopPropagation();
    if (!myId || myId === artistId) return;
    const isFollowing = followingIds.has(artistId);
    setFollowingIds(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(artistId) : next.add(artistId);
      return next;
    });
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", myId).eq("following_id", artistId);
    } else {
      await supabase.from("follows").insert({ follower_id: myId, following_id: artistId });
    }
  }

  useEffect(() => {
    if (page !== "profile") return;
    let query = supabase
      .from("profiles")
      .select("id, username, handle, avatar_url")
      .not("username", "is", null)
      .neq("id", ADMIN_ID)
      .order("created_at", { ascending: false })
      .limit(8);
    if (myId) query = query.neq("id", myId);
    query.then(({ data }) => {
      const list = (data ?? []).filter(a => a.id !== myId).slice(0, 7);
      setRecommendedArtists(list);
    });
  }, [page, myId]);

  useEffect(() => {
    fetchTrending({ limit: 5 }).then(({ data }) => {
      if (!data?.length) return;
      preloadCovers(data);
      setTrending(data);
    });

    (async () => {
      const COLS = "id, title, artist, cover_url, duration, audio_url, author_id, genre, profiles!tracks_author_id_fkey(username)";
      const fmtTrk = (trk) => ({
        ...trk,
        artist: trk.profiles?.username ?? trk.artist ?? t("sidebar.artist"),
        duration: (() => { const d = trk.duration; if (!d) return "—"; if (typeof d === "string" && d.includes(":")) return d; const s = typeof d === "number" ? d : parseInt(d, 10); return isNaN(s) ? "—" : `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; })(),
      });
      const parseGenre = (g) => {
        if (!g) return null;
        if (typeof g === "string" && g.startsWith("[")) { try { const p = JSON.parse(g); return Array.isArray(p) ? (p[0] ?? null) : g; } catch { return g; } }
        return Array.isArray(g) ? (g[0] ?? null) : g;
      };

      // 1) 최근 재생한 트랙의 장르 파악
      const lastId = recentlyPlayed?.[0]?.id ?? null;
      let genre = null;
      if (lastId) {
        const { data: last } = await supabase.from("tracks").select("genre").eq("id", lastId).maybeSingle();
        genre = parseGenre(last?.genre);
      }

      // 2) 장르 기반 추천, 없으면 랜덤
      if (genre) {
        const { data } = await supabase.from("tracks").select(COLS)
          .eq("type", "song").ilike("genre", `%${genre}%`)
          .order("created_at", { ascending: false }).limit(20);
        const pool = (data ?? []).filter(t => t.id !== lastId);
        if (pool.length) { const recs = pool.slice(0, 5).map(fmtTrk); preloadCovers(recs); setRecommendedTracks(recs); return; }
      }

      // 랜덤 폴백: 최신 30개에서 무작위 5개
      const { data: randomData } = await supabase.from("tracks").select(COLS)
        .eq("type", "song").order("created_at", { ascending: false }).limit(30);
      const shuffled = [...(randomData ?? [])].filter(t => t.id !== lastId);
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      if (shuffled.length) { const recs = shuffled.slice(0, 5).map(fmtTrk); preloadCovers(recs); setRecommendedTracks(recs); }
    })();
  }, [recentlyPlayed?.[0]?.id]);

  async function handleFbSubmit() {
    if (!fbText.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    let screenshotUrl = null;
    if (fbScreenshot) {
      const ext = fbScreenshot.name.split(".").pop();
      const path = `${Date.now()}_${session?.user?.id ?? "anon"}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("feedback-screenshots")
        .upload(path, fbScreenshot, { contentType: fbScreenshot.type });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("feedback-screenshots").getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }
    }
    await supabase.from("reports").insert({
      type: "feedback",
      category: fbTab,
      content: fbText.trim(),
      target_type: "general",
      reporter_id: session?.user?.id ?? null,
      screenshot_url: screenshotUrl,
    });
    setFbSent(true);
    setFbText("");
    setFbScreenshot(null);
    setFbScreenshotPreview(null);
    showToast("피드백을 보냈습니다", "success", undefined, "check");
    setTimeout(() => setFbSent(false), 1800);
  }

  const ROW = (key, grad, title, meta, onClick) => (
    <div key={key} onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", margin: "0 -10px", borderRadius: 8, cursor: "pointer", transition: "background 140ms" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: grad, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
        {typeof grad === "string" && grad.startsWith("http") && <img loading="eager" decoding="async" src={grad} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</div>
      </div>
    </div>
  );

  const SEC_H = (icon, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{label}</span>
    </div>
  );

  return (
    <aside style={{ width, flexShrink: 0 }}>
    <div style={{
      position: "fixed", top: 0,
      width,
      display: "flex", flexDirection: "column", gap: 22,
      height: "100vh",
      overflowY: "auto",
      scrollbarWidth: "thin",
      background: "#1C1C1E",
      borderLeft: "1px solid rgba(255,255,255,0.06)",
      padding: "20px 18px 32px",
      boxSizing: "border-box",
    }}>

      {/* 피드백 카드 — 기본 접힘, 클릭 시 펼침 */}
      <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
        {/* 헤더 (항상 표시) */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}
        >
          <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 8, background: "#FC3C44", color: "#fff", display: "grid", placeItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{t("feedback.title")}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("feedback.desc")}</div>
          </div>
        </div>

        {/* 펼쳐진 본문 */}
        {fbOpen && (
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 4, padding: 3, background: "rgba(255,255,255,0.1)", borderRadius: 8 }}>
              {[["bug", t("feedback.tabBug")], ["improve", t("feedback.tabImprove")], ["etc", t("feedback.tabEtc")]].map(([key, label]) => (
                <button key={key} onClick={() => setFbTab(key)}
                  style={{ all: "unset", cursor: "pointer", flex: 1, minWidth: 0, textAlign: "center", height: 30, lineHeight: "30px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, color: fbTab === key ? "#fff" : "rgba(255,255,255,0.55)", background: fbTab === key ? "rgba(255,255,255,0.2)" : "transparent", transition: "all 140ms", fontFamily: "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 4px", boxSizing: "border-box" }}>
                  {label}
                </button>
              ))}
            </div>

            <textarea value={fbText} onChange={e => setFbText(e.target.value)}
              placeholder={fbTab === "bug" ? t("feedback.placeholderBug") : fbTab === "improve" ? t("feedback.placeholderImprove") : t("feedback.placeholderEtc")}
              style={{ display: "block", boxSizing: "border-box", width: "100%", minHeight: 84, padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.1)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)", border: "none", outline: "none", color: "#fff", fontFamily: "inherit", fontSize: 13, lineHeight: 1.5, resize: "none" }}
            />

            {fbScreenshotPreview && (
              <div style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
                <img loading="eager" decoding="async" src={fbScreenshotPreview} alt="" style={{ width: "100%", display: "block" }} />
                <button onClick={() => { setFbScreenshot(null); setFbScreenshotPreview(null); }}
                  style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", color: "#fff", display: "grid", placeItems: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}

            <input ref={fbFileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFbScreenshot(f); setFbScreenshotPreview(URL.createObjectURL(f)); } }}
            />

            <div style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => fbFileRef.current?.click()}
                style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: fbScreenshot ? "#FC3C44" : "rgba(255,255,255,0.62)", transition: "color 140ms", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.color = fbScreenshot ? "#FF505A" : "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = fbScreenshot ? "#FC3C44" : "rgba(255,255,255,0.62)"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                {t("feedback.screenshot")}
              </button>
              <button onClick={handleFbSubmit} disabled={!fbText.trim()}
                style={{ all: "unset", cursor: fbText.trim() ? "pointer" : "not-allowed", marginLeft: "auto", height: 34, padding: "0 18px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: "#fff", background: fbText.trim() ? "#FC3C44" : "rgba(255,255,255,0.1)", transition: "filter 140ms, transform 120ms", fontFamily: "inherit" }}
                onMouseEnter={e => { if (fbText.trim()) e.currentTarget.style.filter = "brightness(1.1)"; }}
                onMouseLeave={e => e.currentTarget.style.filter = "none"}
              >
                {fbSent ? t("feedback.sent") : t("feedback.send")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 프로젝트 탭 — 트렌딩 + 추천 */}
      {activeTab === "projects" && (<>
        {[
          { label: t("sidebar.trending"), icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> },
          { label: t("sidebar.recommendedProjects"), icon: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8"/></> },
        ].map(({ label, icon }) => (
          <div key={label} style={{ flexShrink: 0, marginTop: 16 }}>
            {SEC_H(icon, label)}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Array(3).fill(null).map((_, i) => (
                <div key={i} style={{ padding: "10px 10px", borderRadius: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "-0.01em", lineHeight: 1.35, marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t("sidebar.noProjects")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.08)" }} />
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>— · — · —</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </>)}

      {/* 트렌딩 + 추천 트랙 — 프로젝트 탭 아닐 때, 프로필 페이지 아닐 때 */}
      {activeTab !== "projects" && page !== "profile" && (<>
        <div style={{ flexShrink: 0, marginTop: 16 }}>
          {SEC_H(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>, t("sidebar.trending"))}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {Array.from({ length: 5 }, (_, i) => {
              // 트렌딩 기준(좋아요) 있는 음원만 표시 — 데이터 없으면 빈 상태 유지(최신순으로 채우지 않음)
              const item = trending.filter(t => t.kind === "track" && (t.score ?? 0) > 0)[i] ?? null;
              return (
                <div key={item?.id ?? i}
                  onClick={() => item && playTrack({ id: item.id, title: item.title, artist: item.profiles?.username ?? item.artist ?? "", cover_url: item.cover_url ?? null, audio_url: item.audio_url ?? null })}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 10, cursor: item ? "pointer" : "default", transition: "background 140ms" }}
                  onMouseEnter={e => { if (item) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.3)", width: 14, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                  {item?.cover_url ? (
                    <CdThumb coverUrl={item.cover_url} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, overflow: "hidden", background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {item ? (
                      <>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>{item.title}</div>
                        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.62)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.profiles?.username ?? item.artist ?? "아티스트"}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "-0.01em" }}>{t("sidebar.noTracks")}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {recommendedTracks.length > 0 && (
          <div style={{ flexShrink: 0 }}>
            {SEC_H(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>, t("sidebar.recommended"))}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {recommendedTracks.map((track, i) => (
                <div key={track.id} onClick={() => playTrack({ id: track.id, title: track.title, artist: track.artist ?? "", cover_url: track.cover_url ?? null, audio_url: track.audio_url ?? null })}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 10, cursor: "pointer", transition: "background 140ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {track.cover_url ? (
                    <CdThumb coverUrl={track.cover_url} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, overflow: "hidden", background: GRADS[i % GRADS.length], boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>{track.title}</div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.62)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>)}

      {/* 추천 아티스트 — 프로필 페이지 */}
      {page === "profile" && activeTab !== "projects" && recommendedArtists.length > 0 && (
        <div style={{ flexShrink: 0, marginTop: 16 }}>
          {SEC_H(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>, t("sidebar.recommendedArtists"))}
          <div style={{ marginTop: 8 }} />
          {recommendedArtists.map((a, i) => (
            <div key={a.id}
              onClick={() => navigate(`/profile/${a.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 10px", margin: "0 -10px", borderRadius: 8, cursor: "pointer", transition: "background 140ms" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: GRADS[i % GRADS.length], boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                {a.avatar_url
                  ? <img loading="eager" decoding="async" src={a.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{(a.username ?? "?")[0].toUpperCase()}</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>{a.username}</div>
                {a.handle && <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.62)", marginTop: 2 }}>@{a.handle}</div>}
              </div>
              {myId && myId !== a.id && (() => {
                const followed = followingIds.has(a.id);
                return (
                  <button onClick={e => toggleArtistFollow(e, a.id)}
                    style={{ all: "unset", flexShrink: 0, padding: "5px 12px", borderRadius: 999, background: followed ? "rgba(255,255,255,0.08)" : "#FC3C44", border: followed ? "1px solid rgba(255,255,255,0.15)" : "none", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 150ms" }}
                    onMouseEnter={e => { if (!followed) e.currentTarget.style.background = "#FF505A"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = followed ? "rgba(255,255,255,0.08)" : "#FC3C44"; }}
                  >{followed ? t("common.following") : t("common.follow")}</button>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
    </aside>
  );
}
