export default function MasterListPage() {
  const primary = [
    { label: "Projects / Sites",      href: "/master-list/projects",      desc: "All project contracts, statuses, and developer links" },
    { label: "Scope of Work",         href: "/master-list/sow",            desc: "Activity definitions and scope items per project" },
    { label: "Materials Master",      href: "/master-list/materials",      desc: "Materials catalog used across BOM and procurement" },
    { label: "Vendors",               href: "/master-list/vendors",        desc: "Approved vendor accreditation and price history" },
    { label: "Subcontractors",        href: "/master-list/subcontractors", desc: "Accredited subcontractors, grades, and scores" },
    { label: "Developers",            href: "/master-list/developers",     desc: "Developer master list linked to project contracts" },
  ];
  const reference = [
    { label: "Suppliers",             href: "/admin/suppliers",            desc: "Preferred supplier register linked to materials" },
    { label: "Activity Definitions",  href: "/admin/activity-defs",        desc: "Reusable scope and activity code templates" },
    { label: "Milestone Definitions", href: "/admin/milestone-defs",       desc: "Billing milestones and completion triggers per project" },
    { label: "BOM Standards",         href: "/admin/bom-standards",        desc: "Standard bill of materials per activity and unit model" },
    { label: "Developer Rate Cards",  href: "/admin/rate-cards",           desc: "Gross rates per unit with retention, DP recoupment, and tax" },
  ];

  const cardStyle = (accent: string): React.CSSProperties => ({
    display: "block", padding: "1.25rem 1.5rem",
    background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
    textDecoration: "none", borderLeft: `4px solid ${accent}`,
  });

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Master List</h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Reference data used across all modules — projects, scope, materials, vendors, parties, and standards.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {primary.map((item) => (
            <a key={item.href} href={item.href} style={cardStyle("#6366f1")}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem" }}>{item.label}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{item.desc}</div>
            </a>
          ))}
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9ca3af" }}>
            Reference Data
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {reference.map((item) => (
            <a key={item.href} href={item.href} style={cardStyle("#0369a1")}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem" }}>{item.label}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{item.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
