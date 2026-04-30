"use client";

interface ExportButtonsProps {
  excelHref: string;       // e.g. "/api/export/balance-sheet"
  filename:  string;       // e.g. "balance-sheet"
  accent?:   string;
}

export default function ExportButtons({ excelHref, accent = "#ff5a1f" }: ExportButtonsProps) {
  return (
    <div className="no-print" style={{ display: "flex", gap: "0.5rem" }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: "0.45rem 0.9rem", borderRadius: "6px",
          border: "1px solid #d1d5db", background: "#fff",
          fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
          color: "#374151", display: "flex", alignItems: "center", gap: "0.35rem",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Print / PDF
      </button>

      <a
        href={excelHref}
        style={{
          padding: "0.45rem 0.9rem", borderRadius: "6px",
          border: `1px solid ${accent}`, background: accent,
          fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
          color: "#fff", textDecoration: "none",
          display: "flex", alignItems: "center", gap: "0.35rem",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export Excel
      </a>
    </div>
  );
}
