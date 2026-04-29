export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";

const KPI_CARDS = [
  { label: "Active Projects",      value: "—", sub: "across all sites" },
  { label: "Total Contract Value",  value: "—", sub: "PHP" },
  { label: "Revenue This Month",    value: "—", sub: "PHP" },
  { label: "Outstanding Payables",  value: "—", sub: "PHP" },
  { label: "Headcount",             value: "—", sub: "active employees" },
  { label: "Equipment Utilisation", value: "—", sub: "% fleet active" },
];

const MODULES = [
  { label: "Planning & Engineering", href: "/planning",     color: "#1a56db", desc: "BOM · Resource Forecast · Change Orders" },
  { label: "Construction",           href: "/construction", color: "#057a55", desc: "NTPs · Daily Progress · WAR" },
  { label: "Procurement & Stock",    href: "/procurement",  color: "#e3a008", desc: "PRs · POs · Inventory" },
  { label: "Batching Plant",         href: "/batching",     color: "#e02424", desc: "Mix Design · Yield · Internal Sales" },
  { label: "Motorpool",              href: "/motorpool",    color: "#0694a2", desc: "Equipment · Rentals · Fix-or-Flip" },
  { label: "Audit & Quality",        href: "/audit",        color: "#7e3af2", desc: "PO Compliance · Triple Match · Inspections" },
  { label: "Finance & Accounting",   href: "/finance",      color: "#ff5a1f", desc: "Invoices · Payables · P&L · Cash Flow" },
  { label: "HR & Payroll",           href: "/hr",           color: "#6b7280", desc: "Employees · DTR · Payroll" },
];

export default async function MainDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let user = null;
  try {
    user = await getAuthUser();
  } catch {
    // Supabase not configured — show for local dev
  }

  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";
  const isBod = deptCode === "BOD" || deptCode === "ADMIN" || !deptCode;

  // Non-BOD users: redirect them to their department overview
  if (!isBod) {
    const deptMap: Record<string, string> = {
      PLANNING:     "/planning",
      CONSTRUCTION: "/construction",
      PROCUREMENT:  "/procurement",
      BATCHING:     "/batching",
      MOTORPOOL:    "/motorpool",
      AUDIT:        "/audit",
      FINANCE:      "/finance",
      HR:           "/hr",
    };
    const dest = deptMap[deptCode];
    if (dest) {
      return (
        <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔒</div>
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>
              Executive Dashboard — BOD Only
            </h1>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
              This dashboard is restricted to Board of Directors members. You&apos;ll be taken to your department overview.
            </p>
            <a href={dest} style={{
              display: "inline-block", padding: "0.65rem 1.5rem", borderRadius: "6px",
              background: "#1a56db", color: "#fff", textDecoration: "none",
              fontSize: "0.9rem", fontWeight: 600,
            }}>
              Go to {deptCode} Dashboard →
            </a>
          </div>
        </main>
      );
    }
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {error === "unauthorized" && (
          <div style={{
            marginBottom: "1.5rem", padding: "0.75rem 1rem",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem",
          }}>
            You don&apos;t have permission to access that page.
          </div>
        )}

        <header style={{ marginBottom: "2rem" }}>
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", color: "#9ca3af", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Executive Overview
          </p>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.75rem", fontWeight: 700, color: "#111827" }}>
            Good day, {displayName.split(" ")[0]}
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Here&apos;s a summary of Castcrete Builders operations.
          </p>
        </header>

        {/* KPI grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "1rem", marginBottom: "2.5rem",
        }}>
          {KPI_CARDS.map((kpi) => (
            <div key={kpi.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #1a56db",
            }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#111827", marginTop: "0.4rem" }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.1rem" }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Module quick-links */}
        <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          Modules
        </h2>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
        }}>
          {MODULES.map((m) => (
            <a key={m.href} href={m.href} style={{
              display: "block", padding: "1.25rem 1.5rem",
              background: "#fff", borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              textDecoration: "none", borderLeft: `4px solid ${m.color}`,
            }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem" }}>{m.label}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{m.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
