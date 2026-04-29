export const dynamic = "force-dynamic";
import { db } from "@/db";
import { payables, projects, subcontractors, workAccomplishedReports, projectUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { PayableActions } from "./PayableActions";

const ACCENT = "#ff5a1f";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:              { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW:     { bg: "#fffbeb", color: "#b45309" },
  PENDING_AUDIT:      { bg: "#fef3c7", color: "#92400e" },
  READY_FOR_APPROVAL: { bg: "#eff6ff", color: "#1a56db" },
  APPROVED:           { bg: "#f0fdf4", color: "#057a55" },
  REJECTED:           { bg: "#fef2f2", color: "#e02424" },
  CANCELLED:          { bg: "#f3f4f6", color: "#9ca3af" },
};

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

export default async function PayableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [pay] = await db
    .select({
      id:                    payables.id,
      status:                payables.status,
      grossAmount:           payables.grossAmount,
      lessAdvanceRecoupment: payables.lessAdvanceRecoupment,
      netPayable:            payables.netPayable,
      rejectionReason:       payables.rejectionReason,
      bodApprovedAt:         payables.bodApprovedAt,
      paidAt:                payables.paidAt,
      createdAt:             payables.createdAt,
      projName:              projects.name,
      projId:                projects.id,
      subName:               subcontractors.name,
      warId:                 workAccomplishedReports.id,
      unitCode:              projectUnits.unitCode,
    })
    .from(payables)
    .leftJoin(projects,               eq(payables.projectId, projects.id))
    .leftJoin(subcontractors,         eq(payables.subconId,  subcontractors.id))
    .leftJoin(workAccomplishedReports, eq(payables.warId,    workAccomplishedReports.id))
    .leftJoin(projectUnits,           eq(workAccomplishedReports.unitId, projectUnits.id))
    .where(eq(payables.id, id));

  if (!pay) notFound();

  const st = STATUS_STYLE[pay.status] ?? STATUS_STYLE.DRAFT;
  const fmt = (v: string | null) =>
    v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance/payables" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Payables</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Payable</h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
                {pay.status.replace(/_/g, " ")}
              </span>
              {pay.status === "APPROVED" && pay.paidAt && (
                <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#f0fdf4", color: "#059669" }}>
                  PAID
                </span>
              )}
            </div>
          </div>
        </div>

        {pay.rejectionReason && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "1.5rem", color: "#b91c1c", fontSize: "0.875rem" }}>
            <strong>Rejection reason:</strong> {pay.rejectionReason}
          </div>
        )}

        {/* Amount breakdown */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Amount Breakdown</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#374151" }}>Gross Amount</span>
              <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{fmt(pay.grossAmount)}</span>
            </div>
            {Number(pay.lessAdvanceRecoupment) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
                <span>Less: Advance Recoupment</span>
                <span style={{ fontFamily: "monospace", color: "#dc2626" }}>({fmt(pay.lessAdvanceRecoupment)})</span>
              </div>
            )}
            <div style={{ borderTop: "2px solid #111827", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700 }}>Net Payable</span>
              <span style={{ fontWeight: 700, fontFamily: "monospace", color: ACCENT }}>{fmt(pay.netPayable)}</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {pay.projId
                ? <a href={`/master-list/projects/${pay.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{pay.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Subcontractor</div><div style={VALUE}>{pay.subName ?? "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Unit</div><div style={VALUE}>{pay.unitCode ?? "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Created</div><div style={VALUE}>{new Date(pay.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            {pay.bodApprovedAt && (
              <div style={FIELD}><div style={LABEL}>Approved</div><div style={VALUE}>{new Date(pay.bodApprovedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            )}
            {pay.paidAt && (
              <div style={FIELD}><div style={LABEL}>Paid</div><div style={VALUE}>{new Date(pay.paidAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>
            )}
            {pay.warId && (
              <div style={FIELD}>
                <div style={LABEL}>Source WAR</div>
                <a href={`/construction/war/${pay.warId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>View WAR →</a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!["REJECTED", "CANCELLED"].includes(pay.status) && !(pay.status === "APPROVED" && pay.paidAt) && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Actions</h2>
            <PayableActions id={pay.id} status={pay.status} paidAt={pay.paidAt ? pay.paidAt.toISOString() : null} />
          </div>
        )}
      </div>
    </main>
  );
}
