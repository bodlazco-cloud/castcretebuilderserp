import { getAuthUser } from "@/lib/supabase-server";

const DEPARTMENTS = [
  { label: "Planning & Engineering",  href: "/planning",     color: "#1a56db", desc: "BOM · Resource Forecast · Schedule" },
  { label: "Audit & Quality",          href: "/audit",        color: "#7e3af2", desc: "PO Compliance · Triple Match · Inspections" },
  { label: "Construction (Sites)",     href: "/construction", color: "#057a55", desc: "NTPs · Daily Progress · WAR" },
  { label: "Procurement & Stock",      href: "/procurement",  color: "#e3a008", desc: "PRs · POs · Inventory · Transfers" },
  { label: "Batching Plant",           href: "/batching",     color: "#e02424", desc: "Mix Design · Yield · Internal Sales" },
  { label: "Motorpool",                href: "/motorpool",    color: "#0694a2", desc: "Equipment · Rentals · Fix-or-Flip" },
  { label: "Finance & Accounting",     href: "/finance",      color: "#ff5a1f", desc: "Invoices · Payables · Cash Flow" },
  { label: "HR & Payroll",             href: "/hr",           color: "#6b7280", desc: "Employees · DTR · Payroll" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Attempt to load user — null when Supabase env vars are not yet configured
  let user = null;
  try {
    user = await getAuthUser();
  } catch {
    // Supabase not configured yet — show dashboard anyway for local dev
  }

  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Top nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {displayName}
              {deptCode && (
                <span style={{
                  marginLeft: "0.5rem", padding: "0.15rem 0.5rem",
                  background: "#e0e7ff", color: "#3730a3",
                  borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                }}>
                  {deptCode}
                </span>
              )}
            </span>
            <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
              <button
                type="submit"
                style={{
                  padding: "0.4rem 0.85rem", fontSize: "0.8rem",
                  background: "transparent", border: "1px solid #d1d5db",
                  borderRadius: "6px", cursor: "pointer", color: "#374151",
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>

      <div style={{ padding: "2rem" }}>
        {/* Unauthorized error banner */}
        {error === "unauthorized" && (
          <div style={{
            marginBottom: "1.5rem", padding: "0.75rem 1rem",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
          }}>
            You don't have permission to access that page.
          </div>
        )}

        <header style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700 }}>
            BOD Dashboard
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Select a department to view its KPI overview
          </p>
        </header>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
        }}>
          {DEPARTMENTS.map((dept) => (
            <a
              key={dept.href}
              href={dept.href}
              style={{
                display: "block", padding: "1.4rem 1.5rem",
                background: "#fff", borderRadius: "8px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                textDecoration: "none",
                borderLeft: `4px solid ${dept.color}`,
              }}
            >
              <div style={{ fontWeight: 600, color: "#111", marginBottom: "0.3rem" }}>
                {dept.label}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                {dept.desc}
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
