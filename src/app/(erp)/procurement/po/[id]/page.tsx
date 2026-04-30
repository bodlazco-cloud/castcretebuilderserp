export const dynamic = "force-dynamic";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderItems, projects, suppliers, purchaseRequisitions, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { PoActions } from "./PoActions";

const ACCENT = "#e3a008";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:               { bg: "#f3f4f6", color: "#6b7280" },
  AUDIT_REVIEW:        { bg: "#eff6ff", color: "#1e40af" },
  BOD_APPROVED:        { bg: "#e0e7ff", color: "#3730a3" },
  PREPAID_REQUIRED:    { bg: "#fef9c3", color: "#713f12" },
  AWAITING_DELIVERY:   { bg: "#fef3c7", color: "#92400e" },
  PARTIALLY_DELIVERED: { bg: "#fff7ed", color: "#c2410c" },
  DELIVERED:           { bg: "#dcfce7", color: "#166534" },
  CANCELLED:           { bg: "#fef2f2", color: "#b91c1c" },
};

const PIPELINE = [
  { key: "DRAFT",             label: "Draft" },
  { key: "AUDIT_REVIEW",      label: "Audit Review" },
  { key: "AWAITING_DELIVERY", label: "Awaiting Delivery" },
  { key: "DELIVERED",         label: "Delivered" },
];

const PIPELINE_ORDER: Record<string, number> = Object.fromEntries(PIPELINE.map((s, i) => [s.key, i]));

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function PoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [po] = await db
    .select({
      id:            purchaseOrders.id,
      totalAmount:   purchaseOrders.totalAmount,
      status:        purchaseOrders.status,
      isPrepaid:     purchaseOrders.isPrepaid,
      createdAt:     purchaseOrders.createdAt,
      deliveredAt:   purchaseOrders.deliveredAt,
      bodApprovedAt: purchaseOrders.bodApprovedAt,
      auditReviewedAt: purchaseOrders.auditReviewedAt,
      prId:          purchaseOrders.prId,
      projId:        projects.id,
      projName:      projects.name,
      supplierId:    suppliers.id,
      supplierName:  suppliers.name,
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

  const st = STATUS_STYLE[po.status] ?? STATUS_STYLE.DRAFT;
  const currentStep = PIPELINE_ORDER[po.status] ?? 0;
  const actionStatuses = ["DRAFT", "AUDIT_REVIEW", "AWAITING_DELIVERY", "PARTIALLY_DELIVERED"];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement/po" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Purchase Orders</a>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Purchase Order</h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
                {po.status.replace(/_/g, " ")}
              </span>
              {po.isPrepaid && (
                <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#fef3c7", color: "#92400e" }}>PREPAID</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#111827" }}>
              PHP {Number(po.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>PO value</div>
          </div>
        </div>

        {/* Pipeline */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Pipeline</h2>
          <div style={{ display: "flex", alignItems: "center" }}>
            {PIPELINE.map((step, i) => {
              const done = PIPELINE_ORDER[po.status] >= i;
              return (
                <div key={step.key} style={{ display: "flex", alignItems: "center", flex: i < PIPELINE.length - 1 ? 1 : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#16a34a" : "#e5e7eb", color: done ? "#fff" : "#9ca3af", fontWeight: 700, fontSize: "0.75rem" }}>
                      {done ? "✓" : String(i + 1)}
                    </div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 600, color: done ? "#166534" : "#9ca3af", textAlign: "center", whiteSpace: "nowrap" }}>{step.label}</div>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div style={{ flex: 1, height: "2px", background: done ? "#16a34a" : "#e5e7eb", margin: "0 0.25rem", marginBottom: "1.2rem" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {po.projId
                ? <a href={`/master-list/projects/${po.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{po.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Supplier</div>
              <div style={VALUE}>{po.supplierName ?? "—"}</div>
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Created</div>
              <div style={VALUE}>{new Date(po.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div>
            </div>
            {po.auditReviewedAt && (
              <div style={FIELD}>
                <div style={LABEL}>Audit Reviewed</div>
                <div style={VALUE}>{new Date(po.auditReviewedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div>
              </div>
            )}
            {po.bodApprovedAt && (
              <div style={FIELD}>
                <div style={LABEL}>BOD Approved</div>
                <div style={VALUE}>{new Date(po.bodApprovedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div>
              </div>
            )}
            {po.deliveredAt && (
              <div style={FIELD}>
                <div style={LABEL}>Delivered</div>
                <div style={VALUE}>{new Date(po.deliveredAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div>
              </div>
            )}
            <div style={FIELD}>
              <div style={LABEL}>Source PR</div>
              <a href={`/procurement/pr/${po.prId}`} style={{ ...VALUE, color: ACCENT, textDecoration: "none" }}>View PR →</a>
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
                  {["Material", "Unit", "Quantity", "Unit Price", "Line Total"].map((h, i) => (
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
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#374151" }}>
                      PHP {Number(item.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700 }}>
                      PHP {Number(item.totalPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={4} style={{ padding: "0.65rem 0.75rem", textAlign: "right", fontWeight: 700, fontSize: "0.875rem" }}>Total</td>
                  <td style={{ padding: "0.65rem 0.75rem", textAlign: "right", fontWeight: 700 }}>
                    PHP {Number(po.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        {actionStatuses.includes(po.status) && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Actions</h2>
            <PoActions poId={po.id} status={po.status} />
          </div>
        )}

        {/* Delivered: link to create MRR */}
        {po.status === "AWAITING_DELIVERY" && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#92400e", fontWeight: 500 }}>Goods delivered? Record a Material Receiving Report.</div>
            <a href={`/procurement/receipts-and-transfers/new?poId=${po.id}`} style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: "#d97706",
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>+ Create MRR →</a>
          </div>
        )}
      </div>
    </main>
  );
}
