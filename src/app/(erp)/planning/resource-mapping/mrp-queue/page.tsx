const ACCENT = "#1a56db";

export default function MrpQueuePage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Planning & Engineering
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          MRP Queue
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
          Material Requirements Planning — auto-generated from active NTPs and the Admin Master BOM.
        </p>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📋</div>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "0.5rem", fontWeight: 600 }}>
            Module Under Development
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", maxWidth: "480px", margin: "0 auto" }}>
            The MRP Queue will surface all material requirements triggered by issued NTPs, cross-referenced against the Admin-controlled Master BOM. Procurement can convert these into Purchase Requisitions with one click.
          </p>
        </div>
      </div>
    </main>
  );
}
