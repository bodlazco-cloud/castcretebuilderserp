const ACCENT = "#b45309";

export default function PrPoManagementPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Procurement & Stock
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          PR / PO Management
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
          Unified hub for Purchase Requisitions and Purchase Orders — following the Chain of Necessity: NTP → BOM → Resource Forecast → PR → PO.
        </p>

        {/* Quick links to existing PR and PO pages */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          {[
            {
              title: "Purchase Requisitions",
              href: "/procurement/pr",
              desc: "Auto-generated from NTP Resource Forecasts. Requires Audit certification before converting to PO.",
              color: "#1a56db",
            },
            {
              title: "Purchase Orders",
              href: "/procurement/po",
              desc: "Issued only from approved PRs. Any PO > ₱50,000 triggers dual-auth (BOD/Head of Finance).",
              color: "#057a55",
            },
          ].map((card) => (
            <a key={card.href} href={card.href} style={{
              display: "block", padding: "1.5rem", background: "#fff",
              borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textDecoration: "none", borderTop: `3px solid ${card.color}`,
            }}>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
                {card.title}
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.5 }}>
                {card.desc}
              </p>
              <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: card.color, fontWeight: 600 }}>
                Open →
              </div>
            </a>
          ))}
        </div>

        {/* Business rule callout */}
        <div style={{
          background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "8px",
          padding: "1rem 1.25rem",
        }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#92400e", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Chain of Necessity Rule
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#78350f", lineHeight: 1.6 }}>
            Procurement is non-manual. A Purchase Requisition can only be generated from an NTP-triggered Resource Forecast matched against the Admin Master BOM. You cannot order materials that are not BOM-authorised for the active task. Transactions above ₱50,000 require dual authorisation from BOD / Head of Finance before a PO can be released.
          </p>
        </div>
      </div>
    </main>
  );
}
