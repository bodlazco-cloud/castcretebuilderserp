export const dynamic = "force-dynamic";
import { db } from "@/db";
import { costCenters, departments, financialLedger } from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  PROJECT:  { bg: "#eff6ff", color: "#1a56db" },
  BATCHING: { bg: "#fef9c3", color: "#713f12" },
  FLEET:    { bg: "#f0fdf4", color: "#057a55" },
  HQ:       { bg: "#f3f4f6", color: "#374151" },
};

export default async function CostCenterPage() {
  await getAuthUser();

  const centers = await db
    .select({
      id:       costCenters.id,
      code:     costCenters.code,
      name:     costCenters.name,
      type:     costCenters.type,
      isActive: costCenters.isActive,
      deptCode: departments.code,
      deptName: departments.name,
    })
    .from(costCenters)
    .leftJoin(departments, eq(costCenters.deptId, departments.id))
    .orderBy(costCenters.code);

  // Per cost-center ledger totals
  const ledgerTotals = await db
    .select({
      costCenterId: financialLedger.costCenterId,
      total:        sql<string>`sum(amount)`.as("total"),
    })
    .from(financialLedger)
    .groupBy(financialLedger.costCenterId);

  const totalsMap = new Map(ledgerTotals.map((r) => [r.costCenterId, Number(r.total ?? 0)]));

  const active   = centers.filter((c) => c.isActive).length;
  const inactive = centers.length - active;

  const fmt = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Cost Centers</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {active} active · {inactive} inactive
          </p>
        </div>

        {centers.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No cost centers configured.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Code", "Name", "Type", "Department", "Ledger Total", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 4 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {centers.map((c) => {
                    const typeSt = TYPE_STYLE[c.type] ?? TYPE_STYLE.HQ;
                    const total = totalsMap.get(c.id) ?? 0;
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: c.isActive ? 1 : 0.55 }}>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>{c.code}</td>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{c.name}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: typeSt.bg, color: typeSt.color }}>
                            {c.type}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{c.deptCode ?? "—"}{c.deptName ? ` — ${c.deptName}` : ""}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", color: total > 0 ? "#111827" : "#9ca3af" }}>
                          {total > 0 ? fmt(total) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: c.isActive ? "#f0fdf4" : "#f3f4f6", color: c.isActive ? "#057a55" : "#9ca3af" }}>
                            {c.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
