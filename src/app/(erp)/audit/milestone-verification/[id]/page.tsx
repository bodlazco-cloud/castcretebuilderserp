export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  unitMilestones, milestoneDefinitions, projectUnits, projects,
  workAccomplishedReports, milestoneDocuments,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { MilestoneVerifyButton } from "./MilestoneVerifyButton";

const ACCENT = "#7e3af2";

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

export default async function MilestoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [milestone] = await db
    .select({
      id:             unitMilestones.id,
      status:         unitMilestones.status,
      startedAt:      unitMilestones.startedAt,
      completedAt:    unitMilestones.completedAt,
      verifiedAt:     unitMilestones.verifiedAt,
      unitCode:       projectUnits.unitCode,
      unitModel:      projectUnits.unitModel,
      unitId:         projectUnits.id,
      projName:       projects.name,
      projId:         projects.id,
      milestoneName:  milestoneDefinitions.name,
      milestoneCategory: milestoneDefinitions.category,
      triggersBilling:   milestoneDefinitions.triggersBilling,
      weightPct:         milestoneDefinitions.weightPct,
    })
    .from(unitMilestones)
    .leftJoin(milestoneDefinitions, eq(unitMilestones.milestoneDefId, milestoneDefinitions.id))
    .leftJoin(projectUnits,         eq(unitMilestones.unitId,          projectUnits.id))
    .leftJoin(projects,             eq(projectUnits.projectId,         projects.id))
    .where(eq(unitMilestones.id, id));

  if (!milestone) notFound();

  // WARs associated with this milestone
  const wars = await db
    .select({
      id:                  workAccomplishedReports.id,
      grossAccomplishment: workAccomplishedReports.grossAccomplishment,
      status:              workAccomplishedReports.status,
      submittedAt:         workAccomplishedReports.submittedAt,
    })
    .from(workAccomplishedReports)
    .where(eq(workAccomplishedReports.unitMilestoneId, id));

  // Milestone documents across all WARs for this milestone
  const warIds = wars.map((w) => w.id);
  const docs = warIds.length > 0
    ? await db
        .select({
          id:         milestoneDocuments.id,
          docType:    milestoneDocuments.docType,
          isVerified: milestoneDocuments.isVerified,
          uploadedAt: milestoneDocuments.uploadedAt,
          warId:      milestoneDocuments.warId,
        })
        .from(milestoneDocuments)
        .where(eq(milestoneDocuments.warId, warIds[0]))
    : [];

  const verifiedDocCount = docs.filter((d) => d.isVerified).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit/milestone-verification" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Milestone Verification</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
              {milestone.milestoneName ?? "Milestone"} — {milestone.unitCode}
            </h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: milestone.status === "VERIFIED" ? "#dcfce7" : "#eff6ff", color: milestone.status === "VERIFIED" ? "#166534" : "#1e40af" }}>
                {milestone.status}
              </span>
              {milestone.triggersBilling && (
                <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#dcfce7", color: "#166534" }}>
                  BILLING TRIGGER
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#374151" }}>
            Weight: {Number(milestone.weightPct ?? 0).toFixed(1)}%
          </div>
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}><div style={LABEL}>Project</div>
              {milestone.projId
                ? <a href={`/master-list/projects/${milestone.projId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{milestone.projName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Unit</div><div style={VALUE}>{milestone.unitCode} — {milestone.unitModel}</div></div>
            <div style={FIELD}><div style={LABEL}>Category</div><div style={VALUE}>{milestone.milestoneCategory ?? "—"}</div></div>
            {milestone.completedAt && <div style={FIELD}><div style={LABEL}>Completed</div><div style={VALUE}>{new Date(milestone.completedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>}
            {milestone.verifiedAt && <div style={FIELD}><div style={LABEL}>Verified</div><div style={VALUE}>{new Date(milestone.verifiedAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}</div></div>}
          </div>
        </div>

        {/* Linked WARs */}
        {wars.length > 0 && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
              Linked WARs ({wars.length}) — Documents: {verifiedDocCount}/{docs.length} verified
            </h2>
            {wars.map((war) => (
              <div key={war.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "#111827" }}>PHP {Number(war.grossAccomplishment).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "999px", background: "#eff6ff", color: "#1e40af" }}>{war.status.replace(/_/g, " ")}</span>
                  <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{new Date(war.submittedAt).toLocaleDateString("en-PH")}</span>
                </div>
                <a href={`/construction/war/${war.id}`} style={{ fontSize: "0.8rem", color: "#057a55", textDecoration: "none", fontWeight: 600 }}>View WAR →</a>
              </div>
            ))}
          </div>
        )}

        {/* Verify action */}
        {milestone.status === "COMPLETED" && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Verification</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#6b7280" }}>
              Confirm that this milestone has been physically inspected and all supporting documents are in order.
            </p>
            <MilestoneVerifyButton milestoneId={milestone.id} />
          </div>
        )}

        {milestone.status === "VERIFIED" && (
          <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", fontSize: "0.875rem", color: "#166534", fontWeight: 600 }}>
            ✓ Verified on {milestone.verifiedAt ? new Date(milestone.verifiedAt).toLocaleDateString("en-PH", { dateStyle: "long" }) : "—"}
          </div>
        )}
      </div>
    </main>
  );
}
