export default function DtrPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/hr" style={{ fontSize: "0.8rem", color: "#6b7280", textDecoration: "none" }}>← HR & Payroll</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>DTR</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Daily Time Records — upload, review, and manage employee attendance.</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a href="/hr/dtr-upload" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#4b5563",
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Upload DTR</a>
            <a href="/hr/log-dtr" style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#fff",
              color: "#4b5563", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
              border: "1px solid #d1d5db",
            }}>+ Log DTR Entry</a>
          </div>
        </div>
        <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
          Module under construction
        </div>
      </div>
    </main>
  );
}
