export const dynamic = "force-dynamic";
import { db } from "@/db";
import { activityDefinitions, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  CIVIL:        { bg: "#eff6ff", color: "#1a56db" },
  STRUCTURAL:   { bg: "#f0fdf4", color: "#057a55" },
  ARCHITECTURAL: { bg: "#fef9c3", color: "#713f12" },
  MEP:          { bg: "#faf5ff", color: "#7e3af2" },
  FINISHING:    { bg: "#fff7ed", color: "#c2410c" },
};

export default async function ActivityDefsPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:                   activityDefinitions.id,
      scopeCode:            activityDefinitions.scopeCode,
      scopeName:            activityDefinitions.scopeName,
      activityCode:         activityDefinitions.activityCode,
      activityName:         activityDefinitions.activityName,
      category:             activityDefinitions.category,
      standardDurationDays: activityDefinitions.standardDurationDays,
      weightInScopePct:     activityDefinitions.weightInScopePct,
      sequenceOrder:        activityDefinitions.sequenceOrder,
      isActive:             activityDefinitions.isActive,
      projName:             projects.name,
    })
    .from(activityDefinitions)
    .leftJoin(projects, eq(activityDefinitions.projectId, projects.id))
    .orderBy(projects.name, activityDefinitions.sequenceOrder);

  const active = rows.filter((r) => r.isActive).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Activity Definitions</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{active} active · {rows.length} total</p>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No activity definitions yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["#", "Project", "Scope", "Activity", "Category", "Duration", "Weight %", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i >= 5 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const catSt = CAT_STYLE[r.category] ?? { bg: "#f3f4f6", color: "#374151" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#9ca3af", fontSize: "0.8rem" }}>{r.sequenceOrder}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.82rem" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ fontWeight: 600, color: "#374151", fontSize: "0.82rem" }}>{r.scopeCode}</div>
                          <div style={{ color: "#6b7280", fontSize: "0.78rem" }}>{r.scopeName}</div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ fontWeight: 600, color: "#111827" }}>{r.activityCode}</div>
                          <div style={{ color: "#6b7280", fontSize: "0.78rem" }}>{r.activityName}</div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: catSt.bg, color: catSt.color }}>{r.category}</span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#374151" }}>{r.standardDurationDays}d</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#374151" }}>{Number(r.weightInScopePct).toFixed(2)}%</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: r.isActive ? "#f0fdf4" : "#f3f4f6", color: r.isActive ? "#057a55" : "#9ca3af" }}>
                            {r.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
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
