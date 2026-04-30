export default function SiteProfitabilityReportPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: "#057a55", textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Site Profitability Report</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Revenue, costs, and margin breakdown per construction site.</p>
          </div>
        </div>
        <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
          Report under construction — will display revenue, direct costs, overhead, and margin per site.
        </div>
      </div>
    </main>
  );
}
