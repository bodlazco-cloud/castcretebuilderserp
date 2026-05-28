export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  masterBomEntries, materials, projects, phaseScopes,
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

export default async function JobCostingBvaPage() {
  const [projectList, bomRows, prItems, poItems] = await Promise.all([
    safe(
      db.select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects).orderBy(projects.name),
      [] as { id: string; name: string; status: string }[],
    ),
    // BOM rows with scope and material category
    safe(
      db.select({
          projectId:       masterBomEntries.projectId,
          scopeId:         masterBomEntries.phaseScopeId,
          scopeName:       phaseScopes.name,
          materialName:    materials.name,
          matCategory:     materials.category,
          quantityPerUnit: masterBomEntries.quantityPerUnit,
          adminPrice:      materials.adminPrice,
        })
        .from(masterBomEntries)
        .leftJoin(materials,    eq(masterBomEntries.materialId, materials.id))
        .leftJoin(phaseScopes,  eq(masterBomEntries.phaseScopeId, phaseScopes.id))
        .where(and(eq(masterBomEntries.status, "APPROVED"), eq(masterBomEntries.isActive, true))),
      [] as { projectId: string; scopeId: string | null; scopeName: string | null; materialName: string | null; matCategory: string | null; quantityPerUnit: string; adminPrice: string | null }[],
    ),
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

  // Per-project budget from BOM
  const budgetMap = new Map<string, number>();
  // Per-project per-category budget
  const catBudgetMap = new Map<string, Map<string, number>>();
  for (const row of bomRows) {
    const cost = Number(row.quantityPerUnit) * Number(row.adminPrice ?? 0);
    budgetMap.set(row.projectId, (budgetMap.get(row.projectId) ?? 0) + cost);
    const cat = row.matCategory ?? "OTHER";
    if (!catBudgetMap.has(row.projectId)) catBudgetMap.set(row.projectId, new Map());
    const catMap = catBudgetMap.get(row.projectId)!;
    catMap.set(cat, (catMap.get(cat) ?? 0) + cost);
  }

  const committedMap = new Map<string, number>();
  for (const row of prItems) {
    if (!row.projectId || row.status === "DRAFT") continue;
    committedMap.set(row.projectId, (committedMap.get(row.projectId) ?? 0) + Number(row.quantityToOrder) * Number(row.unitPrice));
  }

  const ACTUAL_STATUSES = new Set(["BOD_APPROVED", "AWAITING_DELIVERY", "PARTIALLY_DELIVERED", "DELIVERED"]);
  const actualMap = new Map<string, number>();
  for (const row of poItems) {
    if (!ACTUAL_STATUSES.has(row.status)) continue;
    actualMap.set(row.projectId, (actualMap.get(row.projectId) ?? 0) + Number(row.quantity) * Number(row.unitPrice));
  }

  // Collect all categories seen
  const allCats = new Set<string>();
  for (const catMap of catBudgetMap.values()) for (const cat of catMap.keys()) allCats.add(cat);
  const sortedCats = [...allCats].sort();

  const totalBudget    = [...budgetMap.values()].reduce((a, b) => a + b, 0);
  const totalCommitted = [...committedMap.values()].reduce((a, b) => a + b, 0);
  const totalActual    = [...actualMap.values()].reduce((a, b) => a + b, 0);

  const php = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

  const CAT_COLORS: Record<string, { bg: string; color: string }> = {
    CONCRETE:    { bg: "#eff6ff", color: "#1e40af" },
    STEEL:       { bg: "#fef2f2", color: "#b91c1c" },
    LUMBER:      { bg: "#fff7ed", color: "#9a3412" },
    FINISHING:   { bg: "#f5f3ff", color: "#5b21b6" },
    OTHER:       { bg: "#f3f4f6", color: "#6b7280" },
  };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Planning &amp; Engineering</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Job Costing: Budget vs. Actual</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Budget breakdown by material category — planned BOM cost vs. committed PRs and actual PO spend.
          </p>
        </div>

        {/* Callout */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#1e40af", marginBottom: "1.25rem" }}>
          <strong>Budget</strong> = APPROVED active BOM × admin price. &nbsp;|&nbsp;
          <strong>Committed</strong> = non-draft PR lines. &nbsp;|&nbsp;
          <strong>Actual</strong> = BOD-approved &amp; delivered POs. &nbsp;|&nbsp;
          Category columns show budget allocation per material category.
        </div>

        {/* Summary KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Budget",    value: php(totalBudget),    sub: "Approved BOM × admin price", accent: "#7e3af2" },
            { label: "Committed (PRs)", value: php(totalCommitted), sub: "Non-draft PR lines",          accent: "#1a56db" },
            { label: "Actual (POs)",    value: php(totalActual),    sub: "Approved & delivered POs",    accent: "#057a55" },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: "1.25rem 1.5rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "1.7rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginTop: "0.3rem" }}>{k.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.15rem" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Per-project table with category breakdown */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#9ca3af", margin: 0 }}>
              Per-Project Costing Breakdown
            </p>
          </div>
          {projectList.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>No projects found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    <th style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Project</th>
                    <th style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Total Budget</th>
                    <th style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Committed</th>
                    <th style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Actual (POs)</th>
                    <th style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>% Used</th>
                    {sortedCats.map((cat) => {
                      const c = CAT_COLORS[cat] ?? { bg: "#f3f4f6", color: "#6b7280" };
                      return (
                        <th key={cat} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 0.75rem", textAlign: "left", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-block", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700, background: c.bg, color: c.color }}>
                            {cat}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {projectList.map((proj, idx) => {
                    const budget    = budgetMap.get(proj.id)    ?? 0;
                    const committed = committedMap.get(proj.id) ?? 0;
                    const actual    = actualMap.get(proj.id)    ?? 0;
                    const usedPct   = pct(actual, budget);
                    const overBudget = budget > 0 && actual > budget;
                    const catMap = catBudgetMap.get(proj.id);

                    return (
                      <tr key={proj.id} style={{ borderBottom: idx < projectList.length - 1 ? "1px solid #f3f4f6" : "none", background: overBudget ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600, whiteSpace: "nowrap" }}>{proj.name}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: budget > 0 ? "#374151" : "#d1d5db", whiteSpace: "nowrap" }}>
                          {budget > 0 ? php(budget) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: committed > 0 ? "#1e40af" : "#d1d5db", whiteSpace: "nowrap" }}>
                          {committed > 0 ? php(committed) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: overBudget ? "#b91c1c" : actual > 0 ? "#057a55" : "#d1d5db", whiteSpace: "nowrap" }}>
                          {actual > 0 ? php(actual) : "—"}
                          {overBudget && <span style={{ marginLeft: "0.3rem", fontSize: "0.68rem", color: "#b91c1c" }}>↑ Over</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {budget > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden", minWidth: "50px" }}>
                                <div style={{ height: "100%", width: `${Math.min(usedPct, 100)}%`, background: overBudget ? "#dc2626" : usedPct > 80 ? "#e3a008" : "#057a55", borderRadius: "999px" }} />
                              </div>
                              <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: overBudget ? "#b91c1c" : "#374151", fontWeight: 600, minWidth: "32px" }}>{usedPct}%</span>
                            </div>
                          ) : <span style={{ color: "#d1d5db", fontSize: "0.78rem" }}>—</span>}
                        </td>
                        {sortedCats.map((cat) => {
                          const catAmt = catMap?.get(cat) ?? 0;
                          const catPct = budget > 0 ? Math.round((catAmt / budget) * 100) : 0;
                          return (
                            <td key={cat} style={{ padding: "0.65rem 0.75rem", fontFamily: "monospace", fontSize: "0.78rem", color: catAmt > 0 ? "#374151" : "#d1d5db", whiteSpace: "nowrap" }}>
                              {catAmt > 0 ? (
                                <div>
                                  <div style={{ fontWeight: 600 }}>{php(catAmt)}</div>
                                  <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{catPct}% of budget</div>
                                </div>
                              ) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.75rem", textAlign: "right" }}>
          Category columns show planned budget allocation only. Actual spend is tracked at project level via POs.
        </p>
      </div>
    </main>
  );
}
