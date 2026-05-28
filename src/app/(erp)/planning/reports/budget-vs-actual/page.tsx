export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  masterBomEntries, materials, projects,
  purchaseRequisitions, purchaseRequisitionItems,
  purchaseOrders, purchaseOrderItems,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

export default async function BudgetVsActualPage() {
  const [projectList, approvedBom, prItems, poItems] = await Promise.all([
    safe(
      db.select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects).orderBy(projects.name),
      [] as { id: string; name: string; status: string }[],
    ),
    // Approved active BOM lines — the budget
    safe(
      db.select({
          projectId:       masterBomEntries.projectId,
          quantityPerUnit: masterBomEntries.quantityPerUnit,
          adminPrice:      materials.adminPrice,
        })
        .from(masterBomEntries)
        .leftJoin(materials, eq(masterBomEntries.materialId, materials.id))
        .where(and(eq(masterBomEntries.status, "APPROVED"), eq(masterBomEntries.isActive, true))),
      [] as { projectId: string; quantityPerUnit: string; adminPrice: string | null }[],
    ),
    // PR line items — committed spend
    safe(
      db.select({
          projectId:       purchaseRequisitions.projectId,
          status:          purchaseRequisitions.status,
          quantityToOrder: purchaseRequisitionItems.quantityToOrder,
          unitPrice:       purchaseRequisitionItems.unitPrice,
        })
        .from(purchaseRequisitionItems)
        .leftJoin(purchaseRequisitions, eq(purchaseRequisitionItems.prId, purchaseRequisitions.id)),
      [] as { projectId: string | null; status: string; quantityToOrder: string; unitPrice: string }[] as any[],
    ),
    // PO line items — actual spend (issued/delivered POs)
    safe(
      db.select({
          projectId: purchaseOrders.projectId,
          status:    purchaseOrders.status,
          quantity:  purchaseOrderItems.quantity,
          unitPrice: purchaseOrderItems.unitPrice,
        })
        .from(purchaseOrderItems)
        .leftJoin(purchaseOrders, eq(purchaseOrderItems.poId, purchaseOrders.id)),
      [] as { projectId: string; status: string; quantity: string; unitPrice: string }[] as any[],
    ),
  ]);

  // Budget: approved BOM × admin price
  const budgetMap = new Map<string, number>();
  for (const row of approvedBom) {
    const cost = Number(row.quantityPerUnit) * Number(row.adminPrice ?? 0);
    budgetMap.set(row.projectId, (budgetMap.get(row.projectId) ?? 0) + cost);
  }

  // Committed: all non-draft PR lines
  const committedMap = new Map<string, number>();
  for (const row of prItems) {
    if (!row.projectId || row.status === "DRAFT") continue;
    const amt = Number(row.quantityToOrder) * Number(row.unitPrice);
    committedMap.set(row.projectId, (committedMap.get(row.projectId) ?? 0) + amt);
  }

  // Actual: BOD-approved / delivered PO lines (posted to ledger)
  const ACTUAL_STATUSES = new Set(["BOD_APPROVED", "AWAITING_DELIVERY", "PARTIALLY_DELIVERED", "DELIVERED"]);
  const actualMap = new Map<string, number>();
  for (const row of poItems) {
    if (!ACTUAL_STATUSES.has(row.status)) continue;
    const amt = Number(row.quantity) * Number(row.unitPrice);
    actualMap.set(row.projectId, (actualMap.get(row.projectId) ?? 0) + amt);
  }

  const totalBudget    = [...budgetMap.values()].reduce((a, b) => a + b, 0);
  const totalCommitted = [...committedMap.values()].reduce((a, b) => a + b, 0);
  const totalActual    = [...actualMap.values()].reduce((a, b) => a + b, 0);
  const totalVariance  = totalBudget - totalActual;

  const php = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Planning &amp; Engineering</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Budget vs. Actual</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Approved BOM budget against committed PRs and issued PO spend per project.
          </p>
        </div>

        {/* Legend callout */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#1e40af", marginBottom: "1.25rem" }}>
          <strong>Budget</strong> = APPROVED active BOM lines × admin-fixed unit price. &nbsp;|&nbsp;
          <strong>Committed</strong> = non-draft PR lines (qty × price). &nbsp;|&nbsp;
          <strong>Actual</strong> = BOD-approved &amp; delivered PO lines. &nbsp;|&nbsp;
          <strong>Variance</strong> = Budget − Actual.
        </div>

        {/* Summary KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Budget",    value: php(totalBudget),    sub: "Approved BOM × price",   accent: "#7e3af2" },
            { label: "Committed (PRs)", value: php(totalCommitted), sub: "Non-draft PR lines",      accent: "#1a56db" },
            { label: "Actual (POs)",    value: php(totalActual),    sub: "Approved & delivered POs",accent: "#057a55" },
            {
              label: "Variance",
              value: php(Math.abs(totalVariance)),
              sub: totalVariance >= 0 ? "under budget" : "OVER BUDGET",
              accent: totalVariance < 0 ? "#dc2626" : "#057a55",
            },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: "1.25rem 1.5rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: k.label === "Variance" && totalVariance < 0 ? "#dc2626" : "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginTop: "0.3rem" }}>{k.label}</div>
              <div style={{ fontSize: "0.72rem", color: k.label === "Variance" && totalVariance < 0 ? "#dc2626" : "#9ca3af", marginTop: "0.15rem", fontWeight: k.label === "Variance" && totalVariance < 0 ? 700 : 400 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Per-project table */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>Per-Project Breakdown</p>
          </div>
          {projectList.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>No projects found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Project", "Status", "Budget", "Committed", "Actual (POs)", "Variance", "% Used"].map((h) => (
                      <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectList.map((proj, idx) => {
                    const budget    = budgetMap.get(proj.id)    ?? 0;
                    const committed = committedMap.get(proj.id) ?? 0;
                    const actual    = actualMap.get(proj.id)    ?? 0;
                    const variance  = budget - actual;
                    const usedPct   = pct(actual, budget);
                    const overBudget = budget > 0 && actual > budget;
                    const hasData   = budget > 0 || committed > 0 || actual > 0;

                    return (
                      <tr key={proj.id} style={{ borderBottom: idx < projectList.length - 1 ? "1px solid #f3f4f6" : "none", background: overBudget ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{proj.name}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ background: proj.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6", color: proj.status === "ACTIVE" ? "#166534" : "#6b7280", padding: "0.2rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600 }}>
                            {proj.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: budget > 0 ? "#374151" : "#d1d5db" }}>
                          {budget > 0 ? php(budget) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: committed > 0 ? "#1e40af" : "#d1d5db" }}>
                          {committed > 0 ? php(committed) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: overBudget ? "#b91c1c" : actual > 0 ? "#057a55" : "#d1d5db" }}>
                          {actual > 0 ? php(actual) : "—"}
                          {overBudget && <span style={{ marginLeft: "0.3rem", fontSize: "0.68rem", color: "#b91c1c" }}>↑ Over</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: !hasData ? "#d1d5db" : variance < 0 ? "#b91c1c" : "#057a55" }}>
                          {!hasData ? "—" : (variance < 0 ? "−" : "+") + php(Math.abs(variance))}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {budget > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden", minWidth: "60px" }}>
                                <div style={{ height: "100%", width: `${Math.min(usedPct, 100)}%`, background: overBudget ? "#dc2626" : usedPct > 80 ? "#e3a008" : "#057a55", borderRadius: "999px" }} />
                              </div>
                              <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: overBudget ? "#b91c1c" : "#374151", fontWeight: 600, minWidth: "36px" }}>{usedPct}%</span>
                            </div>
                          ) : <span style={{ color: "#d1d5db", fontSize: "0.78rem" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.75rem", textAlign: "right" }}>
          Actual spend sourced from BOD-approved, awaiting delivery, partially delivered, and delivered POs.
        </p>
      </div>
    </main>
  );
}
