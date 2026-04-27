const DEPARTMENTS = [
  { label: "Planning & Engineering",  href: "/planning",     color: "#1a56db" },
  { label: "Audit & Quality",          href: "/audit",        color: "#7e3af2" },
  { label: "Construction (Sites)",     href: "/construction", color: "#057a55" },
  { label: "Procurement & Stock",      href: "/procurement",  color: "#e3a008" },
  { label: "Batching Plant",           href: "/batching",     color: "#e02424" },
  { label: "Motorpool",                href: "/motorpool",    color: "#0694a2" },
  { label: "Finance & Accounting",     href: "/finance",      color: "#ff5a1f" },
  { label: "HR & Payroll",             href: "/hr",           color: "#6b7280" },
];

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", padding: "2rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>Castcrete 360</h1>
        <p style={{ margin: "0.25rem 0 0", color: "#6b7280" }}>BOD Dashboard — Select a department</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
        {DEPARTMENTS.map((dept) => (
          <a
            key={dept.href}
            href={dept.href}
            style={{
              display: "block",
              padding: "1.5rem",
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              textDecoration: "none",
              borderLeft: `4px solid ${dept.color}`,
              color: "#111",
              fontWeight: 600,
              fontSize: "0.95rem",
              transition: "box-shadow 0.15s",
            }}
          >
            {dept.label}
          </a>
        ))}
      </div>
    </main>
  );
}
