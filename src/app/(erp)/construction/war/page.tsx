export const dynamic = "force-dynamic";
import { db } from "@/db";
import { workAccomplishedReports, projectUnits, projects, taskAssignments, subcontractors } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:                  { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW:         { bg: "#fef9c3", color: "#713f12" },
  PENDING_AUDIT:          { bg: "#eff6ff", color: "#1e40af" },
  READY_FOR_APPROVAL:     { bg: "#e0e7ff", color: "#3730a3" },
  APPROVED:               { bg: "#dcfce7", color: "#166534" },
  REJECTED:               { bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED:              { bg: "#f3f4f6", color: "#6b7280" },
};

export default async function WarListPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:                  workAccomplishedReports.id,
      grossAccomplishment: workAccomplishedReports.grossAccomplishment,
      status:              workAccomplishedReports.status,
      submittedAt:         workAccomplishedReports.submittedAt,
      unitCode:            projectUnits.unitCode,
      unitModel:           projectUnits.unitModel,
      projName:            projects.name,
      subName:             subcontractors.name,
    })
    .from(workAccomplishedReports)
    .leftJoin(projectUnits,   eq(workAccomplishedReports.unitId,             projectUnits.id))
    .leftJoin(projects,       eq(workAccomplishedReports.projectId,          projects.id))
    .leftJoin(taskAssignments, eq(workAccomplishedReports.taskAssignmentId,  taskAssignments.id))
    .leftJoin(subcontractors, eq(taskAssignments.subconId,                   subcontractors.id))
    .orderBy(desc(workAccomplishedReports.submittedAt));

  const totalGross = rows.reduce((sum, r) => sum + Number(r.grossAccomplishment), 0);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Work Accomplished Reports</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              All WARs — {rows.length} total, PHP {totalGross.toLocaleString("en-PH", { minimumFractionDigits: 2 })} gross
            </p>
          </div>
          <a href="/construction/submit-war" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Submit WAR</a>
        </div>

        {/* Status summary pills */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {Object.keys(STATUS_STYLE).map((s) => {
              const count = rows.filter((r) => r.status === s).length;
              if (count === 0) return null;
              const st = STATUS_STYLE[s];
              return (
                <span key={s} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: st.bg, color: st.color }}>
                  {s.replace(/_/g, " ")}: {count}
                </span>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No WARs yet. <a href="/construction/submit-war" style={{ color: ACCENT }}>Submit first WAR →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Unit", "Subcontractor", "Gross Amount", "Status", "Submitted", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 3 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#111827" }}>{r.unitCode ?? "—"}</span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.subName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700, color: "#111827" }}>
                          PHP {Number(r.grossAccomplishment).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>
                          {new Date(r.submittedAt).toLocaleDateString("en-PH")}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/construction/war/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
