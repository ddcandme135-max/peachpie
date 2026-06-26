import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const OPERATOR_EMAIL = "ddcandme135@gmail.com";

export default function Privacy() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sections = [
    {
      title: t("privacy.s1Title"),
      body: t("privacy.s1Body"),
      items: [t("privacy.s1Item1"), t("privacy.s1Item2"), t("privacy.s1Item3")],
    },
    { title: t("privacy.s2Title"), body: t("privacy.s2Body"), items: [] },
    { title: t("privacy.s3Title"), body: t("privacy.s3Body"), items: [] },
    { title: t("privacy.s4Title"), body: t("privacy.s4Body"), items: [OPERATOR_EMAIL] },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#000000", color: "#fff", display: "flex", justifyContent: "center", padding: "48px 20px 96px" }}>
      <div style={{ width: "100%", maxWidth: 720 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ all: "unset", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 28, transition: "color 150ms" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          {t("privacy.back")}
        </button>

        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
          <span style={{ fontFamily: "'Agbalumo', cursive", color: "#F5854D", fontWeight: 400 }}>Peachpie</span>{" "}
          {t("privacy.title")}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 10 }}>
          {t("privacy.lastUpdated")}
        </p>

        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.7, marginTop: 28 }}>
          {t("privacy.intro")}
        </p>

        <div style={{ marginTop: 16 }}>
          {sections.map((sec) => (
            <section key={sec.title} style={{ marginTop: 36 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>{sec.title}</h2>
              {sec.body && (
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.7, marginTop: 12 }}>{sec.body}</p>
              )}
              {sec.items.length > 0 && (
                <ul style={{ margin: "12px 0 0", paddingLeft: 20, color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.9 }}>
                  {sec.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
