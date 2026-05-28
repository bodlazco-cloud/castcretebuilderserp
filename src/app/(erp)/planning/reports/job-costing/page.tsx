export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  masterBomEntries, materials, projects, resourceForecasts,
  purchaseRequisitions, purchaseRequisitionItems,
} from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

export default async function JobCostingPage() {
  const [projectList, approvedBom, prItems, allForecasts] = await Promise.all([
    safe(
      db.select({ id: projects.id, name: projects.name, status: projects.status })
        .from(projects).orderBy(projects.name),
      [] as { id: string; name: string; status: string }[],
    ),
    // All approved + active BOM lines with admin price
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
    // All PR line items with their PR status
    safe(
      db.select({
          projectId:       purchaseRequisitions.projectId,
          status:          purchaseRequisitions.status,
          quantityToOrder: purchaseRequisitionItems.quantityToOrder,
          unitPrice:       purchaseRequisitionItems.unitPrice,
        })
        .from(purchaseRequisitionItems)
        .leftJoin(purchaseRequisitions, eq(purchaseRequisitionItems.prId, purchaseRequisitions.id)),
      [] as { projectId: string | null; status: string; quantityToOrder: string; unitPrice: string }[],
    ),
    safe(
      db.select({ projectId: resourceForecasts.projectId, status: resourceForecasts.status })
        .from(resourceForecasts),
      [] as { projectId: string; status: string }[],
    ),
  ]);

  // Compute per-project planned cost from BOM
  const plannedMap = new Map<string, number>();
  for (const row of approvedBom) {
    const cost = Number(row.quantityPerUnit) * Number(row.adminPrice ?? 0);
    plannedMap.set(row.projectId, (plannedMap.get(row.projectId) ?? 0) + cost);
  }

  // Compute per-project committed (approved PRs) and draft PR amounts
  const committedMap = new Map<string, number>();
  const draftMap     = new Map<string, number>();
  for (const row of prItems) {
    if (!row.projectId) continue;
    const lineAmt = Number(row.quantityToOrder) * Number(row.unitPrice);
    if (row.status === "DRAFT") {
      draftMap.set(row.projectId, (draftMap.get(row.projectId) ?? 0) + lineAmt);
    } else {
      committedMap.set(row.projectId, (committedMap.get(row.projectId) ?? 0) + lineAmt);
    }
  }

  // Count pending forecasts per project
  const pendingMap = new Map<string, number>();
  for (const row of allForecasts) {
    if (row.status === "PENDING_PR") {
      pendingMap.set(row.projectId, (pendingMap.get(row.projectId) ?? 0) + 1);
    }
  }

  const totalPlanned   = [...plannedMap.values()].reduce((a, b) => a + b, 0);
  const totalCommitted = [...committedMap.values()].reduce((a, b) => a + b, 0);

  const card: React.CSSProperties = { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };
  const php = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.25rem" }}>
            <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>← Planning &amp; Engineering</a>
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Job Costing Report</h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>
            Planned material cost (approved BOM × admin price) vs committed spend (approved PRs).
          </p>
        </div>

        {/* Summary KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Planned",   value: php(totalPlanned),   sub: "BOM × Admin Price",      accent: "#7e3af2" },
            { label: "Committed (PRs)", value: php(totalCommitted), sub: "non-draft PR lines",      accent: "#1a56db" },
            { label: "Utilization",     value: `${pct(totalCommitted, totalPlanned)}%`,
              sub: "committed / planned", accent: totalCommitted > totalPlanned ? "#dc2626" : "#057a55" },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: "1.25rem 1.5rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginTop: "0.3rem" }}>{k.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.15rem" }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Callout */}
        <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#5b21b6", marginBottom: "1.25rem" }}>
          <strong>Planned</strong> = APPROVED active BOM lines × Admin-fixed unit price. &nbsp;|&nbsp;
          <strong>Committed</strong> = sum of non-draft PR lines (qty × price). &nbsp;|&nbsp;
          <strong>Draft PRs</strong> = raised but not yet submitted for approval.
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
                    {["Project", "Status", "Planned Cost", "Committed (PRs)", "Draft PRs", "% Committed", "Pending Forecasts"].map((h) => (
                      <th key={h} style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectList.map((proj, idx) => {
                    const planned    = plannedMap.get(proj.id)   ?? 0;
                    const committed  = committedMap.get(proj.id) ?? 0;
                    const draft      = draftMap.get(proj.id)     ?? 0;
                    const utilPct    = pct(committed, planned);
                    const overBudget = planned > 0 && committed > planned;
                    const pendingPr  = pendingMap.get(proj.id)   ?? 0;
                    return (
                      <tr key={proj.id} style={{ borderBottom: idx < projectList.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{proj.name}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ background: proj.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6", color: proj.status === "ACTIVE" ? "#166534" : "#6b7280", padding: "0.2rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600 }}>
                            {proj.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: planned > 0 ? "#374151" : "#d1d5db" }}>
                          {planned > 0 ? php(planned) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: overBudget ? "#b91c1c" : committed > 0 ? "#374151" : "#d1d5db" }}>
                          {committed > 0 ? php(committed) : "—"}
                          {overBudget && <span style={{ marginLeft: "0.3rem", fontSize: "0.68rem", color: "#b91c1c" }}>↑ Over</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: draft > 0 ? "#713f12" : "#d1d5db" }}>
                          {draft > 0 ? php(draft) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {planned > 0 ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <div style={{ flex: 1, height: "6px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden", minWidth: "60px" }}>
                                <div style={{ height: "100%", width: `${Math.min(utilPct, 100)}%`, background: overBudget ? "#dc2626" : utilPct > 80 ? "#e3a008" : "#1a56db", borderRadius: "999px" }} />
                              </div>
                              <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: overBudget ? "#b91c1c" : "#374151", fontWeight: 600, minWidth: "36px" }}>{utilPct}%</span>
                            </div>
                          ) : <span style={{ color: "#d1d5db", fontSize: "0.78rem" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {pendingPr > 0
                            ? <a href="/planning/mrp-queue" style={{ color: "#b91c1c", textDecoration: "none", fontWeight: 600, fontSize: "0.78rem" }}>{pendingPr} pending →</a>
                            : <span style={{ color: "#d1d5db", fontSize: "0.78rem" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
