export const dynamic = "force-dynamic";

import { db } from "@/db";
import { fuelLogs, equipment, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)),
    ]);
  } catch {
    return fallback;
  }
}

export default async function FuelLogsPage() {
  const rows = await safe(
    () =>
      db
        .select({
          id: fuelLogs.id,
          logDate: fuelLogs.logDate,
          engineHoursStart: fuelLogs.engineHoursStart,
          engineHoursEnd: fuelLogs.engineHoursEnd,
          engineHoursTotal: fuelLogs.engineHoursTotal,
          fuelConsumedLiters: fuelLogs.fuelConsumedLiters,
          fuelEfficiencyActual: fuelLogs.fuelEfficiencyActual,
          fuelStandardLitersPerHour: fuelLogs.fuelStandardLitersPerHour,
          efficiencyVariancePct: fuelLogs.efficiencyVariancePct,
          isFlagged: fuelLogs.isFlagged,
          equipCode: equipment.code,
          equipName: equipment.name,
          operatorName: users.fullName,
        })
        .from(fuelLogs)
        .leftJoin(equipment, eq(fuelLogs.equipmentId, equipment.id))
        .leftJoin(users, eq(fuelLogs.operatorId, users.id))
        .orderBy(desc(fuelLogs.logDate))
        .limit(200),
    []
  );

  const totalLiters = rows.reduce((sum, r) => sum + Number(r.fuelConsumedLiters ?? 0), 0);
  const flaggedCount = rows.filter((r) => r.isFlagged).length;
  const varianceRows = rows.filter((r) => r.efficiencyVariancePct != null);
  const avgVariancePct =
    varianceRows.length > 0
      ? varianceRows.reduce((sum, r) => sum + Number(r.efficiencyVariancePct), 0) / varianceRows.length
      : 0;

  const fmtDate = (d: string | Date | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const kpiCard = (
    label: string,
    value: string,
    accent: string,
    sub?: string
  ) => (
    <div
      style={{
        flex: "1 1 0",
        minWidth: "160px",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        padding: "1.1rem 1.25rem",
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.8rem", color: "#0694a2", textDecoration: "none" }}>← Motorpool</a>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Fuel Logs</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>Fuel consumption history per equipment unit.</p>
          </div>
          <a
            href="/motorpool/log-fuel"
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "6px",
              background: "#0694a2",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            + Log Fuel
          </a>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {kpiCard("Total Logs", String(rows.length), "#0694a2")}
          {kpiCard("Total Fuel", `${totalLiters.toFixed(1)} L`, "#1a56db")}
          {kpiCard("Flagged", String(flaggedCount), "#dc2626")}
          {kpiCard(
            "Avg Variance",
            `${avgVariancePct >= 0 ? "+" : ""}${avgVariancePct.toFixed(1)}%`,
            flaggedCount > 0 ? "#dc2626" : "#057a55",
            "efficiency vs standard"
          )}
        </div>

        {flaggedCount > 0 && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #f59e0b",
              borderRadius: "8px",
              padding: "0.85rem 1.1rem",
              color: "#92400e",
              fontSize: "0.875rem",
              fontWeight: 500,
              marginBottom: "1.25rem",
            }}
          >
            ⚠ {flaggedCount} fuel log(s) flagged for abnormal consumption — review below.
          </div>
        )}

        {rows.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              padding: "3rem",
              textAlign: "center",
              color: "#9ca3af",
              fontSize: "0.95rem",
            }}
          >
            No fuel logs found.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.855rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Date", "Equipment", "Operator", "Engine Hours", "Fuel (L)", "Std (L/hr)", "Actual (L/hr)", "Variance", "Flag"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.7rem 0.9rem",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const actual = Number(r.fuelEfficiencyActual ?? 0);
                  const standard = Number(r.fuelStandardLitersPerHour ?? 0);
                  const variancePct = r.efficiencyVariancePct != null ? Number(r.efficiencyVariancePct) : null;

                  let actualColor = "#111827";
                  if (standard > 0) {
                    if (actual > standard * 1.1) actualColor = "#dc2626";
                    else if (actual < standard * 0.9) actualColor = "#057a55";
                  }

                  let varianceColor = "#111827";
                  if (variancePct != null) {
                    if (variancePct > 0) varianceColor = "#dc2626";
                    else if (variancePct < 0) varianceColor = "#057a55";
                  }

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        background: r.isFlagged ? "#fef2f2" : undefined,
                      }}
                    >
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap", color: "#374151" }}>
                        {fmtDate(r.logDate)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#0694a2", fontWeight: 600 }}>
                          {r.equipCode ?? "—"}
                        </span>
                        {r.equipName && (
                          <span style={{ color: "#6b7280" }}> · {r.equipName}</span>
                        )}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", color: "#374151", whiteSpace: "nowrap" }}>
                        {r.operatorName ?? "—"}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap" }}>
                        <div style={{ color: "#374151" }}>
                          {r.engineHoursStart}–{r.engineHoursEnd}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          {r.engineHoursTotal} hrs total
                        </div>
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap", fontWeight: 700, color: "#111827" }}>
                        {Number(r.fuelConsumedLiters ?? 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap", color: "#9ca3af" }}>
                        {Number(r.fuelStandardLitersPerHour ?? 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap", color: actualColor, fontWeight: 600 }}>
                        {actual.toFixed(2)}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", whiteSpace: "nowrap", color: varianceColor, fontWeight: 600 }}>
                        {variancePct != null
                          ? `${variancePct >= 0 ? "+" : "−"}${Math.abs(variancePct).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td style={{ padding: "0.7rem 0.9rem", textAlign: "center" }}>
                        {r.isFlagged ? (
                          <span style={{ color: "#dc2626" }}>🚩</span>
                        ) : (
                          <span style={{ color: "#d1d5db" }}>—</span>
                        )}
                      </td>
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
