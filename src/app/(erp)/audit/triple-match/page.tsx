export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  purchaseOrders, purchaseOrderItems, materialReceivingReports,
  mrrItems, projects, suppliers, materials,
} from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#7e3af2";

export default async function TripleMatchPage() {
  await getAuthUser();

  // Fetch all non-draft POs
  const poRows = await db
    .select({
      id:           purchaseOrders.id,
      totalAmount:  purchaseOrders.totalAmount,
      status:       purchaseOrders.status,
      createdAt:    purchaseOrders.createdAt,
      deliveredAt:  purchaseOrders.deliveredAt,
      projName:     projects.name,
      projId:       projects.id,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(projects,  eq(purchaseOrders.projectId,  projects.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.status, "DELIVERED"))
    .orderBy(desc(purchaseOrders.createdAt));

  // Fetch MRRs linked to POs
  const mrrRows = await db
    .select({
      id:       materialReceivingReports.id,
      poId:     materialReceivingReports.poId,
      status:   materialReceivingReports.status,
      receivedDate: materialReceivingReports.receivedDate,
    })
    .from(materialReceivingReports);

  // PO item counts and MRR item counts for variance check
  const poItemCounts = await db
    .select({ poId: purchaseOrderItems.poId, lines: count() })
    .from(purchaseOrderItems)
    .groupBy(purchaseOrderItems.poId);

  const mrrItemCounts = await db
    .select({ mrrId: mrrItems.mrrId, lines: count() })
    .from(mrrItems)
    .groupBy(mrrItems.mrrId);

  const mrrByPo = new Map<string, typeof mrrRows[number][]>();
  for (const m of mrrRows) {
    if (!m.poId) continue;
    if (!mrrByPo.has(m.poId)) mrrByPo.set(m.poId, []);
    mrrByPo.get(m.poId)!.push(m);
  }

  const poLineMap = Object.fromEntries(poItemCounts.map((p) => [p.poId, Number(p.lines)]));
  const mrrLineMap = Object.fromEntries(mrrItemCounts.map((m) => [m.mrrId, Number(m.lines)]));

  const matched    = poRows.filter((p) => (mrrByPo.get(p.id)?.length ?? 0) > 0).length;
  const unmatched  = poRows.length - matched;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Audit & Quality</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Triple Match</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            PO ↔ MRR delivery match for all delivered orders — {matched} matched · {unmatched} unmatched
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[
            { label: "✓ PO matched",     bg: "#f0fdf4", color: "#166534", border: "#86efac" },
            { label: "✗ MRR missing",    bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
          ].map((l) => (
            <span key={l.label} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: l.bg, color: l.color, border: `1px solid ${l.border}` }}>
              {l.label}
            </span>
          ))}
        </div>

        {poRows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No delivered POs to match yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {poRows.map((po) => {
              const mrrs = mrrByPo.get(po.id) ?? [];
              const hasMrr = mrrs.length > 0;
              const poLines = poLineMap[po.id] ?? 0;

              return (
                <div key={po.id} style={{
                  background: "#fff", borderRadius: "8px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  border: `1px solid ${hasMrr ? "#86efac" : "#fecaca"}`,
                  overflow: "hidden",
                }}>
                  {/* PO row */}
                  <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1rem", color: hasMrr ? "#16a34a" : "#dc2626" }}>{hasMrr ? "✓" : "✗"}</span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>PO</span>
                        <span style={{ margin: "0 0.5rem", color: "#9ca3af" }}>·</span>
                        <span style={{ color: "#374151" }}>{po.projName ?? "—"}</span>
                        <span style={{ margin: "0 0.5rem", color: "#9ca3af" }}>·</span>
                        <span style={{ color: "#374151" }}>{po.supplierName ?? "—"}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontWeight: 700, color: "#111827" }}>
                        PHP {Number(po.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{poLines} lines</span>
                      <a href={`/procurement/po/${po.id}`} style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View PO →</a>
                    </div>
                  </div>

                  {/* MRR rows */}
                  {hasMrr ? (
                    mrrs.map((mrr) => (
                      <div key={mrr.id} style={{ padding: "0.65rem 1.25rem 0.65rem 2.5rem", borderBottom: "1px solid #f9fafb", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.78rem", color: "#166534", fontWeight: 600 }}>MRR</span>
                          <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#374151" }}>{mrr.receivedDate}</span>
                          <span style={{ fontSize: "0.72rem", padding: "0.1rem 0.4rem", borderRadius: "999px", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>{mrr.status}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{mrrLineMap[mrr.id] ?? 0} lines</span>
                          <a href={`/procurement/receipts-and-transfers/${mrr.id}`} style={{ fontSize: "0.78rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View MRR →</a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "0.65rem 1.25rem 0.65rem 2.5rem", background: "#fef2f2", fontSize: "0.82rem", color: "#b91c1c", fontWeight: 500 }}>
                      No MRR found for this PO — goods receipt not yet recorded.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
