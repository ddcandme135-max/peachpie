import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const BG = [
  "radial-gradient(60% 80% at 25% 30%,#fc3c44 0%,#7c0a12 45%,#1a0307 80%),radial-gradient(50% 70% at 80% 70%,rgba(255,150,170,0.4),transparent 60%),#0a0205",
  "radial-gradient(70% 80% at 70% 30%,#4c1d95 0%,#1e1b4b 45%,#020617 80%),radial-gradient(50% 70% at 20% 80%,rgba(180,140,255,0.3),transparent 60%),#050207",
  "radial-gradient(60% 90% at 40% 60%,#064e3b 0%,#0a2f25 40%,#020c08 80%),radial-gradient(50% 60% at 80% 30%,rgba(110,230,180,0.35),transparent 60%),#020805",
  "radial-gradient(70% 80% at 30% 40%,#92400e 0%,#451a03 45%,#1a0a02 80%),radial-gradient(40% 50% at 75% 75%,rgba(255,180,80,0.3),transparent 60%),#0a0502",
  "radial-gradient(60% 80% at 70% 30%,#0c4a6e 0%,#082f49 45%,#020617 80%),radial-gradient(50% 60% at 25% 75%,rgba(125,211,252,0.35),transparent 60%),#02050a",
];

const TOTAL = BG.length;
const EASE  = "cubic-bezier(0.2,0.7,0.2,1)";

export default function BannerCarousel() {
  const { t } = useTranslation();
  const banners = t("banners", { returnObjects: true });
  const [cur, setCur] = useState(0);
  const timerRef  = useRef(null);
  const pausedRef = useRef(false);

  function restart() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) setCur(c => (c + 1) % TOTAL);
    }, 6000);
  }

  useEffect(() => {
    restart();
    const onVis = () => { pausedRef.current = document.visibilityState !== "visible"; };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  function goTo(i) {
    setCur(((i % TOTAL) + TOTAL) % TOTAL);
    restart();
  }

  return (
    <div style={{ position: "relative", padding: "0 32px", marginBottom: 48 }}>
      {/* Frame */}
      <div style={{ overflow: "hidden", borderRadius: 20, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)", position: "relative" }}>
        {/* Track */}
        <div style={{ display: "flex", transform: `translateX(-${cur * 100}%)`, transition: `transform 600ms ${EASE}` }}>
          {banners.map((b, i) => (
            <div key={i} style={{ flex: "0 0 100%", height: 460, position: "relative", display: "flex", alignItems: "flex-end", padding: 48, overflow: "hidden" }}>
              {/* Gradient background */}
              <div style={{ position: "absolute", inset: 0, background: BG[i] }} />
              {/* Dark vignette overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.4) 60%,rgba(0,0,0,0.85) 100%)" }} />
              {/* Content */}
              <div style={{ position: "relative", zIndex: 2, maxWidth: 560 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 18 }}>
                  <span className="banner-live-dot" />
                  {b.kicker}
                </div>
                <h2 style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1, color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.4)", wordBreak: "keep-all", margin: 0 }}>
                  {b.title.map((line, li) => <span key={li} style={{ display: "block" }}>{line}</span>)}
                </h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", marginTop: 14, lineHeight: 1.5, wordBreak: "keep-all", maxWidth: 500, marginBottom: 0 }}>
                  {b.sub}
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 22px", borderRadius: 999, background: "#fff", color: "#000", border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 800, letterSpacing: "-0.01em", fontFamily: "inherit", whiteSpace: "nowrap", boxShadow: "0 12px 28px -8px rgba(255,255,255,0.4)", transition: "transform 120ms ease" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                    {b.cta}
                  </button>
                  <button style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 20px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap", backdropFilter: "blur(10px)", transition: "background 120ms ease" }}>
                    {b.ghost}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div style={{ position: "absolute", bottom: 24, right: 60, zIndex: 3, display: "flex", gap: 8, alignItems: "center" }}>
          {banners.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{ width: i === cur ? 24 : 8, height: 8, borderRadius: i === cur ? 4 : "50%", background: i === cur ? "#fff" : "rgba(255,255,255,0.35)", border: "none", padding: 0, cursor: "pointer", transition: "all 200ms ease" }} />
          ))}
        </div>
      </div>

      {/* Arrow: prev */}
      <button onClick={() => goTo(cur - 1)} aria-label="이전" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 48, width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.1)", display: "grid", placeItems: "center", color: "#fff", cursor: "pointer", zIndex: 3, transition: "background 120ms ease" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      {/* Arrow: next */}
      <button onClick={() => goTo(cur + 1)} aria-label="다음" style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 48, width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.1)", display: "grid", placeItems: "center", color: "#fff", cursor: "pointer", zIndex: 3, transition: "background 120ms ease" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}
