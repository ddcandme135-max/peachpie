import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";

const ADMIN_IDS = ["a44420e9-826b-4b55-ae14-63950e111495"];

const fmt = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export default function Admin() {
  const navigate = useNavigate();
  const { addDeletedPostId } = useApp();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState("신고");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || !ADMIN_IDS.includes(session.user.id)) {
        navigate("/");
        return;
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    supabase.from("reports")
      .select("*")
      .eq("type", activeTab === "신고" ? "report" : "feedback")
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        if (!data?.length) { setReports([]); setLoading(false); return; }

        // 신고자 프로필
        const reporterIds = [...new Set(data.map(r => r.reporter_id).filter(Boolean))];
        const { data: reporters } = reporterIds.length
          ? await supabase.from("profiles").select("id, username, avatar_url").in("id", reporterIds)
          : { data: [] };
        const reporterMap = {};
        reporters?.forEach(p => { reporterMap[p.id] = p; });

        // 신고 대상 프로필 (target_type이 user인 경우)
        const targetIds = [...new Set(data.filter(r => r.target_type === "user").map(r => r.target_id).filter(Boolean))];
        const { data: targets } = targetIds.length
          ? await supabase.from("profiles").select("id, username, avatar_url").in("id", targetIds)
          : { data: [] };
        const targetMap = {};
        targets?.forEach(p => { targetMap[p.id] = p; });

        // 게시물 제목 (target_type이 post인 경우)
        const postIds = [...new Set(data.filter(r => r.target_type === "post").map(r => r.target_id).filter(Boolean))];
        const { data: posts } = postIds.length
          ? await supabase.from("posts").select("id, title").in("id", postIds)
          : { data: [] };
        const postMap = {};
        posts?.forEach(p => { postMap[p.id] = p; });

        setReports(data.map(r => ({
          ...r,
          reporter: reporterMap[r.reporter_id] ?? null,
          target: targetMap[r.target_id] ?? null,
          postTitle: postMap[r.target_id]?.title ?? null,
        })));
        setLoading(false);
      });
  }, [ready, activeTab]);

  if (!ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#000000", color: "#fff", padding: "40px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32 }}>관리자</h1>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {["신고", "피드백"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 20px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                background: activeTab === tab ? "#fff" : "rgba(255,255,255,0.08)",
                color: activeTab === tab ? "#000000" : "rgba(255,255,255,0.6)",
                transition: "all 0.15s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", paddingTop: 80 }}>불러오는 중...</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", paddingTop: 80 }}>항목이 없습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {reports.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {item.reporter?.avatar_url ? (
                      <img
                        src={item.reporter.avatar_url}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {item.reporter?.username ?? "알 수 없음"}
                    </span>
                    {item.target_type === "user" && (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                          {item.target?.username ?? item.target_id ?? "알 수 없음"}
                        </span>
                      </>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{fmt(item.created_at)}</span>
                </div>

                {/* Meta chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {item.target_type && (
                    <span style={chip}>대상: {item.target_type}</span>
                  )}
                  {item.target_id && (
                    <span style={{ ...chip, fontFamily: "Pretendard", fontSize: 11 }}>ID: {item.target_id}</span>
                  )}
                </div>

                {/* 게시물 제목 + 신고 사유 + 내용 */}
                {item.target_type === "post" && item.postTitle && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                    게시물: {item.postTitle}
                  </div>
                )}
                {item.category && (
                  <div style={{ fontSize: 12, color: "#FC3C44", fontWeight: 600, marginBottom: 4 }}>
                    신고 사유: {item.category}
                  </div>
                )}
                {item.content && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                    {item.content}
                  </div>
                )}

                {/* Screenshot */}
                {item.screenshot_url && (
                  <div style={{ maxHeight: 320, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <img
                      src={item.screenshot_url}
                      alt="screenshot"
                      style={{ width: "100%", display: "block" }}
                    />
                  </div>
                )}

                {item.target_type === "post" && item.target_id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => navigate(`/post/${item.target_id}`)}
                      style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      게시물 확인 →
                    </button>
                    <button onClick={async () => {
                        const { error } = await supabase.from("posts").delete().eq("id", item.target_id);
                        if (!error) {
                          addDeletedPostId(item.target_id);
                          await supabase.from("reports").delete().eq("target_id", item.target_id);
                          setReports(prev => prev.filter(rep => rep.target_id !== item.target_id));
                        }
                      }}
                      style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(252,60,68,0.12)", border: "1px solid rgba(252,60,68,0.3)", color: "#FC3C44", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      게시물 삭제
                    </button>
                  </div>
                )}
                {item.target_type === "user" && item.target_id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => navigate(`/profile/${item.target_id}`)}
                      style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      프로필 확인 →
                    </button>
                    <button onClick={async () => {
                        await supabase.from("profiles").update({ banned: true, banned_at: new Date().toISOString() }).eq("id", item.target_id);
                        setReports(prev => prev.map(rep => rep.id === item.id ? { ...rep, isBanned: true } : rep));
                      }}
                      style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(252,60,68,0.12)", border: "1px solid rgba(252,60,68,0.3)", color: "#FC3C44", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {item.isBanned ? "정지됨" : "계정 정지"}
                    </button>
                    <button onClick={async () => {
                        await supabase.from("profiles").update({ banned: false, banned_at: null }).eq("id", item.target_id);
                        setReports(prev => prev.map(rep => rep.id === item.id ? { ...rep, isBanned: false } : rep));
                      }}
                      style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      정지 해제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const chip = {
  padding: "3px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  fontSize: 12,
  color: "rgba(255,255,255,0.55)",
};
