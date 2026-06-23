export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  fuelLogs,
  equipment,
  users,
  batchingProductionLogs,
  projects,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000)
      ),
    ]);
    return result;
  } catch {
    return fallback;
  }
}

export default async function VarianceAuditPage() {
  const [fuelRows, batchRows] = await Promise.all([
    safe(
      () =>
        db
          .select({
            id: fuelLogs.id,
            logDate: fuelLogs.logDate,
            fuelConsumedLiters: fuelLogs.fuelConsumedLiters,
            fuelEfficiencyActual: fuelLogs.fuelEfficiencyActual,
            fuelStandardLitersPerHour: fuelLogs.fuelStandardLitersPerHour,
            efficiencyVariancePct: fuelLogs.efficiencyVariancePct,
            equipCode: equipment.code,
            equipName: equipment.name,
            operatorName: users.fullName,
          })
          .from(fuelLogs)
          .leftJoin(equipment, eq(fuelLogs.equipmentId, equipment.id))
          .leftJoin(users, eq(fuelLogs.operatorId, users.id))
          .where(eq(fuelLogs.isFlagged, true))
          .orderBy(desc(fuelLogs.logDate))
          .limit(50),
      []
    ),
    safe(
      () =>
        db
          .select({
            id: batchingProductionLogs.id,
            batchDate: batchingProductionLogs.batchDate,
            volumeProducedM3: batchingProductionLogs.volumeProducedM3,
            theoreticalYieldM3: batchingProductionLogs.theoreticalYieldM3,
            yieldVariancePct: batchingProductionLogs.yieldVariancePct,
            flagReason: batchingProductionLogs.flagReason,
            projectName: projects.name,
          })
          .from(batchingProductionLogs)
          .leftJoin(projects, eq(batchingProductionLogs.projectId, projects.id))
          .where(eq(batchingProductionLogs.isProductionFlagged, true))
          .orderBy(desc(batchingProductionLogs.batchDate))
          .limit(50),
      []
    ),
  ]);

  const isEmpty = fuelRows.length === 0 && batchRows.length === 0;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/audit"
          style={{ color: "#0694a2", textDecoration: "none", fontSize: 14, fontWeight: 500 }}
        >
          ← Audit &amp; Quality
        </Link>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>
        Variance Audit
      </h1>
      <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 32px" }}>
        Variance and anomaly flags across fuel consumption and batching production.
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 36, flexWrap: "wrap" }}>
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "20px 28px",
          minWidth: 180,
          borderTop: "4px solid #dc2626",
        }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontWeight: 500 }}>Flagged Fuel Logs</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#dc2626" }}>{fuelRows.length}</div>
        </div>
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "20px 28px",
          minWidth: 180,
          borderTop: "4px solid #e3a008",
        }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontWeight: 500 }}>Flagged Batching</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#e3a008" }}>{batchRows.length}</div>
        </div>
      </div>

      {isEmpty ? (
        <div style={{
          textAlign: "center",
          padding: "64px 0",
          color: "#9ca3af",
          fontSize: 15,
          background: "#fff",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
        }}>
          No variance flags found.
        </div>
      ) : (
        <>
          {fuelRows.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontVariant: "small-caps",
                color: "#9ca3af",
                marginBottom: 14,
              }}>
                Fuel Efficiency Variances
              </div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Date", "Equipment", "Operator", "Fuel Consumed (L)", "Std (L/hr)", "Actual (L/hr)", "Variance %"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 16px",
                            textAlign: "left",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#374151",
                            borderBottom: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fuelRows.map((row, i) => {
                      const variancePct = row.efficiencyVariancePct != null ? parseFloat(String(row.efficiencyVariancePct)) : null;
                      const isPositive = variancePct != null && variancePct > 0;
                      return (
                        <tr
                          key={row.id}
                          style={{
                            background: "#fef2f2",
                            borderLeft: "3px solid #dc2626",
                            borderBottom: i < fuelRows.length - 1 ? "1px solid #fee2e2" : "none",
                          }}
                        >
                          <td style={{ padding: "10px 16px", color: "#374151", whiteSpace: "nowrap" }}>
                            {row.logDate}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500 }}>
                            {row.equipCode ? `${row.equipCode} – ${row.equipName}` : (row.equipName ?? "—")}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#374151" }}>
                            {row.operatorName ?? "—"}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#374151", textAlign: "right" }}>
                            {row.fuelConsumedLiters != null ? Number(row.fuelConsumedLiters).toFixed(2) : "—"}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#374151", textAlign: "right" }}>
                            {row.fuelStandardLitersPerHour != null ? Number(row.fuelStandardLitersPerHour).toFixed(2) : "—"}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#374151", textAlign: "right" }}>
                            {row.fuelEfficiencyActual != null ? Number(row.fuelEfficiencyActual).toFixed(2) : "—"}
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: isPositive ? "#dc2626" : "#374151" }}>
                            {variancePct != null ? `${variancePct > 0 ? "+" : ""}${variancePct.toFixed(2)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {batchRows.length > 0 && (
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontVariant: "small-caps",
                color: "#9ca3af",
                marginBottom: 14,
              }}>
                Batching Production Flags
              </div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Date", "Project", "Volume Produced (m³)", "Theoretical Yield (m³)", "Yield Variance %", "Flag Reason"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 16px",
                            textAlign: "left",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#374151",
                            borderBottom: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((row, i) => {
                      const yieldVar = row.yieldVariancePct != null ? parseFloat(String(row.yieldVariancePct)) : null;
                      return (
                        <tr
                          key={row.id}
                          style={{
                            background: "#fffbeb",
                            borderLeft: "3px solid #e3a008",
                            borderBottom: i < batchRows.length - 1 ? "1px solid #fde68a" : "none",
                          }}
                        >
                          <td style={{ padding: "10px 16px", color: "#374151", whiteSpace: "nowrap" }}>
                            {row.batchDate}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500 }}>
                            {row.projectName ?? "—"}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#374151", textAlign: "right" }}>
                            {row.volumeProducedM3 != null ? Number(row.volumeProducedM3).toFixed(4) : "—"}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#374151", textAlign: "right" }}>
                            {row.theoreticalYieldM3 != null ? Number(row.theoreticalYieldM3).toFixed(4) : "—"}
                          </td>
                          <td style={{
                            padding: "10px 16px",
                            textAlign: "right",
                            fontWeight: 600,
                            color: yieldVar != null && yieldVar !== 0 ? "#e3a008" : "#374151",
                          }}>
                            {yieldVar != null ? `${yieldVar > 0 ? "+" : ""}${yieldVar.toFixed(2)}%` : "—"}
                          </td>
                          <td style={{ padding: "10px 16px", color: "#6b7280", fontStyle: row.flagReason ? "normal" : "italic" }}>
                            {row.flagReason ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
