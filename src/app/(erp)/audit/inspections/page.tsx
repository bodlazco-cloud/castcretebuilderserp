export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  workAccomplishedReports, milestoneDocuments, projectUnits,
  projects, subcontractors, taskAssignments,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#7e3af2";

const DOC_TYPE_LABELS: Record<string, string> = {
  WAR_SIGNED:              "Signed WAR",
  MILESTONE_PHOTOS:        "Milestone Photos",
  MATERIAL_TRANSFER_SLIPS: "Material Transfer Slips",
  OSM_ACKNOWLEDGMENT:      "OSM Acknowledgment",
  SUBCON_BILLING_INVOICE:  "Subcon Billing Invoice",
  QUALITY_CLEARANCE:       "Quality Clearance",
};

export default async function InspectionsPage() {
  await getAuthUser();

  // WARs in PENDING_AUDIT status — ready for inspection
  const pendingWars = await db
    .select({
      id:                  workAccomplishedReports.id,
      grossAccomplishment: workAccomplishedReports.grossAccomplishment,
      status:              workAccomplishedReports.status,
      submittedAt:         workAccomplishedReports.submittedAt,
      unitCode:            projectUnits.unitCode,
      unitModel:           projectUnits.unitModel,
      projName:            projects.name,
      projId:              projects.id,
      subName:             subcontractors.name,
    })
    .from(workAccomplishedReports)
    .leftJoin(projectUnits,   eq(workAccomplishedReports.unitId,           projectUnits.id))
    .leftJoin(projects,       eq(workAccomplishedReports.projectId,        projects.id))
    .leftJoin(taskAssignments, eq(workAccomplishedReports.taskAssignmentId, taskAssignments.id))
    .leftJoin(subcontractors, eq(taskAssignments.subconId,                 subcontractors.id))
    .where(eq(workAccomplishedReports.status, "PENDING_AUDIT"))
    .orderBy(desc(workAccomplishedReports.submittedAt));

  // All milestone documents pending verification
  const pendingDocs = await db
    .select({
      id:        milestoneDocuments.id,
      docType:   milestoneDocuments.docType,
      uploadedAt: milestoneDocuments.uploadedAt,
      isVerified: milestoneDocuments.isVerified,
      warId:     milestoneDocuments.warId,
    })
    .from(milestoneDocuments)
    .where(eq(milestoneDocuments.isVerified, false))
    .orderBy(desc(milestoneDocuments.uploadedAt));

  const docsByWar = new Map<string, typeof pendingDocs[number][]>();
  for (const d of pendingDocs) {
    if (!docsByWar.has(d.warId)) docsByWar.set(d.warId, []);
    docsByWar.get(d.warId)!.push(d);
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Audit & Quality</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Inspections</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {pendingWars.length} WAR{pendingWars.length !== 1 ? "s" : ""} pending audit · {pendingDocs.length} document{pendingDocs.length !== 1 ? "s" : ""} pending verification
          </p>
        </div>

        {/* WARs awaiting inspection */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>WARs Pending Audit</h2>

        {pendingWars.length === 0 ? (
          <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", marginBottom: "1.5rem" }}>
            No WARs pending audit.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "2rem" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Unit", "Subcontractor", "Gross Amount", "Submitted", "Docs Pending", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 3 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingWars.map((war) => {
                    const warPendingDocs = docsByWar.get(war.id) ?? [];
                    return (
                      <tr key={war.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{war.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600 }}>{war.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{war.subName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700 }}>
                          PHP {Number(war.grossAccomplishment).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{new Date(war.submittedAt).toLocaleDateString("en-PH")}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {warPendingDocs.length > 0
                            ? <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b91c1c", background: "#fef2f2", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                                {warPendingDocs.length} unverified
                              </span>
                            : <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>none</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/construction/war/${war.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>Inspect →</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending document verifications */}
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Unverified Milestone Documents</h2>

        {pendingDocs.length === 0 ? (
          <div style={{ padding: "2rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            All documents verified.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Document Type", "Uploaded", "WAR"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingDocs.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>
                        {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>
                        {new Date(doc.uploadedAt).toLocaleDateString("en-PH")}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <a href={`/construction/war/${doc.warId}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View WAR →</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
