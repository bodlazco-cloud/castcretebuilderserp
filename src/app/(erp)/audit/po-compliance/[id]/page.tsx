export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  purchaseOrders, purchaseOrderItems, purchaseRequisitions,
  projects, suppliers, materials,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { PoAuditActions } from "./PoAuditActions";

const ACCENT = "#7e3af2";

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function PoAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [po] = await db
    .select({
      id:              purchaseOrders.id,
      totalAmount:     purchaseOrders.totalAmount,
      status:          purchaseOrders.status,
      isPrepaid:       purchaseOrders.isPrepaid,
      createdAt:       purchaseOrders.createdAt,
      auditReviewedAt: purchaseOrders.auditReviewedAt,
      prId:            purchaseOrders.prId,
      projId:          projects.id,
      projName:        projects.name,
      supplierName:    suppliers.name,
    })
    .from(purchaseOrders)
    .leftJoin(projects,  eq(purchaseOrders.projectId,  projects.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(eq(purchaseOrders.id, id));

  if (!po) notFound();

  const items = await db
    .select({
      id:         purchaseOrderItems.id,
      quantity:   purchaseOrderItems.quantity,
      unitPrice:  purchaseOrderItems.unitPrice,
      totalPrice: purchaseOrderItems.totalPrice,
      matCode:    materials.code,
      matName:    materials.name,
      matUnit:    materials.unit,
    })
    .from(purchaseOrderItems)
    .leftJoin(materials, eq(purchaseOrderItems.materialId, materials.id))
    .where(eq(purchaseOrderItems.poId, id));

  // Fetch the linked PR for compliance check
  const [pr] = po.prId
    ? await db
        .select({ status: purchaseRequisitions.status, approvedAt: purchaseRequisitions.approvedAt })
        .from(purchaseRequisitions)
        .where(eq(purchaseRequisitions.id, po.prId))
    : [null];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit/po-compliance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← PO Compliance</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>PO Audit Review</h1>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#ede9fe", color: "#5b21b6" }}>
              {po.status.replace(/_/g, " ")}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#111827" }}>
              PHP {Number(po.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Compliance checklist */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Compliance Checklist</h2>
          {[
            {
              label: "PR exists and is approved",
              pass:  pr?.status === "APPROVED",
              note:  pr ? `PR status: ${pr.status}` : "No linked PR found",
            },
            {
              label: "Price not marked as prepaid override",
              pass:  !po.isPrepaid,
              note:  po.isPrepaid ? "⚠ Prepaid order — verify proforma invoice" : "Standard order",
            },
            {
              label: "PO in audit review pipeline",
              pass:  po.status === "AUDIT_REVIEW",
              note:  `Current status: ${po.status}`,
            },
          ].map((check) => (
            <div key={check.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.6rem 0.75rem", borderRadius: "6px", marginBottom: "0.5rem",
              background: check.pass ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${check.pass ? "#86efac" : "#fecaca"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem" }}>{check.pass ? "✓" : "✗"}</span>
                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: check.pass ? "#166534" : "#b91c1c" }}>{check.label}</span>
              </div>
              <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{check.note}</span>
            </div>
          ))}
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}><div style={LABEL}>Project</div>
              {po.projId
                ? <a href={`/master-list/projects/${po.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{po.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Supplier</div><div style={VALUE}>{po.supplierName ?? "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Created</div><div style={VALUE}>{new Date(po.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            <div style={FIELD}><div style={LABEL}>Source PR</div>
              {po.prId
                ? <a href={`/procurement/pr/${po.prId}`} style={{ ...VALUE, color: "#e3a008", textDecoration: "none" }}>View PR →</a>
                : <div style={VALUE}>—</div>}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Line Items ({items.length})</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Material", "Unit", "Qty", "Unit Price", "Total"].map((h, i) => (
                    <th key={i} style={{ padding: "0.65rem 0.75rem", textAlign: i >= 2 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.6rem 0.75rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600 }}>{item.matCode}</span>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{item.matName}</div>
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#6b7280" }}>{item.matUnit}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700 }}>{Number(item.quantity).toFixed(4)}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>PHP {Number(item.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700 }}>PHP {Number(item.totalPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit action */}
        {po.status === "AUDIT_REVIEW" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Audit Decision</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#6b7280" }}>
              Clearing this PO marks it as audit-approved and moves it to BOD review queue.
            </p>
            <PoAuditActions poId={po.id} />
          </div>
        )}

        {po.status === "BOD_APPROVED" && po.auditReviewedAt && (
          <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", fontSize: "0.875rem", color: "#166534", fontWeight: 600 }}>
            ✓ Audit cleared on {new Date(po.auditReviewedAt).toLocaleDateString("en-PH", { dateStyle: "long" })} — awaiting BOD approval
          </div>
        )}
      </div>
    </main>
  );
}
