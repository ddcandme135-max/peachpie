import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* ── mini post card skeletons for slide 2 ── */
const DPOSTS = [
  { av: "linear-gradient(135deg,#d97706,#92400e)" },
  { av: "linear-gradient(135deg,#be185d,#831843)", img: "linear-gradient(135deg,#7c2d12,#1a0a05)" },
  { av: "linear-gradient(135deg,#2563eb,#1e3a8a)", img: "linear-gradient(135deg,#1e3a8a,#0c0a1f)" },
  { av: "linear-gradient(135deg,#059669,#064e3b)" },
  { av: "linear-gradient(135deg,#7c3aed,#4c1d95)", img: "linear-gradient(135deg,#4c1d95,#1e1b4b)" },
  { av: "linear-gradient(135deg,#0284c7,#0c4a6e)", img: "linear-gradient(135deg,#0c4a6e,#082f49)" },
  { av: "linear-gradient(135deg,#e26a73,#831843)" },
];

function DemoCard({ p }) {
  return (
    <div style={{ flexShrink: 0, borderRadius: 12, background: "rgba(20,20,23,0.92)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", padding: 13, display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: 999, background: p.av, flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
        <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.18)", width: "60%" }} />
      </div>
      <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.10)", width: "80%" }} />
      <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.10)", width: "45%" }} />
      {p.img && (
        <div style={{ height: 74, borderRadius: 9, background: p.img, position: "relative", overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 26% 16%, rgba(255,255,255,0.16), transparent 55%)" }} />
        </div>
      )}
      <div style={{ display: "flex", gap: 14, marginTop: 2 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 14, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.12)" }} />)}
      </div>
    </div>
  );
}

function DemoCol({ posts, reverse }) {
  const duration = reverse ? "18s" : "26s";
  const keyframe = reverse ? "demoDown" : "demoUp";
  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
      {[0, 1].map(copy => (
        <div key={copy} style={{ display: "flex", flexDirection: "column", gap: 14, animation: `${keyframe} ${duration} linear infinite` }}>
          {posts.map((p, i) => <DemoCard key={i} p={p} />)}
        </div>
      ))}
    </div>
  );
}

/* ── mini app screen strip for slide 1 ── */
const MS_HOME = (
  <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.22)", width: "32%" }} />
      <div style={{ height: 13, width: 36, borderRadius: 999, background: "#FF5A4D", marginLeft: "auto", flexShrink: 0 }} />
    </div>
    <div style={{ display: "flex", gap: 7, flex: 1 }}>
      {["linear-gradient(180deg,#d97a7a,#9e4a4a)","linear-gradient(180deg,#cf7350,#94492c)","linear-gradient(180deg,#d6bc62,#9a8336)","linear-gradient(180deg,#9cc3e0,#5e87a8)","linear-gradient(180deg,#9fcc85,#618c4a)"].map((g,i) => (
        <div key={i} style={{ flex: 1, borderRadius: 8, background: g }} />
      ))}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, height: 32 }}>
      {["radial-gradient(circle at 50% 50%,#0E0E10 0 4px,transparent 4px),linear-gradient(135deg,#8c1f2a,#2a0a0d)","radial-gradient(circle at 50% 50%,#0E0E10 0 4px,transparent 4px),linear-gradient(135deg,#7c3aed,#1e1b4b)","radial-gradient(circle at 50% 50%,#0E0E10 0 4px,transparent 4px),linear-gradient(135deg,#1e3a8a,#0c0a1f)","radial-gradient(circle at 50% 50%,#0E0E10 0 4px,transparent 4px),linear-gradient(135deg,#831843,#1a0207)"].map((g,i) => (
        <div key={i} style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, background: g, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
      ))}
    </div>
  </div>
);

