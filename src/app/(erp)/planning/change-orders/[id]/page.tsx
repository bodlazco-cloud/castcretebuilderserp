export const dynamic = "force-dynamic";
import { db } from "@/db";
import { changeOrderRequests, projects, activityDefinitions, materials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { CoReviewActions } from "./CoReviewActions";

const ACCENT = "#1a56db";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: "#fef9c3", color: "#713f12" },
  APPROVED:  { bg: "#dcfce7", color: "#166534" },
  REJECTED:  { bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED: { bg: "#f3f4f6", color: "#6b7280" },
};

const CHANGE_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  ADD:    { bg: "#f0fdf4", color: "#166534" },
  MODIFY: { bg: "#eff6ff", color: "#1e40af" },
  REMOVE: { bg: "#fef2f2", color: "#b91c1c" },
};

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function ChangeOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [co] = await db
    .select({
      id:              changeOrderRequests.id,
      changeType:      changeOrderRequests.changeType,
      unitModel:       changeOrderRequests.unitModel,
      unitType:        changeOrderRequests.unitType,
      oldQuantity:     changeOrderRequests.oldQuantity,
      newQuantity:     changeOrderRequests.newQuantity,
      reason:          changeOrderRequests.reason,
      status:          changeOrderRequests.status,
      rejectionReason: changeOrderRequests.rejectionReason,
      reviewedAt:      changeOrderRequests.reviewedAt,
      createdAt:       changeOrderRequests.createdAt,
      projId:          projects.id,
      projName:        projects.name,
      activityDefId:   activityDefinitions.id,
      activityCode:    activityDefinitions.activityCode,
      activityName:    activityDefinitions.activityName,
      scopeName:       activityDefinitions.scopeName,
      matId:           materials.id,
      matCode:         materials.code,
      matName:         materials.name,
      matUnit:         materials.unit,
    })
    .from(changeOrderRequests)
    .leftJoin(projects,            eq(changeOrderRequests.projectId,    projects.id))
    .leftJoin(activityDefinitions, eq(changeOrderRequests.activityDefId, activityDefinitions.id))
    .leftJoin(materials,           eq(changeOrderRequests.materialId,    materials.id))
    .where(eq(changeOrderRequests.id, id));

  if (!co) notFound();

  const st  = STATUS_STYLE[co.status]     ?? STATUS_STYLE.PENDING;
  const ct  = CHANGE_TYPE_STYLE[co.changeType] ?? CHANGE_TYPE_STYLE.MODIFY;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/planning/change-orders" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Change Orders</a>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              Change Order
            </h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
                {co.status}
              </span>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: ct.bg, color: ct.color }}>
                {co.changeType}
              </span>
            </div>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
            Submitted {new Date(co.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}
          </div>
        </div>

        {/* Rejection banner */}
        {co.status === "REJECTED" && co.rejectionReason && (
          <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: "0.25rem", fontSize: "0.875rem" }}>Rejected</div>
            <div style={{ color: "#7f1d1d", fontSize: "0.875rem" }}>{co.rejectionReason}</div>
            {co.reviewedAt && (
              <div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: "0.25rem" }}>
                {new Date(co.reviewedAt).toLocaleDateString("en-PH", { dateStyle: "long" })}
              </div>
            )}
          </div>
        )}
        {co.status === "APPROVED" && co.reviewedAt && (
          <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "0.875rem", color: "#166534", fontWeight: 600 }}>
            ✓ Approved on {new Date(co.reviewedAt).toLocaleDateString("en-PH", { dateStyle: "long" })}
          </div>
        )}

        {/* Details card */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {co.projId
                ? <a href={`/master-list/projects/${co.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{co.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>

            <div style={FIELD}>
              <div style={LABEL}>Activity</div>
              <div style={VALUE}>
                {co.activityCode
                  ? <><span style={{ fontFamily: "monospace" }}>{co.activityCode}</span> — {co.activityName}</>
                  : "—"}
              </div>
            </div>

            <div style={FIELD}>
              <div style={LABEL}>Material</div>
              <div style={VALUE}>
                {co.matCode
                  ? <><span style={{ fontFamily: "monospace" }}>{co.matCode}</span> — {co.matName} ({co.matUnit})</>
                  : "—"}
              </div>
            </div>

            <div style={FIELD}>
              <div style={LABEL}>Unit Model / Type</div>
              <div style={VALUE}>
                {co.unitModel ?? "—"}{co.unitType ? ` (${co.unitType})` : ""}
              </div>
            </div>

            {(co.oldQuantity != null || co.newQuantity != null) && (
              <div style={{ ...FIELD, gridColumn: "span 2" }}>
                <div style={LABEL}>Quantity Change</div>
                <div style={VALUE}>
                  {co.oldQuantity ?? "—"} → {co.newQuantity ?? "—"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reason card */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Reason / Justification</h2>
          <p style={{ margin: 0, color: "#374151", fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{co.reason}</p>
        </div>

        {/* Review actions (only for PENDING) */}
        {co.status === "PENDING" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Review</h2>
            <p style={{ margin: "0 0 0.25rem", fontSize: "0.82rem", color: "#6b7280" }}>Approve or reject this change order request.</p>
            <CoReviewActions id={co.id} />
          </div>
        )}
      </div>
    </main>
  );
}
