export const dynamic = "force-dynamic";
import { db } from "@/db";
import { punchLists, projects, projectUnits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#7e3af2";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  OPEN:        { bg: "#fef2f2", color: "#b91c1c" },
  IN_PROGRESS: { bg: "#fef9c3", color: "#713f12" },
  CLOSED:      { bg: "#dcfce7", color: "#166534" },
};

export default async function QaPunchListPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:        punchLists.id,
      item:      punchLists.item,
      category:  punchLists.category,
      status:    punchLists.status,
      dueDate:   punchLists.dueDate,
      closedAt:  punchLists.closedAt,
      createdAt: punchLists.createdAt,
      projName:  projects.name,
      projId:    projects.id,
      unitCode:  projectUnits.unitCode,
    })
    .from(punchLists)
    .leftJoin(projects,      eq(punchLists.projectId, projects.id))
    .leftJoin(projectUnits,  eq(punchLists.unitId,    projectUnits.id))
    .orderBy(desc(punchLists.createdAt));

  const open       = rows.filter((r) => r.status === "OPEN").length;
  const inProgress = rows.filter((r) => r.status === "IN_PROGRESS").length;
  const closed     = rows.filter((r) => r.status === "CLOSED").length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Audit & Quality</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>QA Punch List</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {open} open · {inProgress} in progress · {closed} closed
            </p>
          </div>
          <a href="/audit/qa-punch-list/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ Add Item</a>
        </div>

        {/* Status pills */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {Object.entries(STATUS_STYLE).map(([s, st]) => {
              const c = rows.filter((r) => r.status === s).length;
              if (c === 0) return null;
              return (
                <span key={s} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: st.bg, color: st.color }}>
                  {s.replace(/_/g, " ")}: {c}
                </span>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No punch list items yet. <a href="/audit/qa-punch-list/new" style={{ color: ACCENT }}>Add first item →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "780px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Unit", "Category", "Item", "Status", "Due", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.OPEN;
                    const isOverdue = r.dueDate && r.status !== "CLOSED" && new Date(r.dueDate) < new Date();
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: isOverdue ? "#fff7f7" : "transparent" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem" }}>{r.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#f3f4f6", color: "#374151" }}>
                            {r.category}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.item}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: isOverdue ? "#b91c1c" : "#6b7280", fontWeight: isOverdue ? 700 : 400 }}>
                          {r.dueDate ?? "—"}
                          {isOverdue && <span style={{ marginLeft: "0.25rem", fontSize: "0.72rem" }}>OVERDUE</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/audit/qa-punch-list/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>View →</a>
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
