const ACCENT = "#dc2626";

export default function AuditReportsPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Audit & Quality
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          Audit Reports
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
          Board-level audit reports: material variance, PO compliance trail, milestone certification log, and QA punch-list closure rates.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {[
            { title: "Material Variance Report", href: "/audit/reports/material-variance", desc: "BOM-to-actual quantity and cost deviation per project and material category." },
            { title: "PO Compliance Trail", href: "/audit/po-compliance", desc: "Audit log of all PO verifications — approved, flagged, and rejected." },
            { title: "Milestone Certification Log", href: "/audit/milestone-verification", desc: "Record of all Audit-certified milestones required for Finance payment release." },
            { title: "QA Punch-list Closure", href: "/audit/qa-punch-list", desc: "Open vs closed punch-list items per unit and construction phase." },
          ].map((card) => (
            <a key={card.href} href={card.href} style={{
              display: "block", padding: "1.25rem", background: "#fff",
              borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textDecoration: "none", borderLeft: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#111827", marginBottom: "0.4rem" }}>
                {card.title}
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.5 }}>
                {card.desc}
              </p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
