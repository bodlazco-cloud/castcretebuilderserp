export const dynamic = "force-dynamic";
import { db } from "@/db";
import { developers, projects, invoices, payables } from "@/db/schema";
import { eq, ne, sum, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

const fmtPhp = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.min(Math.round((numerator / denominator) * 100), 100);
}

export default async function DeveloperSummaryReportPage() {
  await getAuthUser();

  const [devList, projectList, invoiceAgg, payableAgg] = await Promise.all([
    db
      .select({ id: developers.id, name: developers.name })
      .from(developers)
      .where(eq(developers.isActive, true)),

    db
      .select({
        id:               projects.id,
        name:             projects.name,
        developerId:      projects.developerId,
        contractValue:    projects.contractValue,
        developerAdvance: projects.developerAdvance,
        advanceRecovered: projects.advanceRecovered,
        status:           projects.status,
      })
      .from(projects)
      .where(ne(projects.status, "CANCELLED")),

    // Billing and collection per project — exclude DRAFT invoices from billed total
    db
      .select({
        projectId:       invoices.projectId,
        totalBilled:     sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} != 'DRAFT' THEN ${invoices.grossAccomplishment}::numeric ELSE 0 END), 0)`,
        totalCollected:  sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'COLLECTED' THEN ${invoices.collectionAmount}::numeric ELSE 0 END), 0)`,
        invoiceCount:    sql<number>`COUNT(CASE WHEN ${invoices.status} != 'DRAFT' THEN 1 END)`,
      })
      .from(invoices)
      .groupBy(invoices.projectId),

    // Subcon cost per project — only PAID payables
    db
      .select({
        projectId:   payables.projectId,
        subconCost:  sql<string>`COALESCE(SUM(CASE WHEN ${payables.status} = 'PAID' THEN ${payables.netPayable}::numeric ELSE 0 END), 0)`,
      })
      .from(payables)
      .groupBy(payables.projectId),
  ]);

  // Build lookup maps
  type InvAgg  = typeof invoiceAgg[0];
  type PayAgg  = typeof payableAgg[0];
  type Project = typeof projectList[0];
  type DevEntry = { id: string; name: string; projects: Project[] };

  const invoiceMap = new Map<string, InvAgg>(invoiceAgg.map((r) => [r.projectId, r]));
  const payableMap = new Map<string, PayAgg>(payableAgg.map((r) => [r.projectId, r]));

  // Group projects under each developer
  const devMap = new Map<string, DevEntry>();
  for (const d of devList) devMap.set(d.id, { id: d.id, name: d.name, projects: [] });
  for (const p of projectList) devMap.get(p.developerId)?.projects.push(p);
  const devRows = [...devMap.values()].filter((d) => d.projects.length > 0);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Finance & Accounting
          </a>
        </div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
          Developer Collection Summary
        </h1>
        <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
          Billings issued vs collections received per developer. Margin = contract value − paid subcon cost.
        </p>

        {devRows.length === 0 && (
          <div style={{ background: "#fff", borderRadius: "8px", padding: "3rem", textAlign: "center", color: "#9ca3af" }}>
            No active developer projects found.
          </div>
        )}

        {devRows.map((dev) => {
          // Developer-level roll-ups
          let devContractTotal   = 0;
          let devBilledTotal     = 0;
          let devCollectedTotal  = 0;
          let devSubconTotal     = 0;

          const projectRows = dev.projects.map((p) => {
            const inv        = invoiceMap.get(p.id);
            const pay        = payableMap.get(p.id);
            const contract   = Number(p.contractValue);
            const billed     = Number(inv?.totalBilled    ?? 0);
            const collected  = Number(inv?.totalCollected ?? 0);
            const subconCost = Number(pay?.subconCost     ?? 0);
            const margin     = contract - subconCost;
            const outstanding = billed - collected;

            devContractTotal  += contract;
            devBilledTotal    += billed;
            devCollectedTotal += collected;
            devSubconTotal    += subconCost;

            return { p, contract, billed, collected, subconCost, margin, outstanding, invoiceCount: Number(inv?.invoiceCount ?? 0) };
          });

          const devMargin      = devContractTotal - devSubconTotal;
          const devOutstanding = devBilledTotal - devCollectedTotal;

          return (
            <div key={dev.id} style={{ marginBottom: "2rem", background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {/* Developer header */}
              <div style={{ padding: "1rem 1.5rem", background: ACCENT, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{dev.name}</div>
                <div style={{ display: "flex", gap: "2rem", fontSize: "0.8rem" }}>
                  {[
                    { label: "Contract", value: fmtPhp(devContractTotal) },
                    { label: "Billed",   value: fmtPhp(devBilledTotal) },
                    { label: "Collected", value: fmtPhp(devCollectedTotal) },
                    { label: "Margin",   value: fmtPhp(devMargin), bold: true },
                  ].map(({ label, value, bold }) => (
                    <div key={label} style={{ textAlign: "right" }}>
                      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                      <div style={{ fontWeight: bold ? 700 : 500, fontSize: "0.85rem" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-project rows */}
              {projectRows.map(({ p, contract, billed, collected, subconCost, margin, outstanding, invoiceCount }) => {
                const billedPct    = pct(billed,    contract);
                const collectedPct = pct(collected, billed);

                return (
                  <div key={p.id} style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.9rem" }}>{p.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.1rem" }}>
                          {p.status} · {invoiceCount} invoice{invoiceCount !== 1 ? "s" : ""} billed
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                        {[
                          { label: "Contract Value",  value: fmtPhp(contract),  color: "#1a56db" },
                          { label: "Subcon Cost",     value: fmtPhp(subconCost), color: "#d97706" },
                          { label: "Margin",          value: fmtPhp(margin),    color: margin >= 0 ? "#057a55" : "#dc2626" },
                          { label: "Outstanding",     value: fmtPhp(outstanding), color: outstanding > 0 ? "#dc2626" : "#057a55" },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.67rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                            <div style={{ fontWeight: 700, fontSize: "0.85rem", color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Billing progress */}
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {[
                        { label: "Billed to Developer", amount: billed,    pctVal: billedPct,    color: "#3b82f6" },
                        { label: "Collected (vs billed)", amount: collected, pctVal: collectedPct, color: "#10b981" },
                      ].map(({ label, amount, pctVal, color }) => (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                            <span>{label}</span>
                            <span style={{ fontWeight: 600, color: "#374151" }}>{fmtPhp(amount)} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({pctVal}%)</span></span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pctVal}%`, background: color, borderRadius: "999px", transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Advance recovery */}
                    {Number(p.developerAdvance) > 0 && (
                      <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.85rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e5e7eb", display: "flex", gap: "1.5rem", fontSize: "0.78rem", color: "#6b7280" }}>
                        <span>Developer Advance: <strong style={{ color: "#374151" }}>{fmtPhp(Number(p.developerAdvance))}</strong></span>
                        <span>Recovered: <strong style={{ color: "#057a55" }}>{fmtPhp(Number(p.advanceRecovered))}</strong></span>
                        <span>Remaining: <strong style={{ color: "#d97706" }}>{fmtPhp(Number(p.developerAdvance) - Number(p.advanceRecovered))}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Developer outstanding footer */}
              {devOutstanding > 0 && (
                <div style={{ padding: "0.85rem 1.5rem", background: "#fef2f2", borderTop: "1px solid #fecaca", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                  <span style={{ color: "#7f1d1d", fontWeight: 600 }}>Total Outstanding from {dev.name}</span>
                  <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.95rem" }}>{fmtPhp(devOutstanding)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
