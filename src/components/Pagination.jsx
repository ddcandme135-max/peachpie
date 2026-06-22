export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 40, paddingBottom: 40 }}>
      {page > 1 ? (
        <PageBtn onClick={() => onChange(page - 1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="10,3 5,8 10,13" />
          </svg>
        </PageBtn>
      ) : (
        <div style={{ width: 36, height: 36, flexShrink: 0 }} />
      )}

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            display: "grid", placeItems: "center",
            fontSize: 13, fontWeight: p === page ? 700 : 400,
            background: p === page ? "#FC3C44" : "transparent",
            color: p === page ? "#fff" : "rgba(255,255,255,0.45)",
            border: p === page ? "none" : "1px solid transparent",
            cursor: "pointer",
            transition: "background 150ms, color 150ms",
          }}
          onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = "transparent"; }}
        >
          {p}
        </button>
      ))}

      <PageBtn disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6,3 11,8 6,13" />
        </svg>
      </PageBtn>
    </div>
  );
}

function PageBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36, height: 36, borderRadius: 10,
        display: "grid", placeItems: "center",
        background: "transparent", border: "none",
        color: disabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.45)",
        cursor: disabled ? "default" : "pointer",
        transition: "color 150ms",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}
