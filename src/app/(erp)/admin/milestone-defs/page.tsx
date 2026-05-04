export const dynamic = "force-dynamic";
import { db } from "@/db";
import { milestoneDefinitions } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

export default async function MilestoneDefsPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:              milestoneDefinitions.id,
      name:            milestoneDefinitions.name,
      category:        milestoneDefinitions.category,
      sequenceOrder:   milestoneDefinitions.sequenceOrder,
      triggersBilling: milestoneDefinitions.triggersBilling,
      weightPct:       milestoneDefinitions.weightPct,
      isActive:        milestoneDefinitions.isActive,
    })
    .from(milestoneDefinitions)
    .orderBy(milestoneDefinitions.category, milestoneDefinitions.sequenceOrder);

  const billing = rows.filter((r) => r.triggersBilling).length;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Milestone Definitions</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            {rows.length} total · {billing} trigger billing
          </p>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No milestone definitions yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "700px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["#", "Milestone Name", "Category", "Weight %", "Billing Trigger", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: [3].includes(i) ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                      <td style={{ padding: "0.65rem 1rem", color: "#9ca3af", fontSize: "0.8rem" }}>{r.sequenceOrder}</td>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 600, color: "#111827" }}>{r.name}</td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#f3f4f6", color: "#374151" }}>{r.category}</span>
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
