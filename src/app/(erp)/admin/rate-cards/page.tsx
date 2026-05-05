export const dynamic = "force-dynamic";
import { db } from "@/db";
import { developerRateCards, activityDefinitions, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#dc2626";

export default async function RateCardsPage() {
  await getAuthUser();

  const rows = await db
    .select({
      id:               developerRateCards.id,
      grossRatePerUnit: developerRateCards.grossRatePerUnit,
      retentionPct:     developerRateCards.retentionPct,
      dpRecoupmentPct:  developerRateCards.dpRecoupmentPct,
      taxPct:           developerRateCards.taxPct,
      version:          developerRateCards.version,
      isActive:         developerRateCards.isActive,
      activityCode:     activityDefinitions.activityCode,
      activityName:     activityDefinitions.activityName,
      projName:         projects.name,
    })
    .from(developerRateCards)
    .leftJoin(activityDefinitions, eq(developerRateCards.activityDefId, activityDefinitions.id))
    .leftJoin(projects,            eq(developerRateCards.projectId,     projects.id))
    .orderBy(projects.name, activityDefinitions.activityCode);

  const active = rows.filter((r) => r.isActive).length;
  const fmt = (v: string | null) =>
    v != null ? `PHP ${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";
  const pct = (v: string | null) =>
    v != null ? `${(Number(v) * 100).toFixed(2)}%` : "—";

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/admin" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Administration</a>
        </div>

        <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Developer Rate Cards</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Gross rate per unit per activity, with retention, DP recoupment, and tax rates.
            </p>
            <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
              {active} active · {rows.length} total
            </p>
          </div>
          <a href="/admin/rate-cards/new" style={{
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
            padding: "0.6rem 1.2rem", borderRadius: "6px",
            background: ACCENT, color: "#fff",
            fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
            whiteSpace: "nowrap",
          }}>
            + New Rate Card
          </a>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No rate cards configured yet.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "900px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Activity", "Gross Rate/Unit", "Retention", "DP Recoup", "Tax", "Net Rate", "Ver", "Status", ""].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: [2, 3, 4, 5, 6].includes(i) ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const gross   = Number(r.grossRatePerUnit);
                    const ret     = gross * Number(r.retentionPct ?? 0);
                    const dp      = gross * Number(r.dpRecoupmentPct ?? 0);
                    const tax     = gross * Number(r.taxPct ?? 0);
                    const netRate = gross - ret - dp - tax;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: r.isActive ? 1 : 0.5 }}>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", fontSize: "0.82rem" }}>{r.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#374151" }}>{r.activityCode ?? "—"}</div>
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{r.activityName ?? ""}</div>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(r.grossRatePerUnit)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#b91c1c" }}>{pct(r.retentionPct)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#b91c1c" }}>{pct(r.dpRecoupmentPct)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#b91c1c" }}>{pct(r.taxPct)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#057a55" }}>
                          PHP {netRate.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem" }}>v{r.version}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: r.isActive ? "#f0fdf4" : "#f3f4f6", color: r.isActive ? "#057a55" : "#9ca3af" }}>
                            {r.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <a href={`/admin/rate-cards/${r.id}`} style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>
                            Edit →
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
