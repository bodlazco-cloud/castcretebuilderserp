export const dynamic = "force-dynamic";
import { db } from "@/db";
import { cashFlowProjections, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

export default async function CashFlowPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:                      cashFlowProjections.id,
      projectionDate:          cashFlowProjections.projectionDate,
      periodDays:              cashFlowProjections.periodDays,
      currentBankBalance:      cashFlowProjections.currentBankBalance,
      verifiedReceivables:     cashFlowProjections.verifiedReceivables,
      approvedPayables:        cashFlowProjections.approvedPayables,
      projectedMaterialOutflow: cashFlowProjections.projectedMaterialOutflow,
      projectedLaborOutflow:   cashFlowProjections.projectedLaborOutflow,
      projectedInflow:         cashFlowProjections.projectedInflow,
      netGap:                  cashFlowProjections.netGap,
      isBelowBuffer:           cashFlowProjections.isBelowBuffer,
      alertSent:               cashFlowProjections.alertSent,
      generatedAt:             cashFlowProjections.generatedAt,
      projName:                projects.name,
      projId:                  projects.id,
    })
    .from(cashFlowProjections)
    .leftJoin(projects, eq(cashFlowProjections.projectId, projects.id))
    .orderBy(desc(cashFlowProjections.projectionDate));

  const belowBuffer = rows.filter((r) => r.isBelowBuffer).length;
  const fmt = (v: string | null) =>
    v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Cash Flow Projections</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {rows.length} projection{rows.length !== 1 ? "s" : ""}
            {belowBuffer > 0 && <span style={{ marginLeft: "0.5rem", color: "#b91c1c", fontWeight: 600 }}>· {belowBuffer} below buffer threshold</span>}
          </p>
        </div>

        {belowBuffer > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
            <strong style={{ color: "#b91c1c" }}>⚠ Cash Buffer Alert:</strong>
            <span style={{ color: "#b91c1c", marginLeft: "0.5rem" }}>
              {belowBuffer} project{belowBuffer !== 1 ? "s have" : " has"} projected cash gaps below the safety buffer. Review and arrange additional financing.
            </span>
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No cash flow projections yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {rows.map((r) => {
              const netGap = Number(r.netGap ?? 0);
              const isNeg = netGap < 0;
              return (
                <div key={r.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", borderLeft: `4px solid ${r.isBelowBuffer ? "#b91c1c" : "#057a55"}` }}>
                  <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{r.projName ?? "—"}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.1rem" }}>
                        Projection for {r.projectionDate} · {Number(r.periodDays)} day period
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {r.isBelowBuffer && (
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#fef2f2", color: "#b91c1c" }}>BELOW BUFFER</span>
                      )}
                      {r.alertSent && (
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#fef9c3", color: "#713f12" }}>ALERT SENT</span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: "1rem 1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
                      {[
                        { label: "Bank Balance",      value: fmt(r.currentBankBalance),      color: "#111827" },
                        { label: "Verified Receivables", value: fmt(r.verifiedReceivables),  color: "#057a55" },
                        { label: "Approved Payables", value: fmt(r.approvedPayables),        color: "#b91c1c" },
                        { label: "Material Outflow",  value: fmt(r.projectedMaterialOutflow), color: "#b91c1c" },
                        { label: "Labor Outflow",     value: fmt(r.projectedLaborOutflow),   color: "#b91c1c" },
                        { label: "Projected Inflow",  value: fmt(r.projectedInflow),         color: "#057a55" },
                        { label: "Net Gap",           value: fmt(r.netGap),                  color: isNeg ? "#b91c1c" : "#057a55" },
                      ].map((f) => (
                        <div key={f.label}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.2rem" }}>{f.label}</div>
                          <div style={{ fontFamily: "monospace", fontWeight: 700, color: f.color, fontSize: "0.95rem" }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