function MiniScreen({ content }) {
  return (
    <div style={{ width: 272, height: 176, borderRadius: 12, background: "rgba(15,15,18,0.97)", flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10), 0 20px 44px rgba(0,0,0,0.55)", padding: 12, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
      {content}
    </div>
  );
}

/* ── feedback bubbles for slide 3 ── */
const FB = [
  { av: "linear-gradient(135deg,#d97706,#92400e)", w: 64, tag: true,  x: 4,  dur: 17, delay: 0 },
  { av: "linear-gradient(135deg,#be185d,#831843)", w: 88, tag: false, x: 56, dur: 21, delay: -7 },
  { av: "linear-gradient(135deg,#2563eb,#1e3a8a)", w: 52, tag: true,  x: 30, dur: 19, delay: -13 },
  { av: "linear-gradient(135deg,#059669,#064e3b)", w: 76, tag: false, x: 70, dur: 23, delay: -3 },
  { av: "linear-gradient(135deg,#7c3aed,#4c1d95)", w: 60, tag: true,  x: 14, dur: 25, delay: -17 },
  { av: "linear-gradient(135deg,#0284c7,#0c4a6e)", w: 82, tag: false, x: 46, dur: 18, delay: -10 },
];

const SLIDE_META = [
  {
    tone: "lime",
    tint: `radial-gradient(1000px 560px at 50% 0%, rgba(170,210,70,0.18), transparent 62%),
           radial-gradient(700px 420px at 12% 80%, rgba(40,120,90,0.16), transparent 65%),
           radial-gradient(700px 420px at 88% 80%, rgba(120,180,60,0.10), transparent 65%)`,
    ctaRoute: "/board",
  },
  {
    tone: "ocean",
    tint: `radial-gradient(1000px 560px at 50% 0%, rgba(80,160,220,0.30), transparent 64%),
           radial-gradient(700px 420px at 12% 80%, rgba(45,90,185,0.24), transparent 65%),
           radial-gradient(700px 420px at 88% 80%, rgba(60,190,180,0.14), transparent 65%)`,
    ctaRoute: null,
  },
];

export default function HeroBanner({ padLeft = 0 }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const slides = SLIDE_META.map((meta, i) => ({ ...meta, ...t("heroBanner", { returnObjects: true }).slice(1)[i] }));
  const [cur, setCur] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  function go(i) {
    setCur((i + slides.length) % slides.length);
  }

  function reset() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCur(c => (c + 1) % slides.length), 12000);
  }

  useEffect(() => {
    reset();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (hovered) clearInterval(timerRef.current);
    else reset();
  }, [hovered]);

  const vignette = `radial-gradient(1200px 500px at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%),
    linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 22%, transparent 64%, rgba(0,0,0,0.7) 100%)`;

  return (
    <>
      <style>{`
        @keyframes demoUp   { from { transform: translateY(0); }                    to { transform: translateY(calc(-100% - 14px)); } }
        @keyframes demoDown { from { transform: translateY(calc(-100% - 14px)); }   to { transform: translateY(0); } }
        @keyframes stripMv  { from { transform: translateX(0); }                    to { transform: translateX(calc(-100% - 20px)); } }
        @keyframes fbRise   { from { transform: translateY(460px); }                to { transform: translateY(-120px); } }
        .hero-nav { opacity: 0; transition: opacity 200ms; }
        .hero-wrap:hover .hero-nav { opacity: 1; }
      `}</style>

      <section
        className="hero-wrap"
        style={{ position: "relative", width: "100%", height: 440, overflow: "visible" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 배경 레이어만 사이드바 뒤까지 연장 */}
        {slides.map((slide, idx) => (
          <div key={`bg-${idx}`} style={{ position: "absolute", top: 0, bottom: 0, left: -padLeft, right: 0, opacity: idx === cur ? 1 : 0, transition: "opacity 720ms cubic-bezier(0.4,0,0.2,1)", pointerEvents: "none", background: "#000", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: slide.tint }} />
            <div style={{ position: "absolute", inset: 0, background: vignette }} />
          </div>
        ))}

        {/* 콘텐츠 레이어 — section 범위로 클립 */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {slides.map((slide, idx) => {
          const on = idx === cur;
          return (
            <div key={idx} style={{ position: "absolute", inset: 0, opacity: on ? 1 : 0, pointerEvents: on ? "auto" : "none", transition: "opacity 720ms cubic-bezier(0.4,0,0.2,1)" }}>

              {/* ── Slide 1: 2-col scrolling post cards ── */}
              {idx === 0 && (
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 48, width: "40%", maxWidth: 480, zIndex: 2, display: "flex", gap: 16, alignItems: "stretch", overflow: "hidden", transform: "perspective(1400px) rotateY(-7deg)", WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)", maskImage: "linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%)" }}>
                  <DemoCol posts={[DPOSTS[0], DPOSTS[1], DPOSTS[4], DPOSTS[3]]} reverse={false} />
                  <DemoCol posts={[DPOSTS[2], DPOSTS[6], DPOSTS[5], DPOSTS[1]]} reverse={true} />
                </div>
              )}

              {/* ── Slide 2: feedback form + rising bubbles ── */}
              {idx === 1 && (
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 48, width: "42%", maxWidth: 500, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* bubbles */}
                  <div style={{ position: "absolute", inset: 0, overflow: "hidden", WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%)", maskImage: "linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%)" }}>
                    {FB.map((b, i) => (
                      <div key={i} style={{ position: "absolute", left: b.x + "%", display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 999, background: "rgba(20,20,23,0.88)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)", animation: `fbRise ${b.dur}s linear ${b.delay}s infinite` }}>
                        <div style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, background: b.av, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
                        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.20)", width: b.w }} />
                        {b.tag && <div style={{ height: 12, width: 30, borderRadius: 999, flexShrink: 0, background: "rgba(255,90,77,0.20)", boxShadow: "inset 0 0 0 1px rgba(255,90,77,0.35)" }} />}
                      </div>
                    ))}
                  </div>
                  {/* mini form card */}
                  <div style={{ position: "relative", width: 248, borderRadius: 16, background: "rgba(15,15,18,0.97)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10), 0 24px 64px rgba(0,0,0,0.6)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.22)", width: "38%" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ height: 16, width: 44, borderRadius: 999, background: "rgba(255,90,77,0.22)", boxShadow: "inset 0 0 0 1px rgba(255,90,77,0.4)" }} />
                      <div style={{ height: 16, width: 44, borderRadius: 999, background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }} />
                      <div style={{ height: 16, width: 44, borderRadius: 999, background: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)", minHeight: 64 }}>
                      <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.10)", width: "86%" }} />
                      <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.10)", width: "64%" }} />
                      <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.10)", width: "42%" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ height: 22, width: 56, borderRadius: 999, background: "#FF5A4D" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── copy stack ── */}
              <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", textAlign: "left", padding: "0 0 0 16px", right: "44%" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 18, whiteSpace: "nowrap" }}>{slide.tag}</span>
                <h2 style={{ margin: "0 0 14px", fontSize: "clamp(40px, 5.4vw, 68px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#fff", wordBreak: "keep-all", textShadow: "0 0 60px rgba(255,255,255,0.25)" }}>{slide.title}</h2>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 400, color: "rgba(255,255,255,0.72)", lineHeight: 1.5, wordBreak: "keep-all", maxWidth: "34ch" }}>{slide.sub}</p>
              </div>
            </div>
          );
        })}
        </div>{/* 콘텐츠 레이어 end */}


        {/* dots */}
        <div style={{ position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 5 }}>
          {slides.map((_, i) => (
            <button key={i} aria-label={`슬라이드 ${i + 1}`} onClick={() => { go(i); reset(); }} style={{ all: "unset", cursor: "pointer", width: 6, height: 6, borderRadius: 999, background: i === cur ? "#fff" : "rgba(255,255,255,0.28)", transition: "background 200ms" }} />
          ))}
        </div>
      </section>
    </>
  );
}
