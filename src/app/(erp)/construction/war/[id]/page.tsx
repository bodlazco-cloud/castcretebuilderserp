export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  workAccomplishedReports, projectUnits, projects,
  taskAssignments, subcontractors, unitMilestones,
  milestoneDefinitions, milestoneDocuments,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:              { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW:     { bg: "#fef9c3", color: "#713f12" },
  PENDING_AUDIT:      { bg: "#eff6ff", color: "#1e40af" },
  READY_FOR_APPROVAL: { bg: "#e0e7ff", color: "#3730a3" },
  APPROVED:           { bg: "#dcfce7", color: "#166534" },
  REJECTED:           { bg: "#fef2f2", color: "#b91c1c" },
};

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

const DOC_TYPE_LABELS: Record<string, string> = {
  WAR_SIGNED:              "Signed WAR",
  MILESTONE_PHOTOS:        "Milestone Photos",
  MATERIAL_TRANSFER_SLIPS: "Material Transfer Slips",
  OSM_ACKNOWLEDGMENT:      "OSM Acknowledgment",
  SUBCON_BILLING_INVOICE:  "Subcon Billing Invoice",
  QUALITY_CLEARANCE:       "Quality Clearance",
};

const REQUIRED_DOCS = Object.keys(DOC_TYPE_LABELS);

export default async function WarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [war] = await db
    .select({
      id:                   workAccomplishedReports.id,
      grossAccomplishment:  workAccomplishedReports.grossAccomplishment,
      status:               workAccomplishedReports.status,
      rejectionReason:      workAccomplishedReports.rejectionReason,
      submittedAt:          workAccomplishedReports.submittedAt,
      accountingVerifiedAt: workAccomplishedReports.accountingVerifiedAt,
      auditVerifiedAt:      workAccomplishedReports.auditVerifiedAt,
      bodApprovedAt:        workAccomplishedReports.bodApprovedAt,
      unitCode:             projectUnits.unitCode,
      unitModel:            projectUnits.unitModel,
      projName:             projects.name,
      projId:               projects.id,
      subName:              subcontractors.name,
      subId:                subcontractors.id,
      ntpId:                taskAssignments.id,
      milestoneName:        milestoneDefinitions.name,
      milestoneCategory:    milestoneDefinitions.category,
    })
    .from(workAccomplishedReports)
    .leftJoin(projectUnits,       eq(workAccomplishedReports.unitId,            projectUnits.id))
    .leftJoin(projects,           eq(workAccomplishedReports.projectId,         projects.id))
    .leftJoin(taskAssignments,    eq(workAccomplishedReports.taskAssignmentId,  taskAssignments.id))
    .leftJoin(subcontractors,     eq(taskAssignments.subconId,                  subcontractors.id))
    .leftJoin(unitMilestones,     eq(workAccomplishedReports.unitMilestoneId,   unitMilestones.id))
    .leftJoin(milestoneDefinitions, eq(unitMilestones.milestoneDefId,           milestoneDefinitions.id))
    .where(eq(workAccomplishedReports.id, id));

  if (!war) notFound();

  const docs = await db
    .select({ docType: milestoneDocuments.docType, fileUrl: milestoneDocuments.fileUrl, isVerified: milestoneDocuments.isVerified, uploadedAt: milestoneDocuments.uploadedAt })
    .from(milestoneDocuments)
    .where(eq(milestoneDocuments.warId, id));

  const uploadedTypes = new Set(docs.map((d) => d.docType));
  const st = STATUS_STYLE[war.status] ?? { bg: "#f3f4f6", color: "#6b7280" };

  const STEPS = [
    { label: "Submitted",         done: !!war.submittedAt,          date: war.submittedAt },
    { label: "Accounting Review",  done: !!war.accountingVerifiedAt, date: war.accountingVerifiedAt },
    { label: "Audit Verification", done: !!war.auditVerifiedAt,      date: war.auditVerifiedAt },
    { label: "BOD Approved",       done: !!war.bodApprovedAt,        date: war.bodApprovedAt },
  ];

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction/war" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← WARs</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              WAR — {war.unitCode ?? "Unknown Unit"}
            </h1>
            <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: st.bg, color: st.color }}>
              {war.status.replace(/_/g, " ")}
            </span>
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>
            PHP {Number(war.grossAccomplishment).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Approval pipeline */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Approval Pipeline</h2>
          <div style={{ display: "flex", gap: "0", alignItems: "center" }}>
            {STEPS.map((step, i) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: step.done ? "#16a34a" : "#e5e7eb", color: step.done ? "#fff" : "#9ca3af", fontWeight: 700, fontSize: "0.8rem",
                  }}>
                    {step.done ? "✓" : String(i + 1)}
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: step.done ? "#166534" : "#9ca3af", textAlign: "center", whiteSpace: "nowrap" }}>
                    {step.label}
                  </div>
                  {step.date && (
                    <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>
                      {new Date(step.date).toLocaleDateString("en-PH")}
                    </div>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: "2px", background: step.done ? "#16a34a" : "#e5e7eb", margin: "0 0.25rem", marginBottom: "1.5rem" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {war.rejectionReason && (
          <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: "0.25rem", fontSize: "0.875rem" }}>Rejection Reason</div>
            <div style={{ color: "#7f1d1d", fontSize: "0.875rem" }}>{war.rejectionReason}</div>
          </div>
        )}

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>WAR Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}>
              <div style={LABEL}>Project</div>
              {war.projId
                ? <a href={`/master-list/projects/${war.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{war.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Unit</div><div style={VALUE}>{war.unitCode} — {war.unitModel}</div></div>
            <div style={FIELD}>
              <div style={LABEL}>Subcontractor</div>
              {war.subId
                ? <a href={`/master-list/subcontractors/${war.subId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{war.subName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}>
              <div style={LABEL}>Milestone</div>
              <div style={VALUE}>{war.milestoneName ?? "—"} {war.milestoneCategory && `(${war.milestoneCategory})`}</div>
            </div>
            <div style={FIELD}><div style={LABEL}>Submitted</div><div style={VALUE}>{new Date(war.submittedAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
            {war.ntpId && (
              <div style={FIELD}>
                <div style={LABEL}>NTP</div>
                <a href={`/construction/ntp/${war.ntpId}`} style={{ ...VALUE, color: ACCENT, textDecoration: "none" }}>View NTP →</a>
              </div>
            )}
          </div>
        </div>

        {/* Document checklist */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
            Document Checklist ({uploadedTypes.size}/{REQUIRED_DOCS.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {REQUIRED_DOCS.map((docType) => {
              const uploaded = uploadedTypes.has(docType as Parameters<typeof uploadedTypes.has>[0]);
              const doc = docs.find((d) => d.docType === docType);
              return (
                <div key={docType} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.6rem 0.75rem", borderRadius: "6px",
                  background: uploaded ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${uploaded ? "#86efac" : "#fecaca"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.9rem" }}>{uploaded ? "✓" : "✗"}</span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 500, color: uploaded ? "#166534" : "#b91c1c" }}>
                      {DOC_TYPE_LABELS[docType]}
                    </span>
                  </div>
                  {doc?.uploadedAt && (
                    <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {new Date(doc.uploadedAt).toLocaleDateString("en-PH")}
                      {doc.isVerified && " · Verified"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
