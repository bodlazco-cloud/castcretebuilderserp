export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  projects, invoices, payables, bankAccounts,
  employees, equipment, workAccomplishedReports,
  paymentRequests, purchaseOrders,
} from "@/db/schema";
import { count, sum, eq, ne, isNull, and, gte, inArray, gt, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { TrendingUp, AlertCircle, Wallet, Activity, FileText, ClipboardCheck, DollarSign } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ProgressOverview from "@/components/dashboard/ProgressOverview";

const fmtM = (v: string | null | undefined) => {
  const n = Number(v ?? 0);
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
};

export default async function BodCockpit({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let user = null;
  try { user = await getAuthUser(); } catch {}

  const deptCode:    string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";
  const isBod = deptCode === "BOD" || deptCode === "ADMIN" || !deptCode;

  // Non-BOD users are redirected to their home module
  if (!isBod) {
    const deptMap: Record<string, string> = {
      PLANNING: "/planning", CONSTRUCTION: "/construction",
      PROCUREMENT: "/procurement", BATCHING: "/batching",
      MOTORPOOL: "/motorpool", AUDIT: "/audit", FINANCE: "/finance", HR: "/hr",
    };
    const dest = deptMap[deptCode];
    if (dest) {
      return (
        <main style={{ padding: "2rem", minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>
              BOD Cockpit — Board Access Only
            </h1>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.9rem" }}>
              This dashboard is restricted to Board of Directors members.
            </p>
            <a href={dest} style={{ display: "inline-block", padding: "0.65rem 1.5rem", borderRadius: "8px", background: "#1d4ed8", color: "#fff", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600 }}>
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
    activeProjectsRes, contractValueRes,
    revenueMonthRes,   receivablesRes,
    unpaidPayablesRes, cashRes,
    headcountRes,      equipTotalRes, equipAssignedRes,
    pendingWarsRes,    openInvoicesRes, openRfpRes,
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
    db.select({ n: count() }).from(paymentRequests)
      .where(inArray(paymentRequests.status, ["PENDING", "FIRST_APPROVED"])),
  ]);

  // Large POs needing approval (> ₱50k in DRAFT or AUDIT_REVIEW)
  let largePOs: { id: string; totalAmount: string | null; status: string; createdAt: Date }[] = [];
  try {
    largePOs = await db
      .select({ id: purchaseOrders.id, totalAmount: purchaseOrders.totalAmount, status: purchaseOrders.status, createdAt: purchaseOrders.createdAt })
      .from(purchaseOrders)
      .where(and(gt(purchaseOrders.totalAmount, "50000"), inArray(purchaseOrders.status, ["DRAFT", "AUDIT_REVIEW"])))
      .orderBy(desc(purchaseOrders.totalAmount))
      .limit(3);
  } catch { /* migration may not have run yet */ }

  // Computed values
  const equipTotal     = Number(equipTotalRes[0]?.n ?? 0);
  const equipAssigned  = Number(equipAssignedRes[0]?.n ?? 0);
  const utilPct        = equipTotal > 0 ? Math.round((equipAssigned / equipTotal) * 100) : 0;
  const cashVal        = Number(cashRes[0]?.v ?? 0);
  const receivablesVal = Number(receivablesRes[0]?.v ?? 0);
  const payablesVal    = Number(unpaidPayablesRes[0]?.v ?? 0);
  const liquidityRatio = payablesVal > 0
    ? ((cashVal + receivablesVal) / payablesVal).toFixed(2)
    : "—";
  const liquidityHealthy = Number(liquidityRatio) >= 1.2;

  const pendingWars = Number(pendingWarsRes[0]?.n  ?? 0);
  const openInvoices = Number(openInvoicesRes[0]?.n ?? 0);
  const openRfps     = Number(openRfpRes[0]?.n     ?? 0);

  const LOWER_KPIS = [
    { label: "Active Projects",      value: String(activeProjectsRes[0]?.n ?? 0),  sub: "currently running",           color: "#1d4ed8" },
    { label: "Total Contract Value", value: fmtM(contractValueRes[0]?.v),           sub: "active projects",             color: "#059669" },
    { label: "Revenue This Month",   value: fmtM(revenueMonthRes[0]?.v),            sub: "collected invoices",          color: "#0891b2" },
    { label: "Headcount",            value: String(headcountRes[0]?.n ?? 0),        sub: "active employees",            color: "#6b7280" },
    { label: "Fleet Utilisation",    value: `${utilPct}%`,                          sub: `${equipAssigned} / ${equipTotal} assigned`, color: "#0f766e" },
  ];

  const PIPELINE = [
    { label: "WARs Pending Approval", count: pendingWars,  href: "/construction/war",   color: "#7c3aed", icon: <ClipboardCheck size={18} /> },
    { label: "Open Invoices",         count: openInvoices, href: "/finance/invoices",   color: "#ea580c", icon: <FileText size={18} /> },
    { label: "RFPs Pending Release",  count: openRfps,     href: "/finance/rfp",        color: "#dc2626", icon: <DollarSign size={18} /> },
  ];

  const MODULES = [
    { label: "Planning & Engineering", href: "/planning",     color: "#1d4ed8", desc: "BOM · Resource Forecast · Change Orders" },
    { label: "Construction",           href: "/construction", color: "#059669", desc: "NTPs · Daily Progress · WAR" },
    { label: "Procurement & Stock",    href: "/procurement",  color: "#d97706", desc: "PR/PO Management · Inventory · Logistics" },
    { label: "Batching Plant",         href: "/batching",     color: "#e02424", desc: "Mix Design · Yield · Internal Sales" },
    { label: "Fleet (Motorpool)",      href: "/motorpool",    color: "#0891b2", desc: "Equipment · Maintenance · Internal Rentals" },
    { label: "Audit & Quality",        href: "/audit",        color: "#7c3aed", desc: "PO Verification · Milestone Audit · Variance" },
    { label: "Finance & Accounting",   href: "/finance",      color: "#ea580c", desc: "Billing · Payables · P&L · Cash Flow" },
    { label: "Master List",            href: "/master-list",  color: "#374151", desc: "Materials · Vendors · Subcontractors · Phases" },
  ];

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-full space-y-8">
      {/* Unauthorized error */}
      {error === "unauthorized" && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          You don&apos;t have permission to access that page.
        </div>
      )}

      {/* ── 1. HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">BOD COCKPIT</h2>
          <p className="text-slate-500 text-sm font-medium">
            Good day, {displayName.split(" ")[0]} &middot; Real-time Enterprise Health &amp; Solvency
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/finance/reports/cash-flow"
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all text-slate-700">
            Cash Flow Report
          </a>
          <a href="/audit/reports"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
            Audit Reports
          </a>
        </div>
      </div>

      {/* ── 2. PRIMARY KPI CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Cash on Hand"
          value={fmtM(cashRes[0]?.v)}
          description="Across all verified bank accounts"
          icon={<Wallet size={20} className="text-blue-600" />}
        />
        <KpiCard
          title="Receivables"
          value={fmtM(receivablesRes[0]?.v)}
          description="Outstanding developer invoices"
          icon={<TrendingUp size={20} className="text-emerald-600" />}
        />
        <KpiCard
          title="Liquidity Ratio"
          value={liquidityRatio}
          status={liquidityHealthy ? "HEALTHY" : "WATCH"}
          description="(Cash + Receivables) / Payables"
          icon={<Activity size={20} className="text-purple-600" />}
        />
        <KpiCard
          title="Unpaid Payables"
          value={fmtM(unpaidPayablesRes[0]?.v)}
          description="Approved, awaiting payment release"
          icon={<AlertCircle size={20} className="text-orange-600" />}
          trendUp={false}
        />
      </div>

      {/* ── 3. MID TIER: PROGRESS + PRIORITY APPROVALS ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit Turnover Progress */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 text-base">Unit Turnover Progress</h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
              Target: 120 / mo
            </span>
          </div>
          <ProgressOverview />
        </div>

        {/* Priority Approvals — dark panel */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="text-amber-400" />
            Priority Approvals
          </h3>

          <div className="space-y-3 flex-1">
            {PIPELINE.map((p) => (
              <a key={p.label} href={p.href}
                className="block p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors no-underline">
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: p.color }}>{p.icon}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{p.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black" style={{ color: p.count > 0 ? p.color : "#6b7280" }}>
                    {p.count}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">pending</span>
                </div>
              </a>
            ))}

            {/* Large POs needing BOD review */}
            {largePOs.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wide mb-2">
                  POs &gt; ₱50k — Dual Auth Required
                </div>
                {largePOs.map((po) => (
                  <a key={po.id} href={`/procurement/po/${po.id}`}
                    className="block p-3 bg-amber-950 rounded-xl border border-amber-900 mb-2 hover:border-amber-700 transition-colors no-underline">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-amber-200">{fmtM(po.totalAmount)}</span>
                      <span className="text-[9px] bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded font-bold uppercase">
                        {po.status}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. SECONDARY KPI CARDS ───────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Operational Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {LOWER_KPIS.map((kpi) => (
            <div key={kpi.label}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm"
              style={{ borderTop: `3px solid ${kpi.color}` }}>
              <div className="text-xl font-black text-slate-900">{kpi.value}</div>
              <div className="text-sm font-semibold text-slate-700 mt-1">{kpi.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. MODULE QUICK-LINKS ────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULES.map((m) => (
            <a key={m.href} href={m.href}
              className="block p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow no-underline"
              style={{ borderLeft: `4px solid ${m.color}` }}>
              <div className="font-bold text-slate-800 text-sm mb-1">{m.label}</div>
              <div className="text-xs text-slate-400">{m.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
