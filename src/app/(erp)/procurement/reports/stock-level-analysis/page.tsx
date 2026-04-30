export default function StockLevelAnalysisPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: "#e3a008", textDecoration: "none" }}>← Procurement & Stock</a>
        </div>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Stock Level Analysis</h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>Current stock on hand versus minimum reorder levels across all sites.</p>
        <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
          Report under construction — will display stock on hand, reorder points, and slow-moving inventory.
        </div>
      </div>
    </main>
  );
}
