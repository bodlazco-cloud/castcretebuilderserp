export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, developers, projectUnits, taskAssignments } from "@/db/schema";
import { eq, count, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#057a55";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#dcfce7", color: "#166534" },
  BIDDING:   { bg: "#eff6ff", color: "#1e40af" },
  ON_HOLD:   { bg: "#fef9c3", color: "#713f12" },
  COMPLETED: { bg: "#f0fdf4", color: "#166534" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function SitesPage() {
  await getAuthUser();

  const projectRows = await db
    .select({
      id:            projects.id,
      name:          projects.name,
      status:        projects.status,
      startDate:     projects.startDate,
      endDate:       projects.endDate,
      bodApprovedAt: projects.bodApprovedAt,
      devName:       developers.name,
    })
    .from(projects)
    .leftJoin(developers, eq(projects.developerId, developers.id))
    .orderBy(projects.name);

  const unitCounts = await db
    .select({ projectId: projectUnits.projectId, total: count() })
    .from(projectUnits)
    .groupBy(projectUnits.projectId);

  const activeCounts = await db
    .select({ projectId: taskAssignments.projectId, active: count() })
    .from(taskAssignments)
    .where(eq(taskAssignments.status, "ACTIVE"))
    .groupBy(taskAssignments.projectId);

  const unitMap = Object.fromEntries(unitCounts.map((r) => [r.projectId, Number(r.total)]));
  const activeMap = Object.fromEntries(activeCounts.map((r) => [r.projectId, Number(r.active)]));

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/construction" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Construction</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Sites</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Active and completed construction sites overview.</p>
          </div>
          <a href="/master-list/projects/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#6366f1",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Project</a>
        </div>

        {projectRows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No projects yet. <a href="/master-list/projects/new" style={{ color: "#6366f1" }}>Add first project →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project Name", "Developer", "Status", "BOD Gate", "Units", "Active NTPs", "Start", "End", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectRows.map((p) => {
                    const sc = STATUS_STYLE[p.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 600, color: "#111827" }}>{p.name}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{p.devName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: sc.bg, color: sc.color }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {p.bodApprovedAt
                            ? <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#166534" }}>✓ Approved</span>
                            : <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b91c1c" }}>Pending</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{unitMap[p.id] ?? 0}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{activeMap[p.id] ?? 0}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{p.startDate ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>{p.endDate ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/master-list/projects/${p.id}`} style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>Manage →</a>
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
