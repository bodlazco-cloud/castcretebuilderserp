export const dynamic = "force-dynamic";
import { db } from "@/db";
import { unitMilestones, milestoneDefinitions, projectUnits, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#7e3af2";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDING:    { bg: "#f3f4f6", color: "#6b7280" },
  IN_PROGRESS:{ bg: "#fef9c3", color: "#713f12" },
  COMPLETED:  { bg: "#eff6ff", color: "#1e40af" },
  VERIFIED:   { bg: "#dcfce7", color: "#166534" },
};

export default async function MilestoneVerificationPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:            unitMilestones.id,
      status:        unitMilestones.status,
      startedAt:     unitMilestones.startedAt,
      completedAt:   unitMilestones.completedAt,
      verifiedAt:    unitMilestones.verifiedAt,
      unitCode:      projectUnits.unitCode,
      unitModel:     projectUnits.unitModel,
      projName:      projects.name,
      projId:        projects.id,
      milestoneName: milestoneDefinitions.name,
      milestoneCategory: milestoneDefinitions.category,
      triggersBilling:   milestoneDefinitions.triggersBilling,
      weightPct:         milestoneDefinitions.weightPct,
    })
    .from(unitMilestones)
    .leftJoin(milestoneDefinitions, eq(unitMilestones.milestoneDefId,   milestoneDefinitions.id))
    .leftJoin(projectUnits,         eq(unitMilestones.unitId,           projectUnits.id))
    .leftJoin(projects,             eq(projectUnits.projectId,          projects.id))
    .orderBy(desc(unitMilestones.completedAt));

  const pending  = rows.filter((r) => r.status === "COMPLETED").length;
  const verified = rows.filter((r) => r.status === "VERIFIED").length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/audit" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Audit & Quality</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Milestone Verification</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {rows.length} milestones — {pending} completed (awaiting verification) · {verified} verified
          </p>
        </div>

        {/* Filter pills */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {Object.entries(STATUS_STYLE).map(([s, st]) => {
              const c = rows.filter((r) => r.status === s).length;
              if (c === 0) return null;
              return (
                <span key={s} style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, background: st.bg, color: st.color }}>
                  {s}: {c}
                </span>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No unit milestones yet. Milestones are created when units are added to projects.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "880px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Unit", "Milestone", "Category", "Billing", "Weight", "Status", "Completed", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.PENDING;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500 }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.82rem", color: "#111827" }}>{r.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{r.milestoneName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>{r.milestoneCategory ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {r.triggersBilling
                            ? <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#166534", background: "#dcfce7", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>BILLING</span>
                            : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{Number(r.weightPct ?? 0).toFixed(1)}%</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>
                          {r.completedAt ? new Date(r.completedAt).toLocaleDateString("en-PH") : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/audit/milestone-verification/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>
                            {r.status === "COMPLETED" ? "Verify →" : "View →"}
                          </a>
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
