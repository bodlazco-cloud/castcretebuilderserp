export const dynamic = "force-dynamic";
import { db } from "@/db";
import { subcontractors, taskAssignments, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";

const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

const GRADE_STYLE: Record<string, { bg: string; color: string }> = {
  A: { bg: "#dcfce7", color: "#166534" },
  B: { bg: "#fef9c3", color: "#713f12" },
  C: { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function SubconDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [sub] = await db
    .select()
    .from(subcontractors)
    .where(eq(subcontractors.id, id));

  if (!sub) notFound();

  const assignments = await db
    .select({
      id:       taskAssignments.id,
      category: taskAssignments.category,
      workType: taskAssignments.workType,
      status:   taskAssignments.status,
      startDate: taskAssignments.startDate,
      endDate:   taskAssignments.endDate,
      projName: projects.name,
    })
    .from(taskAssignments)
    .leftJoin(projects, eq(taskAssignments.projectId, projects.id))
    .where(eq(taskAssignments.subconId, id))
    .orderBy(taskAssignments.startDate);

  const gs = GRADE_STYLE[sub.performanceGrade] ?? { bg: "#f3f4f6", color: "#6b7280" };

  const TASK_STATUS: Record<string, { bg: string; color: string }> = {
    DRAFT:     { bg: "#f3f4f6", color: "#6b7280" },
    ACTIVE:    { bg: "#dcfce7", color: "#166534" },
    COMPLETED: { bg: "#eff6ff", color: "#1e40af" },
    CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/subcontractors" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Subcontractors</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#6b7280" }}>{sub.code}</p>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{sub.name}</h1>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: gs.bg, color: gs.color }}>
                Grade {sub.performanceGrade} — {Number(sub.performanceScore).toFixed(1)}
              </span>
              {sub.stopAssignment && (
                <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: "#fef2f2", color: "#b91c1c" }}>
                  Assignment Stopped
                </span>
              )}
              <span style={{
                display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                background: sub.isActive ? "#dcfce7" : "#f3f4f6", color: sub.isActive ? "#166534" : "#6b7280",
              }}>{sub.isActive ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div><div style={LABEL}>Trade Types</div><div style={VALUE}>{sub.tradeTypes.join(", ")}</div></div>
            <div><div style={LABEL}>Max Active Units</div><div style={VALUE}>{sub.defaultMaxActiveUnits}</div></div>
            <div><div style={LABEL}>Manpower Benchmark</div><div style={VALUE}>{Number(sub.manpowerBenchmark).toFixed(2)} workers/unit</div></div>
            <div><div style={LABEL}>Performance Score</div><div style={VALUE}>{Number(sub.performanceScore).toFixed(2)}</div></div>
            <div><div style={LABEL}>Added</div><div style={VALUE}>{new Date(sub.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
          </div>
        </div>

        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
          Task Assignments ({assignments.length})
        </h2>
        {assignments.length === 0 ? (
          <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
            No task assignments yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Project", "Category", "Work Type", "Status", "Start", "End"].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const ts = TASK_STATUS[a.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.6rem 0.9rem", fontWeight: 500, color: "#111827" }}>{a.projName ?? "—"}</td>
                      <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{a.category}</td>
                      <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{a.workType}</td>
                      <td style={{ padding: "0.6rem 0.9rem" }}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: ts.bg, color: ts.color }}>{a.status}</span>
                      </td>
                      <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{a.startDate}</td>
                      <td style={{ padding: "0.6rem 0.9rem", color: "#6b7280" }}>{a.endDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
