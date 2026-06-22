import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";

export default function PlaylistCreateModal({ onClose, onCreate }) {
  const { t } = useTranslation();
  const [name, setName]         = useState("");
  const [desc, setDesc]         = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverHov, setCoverHov] = useState(false);
  const descRef    = useRef(null);
  const coverRef   = useRef(null);

  async function handleCreate() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setSubmitting(false); return; }

    let cover_url = null;
    if (coverFile) {
      const ext = coverFile.name.split(".").pop();
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("covers").upload(path, coverFile, { contentType: coverFile.type, upsert: false });
      if (!error) cover_url = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
    }

    const { data: pl } = await supabase
      .from("playlists")
      .insert({ title: name.trim(), description: desc.trim() || null, author_id: session.user.id, is_public: isPublic, cover_url })
      .select("id, title, description, cover_url, created_at")
      .single();
    setSubmitting(false);
    if (pl) onCreate?.(pl);
    onClose();
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 500, overflowY: "auto",
        display: "grid", placeItems: "center", padding: "40px 20px",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <style>{`@keyframes plRise { from { opacity:0; transform:translateY(14px) scale(0.985); } to { opacity:1; transform:none; } }`}</style>
      <div style={{
        width: "100%", maxWidth: 524, borderRadius: 24, overflow: "hidden",
        background: "#1C1C1F", border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 40px 100px -24px rgba(0,0,0,0.8)",
        animation: "plRise 420ms cubic-bezier(0.32,0.72,0,1) both",
      }}>

        {/* ── 상단 바 ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ minWidth: 64 }}>
            <button onClick={onClose}
              style={{ all: "unset", cursor: "pointer", fontSize: 15.5, fontWeight: 600, color: "rgba(255,255,255,0.66)", padding: "8px 6px", borderRadius: 8, transition: "color .15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.66)"}
            >{t("common.cancel")}</button>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{t("playlist.new")}</div>
          <div style={{ minWidth: 64, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || submitting}
              style={{
                all: "unset", cursor: name.trim() && !submitting ? "pointer" : "default",
                fontSize: 15.5, fontWeight: 700, padding: "8px 6px", borderRadius: 8,
                color: name.trim() && !submitting ? "#FC3C44" : "rgba(255,255,255,0.24)",
                transition: "color .15s",
              }}
              onMouseEnter={e => { if (name.trim()) e.currentTarget.style.color = "#FF505A"; }}
              onMouseLeave={e => { e.currentTarget.style.color = name.trim() && !submitting ? "#FC3C44" : "rgba(255,255,255,0.24)"; }}
            >{submitting ? t("playlist.creating") : t("playlist.create")}</button>
          </div>
        </div>

        {/* ── 커버 ── */}
        <div style={{ padding: "28px 24px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            onClick={() => coverRef.current?.click()}
            onMouseEnter={() => setCoverHov(true)}
            onMouseLeave={() => setCoverHov(false)}
            style={{
              width: 160, height: 160, borderRadius: 14, position: "relative", overflow: "hidden",
              background: coverPreview ? "#000" : "rgba(255,255,255,0.06)",
              cursor: "pointer",
            }}
          >
            {coverPreview && <img loading="eager" decoding="async" src={coverPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: coverPreview ? (coverHov ? "rgba(0,0,0,0.45)" : "transparent") : "rgba(0,0,0,0.45)", transition: "background 150ms" }}>
              {(!coverPreview || coverHov) && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
            </div>
          </div>
          <input ref={coverRef} type="file" accept="image/*" hidden onChange={async e => {
            const f = e.target.files?.[0];
            if (!f) return;
            e.target.value = "";
            const src = URL.createObjectURL(f);
            const img = new Image();
            img.src = src;
            await new Promise(r => { img.onload = r; });
            const W = img.naturalWidth, H = img.naturalHeight;
            const size = Math.min(W, H);
            const x = (W - size) / 2;
            const y = (H - size) / 2;
            const canvas = document.createElement("canvas");
            canvas.width = 600; canvas.height = 600;
            canvas.getContext("2d").drawImage(img, x, y, size, size, 0, 0, 600, 600);
            URL.revokeObjectURL(src);
            canvas.toBlob(blob => {
              if (!blob) return;
              const cropped = new File([blob], "cover.jpg", { type: "image/jpeg" });
              setCoverFile(cropped);
              setCoverPreview(URL.createObjectURL(cropped));
            }, "image/jpeg", 0.92);
          }} />
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 22 }}>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onClose(); }}
              placeholder={t("playlist.namePlaceholder")}
              maxLength={80}
              style={{
                all: "unset", fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em",
                color: "#fff", width: "100%", lineHeight: 1.2, textAlign: "center",
              }}
            />
            <textarea
              ref={descRef}
              value={desc}
              onChange={e => {
                setDesc(e.target.value);
                if (descRef.current) { descRef.current.style.height = "auto"; descRef.current.style.height = descRef.current.scrollHeight + "px"; }
              }}
              placeholder={t("playlist.descPlaceholder")}
              maxLength={240}
              rows={1}
              style={{
                all: "unset", fontSize: 13.5, color: "rgba(255,255,255,0.5)", width: "100%", lineHeight: 1.45,
                resize: "none", paddingTop: 4, minHeight: 22, display: "block", textAlign: "center",
              }}
            />
          </div>
        </div>

        {/* ── 옵션 ── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* 공개 토글 */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", color: "#fff", background: "rgba(255,255,255,0.05)" }}>
              {isPublic ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M17 9V7a5 5 0 0 0-10 0v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3zM9 7a3 3 0 0 1 6 0v2H9zm4 9.7V18a1 1 0 0 1-2 0v-1.3a1.5 1.5 0 1 1 2 0z"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
                {isPublic ? "공개 플레이리스트" : "비공개 플레이리스트"}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.42)", marginTop: 2 }}>
                {isPublic ? "모든 사람이 이 플레이리스트를 볼 수 있습니다" : "이 플레이리스트는 나만 볼 수 있습니다"}
              </div>
            </div>
            <button
              onClick={() => setIsPublic(p => !p)}
              style={{
                all: "unset", width: 48, height: 29, borderRadius: 999, cursor: "pointer",
                position: "relative", flexShrink: 0,
                background: isPublic ? "#FC3C44" : "rgba(255,255,255,0.08)",
                transition: "background .22s cubic-bezier(0.32,0.72,0,1)",
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: 3, width: 23, height: 23, borderRadius: 999,
                background: "#fff", boxShadow: "0 2px 5px rgba(0,0,0,0.4)", display: "block",
                transition: "transform .22s cubic-bezier(0.32,0.72,0,1)",
                transform: isPublic ? "translateX(19px)" : "translateX(0)",
              }} />
            </button>
          </div>

        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
