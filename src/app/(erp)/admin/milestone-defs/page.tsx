export const dynamic = "force-dynamic";
import { db } from "@/db";
import { milestoneDefinitions, projects, activityDefinitions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { AddMilestoneDefForm } from "./AddMilestoneDefForm";

const ACCENT = "#dc2626";

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  SLAB:           { bg: "#e0f2fe", color: "#0369a1" },
  STRUCTURAL:     { bg: "#fef9c3", color: "#713f12" },
  SPECIALTY_WORKS:{ bg: "#fde8d8", color: "#9a3412" },
  MEPF:           { bg: "#f3e8ff", color: "#6b21a8" },
  ARCHITECTURAL:  { bg: "#dcfce7", color: "#166534" },
  TURNOVER:       { bg: "#f0fdf4", color: "#057a55" },
};

export default async function MilestoneDefsPage() {
  await getAuthUser();

  type MilestoneRow = {
    id: string; name: string; scopeCode: string | null; scopeName: string | null;
    category: string; sequenceOrder: number | null; triggersBilling: boolean;
    weightPct: string | number; isActive: boolean; projName: string | null;
  };

  let rows: MilestoneRow[] = [];
  let needsMigration = false;

  try {
    rows = await db
      .select({
        id:              milestoneDefinitions.id,
        name:            milestoneDefinitions.name,
        scopeCode:       milestoneDefinitions.scopeCode,
        scopeName:       milestoneDefinitions.scopeName,
        category:        milestoneDefinitions.category,
        sequenceOrder:   milestoneDefinitions.sequenceOrder,
        triggersBilling: milestoneDefinitions.triggersBilling,
        weightPct:       milestoneDefinitions.weightPct,
        isActive:        milestoneDefinitions.isActive,
        projName:        projects.name,
      })
      .from(milestoneDefinitions)
      .leftJoin(projects, eq(milestoneDefinitions.projectId, projects.id))
      .orderBy(projects.name, milestoneDefinitions.sequenceOrder);
  } catch {
    needsMigration = true;
    const raw = await db.execute(sql`
      SELECT md.id, md.name, NULL::text AS scope_code, NULL::text AS scope_name,
             md.category, md.sequence_order, md.triggers_billing, md.weight_pct, md.is_active,
             p.name AS proj_name
      FROM milestone_definitions md
      LEFT JOIN projects p ON p.id = md.project_id
      ORDER BY p.name, md.sequence_order
    `);
    rows = (raw as unknown as Record<string, unknown>[]).map((r) => ({
      id:              r.id as string,
      name:            r.name as string,
      scopeCode:       null,
      scopeName:       null,
      category:        r.category as string,
      sequenceOrder:   r.sequence_order as number | null,
      triggersBilling: r.triggers_billing as boolean,
      weightPct:       r.weight_pct as string,
      isActive:        r.is_active as boolean,
      projName:        r.proj_name as string | null,
    }));
  }

  const [projectRows, sowRows] = await Promise.all([
    db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(projects.name),
    db.select({
        id:        activityDefinitions.id,
        projectId: activityDefinitions.projectId,
        scopeCode: activityDefinitions.scopeCode,
        scopeName: activityDefinitions.scopeName,
        category:  activityDefinitions.category,
      })
      .from(activityDefinitions)
      .where(eq(activityDefinitions.isActive, true))
      .orderBy(activityDefinitions.scopeCode),
  ]);

  // Deduplicate scopes per project
  const seenScopes = new Set<string>();
  const dedupedScopes = sowRows.filter((s) => {
    const key = `${s.projectId}::${s.scopeCode}`;
    if (seenScopes.has(key)) return false;
    seenScopes.add(key);
    return true;
  });

  const billing = rows.filter((r) => r.triggersBilling).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Milestone Definitions</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {rows.length} total · {billing} trigger billing · Connected to Scope of Work
            </p>
          </div>
          <AddMilestoneDefForm projects={projectRows} scopes={dedupedScopes} />
        </div>

        {needsMigration && (
          <div style={{ padding: "0.85rem 1rem", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "6px", fontSize: "0.875rem", color: "#92400e", marginBottom: "1.5rem" }}>
            <strong>Migration needed:</strong> Run migration 014 in Supabase SQL editor to enable Scope of Work linking on milestones. SOW columns are shown as — until then.
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No milestone definitions yet. Add one to get started.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "820px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["#", "Project", "Scope of Work", "Milestone Name", "Category", "Weight %", "Billing", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: [5].includes(i) ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const cc = CATEGORY_COLORS[r.category] ?? { bg: "#f3f4f6", color: "#374151" };
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#9ca3af", fontSize: "0.8rem" }}>{r.sequenceOrder}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.82rem" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.82rem" }}>
                          {r.scopeName ? (
                            <span title={r.scopeCode ?? ""}>{r.scopeName}</span>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 600, color: "#111827" }}>{r.name}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: cc.bg, color: cc.color }}>
                            {r.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700, color: "#374151" }}>{Number(r.weightPct).toFixed(2)}%</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.triggersBilling ? (
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#fef9c3", color: "#713f12" }}>BILLING</span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>—</span>
                          )}
                        </td>
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
