export const dynamic = "force-dynamic";

import { db } from "@/db";
import { fixOrFlipAssessments, equipment, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

function fmt(n: string | number | null | undefined): string {
  if (n == null) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  return isNaN(num) ? "—" : num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function FixOrFlipPage() {
  const [assessments, flagged] = await Promise.all([
    safe(
      db.select({
        id: fixOrFlipAssessments.id,
        assessmentDate: fixOrFlipAssessments.assessmentDate,
        cumulativeMaintenanceCost12mo: fixOrFlipAssessments.cumulativeMaintenanceCost12mo,
        annualRentalIncome: fixOrFlipAssessments.annualRentalIncome,
        efficiencyRatio: fixOrFlipAssessments.efficiencyRatio,
        totalEngineHours: fixOrFlipAssessments.totalEngineHours,
        monthlyDowntimeDays: fixOrFlipAssessments.monthlyDowntimeDays,
        fuelEfficiencyVariancePct: fixOrFlipAssessments.fuelEfficiencyVariancePct,
        consecutiveMonthsOver50Pct: fixOrFlipAssessments.consecutiveMonthsOver50Pct,
        recommendation: fixOrFlipAssessments.recommendation,
        isTriggered: fixOrFlipAssessments.isTriggered,
        equipCode: equipment.code,
        equipName: equipment.name,
        equipType: equipment.type,
        isFlaggedForFlip: equipment.isFlaggedForFlip,
        purchaseValue: equipment.purchaseValue,
        assessorName: users.fullName,
      })
      .from(fixOrFlipAssessments)
      .leftJoin(equipment, eq(fixOrFlipAssessments.equipmentId, equipment.id))
      .leftJoin(users, eq(fixOrFlipAssessments.assessedBy, users.id))
      .orderBy(desc(fixOrFlipAssessments.assessmentDate))
      .limit(100),
      []
    ),
    safe(
      db.select({ id: equipment.id, code: equipment.code, name: equipment.name, type: equipment.type, purchaseValue: equipment.purchaseValue })
        .from(equipment)
        .where(eq(equipment.isFlaggedForFlip, true)),
      []
    ),
  ]);

  const totalCount = assessments.length;
  const fixCount = assessments.filter((a) => a.recommendation === "FIX").length;
  const flipCount = assessments.filter((a) => a.recommendation === "FLIP").length;
  const monitorCount = assessments.filter((a) => a.recommendation === "MONITOR").length;

  const assessedEquipCodes = new Set(assessments.map((a) => a.equipCode));
  const unassessedFlagged = flagged.filter((f) => !assessedEquipCodes.has(f.code));

  const kpis = [
    { label: "Total Assessments", value: totalCount, accent: "#0694a2" },
    { label: "Recommended Fix", value: fixCount, accent: "#057a55" },
    { label: "Recommended Flip", value: flipCount, accent: "#dc2626" },
    { label: "Monitor", value: monitorCount, accent: "#e3a008" },
  ];

  function recBadge(rec: string | null) {
    if (rec === "FIX") return { bg: "#dcfce7", color: "#166534" };
    if (rec === "FLIP") return { bg: "#fef2f2", color: "#b91c1c" };
    if (rec === "MONITOR") return { bg: "#fef9c3", color: "#713f12" };
    return { bg: "#f3f4f6", color: "#374151" };
  }

  const isEmpty = assessments.length === 0 && unassessedFlagged.length === 0;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/motorpool" style={{ fontSize: "0.8rem", color: "#0694a2", textDecoration: "none" }}>← Motorpool</a>
        </div>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Fix or Flip</h1>
        <p style={{ margin: "0 0 1.75rem", color: "#6b7280", fontSize: "0.9rem" }}>Equipment repair vs. disposal decision pipeline.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.4rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        {unassessedFlagged.length > 0 && (
          <div style={{ marginBottom: "2rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "1.25rem 1.5rem" }}>
            <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
              Flagged — No Assessment Yet
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {unassessedFlagged.map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "1rem", background: "#fff", borderRadius: "6px", padding: "0.6rem 1rem", border: "1px solid #fca5a5" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, color: "#b91c1c" }}>{f.code}</span>
                  <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.9rem" }}>{f.name}</span>
                  <span style={{ fontSize: "0.78rem", color: "#6b7280", background: "#f3f4f6", borderRadius: "4px", padding: "0.15rem 0.5rem" }}>{f.type}</span>
                  {f.purchaseValue && (
                    <span style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#374151" }}>₱{fmt(f.purchaseValue)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isEmpty ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No assessments or flagged equipment found.
          </div>
        ) : assessments.length > 0 && (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontWeight: 700, color: "#111827", fontSize: "1rem" }}>Assessment History</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Date", "Equipment", "Assessor", "Maintenance Cost (12mo)", "Annual Rental Income", "Engine Hours", "Downtime/mo", "Efficiency Ratio", "Fuel Variance", "Recommendation"].map((h) => (
                      <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a, i) => {
                    const isFlip = a.recommendation === "FLIP";
                    const badge = recBadge(a.recommendation);
                    const effRatio = a.efficiencyRatio != null ? Number(a.efficiencyRatio) : null;
                    const fuelVar = a.fuelEfficiencyVariancePct != null ? Number(a.fuelEfficiencyVariancePct) : null;
                    const effColor = effRatio == null ? "#374151" : effRatio < 0.5 ? "#166534" : effRatio < 1 ? "#92400e" : "#b91c1c";
                    const fuelColor = fuelVar != null && fuelVar > 10 ? "#b91c1c" : "#374151";
                    const downtimeColor = a.monthlyDowntimeDays > 5 ? "#b91c1c" : "#374151";

                    return (
                      <tr key={a.id} style={{ background: isFlip ? "#fef2f2" : i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>{fmtDate(a.assessmentDate)}</td>
                        <td style={{ padding: "0.7rem 1rem", minWidth: "180px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0694a2", fontSize: "0.82rem" }}>{a.equipCode}</span>
                            <span style={{ color: "#374151" }}> · {a.equipName}</span>
                          </div>
                          {a.equipType && <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.15rem" }}>{a.equipType}</div>}
                        </td>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>{a.assessorName ?? "System"}</td>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>₱{fmt(a.cumulativeMaintenanceCost12mo)}</td>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>₱{fmt(a.annualRentalIncome)}</td>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap", color: "#374151" }}>
                          {a.totalEngineHours != null ? Number(a.totalEngineHours).toFixed(1) : "—"}
                        </td>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap", color: downtimeColor, fontWeight: a.monthlyDowntimeDays > 5 ? 600 : 400 }}>
                          {a.monthlyDowntimeDays}d
                        </td>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap", color: effColor, fontWeight: 600 }}>
                          {effRatio != null ? effRatio.toFixed(2) : "—"}
                        </td>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap", color: fuelColor, fontWeight: fuelVar != null && fuelVar > 10 ? 600 : 400 }}>
                          {fuelVar != null ? `${fuelVar.toFixed(1)}%` : "—"}
                        </td>
                        <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-block", background: badge.bg, color: badge.color, fontWeight: 700, fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>
                            {a.recommendation ?? "—"}
                          </span>
                          {a.isTriggered && (
                            <div style={{ fontSize: "0.72rem", color: "#b91c1c", marginTop: "0.2rem", fontWeight: 600 }}>⚡ Triggered</div>
                          )}
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
