const ACCENT = "#374151";

export default function ConstructionPhasesPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Master List
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          Construction Phases
        </h1>
        <p style={{ margin: "0 0 0.5rem", color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
          Admin-controlled master list of construction phases (e.g. Structural, Architectural, MEP) — referenced by NTPs, BOM, and milestone definitions.
        </p>
        <div style={{ marginBottom: "1.5rem", paddingLeft: "1.25rem" }}>
          <span style={{
            display: "inline-block", padding: "0.15rem 0.6rem",
            background: "#fee2e2", color: "#b91c1c",
            borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em",
          }}>
            ADMIN WRITE-ONLY
          </span>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🏗️</div>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "0.5rem", fontWeight: 600 }}>
            Module Under Development
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", maxWidth: "480px", margin: "0 auto" }}>
            Construction Phases is an Admin-sovereign master list. Only Admin can create, edit, or retire phases. All other modules (NTP, BOM, Milestones, QA) reference this list — they cannot override it.
          </p>
        </div>
      </div>
    </main>
  );
}
