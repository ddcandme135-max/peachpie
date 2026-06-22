import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import cdImg from "../assets/_-removebg-preview.png";
import { ml } from "../lib/ml";

const GENRES = ["Hip-hop", "R&B", "Trap", "Pop", "K-Pop", "Electronic", "Jazz", "Ambient", "Lo-fi", "Rock"];

function GenreDropdown({ genre, onToggle, lang = "ko" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          all: "unset", boxSizing: "border-box", width: "100%", height: 56,
          padding: "0 14px", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.04)", border: open ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.08)",
          color: genre ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: genre ? 500 : 400,
          cursor: "pointer", transition: "border-color 150ms",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{genre ?? (ml("k069"))}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, marginLeft: 8, transition: "transform 150ms", transform: open ? "rotate(180deg)" : "rotate(0deg)", opacity: 0.4 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
          background: "rgba(22,22,26,0.98)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12,
          boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
          maxHeight: 240, overflowY: "auto",
        }}>
          {GENRES.map(g => {
            const on = genre === g;
            return (
              <button
                key={g}
                onClick={() => { onToggle(g); setOpen(false); }}
                style={{
                  all: "unset", boxSizing: "border-box", width: "100%", height: 38,
                  padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  color: on ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: on ? 600 : 400,
                  cursor: "pointer", background: on ? "rgba(252,60,68,0.08)" : "transparent",
                  transition: "background 100ms, color 100ms",
                }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}
              >
                <span>{g}</span>
                {on && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function pad(n) { return String(n).padStart(2, "0"); }
function fmtBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

function renderWaveBars() {
  const N = 64;
  const bars = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const h = 18 + Math.abs(Math.sin(t * Math.PI * 7)) * 52 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)) + Math.random() * 14;
    bars.push(Math.min(100, h));
  }
  return bars;
}

export default function NewTrackModal({ open, onClose, editData, onSaved }) {
  const { session, profile } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language?.slice(0, 2) ?? "en";
  const isEdit = !!editData?.id;

  const [title, setTitle]           = useState("");
  const [cover, setCover]           = useState(null);      // { url, file? }
  const [audioFile, setAudioFile]   = useState(null);   // File | null
  const [audioUrl, setAudioUrl]     = useState(null);   // existing URL | null
  const [audioName, setAudioName]   = useState(null);   // filename | null
  const [genre, setGenre]           = useState(null);
  const [durMin, setDurMin]         = useState("");
  const [durSec, setDurSec]         = useState("");
  const [durAuto, setDurAuto]       = useState(false);
  const [waveBars, setWaveBars]     = useState([]);
  const [dragging, setDragging]     = useState(false);
  const [loading, setLoading]       = useState(false);

  const coverInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const durRef        = useRef(null);
  const titleRef      = useRef(null);

  // 제목 길이에 맞춰 textarea 높이 자동 조정
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  const canUpload = title.trim() && (cover || isEdit) && (audioFile || audioUrl) && !!genre;

  const displayName   = profile?.username || session?.user?.email?.split("@")[0] || "나";
  const avatarInitial = (displayName[0] || "U").toUpperCase();
  const avatarUrl     = profile?.avatar_url || null;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !editData) return;
    setTitle(editData.title ?? "");
    const rawGenre = editData.genre;
    let genreArr = [];
    if (rawGenre) {
      if (Array.isArray(rawGenre)) genreArr = rawGenre;
      else if (typeof rawGenre === "string" && rawGenre.startsWith("[")) {
        try { const p = JSON.parse(rawGenre); genreArr = Array.isArray(p) ? p : []; } catch { genreArr = []; }
      } else genreArr = rawGenre.split(",").map(s => s.trim()).filter(Boolean);
    }
    setGenre(genreArr[0] ?? null);
    if (editData.cover_url) setCover({ url: editData.cover_url, file: null });
    setAudioFile(null);
    const storedName = editData.audio_name ?? null;
    const urlName = editData.audio_url
      ? decodeURIComponent(editData.audio_url.split("/").pop().split("?")[0])
      : null;
    setAudioName(storedName ?? urlName ?? null);
    setAudioUrl(editData.audio_url ?? null);
    if (editData.audio_url) setWaveBars(renderWaveBars());
    if (editData.duration) {
      const raw = editData.duration;
      const sec = typeof raw === "number" ? raw : (typeof raw === "string" && raw.includes(":") ? parseInt(raw) * 60 + parseInt(raw.split(":")[1]) : parseInt(raw));
      if (!isNaN(sec)) { setDurMin(String(Math.floor(sec / 60))); setDurSec(pad(sec % 60)); }
    }
  }, [open, editData]);

  function reset() {
    setTitle(""); setCover(null);
    setAudioFile(null); setAudioUrl(null); setAudioName(null);
    setGenre(null); setDurMin(""); setDurSec("");
    setDurAuto(false); setWaveBars([]); setDragging(false); setLoading(false);
    durRef.current = null;
  }

  function handleClose() { reset(); onClose(); }

  function loadCoverFile(file) {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setCover({ url, file });
  }

  function loadAudioFile(file) {
    if (!file.type.startsWith("audio/")) return;
    setWaveBars(renderWaveBars());
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const d = a.duration;
      if (isFinite(d)) {
        durRef.current = d;
        const m = Math.floor(d / 60), s = Math.round(d % 60);
        setDurMin(String(m));
        setDurSec(pad(s));
        setDurAuto(true);
      }
      URL.revokeObjectURL(a.src);
    };
    a.onerror = () => {};
    a.src = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioName(file.name);
  }

  function toggleGenre(g) {
    setGenre(prev => prev === g ? null : g);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    [...e.dataTransfer.files].forEach(f => {
      if (f.type.startsWith("audio/")) loadAudioFile(f);
      else if (f.type.startsWith("image/")) loadCoverFile(f);
    });
  }

  async function handleUpload() {
    if (!canUpload || loading) return;
    setLoading(true);
    try {
      const userId = session?.user?.id;

      // Upload cover (only if new file selected)
      let coverUrl = isEdit ? (editData.cover_url ?? null) : null;
      if (cover?.file) {
        const ext = cover.file.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(path, cover.file);
        if (upErr) throw upErr;
        coverUrl = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }

      // Upload audio (only if new file selected)
      let finalAudioUrl = isEdit ? (editData.audio_url ?? null) : null;
      if (audioFile) {
        const ext = audioFile.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("audio").upload(path, audioFile);
        if (upErr) throw upErr;
        finalAudioUrl = supabase.storage.from("audio").getPublicUrl(path).data.publicUrl;
      }

      const durTotal = durRef.current != null
        ? Math.round(durRef.current)
        : (parseInt(durMin) || 0) * 60 + (parseInt(durSec) || 0);

      if (isEdit) {
        const updatePayload = {
          title: title.trim(),
          cover_url: coverUrl,
          audio_url: finalAudioUrl,
          ...(audioFile ? { audio_name: audioFile.name } : {}),
          genre: genre || null,
          ...(durTotal > 0 ? { duration: durTotal } : {}),
        };
        const { data, error } = await supabase.from("tracks").update(updatePayload).eq("id", editData.id).select().single();
        if (error) throw error;
        const saved = data ?? { ...editData, ...updatePayload };
        handleClose();
        onSaved?.(saved);
      } else {
        const { data, error } = await supabase.from("tracks").insert({
          title: title.trim(),
          artist: displayName,
          author_id: userId,
          cover_url: coverUrl,
          audio_url: finalAudioUrl,
          audio_name: audioFile?.name ?? null,
          genre: genre || null,
          duration: durTotal || null,
          type: "song",
        }).select().single();
        if (error) throw error;
        showToast("음원을 업로드했습니다", "success", undefined, "music");
        handleClose();
        if (data?.id) navigate(`/track/${data.id}`);
      }
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
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "90px 24px 80px",
        overflowY: "auto",
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragEnter={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={e => { e.preventDefault(); setDragging(false); }}
      onDrop={handleDrop}
    >
      <div style={{
        width: "100%", maxWidth: 640,
        background: "rgba(22,22,26,0.96)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 20,
        boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        flexShrink: 0,
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          height: 60, padding: "0 12px 0 18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px 20px 0 0",
        }}>
          <button
            onClick={handleClose}
            style={{ all: "unset", boxSizing: "border-box", height: 36, padding: "0 6px", display: "inline-flex", alignItems: "center", color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: 500, cursor: "pointer", borderRadius: 8, transition: "color 120ms" }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
          >{ml("k005")}</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{isEdit ? "Edit Track" : "New Track"}</div>
          </div>
          <button
            onClick={handleUpload}
            disabled={!canUpload || loading}
            style={{
              all: "unset", boxSizing: "border-box", height: 36, padding: "0 18px", borderRadius: 999,
              background: canUpload && !loading ? "#FC3C44" : "rgba(255,255,255,0.08)",
              color: canUpload && !loading ? "#fff" : "rgba(255,255,255,0.25)",
              fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", cursor: canUpload && !loading ? "pointer" : "not-allowed",
              display: "inline-flex", alignItems: "center", whiteSpace: "nowrap",
              transition: "background 150ms, color 150ms",
            }}
          >{loading ? (isEdit ? (ml("k072")) : (ml("k073"))) : (isEdit ? (ml("k074")) : (ml("k026")))}</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 22px 26px" }}>

          {/* Hero: cover + title */}
          <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
            {/* Cover */}
            <div
              onClick={() => coverInputRef.current?.click()}
              style={{ width: 180, height: 180, flexShrink: 0, position: "relative", cursor: "pointer" }}
            >
              <img loading="eager" decoding="async" src={cdImg} alt="cd" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", zIndex: 1 }} />
              {!cover && (
                <div style={{
                  position: "absolute", inset: "-2px", zIndex: 2,
                  backgroundImage: "linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)",
                  backgroundSize: "6px 6px",
                  backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                  backgroundColor: "#333",
                  WebkitMaskImage: "radial-gradient(circle at 50% 49.8%, transparent 20px, black 21px), radial-gradient(circle at 50% 49.8%, black, black 87px, transparent 90px)",
                  WebkitMaskComposite: "source-in, source-over",
                  maskImage: "radial-gradient(circle at 50% 49.8%, transparent 20px, black 21px), radial-gradient(circle at 50% 49.8%, black, black 87px, transparent 90px)",
                  maskComposite: "intersect, add",
                }} />
              )}
              {cover && (
                <div style={{
                  position: "absolute", inset: "-2px", zIndex: 2,
                  backgroundImage: `url(${cover.url})`,
                  backgroundSize: "95.5%", backgroundPosition: "center",
                  WebkitMaskImage: "radial-gradient(circle at 50% 49.8%, transparent 20px, black 21px), radial-gradient(circle at 50% 49.8%, black, black 87px, transparent 90px)",
                  WebkitMaskComposite: "source-in, source-over",
                  maskImage: "radial-gradient(circle at 50% 49.8%, transparent 20px, black 21px), radial-gradient(circle at 50% 49.8%, black, black 87px, transparent 90px)",
                  maskComposite: "intersect, add",
                }} />
              )}
              <div style={{
                position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
                borderRadius: "50%",
                background: "radial-gradient(circle closest-side, transparent 97.5%, rgba(200,210,230,0.25) 98.5%, rgba(160,170,195,0.15) 100%)",
              }} />
              <div style={{
                position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
                borderRadius: "50%", overflow: "hidden",
                boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.3), inset 0 0 8px rgba(0,0,0,0.4), inset 0 -1px 2px rgba(255,255,255,0.1)",
                WebkitMaskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
                maskImage: "radial-gradient(circle at 50% 50.5%, transparent 14%, black 15%)",
              }} />
              <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={e => { if (e.target.files[0]) loadCoverFile(e.target.files[0]); }} />
            </div>

            {/* Title + artist */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 7 }}>{ml("k075")}</div>
              <textarea
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={80}
                rows={1}
                placeholder={ml("k076")}
                style={{ width: "100%", background: "transparent", border: 0, outline: 0, color: "#fff", fontFamily: "inherit", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3, padding: 0, resize: "none", overflow: "hidden", wordBreak: "break-word" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#FC3C44,#7c2d12)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)", overflow: "hidden" }}>
                  {avatarUrl ? <img loading="eager" decoding="async" src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : avatarInitial}
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                  {profile?.handle ? `@${profile.handle}` : `@${session?.user?.email?.split("@")[0] ?? ""}`}
                </span>
              </div>
            </div>
          </div>

          {/* Audio + Genre: 50/50 row */}
          <div style={{ marginTop: 44, display: "flex", gap: 14, alignItems: "flex-start" }}>

            {/* Left: Audio file */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                  {ml("k077")} <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>(WAV · MP3 · FLAC)</span>
                </div>
              </div>
              <div
                onClick={() => audioInputRef.current?.click()}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  height: 56, padding: "0 14px", borderRadius: 10,
                  background: dragging ? "rgba(252,60,68,0.05)" : "rgba(255,255,255,0.04)",
                  border: dragging ? "1px solid #FC3C44" : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer", transition: "border-color 150ms, background 150ms",
                }}
              >
                {(audioFile || audioUrl) ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FC3C44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                    </svg>
                    <span style={{ fontSize: 13, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {audioFile ? audioFile.name : (audioName ?? null)}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>{ml("k078")}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(252,60,68,0.12)", color: "#FC3C44" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{ml("k025")}</span>
                  </div>
                )}
              </div>
              <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: "none" }}
                onChange={e => { if (e.target.files?.[0]) loadAudioFile(e.target.files[0]); }}
              />

              {/* Waveform */}
              {waveBars.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 28, marginTop: 8, padding: "0 2px" }}>
                  {waveBars.map((h, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: 2, minWidth: 2, height: `${h}%`, background: "linear-gradient(180deg, #FC3C44, rgba(255,46,136,0.55))", opacity: 0.55 }} />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Genre dropdown */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em", marginBottom: 10 }}>{ml("k003")}<span style={{ color: "#FC3C44", marginLeft: 3 }}>*</span></div>
              <GenreDropdown genre={genre} onToggle={toggleGenre} lang={lang} />
            </div>

          </div>

          {/* Divider + footer */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "26px 0 0" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            {ml("k079")}
          </div>
        </div>
      </div>
    </div>
  );
}
