export default function InternalRentalLogsPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.8rem", color: "#0694a2", textDecoration: "none" }}>← Motorpool</a>
        </div>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Internal Rental Logs</h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
          Equipment assignments to construction sites — rates, durations, and billing records.
        </p>
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
          <a href="/motorpool/assign" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#0694a2",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Assign Equipment</a>
        </div>
        <div style={{ marginTop: "2rem", padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
          Module under construction
        </div>
      </div>
    </main>
  );
}
