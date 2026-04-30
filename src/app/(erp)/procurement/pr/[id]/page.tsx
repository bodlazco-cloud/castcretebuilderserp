export const dynamic = "force-dynamic";
import { db } from "@/db";
import { purchaseRequisitions, purchaseRequisitionItems, projects, activityDefinitions, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { PrActions } from "./PrActions";

const ACCENT = "#e3a008";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:              { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW:     { bg: "#fef9c3", color: "#713f12" },
  APPROVED:           { bg: "#dcfce7", color: "#166534" },
  REJECTED:           { bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED:          { bg: "#f3f4f6", color: "#6b7280" },
};

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function PrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [pr] = await db
    .select({
      id:              purchaseRequisitions.id,
      status:          purchaseRequisitions.status,
      rejectionReason: purchaseRequisitions.rejectionReason,
      createdAt:       purchaseRequisitions.createdAt,
      approvedAt:      purchaseRequisitions.approvedAt,
      projId:          projects.id,
      projName:        projects.name,
      activityCode:    activityDefinitions.activityCode,
      activityName:    activityDefinitions.activityName,
    })
    .from(purchaseRequisitions)
    .leftJoin(projects,            eq(purchaseRequisitions.projectId,    projects.id))
    .leftJoin(activityDefinitions, eq(purchaseRequisitions.activityDefId, activityDefinitions.id))
    .where(eq(purchaseRequisitions.id, id));

  if (!pr) notFound();

  const items = await db
    .select({
      id:               purchaseRequisitionItems.id,
      quantityRequired: purchaseRequisitionItems.quantityRequired,
      quantityInStock:  purchaseRequisitionItems.quantityInStock,
      quantityToOrder:  purchaseRequisitionItems.quantityToOrder,
      unitPrice:        purchaseRequisitionItems.unitPrice,
      matCode:          materials.code,
      matName:          materials.name,
      matUnit:          materials.unit,
    })
    .from(purchaseRequisitionItems)
    .leftJoin(materials, eq(purchaseRequisitionItems.materialId, materials.id))
    .where(eq(purchaseRequisitionItems.prId, id));

  const totalAmount = items.reduce((sum, i) => sum + Number(i.quantityToOrder) * Number(i.unitPrice), 0);
  const st = STATUS_STYLE[pr.status] ?? STATUS_STYLE.DRAFT;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement/pr" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Purchase Requests</a>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Purchase Request</h1>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
              {pr.status.replace(/_/g, " ")}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#111827" }}>
              PHP {totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>Total requisition value</div>
          </div>
        </div>

        {/* Rejection banner */}
        {pr.status === "REJECTED" && pr.rejectionReason && (
          <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: "0.25rem", fontSize: "0.875rem" }}>Rejected</div>
            <div style={{ color: "#7f1d1d", fontSize: "0.875rem" }}>{pr.rejectionReason}</div>
          </div>
        )}

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {pr.projId
                ? <a href={`/master-list/projects/${pr.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{pr.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Activity</div>
              <div style={VALUE}>{pr.activityCode ? `${pr.activityCode} — ${pr.activityName}` : "—"}</div>
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Created</div>
              <div style={VALUE}>{new Date(pr.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div>
            </div>
            {pr.approvedAt && (
              <div style={FIELD}>
                <div style={LABEL}>Approved</div>
                <div style={VALUE}>{new Date(pr.approvedAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
            Line Items ({items.length})
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "680px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Material", "Unit", "Required", "In Stock", "To Order", "Unit Price", "Line Total"].map((h, i) => (
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
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#374151" }}>{Number(item.quantityRequired).toFixed(4)}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: Number(item.quantityInStock) > 0 ? "#166534" : "#9ca3af" }}>
                      {Number(item.quantityInStock).toFixed(4)}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700, color: "#111827" }}>{Number(item.quantityToOrder).toFixed(4)}</td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#374151" }}>
                      PHP {Number(item.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", textAlign: "right", fontWeight: 700 }}>
                      PHP {(Number(item.quantityToOrder) * Number(item.unitPrice)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                  <td colSpan={6} style={{ padding: "0.65rem 0.75rem", textAlign: "right", fontWeight: 700, fontSize: "0.875rem", color: "#374151" }}>Total</td>
                  <td style={{ padding: "0.65rem 0.75rem", textAlign: "right", fontWeight: 700, color: "#111827" }}>
                    PHP {totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Actions */}
        {(pr.status === "DRAFT" || pr.status === "PENDING_REVIEW") && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Actions</h2>
            <PrActions prId={pr.id} status={pr.status} />
          </div>
        )}

        {pr.status === "APPROVED" && (
          <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#166534" }}>✓ PR Approved — ready to create a PO</div>
            <a href={`/procurement/po/new?prId=${pr.id}`} style={{
              padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#16a34a",
              color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            }}>Create PO →</a>
          </div>
        )}
      </div>
    </main>
  );
}
