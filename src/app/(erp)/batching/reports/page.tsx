export const dynamic = "force-dynamic";

const ACCENT = "#1a56db";

const REPORT_SECTIONS = [
  {
    title: "Production",
    icon: "🏭",
    reports: [
      { label: "Daily Pour Log", desc: "Batch-by-batch production record with shift, mix, and volume.", href: "/batching/production" },
      { label: "Log a New Batch", desc: "Record material inputs and volume produced for a pour.", href: "/batching/log-batch" },
      { label: "Yield Analysis", desc: "Theoretical vs. actual yield variance across all mixes and shifts.", href: "/batching/yield" },
    ],
  },
  {
    title: "Mix Design & Recipe",
    icon: "🧪",
    reports: [
      { label: "Mix Design Register", desc: "Full list of mix designs with approval status, design ratios, and BOM.", href: "/batching/recipes" },
    ],
  },
  {
    title: "Internal Purchase Orders",
    icon: "📋",
    reports: [
      { label: "IPO Queue", desc: "All internal purchase orders — pending, in production, delivered, and billed.", href: "/batching/ipo" },
    ],
  },
  {
    title: "Internal Sales",
    icon: "💰",
    reports: [
      { label: "Internal Sales Register", desc: "Concrete deliveries billed to project cost centers.", href: "/batching/internal-sales" },
    ],
  },
  {
    title: "Plant Operations",
    icon: "👷",
    reports: [
      { label: "Plant Manpower", desc: "Daily workforce allocation by project/site assignment.", href: "/batching/manpower" },
    ],
  },
];

export default function BatchingReportsPage() {
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Batching Plant</a>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Batching Plant
          </span>
          <h1 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Reports &amp; Analytics
          </h1>
          <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>
            All batching plant operational reports in one place.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {REPORT_SECTIONS.map((section) => (
            <div key={section.title} style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>{section.icon}</span>
                <h2 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>{section.title}</h2>
              </div>
              <div>
                {section.reports.map((report, i) => (
                  <a
                    key={report.href}
                    href={report.href}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.9rem 1.25rem",
                      borderBottom: i < section.reports.length - 1 ? "1px solid #f3f4f6" : undefined,
                      textDecoration: "none",
                      transition: "background 0.1s",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem" }}>{report.label}</div>
                      <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: "0.1rem" }}>{report.desc}</div>
                    </div>
                    <span style={{ color: ACCENT, fontSize: "1rem", flexShrink: 0 }}>→</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
