export default function MasterListPage() {
  const items = [
    { label: "Projects / Sites",  href: "/master-list/projects",       desc: "All project contracts, statuses, and developer links" },
    { label: "Scope of Work",     href: "/master-list/sow",             desc: "Activity definitions and scope items per project" },
    { label: "Materials Master",  href: "/master-list/materials",       desc: "Materials catalog used across BOM and procurement" },
    { label: "Vendors",           href: "/master-list/vendors",         desc: "Approved vendor accreditation and price history" },
    { label: "Subcontractors",    href: "/master-list/subcontractors",  desc: "Accredited subcontractors, grades, and scores" },
    { label: "Developers",        href: "/master-list/developers",      desc: "Developer master list linked to project contracts" },
  ];
  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Master List</h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Reference data used across all modules — projects, scope, materials, vendors, and parties.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {items.map((item) => (
            <a key={item.href} href={item.href} style={{
              display: "block", padding: "1.25rem 1.5rem",
              background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textDecoration: "none", borderLeft: "4px solid #6366f1",
            }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem" }}>{item.label}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{item.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
