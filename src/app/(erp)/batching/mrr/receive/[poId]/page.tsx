export const dynamic = "force-dynamic";

import { db } from "@/db";
import { purchaseOrders, purchaseOrderItems, projects, suppliers, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ReceiveMRRForm } from "./ReceiveMRRForm";

const ACCENT = "#1a56db";

export default async function ReceiveMRRPage({ params }: { params: Promise<{ poId: string }> }) {
  await getAuthUser();
  const { poId } = await params;

  const [po] = await db
    .select({
      id:          purchaseOrders.id,
      status:      purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      prId:        purchaseOrders.prId,
      projId:      projects.id,
      projName:    projects.name,
      supplierId:  suppliers.id,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(projects,  eq(purchaseOrders.projectId,  projects.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.id, poId));

  if (!po) notFound();

  const items = await db
    .select({
      id:         purchaseOrderItems.id,
      materialId: purchaseOrderItems.materialId,
      quantity:   purchaseOrderItems.quantity,
      unitPrice:  purchaseOrderItems.unitPrice,
      matCode:    materials.code,
      matName:    materials.name,
      matUnit:    materials.unit,
    })
    .from(purchaseOrderItems)
    .leftJoin(materials, eq(purchaseOrderItems.materialId, materials.id))
    .where(eq(purchaseOrderItems.poId, poId));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "720px" }}>
        <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem" }}>
          <a href="/batching/mrr" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Material Receiving</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.08em", textTransform: "uppercase" }}>Batching Plant</span>
          <h1 style={{ margin: "0.2rem 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Receive Delivery
          </h1>
          <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>
            {po.supplierName} → {po.projName}
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
              PO Line Items — verify quantities received
            </h2>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111827" }}>
              ₱{Number(po.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <ReceiveMRRForm
              poId={po.id}
              projectId={po.projId ?? ""}
              supplierId={po.supplierId ?? ""}
              items={items.map((item) => ({
                materialId:  item.materialId ?? "",
                matCode:     item.matCode ?? "",
                matName:     item.matName ?? "",
                matUnit:     item.matUnit ?? "",
                orderedQty:  Number(item.quantity),
                unitPrice:   Number(item.unitPrice),
              }))}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
