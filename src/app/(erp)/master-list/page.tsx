export default function MasterListPage() {
  const sections = [
    {
      heading: "Parties & Entities",
      items: [
        { label: "Projects / Sites",      href: "/master-list/projects",          desc: "All project contracts, statuses, and developer links" },
        { label: "Subcontractors",         href: "/master-list/subcontractors",    desc: "Accredited subcontractors, grades, and performance scores" },
        { label: "Developers",             href: "/master-list/developers",        desc: "Developer master list linked to project contracts" },
        { label: "Suppliers / Vendors",    href: "/admin/suppliers",               desc: "Approved vendor accreditation and pricing" },
      ],
    },
    {
      heading: "Materials & Costing",
      items: [
        { label: "Materials & Pricing",    href: "/admin/materials",               desc: "Materials catalog used across BOM and procurement" },
        { label: "Cost Centers",           href: "/admin/cost-centers",            desc: "Project, batching, fleet, and HQ cost centers" },
      ],
    },
    {
      heading: "Work Standards",
      items: [
        { label: "Scope of Work",          href: "/admin/activity-defs",           desc: "Activity definitions and scope items — generic across all sites" },
        { label: "Milestone Definitions",  href: "/admin/milestone-defs",          desc: "Billing milestone triggers and weight percentages" },
        { label: "BOM Standards",          href: "/admin/bom-standards",           desc: "Bill of materials per activity and unit model" },
      ],
    },
    {
      heading: "Rate Cards",
      items: [
        { label: "Developer Rate Cards",      href: "/admin/rate-cards",           desc: "Contract rates per developer and unit model" },
        { label: "Subcontractor Rate Cards",  href: "/admin/subcon-rate-cards",    desc: "Budgeted subcontractor rates set by Planning" },
      ],
    },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Master List</h1>
        <p style={{ margin: "0 0 2.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
          Reference data used across all modules — parties, materials, work definitions, and rate standards.
        </p>

        {sections.map((section) => (
          <div key={section.heading} style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280", marginBottom: "0.75rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.4rem" }}>
              {section.heading}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
              {section.items.map((item) => (
                <a key={item.href} href={item.href} style={{ display: "block", padding: "1rem 1.25rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textDecoration: "none", border: "1px solid #f3f4f6" }}>
                  <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem", fontSize: "0.9rem" }}>{item.label}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.4 }}>{item.desc}</div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
