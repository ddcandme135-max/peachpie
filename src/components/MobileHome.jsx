import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useApp } from "../context/AppContext";
import cdImg from "../assets/_-removebg-preview.png";

// 모바일 홈 화면 — Apple Music 스타일 (Mobile-Home.html 디자인 적용)
const FALLBACK = "linear-gradient(135deg,#3a3a44,#15151b)";
const SPIN_DUR = 3.5; // CD 회전 주기(초)
const SPIN_START = Date.now(); // 모듈 로드 기준 — 페이지 이동해도 회전 위치 이어짐
let SPIN_PAUSE_TIME = null; // 마지막으로 정지된 시각(ms) — 정지 각도를 이 시점 기준으로 고정(축소/펼침·이동해도 동일)
// 재생/정지 전환 시 dock에서 호출 → 정지 각도 기준 시각 관리
export function markSpinPlaying() { SPIN_PAUSE_TIME = null; }
export function markSpinPaused() { if (SPIN_PAUSE_TIME == null) SPIN_PAUSE_TIME = Date.now(); }

const COVER_MASK = "radial-gradient(circle at 50% 49.8%, transparent 19px, black 20px), radial-gradient(circle at 50% 49.8%, black, black 82px, transparent 85px)";
const RING_MASK = "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)";

// CD 디스크 썸네일 — 170px 원본을 그대로 scale로 축소(테두리·그림자까지 정확히 비례)
// spinning: 회전(중첩 래퍼 — 회전 래퍼 안에 스케일 래퍼, transform 충돌 방지)
export function CDCover({ cover, size, spinning }) {
  const k = size / 170;
  // 재생 delay: 마운트 시 1회 계산(SPIN_START 연속 동기화 → 재렌더로 애니메이션 재시작 방지)
  const playDelay = useMemo(() => -(((Date.now() - SPIN_START) / 1000) % SPIN_DUR), []);
  const mountSpinning = useMemo(() => spinning, []); // 최초 마운트 시 재생 여부
  // undefined면 정적 타일. 재생 중이면 회전. 정지 시:
  //  - 재생 중 마운트된 요소는 자기 delay 유지 → play-state만 멈춰서 그 자리에 정확히 멈춤(점프 없음)
  //  - 정지 상태에서 새로 마운트된 요소(축소/펼침·페이지 이동)는 정지 시각 기준 → 각도 동일(둘은 같은 각도)
  let spinStyle = null;
  if (spinning !== undefined) {
    const pauseDelay = mountSpinning ? playDelay : -((((SPIN_PAUSE_TIME ?? Date.now()) - SPIN_START) / 1000) % SPIN_DUR);
    const delay = spinning ? playDelay : pauseDelay;
    spinStyle = { animation: `mhspin ${SPIN_DUR}s linear infinite`, animationPlayState: spinning ? "running" : "paused", animationDelay: `${delay}s` };
  }
  return (
    <div style={{ width: size, height: size, position: "relative", flex: "none" }}>
      <div style={{ position: "absolute", inset: 0, ...spinStyle }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 170, height: 170, transform: `scale(${k})`, transformOrigin: "top left" }}>
          <img loading="eager" decoding="async" src={cdImg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} />
          {cover && (
            <div style={{
              position: "absolute", inset: "-2px", zIndex: 2,
              backgroundImage: `url(${cover})`, backgroundSize: "95.5%", backgroundPosition: "center",
              WebkitMaskImage: COVER_MASK, WebkitMaskComposite: "source-in, source-over",
              maskImage: COVER_MASK, maskComposite: "intersect, add",
            }} />
          )}
          <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: "50%", background: "radial-gradient(circle closest-side, transparent 97.5%, rgba(200,210,230,0.25) 98.5%, rgba(160,170,195,0.15) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", borderRadius: "50%", overflow: "hidden", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.3), inset 0 0 8px rgba(0,0,0,0.4), inset 0 -1px 2px rgba(255,255,255,0.1)", WebkitMaskImage: RING_MASK, maskImage: RING_MASK }} />
        </div>
      </div>
    </div>
  );
}

function Tile({ cover, title, subtitle, onClick, style }) {
  return (
    <div style={{ flex: "none", width: 160, cursor: "pointer", ...style }} onClick={onClick}>
      <CDCover cover={cover} size={160} />
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 11, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>}
    </div>
  );
}

