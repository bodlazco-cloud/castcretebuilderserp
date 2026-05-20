export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  batchingPlantPRFlags, purchaseRequisitions, purchaseOrders,
  projects, suppliers, internalPurchaseOrders, mixDesigns,
} from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

const ACCENT = "#1a56db";

const PO_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:               { bg: "#f3f4f6", color: "#6b7280",  label: "Draft" },
  AUDIT_REVIEW:        { bg: "#eff6ff", color: "#1e40af",  label: "Audit Review" },
  BOD_APPROVED:        { bg: "#e0e7ff", color: "#3730a3",  label: "BOD Approved" },
  AWAITING_DELIVERY:   { bg: "#fef3c7", color: "#92400e",  label: "Awaiting Delivery" },
  PARTIALLY_DELIVERED: { bg: "#fff7ed", color: "#c2410c",  label: "Partial" },
  DELIVERED:           { bg: "#dcfce7", color: "#166534",  label: "Delivered" },
  CANCELLED:           { bg: "#fef2f2", color: "#b91c1c",  label: "Cancelled" },
};

export default async function BatchingMRRPage() {
  // Find all PRs flagged as Batching Plant delivery
  const flags = await db
    .select({
      flagId:   batchingPlantPRFlags.id,
      prId:     batchingPlantPRFlags.prId,
      ipoId:    batchingPlantPRFlags.ipoId,
    })
    .from(batchingPlantPRFlags)
    .orderBy(desc(batchingPlantPRFlags.createdAt));

  if (flags.length === 0) {
    return (
      <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: "900px" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Batching Plant</a>
          </div>
          <h1 style={{ margin: "0 0 2rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Batching Plant — Material Receiving</h1>
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No batching plant deliveries pending. Deliveries appear here when raw material PRs are approved and POs are created.
          </div>
        </div>
      </main>
    );
  }

  const prIds  = flags.map((f) => f.prId);
  const ipoIds = flags.map((f) => f.ipoId);

  const [prRows, ipoRows] = await Promise.all([
    db
      .select({
        id:      purchaseRequisitions.id,
        status:  purchaseRequisitions.status,
      })
      .from(purchaseRequisitions)
      .where(inArray(purchaseRequisitions.id, prIds)),
    db
      .select({
        id:       internalPurchaseOrders.id,
        ipoNumber: internalPurchaseOrders.ipoNumber,
        mixCode:  mixDesigns.code,
      })
      .from(internalPurchaseOrders)
      .leftJoin(mixDesigns, eq(internalPurchaseOrders.mixDesignId, mixDesigns.id))
      .where(inArray(internalPurchaseOrders.id, ipoIds)),
  ]);

  const prMap  = new Map(prRows.map((r) => [r.id, r]));
  const ipoMap = new Map(ipoRows.map((r) => [r.id, r]));

  // Find POs for those PRs
  const poRows = await db
    .select({
      id:          purchaseOrders.id,
      prId:        purchaseOrders.prId,
      status:      purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      createdAt:   purchaseOrders.createdAt,
      deliveredAt: purchaseOrders.deliveredAt,
      projName:    projects.name,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(projects,  eq(purchaseOrders.projectId, projects.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(inArray(purchaseOrders.prId, prIds))
    .orderBy(desc(purchaseOrders.createdAt));

  const poByPr = new Map(poRows.map((p) => [p.prId, p]));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1000px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Batching Plant</a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>Batching Plant</span>
          <h1 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Material Receiving (MRR)
          </h1>
          <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>
            Receive raw materials ordered for the Batching Plant. Each delivery must be inspected and signed off here.
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#374151" }}>
              Delivery Queue ({flags.length})
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem", minWidth: "700px" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["IPO", "Mix", "Project", "Supplier", "PO Amount", "PO Status", "Action"].map((h, i) => (
                    <th key={i} style={{ padding: "0.65rem 1rem", textAlign: i === 4 ? "right" : "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flags.map((flag, i) => {
                  const ipo = ipoMap.get(flag.ipoId);
                  const po  = poByPr.get(flag.prId);
                  const st  = po ? (PO_STATUS_STYLE[po.status] ?? PO_STATUS_STYLE.DRAFT) : null;
                  const canReceive = po && ["AWAITING_DELIVERY", "PARTIALLY_DELIVERED", "BOD_APPROVED"].includes(po.status);

                  return (
                    <tr key={flag.flagId} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <a href={`/batching/ipo/${flag.ipoId}`} style={{ fontFamily: "monospace", fontWeight: 700, color: ACCENT, textDecoration: "none" }}>
                          {ipo?.ipoNumber ?? "—"}
                        </a>
                      </td>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", color: "#374151", fontSize: "0.78rem" }}>
                        {ipo?.mixCode ?? "—"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{po?.projName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.78rem" }}>{po?.supplierName ?? <span style={{ color: "#d1d5db" }}>No PO yet</span>}</td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                        {po ? `₱${Number(po.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {st
                          ? <span style={{ padding: "0.15rem 0.5rem", background: st.bg, color: st.color, borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700 }}>{st.label}</span>
                          : <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>No PO</span>
                        }
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {po && canReceive ? (
                          <a
                            href={`/batching/mrr/receive/${po.id}`}
                            style={{ padding: "0.35rem 0.75rem", background: ACCENT, color: "#fff", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                          >
                            Receive →
                          </a>
                        ) : po?.status === "DELIVERED" ? (
                          <span style={{ fontSize: "0.72rem", color: "#057a55", fontWeight: 600 }}>✓ Received</span>
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>Awaiting PO approval</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", background: "#eff6ff", borderRadius: "7px", borderLeft: `3px solid ${ACCENT}`, fontSize: "0.78rem", color: "#1e40af" }}>
          <strong>Receiving Protocol:</strong> All raw materials (cement, sand, gravel, admixtures) ordered through Batching Plant PRs must be received and signed off here before being posted to inventory. Quantities are credited to the Batching Plant project stock.
        </div>
      </div>
    </main>
  );
}
