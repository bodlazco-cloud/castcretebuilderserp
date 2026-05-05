export const dynamic = "force-dynamic";
import { db } from "@/db";
import { subcontractorRateCards, subcontractors, projects, activityDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#6366f1";

export default async function SubconRateCardsPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:           subcontractorRateCards.id,
      ratePerUnit:  subcontractorRateCards.ratePerUnit,
      retentionPct: subcontractorRateCards.retentionPct,
      version:      subcontractorRateCards.version,
      isActive:     subcontractorRateCards.isActive,
      subconName:   subcontractors.name,
      subconCode:   subcontractors.code,
      projName:     projects.name,
      actCode:      activityDefinitions.activityCode,
      actName:      activityDefinitions.activityName,
    })
    .from(subcontractorRateCards)
    .leftJoin(subcontractors,      eq(subcontractorRateCards.subconId,      subcontractors.id))
    .leftJoin(projects,            eq(subcontractorRateCards.projectId,     projects.id))
    .leftJoin(activityDefinitions, eq(subcontractorRateCards.activityDefId, activityDefinitions.id))
    .orderBy(subcontractors.name, projects.name);

  const active = rows.filter((r) => r.isActive).length;
  const fmt = (v: string | null) => v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";
  const pct = (v: string | null) => v != null ? `${(Number(v) * 100).toFixed(2)}%` : "—";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Subcontractor Rate Cards</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              {active} active · {rows.length} total — rate per unit by subcontractor, project, and activity.
            </p>
          </div>
          <a href="/admin/subcon-rate-cards/new" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: ACCENT,
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>+ New Rate Card</a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No subcontractor rate cards yet. <a href="/admin/subcon-rate-cards/new" style={{ color: ACCENT }}>Add first →</a>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Subcontractor", "Project", "Activity", "Rate/Unit", "Retention", "Net Rate", "Ver", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: [3, 4, 5].includes(i) ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const rate   = Number(r.ratePerUnit);
                    const ret    = rate * Number(r.retentionPct ?? 0);
                    const net    = rate - ret;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem" }}>{r.subconName ?? "—"}</div>
                          <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#9ca3af" }}>{r.subconCode ?? ""}</div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.82rem" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#374151" }}>{r.actCode ?? "—"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{r.actName ?? ""}</div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(r.ratePerUnit)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#b91c1c" }}>{pct(r.retentionPct)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#057a55" }}>
                          PHP {net.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>v{r.version}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: r.isActive ? "#f0fdf4" : "#f3f4f6", color: r.isActive ? "#057a55" : "#9ca3af" }}>
                            {r.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <a href={`/admin/subcon-rate-cards/${r.id}`} style={{ color: ACCENT, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>Edit →</a>
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