function PositionTile({ cover, label, onClick, style }) {
  return (
    <div style={{ flex: "none", width: 248, cursor: "pointer", ...style }} onClick={onClick}>
      <div style={{ width: 248, height: 330, borderRadius: 24, overflow: "hidden", position: "relative", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)", background: cover ? "#000" : FALLBACK }}>
        {cover && <img loading="eager" decoding="async" src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 48%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>{label}</div>
      </div>
    </div>
  );
}

const GUTTER = 24;
// 첫/마지막 카드 인셋은 flex 자식 margin으로 처리(스크롤 flex 컨테이너는 padding-left가 무시됨)
const railStyle = { display: "flex", gap: 16, overflowX: "auto", paddingTop: 0, paddingBottom: 4, scrollbarWidth: "none", msOverflowStyle: "none" };
const edgeStyle = (i, len) => ({ marginLeft: i === 0 ? GUTTER : 0, marginRight: i === len - 1 ? GUTTER : 0 });

export default function MobileHome({ avatarUrl, username, sections = [] }) {
  const navigate = useNavigate();
  const { session } = useApp() ?? {};
  const loggedIn = !!session?.user;
  const { playTrack } = usePlayer();

  function play(t, list) {
    playTrack({ id: t.id, title: t.title, artist: t.artist, author_id: t.author_id, cover_url: t.cover_url, audio_url: t.audio_url }, list);
  }

  function onCard(t, sec) {
    if (sec.type === "positions") navigate(`/position/${t.key.toLowerCase().replace(/\s/g, "-")}`);
    else if (sec.type === "collabo") navigate(`/project/${t.id}`, { state: { project: t } });
    else play(t, sec.cards);
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#000", color: "#fff", fontFamily: "inherit" }}>
      <style>{`.mh-rail::-webkit-scrollbar{display:none}@keyframes mhspin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ overflowY: "auto", padding: "0 0 150px", minHeight: "100dvh" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 8px" }}>
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em" }}>홈</span>
          <button onClick={() => navigate("/artist")} style={{ all: "unset", cursor: "pointer", width: 49, height: 49, borderRadius: 999, overflow: "hidden", flex: "none", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)", background: avatarUrl ? "#000" : loggedIn ? "linear-gradient(135deg,#FC3C44,#7c2d12)" : "linear-gradient(135deg,#3a3a44,#15151b)", display: "grid", placeItems: "center" }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : loggedIn
                ? <span style={{ fontSize: 21, fontWeight: 800, color: "#fff" }}>{(username?.[0] ?? "?").toUpperCase()}</span>
                : <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)"><path d="M12 12c2.7 0 5-2.2 5-5s-2.3-5-5-5-5 2.2-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" /></svg>}
          </button>
        </div>

        {/* 섹션: Collabo / New Songs / Recently Played / For You (빈 섹션도 표시) */}
        {sections.map(sec => (
          <section key={sec.title} style={{ marginTop: 28 }}>
            <div onClick={() => sec.route && navigate(sec.route)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 24px", marginBottom: 16, cursor: sec.route ? "pointer" : "default" }}>
              <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.03em" }}>{sec.title}</span>
              {sec.route && (
                <span style={{ color: "rgba(255,255,255,0.6)", display: "grid", placeItems: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              )}
            </div>
            {sec.cards.length > 0 ? (
              <div className="mh-rail" style={railStyle}>
                {sec.type === "positions"
                  ? sec.cards.map((t, i) => (
                      <PositionTile key={t.id ?? i} cover={t.cover_url} label={t.title} onClick={() => onCard(t, sec)} style={edgeStyle(i, sec.cards.length)} />
                    ))
                  : sec.cards.map((t, i) => (
                      <Tile key={t.id ?? i} cover={t.cover_url} title={t.title || t.position || "—"} subtitle={t.artist} onClick={() => onCard(t, sec)} style={edgeStyle(i, sec.cards.length)} />
                    ))}
              </div>
            ) : (
              <div style={{ padding: "4px 24px 8px", color: "rgba(255,255,255,0.35)", fontSize: 14 }}>{sec.emptyText || "아직 없어요"}</div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
