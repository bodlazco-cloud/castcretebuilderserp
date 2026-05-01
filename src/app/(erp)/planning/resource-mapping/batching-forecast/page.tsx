const ACCENT = "#1a56db";

export default function BatchingForecastPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Planning & Engineering
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          Batching Forecast
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
          Concrete volume requirements projected from active construction NTPs and Master BOM mix design specs.
        </p>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🏗️</div>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "0.5rem", fontWeight: 600 }}>
            Module Under Development
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", maxWidth: "480px", margin: "0 auto" }}>
            This view will project concrete volume and mix design requirements per project block, feeding directly into the Batching Plant production schedule.
          </p>
        </div>
      </div>
    </main>
  );
}
