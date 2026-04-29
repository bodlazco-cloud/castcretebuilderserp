export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  projects, invoices, payables, bankAccounts,
  employees, equipment, workAccomplishedReports,
  requestsForPayment,
} from "@/db/schema";
import { count, sum, eq, ne, isNull, and, gte, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const fmtM = (v: string | null | undefined) => {
  const n = Number(v ?? 0);
  if (n >= 1_000_000) return `PHP ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `PHP ${(n / 1_000).toFixed(1)}K`;
  return `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
};

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

  if (!isBod) {
    const deptMap: Record<string, string> = {
      PLANNING: "/planning", CONSTRUCTION: "/construction",
      PROCUREMENT: "/procurement", BATCHING: "/batching",
      MOTORPOOL: "/motorpool", AUDIT: "/audit", FINANCE: "/finance", HR: "/hr",
    };
    const dest = deptMap[deptCode];
    if (dest) {
      return (
        <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>
              Executive Dashboard — BOD Only
            </h1>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
              This dashboard is restricted to Board of Directors members.
            </p>
            <a href={dest} style={{ display: "inline-block", padding: "0.65rem 1.5rem", borderRadius: "6px", background: "#1a56db", color: "#fff", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600 }}>
              Go to {deptCode} Dashboard →
            </a>
          </div>
        </main>
      );
    }
  }

  // Real-time KPI queries
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const [
    activeProjectsRes, contractValueRes,
    revenueMonthRes, receivablesRes,
    unpaidPayablesRes, cashRes,
    headcountRes, equipTotalRes, equipAssignedRes,
    pendingWarsRes, openInvoicesRes, openRfpRes,
  ] = await Promise.all([
    db.select({ n: count() }).from(projects).where(ne(projects.status, "CANCELLED")),
    db.select({ v: sum(projects.contractValue) }).from(projects).where(ne(projects.status, "CANCELLED")),
    db.select({ v: sum(invoices.collectionAmount) })
      .from(invoices)
      .where(and(eq(invoices.status, "COLLECTED"), gte(invoices.collectedAt, thisMonthStart))),
    db.select({ v: sum(invoices.netAmountDue) })
      .from(invoices)
      .where(and(ne(invoices.status, "COLLECTED"), ne(invoices.status, "REJECTED"))),
    db.select({ v: sum(payables.netPayable) })
      .from(payables)
      .where(and(isNull(payables.paidAt), eq(payables.status, "APPROVED"))),
    db.select({ v: sum(bankAccounts.currentBalance) })
      .from(bankAccounts)
      .where(eq(bankAccounts.isActive, true)),
    db.select({ n: count() }).from(employees).where(eq(employees.isActive, true)),
    db.select({ n: count() }).from(equipment),
    db.select({ n: count() }).from(equipment).where(eq(equipment.status, "ASSIGNED")),
    db.select({ n: count() }).from(workAccomplishedReports)
      .where(inArray(workAccomplishedReports.status, ["PENDING_REVIEW", "PENDING_AUDIT", "READY_FOR_APPROVAL"])),
    db.select({ n: count() }).from(invoices)
      .where(inArray(invoices.status, ["DRAFT", "SUBMITTED"])),
    db.select({ n: count() }).from(requestsForPayment)
      .where(inArray(requestsForPayment.status, ["PENDING", "FIRST_APPROVED"])),
  ]);

  const equipTotal    = equipTotalRes[0]?.n ?? 0;
  const equipAssigned = equipAssignedRes[0]?.n ?? 0;
  const utilPct       = equipTotal > 0 ? Math.round((equipAssigned / equipTotal) * 100) : 0;

  const KPI_CARDS = [
    { label: "Active Projects",      value: String(activeProjectsRes[0]?.n ?? 0),     sub: "currently running",           border: "#1a56db" },
    { label: "Total Contract Value", value: fmtM(contractValueRes[0]?.v),              sub: "active projects",             border: "#057a55" },
    { label: "Revenue This Month",   value: fmtM(revenueMonthRes[0]?.v),               sub: "collected invoices",          border: "#0694a2" },
    { label: "Receivables",          value: fmtM(receivablesRes[0]?.v),                sub: "outstanding invoices",        border: "#7e3af2" },
    { label: "Unpaid Payables",      value: fmtM(unpaidPayablesRes[0]?.v),             sub: "approved, awaiting payment",  border: "#dc2626" },
    { label: "Cash on Hand",         value: fmtM(cashRes[0]?.v),                       sub: "across all bank accounts",    border: "#e3a008" },
    { label: "Headcount",            value: String(headcountRes[0]?.n ?? 0),           sub: "active employees",            border: "#6b7280" },
    { label: "Fleet Utilisation",    value: `${utilPct}%`,                             sub: `${equipAssigned} / ${equipTotal} assigned`, border: "#0f766e" },
  ];

  const PIPELINE = [
    { label: "WARs Pending Approval", count: pendingWarsRes[0]?.n ?? 0,  href: "/construction/war",  color: "#7e3af2" },
    { label: "Open Invoices",         count: openInvoicesRes[0]?.n ?? 0, href: "/finance/invoices",  color: "#ff5a1f" },
    { label: "RFPs Pending Release",  count: openRfpRes[0]?.n ?? 0,      href: "/finance/rfp",       color: "#dc2626" },
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

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {error === "unauthorized" && (
          <div style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
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
            Live summary of Castcrete Builders operations.
          </p>
        </header>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {KPI_CARDS.map((kpi) => (
            <div key={kpi.label} style={{ background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${kpi.border}` }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#111827", marginTop: "0.4rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.1rem" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Approval Pipeline */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Approval Pipeline
        </h2>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
          {PIPELINE.map((p) => (
            <a key={p.label} href={p.href} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textDecoration: "none", borderLeft: `4px solid ${p.color}`, minWidth: "200px" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: p.count > 0 ? p.color : "#9ca3af" }}>{p.count}</div>
              <div style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 500 }}>{p.label}</div>
            </a>
          ))}
        </div>

        {/* Module Quick-links */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Modules
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
          {MODULES.map((m) => (
            <a key={m.href} href={m.href} style={{ display: "block", padding: "1.25rem 1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textDecoration: "none", borderLeft: `4px solid ${m.color}` }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "0.25rem" }}>{m.label}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{m.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
