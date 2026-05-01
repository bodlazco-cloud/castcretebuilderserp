const ACCENT = "#374151";

export default function GlobalConfigPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Admin Settings
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          Global Configurations
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
          System-wide rules: dual-auth thresholds, fiscal year settings, currency, and Admin Sovereignty controls.
        </p>

        {/* Config summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            {
              label: "Dual-Auth Threshold",
              value: "₱50,000",
              desc: "Transactions above this amount require BOD / Head of Finance co-approval before release.",
            },
            {
              label: "Revenue Recognition",
              value: "Completed Contract",
              desc: "Revenue is deferred until Architectural Turnover milestone is Audit-certified.",
            },
            {
              label: "Admin Sovereignty",
              value: "Enforced",
              desc: "Material rates, mix designs, and BOM standards are write-protected — Admin only.",
            },
            {
              label: "Attachment Rule",
              value: "Required",
              desc: "File attachment (PDF/photo) required on all Banking and Payables records before approval.",
            },
          ].map((cfg) => (
            <div key={cfg.label} style={{
              background: "#fff", borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem",
              borderTop: "3px solid #374151",
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                {cfg.label}
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", marginBottom: "0.35rem" }}>
                {cfg.value}
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#9ca3af", lineHeight: 1.5 }}>
                {cfg.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "0.5rem", fontWeight: 600 }}>
            Full Configuration Editor — Under Development
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.85rem", maxWidth: "480px", margin: "0 auto" }}>
            The configuration editor will allow ADMIN to adjust system-wide thresholds, fiscal settings, internal billing rates (Fleet daily rate, Batching unit price), and notification triggers — all gated behind BOD confirmation.
          </p>
        </div>
      </div>
    </main>
  );
}
