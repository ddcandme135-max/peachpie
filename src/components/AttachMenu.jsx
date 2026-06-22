import { useEffect, useRef } from "react";
import { Triangle, Paperclip, ImagePlus, Camera } from "lucide-react";

export default function AttachMenu({ onClose, triggerRef, onFileSelect, onImageSelect }) {
  const menuRef      = useRef(null);
  const fileInputRef  = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    const fn = e => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        triggerRef?.current && !triggerRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose, triggerRef]);

  const ITEMS = [
    { label: "Drive",  Icon: Triangle,  onClick: null },
    { label: "파일",   Icon: Paperclip, onClick: () => fileInputRef.current?.click() },
    { label: "사진",   Icon: ImagePlus, onClick: () => imageInputRef.current?.click() },
    { label: "카메라", Icon: Camera,    onClick: null },
  ];

  return (
    <>
      <style>{`@keyframes attachIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <input
        ref={fileInputRef} type="file" accept="*/*" style={{ display: "none" }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) { onFileSelect?.(f); onClose(); }
          e.target.value = "";
        }}
      />
      <input
        ref={imageInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) { onImageSelect?.(f); onClose(); }
          e.target.value = "";
        }}
      />

      <div ref={menuRef} style={{
        position: "absolute", bottom: "calc(100% + 8px)", left: 0,
        width: 160, background: "#1C1C1E", borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)", padding: "8px 0",
        animation: "attachIn 200ms ease-out both", zIndex: 200,
      }}>
        {ITEMS.map(({ label, Icon, onClick }) => (
          <div
            key={label}
            onClick={onClick ?? undefined}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px", transition: "background 120ms",
              cursor: onClick ? "pointer" : "default",
            }}
            onMouseEnter={e => { if (onClick) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <Icon size={18} color={onClick ? "white" : "rgba(255,255,255,0.25)"} />
            <span style={{ fontSize: 14, color: onClick ? "white" : "rgba(255,255,255,0.25)" }}>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
