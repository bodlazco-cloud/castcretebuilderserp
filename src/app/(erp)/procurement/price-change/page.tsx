export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { PriceChangeForm } from "./PriceChangeForm";

export default async function PriceChangePage() {
  const user = await getAuthUser();

  const pos = await db
    .select({
      id: schema.purchaseOrders.id,
      prId: schema.purchaseOrders.prId,
      totalAmount: schema.purchaseOrders.totalAmount,
      status: schema.purchaseOrders.status,
    })
    .from(schema.purchaseOrders)
    .where(inArray(schema.purchaseOrders.status, ["DRAFT", "AUDIT_REVIEW"]))
    .orderBy(schema.purchaseOrders.createdAt);

  const poIds = pos.map((p) => p.id);
  const poItems = poIds.length > 0
    ? await db
        .select({
          id: schema.purchaseOrderItems.id,
          poId: schema.purchaseOrderItems.poId,
          materialName: schema.materials.name,
          unitPrice: schema.purchaseOrderItems.unitPrice,
          quantity: schema.purchaseOrderItems.quantity,
        })
        .from(schema.purchaseOrderItems)
        .leftJoin(schema.materials, eq(schema.purchaseOrderItems.materialId, schema.materials.id))
        .where(inArray(schema.purchaseOrderItems.poId, poIds))
    : [];

  const ACCENT = "#0369a1";

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>
      <div style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Back to Procurement</a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: `4px solid ${ACCENT}` }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Request PO Price Change</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              One-time deviation from the admin-fixed price. Requires management approval.
            </p>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <PriceChangeForm
              pos={pos}
              poItems={poItems.map((i) => ({ ...i, materialName: i.materialName ?? "—" }))}
              userId={user?.id ?? ""}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
