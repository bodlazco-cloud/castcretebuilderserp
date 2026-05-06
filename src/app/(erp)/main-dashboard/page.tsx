export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  projects, invoices, payables, bankAccounts,
  employees, equipment, workAccomplishedReports,
  requestsForPayment, batchingProductionLogs,
} from "@/db/schema";
import { count, sum, eq, ne, isNull, and, gte, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const fmtM = (v: string | null | undefined) => {
  const n = Number(v ?? 0);
  if (n >= 1_000_000) return `PHP ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `PHP ${(n / 1_000).toFixed(1)}K`;
  return `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginTop: "0.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#9ca3af", marginBottom: "0.25rem" }}>
        <span>{pct}%</span><span>{value} / {max}</span>
      </div>
      <div style={{ background: "#f3f4f6", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function DonutChart({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={cx + 1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: "13px", fontWeight: 700, fill: "#111827" }}>{pct}%</text>
    </svg>
  );
}

function HBarChart({ bars }: { bars: { label: string; value: number; color: string }[] }) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      {bars.map((b) => (
        <div key={b.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.2rem" }}>
            <span style={{ color: "#374151", fontWeight: 500 }}>{b.label}</span>
            <span style={{ color: "#6b7280", fontFamily: "monospace", fontSize: "0.72rem" }}>{fmtM(String(b.value))}</span>
          </div>
          <div style={{ background: "#f3f4f6", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
            <div style={{
              width: `${Math.round((b.value / maxVal) * 100)}%`,
              height: "100%", background: b.color, borderRadius: "4px",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

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

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const [
    activeProjectsRes, totalProjectsRes, contractValueRes,
    revenueMonthRes, receivablesRes,
    unpaidPayablesRes, cashRes,
    headcountRes, equipTotalRes, equipAssignedRes,
    pendingWarsRes, openInvoicesRes, openRfpRes,
    batchCountRes,
  ] = await Promise.all([
    db.select({ n: count() }).from(projects).where(eq(projects.status, "ACTIVE")),
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
    db.select({ n: count() }).from(batchingProductionLogs)
      .where(gte(batchingProductionLogs.batchDate, thisMonthStart.toISOString().split("T")[0])),
  ]);

  const activeProjects = activeProjectsRes[0]?.n ?? 0;
  const totalProjects  = totalProjectsRes[0]?.n ?? 0;
  const equipTotal     = equipTotalRes[0]?.n ?? 0;
  const equipAssigned  = equipAssignedRes[0]?.n ?? 0;
  const utilPct        = equipTotal > 0 ? Math.round((equipAssigned / equipTotal) * 100) : 0;

  const revenue    = Number(revenueMonthRes[0]?.v ?? 0);
  const receivables= Number(receivablesRes[0]?.v ?? 0);
  const payablesAmt= Number(unpaidPayablesRes[0]?.v ?? 0);
  const cash       = Number(cashRes[0]?.v ?? 0);

  const PIPELINE = [
    { label: "WARs Pending",    count: pendingWarsRes[0]?.n ?? 0,  href: "/construction/war",  color: "#7e3af2", urgent: (pendingWarsRes[0]?.n ?? 0) > 5 },
    { label: "Open Invoices",   count: openInvoicesRes[0]?.n ?? 0, href: "/finance/invoices",  color: "#ff5a1f", urgent: (openInvoicesRes[0]?.n ?? 0) > 10 },
    { label: "RFPs Pending",    count: openRfpRes[0]?.n ?? 0,      href: "/finance/rfp",       color: "#dc2626", urgent: (openRfpRes[0]?.n ?? 0) > 5 },
    { label: "Batches This Mo", count: batchCountRes[0]?.n ?? 0,   href: "/batching/production", color: "#0694a2", urgent: false },
  ];

  const MODULES = [
    { label: "Planning",      href: "/planning",     color: "#1a56db", desc: "BOM · Resource Forecast · Change Orders",      icon: "📐" },
    { label: "Construction",  href: "/construction", color: "#057a55", desc: "NTPs · Daily Progress · WAR",                  icon: "🏗" },
    { label: "Procurement",   href: "/procurement",  color: "#e3a008", desc: "PRs · POs · Inventory",                        icon: "📦" },
    { label: "Batching Plant",href: "/batching",     color: "#e02424", desc: "Standard Mixes · Yield · Internal Sales",      icon: "🏭" },
    { label: "Motorpool",     href: "/motorpool",    color: "#0694a2", desc: "Equipment · Rentals · Fix-or-Flip",             icon: "🚛" },
    { label: "Audit & QA",   href: "/audit",        color: "#7e3af2", desc: "PO Compliance · Triple Match · Inspections",   icon: "🔍" },
    { label: "Finance",       href: "/finance",      color: "#ff5a1f", desc: "Invoices · Payables · P&L · Cash Flow",        icon: "💰" },
    { label: "HR & Payroll",  href: "/hr",           color: "#6b7280", desc: "Employees · DTR · Payroll",                    icon: "👥" },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {error === "unauthorized" && (
          <div style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
            You don&apos;t have permission to access that page.
          </div>
        )}

        <header style={{ marginBottom: "2rem" }}>
          <p style={{ margin: "0 0 0.2rem", fontSize: "0.75rem", color: "#9ca3af", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Executive Overview
          </p>
          <h1 style={{ margin: "0 0 0.2rem", fontSize: "1.75rem", fontWeight: 700, color: "#111827" }}>
            Good day, {displayName.split(" ")[0]}
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </header>

        {/* ── Row 1: Top KPI cards ─────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* Active Projects with progress */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #1a56db" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{activeProjects}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>Active Projects</div>
            <ProgressBar value={activeProjects} max={totalProjects} color="#1a56db" />
          </div>

          {/* Contract Value */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #057a55" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{fmtM(contractValueRes[0]?.v)}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>Contract Value</div>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>All active projects</div>
          </div>

          {/* Revenue This Month */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #0694a2" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{fmtM(String(revenue))}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>Revenue This Month</div>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>Collected invoices</div>
          </div>

          {/* Cash on Hand */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #e3a008" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{fmtM(String(cash))}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>Cash on Hand</div>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>All bank accounts</div>
          </div>

          {/* Headcount */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: "3px solid #6b7280" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{headcountRes[0]?.n ?? 0}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>Active Employees</div>
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.2rem" }}>HR headcount</div>
          </div>
        </div>

        {/* ── Row 2: Financial chart + Fleet gauge ─────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* Financial breakdown chart */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Financial Overview
            </h3>
            <HBarChart bars={[
              { label: "Revenue (This Month)", value: revenue,     color: "#0694a2" },
              { label: "Receivables",          value: receivables, color: "#7e3af2" },
              { label: "Cash on Hand",         value: cash,        color: "#e3a008" },
              { label: "Unpaid Payables",      value: payablesAmt, color: "#dc2626" },
            ]} />
          </div>

          {/* Fleet Utilisation Donut */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Fleet Utilisation
            </h3>
            <DonutChart pct={utilPct} color="#0f766e" size={100} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 500 }}>{equipAssigned} assigned</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af" }}>{equipTotal} total in fleet</div>
            </div>
            <a href="/motorpool" style={{ fontSize: "0.75rem", color: "#0f766e", textDecoration: "none", fontWeight: 600 }}>View Fleet →</a>
          </div>
        </div>

        {/* ── Row 3: Approval Pipeline ──────────────────────────────────────── */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Approval Pipeline
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {PIPELINE.map((p) => (
            <a key={p.label} href={p.href} style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "1rem 1.25rem", background: "#fff", borderRadius: "10px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textDecoration: "none",
              borderLeft: `4px solid ${p.color}`,
              outline: p.urgent ? `2px solid ${p.color}` : "none",
            }}>
              <div style={{
                fontSize: "1.75rem", fontWeight: 700,
                color: p.count > 0 ? p.color : "#9ca3af",
                minWidth: "2rem", textAlign: "center",
              }}>{p.count}</div>
              <div>
                <div style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 600 }}>{p.label}</div>
                {p.urgent && <div style={{ fontSize: "0.68rem", color: p.color, fontWeight: 700, marginTop: "0.1rem" }}>⚠ Needs attention</div>}
              </div>
            </a>
          ))}
        </div>

        {/* ── Row 4: Project status bar ─────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>Project Activation Rate</h3>
            <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{activeProjects} of {totalProjects} active</span>
          </div>
          <div style={{ background: "#f3f4f6", borderRadius: "6px", height: "12px", overflow: "hidden", position: "relative" }}>
            <div style={{
              width: totalProjects > 0 ? `${Math.round((activeProjects / totalProjects) * 100)}%` : "0%",
              height: "100%", background: "linear-gradient(90deg, #1a56db, #0694a2)",
              borderRadius: "6px", transition: "width 0.5s",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
            <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>0</span>
            <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{totalProjects} projects</span>
          </div>
        </div>

        {/* ── Row 5: Module quick-links ─────────────────────────────────────── */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Modules
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {MODULES.map((m) => (
            <a key={m.href} href={m.href} style={{
              display: "flex", alignItems: "flex-start", gap: "0.75rem",
              padding: "1.1rem 1.25rem", background: "#fff", borderRadius: "10px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textDecoration: "none",
              borderLeft: `4px solid ${m.color}`,
              transition: "box-shadow 0.15s",
            }}>
              <span style={{ fontSize: "1.25rem", lineHeight: 1, marginTop: "0.1rem" }}>{m.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.875rem" }}>{m.label}</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>{m.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
