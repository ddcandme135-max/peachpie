import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import { ml } from "../lib/ml";

const R = "#FC3C44";
const GENRES    = ["Hip-hop","R&B","Pop","Indie","Lo-fi","Jazz","Soul","Neo Soul","Trap","Drill","Afrobeats","Electronic","House","Ambient","Folk","Rock","Alternative","Classical"];
const POSITIONS = ["VOCAL","SESSION","FEATURING","MIXING","MASTERING","PRODUCER","BEAT MAKER"];

function MultiDropdown({ options, selected, onToggle, placeholder }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function handleToggle() {
    if (!open) {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    }
    setOpen(o => !o);
  }

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected[0]} 외 ${selected.length - 1}개`;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        style={{
          all: "unset", boxSizing: "border-box", width: "100%", height: 56,
          padding: "0 14px", borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.04)",
          border: open ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.08)",
          color: selected.length ? "#fff" : "rgba(255,255,255,0.3)",
          fontSize: 13, fontWeight: selected.length ? 500 : 400,
          cursor: "pointer", transition: "border-color 150ms",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, marginLeft: 8, transition: "transform 150ms", transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.4 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && rect && createPortal(
        <div ref={panelRef} style={{
          position: "fixed",
          top: rect.bottom + 6,
          left: rect.left,
          width: rect.width,
          zIndex: 1100,
          background: "rgba(22,22,26,0.98)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
          maxHeight: 240, overflowY: "auto",
        }}>
          {options.map(opt => {
            const on = selected.includes(opt);
            return (
              <button key={opt} onClick={() => { onToggle(opt); setOpen(false); }} style={{
                all: "unset", boxSizing: "border-box", width: "100%", height: 38,
                padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                color: on ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 13,
                fontWeight: on ? 600 : 400, cursor: "pointer",
                background: on ? "rgba(252,60,68,0.08)" : "transparent",
                transition: "background 100ms, color 100ms",
              }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}
              >
                <span>{opt}</span>
                {on && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

function Ring({ used }) {
  const MAX = 60;
  const r = 13, circ = 2 * Math.PI * r;
  const ratio = Math.min(used / MAX, 1);
  const over = used > MAX;
  const warn = used >= MAX * 0.85;
  const dash = ratio * circ;
  const rem = MAX - used;
  return (
    <div style={{ position: "relative", width: 34, height: 34, display: "grid", placeItems: "center" }}>
      <svg width="34" height="34" viewBox="0 0 34 34" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx="17" cy="17" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
        <circle cx="17" cy="17" r={r} fill="none"
          stroke={over ? "#ff4444" : warn ? "#f59e0b" : R}
          strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} />
      </svg>
      {warn && (
        <span style={{ fontSize: 10, fontWeight: 600, color: over ? "#ff4444" : "#f59e0b", position: "relative", zIndex: 1 }}>
          {over ? `-${-rem}` : rem}
        </span>
      )}
    </div>
  );
}

export default function NewProjectModal({ open, onClose, editData, onSaved }) {
  const { session, profile } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const isEdit = !!editData?.id;

  const [title, setTitle]             = useState("");
  const [desc, setDesc]               = useState("");
  const [tracks, setTracks]           = useState([]);
  const [genres, setGenres]           = useState([]);
  const [position, setPosition]       = useState(null);
  const [status, setStatus]           = useState("open");
  const [loading, setLoading]         = useState(false);
  const [cover, setCover]             = useState(null);     // { url, file? }
  const [coverDeleted, setCoverDeleted] = useState(false);

  const [trackZoneDragging, setTrackZoneDragging] = useState(false);

  const descRef = useRef(null);
  const trackFileRef = useRef(null);
  const coverInputRef = useRef(null);
  const canPost = title.trim().length > 0 && genres.length > 0;
  const used = title.length + desc.length;

  const displayName   = profile?.username || session?.user?.email?.split("@")[0] || "아티스트";
  const avatarInitial = (displayName[0] || "U").toUpperCase();
  const avatarUrl     = profile?.avatar_url || null;

  useEffect(() => {
    if (!open) return;
    if (editData) {
      setTitle(editData.title ?? "");
      setDesc(editData.description ?? "");
      setGenres(editData.genre ? editData.genre.split(",").map(s => s.trim()).filter(Boolean) : []);
      setPosition(editData.position ?? null);
      setCover(editData.cover_url ? { url: editData.cover_url, file: null } : null);
      setCoverDeleted(false);
    } else {
      reset();
    }
    document.body.style.overflow = "hidden";
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open, editData?.id]);

  function reset() {
    setTitle(""); setDesc(""); setTracks([]); setGenres([]);
    setPosition(null); setStatus("open"); setLoading(false);
    setCover(null); setCoverDeleted(false);
    setTrackZoneDragging(false);
  }

  function handleClose() { reset(); onClose(); }

  function handleCoverFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setCover({ url: URL.createObjectURL(file), file });
    setCoverDeleted(false);
  }

  function removeCover() {
    setCover(null);
    setCoverDeleted(true);
  }

  function toggleGenre(g) {
    setGenres(prev => prev.includes(g) ? [] : [g]);
  }
  function togglePos(p) {
    setPosition(prev => prev === p ? null : p);
  }

  function handleTrackFile(file) {
    if (!file || !file.type.startsWith("audio/")) return;
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const d = a.duration;
      const time = isFinite(d)
        ? Math.floor(d / 60) + ":" + String(Math.round(d % 60)).padStart(2, "0")
        : "0:00";
      setTracks(prev => [...prev, { title: nameWithoutExt, time, file }]);
      URL.revokeObjectURL(a.src);
    };
    a.onerror = () => {
      setTracks(prev => [...prev, { title: nameWithoutExt, time: "0:00", file }]);
    };
    a.src = URL.createObjectURL(file);
  }

  function removeTrack(i) {
    setTracks(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handlePost() {
    if (!canPost || loading) return;
    setLoading(true);
    try {
      const userId = session?.user?.id;

      // cover_url 처리
      let finalCoverUrl = editData?.cover_url ?? null;
      console.log('[cover]', cover);
      console.log('[coverDeleted]', coverDeleted);
      console.log('[finalCoverUrl before]', finalCoverUrl);
      if (cover?.file) {
        const ext = cover.file.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(path, cover.file, { upsert: true });
        if (upErr) throw upErr;
        finalCoverUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
        console.log('[finalCoverUrl after upload]', finalCoverUrl);
      } else if (coverDeleted) {
        finalCoverUrl = null;
      } else if (cover?.url && !cover?.file) {
        finalCoverUrl = cover.url;
      }

      console.log('[finalCoverUrl after]', finalCoverUrl);
      if (isEdit) {
        const { error } = await supabase.from("projects").update({
          title: title.trim(),
          description: desc.trim(),
          genre: genres.join(", "),
          position: position ?? "",
          cover_url: finalCoverUrl,
        }).eq("id", editData.id);
        if (error) throw error;
        const { data: fresh } = await supabase.from("projects").select("*").eq("id", editData.id).single();
        handleClose();
        onSaved?.(fresh);
        showToast(lang === "ko" ? "프로젝트가 수정되었습니다" : "Project updated", "success", undefined, "check");
        return;
      }

      // 오디오 파일 업로드
      const uploadedTracks = await Promise.all(
        tracks.map(async (t) => {
          if (!t.file) return { title: t.title, time: t.time };
          const ext = t.file.name.split(".").pop();
          const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("project-audio")
            .upload(path, t.file, { contentType: t.file.type });
          if (upErr) return { title: t.title, time: t.time };
          const url = supabase.storage.from("project-audio").getPublicUrl(path).data.publicUrl;
          return { title: t.title, time: t.time, url };
        })
      );

      const { data, error } = await supabase.from("projects").insert({
        title: title.trim(),
        description: desc.trim(),
        position: position ?? "",
        genre: genres.join(", "),
        author_id: userId,
        cover_url: finalCoverUrl,
        tracks: uploadedTracks,
      }).select().single();
      if (error) throw error;
      showToast("프로젝트를 업로드했습니다", "success", undefined, "house");
      handleClose();
      if (data?.id) navigate(`/project/${data.id}`);
    } catch (err) {
      console.error(err);
      if (err?.message?.includes("row-level security")) {
        showToast("로그인 후 업로드 해주세요.", "error");
      } else {
        showToast(err?.message || "업로드 실패", "error");
      }
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes npm2Rise{from{opacity:0;transform:translateY(16px) scale(0.985);}to{opacity:1;transform:none;}}
        @keyframes npm2Fade{from{opacity:0;}to{opacity:1;}}
        @keyframes npm2Row{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
        .npm2-body::-webkit-scrollbar{display:none;}
      `}</style>

      {/* backdrop */}
      <div onClick={handleClose} style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(7px)",
        animation: "npm2Fade 280ms ease both",
      }} />

      {/* sheet wrapper */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1001,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "90px 24px 80px", pointerEvents: "none",
      }}>
        <div style={{
          width: "100%", maxWidth: 600,
          maxHeight: "min(820px, calc(100vh - 170px))",
          display: "flex", flexDirection: "column",
          background: "rgba(14,14,16,0.96)", backdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20,
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
          overflow: "hidden",
          animation: "npm2Rise 280ms cubic-bezier(0.22,1,0.36,1) both",
          pointerEvents: "all",
        }}>

          {/* header */}
          <header style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 18px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}>
            <button onClick={handleClose} style={{ all: "unset", cursor: "pointer", fontSize: 15, color: "rgba(255,255,255,0.55)", fontWeight: 500, padding: "6px 4px", borderRadius: 8, transition: "color 120ms" }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.55)"}
            >{ml("k005")}</button>

            <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{isEdit ? (ml("k063")) : (ml("k064"))}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginTop: 3 }}>{isEdit ? "Edit Project" : "New Project"}</div>
            </div>

            <button onClick={handlePost} disabled={!canPost || loading} style={{
              all: "unset", cursor: canPost && !loading ? "pointer" : "not-allowed",
              height: 34, padding: "0 18px", borderRadius: 999,
              background: canPost && !loading ? R : "rgba(255,255,255,0.07)",
              color: canPost && !loading ? "#fff" : "rgba(255,255,255,0.28)",
              fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em",
              display: "inline-flex", alignItems: "center",
              boxShadow: canPost && !loading ? "0 6px 16px -5px rgba(252,60,68,0.6)" : "none",
              transition: "background 150ms, color 150ms, box-shadow 150ms",
            }}>{loading ? (ml("k020")) : (ml("k021"))}</button>
          </header>

          {/* body */}
          <div className="npm2-body" style={{
            flex: 1, minHeight: 0, overflowY: "auto",
            scrollbarWidth: "none", msOverflowStyle: "none",
            padding: "24px 24px",
          }}>

            {/* author */}
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#ff7eb6,#fc3c44)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)", overflow: "hidden", fontSize: 17, fontWeight: 900, color: "#fff" }}>
                {avatarUrl ? <img loading="eager" decoding="async" src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : avatarInitial}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{displayName}</div>
                <div style={{ marginTop: 0, fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                  {profile?.handle ? `@${profile.handle}` : `@${session?.user?.email?.split("@")[0] ?? ""}`}
                </div>
              </div>
            </div>

            {/* title */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
              placeholder={ml("k022")}
              style={{ width: "100%", background: "transparent", border: 0, outline: 0, color: "#fff", fontFamily: "inherit", fontSize: 27, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3, padding: "0 0 4px" }}
            />

            {/* desc */}
            <textarea
              ref={descRef}
              value={desc}
              onChange={e => { setDesc(e.target.value); if (descRef.current) { descRef.current.style.height = "auto"; descRef.current.style.height = descRef.current.scrollHeight + "px"; } }}
              placeholder={ml("k023")}
              rows={2}
              style={{ marginTop: 12, width: "100%", background: "transparent", border: 0, outline: 0, color: "rgba(255,255,255,0.55)", resize: "none", fontFamily: "inherit", fontSize: 19, fontWeight: 400, lineHeight: 1.65, padding: 0, minHeight: 48 }}
            />

            {/* ── 커버 이미지 ── */}
            <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", marginBottom: 12 }}>
                {ml("k065")}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => { if (e.target.files[0]) handleCoverFile(e.target.files[0]); e.target.value = ""; }}
              />
              {cover ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img loading="eager" decoding="async" src={cover.url} alt="cover" style={{ width: 120, height: 120, borderRadius: 14, objectFit: "cover", display: "block" }} />
                  <button
                    onClick={removeCover}
                    style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", cursor: "pointer", color: "#fff", display: "grid", placeItems: "center" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  style={{ width: 120, height: 120, borderRadius: 14, border: "1.5px dashed rgba(255,255,255,0.15)", display: "grid", placeItems: "center", cursor: "pointer", background: "rgba(255,255,255,0.03)", transition: "border-color 150ms, background 150ms" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
              )}
            </div>

            {/* ── 장르 ── */}
            <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", marginBottom: 12 }}>{ml("k003")}<span style={{ color: "#FC3C44", marginLeft: 3 }}>*</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GENRES.map(g => {
                  const on = genres.includes(g);
                  return (
                    <button key={g} onClick={() => toggleGenre(g)} style={{ all: "unset", cursor: "pointer", padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", background: on ? R : "rgba(255,255,255,0.06)", color: on ? "#fff" : "rgba(255,255,255,0.5)", boxShadow: on ? `0 0 0 1px ${R}` : "0 0 0 1px rgba(255,255,255,0.1)", transition: "all 150ms", fontFamily: "inherit" }}
                      onMouseEnter={e => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                      onMouseLeave={e => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                    >{g}</button>
                  );
                })}
              </div>
            </div>

            {/* ── 포지션 ── */}
            <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", marginBottom: 10 }}>{ml("k066")}</div>
              <MultiDropdown options={POSITIONS} selected={position ? [position] : []} onToggle={togglePos} placeholder={ml("k067")} />
            </div>

            {/* ── section: 음원 추가 ── */}
            <Section title={ml("k024")} right={<span style={{ fontSize: 12, fontWeight: 600, color: tracks.length >= 3 ? R : "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>{tracks.length}/3</span>}>

              {/* track list */}
              {tracks.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px 9px 11px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 8, animation: "npm2Row 240ms cubic-bezier(0.22,1,0.36,1) both" }}>
                  <span style={{ fontFamily: "Pretendard", fontSize: 12, color: "rgba(255,255,255,0.3)", width: 18, textAlign: "center", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(252,60,68,0.12)", color: R, boxShadow: "inset 0 0 0 1px rgba(252,60,68,0.22)" }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                      <span style={{ fontFamily: "Pretendard" }}>{t.time}</span>
                      {t.file ? <span style={{ color: "#FC3C44", marginLeft: 6 }}>● 파일 첨부됨</span> : <span> · 미발행</span>}
                    </div>
                  </div>
                  <button onClick={() => removeTrack(i)} style={{ all: "unset", width: 30, height: 30, borderRadius: 999, flexShrink: 0, cursor: "pointer", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.35)", transition: "background 120ms, color 120ms" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(252,60,68,0.12)"; e.currentTarget.style.color = R; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}

              {/* add row — audio drop zone */}
              <input
                ref={trackFileRef}
                type="file"
                accept="audio/*"
                multiple
                hidden
                disabled={tracks.length >= 3}
                onChange={e => {
                  const newFiles = [...e.target.files].filter(f => f.type.startsWith("audio/"));
                  if (tracks.length + newFiles.length > 3) {
                    showToast("음원 파일은 최대 3개까지 첨부할 수 있습니다", "error");
                    e.target.value = "";
                    return;
                  }
                  newFiles.forEach(handleTrackFile);
                  e.target.value = "";
                }}
              />
              <div
                onClick={() => { if (tracks.length < 3) trackFileRef.current?.click(); }}
                onDragOver={e => { e.preventDefault(); if (tracks.length < 3) setTrackZoneDragging(true); }}
                onDragEnter={e => { e.preventDefault(); if (tracks.length < 3) setTrackZoneDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setTrackZoneDragging(false); }}
                onDrop={e => {
                  e.preventDefault(); setTrackZoneDragging(false);
                  const newFiles = [...e.dataTransfer.files].filter(f => f.type.startsWith("audio/"));
                  if (tracks.length + newFiles.length > 3) {
                    showToast("음원 파일은 최대 3개까지 첨부할 수 있습니다", "error");
                    return;
                  }
                  newFiles.forEach(handleTrackFile);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  height: 56, padding: "0 14px", borderRadius: 10,
                  background: trackZoneDragging ? "rgba(252,60,68,0.05)" : "rgba(255,255,255,0.04)",
                  border: trackZoneDragging ? "1px solid #FC3C44" : "1px solid rgba(255,255,255,0.08)",
                  cursor: tracks.length >= 3 ? "not-allowed" : "pointer",
                  opacity: tracks.length >= 3 ? 0.45 : 1,
                  transition: "border-color 150ms, background 150ms, opacity 150ms",
                }}
                onMouseEnter={e => { if (!trackZoneDragging && tracks.length < 3) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; } }}
                onMouseLeave={e => { if (!trackZoneDragging) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; } }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(252,60,68,0.12)", color: R }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{ml("k025")} <span style={{ color: "rgba(255,255,255,0.2)" }}>(WAV · MP3 · FLAC · {ml("k068")})</span></span>
              </div>
            </Section>

            <div style={{ height: 24 }} />
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ icon, title, right, children }) {
  return (
    <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {icon && (
          <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(252,60,68,0.14)", color: R, boxShadow: "inset 0 0 0 1px rgba(252,60,68,0.22)" }}>
            {icon}
          </span>
        )}
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{title}</span>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      {children}
    </div>
  );
}
