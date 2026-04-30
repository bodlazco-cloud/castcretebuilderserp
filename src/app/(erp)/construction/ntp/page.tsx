export const dynamic = "force-dynamic";
import { db } from "@/db";
import { taskAssignments, projectUnits, subcontractors, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: "#f3f4f6", color: "#6b7280" },
  ACTIVE:    { bg: "#dcfce7", color: "#166534" },
  COMPLETED: { bg: "#eff6ff", color: "#1e40af" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function NtpRegisterPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:        taskAssignments.id,
      category:  taskAssignments.category,
      workType:  taskAssignments.workType,
      startDate: taskAssignments.startDate,
      endDate:   taskAssignments.endDate,
      status:    taskAssignments.status,
      issuedAt:  taskAssignments.issuedAt,
      unitCode:  projectUnits.unitCode,
      unitModel: projectUnits.unitModel,
      subName:   subcontractors.name,
      subCode:   subcontractors.code,
      projName:  projects.name,
    })
    .from(taskAssignments)
    .leftJoin(projectUnits,    eq(taskAssignments.unitId,    projectUnits.id))
    .leftJoin(subcontractors,  eq(taskAssignments.subconId,  subcontractors.id))
    .leftJoin(projects,        eq(taskAssignments.projectId, projects.id))
    .orderBy(desc(taskAssignments.issuedAt));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>NTP Register</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Notice-to-Proceed register — issued, active, and closed NTPs.</p>
          </div>
          <a href="/construction/issue-ntp" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Issue NTP</a>
        </div>

        {/* Status filter summary */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {["ACTIVE", "DRAFT", "COMPLETED", "CANCELLED"].map((s) => {
              const count = rows.filter((r) => r.status === s).length;
              if (count === 0) return null;
              const st = STATUS_STYLE[s] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <span key={s} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: st.bg, color: st.color }}>
                  {s}: {count}
                </span>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No NTPs issued yet. <a href="/construction/issue-ntp" style={{ color: ACCENT }}>Issue first NTP →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Unit", "Subcontractor", "Category", "Work Type", "Start", "End", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
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
                          {r.unitModel && <span style={{ marginLeft: "0.35rem", fontSize: "0.78rem", color: "#9ca3af" }}>{r.unitModel}</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.subName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.category}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.workType}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.startDate}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{r.endDate}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/construction/ntp/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
