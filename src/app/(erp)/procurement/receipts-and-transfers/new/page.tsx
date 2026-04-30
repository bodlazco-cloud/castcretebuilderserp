export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, suppliers, materials, purchaseOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { MrrForm } from "../MrrForm";

const ACCENT = "#e3a008";

export default async function NewMrrPage({ searchParams }: { searchParams: Promise<{ poId?: string }> }) {
  await getAuthUser();
  const { poId } = await searchParams;

  const [projectRows, supplierRows, materialRows, poRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
    db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).where(eq(suppliers.isActive, true)).orderBy(suppliers.name),
    db.select({ id: materials.id, code: materials.code, name: materials.name, unit: materials.unit })
      .from(materials).where(eq(materials.isActive, true)).orderBy(materials.code),
    db.select({ id: purchaseOrders.id, status: purchaseOrders.status, totalAmount: purchaseOrders.totalAmount })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, "AWAITING_DELIVERY")),
  ]);

  const poOptions = poRows.map((p) => ({
    id: p.id,
    label: `PO — PHP ${Number(p.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} (${p.status.replace(/_/g, " ")})`,
  }));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement/receipts-and-transfers" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Receipts & Transfers</a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>New Material Receiving Report</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Record goods received from a supplier or developer. This updates inventory stock automatically.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <MrrForm
            projects={projectRows}
            suppliers={supplierRows}
            materials={materialRows}
            poOptions={poOptions}
            defaultPoId={poId}
          />
        </div>
      </div>
    </main>
  );
}
