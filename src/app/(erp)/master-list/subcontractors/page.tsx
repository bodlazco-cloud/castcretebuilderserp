export const dynamic = "force-dynamic";
import { db } from "@/db";
import { subcontractors } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase-server";

const GRADE_STYLE: Record<string, { bg: string; color: string }> = {
  A: { bg: "#dcfce7", color: "#166534" },
  B: { bg: "#fef9c3", color: "#713f12" },
  C: { bg: "#fef2f2", color: "#b91c1c" },
};

export default async function SubcontractorsPage() {
  await getAuthUser();
  const rows = await db
    .select({
      id:                   subcontractors.id,
      code:                 subcontractors.code,
      name:                 subcontractors.name,
      tradeTypes:           subcontractors.tradeTypes,
      defaultMaxActiveUnits: subcontractors.defaultMaxActiveUnits,
      performanceGrade:     subcontractors.performanceGrade,
      performanceScore:     subcontractors.performanceScore,
      stopAssignment:       subcontractors.stopAssignment,
      isActive:             subcontractors.isActive,
    })
    .from(subcontractors)
    .orderBy(subcontractors.name);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Master List</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Subcontractors</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Accredited subcontractors, performance grades, and assignment status.</p>
          </div>
          <a href="/master-list/subcontractors/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#6366f1",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Subcontractor</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No subcontractors yet. Click &ldquo;+ Add Subcontractor&rdquo; to get started.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Code", "Name", "Trade Types", "Max Units", "Grade", "Score", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const gs = GRADE_STYLE[r.performanceGrade] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#374151" }}>{r.code}</td>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#111827" }}>{r.name}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.tradeTypes.join(", ")}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.defaultMaxActiveUnits}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, background: gs.bg, color: gs.color }}>
                            {r.performanceGrade}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{Number(r.performanceScore).toFixed(1)}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.stopAssignment ? (
                            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#fef2f2", color: "#b91c1c" }}>Stop</span>
                          ) : r.isActive ? (
                            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#dcfce7", color: "#166534" }}>Active</span>
                          ) : (
                            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#f3f4f6", color: "#6b7280" }}>Inactive</span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/master-list/subcontractors/${r.id}`} style={{ color: "#6366f1", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
