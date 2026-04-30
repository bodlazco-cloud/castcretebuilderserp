export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  purchaseRequisitions, purchaseRequisitionItems, purchaseOrderItems,
  projects, activityDefinitions, suppliers,
} from "@/db/schema";
import { eq, count, sum } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { CreatePoForm } from "./CreatePoForm";

const ACCENT = "#e3a008";

export default async function NewPoPage({ searchParams }: { searchParams: Promise<{ prId?: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const { prId } = await searchParams;
  if (!prId) redirect("/procurement/pr");

  const [pr] = await db
    .select({
      id:           purchaseRequisitions.id,
      status:       purchaseRequisitions.status,
      projName:     projects.name,
      activityName: activityDefinitions.activityName,
    })
    .from(purchaseRequisitions)
    .leftJoin(projects,            eq(purchaseRequisitions.projectId,    projects.id))
    .leftJoin(activityDefinitions, eq(purchaseRequisitions.activityDefId, activityDefinitions.id))
    .where(eq(purchaseRequisitions.id, prId));

  if (!pr || pr.status !== "APPROVED") redirect(`/procurement/pr/${prId ?? ""}`);

  const itemRows = await db
    .select({ qty: purchaseRequisitionItems.quantityToOrder, price: purchaseRequisitionItems.unitPrice })
    .from(purchaseRequisitionItems)
    .where(eq(purchaseRequisitionItems.prId, prId));

  const totalAmount = itemRows.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);

  const supplierRows = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .orderBy(suppliers.name);

  const prSummary = {
    id:          pr.id,
    projName:    pr.projName ?? "—",
    activityName: pr.activityName,
    totalAmount: String(totalAmount),
    itemCount:   itemRows.length,
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "700px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href={`/procurement/pr/${prId}`} style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Back to PR</a>
        </div>

        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Create Purchase Order</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Select a supplier for this approved PR. Quantities and prices are locked from the PR.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
          <CreatePoForm pr={prSummary} suppliers={supplierRows} userId={user.id} />
        </div>
      </div>
    </main>
  );
}
