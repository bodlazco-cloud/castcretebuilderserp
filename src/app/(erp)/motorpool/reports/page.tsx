export default function MotorpoolReportsPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.8rem", color: "#0694a2", textDecoration: "none" }}>← Motorpool</a>
        </div>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Motorpool Reports</h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>Reports and analytics for fleet and equipment operations.</p>
        <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
          No reports configured yet. Reports will appear here as they are built.
        </div>
      </div>
    </main>
  );
}
